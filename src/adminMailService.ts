import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { ItemCatalog } from "./itemCatalog.js";

const KINAH_ITEM_ID = 182400001;
const MAX_ITEM_COUNT = 2_147_483_647;

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

export type SendAdminItemMailResult = {
  recipientName: string;
  itemId: number;
  itemName: string;
  itemCount: number;
  delivered: "online" | "offline";
};

type EndpointResponse = {
  ok: boolean;
  delivered?: "online" | "offline";
  recipientName?: string;
  error?: string;
};

/**
 * Delivers express item mail by calling the game server's admin HTTP endpoint, which runs the real
 * SystemMailService.SendMail on the LIVE server. That is what makes an online recipient get the instant
 * bell + icon (SM_MAIL_SERVICE + STR_POSTMAN_NOTIFY) and keeps the in-memory mailbox/counter consistent
 * with the DB. (The previous approach wrote mail/inventory rows straight into the game DB, which could not
 * notify online players and raced the running server's in-memory state.)
 */
export class AdminMailService {
  constructor(
    private readonly itemCatalog: ItemCatalog,
    private readonly auditPath: string,
    private readonly gameServer: GameServerAdminConfig,
  ) {}

  async sendItemMail(input: SendAdminItemMailInput): Promise<SendAdminItemMailResult> {
    const normalized = this.normalizeInput(input);

    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/express-item-mail`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": this.gameServer.adminToken,
        },
        body: JSON.stringify({
          recipientCharacterId: normalized.recipientCharacterId,
          itemId: normalized.itemId,
          itemCount: normalized.itemCount,
          senderName: normalized.senderName,
          title: normalized.title,
          message: normalized.message,
        }),
      });
    } catch (error) {
      throw new Error(
        `Could not reach the game server admin endpoint (${endpoint}). Is the game server running with the admin API enabled? ${
          (error as Error).message
        }`,
      );
    }

    let payload: EndpointResponse;
    try {
      payload = (await response.json()) as EndpointResponse;
    } catch {
      throw new Error(`Game server returned a non-JSON response (HTTP ${response.status}).`);
    }

    if (!response.ok || !payload.ok) {
      throw new Error(payload?.error ?? `Game server rejected the mail (HTTP ${response.status}).`);
    }

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

  private normalizeInput(input: SendAdminItemMailInput): SendAdminItemMailInput & { itemName: string } {
    if (!Number.isInteger(input.recipientCharacterId) || input.recipientCharacterId <= 0) {
      throw new Error("Recipient character is not valid.");
    }
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

    const senderName = normalizeRequiredText(input.senderName || "Aion Portal", "Sender", 16);
    const title = normalizeRequiredText(input.title || "Admin Delivery", "Title", 20);
    const message = normalizeRequiredText(input.message || "Admin delivery.", "Message", 1000);

    return {
      ...input,
      itemCount: input.itemCount,
      senderName,
      title,
      message,
      itemName: template.name,
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
