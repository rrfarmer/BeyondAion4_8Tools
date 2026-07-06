import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { GameServerAdminClient } from "./gameServerAdminClient.js";
import { ItemCatalog } from "./itemCatalog.js";

const KINAH_ITEM_ID = 182400001;
const MAX_ITEM_COUNT = 2_147_483_647;
const MAX_SAFE_MAIL_KINAH = 2_147_483_647n;

export type GameServerAdminConfig = {
  baseUrl: string;
  adminToken: string;
};

export type SendAdminItemMailInput = {
  adminPortalUserId: string;
  adminUsername: string;
  recipientCharacterId: number;
  itemId: number;
  itemCount: number;
  senderName: string;
  title: string;
  message: string;
};

export type SendAdminKinahMailInput = {
  adminPortalUserId: string;
  adminUsername: string;
  recipientCharacterId: number;
  kinahAmount: string;
  senderName: string;
  title: string;
  message: string;
};

export type SendAdminItemMailResult = {
  recipientName: string;
  itemId: number;
  itemName: string;
  itemCount: number;
  delivered: "online" | "offline";
};

export type SendAdminKinahMailResult = {
  recipientName: string;
  kinahAmount: string;
  delivered: "online" | "offline";
};

/**
 * Delivers express mail by calling the game server's admin HTTP endpoint, which runs the real
 * SystemMailService.SendMail on the LIVE server. That is what makes an online recipient get the instant
 * bell + icon (SM_MAIL_SERVICE + STR_POSTMAN_NOTIFY) and keeps the in-memory mailbox/counter consistent
 * with the DB. (The previous approach wrote mail/inventory rows straight into the game DB, which could not
 * notify online players and raced the running server's in-memory state.)
 */
export class AdminMailService {
  constructor(
    private readonly itemCatalog: ItemCatalog,
    private readonly auditPath: string,
    private readonly gameServerAdmin: Pick<GameServerAdminClient, "sendExpressMail">,
  ) {}

  async sendItemMail(input: SendAdminItemMailInput): Promise<SendAdminItemMailResult> {
    const normalized = this.normalizeItemInput(input);
    const payload = await this.gameServerAdmin.sendExpressMail({
      recipientCharacterId: normalized.recipientCharacterId,
      itemId: normalized.itemId,
      itemCount: normalized.itemCount,
      kinah: 0,
      senderName: normalized.senderName,
      title: normalized.title,
      message: normalized.message,
    });

    const result: SendAdminItemMailResult = {
      recipientName: payload.recipientName ?? String(normalized.recipientCharacterId),
      itemId: normalized.itemId,
      itemName: normalized.itemName,
      itemCount: normalized.itemCount,
      delivered: payload.delivered === "online" ? "online" : "offline",
    };
    await this.audit(input, result).catch(() => undefined);
    return result;
  }

  async sendKinahMail(input: SendAdminKinahMailInput): Promise<SendAdminKinahMailResult> {
    const normalized = this.normalizeKinahInput(input);
    const payload = await this.gameServerAdmin.sendExpressMail({
      recipientCharacterId: normalized.recipientCharacterId,
      itemId: 0,
      itemCount: 0,
      kinah: normalized.kinahNumber,
      senderName: normalized.senderName,
      title: normalized.title,
      message: normalized.message,
    });

    const result: SendAdminKinahMailResult = {
      recipientName: payload.recipientName ?? String(normalized.recipientCharacterId),
      kinahAmount: normalized.kinahAmount,
      delivered: payload.delivered === "online" ? "online" : "offline",
    };
    await this.auditKinah(input, result).catch(() => undefined);
    return result;
  }

