import type { GameServerAdminConfig } from "./adminMailService.js";

export class GameServerAdminError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = "GameServerAdminError";
  }
}

export type LiveBindDestination = {
  source: string;
  worldId: number;
  instanceId?: number;
  x: number;
  y: number;
  z: number;
  heading: number;
};

export type LiveOnlinePlayer = {
  characterId: number;
  objectId: number;
  name: string;
  accountId: number;
  accountName: string;
  accessLevel: number;
  level: number;
  race: string;
  playerClass: string;
  worldId: number;
  instanceId: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  bindPoint: LiveBindDestination | undefined;
};

export type LiveOnlinePlayersResult = {
  ok: boolean;
  at: string;
  count: number;
  players: LiveOnlinePlayer[];
};

export type LiveAccountStateResult = {
  ok: boolean;
  at: string;
  accountId: number;
  accountName: string;
  loaded: boolean;
  online: boolean;
  onlineCount: number;
  players: LiveOnlinePlayer[];
  warehouse: WarehouseSnapshot | undefined;
};

export type AdminApiEndpointCapability = {
  method: string;
  path: string;
  category: string;
  mutates: boolean;
  deprecated: boolean;
  canonicalPath: string;
  allowedTargets: string[];
  allowedScopes: string[];
  description: string;
};

export type AdminApiCapabilitiesResult = {
  ok: boolean;
  at: string;
  service: string;
  apiVersion: number;
  onlinePlayerCount: number;
  endpoints: AdminApiEndpointCapability[];
};

export type LiveOfflinePlayerState = {
  characterId: number;
  name: string;
  level: number;
  race: string;
  playerClass: string;
  worldId: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  lastOnline: string;
};

export type LivePlayerStateResult = {
  ok: boolean;
  online: boolean;
  at: string;
  recipientCharacterId: number;
  recipientName: string;
  player: LiveOnlinePlayer | undefined;
  lastKnown: LiveOfflinePlayerState | undefined;
};

export type NotifyPlayerInput = {
  recipientCharacterId: number;
  message: string;
};

export type NotifyPlayerResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  delivered: "online";
};

export type KickPlayerInput = {
  recipientCharacterId: number;
  reason: string;
};

export type KickPlayerResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  disconnected: boolean;
};

export type MoveToBindPointInput = {
  recipientCharacterId: number;
  reason: string;
};

export type MoveToBindPointResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  moved: boolean;
  from: LiveBindDestination | undefined;
  to: LiveBindDestination | undefined;
  destination: LiveBindDestination | undefined;
};

export type MoveToInstanceExitInput = {
  recipientCharacterId: number;
  reason: string;
};

export type MoveToInstanceExitResult = MoveToBindPointResult;

export type UnstuckPlayerInput = {
  recipientCharacterId: number;
  reason: string;
};

export type UnstuckPlayerResult = MoveToBindPointResult & {
  action: string;
};

export type MailboxSnapshot = {
  totalCount: number;
  unreadCount: number;
  unreadExpressCount: number;
  unreadBlackCloudCount: number;
};

export type RefreshMailboxInput = {
  recipientCharacterId: number;
  reason: string;
};

export type RefreshMailboxResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  refreshed: boolean;
  mailboxState: number;
  before: MailboxSnapshot;
  after: MailboxSnapshot;
};

export type InventorySnapshot = {
  cubeItemCount: number;
  equippedItemCount: number;
  totalPacketItemCount: number;
  cubeLimit: number;
  cubeFreeSlots: number;
  kinah: number;
};

export type RefreshInventoryInput = {
  recipientCharacterId: number;
  reason: string;
};

export type RefreshInventoryResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  refreshed: boolean;
  inventory: InventorySnapshot;
};

export type WarehouseSnapshot = {
  characterWarehouseItemCount: number;
  characterWarehouseLimit: number;
  characterWarehouseFreeSlots: number;
  accountWarehouseItemCount: number;
  accountWarehouseLimit: number;
  accountWarehouseFreeSlots: number;
  accountWarehouseKinah: number;
};

export type RefreshWarehouseInput = {
  recipientCharacterId: number;
  reason: string;
};

export type RefreshWarehouseResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  refreshed: boolean;
  warehouse: WarehouseSnapshot;
};

export type RefreshAccountWarehouseInput = {
  accountId: number;
  reason: string;
};

export type RefreshAccountWarehousePlayerResult = {
  recipientCharacterId: number;
  recipientName: string;
  warehouse: WarehouseSnapshot;
};

export type RefreshAccountWarehouseResult = {
  ok: boolean;
  accountId: number;
  accountName: string;
  refreshed: boolean;
  refreshedCount: number;
  players: RefreshAccountWarehousePlayerResult[];
};

export type PlayerStorageStateResult = {
  ok: boolean;
  online: boolean;
  at: string;
  recipientCharacterId: number;
  recipientName: string;
  position: LiveBindDestination | undefined;
  inventory: InventorySnapshot;
  warehouse: WarehouseSnapshot;
  mailbox: MailboxSnapshot;
};

export type PlayerItemActionKind = "discard" | "repair-slot" | "repair-count";

export type ValidatePlayerItemActionInput = {
  recipientCharacterId: number;
  itemUniqueId: number;
  storageId: number;
  action: PlayerItemActionKind;
  targetSlot?: number;
  targetCount?: string;
};

export type ValidatePlayerItemActionResult = {
  ok: boolean;
  valid: boolean;
  action: string;
  recipientCharacterId: number;
  recipientName: string;
  itemUniqueId: number;
  itemId: number;
  itemName: string;
  itemCount: string;
  maxStackCount: string;
  storageId: number;
  storageName: string;
  currentSlot: string;
  targetSlot: number;
  targetCount: string;
  storageLimit: number;
  changed: boolean;
  errors: string[];
  warnings: string[];
};

