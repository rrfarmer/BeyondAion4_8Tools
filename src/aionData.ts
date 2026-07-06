import { createHash, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { gameDb, loginDb } from "./db.js";
import { ItemCatalog } from "./itemCatalog.js";
import {
  ACCOUNT_WAREHOUSE_CAPACITY,
  MAX_WAREHOUSE_EXPANSIONS,
  REGULAR_WAREHOUSE_BASE_CAPACITY,
  WAREHOUSE_ROW_LENGTH,
  characterWarehouseCapacity,
  warehouseExpansionLevel,
  type WarehouseCapacityInfo,
  type WarehouseExpansionSource,
} from "./warehouseCapacity.js";

export const KINAH_ITEM_ID = 182400001;

export type AionAccount = {
  id: number;
  name: string;
  accessLevel: number;
};

export type CharacterSummary = {
  id: number;
  name: string;
  race: string;
  playerClass: string;
  exp: string;
  online: boolean;
  lastOnline: Date | null;
  warehouseExpansions: {
    npc: number;
    bonus: number;
    total: number;
    max: number;
  };
};

export type InventoryItem = {
  itemUniqueId: number;
  itemId: number;
  itemName: string | undefined;
  itemCName: string | undefined;
  itemQuality: string | undefined;
  itemGroup: string | undefined;
  itemType: string | undefined;
  itemRace: string | undefined;
  itemLevel: number;
  itemMaxStackCount: number;
  itemPrice: number;
  itemDescId: number | undefined;
  itemCount: string;
  storageId: number;
  storageName: string;
  slot: string;
  equipped: boolean;
  enchant: number;
  soulBound: boolean;
  stackable: boolean;
  storableInWarehouse: boolean;
  storableInAccountWarehouse: boolean;
  itemCreator: string | null;
};

export type CharacterWarehouseView = {
  character: CharacterSummary;
  sections: WarehouseSection[];
};

export type AccountWarehouseView = {
  accountId: number;
  accountName: string;
  sections: WarehouseSection[];
};

export type WarehouseSection = {
  storageId: number;
  title: string;
  description: string;
  capacity: WarehouseCapacityInfo;
  kinah: InventoryItem | undefined;
  items: InventoryItem[];
};

export type TransferWorkbenchView = {
  accountId: number;
  accountName: string;
  character: CharacterSummary;
  sections: WarehouseSection[];
};

export type CharacterWarehouseTab = {
  character: CharacterSummary;
  sections: WarehouseSection[];
};

export type WarehouseHubView = {
  accountId: number;
  accountName: string;
  accountSections: WarehouseSection[];
  characterWarehouses: CharacterWarehouseTab[];
};

export type AdminAccountSummary = {
  id: number;
  name: string;
  accessLevel: number;
  activated: boolean;
};

export type AdminCharacterSummary = {
  id: number;
  name: string;
  accountId: number;
  accountName: string;
  race: string;
  playerClass: string;
  online: boolean;
  lastOnline: Date | null;
};

export type AdminAccountSearchResult = {
  id: number;
  name: string;
  accessLevel: number;
  activated: boolean;
  lastIp: string | null;
};

export type AdminSearchResults = {
  query: string;
  characters: AdminCharacterSummary[];
  accounts: AdminAccountSearchResult[];
  charactersTruncated: boolean;
  accountsTruncated: boolean;
};

export type AdminCharacterDetail = AdminCharacterSummary & {
  gender: string;
  exp: string;
  recoverExp: string;
  creationDate: Date | null;
  deletionDate: Date | null;
  worldId: number;
  worldOwnerId: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  mailboxLetters: number;
  warehouseExpansions: {
    npc: number;
    bonus: number;
    total: number;
    max: number;
  };
};

export type AdminMailRow = {
  mailUniqueId: number;
  senderName: string;
  title: string;
  unread: boolean;
  attachedItemId: number;
  attachedItemName: string | undefined;
  attachedKinahCount: string;
  express: number;
  receivedTime: Date | null;
};

export type AdminBrokerRow = {
  id: number;
  itemPointer: number;
  itemId: number;
  itemName: string | undefined;
  itemCount: string;
  itemCreator: string | null;
  price: string;
  brokerRace: string;
  expireTime: Date | null;
  settleTime: Date | null;
  sold: boolean;
  settled: boolean;
  splittingAvailable: boolean;
};

export type AdminCharacterIssue = {
  severity: "warning" | "error";
  message: string;
};

export type AdminCharacterDetailView = {
  character: AdminCharacterDetail;
  inventoryItems: InventoryItem[];
  accountWarehouseItems: InventoryItem[];
  mail: AdminMailRow[];
  broker: AdminBrokerRow[];
  issues: AdminCharacterIssue[];
};

export type AdminAccountBanRow = {
  kind: "ip" | "mac" | "hdd";
  value: string;
  detail: string;
  endsAt: Date | null;
  active: boolean;
};

export type AdminAccountLoginHistoryRow = {
  date: Date;
  gameserverId: number;
  ip: string | null;
  mac: string | null;
  hddSerial: string | null;
};

export type AdminAccountDetail = AdminAccountSummary & {
  canonicalName: string | null;
  externalAuthName: string | null;
  creationDate: Date | null;
  membership: number;
  oldMembership: number;
  lastServer: number;
  lastIp: string | null;
  lastMac: string | null;
  lastHddSerial: string | null;
  allowedHddSerial: string | null;
  ipForce: string | null;
  expireDate: Date | null;
  toll: string;
  time: {
    lastActive: Date | null;
    expirationTime: Date | null;
    sessionDuration: number;
    accumulatedOnline: number;
    accumulatedRest: number;
    penaltyEnd: Date | null;
  };
  bans: AdminAccountBanRow[];
  loginBlocked: boolean;
};

export type AdminAccountDetailView = {
  account: AdminAccountDetail;
  characters: AdminCharacterSummary[];
  accountWarehouseItems: InventoryItem[];
  loginHistory: AdminAccountLoginHistoryRow[];
};

export type AdminEconomyAccountKinah = {
  accountId: number;
  accountName: string;
  totalKinah: string;
  characterKinah: string;
  accountWarehouseKinah: string;
  accountOnlineWarehouseKinah: string;
};

export type AdminEconomyCharacterKinah = {
  characterId: number;
  characterName: string;
  accountId: number;
  accountName: string;
  totalKinah: string;
  inventoryKinah: string;
  otherCharacterStorageKinah: string;
};

export type AdminEconomyBrokerListing = {
  id: number;
  sellerId: number;
  sellerName: string;
  accountId: number;
  accountName: string;
  itemId: number;
  itemName: string | undefined;
  itemCount: string;
  price: string;
  brokerRace: string;
  sold: boolean;
  settled: boolean;
  expireTime: Date | null;
};

export type AdminEconomyKinahMail = {
  mailUniqueId: number;
  recipientCharacterId: number;
  recipientName: string;
  accountId: number;
  accountName: string;
  senderName: string;
  title: string;
  attachedKinahCount: string;
  unread: boolean;
  express: number;
  receivedTime: Date | null;
};

export type AdminInventoryTemplateAnomaly = {
  itemId: number;
  itemName: string | undefined;
  rowCount: number;
  totalCount: string;
  highestCount: string;
  problem: string;
};

export type AdminInventoryRowAnomaly = {
  severity: "info" | "warning" | "error";
  problem: string;
  itemUniqueId: number;
  ownerId: number;
  ownerName: string | undefined;
  accountId: number | undefined;
  accountName: string | undefined;
  itemId: number;
  itemName: string | undefined;
  itemCount: string;
  storageId: number;
  storageName: string;
  slot: string;
  estimatedValue: string | undefined;
};

export type AdminEconomyReport = {
  generatedAt: Date;
  topAccountsByKinah: AdminEconomyAccountKinah[];
  topCharactersByKinah: AdminEconomyCharacterKinah[];
  highBrokerListings: AdminEconomyBrokerListing[];
  highKinahMail: AdminEconomyKinahMail[];
  missingInventoryTemplates: AdminInventoryTemplateAnomaly[];
  duplicateInventoryObjectIds: AdminInventoryTemplateAnomaly[];
  inventoryAnomalies: AdminInventoryRowAnomaly[];
};

export type AdminBrokerReportStats = {
  totalRows: number;
  activeRows: number;
  expiredUnsettledRows: number;
  expiredSettledRows: number;
  soldSettledRows: number;
  soldUnsettledRows: number;
  unsoldRowsMissingStorage: number;
  orphanBrokerStorageRows: number;
};

export type AdminBrokerReportRow = {
  id: number;
  itemPointer: number;
  sellerId: number;
  sellerName: string;
  accountId: number;
  accountName: string;
  itemId: number;
  itemName: string | undefined;
  itemCount: string;
  itemCreator: string | null;
  price: string;
  brokerRace: string;
  sold: boolean;
  settled: boolean;
  splittingAvailable: boolean;
  expireTime: Date | null;
  settleTime: Date | null;
  storageItemUniqueId: number | null;
  storageOwnerId: number | null;
  storageLocation: number | null;
};

export type AdminBrokerStorageIssue = {
  itemUniqueId: number;
  ownerId: number;
  ownerName: string | undefined;
  accountId: number | undefined;
  accountName: string | undefined;
  itemId: number;
  itemName: string | undefined;
  itemCount: string;
  problem: string;
};

export type AdminBrokerReport = {
  generatedAt: Date;
  stats: AdminBrokerReportStats;
  activeListings: AdminBrokerReportRow[];
  expiredUnsettledListings: AdminBrokerReportRow[];
  settledListings: AdminBrokerReportRow[];
  suspiciousListings: AdminBrokerReportRow[];
  missingStorageListings: AdminBrokerReportRow[];
  storageIssues: AdminBrokerStorageIssue[];
};

export type AdminDashboardView = {
  accountStats: {
    totalAccounts: number;
    activatedAccounts: number;
    adminAccounts: number;
  };
  characterStats: {
    totalCharacters: number;
    onlineCharacters: number;
  };
  inventoryStats: {
    totalRows: number;
    cubeRows: number;
    characterWarehouseRows: number;
    accountWarehouseRows: number;
    onlineWarehouseRows: number;
  };
  adminAccounts: AdminAccountSummary[];
  characters: {
    online: AdminCharacterSummary[];
    offline: AdminCharacterSummary[];
  };
};

export type StorageOwner = "character" | "account";
export type StoragePolicy = "characterWarehouse" | "accountWarehouse";

export type WarehouseStorageDefinition = {
  storageId: number;
  owner: StorageOwner;
  policy: StoragePolicy;
  title: string;
  description: string;
  capacity: number | null;
  rowLength: number;
  maxExpansions: number | null;
};

// item_location is a signed tinyint; keep portal-only storage ids inside -128..127
// and away from known game storage ids such as broker/mailbox 126/127.
export const characterStorageSections = [
  {
    storageId: 1,
    owner: "character",
    policy: "characterWarehouse",
    title: "Character Warehouse",
    description: "Items stored in this character's regular in-game warehouse.",
    capacity: REGULAR_WAREHOUSE_BASE_CAPACITY,
    rowLength: WAREHOUSE_ROW_LENGTH,
    maxExpansions: MAX_WAREHOUSE_EXPANSIONS,
  },
  {
    storageId: 120,
    owner: "character",
    policy: "characterWarehouse",
    title: "Character Online Warehouse",
    description: "Portal-only character storage reserved for the future online warehouse.",
    capacity: null,
    rowLength: WAREHOUSE_ROW_LENGTH,
    maxExpansions: null,
  },
] as const satisfies readonly WarehouseStorageDefinition[];

export const accountStorageSections = [
  {
    storageId: 2,
    owner: "account",
    policy: "accountWarehouse",
    title: "Account Warehouse",
    description: "Items stored in the shared in-game account warehouse.",
    capacity: ACCOUNT_WAREHOUSE_CAPACITY,
    rowLength: WAREHOUSE_ROW_LENGTH,
    maxExpansions: null,
  },
  {
    storageId: 121,
    owner: "account",
    policy: "accountWarehouse",
    title: "Account Online Warehouse",
    description: "Portal-only account storage reserved for the future online warehouse.",
    capacity: null,
    rowLength: WAREHOUSE_ROW_LENGTH,
    maxExpansions: null,
  },
] as const satisfies readonly WarehouseStorageDefinition[];

export const transferStorageSections = [...characterStorageSections, ...accountStorageSections] as const;

type AccountRow = RowDataPacket & {
  id: number;
  accountName: string | null;
  accessLevel: number;
};

export async function findAionAccountByName(name: string): Promise<AionAccount | undefined> {
  const [rows] = await loginDb.query<AccountRow[]>(
    `
      SELECT
        id,
        COALESCE(name, ext_auth_name) AS accountName,
        access_level AS accessLevel
      FROM account_data
      WHERE name = ? OR ext_auth_name = ?
      LIMIT 1
    `,
    [name, name],
  );
  const row = rows[0];
  if (!row) {
    return undefined;
  }
  return {
    id: row.id,
    name: row.accountName ?? name,
    accessLevel: Number(row.accessLevel ?? 0),
  };
}

type AccountLoginRow = AccountRow & {
  passwordHash: string;
  activated: number | boolean;
  expirationTime: Date | null;
  penaltyEnd: Date | null;
  ipForce: string | null;
};

export async function authenticateAionAccount(
  name: string,
  password: string,
  remoteIp?: string,
): Promise<AionAccount | undefined> {
  const [rows] = await loginDb.query<AccountLoginRow[]>(
    `
      SELECT
        ad.id,
        COALESCE(ad.name, ad.ext_auth_name) AS accountName,
        ad.password AS passwordHash,
        ad.activated,
        ad.access_level AS accessLevel,
        ad.ip_force AS ipForce,
        at.expiration_time AS expirationTime,
        at.penalty_end AS penaltyEnd
      FROM account_data ad
      LEFT JOIN account_time at ON at.account_id = ad.id
      WHERE ad.name = ? OR ad.ext_auth_name = ?
      LIMIT 1
    `,
    [name, name],
  );
  const row = rows[0];
  if (!row || !row.activated || !safeStringEqual(row.passwordHash, encodeAionPassword(password))) {
    return undefined;
  }
  const now = Date.now();
  if (row.expirationTime && row.expirationTime.getTime() < now) {
    return undefined;
  }
  if (row.penaltyEnd && (row.penaltyEnd.getTime() === 1000 || row.penaltyEnd.getTime() >= now)) {
    return undefined;
  }
  if (row.ipForce && remoteIp && !networkMaskMatches(row.ipForce, normalizeIp(remoteIp))) {
    return undefined;
  }
  return {
    id: row.id,
    name: row.accountName ?? name,
    accessLevel: Number(row.accessLevel ?? 0),
  };
}

type AccessLevelRow = RowDataPacket & {
  accessLevel: number | null;
};

export async function loadAionAccountAccessLevel(accountId: number): Promise<number> {
  const [rows] = await loginDb.query<AccessLevelRow[]>(
    "SELECT access_level AS accessLevel FROM account_data WHERE id = ? LIMIT 1",
    [accountId],
  );
  return Number(rows[0]?.accessLevel ?? 0);
}

type CharacterRow = RowDataPacket & {
  id: number;
  name: string;
  race: string;
  playerClass: string;
  exp: string | number;
  online: number | boolean;
  lastOnline: Date | null;
  whNpcExpands: number | null;
  whBonusExpands: number | null;
};

export async function listCharacters(accountId: number): Promise<CharacterSummary[]> {
  const [rows] = await gameDb.query<CharacterRow[]>(
    `
      SELECT
        id,
        name,
        race,
        player_class AS playerClass,
        CAST(exp AS CHAR) AS exp,
        online,
        last_online AS lastOnline,
        wh_npc_expands AS whNpcExpands,
        wh_bonus_expands AS whBonusExpands
      FROM players
      WHERE account_id = ? AND (deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP)
      ORDER BY name
    `,
    [accountId],
  );
  return rows.map(toCharacterSummary);
}

type CountValue = number | string | null;

type AdminAccountStatsRow = RowDataPacket & {
  totalAccounts: CountValue;
  activatedAccounts: CountValue;
  adminAccounts: CountValue;
};

type AdminAccountRow = RowDataPacket & {
  id: number;
  accountName: string | null;
  accessLevel: number;
  activated: number | boolean;
};

type AdminAccountDetailRow = AdminAccountRow & {
  canonicalName: string | null;
  externalAuthName: string | null;
  creationDate: Date | null;
  membership: number;
  oldMembership: number;
  lastServer: number;
  lastIp: string | null;
  lastMac: string | null;
  lastHddSerial: string | null;
  allowedHddSerial: string | null;
  ipForce: string | null;
  expireDate: Date | null;
  toll: string;
  lastActive: Date | null;
  expirationTime: Date | null;
  sessionDuration: number | null;
  accumulatedOnline: number | null;
  accumulatedRest: number | null;
  penaltyEnd: Date | null;
};

type AdminAccountLoginHistoryDbRow = RowDataPacket & {
  accountId: number;
  gameserverId: number;
  date: Date;
  ip: string | null;
  mac: string | null;
  hddSerial: string | null;
};

type AdminIpBanDbRow = RowDataPacket & {
  id: number;
  mask: string;
  endsAt: Date | null;
};

type AdminDeviceBanDbRow = RowDataPacket & {
  id: number;
  value: string;
  endsAt: Date | null;
  detail: string | null;
};

type AdminCharacterStatsRow = RowDataPacket & {
  totalCharacters: CountValue;
  onlineCharacters: CountValue;
};

type AdminCharacterRow = RowDataPacket & {
  id: number;
  name: string;
  accountId: number;
  accountName: string | null;
  race: string;
  playerClass: string;
  online: number | boolean;
  lastOnline: Date | null;
};

type AdminAccountSearchDbRow = RowDataPacket & {
  id: number;
  accountName: string | null;
  accessLevel: number | null;
  activated: number | boolean | null;
  lastIp: string | null;
};

type AdminCharacterDetailRow = AdminCharacterRow & {
  gender: string;
  exp: string;
  recoverExp: string;
  creationDate: Date | null;
  deletionDate: Date | null;
  worldId: number;
  worldOwnerId: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  mailboxLetters: number;
  whNpcExpands: number | null;
  whBonusExpands: number | null;
};

type AdminMailDetailRow = RowDataPacket & {
  mailUniqueId: number;
  senderName: string;
  title: string;
  unread: number | boolean;
  attachedItemId: number;
  attachedKinahCount: string;
  express: number;
  receivedTime: Date | null;
};

type AdminBrokerDetailRow = RowDataPacket & {
  id: number;
  itemPointer: number;
  itemId: number;
  itemCount: string;
  itemCreator: string | null;
  price: string;
  brokerRace: string;
  expireTime: Date | null;
  settleTime: Date | null;
  sold: number | boolean;
  settled: number | boolean;
  splittingAvailable: number | boolean;
};

type AdminInventoryStatsRow = RowDataPacket & {
  totalRows: CountValue;
  cubeRows: CountValue;
  characterWarehouseRows: CountValue;
  accountWarehouseRows: CountValue;
  onlineWarehouseRows: CountValue;
};

type AdminCharacterKinahDbRow = RowDataPacket & {
  characterId: number;
  characterName: string;
  accountId: number;
  accountName: string | null;
  inventoryKinah: string | null;
  otherCharacterStorageKinah: string | null;
  totalKinah: string | null;
};

type AdminAccountStorageKinahDbRow = RowDataPacket & {
  accountId: number;
  accountName: string | null;
  accountWarehouseKinah: string | null;
  accountOnlineWarehouseKinah: string | null;
};

type AdminEconomyBrokerDbRow = RowDataPacket & {
  id: number;
  sellerId: number;
  sellerName: string;
  accountId: number;
  accountName: string | null;
  itemId: number;
  itemCount: string;
  price: string;
  brokerRace: string;
  sold: number | boolean;
  settled: number | boolean;
  expireTime: Date | null;
};

type AdminEconomyMailDbRow = RowDataPacket & {
  mailUniqueId: number;
  recipientCharacterId: number;
  recipientName: string;
  accountId: number;
  accountName: string | null;
  senderName: string;
  title: string;
  attachedKinahCount: string;
  unread: number | boolean;
  express: number;
  receivedTime: Date | null;
};

type AdminInventoryTemplateAnomalyDbRow = RowDataPacket & {
  itemId: number;
  rowCount: CountValue;
  totalCount: string | null;
  highestCount: string | null;
};

type AdminInventoryObjectDuplicateDbRow = RowDataPacket & {
  itemUniqueId: number;
  rowCount: CountValue;
  itemId: number;
  totalCount: string | null;
  highestCount: string | null;
};

type AdminInventoryAnomalyDbRow = RowDataPacket & {
  itemUniqueId: number;
  ownerId: number;
  ownerName: string | null;
  accountId: number | null;
  accountName: string | null;
  itemId: number;
  itemCount: string;
  storageId: number;
  slotValue: string;
};

type AdminBrokerReportStatsDbRow = RowDataPacket & {
  totalRows: CountValue;
  activeRows: CountValue;
  expiredUnsettledRows: CountValue;
  expiredSettledRows: CountValue;
  soldSettledRows: CountValue;
  soldUnsettledRows: CountValue;
};

type AdminBrokerStorageCountDbRow = RowDataPacket & {
  count: CountValue;
};

type AdminBrokerReportDbRow = RowDataPacket & {
  id: number;
  itemPointer: number;
  sellerId: number;
  sellerName: string;
  accountId: number;
  accountName: string | null;
  itemId: number;
  itemCount: string;
  itemCreator: string | null;
  price: string;
  brokerRace: string;
  sold: number | boolean;
  settled: number | boolean;
  splittingAvailable: number | boolean;
  expireTime: Date | null;
  settleTime: Date | null;
  storageItemUniqueId: number | null;
  storageOwnerId: number | null;
  storageLocation: number | null;
};

type AdminBrokerStorageIssueDbRow = RowDataPacket & {
  itemUniqueId: number;
  ownerId: number;
  ownerName: string | null;
  accountId: number | null;
  accountName: string | null;
  itemId: number;
  itemCount: string;
  problem: string;
};

export async function loadAdminDashboardView(): Promise<AdminDashboardView> {
  const [
    [accountStatsRows],
    [adminAccountRows],
    [characterStatsRows],
    [characterRows],
    [inventoryStatsRows],
  ] = await Promise.all([
    loginDb.query<AdminAccountStatsRow[]>(
      `
        SELECT
          COUNT(*) AS totalAccounts,
          SUM(CASE WHEN activated = 1 THEN 1 ELSE 0 END) AS activatedAccounts,
          SUM(CASE WHEN access_level >= 9 THEN 1 ELSE 0 END) AS adminAccounts
        FROM account_data
      `,
    ),
    loginDb.query<AdminAccountRow[]>(
      `
        SELECT
          id,
          COALESCE(name, ext_auth_name) AS accountName,
          access_level AS accessLevel,
          activated
        FROM account_data
        WHERE access_level >= 9
        ORDER BY access_level DESC, id
        LIMIT 25
      `,
    ),
    gameDb.query<AdminCharacterStatsRow[]>(
      `
        SELECT
          COUNT(*) AS totalCharacters,
          SUM(CASE WHEN online = 1 THEN 1 ELSE 0 END) AS onlineCharacters
        FROM players
        WHERE deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP
      `,
    ),
    gameDb.query<AdminCharacterRow[]>(
      `
        SELECT
          id,
          name,
          account_id AS accountId,
          account_name AS accountName,
          race,
          player_class AS playerClass,
          online,
          last_online AS lastOnline
        FROM players
        WHERE deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP
        ORDER BY online DESC, name
      `,
    ),
    gameDb.query<AdminInventoryStatsRow[]>(
      `
        SELECT
          COUNT(*) AS totalRows,
          SUM(CASE WHEN item_location = 0 THEN 1 ELSE 0 END) AS cubeRows,
          SUM(CASE WHEN item_location = 1 THEN 1 ELSE 0 END) AS characterWarehouseRows,
          SUM(CASE WHEN item_location = 2 THEN 1 ELSE 0 END) AS accountWarehouseRows,
          SUM(CASE WHEN item_location IN (120, 121) THEN 1 ELSE 0 END) AS onlineWarehouseRows
        FROM inventory
      `,
    ),
  ]);

  const accountStats = accountStatsRows[0];
  const characterStats = characterStatsRows[0];
  const inventoryStats = inventoryStatsRows[0];
  const characters = characterRows.map(toAdminCharacterSummary);

  return {
    accountStats: {
      totalAccounts: toCount(accountStats?.totalAccounts),
      activatedAccounts: toCount(accountStats?.activatedAccounts),
      adminAccounts: toCount(accountStats?.adminAccounts),
    },
    characterStats: {
      totalCharacters: toCount(characterStats?.totalCharacters),
      onlineCharacters: toCount(characterStats?.onlineCharacters),
    },
    inventoryStats: {
      totalRows: toCount(inventoryStats?.totalRows),
      cubeRows: toCount(inventoryStats?.cubeRows),
      characterWarehouseRows: toCount(inventoryStats?.characterWarehouseRows),
      accountWarehouseRows: toCount(inventoryStats?.accountWarehouseRows),
      onlineWarehouseRows: toCount(inventoryStats?.onlineWarehouseRows),
    },
    adminAccounts: adminAccountRows.map(row => ({
      id: row.id,
      name: row.accountName ?? `Account ${row.id}`,
      accessLevel: Number(row.accessLevel ?? 0),
      activated: Boolean(row.activated),
    })),
    characters: {
      online: characters.filter(character => character.online),
      offline: characters.filter(character => !character.online),
    },
  };
}

const ADMIN_SEARCH_LIMIT = 50;

// Lookup box for admin pages: searches characters (game DB) and accounts (login DB)
// by name, id, account name, and IP (current + login history) in one query.
export async function loadAdminSearchResults(rawQuery: string): Promise<AdminSearchResults> {
  const query = rawQuery.trim();
  if (!query) {
    return { query: "", characters: [], accounts: [], charactersTruncated: false, accountsTruncated: false };
  }

  const like = likeContains(query);
  const numeric = /^\d+$/.test(query) ? Number.parseInt(query, 10) : undefined;
  const fetchLimit = ADMIN_SEARCH_LIMIT + 1;

  const [characterRows, accountRows] = await Promise.all([
    loadAdminCharacterSearchRows(like, numeric, fetchLimit),
    loadAdminAccountSearchRows(like, numeric, fetchLimit),
  ]);

  const characters = characterRows.map(toAdminCharacterSummary);
  const accounts = accountRows.map(toAdminAccountSearchResult);

  return {
    query,
    characters: characters.slice(0, ADMIN_SEARCH_LIMIT),
    accounts: accounts.slice(0, ADMIN_SEARCH_LIMIT),
    charactersTruncated: characters.length > ADMIN_SEARCH_LIMIT,
    accountsTruncated: accounts.length > ADMIN_SEARCH_LIMIT,
  };
}

async function loadAdminCharacterSearchRows(
  like: string,
  numeric: number | undefined,
  fetchLimit: number,
): Promise<AdminCharacterRow[]> {
  const conditions = ["name LIKE ?", "account_name LIKE ?"];
  const params: Array<string | number> = [like, like];
  if (numeric !== undefined) {
    conditions.push("id = ?", "account_id = ?");
    params.push(numeric, numeric);
  }

  const [rows] = await gameDb.query<AdminCharacterRow[]>(
    `
      SELECT
        id,
        name,
        account_id AS accountId,
        account_name AS accountName,
        race,
        player_class AS playerClass,
        online,
        last_online AS lastOnline
      FROM players
      WHERE (deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP)
        AND (${conditions.join(" OR ")})
      ORDER BY online DESC, name
      LIMIT ${fetchLimit}
    `,
    params,
  );
  return rows;
}

async function loadAdminAccountSearchRows(
  like: string,
  numeric: number | undefined,
  fetchLimit: number,
): Promise<AdminAccountSearchDbRow[]> {
  const conditions = [
    "ad.name LIKE ?",
    "ad.ext_auth_name LIKE ?",
    "ad.last_ip LIKE ?",
    "ad.id IN (SELECT DISTINCT account_id FROM account_login_history WHERE ip LIKE ?)",
  ];
  const params: Array<string | number> = [like, like, like, like];
  if (numeric !== undefined) {
    conditions.push("ad.id = ?");
    params.push(numeric);
  }

  const [rows] = await loginDb.query<AdminAccountSearchDbRow[]>(
    `
      SELECT
        ad.id,
        COALESCE(ad.name, ad.ext_auth_name) AS accountName,
        ad.access_level AS accessLevel,
        ad.activated,
        ad.last_ip AS lastIp
      FROM account_data ad
      WHERE ${conditions.join(" OR ")}
      ORDER BY ad.access_level DESC, ad.id
      LIMIT ${fetchLimit}
    `,
    params,
  );
  return rows;
}

function toAdminAccountSearchResult(row: AdminAccountSearchDbRow): AdminAccountSearchResult {
  return {
    id: row.id,
    name: row.accountName ?? `Account ${row.id}`,
    accessLevel: Number(row.accessLevel ?? 0),
    activated: Boolean(row.activated),
    lastIp: row.lastIp ?? null,
  };
}

// Escape LIKE metacharacters so user input is treated as a literal substring.
function likeContains(term: string): string {
  const escaped = term.replace(/[\\%_]/g, ch => `\\${ch}`);
  return `%${escaped}%`;
}

export async function loadAdminEconomyReport(itemCatalog: ItemCatalog): Promise<AdminEconomyReport> {
  const [
    characterKinahRows,
    accountStorageKinahRows,
    highBrokerListings,
    highKinahMail,
    missingInventoryTemplates,
    duplicateInventoryObjectIds,
    inventoryAnomalies,
  ] = await Promise.all([
    loadAdminCharacterKinahRows(),
    loadAdminAccountStorageKinahRows(),
    loadAdminHighBrokerListings(itemCatalog),
    loadAdminHighKinahMail(),
    loadAdminMissingInventoryTemplates(itemCatalog),
    loadAdminDuplicateInventoryObjectIds(itemCatalog),
    loadAdminInventoryAnomalies(itemCatalog),
  ]);

  return {
    generatedAt: new Date(),
    topAccountsByKinah: mergeAccountKinahRows(characterKinahRows, accountStorageKinahRows),
    topCharactersByKinah: characterKinahRows
      .map(row => ({
        characterId: row.characterId,
        characterName: row.characterName,
        accountId: row.accountId,
        accountName: row.accountName ?? `Account ${row.accountId}`,
        inventoryKinah: normalizeBigIntString(row.inventoryKinah),
        otherCharacterStorageKinah: normalizeBigIntString(row.otherCharacterStorageKinah),
        totalKinah: normalizeBigIntString(row.totalKinah),
      }))
      .filter(row => BigInt(row.totalKinah) > 0n)
      .sort((left, right) => compareBigIntTextDesc(left.totalKinah, right.totalKinah))
      .slice(0, 25),
    highBrokerListings,
    highKinahMail,
    missingInventoryTemplates,
    duplicateInventoryObjectIds,
    inventoryAnomalies,
  };
}

export async function loadAdminBrokerReport(itemCatalog: ItemCatalog): Promise<AdminBrokerReport> {
  const [
    stats,
    activeListings,
    expiredUnsettledListings,
    settledListings,
    suspiciousListings,
    missingStorageListings,
    storageIssues,
  ] = await Promise.all([
    loadAdminBrokerReportStats(),
    loadAdminBrokerReportRows(
      `
        b.is_sold = 0
        AND b.is_settled = 0
        AND b.expire_time > CURRENT_TIMESTAMP
      `,
      "b.expire_time ASC, b.price DESC, b.id DESC",
      itemCatalog,
    ),
    loadAdminBrokerReportRows(
      `
        b.is_sold = 0
        AND b.is_settled = 0
        AND b.expire_time <= CURRENT_TIMESTAMP
      `,
      "b.expire_time ASC, b.id DESC",
      itemCatalog,
    ),
    loadAdminBrokerReportRows(
      "b.is_settled = 1",
      "b.settle_time DESC, b.id DESC",
      itemCatalog,
    ),
    loadAdminBrokerReportRows(
      `
        b.price <= 0
        OR b.item_count <= 0
        OR b.price > 99999999999
        OR (b.item_count > 0 AND b.price / b.item_count > 999999999)
        OR b.item_id <= 0
      `,
      "b.price DESC, b.id DESC",
      itemCatalog,
    ),
    loadAdminBrokerReportRows(
      `
        b.is_sold = 0
        AND (
          i.item_unique_id IS NULL
          OR i.item_location <> 126
          OR i.item_owner <> b.seller_id
        )
      `,
      "b.expire_time ASC, b.id DESC",
      itemCatalog,
    ),
    loadAdminBrokerStorageIssues(itemCatalog),
  ]);

  return {
    generatedAt: new Date(),
    stats,
    activeListings,
    expiredUnsettledListings,
    settledListings,
    suspiciousListings,
    missingStorageListings,
    storageIssues,
  };
}

export async function loadAdminAccountDetailView(
  accountId: number,
  itemCatalog: ItemCatalog,
): Promise<AdminAccountDetailView | undefined> {
  const [accountRows] = await loginDb.query<AdminAccountDetailRow[]>(
    `
      SELECT
        ad.id,
        ad.name AS canonicalName,
        ad.ext_auth_name AS externalAuthName,
        COALESCE(ad.name, ad.ext_auth_name) AS accountName,
        ad.creation_date AS creationDate,
        ad.activated,
        ad.access_level AS accessLevel,
        ad.membership,
        ad.old_membership AS oldMembership,
        ad.last_server AS lastServer,
        ad.last_ip AS lastIp,
        ad.last_mac AS lastMac,
        ad.last_hdd_serial AS lastHddSerial,
        ad.allowed_hdd_serial AS allowedHddSerial,
        ad.ip_force AS ipForce,
        ad.expire AS expireDate,
        CAST(ad.toll AS CHAR) AS toll,
        at.last_active AS lastActive,
        at.expiration_time AS expirationTime,
        at.session_duration AS sessionDuration,
        at.accumulated_online AS accumulatedOnline,
        at.accumulated_rest AS accumulatedRest,
        at.penalty_end AS penaltyEnd
      FROM account_data ad
      LEFT JOIN account_time at ON at.account_id = ad.id
      WHERE ad.id = ?
      LIMIT 1
    `,
    [accountId],
  );
  const accountRow = accountRows[0];
  if (!accountRow) {
    return undefined;
  }

  const [characters, accountWarehouseItems, loginHistory, bans] = await Promise.all([
    loadAdminCharactersForAccount(accountId),
    loadWarehouseItems(accountId, [2, 121], itemCatalog),
    loadAdminAccountLoginHistory(accountId),
    loadAdminAccountBans(accountRow),
  ]);
  const account = toAdminAccountDetail(accountRow, bans);

  return {
    account,
    characters,
    accountWarehouseItems,
    loginHistory,
  };
}

export async function loadAdminCharacterDetailView(
  characterId: number,
  itemCatalog: ItemCatalog,
): Promise<AdminCharacterDetailView | undefined> {
  const [characterRows] = await gameDb.query<AdminCharacterDetailRow[]>(
    `
      SELECT
        id,
        name,
        account_id AS accountId,
        account_name AS accountName,
        gender,
        race,
        player_class AS playerClass,
        CAST(exp AS CHAR) AS exp,
        CAST(recoverexp AS CHAR) AS recoverExp,
        online,
        creation_date AS creationDate,
        deletion_date AS deletionDate,
        last_online AS lastOnline,
        world_id AS worldId,
        world_owner AS worldOwnerId,
        x,
        y,
        z,
        heading,
        mailbox_letters AS mailboxLetters,
        wh_npc_expands AS whNpcExpands,
        wh_bonus_expands AS whBonusExpands
      FROM players
      WHERE id = ? AND (deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP)
      LIMIT 1
    `,
    [characterId],
  );
  const row = characterRows[0];
  if (!row) {
    return undefined;
  }

  const [inventoryItems, accountWarehouseItems, mail, broker] = await Promise.all([
    loadWarehouseItems(characterId, [0, 1, 120, 126, 127], itemCatalog),
    loadWarehouseItems(row.accountId, [2, 121], itemCatalog),
    loadAdminMailRows(characterId, itemCatalog),
    loadAdminBrokerRows(characterId, itemCatalog),
  ]);
  const character = toAdminCharacterDetail(row);

  return {
    character,
    inventoryItems,
    accountWarehouseItems,
    mail,
    broker,
    issues: adminCharacterIssues(character, inventoryItems, accountWarehouseItems, mail, broker),
  };
}

export async function loadCharacterWarehouseView(
  accountId: number,
  characterId: number,
  itemCatalog: ItemCatalog,
): Promise<CharacterWarehouseView | undefined> {
  const [characterRows] = await gameDb.query<CharacterRow[]>(
    `
      SELECT
        id,
        name,
        race,
        player_class AS playerClass,
        CAST(exp AS CHAR) AS exp,
        online,
        last_online AS lastOnline,
        wh_npc_expands AS whNpcExpands,
        wh_bonus_expands AS whBonusExpands
      FROM players
      WHERE account_id = ? AND id = ? AND (deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP)
      LIMIT 1
    `,
    [accountId, characterId],
  );
  const characterRow = characterRows[0];
  if (!characterRow) {
    return undefined;
  }

  const items = await loadWarehouseItems(
    characterId,
    characterStorageSections.map(section => section.storageId),
    itemCatalog,
  );

  return {
    character: toCharacterSummary(characterRow),
    sections: sectionsWithItems(characterStorageSections, items, characterExpansionSource(characterRow)),
  };
}

export async function loadAccountWarehouseView(
  accountId: number,
  accountName: string,
  itemCatalog: ItemCatalog,
): Promise<AccountWarehouseView> {
  const items = await loadWarehouseItems(
    accountId,
    accountStorageSections.map(section => section.storageId),
    itemCatalog,
  );

  return {
    accountId,
    accountName,
    sections: sectionsWithItems(accountStorageSections, items),
  };
}

export async function loadWarehouseHubView(
  accountId: number,
  accountName: string,
  itemCatalog: ItemCatalog,
): Promise<WarehouseHubView> {
  const characters = await listCharacters(accountId);
  const accountItems = await loadWarehouseItems(
    accountId,
    accountStorageSections.map(section => section.storageId),
    itemCatalog,
  );
  const characterWarehouses = await Promise.all(
    characters.map(async character => {
      const items = await loadWarehouseItems(
        character.id,
        characterStorageSections.map(section => section.storageId),
        itemCatalog,
      );
      return {
        character,
        sections: sectionsWithItems(characterStorageSections, items, {
          whNpcExpands: character.warehouseExpansions.npc,
          whBonusExpands: character.warehouseExpansions.bonus,
        }),
      };
    }),
  );

  return {
    accountId,
    accountName,
    accountSections: sectionsWithItems(accountStorageSections, accountItems),
    characterWarehouses,
  };
}

export async function loadTransferWorkbenchView(
  accountId: number,
  accountName: string,
  characterId: number,
  itemCatalog: ItemCatalog,
): Promise<TransferWorkbenchView | undefined> {
  const character = await loadCharacterSummary(accountId, characterId);
  if (!character) {
    return undefined;
  }

  const characterItems = await loadWarehouseItems(
    characterId,
    characterStorageSections.map(section => section.storageId),
    itemCatalog,
  );
  const accountItems = await loadWarehouseItems(
    accountId,
    accountStorageSections.map(section => section.storageId),
    itemCatalog,
  );
  const items = [...characterItems, ...accountItems];

  return {
    accountId,
    accountName,
    character,
    sections: sectionsWithItems(transferStorageSections, items, {
      whNpcExpands: character.warehouseExpansions.npc,
      whBonusExpands: character.warehouseExpansions.bonus,
    }),
  };
}

type InventoryRow = RowDataPacket & {
  itemUniqueId: number;
  itemId: number;
  itemCount: string;
  storageId: number;
  slotValue: string;
  equipped: number | boolean;
  enchant: number;
  soulBound: number | boolean;
  itemCreator: string | null;
};

async function loadWarehouseItems(
  ownerId: number,
  storageIds: readonly number[],
  itemCatalog: ItemCatalog,
): Promise<InventoryItem[]> {
  const storagePlaceholders = storageIds.map(() => "?").join(", ");
  const [rows] = await gameDb.query<InventoryRow[]>(
    `
      SELECT
        item_unique_id AS itemUniqueId,
        item_id AS itemId,
        CAST(item_count AS CHAR) AS itemCount,
        item_location AS storageId,
        CAST(slot AS CHAR) AS slotValue,
        is_equipped AS equipped,
        enchant,
        is_soul_bound AS soulBound,
        item_creator AS itemCreator
      FROM inventory
      WHERE item_owner = ? AND item_location IN (${storagePlaceholders})
      ORDER BY item_location, is_equipped DESC, slot, item_id, item_unique_id
    `,
    [ownerId, ...storageIds],
  );

  return rows.map(row => {
    const soulBound = Boolean(row.soulBound);
    const template = itemCatalog.templateFor(row.itemId);
    return {
      itemUniqueId: row.itemUniqueId,
      itemId: row.itemId,
      itemName: template?.name,
      itemCName: template?.cName,
      itemQuality: template?.quality,
      itemGroup: template?.itemGroup,
      itemType: template?.itemType,
      itemRace: template?.race,
      itemLevel: template?.level ?? 0,
      itemMaxStackCount: template?.maxStackCount ?? 1,
      itemPrice: template?.price ?? 0,
      itemDescId: template?.descId,
      itemCount: row.itemCount,
      storageId: row.storageId,
      storageName: storageName(row.storageId),
      slot: row.slotValue,
      equipped: Boolean(row.equipped),
      enchant: row.enchant,
      soulBound,
      stackable: itemCatalog.isStackable(row.itemId),
      storableInWarehouse: itemCatalog.isStorableInWarehouse(row.itemId),
      storableInAccountWarehouse: itemCatalog.isStorableInAccountWarehouse(row.itemId, soulBound),
      itemCreator: row.itemCreator,
    };
  });
}

async function loadAdminMailRows(characterId: number, itemCatalog: ItemCatalog): Promise<AdminMailRow[]> {
  const [rows] = await gameDb.query<AdminMailDetailRow[]>(
    `
      SELECT
        mail_unique_id AS mailUniqueId,
        sender_name AS senderName,
        mail_title AS title,
        unread,
        attached_item_id AS attachedItemId,
        CAST(attached_kinah_count AS CHAR) AS attachedKinahCount,
        express,
        recieved_time AS receivedTime
      FROM mail
      WHERE mail_recipient_id = ?
      ORDER BY recieved_time DESC, mail_unique_id DESC
      LIMIT 100
    `,
    [characterId],
  );

  return rows.map(row => ({
    mailUniqueId: row.mailUniqueId,
    senderName: row.senderName,
    title: row.title,
    unread: Boolean(row.unread),
    attachedItemId: row.attachedItemId,
    attachedItemName: row.attachedItemId > 0 ? itemCatalog.nameFor(row.attachedItemId) : undefined,
    attachedKinahCount: row.attachedKinahCount,
    express: row.express,
    receivedTime: row.receivedTime,
  }));
}

async function loadAdminBrokerRows(characterId: number, itemCatalog: ItemCatalog): Promise<AdminBrokerRow[]> {
  const [rows] = await gameDb.query<AdminBrokerDetailRow[]>(
    `
      SELECT
        id,
        item_pointer AS itemPointer,
        item_id AS itemId,
        CAST(item_count AS CHAR) AS itemCount,
        item_creator AS itemCreator,
        CAST(price AS CHAR) AS price,
        broker_race AS brokerRace,
        expire_time AS expireTime,
        settle_time AS settleTime,
        is_sold AS sold,
        is_settled AS settled,
        splitting_available AS splittingAvailable
      FROM broker
      WHERE seller_id = ?
      ORDER BY is_sold, is_settled, expire_time DESC, id DESC
      LIMIT 100
    `,
    [characterId],
  );

  return rows.map(row => ({
    id: row.id,
    itemPointer: row.itemPointer,
    itemId: row.itemId,
    itemName: itemCatalog.nameFor(row.itemId),
    itemCount: row.itemCount,
    itemCreator: row.itemCreator,
    price: row.price,
    brokerRace: row.brokerRace,
    expireTime: row.expireTime,
    settleTime: row.settleTime,
    sold: Boolean(row.sold),
    settled: Boolean(row.settled),
    splittingAvailable: Boolean(row.splittingAvailable),
  }));
}

async function loadAdminCharacterKinahRows(): Promise<AdminCharacterKinahDbRow[]> {
  const [rows] = await gameDb.query<AdminCharacterKinahDbRow[]>(
    `
      SELECT
        p.id AS characterId,
        p.name AS characterName,
        p.account_id AS accountId,
        p.account_name AS accountName,
        CAST(COALESCE(SUM(CASE WHEN i.item_location = 0 THEN i.item_count ELSE 0 END), 0) AS CHAR) AS inventoryKinah,
        CAST(COALESCE(SUM(CASE WHEN i.item_location <> 0 THEN i.item_count ELSE 0 END), 0) AS CHAR) AS otherCharacterStorageKinah,
        CAST(COALESCE(SUM(i.item_count), 0) AS CHAR) AS totalKinah
      FROM players p
      LEFT JOIN inventory i
        ON i.item_owner = p.id
        AND i.item_id = ?
        AND i.item_location NOT IN (2, 121)
      WHERE p.deletion_date IS NULL OR p.deletion_date > CURRENT_TIMESTAMP
      GROUP BY p.id, p.name, p.account_id, p.account_name
      HAVING COALESCE(SUM(i.item_count), 0) > 0
      ORDER BY COALESCE(SUM(i.item_count), 0) DESC
      LIMIT 50
    `,
    [KINAH_ITEM_ID],
  );
  return rows;
}

async function loadAdminAccountStorageKinahRows(): Promise<AdminAccountStorageKinahDbRow[]> {
  const [rows] = await gameDb.query<AdminAccountStorageKinahDbRow[]>(
    `
      SELECT
        i.item_owner AS accountId,
        COALESCE(p.accountName, CONCAT('Account ', i.item_owner)) AS accountName,
        CAST(COALESCE(SUM(CASE WHEN i.item_location = 2 THEN i.item_count ELSE 0 END), 0) AS CHAR) AS accountWarehouseKinah,
        CAST(COALESCE(SUM(CASE WHEN i.item_location = 121 THEN i.item_count ELSE 0 END), 0) AS CHAR) AS accountOnlineWarehouseKinah
      FROM inventory i
      LEFT JOIN (
        SELECT account_id, MIN(account_name) AS accountName
        FROM players
        GROUP BY account_id
      ) p ON p.account_id = i.item_owner
      WHERE i.item_id = ? AND i.item_location IN (2, 121)
      GROUP BY i.item_owner, p.accountName
      ORDER BY CAST(COALESCE(SUM(i.item_count), 0) AS DECIMAL(30, 0)) DESC
      LIMIT 50
    `,
    [KINAH_ITEM_ID],
  );
  return rows;
}

async function loadAdminHighBrokerListings(itemCatalog: ItemCatalog): Promise<AdminEconomyBrokerListing[]> {
  const [rows] = await gameDb.query<AdminEconomyBrokerDbRow[]>(
    `
      SELECT
        b.id,
        b.seller_id AS sellerId,
        p.name AS sellerName,
        p.account_id AS accountId,
        p.account_name AS accountName,
        b.item_id AS itemId,
        CAST(b.item_count AS CHAR) AS itemCount,
        CAST(b.price AS CHAR) AS price,
        b.broker_race AS brokerRace,
        b.is_sold AS sold,
        b.is_settled AS settled,
        b.expire_time AS expireTime
      FROM broker b
      JOIN players p ON p.id = b.seller_id
      ORDER BY b.price DESC, b.id DESC
      LIMIT 25
    `,
  );
  return rows.map(row => ({
    id: row.id,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    accountId: row.accountId,
    accountName: row.accountName ?? `Account ${row.accountId}`,
    itemId: row.itemId,
    itemName: itemCatalog.nameFor(row.itemId),
    itemCount: row.itemCount,
    price: row.price,
    brokerRace: row.brokerRace,
    sold: Boolean(row.sold),
    settled: Boolean(row.settled),
    expireTime: row.expireTime,
  }));
}

async function loadAdminHighKinahMail(): Promise<AdminEconomyKinahMail[]> {
  const [rows] = await gameDb.query<AdminEconomyMailDbRow[]>(
    `
      SELECT
        m.mail_unique_id AS mailUniqueId,
        m.mail_recipient_id AS recipientCharacterId,
        p.name AS recipientName,
        p.account_id AS accountId,
        p.account_name AS accountName,
        m.sender_name AS senderName,
        m.mail_title AS title,
        CAST(m.attached_kinah_count AS CHAR) AS attachedKinahCount,
        m.unread,
        m.express,
        m.recieved_time AS receivedTime
      FROM mail m
      JOIN players p ON p.id = m.mail_recipient_id
      WHERE m.attached_kinah_count > 0
      ORDER BY m.attached_kinah_count DESC, m.recieved_time DESC
      LIMIT 25
    `,
  );
  return rows.map(row => ({
    mailUniqueId: row.mailUniqueId,
    recipientCharacterId: row.recipientCharacterId,
    recipientName: row.recipientName,
    accountId: row.accountId,
    accountName: row.accountName ?? `Account ${row.accountId}`,
    senderName: row.senderName,
    title: row.title,
    attachedKinahCount: row.attachedKinahCount,
    unread: Boolean(row.unread),
    express: row.express,
    receivedTime: row.receivedTime,
  }));
}

async function loadAdminMissingInventoryTemplates(itemCatalog: ItemCatalog): Promise<AdminInventoryTemplateAnomaly[]> {
  const [rows] = await gameDb.query<AdminInventoryTemplateAnomalyDbRow[]>(
    `
      SELECT
        item_id AS itemId,
        COUNT(*) AS rowCount,
        CAST(COALESCE(SUM(item_count), 0) AS CHAR) AS totalCount,
        CAST(COALESCE(MAX(item_count), 0) AS CHAR) AS highestCount
      FROM inventory
      GROUP BY item_id
      ORDER BY COUNT(*) DESC, item_id
    `,
  );

  return rows
    .filter(row => !itemCatalog.templateFor(row.itemId))
    .map(row => ({
      itemId: row.itemId,
      itemName: undefined,
      rowCount: toCount(row.rowCount),
      totalCount: normalizeBigIntString(row.totalCount),
      highestCount: normalizeBigIntString(row.highestCount),
      problem: "Inventory rows reference an item template missing from the local item catalog.",
    }))
    .slice(0, 25);
}

async function loadAdminDuplicateInventoryObjectIds(itemCatalog: ItemCatalog): Promise<AdminInventoryTemplateAnomaly[]> {
  const [rows] = await gameDb.query<AdminInventoryObjectDuplicateDbRow[]>(
    `
      SELECT
        item_unique_id AS itemUniqueId,
        COUNT(*) AS rowCount,
        MIN(item_id) AS itemId,
        CAST(COALESCE(SUM(item_count), 0) AS CHAR) AS totalCount,
        CAST(COALESCE(MAX(item_count), 0) AS CHAR) AS highestCount
      FROM inventory
      GROUP BY item_unique_id
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, item_unique_id
      LIMIT 25
    `,
  );

  return rows.map(row => ({
    itemId: row.itemId,
    itemName: itemCatalog.nameFor(row.itemId),
    rowCount: toCount(row.rowCount),
    totalCount: normalizeBigIntString(row.totalCount),
    highestCount: normalizeBigIntString(row.highestCount),
    problem: `Inventory object id ${row.itemUniqueId} appears in multiple rows.`,
  }));
}

async function loadAdminInventoryAnomalies(itemCatalog: ItemCatalog): Promise<AdminInventoryRowAnomaly[]> {
  const [invalidRows, overstackCandidates, highValueCandidates] = await Promise.all([
    queryAdminInventoryRows(
      `
        i.item_unique_id <= 0
        OR i.item_owner <= 0
        OR i.item_id <= 0
        OR i.item_count <= 0
      `,
      [],
      "i.item_unique_id DESC",
      25,
    ),
    queryAdminInventoryRows(
      `
        i.item_id <> ?
        AND i.item_count > 1
      `,
      [KINAH_ITEM_ID],
      "i.item_count DESC, i.item_unique_id DESC",
      1500,
    ),
    loadAdminHighValueInventoryCandidates(itemCatalog),
  ]);

  const invalid = invalidRows.map(row =>
    toAdminInventoryRowAnomaly(row, itemCatalog, "error", "Inventory row has an invalid object id, owner, item id, or count."),
  );
  const overstacked = overstackCandidates
    .filter(row => isOverstackedInventoryRow(row, itemCatalog))
    .slice(0, 25)
    .map(row => {
      const maxStack = itemCatalog.templateFor(row.itemId)?.maxStackCount ?? 1;
      return toAdminInventoryRowAnomaly(
        row,
        itemCatalog,
        "warning",
        `Stored count exceeds this template's max stack count of ${maxStack}.`,
      );
    });
  const highValue = highValueCandidates
    .map(row => toAdminInventoryRowAnomaly(row, itemCatalog, "info", "High estimated stored item value."))
    .filter(row => row.estimatedValue !== undefined && BigInt(row.estimatedValue) > 0n)
    .sort((left, right) => compareBigIntTextDesc(left.estimatedValue ?? "0", right.estimatedValue ?? "0"))
    .slice(0, 25);

  return [...invalid, ...overstacked, ...highValue].slice(0, 75);
}

async function loadAdminHighValueInventoryCandidates(itemCatalog: ItemCatalog): Promise<AdminInventoryAnomalyDbRow[]> {
  const expensiveItemIds = itemCatalog
    .allTemplates()
    .filter(template => template.id !== KINAH_ITEM_ID && template.price > 0)
    .sort((left, right) => right.price - left.price || left.id - right.id)
    .slice(0, 750)
    .map(template => template.id);

  if (expensiveItemIds.length === 0) {
    return [];
  }

  const placeholders = expensiveItemIds.map(() => "?").join(", ");
  return queryAdminInventoryRows(
    `i.item_id IN (${placeholders})`,
    expensiveItemIds,
    "i.item_count DESC, i.item_unique_id DESC",
    2000,
  );
}

async function queryAdminInventoryRows(
  whereSql: string,
  params: unknown[],
  orderSql: string,
  limit: number,
): Promise<AdminInventoryAnomalyDbRow[]> {
  const [rows] = await gameDb.query<AdminInventoryAnomalyDbRow[]>(
    `
      SELECT
        i.item_unique_id AS itemUniqueId,
        i.item_owner AS ownerId,
        character_owner.name AS ownerName,
        COALESCE(character_owner.account_id, account_owner.accountId) AS accountId,
        COALESCE(character_owner.account_name, account_owner.accountName) AS accountName,
        i.item_id AS itemId,
        CAST(i.item_count AS CHAR) AS itemCount,
        i.item_location AS storageId,
        CAST(i.slot AS CHAR) AS slotValue
      FROM inventory i
      LEFT JOIN players character_owner ON character_owner.id = i.item_owner
      LEFT JOIN (
        SELECT account_id AS accountId, MIN(account_name) AS accountName
        FROM players
        GROUP BY account_id
      ) account_owner ON account_owner.accountId = i.item_owner
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ${Math.max(1, Math.min(limit, 5000))}
    `,
    params,
  );
  return rows;
}

function isOverstackedInventoryRow(row: AdminInventoryAnomalyDbRow, itemCatalog: ItemCatalog): boolean {
  const template = itemCatalog.templateFor(row.itemId);
  if (!template || row.itemId === KINAH_ITEM_ID) {
    return false;
  }
  return BigInt(normalizeBigIntString(row.itemCount)) > BigInt(Math.max(template.maxStackCount, 1));
}

function toAdminInventoryRowAnomaly(
  row: AdminInventoryAnomalyDbRow,
  itemCatalog: ItemCatalog,
  severity: AdminInventoryRowAnomaly["severity"],
  problem: string,
): AdminInventoryRowAnomaly {
  const template = itemCatalog.templateFor(row.itemId);
  const count = normalizeBigIntString(row.itemCount);
  const estimatedValue = template && template.price > 0
    ? (BigInt(template.price) * BigInt(count)).toString()
    : undefined;

  return {
    severity,
    problem,
    itemUniqueId: row.itemUniqueId,
    ownerId: row.ownerId,
    ownerName: row.ownerName ?? undefined,
    accountId: row.accountId ?? undefined,
    accountName: row.accountName ?? undefined,
    itemId: row.itemId,
    itemName: template?.name,
    itemCount: count,
    storageId: row.storageId,
    storageName: storageName(row.storageId),
    slot: row.slotValue,
    estimatedValue,
  };
}

async function loadAdminBrokerReportStats(): Promise<AdminBrokerReportStats> {
  const [[statsRows], [missingStorageRows], [orphanRows]] = await Promise.all([
    gameDb.query<AdminBrokerReportStatsDbRow[]>(
      `
        SELECT
          COUNT(*) AS totalRows,
          SUM(CASE WHEN is_sold = 0 AND is_settled = 0 AND expire_time > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS activeRows,
          SUM(CASE WHEN is_sold = 0 AND is_settled = 0 AND expire_time <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS expiredUnsettledRows,
          SUM(CASE WHEN is_sold = 0 AND is_settled = 1 THEN 1 ELSE 0 END) AS expiredSettledRows,
          SUM(CASE WHEN is_sold = 1 AND is_settled = 1 THEN 1 ELSE 0 END) AS soldSettledRows,
          SUM(CASE WHEN is_sold = 1 AND is_settled = 0 THEN 1 ELSE 0 END) AS soldUnsettledRows
        FROM broker
      `,
    ),
    gameDb.query<AdminBrokerStorageCountDbRow[]>(
      `
        SELECT COUNT(*) AS count
        FROM broker b
        LEFT JOIN inventory i ON i.item_unique_id = b.item_pointer
        WHERE b.is_sold = 0
          AND (
            i.item_unique_id IS NULL
            OR i.item_location <> 126
            OR i.item_owner <> b.seller_id
          )
      `,
    ),
    gameDb.query<AdminBrokerStorageCountDbRow[]>(
      `
        SELECT COUNT(*) AS count
        FROM inventory i
        LEFT JOIN broker b ON b.item_pointer = i.item_unique_id AND b.is_sold = 0
        WHERE i.item_location = 126 AND b.id IS NULL
      `,
    ),
  ]);
  const row = statsRows[0];
  return {
    totalRows: toCount(row?.totalRows),
    activeRows: toCount(row?.activeRows),
    expiredUnsettledRows: toCount(row?.expiredUnsettledRows),
    expiredSettledRows: toCount(row?.expiredSettledRows),
    soldSettledRows: toCount(row?.soldSettledRows),
    soldUnsettledRows: toCount(row?.soldUnsettledRows),
    unsoldRowsMissingStorage: toCount(missingStorageRows[0]?.count),
    orphanBrokerStorageRows: toCount(orphanRows[0]?.count),
  };
}

async function loadAdminBrokerReportRows(
  whereClause: string,
  orderBy: string,
  itemCatalog: ItemCatalog,
): Promise<AdminBrokerReportRow[]> {
  const [rows] = await gameDb.query<AdminBrokerReportDbRow[]>(
    `
      SELECT
        b.id,
        b.item_pointer AS itemPointer,
        b.seller_id AS sellerId,
        p.name AS sellerName,
        p.account_id AS accountId,
        p.account_name AS accountName,
        b.item_id AS itemId,
        CAST(b.item_count AS CHAR) AS itemCount,
        b.item_creator AS itemCreator,
        CAST(b.price AS CHAR) AS price,
        b.broker_race AS brokerRace,
        b.is_sold AS sold,
        b.is_settled AS settled,
        b.splitting_available AS splittingAvailable,
        b.expire_time AS expireTime,
        b.settle_time AS settleTime,
        i.item_unique_id AS storageItemUniqueId,
        i.item_owner AS storageOwnerId,
        i.item_location AS storageLocation
      FROM broker b
      JOIN players p ON p.id = b.seller_id
      LEFT JOIN inventory i ON i.item_unique_id = b.item_pointer
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT 25
    `,
  );
  return rows.map(row => toAdminBrokerReportRow(row, itemCatalog));
}

async function loadAdminBrokerStorageIssues(itemCatalog: ItemCatalog): Promise<AdminBrokerStorageIssue[]> {
  const [rows] = await gameDb.query<AdminBrokerStorageIssueDbRow[]>(
    `
      SELECT
        i.item_unique_id AS itemUniqueId,
        i.item_owner AS ownerId,
        p.name AS ownerName,
        p.account_id AS accountId,
        p.account_name AS accountName,
        i.item_id AS itemId,
        CAST(i.item_count AS CHAR) AS itemCount,
        'Broker storage item has no unsold broker row.' AS problem
      FROM inventory i
      LEFT JOIN broker b ON b.item_pointer = i.item_unique_id AND b.is_sold = 0
      LEFT JOIN players p ON p.id = i.item_owner
      WHERE i.item_location = 126 AND b.id IS NULL
      ORDER BY i.item_unique_id DESC
      LIMIT 25
    `,
  );
  return rows.map(row => ({
    itemUniqueId: row.itemUniqueId,
    ownerId: row.ownerId,
    ownerName: row.ownerName ?? undefined,
    accountId: row.accountId ?? undefined,
    accountName: row.accountName ?? undefined,
    itemId: row.itemId,
    itemName: itemCatalog.nameFor(row.itemId),
    itemCount: row.itemCount,
    problem: row.problem,
  }));
}

async function loadAdminCharactersForAccount(accountId: number): Promise<AdminCharacterSummary[]> {
  const [rows] = await gameDb.query<AdminCharacterRow[]>(
    `
      SELECT
        id,
        name,
        account_id AS accountId,
        account_name AS accountName,
        race,
        player_class AS playerClass,
        online,
        last_online AS lastOnline
      FROM players
      WHERE account_id = ? AND (deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP)
      ORDER BY online DESC, name
    `,
    [accountId],
  );
  return rows.map(toAdminCharacterSummary);
}

async function loadAdminAccountLoginHistory(accountId: number): Promise<AdminAccountLoginHistoryRow[]> {
  const [rows] = await loginDb.query<AdminAccountLoginHistoryDbRow[]>(
    `
      SELECT
        account_id AS accountId,
        gameserver_id AS gameserverId,
        date,
        ip,
        mac,
        hdd_serial AS hddSerial
      FROM account_login_history
      WHERE account_id = ?
      ORDER BY date DESC
      LIMIT 50
    `,
    [accountId],
  );
  return rows.map(row => ({
    date: row.date,
    gameserverId: row.gameserverId,
    ip: row.ip,
    mac: row.mac,
    hddSerial: row.hddSerial,
  }));
}

async function loadAdminAccountBans(account: AdminAccountDetailRow): Promise<AdminAccountBanRow[]> {
  const [ipRows, macRows, hddRows] = await Promise.all([
    loadMatchingIpBans(account.lastIp),
    loadMatchingDeviceBans("mac", account.lastMac),
    loadMatchingDeviceBans("hdd", account.lastHddSerial),
  ]);
  return [...ipRows, ...macRows, ...hddRows];
}

async function loadMatchingIpBans(ip: string | null): Promise<AdminAccountBanRow[]> {
  if (!ip) {
    return [];
  }
  const normalizedIp = normalizeIp(ip);
  const [rows] = await loginDb.query<AdminIpBanDbRow[]>(
    `
      SELECT id, mask, time_end AS endsAt
      FROM banned_ip
      ORDER BY id DESC
    `,
  );
  return rows
    .filter(row => networkMaskMatches(row.mask, normalizedIp))
    .map(row => ({
      kind: "ip" as const,
      value: row.mask,
      detail: `Matches last IP ${ip}`,
      endsAt: row.endsAt,
      active: isBanActive(row.endsAt),
    }));
}

async function loadMatchingDeviceBans(kind: "mac" | "hdd", value: string | null): Promise<AdminAccountBanRow[]> {
  const normalized = value?.trim();
  if (!normalized || normalized === "xx-xx-xx-xx-xx-xx") {
    return [];
  }
  const table = kind === "mac" ? "banned_mac" : "banned_hdd";
  const valueColumn = kind === "mac" ? "address" : "serial";
  const idColumn = kind === "mac" ? "uniId" : "id";
  const detailColumn = kind === "mac" ? "details" : "''";
  const [rows] = await loginDb.query<AdminDeviceBanDbRow[]>(
    `
      SELECT
        ${idColumn} AS id,
        ${valueColumn} AS value,
        time AS endsAt,
        ${detailColumn} AS detail
      FROM ${table}
      WHERE ${valueColumn} = ?
      ORDER BY ${idColumn} DESC
    `,
    [normalized],
  );
  return rows.map(row => ({
    kind,
    value: row.value,
    detail: row.detail || `Matches last ${kind.toUpperCase()}`,
    endsAt: row.endsAt,
    active: isBanActive(row.endsAt),
  }));
}

function sectionsWithItems(
  sections: readonly WarehouseStorageDefinition[],
  items: InventoryItem[],
  characterExpansion?: WarehouseExpansionSource,
): WarehouseSection[] {
  return sections.map(section => {
    const sectionItems = items.filter(item => item.storageId === section.storageId);
    const kinahItems = sectionItems.filter(isKinahItem);
    const normalItems = sectionItems.filter(item => !isKinahItem(item));
    return {
      storageId: section.storageId,
      title: section.title,
      description: section.description,
      capacity: resolveCapacityInfo(section, normalItems, characterExpansion),
      kinah: mergeKinahItems(kinahItems),
      items: normalItems,
    };
  });
}

function isKinahItem(item: InventoryItem): boolean {
  return item.itemId === KINAH_ITEM_ID;
}

function mergeKinahItems(items: InventoryItem[]): InventoryItem | undefined {
  const first = items[0];
  if (!first) {
    return undefined;
  }
  if (items.length === 1) {
    return first;
  }
  const total = items.reduce((sum, item) => sum + BigInt(item.itemCount), 0n);
  return {
    ...first,
    itemCount: total.toString(),
  };
}

function toCharacterSummary(row: CharacterRow): CharacterSummary {
  const expansions = characterExpansionSource(row);
  return {
    id: row.id,
    name: row.name,
    race: row.race,
    playerClass: row.playerClass,
    exp: String(row.exp),
    online: Boolean(row.online),
    lastOnline: row.lastOnline,
    warehouseExpansions: {
      npc: expansions.whNpcExpands,
      bonus: expansions.whBonusExpands,
      total: warehouseExpansionLevel(expansions),
      max: MAX_WAREHOUSE_EXPANSIONS,
    },
  };
}

function toAdminCharacterSummary(row: AdminCharacterRow): AdminCharacterSummary {
  return {
    id: row.id,
    name: row.name,
    accountId: row.accountId,
    accountName: row.accountName ?? `Account ${row.accountId}`,
    race: row.race,
    playerClass: row.playerClass,
    online: Boolean(row.online),
    lastOnline: row.lastOnline,
  };
}

function toAdminAccountDetail(row: AdminAccountDetailRow, bans: AdminAccountBanRow[]): AdminAccountDetail {
  const time = {
    lastActive: row.lastActive,
    expirationTime: row.expirationTime,
    sessionDuration: Number(row.sessionDuration ?? 0),
    accumulatedOnline: Number(row.accumulatedOnline ?? 0),
    accumulatedRest: Number(row.accumulatedRest ?? 0),
    penaltyEnd: row.penaltyEnd,
  };

  return {
    id: row.id,
    name: row.accountName ?? `Account ${row.id}`,
    canonicalName: row.canonicalName,
    externalAuthName: row.externalAuthName,
    accessLevel: Number(row.accessLevel ?? 0),
    activated: Boolean(row.activated),
    creationDate: row.creationDate,
    membership: Number(row.membership ?? 0),
    oldMembership: Number(row.oldMembership ?? 0),
    lastServer: Number(row.lastServer ?? -1),
    lastIp: row.lastIp,
    lastMac: row.lastMac,
    lastHddSerial: row.lastHddSerial,
    allowedHddSerial: row.allowedHddSerial,
    ipForce: row.ipForce,
    expireDate: row.expireDate,
    toll: row.toll,
    time,
    bans,
    loginBlocked: isLoginBlocked(Boolean(row.activated), row.expireDate, time.expirationTime, time.penaltyEnd, bans),
  };
}

function toAdminBrokerReportRow(row: AdminBrokerReportDbRow, itemCatalog: ItemCatalog): AdminBrokerReportRow {
  return {
    id: row.id,
    itemPointer: row.itemPointer,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    accountId: row.accountId,
    accountName: row.accountName ?? `Account ${row.accountId}`,
    itemId: row.itemId,
    itemName: itemCatalog.nameFor(row.itemId),
    itemCount: row.itemCount,
    itemCreator: row.itemCreator,
    price: row.price,
    brokerRace: row.brokerRace,
    sold: Boolean(row.sold),
    settled: Boolean(row.settled),
    splittingAvailable: Boolean(row.splittingAvailable),
    expireTime: row.expireTime,
    settleTime: row.settleTime,
    storageItemUniqueId: row.storageItemUniqueId,
    storageOwnerId: row.storageOwnerId,
    storageLocation: row.storageLocation,
  };
}

function toAdminCharacterDetail(row: AdminCharacterDetailRow): AdminCharacterDetail {
  const expansions = characterExpansionSource(row);
  return {
    id: row.id,
    name: row.name,
    accountId: row.accountId,
    accountName: row.accountName ?? `Account ${row.accountId}`,
    gender: row.gender,
    race: row.race,
    playerClass: row.playerClass,
    exp: row.exp,
    recoverExp: row.recoverExp,
    online: Boolean(row.online),
    creationDate: row.creationDate,
    deletionDate: row.deletionDate,
    lastOnline: row.lastOnline,
    worldId: row.worldId,
    worldOwnerId: row.worldOwnerId,
    x: row.x,
    y: row.y,
    z: row.z,
    heading: row.heading,
    mailboxLetters: Number(row.mailboxLetters ?? 0),
    warehouseExpansions: {
      npc: expansions.whNpcExpands,
      bonus: expansions.whBonusExpands,
      total: warehouseExpansionLevel(expansions),
      max: MAX_WAREHOUSE_EXPANSIONS,
    },
  };
}

function adminCharacterIssues(
  character: AdminCharacterDetail,
  inventoryItems: InventoryItem[],
  accountWarehouseItems: InventoryItem[],
  mail: AdminMailRow[],
  broker: AdminBrokerRow[],
): AdminCharacterIssue[] {
  const issues: AdminCharacterIssue[] = [];
  const allItems = [...inventoryItems, ...accountWarehouseItems];

  for (const item of allItems) {
    if (item.itemId !== KINAH_ITEM_ID && !item.itemName) {
      issues.push({
        severity: "warning",
        message: `Inventory object ${item.itemUniqueId} uses missing item template ${item.itemId}.`,
      });
    }
    if (!isPositiveBigIntText(item.itemCount)) {
      issues.push({
        severity: "error",
        message: `Inventory object ${item.itemUniqueId} has invalid count ${item.itemCount}.`,
      });
    }

    const slot = parseStorageSlot(item.slot);
    if (slot === undefined || item.itemId === KINAH_ITEM_ID) {
      continue;
    }
    if (item.storageId === 1 && slot >= characterWarehouseCapacity({
      whNpcExpands: character.warehouseExpansions.npc,
      whBonusExpands: character.warehouseExpansions.bonus,
    })) {
      issues.push({
        severity: "warning",
        message: `${item.itemName ?? `Item ${item.itemId}`} is outside ${character.name}'s usable character warehouse slots.`,
      });
    }
    if (item.storageId === 2 && slot >= ACCOUNT_WAREHOUSE_CAPACITY) {
      issues.push({
        severity: "warning",
        message: `${item.itemName ?? `Item ${item.itemId}`} is outside the usable account warehouse slots.`,
      });
    }
  }

  for (const row of mail) {
    if (row.attachedItemId > 0 && !row.attachedItemName) {
      issues.push({
        severity: "warning",
        message: `Mail ${row.mailUniqueId} attaches missing item template ${row.attachedItemId}.`,
      });
    }
    if (!isNonNegativeBigIntText(row.attachedKinahCount)) {
      issues.push({
        severity: "error",
        message: `Mail ${row.mailUniqueId} has invalid Kinah attachment ${row.attachedKinahCount}.`,
      });
    }
  }

  for (const listing of broker) {
    if (!listing.itemName) {
      issues.push({
        severity: "warning",
        message: `Broker listing ${listing.id} uses missing item template ${listing.itemId}.`,
      });
    }
    if (!isPositiveBigIntText(listing.itemCount)) {
      issues.push({
        severity: "error",
        message: `Broker listing ${listing.id} has invalid count ${listing.itemCount}.`,
      });
    }
    if (!isNonNegativeBigIntText(listing.price)) {
      issues.push({
        severity: "error",
        message: `Broker listing ${listing.id} has invalid price ${listing.price}.`,
      });
    }
  }

  return issues.slice(0, 75);
}

function isLoginBlocked(
  activated: boolean,
  expireDate: Date | null,
  expirationTime: Date | null,
  penaltyEnd: Date | null,
  bans: AdminAccountBanRow[],
): boolean {
  const now = Date.now();
  if (!activated) {
    return true;
  }
  if (expireDate && expireDate.getTime() < now) {
    return true;
  }
  if (expirationTime && expirationTime.getTime() < now) {
    return true;
  }
  if (penaltyEnd && (penaltyEnd.getTime() === 1000 || penaltyEnd.getTime() >= now)) {
    return true;
  }
  return bans.some(ban => ban.active);
}

function isBanActive(endsAt: Date | null): boolean {
  return endsAt == null || endsAt.getTime() >= Date.now();
}

function characterExpansionSource(row: {
  whNpcExpands: number | null;
  whBonusExpands: number | null;
}): WarehouseExpansionSource {
  return {
    whNpcExpands: Number(row.whNpcExpands ?? 0),
    whBonusExpands: Number(row.whBonusExpands ?? 0),
  };
}

function parseStorageSlot(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isPositiveBigIntText(value: string): boolean {
  return parseBigIntText(value) > 0n;
}

function isNonNegativeBigIntText(value: string): boolean {
  return parseBigIntText(value) >= 0n;
}

function parseBigIntText(value: string): bigint {
  if (!/^\d+$/.test(value)) {
    return -1n;
  }
  try {
    return BigInt(value);
  } catch {
    return -1n;
  }
}

function resolveCapacityInfo(
  section: WarehouseStorageDefinition,
  sectionItems: InventoryItem[],
  characterExpansion?: WarehouseExpansionSource,
): WarehouseCapacityInfo {
  const expansionLevel = section.storageId === 1 && characterExpansion ? warehouseExpansionLevel(characterExpansion) : null;
  const limit = section.storageId === 1 && characterExpansion
    ? characterWarehouseCapacity(characterExpansion)
    : section.capacity;

  return {
    limit,
    used: sectionItems.length,
    baseLimit: section.capacity,
    rowLength: section.rowLength,
    expansionLevel,
    maxExpansionLevel: section.maxExpansions,
  };
}

function toCount(value: CountValue | undefined): number {
  return Number(value ?? 0);
}

function mergeAccountKinahRows(
  characterRows: AdminCharacterKinahDbRow[],
  accountRows: AdminAccountStorageKinahDbRow[],
): AdminEconomyAccountKinah[] {
  const byAccount = new Map<number, {
    accountId: number;
    accountName: string;
    characterKinah: bigint;
    accountWarehouseKinah: bigint;
    accountOnlineWarehouseKinah: bigint;
  }>();

  const ensureAccount = (accountId: number, accountName: string | null) => {
    const current = byAccount.get(accountId);
    if (current) {
      if (current.accountName === `Account ${accountId}` && accountName) {
        current.accountName = accountName;
      }
      return current;
    }
    const created = {
      accountId,
      accountName: accountName ?? `Account ${accountId}`,
      characterKinah: 0n,
      accountWarehouseKinah: 0n,
      accountOnlineWarehouseKinah: 0n,
    };
    byAccount.set(accountId, created);
    return created;
  };

  for (const row of characterRows) {
    const account = ensureAccount(row.accountId, row.accountName);
    account.characterKinah += BigInt(normalizeBigIntString(row.totalKinah));
  }
  for (const row of accountRows) {
    const account = ensureAccount(row.accountId, row.accountName);
    account.accountWarehouseKinah += BigInt(normalizeBigIntString(row.accountWarehouseKinah));
    account.accountOnlineWarehouseKinah += BigInt(normalizeBigIntString(row.accountOnlineWarehouseKinah));
  }

  return [...byAccount.values()]
    .map(row => {
      const total = row.characterKinah + row.accountWarehouseKinah + row.accountOnlineWarehouseKinah;
      return {
        accountId: row.accountId,
        accountName: row.accountName,
        totalKinah: total.toString(),
        characterKinah: row.characterKinah.toString(),
        accountWarehouseKinah: row.accountWarehouseKinah.toString(),
        accountOnlineWarehouseKinah: row.accountOnlineWarehouseKinah.toString(),
      };
    })
    .filter(row => BigInt(row.totalKinah) > 0n)
    .sort((left, right) => compareBigIntTextDesc(left.totalKinah, right.totalKinah))
    .slice(0, 25);
}

function normalizeBigIntString(value: string | null | undefined): string {
  const normalized = String(value ?? "0").trim();
  return /^\d+$/.test(normalized) ? normalized : "0";
}

function compareBigIntTextDesc(left: string, right: string): number {
  const leftBig = BigInt(normalizeBigIntString(left));
  const rightBig = BigInt(normalizeBigIntString(right));
  return leftBig === rightBig ? 0 : leftBig > rightBig ? -1 : 1;
}

function encodeAionPassword(password: string): string {
  return createHash("sha1").update(password, "utf8").digest("base64");
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeIp(ip: string): string {
  if (ip === "::1") {
    return "127.0.0.1";
  }
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function networkMaskMatches(mask: string, ip: string): boolean {
  if (mask.trim() === "" || mask === "*" || mask.toLocaleLowerCase("en-US") === ip.toLocaleLowerCase("en-US")) {
    return true;
  }

  const wildcardPattern = new RegExp(
    `^${escapeRegex(mask)
      .replaceAll("\\*", "[0-9]{1,3}")
      .replaceAll("\\?", "[0-9]")}$`,
  );
  if (wildcardPattern.test(ip)) {
    return true;
  }

  return cidrMatches(mask, ip);
}

function cidrMatches(mask: string, ip: string): boolean {
  const [networkRaw, prefixRaw] = mask.split("/");
  if (!networkRaw || !prefixRaw) {
    return false;
  }
  const network = ipv4ToInt(networkRaw);
  const address = ipv4ToInt(ip);
  const prefixLength = Number.parseInt(prefixRaw, 10);
  if (network == null || address == null || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }
  const prefixMask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (network & prefixMask) === (address & prefixMask);
}

function ipv4ToInt(value: string): number | undefined {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return undefined;
  }
  let result = 0;
  for (const part of parts) {
    const octet = Number.parseInt(part, 10);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return undefined;
    }
    result = ((result << 8) | octet) >>> 0;
  }
  return result;
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.*]/g, "\\$&");
}

