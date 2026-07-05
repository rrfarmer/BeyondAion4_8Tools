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

type AdminInventoryStatsRow = RowDataPacket & {
  totalRows: CountValue;
  cubeRows: CountValue;
  characterWarehouseRows: CountValue;
  accountWarehouseRows: CountValue;
  onlineWarehouseRows: CountValue;
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
  const characters = characterRows.map(row => ({
    id: row.id,
    name: row.name,
    accountId: row.accountId,
    accountName: row.accountName ?? `Account ${row.accountId}`,
    race: row.race,
    playerClass: row.playerClass,
    online: Boolean(row.online),
    lastOnline: row.lastOnline,
  }));

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

function characterExpansionSource(row: {
  whNpcExpands: number | null;
  whBonusExpands: number | null;
}): WarehouseExpansionSource {
  return {
    whNpcExpands: Number(row.whNpcExpands ?? 0),
    whBonusExpands: Number(row.whBonusExpands ?? 0),
  };
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
    default:
      return `Storage ${id}`;
  }
}