export type DiscardPlayerItemInput = {
  recipientCharacterId: number;
  itemUniqueId: number;
  storageId: number;
  reason: string;
};

export type DiscardPlayerItemResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  itemUniqueId: number;
  itemId: number;
  itemName: string;
  itemCount: string;
  storageId: number;
  storageName: string;
  slot: string;
  discarded: boolean;
  persisted: boolean;
};

export type RepairItemSlotInput = {
  recipientCharacterId: number;
  itemUniqueId: number;
  storageId: number;
  targetSlot?: number;
  reason: string;
};

export type RepairItemSlotResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  itemUniqueId: number;
  itemId: number;
  itemName: string;
  itemCount: string;
  storageId: number;
  storageName: string;
  previousSlot: string;
  slot: string;
  changed: boolean;
  persisted: boolean;
  warehouse: WarehouseSnapshot;
};

export type RepairItemCountInput = {
  recipientCharacterId: number;
  itemUniqueId: number;
  storageId: number;
  targetCount?: string;
  reason: string;
};

export type RepairItemCountResult = {
  ok: boolean;
  recipientCharacterId: number;
  recipientName: string;
  itemUniqueId: number;
  itemId: number;
  itemName: string;
  previousCount: string;
  itemCount: string;
  maxStackCount: string;
  storageId: number;
  storageName: string;
  changed: boolean;
  persisted: boolean;
  inventory: InventorySnapshot | undefined;
  warehouse: WarehouseSnapshot | undefined;
};

export type ReloadCacheTarget = "announcements" | "html" | "item-restrictions";

export type ReloadCacheInput = {
  target: ReloadCacheTarget;
  reason: string;
};

export type ReloadCacheResult = {
  ok: boolean;
  target: string;
  reloaded: boolean;
  detail: string;
  itemCount: number | undefined;
};

export type BroadcastMessageInput = {
  scope: "all" | "elyos" | "asmodians";
  message: string;
};

export type BroadcastMessageResult = {
  ok: boolean;
  scope: string;
  deliveredCount: number;
};

export type MaintenanceWarningInput = {
  scope: "all" | "elyos" | "asmodians";
  minutesUntilMaintenance: number;
  messageTemplate: string;
};

export type MaintenanceWarningSchedule = {
  remainingMinutes: number;
  delaySeconds: number;
  message: string;
};

export type MaintenanceWarningResult = {
  ok: boolean;
  scheduleId: string;
  scope: string;
  minutesUntilMaintenance: number;
  warningCount: number;
  warnings: MaintenanceWarningSchedule[];
};

export type ValidateExpressMailInput = {
  recipientCharacterId: number;
  itemId: number;
  itemCount: number;
  kinah: number;
  senderName: string;
  title: string;
  message: string;
};

export type ValidateExpressMailResult = {
  ok: boolean;
  valid: boolean;
  recipientCharacterId: number;
  recipientName: string;
  online: boolean;
  delivered: "online" | "offline";
  mailboxLetters: number;
  mailboxLimit: number;
  itemName: string;
  itemMaxStackCount: number;
  kinah: number;
  kinahMaxAttachment: number;
  kinahCapEnabled: boolean;
  kinahCapValue: number;
  recipientKinah: number | undefined;
  kinahWouldExceedCap: boolean;
  errors: string[];
  warnings: string[];
};

export type SendExpressMailInput = ValidateExpressMailInput;

export type SendExpressMailResult = {
  ok: boolean;
  delivered: "online" | "offline";
  recipientName: string;
  itemId: number;
  itemCount: number;
  kinah: number;
  warnings: string[];
};

export type ValidateExpressMailBatchEntryInput = {
  itemId: number;
  itemCount: number;
  kinah: number;
};

export type ValidateExpressMailBatchInput = {
  recipientCharacterId: number;
  senderName: string;
  title: string;
  message: string;
  entries: ValidateExpressMailBatchEntryInput[];
};

export type ValidateExpressMailBatchEntryResult = {
  index: number;
  valid: boolean;
  itemId: number;
  itemCount: number;
  kinah: number;
  itemName: string;
  itemMaxStackCount: number;
  errors: string[];
  warnings: string[];
};

export type ValidateExpressMailBatchResult = {
  ok: boolean;
  valid: boolean;
  recipientCharacterId: number;
  recipientName: string;
  online: boolean;
  delivered: "online" | "offline";
  mailboxLetters: number;
  mailboxLimit: number;
  entryCount: number;
  validEntryCount: number;
  kinahTotal: number;
  kinahMaxAttachment: number;
  kinahCapEnabled: boolean;
  kinahCapValue: number;
  recipientKinah: number | undefined;
  kinahWouldExceedCap: boolean;
  errors: string[];
  warnings: string[];
  entries: ValidateExpressMailBatchEntryResult[];
};

export type SendExpressMailBatchInput = ValidateExpressMailBatchInput;

export type SendExpressMailBatchEntryResult = {
  index: number;
  itemId: number;
  itemCount: number;
  kinah: number;
  itemName: string;
};

export type SendExpressMailBatchResult = {
  ok: boolean;
  delivered: "online" | "offline";
  recipientCharacterId: number;
  recipientName: string;
  entryCount: number;
  sentCount: number;
  kinahTotal: number;
  sentEntries: SendExpressMailBatchEntryResult[];
  warnings: string[];
};

export type ValidateItemStorageInput = {
  itemId: number;
  isSoulBound: boolean;
  targetStorageId?: number;
  targetPolicy?: "characterWarehouse" | "accountWarehouse" | "";
  itemCount?: string;
  currentStorageId?: number;
  currentSlot?: string;
  currentStorageLimit?: number;
};