export async function loadCharacterSummary(
  accountId: number,
  characterId: number,
): Promise<CharacterSummary | undefined> {
  const [characterRows] = await gameDb.query<CharacterRow[]>(
    `
      SELECT
        id,
        name,
        race,
        player_class AS playerClass,
        CAST(exp AS CHAR) AS exp,
        online,
        last_online AS lastOnline,
        wh_npc_expands AS whNpcExpands,
        wh_bonus_expands AS whBonusExpands
      FROM players
      WHERE account_id = ? AND id = ? AND (deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP)
      LIMIT 1
    `,
    [accountId, characterId],
  );
  const characterRow = characterRows[0];
  return characterRow ? toCharacterSummary(characterRow) : undefined;
}

export function storageDefinition(storageId: number): WarehouseStorageDefinition | undefined {
  return transferStorageSections.find(section => section.storageId === storageId);
}

function storageName(id: number): string {
  switch (id) {
    case 0:
      return "Inventory";
    case 1:
      return "Warehouse";
    case 2:
      return "Account Warehouse";
    case 120:
      return "Character Online Warehouse";
    case 121:
      return "Account Online Warehouse";
    case 126:
      return "Broker Storage";
    case 127:
      return "Mailbox Storage";
    default:
      return `Storage ${id}`;
  }
}