  private normalizeCommonInput<T extends SendAdminItemMailInput | SendAdminKinahMailInput>(
    input: T,
  ): T & { senderName: string; title: string; message: string } {
    if (!Number.isInteger(input.recipientCharacterId) || input.recipientCharacterId <= 0) {
      throw new Error("Recipient character is not valid.");
    }

    const senderName = normalizeRequiredText(input.senderName || "Aion Portal", "Sender", 16);
    const title = normalizeRequiredText(input.title || "Admin Delivery", "Title", 20);
    const message = normalizeRequiredText(input.message || "Admin delivery.", "Message", 1000);

    return {
      ...input,
      senderName,
      title,
      message,
    };
  }

  private normalizeItemInput(input: SendAdminItemMailInput): SendAdminItemMailInput & { itemName: string } {
    const common = this.normalizeCommonInput(input);
    if (!Number.isInteger(input.itemId) || input.itemId <= 0) {
      throw new Error("Item id is not valid.");
    }
    if (input.itemId === KINAH_ITEM_ID) {
      throw new Error("Kinah uses the mail kinah field; item mail does not send Kinah yet.");
    }
    if (!Number.isInteger(input.itemCount) || input.itemCount <= 0 || input.itemCount > MAX_ITEM_COUNT) {
      throw new Error("Item count is not valid.");
    }

    const template = this.itemCatalog.templateFor(input.itemId);
    if (!template) {
      throw new Error(`Item template ${input.itemId} was not found.`);
    }
    const maxStackCount = Math.max(template.maxStackCount, 1);
    if (input.itemCount > maxStackCount) {
      throw new Error(`Item count exceeds this template's max stack count of ${maxStackCount}.`);
    }

    return {
      ...common,
      itemCount: input.itemCount,
      itemName: template.name,
    };
  }

  private normalizeKinahInput(
    input: SendAdminKinahMailInput,
  ): SendAdminKinahMailInput & { kinahAmount: string; kinahNumber: number } {
    const common = this.normalizeCommonInput(input);
    const kinahAmount = normalizePositiveIntegerText(input.kinahAmount, "Kinah amount", MAX_SAFE_MAIL_KINAH);

    return {
      ...common,
      kinahAmount,
      kinahNumber: Number(kinahAmount),
    };
  }

  private async audit(input: SendAdminItemMailInput, result: SendAdminItemMailResult): Promise<void> {
    await mkdir(path.dirname(this.auditPath), { recursive: true });
    await appendFile(
      this.auditPath,
      `${JSON.stringify({
        at: new Date().toISOString(),
        adminPortalUserId: input.adminPortalUserId,
        adminUsername: input.adminUsername,
        action: "admin_express_item_mail",
        via: "gameserver",
        delivered: result.delivered,
        recipientCharacterId: input.recipientCharacterId,
        recipientName: result.recipientName,
        itemId: result.itemId,
        itemName: result.itemName,
        itemCount: result.itemCount,
      })}\n`,
      "utf8",
    );
  }

  private async auditKinah(input: SendAdminKinahMailInput, result: SendAdminKinahMailResult): Promise<void> {
    await mkdir(path.dirname(this.auditPath), { recursive: true });
    await appendFile(
      this.auditPath,
      `${JSON.stringify({
        at: new Date().toISOString(),
        adminPortalUserId: input.adminPortalUserId,
        adminUsername: input.adminUsername,
        action: "admin_express_kinah_mail",
        via: "gameserver",
        delivered: result.delivered,
        recipientCharacterId: input.recipientCharacterId,
        recipientName: result.recipientName,
        kinahAmount: result.kinahAmount,
      })}\n`,
      "utf8",
    );
  }
}

function normalizeRequiredText(value: string, label: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
}

function normalizePositiveIntegerText(value: string, label: string, maxValue: bigint): string {
  const normalized = value.trim().replace(/[,_\s]/g, "");
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a positive whole number.`);
  }

  const parsed = BigInt(normalized);
  if (parsed <= 0n) {
    throw new Error(`${label} must be greater than zero.`);
  }
  if (parsed > maxValue) {
    throw new Error(`${label} is too large for the current admin mail endpoint.`);
  }

  return parsed.toString();
}