export type ValidateItemStorageResult = {
  ok: boolean;
  valid: boolean;
  itemId: number;
  itemName: string;
  itemMask: number;
  itemQuality: string;
  itemType: string;
  itemGroup: string;
  maxStackCount: number;
  kinah: boolean;
  limitOne: boolean;
  canSplit: boolean;
  breakable: boolean;
  deletable: boolean;
  itemCount: string;
  countAllowed: boolean | undefined;
  currentStorageId: number;
  currentSlot: string;
  currentStorageLimit: number;
  slotAllowed: boolean | undefined;
  rowSoulBound: boolean;
  templateSoulBound: boolean;
  effectiveSoulBound: boolean;
  tradeable: boolean;
  storableInCharacterWarehouse: boolean;
  storableInAccountWarehouse: boolean;
  targetPolicy: string;
  targetAllowed: boolean | undefined;
  errors: string[];
  warnings: string[];
};

type EndpointResponse = Partial<LiveOnlinePlayersResult> & {
  error?: string;
};

type LiveAccountStateEndpointResponse = Partial<LiveAccountStateResult> & {
  error?: string;
};

type CapabilitiesEndpointResponse = Partial<AdminApiCapabilitiesResult> & {
  error?: string;
};

type LivePlayerStateEndpointResponse = Partial<LivePlayerStateResult> & {
  error?: string;
};

type NotifyEndpointResponse = Partial<NotifyPlayerResult> & {
  error?: string;
};

type KickEndpointResponse = Partial<KickPlayerResult> & {
  error?: string;
};

type MoveToBindPointEndpointResponse = Partial<MoveToBindPointResult> & {
  error?: string;
};

type MoveToInstanceExitEndpointResponse = Partial<MoveToInstanceExitResult> & {
  error?: string;
};

type UnstuckPlayerEndpointResponse = Partial<UnstuckPlayerResult> & {
  error?: string;
};

type RefreshMailboxEndpointResponse = Partial<RefreshMailboxResult> & {
  error?: string;
};

type RefreshInventoryEndpointResponse = Partial<RefreshInventoryResult> & {
  error?: string;
};

type RefreshWarehouseEndpointResponse = Partial<RefreshWarehouseResult> & {
  error?: string;
};

type RefreshAccountWarehouseEndpointResponse = Partial<RefreshAccountWarehouseResult> & {
  error?: string;
};

type PlayerStorageStateEndpointResponse = Partial<PlayerStorageStateResult> & {
  error?: string;
};

type ValidatePlayerItemActionEndpointResponse = Partial<ValidatePlayerItemActionResult> & {
  error?: string;
};

type DiscardPlayerItemEndpointResponse = Partial<DiscardPlayerItemResult> & {
  error?: string;
};

type RepairItemSlotEndpointResponse = Partial<RepairItemSlotResult> & {
  error?: string;
};

type RepairItemCountEndpointResponse = Partial<RepairItemCountResult> & {
  error?: string;
};

type ReloadCacheEndpointResponse = Partial<ReloadCacheResult> & {
  error?: string;
};

type BroadcastEndpointResponse = Partial<BroadcastMessageResult> & {
  error?: string;
};

type MaintenanceWarningEndpointResponse = Partial<MaintenanceWarningResult> & {
  error?: string;
};

type ValidateExpressMailEndpointResponse = Partial<ValidateExpressMailResult> & {
  error?: string;
};

type SendExpressMailEndpointResponse = Partial<SendExpressMailResult> & {
  error?: string;
};

type ValidateExpressMailBatchEndpointResponse = Partial<ValidateExpressMailBatchResult> & {
  error?: string;
};

type SendExpressMailBatchEndpointResponse = Partial<SendExpressMailBatchResult> & {
  error?: string;
};

type ValidateItemStorageEndpointResponse = Partial<ValidateItemStorageResult> & {
  error?: string;
};

export class GameServerAdminClient {
  constructor(private readonly gameServer: GameServerAdminConfig) {}

  async getCapabilities(): Promise<AdminApiCapabilitiesResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/capabilities`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "x-admin-token": this.gameServer.adminToken,
        },
      });
    } catch (error) {
      throw new Error(
        `Could not reach the game server admin endpoint (${endpoint}). Is the game server running with the admin API enabled? ${
          (error as Error).message
        }`,
      );
    }

    let payload: CapabilitiesEndpointResponse;
    try {
      payload = (await response.json()) as CapabilitiesEndpointResponse;
    } catch {
      throw new Error(`Game server returned a non-JSON response (HTTP ${response.status}).`);
    }

    if (!response.ok || !payload.ok) {
      throw new GameServerAdminError(
        payload.error ?? `Game server rejected the admin capabilities request (HTTP ${response.status}).`,
        response.status,
        payload,
      );
    }

    return {
      ok: true,
      at: typeof payload.at === "string" ? payload.at : new Date().toISOString(),
      service: stringValue(payload.service),
      apiVersion: numberValue(payload.apiVersion),
      onlinePlayerCount: numberValue(payload.onlinePlayerCount),
      endpoints: Array.isArray(payload.endpoints) ? payload.endpoints.map(normalizeEndpointCapability) : [],
    };
  }

  async listOnlinePlayers(): Promise<LiveOnlinePlayersResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/online-players`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "x-admin-token": this.gameServer.adminToken,
        },
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
      throw new GameServerAdminError(
        payload.error ?? `Game server rejected the live online player request (HTTP ${response.status}).`,
        response.status,
        payload,
      );
    }

    return {
      ok: true,
      at: typeof payload.at === "string" ? payload.at : new Date().toISOString(),
      count: Number.isInteger(payload.count) ? Number(payload.count) : (payload.players?.length ?? 0),
      players: Array.isArray(payload.players) ? payload.players.map(normalizeLiveOnlinePlayer) : [],
    };
  }

  async getAccountState(accountId: number): Promise<LiveAccountStateResult> {
    const params = new URLSearchParams({ accountId: String(accountId) });
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/account-state?${params.toString()}`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "x-admin-token": this.gameServer.adminToken,
        },
      });
    } catch (error) {
      throw new Error(
        `Could not reach the game server admin endpoint (${endpoint}). Is the game server running with the admin API enabled? ${
          (error as Error).message
        }`,
      );
    }

    let payload: LiveAccountStateEndpointResponse;
    try {
      payload = (await response.json()) as LiveAccountStateEndpointResponse;
    } catch {
      throw new Error(`Game server returned a non-JSON response (HTTP ${response.status}).`);
    }

    if (!response.ok || !payload.ok) {
      throw new GameServerAdminError(
        payload.error ?? `Game server rejected the live account-state request (HTTP ${response.status}).`,
        response.status,
        payload,
      );
    }

    const players = Array.isArray(payload.players) ? payload.players.map(normalizeLiveOnlinePlayer) : [];
    return {
      ok: true,
      at: typeof payload.at === "string" ? payload.at : new Date().toISOString(),
      accountId: numberValue(payload.accountId || accountId),
      accountName: stringValue(payload.accountName),
      loaded: Boolean(payload.loaded),
      online: Boolean(payload.online),
      onlineCount: Number.isInteger(payload.onlineCount) ? Number(payload.onlineCount) : players.length,
      players,
      warehouse: payload.warehouse ? normalizeWarehouseSnapshot(payload.warehouse) : undefined,
    };
  }

  async getPlayerState(recipientCharacterId: number): Promise<LivePlayerStateResult> {
    const params = new URLSearchParams({ recipientCharacterId: String(recipientCharacterId) });
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/player-state?${params.toString()}`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "x-admin-token": this.gameServer.adminToken,
        },
      });
    } catch (error) {
      throw new Error(
        `Could not reach the game server admin endpoint (${endpoint}). Is the game server running with the admin API enabled? ${
          (error as Error).message
        }`,
      );
    }

    let payload: LivePlayerStateEndpointResponse;
    try {
      payload = (await response.json()) as LivePlayerStateEndpointResponse;
    } catch {
      throw new Error(`Game server returned a non-JSON response (HTTP ${response.status}).`);
    }

    if (!response.ok || !payload.ok) {
      throw new GameServerAdminError(
        payload.error ?? `Game server rejected the live player-state request (HTTP ${response.status}).`,
        response.status,
        payload,
      );
    }

    const player = payload.player ? normalizeLiveOnlinePlayer(payload.player) : undefined;
    const lastKnown = normalizeOfflinePlayerState(payload.lastKnown);
    return {
      ok: true,
      online: Boolean(payload.online),
      at: typeof payload.at === "string" ? payload.at : new Date().toISOString(),
      recipientCharacterId: numberValue(payload.recipientCharacterId ?? player?.characterId ?? lastKnown?.characterId ?? recipientCharacterId),
      recipientName: stringValue(payload.recipientName ?? player?.name ?? lastKnown?.name ?? ""),
      player,
      lastKnown,
    };
  }

  async notifyPlayer(input: NotifyPlayerInput): Promise<NotifyPlayerResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/notify-player`;
    const payload = await this.postJson<NotifyEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      message: input.message,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      delivered: "online",
    };
  }

  async kickPlayer(input: KickPlayerInput): Promise<KickPlayerResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/kick-player`;
    const payload = await this.postJson<KickEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      disconnected: payload.disconnected !== false,
    };
  }

  async moveToBindPoint(input: MoveToBindPointInput): Promise<MoveToBindPointResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/move-to-bind-point`;
    const payload = await this.postJson<MoveToBindPointEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      moved: payload.moved !== false,
      from: normalizeBindDestination(payload.from),
      to: normalizeBindDestination(payload.to),
      destination: normalizeBindDestination(payload.destination),
    };
  }

  async moveToInstanceExit(input: MoveToInstanceExitInput): Promise<MoveToInstanceExitResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/move-to-instance-exit`;
    const payload = await this.postJson<MoveToInstanceExitEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      moved: payload.moved !== false,
      from: normalizeBindDestination(payload.from),
      to: normalizeBindDestination(payload.to),
      destination: normalizeBindDestination(payload.destination),
    };
  }

  async unstuckPlayer(input: UnstuckPlayerInput): Promise<UnstuckPlayerResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/unstuck-player`;
    const payload = await this.postJson<UnstuckPlayerEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      moved: payload.moved !== false,
      action: stringValue(payload.action),
      from: normalizeBindDestination(payload.from),
      to: normalizeBindDestination(payload.to),
      destination: normalizeBindDestination(payload.destination),
    };
  }

  async refreshMailbox(input: RefreshMailboxInput): Promise<RefreshMailboxResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/refresh-mailbox`;
    const payload = await this.postJson<RefreshMailboxEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      refreshed: payload.refreshed !== false,
      mailboxState: numberValue(payload.mailboxState),
      before: normalizeMailboxSnapshot(payload.before),
      after: normalizeMailboxSnapshot(payload.after),
    };
  }

  async refreshInventory(input: RefreshInventoryInput): Promise<RefreshInventoryResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/refresh-inventory`;
    const payload = await this.postJson<RefreshInventoryEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      refreshed: payload.refreshed !== false,
      inventory: normalizeInventorySnapshot(payload.inventory),
    };
  }

  async refreshWarehouse(input: RefreshWarehouseInput): Promise<RefreshWarehouseResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/refresh-warehouse`;
    const payload = await this.postJson<RefreshWarehouseEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      refreshed: payload.refreshed !== false,
      warehouse: normalizeWarehouseSnapshot(payload.warehouse),
    };
  }

  async refreshAccountWarehouse(input: RefreshAccountWarehouseInput): Promise<RefreshAccountWarehouseResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/refresh-account-warehouse`;
    const payload = await this.postJson<RefreshAccountWarehouseEndpointResponse>(endpoint, {
      accountId: input.accountId,
      reason: input.reason,
    });

    const players = Array.isArray(payload.players)
      ? payload.players.map(normalizeRefreshAccountWarehousePlayer)
      : [];
    return {
      ok: true,
      accountId: numberValue(payload.accountId || input.accountId),
      accountName: stringValue(payload.accountName),
      refreshed: payload.refreshed !== false,
      refreshedCount: numberValue(payload.refreshedCount || players.length),
      players,
    };
  }

  async getPlayerStorageState(recipientCharacterId: number): Promise<PlayerStorageStateResult> {
    const params = new URLSearchParams({ recipientCharacterId: String(recipientCharacterId) });
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/player-storage-state?${params.toString()}`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "x-admin-token": this.gameServer.adminToken,
        },
      });
    } catch (error) {
      throw new Error(
        `Could not reach the game server admin endpoint (${endpoint}). Is the game server running with the admin API enabled? ${
          (error as Error).message
        }`,
      );
    }

    let payload: PlayerStorageStateEndpointResponse;
    try {
      payload = (await response.json()) as PlayerStorageStateEndpointResponse;
    } catch {
      throw new Error(`Game server returned a non-JSON response (HTTP ${response.status}).`);
    }

    if (!response.ok || !payload.ok) {
      throw new GameServerAdminError(
        payload.error ?? `Game server rejected the live player-storage-state request (HTTP ${response.status}).`,
        response.status,
        payload,
      );
    }

    return {
      ok: true,
      online: Boolean(payload.online),
      at: typeof payload.at === "string" ? payload.at : new Date().toISOString(),
      recipientCharacterId: numberValue(payload.recipientCharacterId || recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      position: normalizeBindDestination(payload.position),
      inventory: normalizeInventorySnapshot(payload.inventory),
      warehouse: normalizeWarehouseSnapshot(payload.warehouse),
      mailbox: normalizeMailboxSnapshot(payload.mailbox),
    };
  }

  async validatePlayerItemAction(input: ValidatePlayerItemActionInput): Promise<ValidatePlayerItemActionResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/validate-player-item-action`;
    const payload = await this.postJson<ValidatePlayerItemActionEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      itemUniqueId: input.itemUniqueId,
      storageId: input.storageId,
      action: input.action,
      targetSlot: input.targetSlot ?? -1,
      targetCount: input.targetCount ?? "",
    });

    return normalizeValidatePlayerItemAction(payload, input);
  }

  async discardPlayerItem(input: DiscardPlayerItemInput): Promise<DiscardPlayerItemResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/discard-player-item`;
    const payload = await this.postJson<DiscardPlayerItemEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      itemUniqueId: input.itemUniqueId,
      storageId: input.storageId,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      itemUniqueId: numberValue(payload.itemUniqueId || input.itemUniqueId),
      itemId: numberValue(payload.itemId),
      itemName: stringValue(payload.itemName),
      itemCount: stringValue(payload.itemCount),
      storageId: numberValue(payload.storageId || input.storageId),
      storageName: stringValue(payload.storageName),
      slot: stringValue(payload.slot),
      discarded: payload.discarded !== false,
      persisted: payload.persisted !== false,
    };
  }

  async repairItemSlot(input: RepairItemSlotInput): Promise<RepairItemSlotResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/repair-item-slot`;
    const payload = await this.postJson<RepairItemSlotEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      itemUniqueId: input.itemUniqueId,
      storageId: input.storageId,
      targetSlot: input.targetSlot ?? -1,
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      itemUniqueId: numberValue(payload.itemUniqueId || input.itemUniqueId),
      itemId: numberValue(payload.itemId),
      itemName: stringValue(payload.itemName),
      itemCount: stringValue(payload.itemCount),
      storageId: numberValue(payload.storageId || input.storageId),
      storageName: stringValue(payload.storageName),
      previousSlot: stringValue(payload.previousSlot),
      slot: stringValue(payload.slot),
      changed: payload.changed !== false,
      persisted: payload.persisted !== false,
      warehouse: normalizeWarehouseSnapshot(payload.warehouse),
    };
  }

  async repairItemCount(input: RepairItemCountInput): Promise<RepairItemCountResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/repair-item-count`;
    const payload = await this.postJson<RepairItemCountEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      itemUniqueId: input.itemUniqueId,
      storageId: input.storageId,
      targetCount: input.targetCount ?? "",
      reason: input.reason,
    });

    return {
      ok: true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      itemUniqueId: numberValue(payload.itemUniqueId || input.itemUniqueId),
      itemId: numberValue(payload.itemId),
      itemName: stringValue(payload.itemName),
      previousCount: stringValue(payload.previousCount),
      itemCount: stringValue(payload.itemCount),
      maxStackCount: stringValue(payload.maxStackCount),
      storageId: numberValue(payload.storageId || input.storageId),
      storageName: stringValue(payload.storageName),
      changed: payload.changed !== false,
      persisted: payload.persisted !== false,
      inventory: payload.inventory ? normalizeInventorySnapshot(payload.inventory) : undefined,
      warehouse: payload.warehouse ? normalizeWarehouseSnapshot(payload.warehouse) : undefined,
    };
  }

  async reloadCache(input: ReloadCacheInput): Promise<ReloadCacheResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/reload-cache`;
    const payload = await this.postJson<ReloadCacheEndpointResponse>(endpoint, {
      target: input.target,
      reason: input.reason,
    });

    return {
      ok: true,
      target: stringValue(payload.target || input.target),
      reloaded: payload.reloaded !== false,
      detail: stringValue(payload.detail),
      itemCount: payload.itemCount == null ? undefined : numberValue(payload.itemCount),
    };
  }

  async scheduleMaintenanceWarning(input: MaintenanceWarningInput): Promise<MaintenanceWarningResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/maintenance-warning`;
    const payload = await this.postJson<MaintenanceWarningEndpointResponse>(endpoint, {
      scope: input.scope,
      minutesUntilMaintenance: input.minutesUntilMaintenance,
      messageTemplate: input.messageTemplate,
    });

    return {
      ok: true,
      scheduleId: stringValue(payload.scheduleId),
      scope: stringValue(payload.scope || input.scope),
      minutesUntilMaintenance: numberValue(payload.minutesUntilMaintenance || input.minutesUntilMaintenance),
      warningCount: numberValue(payload.warningCount),
      warnings: Array.isArray(payload.warnings) ? payload.warnings.map(normalizeMaintenanceWarningSchedule) : [],
    };
  }

  async broadcastMessage(input: BroadcastMessageInput): Promise<BroadcastMessageResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/broadcast-message`;
    const payload = await this.postJson<BroadcastEndpointResponse>(endpoint, {
      scope: input.scope,
      message: input.message,
    });

    return {
      ok: true,
      scope: stringValue(payload.scope || input.scope),
      deliveredCount: numberValue(payload.deliveredCount),
    };
  }

  async validateExpressMail(input: ValidateExpressMailInput): Promise<ValidateExpressMailResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/validate-express-mail`;
    const payload = await this.postJson<ValidateExpressMailEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      itemId: input.itemId,
      itemCount: input.itemCount,
      kinah: input.kinah,
      senderName: input.senderName,
      title: input.title,
      message: input.message,
    });

    return {
      ok: true,
      valid: payload.valid === true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      online: Boolean(payload.online),
      delivered: payload.delivered === "online" ? "online" : "offline",
      mailboxLetters: numberValue(payload.mailboxLetters),
      mailboxLimit: numberValue(payload.mailboxLimit),
      itemName: stringValue(payload.itemName),
      itemMaxStackCount: numberValue(payload.itemMaxStackCount),
      kinah: numberValue(payload.kinah),
      kinahMaxAttachment: numberValue(payload.kinahMaxAttachment),
      kinahCapEnabled: Boolean(payload.kinahCapEnabled),
      kinahCapValue: numberValue(payload.kinahCapValue),
      recipientKinah: payload.recipientKinah == null ? undefined : numberValue(payload.recipientKinah),
      kinahWouldExceedCap: Boolean(payload.kinahWouldExceedCap),
      errors: stringArray(payload.errors),
      warnings: stringArray(payload.warnings),
    };
  }

  async sendExpressMail(input: SendExpressMailInput): Promise<SendExpressMailResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/express-mail`;
    const payload = await this.postJson<SendExpressMailEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      itemId: input.itemId,
      itemCount: input.itemCount,
      kinah: input.kinah,
      senderName: input.senderName,
      title: input.title,
      message: input.message,
    });

    return {
      ok: true,
      delivered: payload.delivered === "online" ? "online" : "offline",
      recipientName: stringValue(payload.recipientName),
      itemId: numberValue(payload.itemId),
      itemCount: numberValue(payload.itemCount),
      kinah: numberValue(payload.kinah),
      warnings: stringArray(payload.warnings),
    };
  }

  async validateExpressMailBatch(input: ValidateExpressMailBatchInput): Promise<ValidateExpressMailBatchResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/validate-express-mail-batch`;
    const payload = await this.postJson<ValidateExpressMailBatchEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      senderName: input.senderName,
      title: input.title,
      message: input.message,
      entries: input.entries.map(entry => ({
        itemId: entry.itemId,
        itemCount: entry.itemCount,
        kinah: entry.kinah,
      })),
    });

    const entries = Array.isArray(payload.entries) ? payload.entries.map(normalizeValidateExpressMailBatchEntry) : [];
    return {
      ok: true,
      valid: payload.valid === true,
      recipientCharacterId: numberValue(payload.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      online: Boolean(payload.online),
      delivered: payload.delivered === "online" ? "online" : "offline",
      mailboxLetters: numberValue(payload.mailboxLetters),
      mailboxLimit: numberValue(payload.mailboxLimit),
      entryCount: numberValue(payload.entryCount || entries.length),
      validEntryCount: numberValue(payload.validEntryCount),
      kinahTotal: numberValue(payload.kinahTotal),
      kinahMaxAttachment: numberValue(payload.kinahMaxAttachment),
      kinahCapEnabled: Boolean(payload.kinahCapEnabled),
      kinahCapValue: numberValue(payload.kinahCapValue),
      recipientKinah: payload.recipientKinah == null ? undefined : numberValue(payload.recipientKinah),
      kinahWouldExceedCap: Boolean(payload.kinahWouldExceedCap),
      errors: stringArray(payload.errors),
      warnings: stringArray(payload.warnings),
      entries,
    };
  }

  async sendExpressMailBatch(input: SendExpressMailBatchInput): Promise<SendExpressMailBatchResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/express-mail-batch`;
    const payload = await this.postJson<SendExpressMailBatchEndpointResponse>(endpoint, {
      recipientCharacterId: input.recipientCharacterId,
      senderName: input.senderName,
      title: input.title,
      message: input.message,
      entries: input.entries.map(entry => ({
        itemId: entry.itemId,
        itemCount: entry.itemCount,
        kinah: entry.kinah,
      })),
    });

    const sentEntries = Array.isArray(payload.sentEntries) ? payload.sentEntries.map(normalizeSendExpressMailBatchEntry) : [];
    return {
      ok: true,
      delivered: payload.delivered === "online" ? "online" : "offline",
      recipientCharacterId: numberValue(payload.recipientCharacterId || input.recipientCharacterId),
      recipientName: stringValue(payload.recipientName),
      entryCount: numberValue(payload.entryCount || sentEntries.length),
      sentCount: numberValue(payload.sentCount || sentEntries.length),
      kinahTotal: numberValue(payload.kinahTotal),
      sentEntries,
      warnings: stringArray(payload.warnings),
    };
  }

  async validateItemStorage(input: ValidateItemStorageInput): Promise<ValidateItemStorageResult> {
    const endpoint = `${this.gameServer.baseUrl.replace(/\/+$/, "")}/admin/validate-item-storage`;
    const payload = await this.postJson<ValidateItemStorageEndpointResponse>(endpoint, {
      itemId: input.itemId,
      isSoulBound: input.isSoulBound,
      targetStorageId: input.targetStorageId ?? 0,
      targetPolicy: input.targetPolicy ?? "",
      itemCount: input.itemCount ?? "",
      currentStorageId: input.currentStorageId ?? 0,
      currentSlot: input.currentSlot ?? "",
      currentStorageLimit: input.currentStorageLimit ?? 0,
    });

    return {
      ok: true,
      valid: payload.valid === true,
      itemId: numberValue(payload.itemId || input.itemId),
      itemName: stringValue(payload.itemName),
      itemMask: numberValue(payload.itemMask),
      itemQuality: stringValue(payload.itemQuality),
      itemType: stringValue(payload.itemType),
      itemGroup: stringValue(payload.itemGroup),
      maxStackCount: numberValue(payload.maxStackCount),
      kinah: Boolean(payload.kinah),
      limitOne: Boolean(payload.limitOne),
      canSplit: Boolean(payload.canSplit),
      breakable: Boolean(payload.breakable),
      deletable: Boolean(payload.deletable),
      itemCount: stringValue(payload.itemCount),
      countAllowed: typeof payload.countAllowed === "boolean" ? payload.countAllowed : undefined,
      currentStorageId: numberValue(payload.currentStorageId),
      currentSlot: stringValue(payload.currentSlot),
      currentStorageLimit: numberValue(payload.currentStorageLimit),
      slotAllowed: typeof payload.slotAllowed === "boolean" ? payload.slotAllowed : undefined,
      rowSoulBound: Boolean(payload.rowSoulBound),
      templateSoulBound: Boolean(payload.templateSoulBound),
      effectiveSoulBound: Boolean(payload.effectiveSoulBound),
      tradeable: Boolean(payload.tradeable),
      storableInCharacterWarehouse: Boolean(payload.storableInCharacterWarehouse),
      storableInAccountWarehouse: Boolean(payload.storableInAccountWarehouse),
      targetPolicy: stringValue(payload.targetPolicy),
      targetAllowed: typeof payload.targetAllowed === "boolean" ? payload.targetAllowed : undefined,
      errors: stringArray(payload.errors),
      warnings: stringArray(payload.warnings),
    };
  }

  private async postJson<T extends { ok?: boolean; error?: string }>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": this.gameServer.adminToken,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(
        `Could not reach the game server admin endpoint (${endpoint}). Is the game server running with the admin API enabled? ${
          (error as Error).message
        }`,
      );
    }

    let payload: T;
    try {
      payload = (await response.json()) as T;
    } catch {
      throw new Error(`Game server returned a non-JSON response (HTTP ${response.status}).`);
    }

    if (!response.ok || !payload.ok) {
      throw new GameServerAdminError(
        payload.error ?? `Game server rejected the admin request (HTTP ${response.status}).`,
        response.status,
        payload,
      );
    }

    return payload;
  }
}

function normalizeValidatePlayerItemAction(
  payload: Partial<ValidatePlayerItemActionResult>,
  input: ValidatePlayerItemActionInput,
): ValidatePlayerItemActionResult {
  return {
    ok: true,
    valid: payload.valid === true,
    action: stringValue(payload.action || input.action),
    recipientCharacterId: numberValue(payload.recipientCharacterId || input.recipientCharacterId),
    recipientName: stringValue(payload.recipientName),
    itemUniqueId: numberValue(payload.itemUniqueId || input.itemUniqueId),
    itemId: numberValue(payload.itemId),
    itemName: stringValue(payload.itemName),
    itemCount: stringValue(payload.itemCount),
    maxStackCount: stringValue(payload.maxStackCount),
    storageId: numberValue(payload.storageId || input.storageId),
    storageName: stringValue(payload.storageName),
    currentSlot: stringValue(payload.currentSlot),
    targetSlot: numberValue(payload.targetSlot ?? input.targetSlot ?? -1),
    targetCount: stringValue(payload.targetCount ?? input.targetCount ?? ""),
    storageLimit: numberValue(payload.storageLimit),
    changed: Boolean(payload.changed),
    errors: stringArray(payload.errors),
    warnings: stringArray(payload.warnings),
  };
}

function normalizeMaintenanceWarningSchedule(value: MaintenanceWarningSchedule): MaintenanceWarningSchedule {
  return {
    remainingMinutes: numberValue(value.remainingMinutes),
    delaySeconds: numberValue(value.delaySeconds),
    message: stringValue(value.message),
  };
}

function normalizeRefreshAccountWarehousePlayer(value: unknown): RefreshAccountWarehousePlayerResult {
  const candidate = value && typeof value === "object" ? (value as Partial<RefreshAccountWarehousePlayerResult>) : {};
  return {
    recipientCharacterId: numberValue(candidate.recipientCharacterId),
    recipientName: stringValue(candidate.recipientName),
    warehouse: normalizeWarehouseSnapshot(candidate.warehouse),
  };
}

function normalizeValidateExpressMailBatchEntry(value: unknown): ValidateExpressMailBatchEntryResult {
  const candidate = value && typeof value === "object" ? (value as Partial<ValidateExpressMailBatchEntryResult>) : {};
  return {
    index: numberValue(candidate.index),
    valid: candidate.valid === true,
    itemId: numberValue(candidate.itemId),
    itemCount: numberValue(candidate.itemCount),
    kinah: numberValue(candidate.kinah),
    itemName: stringValue(candidate.itemName),
    itemMaxStackCount: numberValue(candidate.itemMaxStackCount),
    errors: stringArray(candidate.errors),
    warnings: stringArray(candidate.warnings),
  };
}

function normalizeSendExpressMailBatchEntry(value: unknown): SendExpressMailBatchEntryResult {
  const candidate = value && typeof value === "object" ? (value as Partial<SendExpressMailBatchEntryResult>) : {};
  return {
    index: numberValue(candidate.index),
    itemId: numberValue(candidate.itemId),
    itemCount: numberValue(candidate.itemCount),
    kinah: numberValue(candidate.kinah),
    itemName: stringValue(candidate.itemName),
  };
}

function normalizeLiveOnlinePlayer(value: LiveOnlinePlayer): LiveOnlinePlayer {
  return {
    characterId: numberValue(value.characterId),
    objectId: numberValue(value.objectId),
    name: stringValue(value.name),
    accountId: numberValue(value.accountId),
    accountName: stringValue(value.accountName),
    accessLevel: numberValue(value.accessLevel),
    level: numberValue(value.level),
    race: stringValue(value.race),
    playerClass: stringValue(value.playerClass),
    worldId: numberValue(value.worldId),
    instanceId: numberValue(value.instanceId),
    x: numberValue(value.x),
    y: numberValue(value.y),
    z: numberValue(value.z),
    heading: numberValue(value.heading),
    bindPoint: normalizeBindDestination(value.bindPoint),
  };
}

function normalizeEndpointCapability(value: unknown): AdminApiEndpointCapability {
  const candidate = value && typeof value === "object" ? (value as Partial<AdminApiEndpointCapability>) : {};
  return {
    method: stringValue(candidate.method).toUpperCase(),
    path: stringValue(candidate.path),
    category: stringValue(candidate.category),
    mutates: Boolean(candidate.mutates),
    deprecated: Boolean(candidate.deprecated),
    canonicalPath: stringValue(candidate.canonicalPath),
    allowedTargets: stringArray(candidate.allowedTargets),
    allowedScopes: stringArray(candidate.allowedScopes),
    description: stringValue(candidate.description),
  };
}

function normalizeOfflinePlayerState(value: unknown): LiveOfflinePlayerState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Partial<LiveOfflinePlayerState>;
  return {
    characterId: numberValue(candidate.characterId),
    name: stringValue(candidate.name),
    level: numberValue(candidate.level),
    race: stringValue(candidate.race),
    playerClass: stringValue(candidate.playerClass),
    worldId: numberValue(candidate.worldId),
    x: numberValue(candidate.x),
    y: numberValue(candidate.y),
    z: numberValue(candidate.z),
    heading: numberValue(candidate.heading),
    lastOnline: stringValue(candidate.lastOnline),
  };
}

function normalizeBindDestination(value: unknown): LiveBindDestination | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Partial<LiveBindDestination>;
  return {
    source: stringValue(candidate.source),
    worldId: numberValue(candidate.worldId),
    instanceId: candidate.instanceId == null ? undefined : numberValue(candidate.instanceId),
    x: numberValue(candidate.x),
    y: numberValue(candidate.y),
    z: numberValue(candidate.z),
    heading: numberValue(candidate.heading),
  };
}

function normalizeMailboxSnapshot(value: unknown): MailboxSnapshot {
  const candidate = value && typeof value === "object" ? (value as Partial<MailboxSnapshot>) : {};
  return {
    totalCount: numberValue(candidate.totalCount),
    unreadCount: numberValue(candidate.unreadCount),
    unreadExpressCount: numberValue(candidate.unreadExpressCount),
    unreadBlackCloudCount: numberValue(candidate.unreadBlackCloudCount),
  };
}

function normalizeInventorySnapshot(value: unknown): InventorySnapshot {
  const candidate = value && typeof value === "object" ? (value as Partial<InventorySnapshot>) : {};
  return {
    cubeItemCount: numberValue(candidate.cubeItemCount),
    equippedItemCount: numberValue(candidate.equippedItemCount),
    totalPacketItemCount: numberValue(candidate.totalPacketItemCount),
    cubeLimit: numberValue(candidate.cubeLimit),
    cubeFreeSlots: numberValue(candidate.cubeFreeSlots),
    kinah: numberValue(candidate.kinah),
  };
}

function normalizeWarehouseSnapshot(value: unknown): WarehouseSnapshot {
  const candidate = value && typeof value === "object" ? (value as Partial<WarehouseSnapshot>) : {};
  return {
    characterWarehouseItemCount: numberValue(candidate.characterWarehouseItemCount),
    characterWarehouseLimit: numberValue(candidate.characterWarehouseLimit),
    characterWarehouseFreeSlots: numberValue(candidate.characterWarehouseFreeSlots),
    accountWarehouseItemCount: numberValue(candidate.accountWarehouseItemCount),
    accountWarehouseLimit: numberValue(candidate.accountWarehouseLimit),
    accountWarehouseFreeSlots: numberValue(candidate.accountWarehouseFreeSlots),
    accountWarehouseKinah: numberValue(candidate.accountWarehouseKinah),
  };
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function stringValue(value: unknown): string {
  return String(value ?? "");
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => stringValue(item)).filter(Boolean) : [];
}
