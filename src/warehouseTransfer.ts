import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { KINAH_ITEM_ID, storageDefinition, type WarehouseStorageDefinition } from "./aionData.js";
import { gameDb } from "./db.js";
import { ItemCatalog } from "./itemCatalog.js";
import { characterWarehouseCapacity } from "./warehouseCapacity.js";

const KINAH_STORAGE_SLOT = 65535;
const PORTAL_OBJECT_ID_FLOOR = 1_900_000_000;
const INVALID_ID_BIT_MASK = 0b0010011111100110101111111111100;
const INVALID_ID_BIT_CHECK = 0b0000000000000000001100101010100;
const MAX_BIGINT_SIGNED = 9_223_372_036_854_775_807n;

export class TransferError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

export type WarehouseTransferRequest = {
  portalUserId: string;
  accountId: number;
  characterId: number;
  itemUniqueId: number;
  targetStorageId: number;
};

export type WarehouseTransferResult = {
  itemUniqueId: number;
  itemId: number;
  itemName: string;
  fromStorageId: number;
  toStorageId: number;
  fromStorageName: string;
  toStorageName: string;
};

export type WarehouseKinahTransferRequest = {
  portalUserId: string;
  accountId: number;
  characterId: number;
  sourceStorageId: number;
  targetStorageId: number;
  amount: string;
};

export type WarehouseKinahTransferResult = {
  amount: string;
  fromStorageId: number;
  toStorageId: number;
  fromStorageName: string;
  toStorageName: string;
};

export type ItemStorageValidationInput = {
  itemId: number;
  isSoulBound: boolean;
  targetStorageId: number;
  targetPolicy: WarehouseStorageDefinition["policy"];
};

export type ItemStorageValidationResult = {
  valid: boolean;
  targetAllowed: boolean | undefined;
  errors: string[];
  warnings: string[];
};

export type ItemStorageValidator = (input: ItemStorageValidationInput) => Promise<ItemStorageValidationResult>;

export type AccountLiveStateResult = {
  loaded?: boolean;
  online?: boolean;
  onlineCount?: number;
  accountName?: string;
  players?: Array<{ name?: string }>;
};

export type AccountLiveStateChecker = (accountId: number) => Promise<AccountLiveStateResult>;

export class WarehouseTransferService {
  constructor(
    private readonly itemCatalog: ItemCatalog,
    private readonly auditFile: string,
    private readonly itemStorageValidator?: ItemStorageValidator,
    private readonly accountLiveStateChecker?: AccountLiveStateChecker,
  ) {}

  async moveItem(request: WarehouseTransferRequest): Promise<WarehouseTransferResult> {
    const target = storageDefinition(request.targetStorageId);
    if (!target) {
      throw new TransferError("Target warehouse is not valid.");
    }

    const connection = await gameDb.getConnection();
    let auditRecord: Record<string, unknown> | undefined;
    let committed = false;
    try {
      await connection.beginTransaction();

      const character = await lockCharacter(connection, request.accountId, request.characterId);
      if (!character) {
        throw new TransferError("Character was not found on this linked account.", 404);
      }
      if (Boolean(character.online)) {
        throw new TransferError("Log the character out before moving warehouse items.");
      }

      const item = await lockItem(connection, request.itemUniqueId);
      if (!item) {
        throw new TransferError("Item no longer exists.");
      }

      const source = storageDefinition(item.storageId);
      if (!source) {
        throw new TransferError("Only warehouse and online warehouse items can be moved.");
      }
      if (source.storageId === target.storageId) {
        throw new TransferError("Choose a different destination warehouse.");
      }
      if (source.owner === "account" || target.owner === "account") {
        await this.assertAccountOffline(connection, request.accountId);
      }

      const expectedSourceOwner = ownerIdFor(source, request.accountId, request.characterId);
      if (item.ownerId !== expectedSourceOwner) {
        throw new TransferError("Item is not owned by this character or account.");
      }
      if (Boolean(item.equipped)) {
        throw new TransferError("Equipped items cannot be moved through the portal.");
      }
      if (item.itemId === KINAH_ITEM_ID) {
        throw new TransferError("Kinah transfers are not enabled in this warehouse MVP.");
      }

      await this.validateDestination(target, item);

      const targetOwnerId = ownerIdFor(target, request.accountId, request.characterId);
      const capacity = capacityFor(target, character);
      const usedSlots = usableSlots(await loadUsedSlots(connection, targetOwnerId, target.storageId), capacity);
      if (capacity !== null && new Set(usedSlots).size >= capacity) {
        throw new TransferError(`${target.title} is full.`);
      }
      const targetSlot = nextFreeSlot(usedSlots, capacity);

      const [update] = await connection.execute<ResultSetHeader>(
        `
          UPDATE inventory
          SET item_owner = ?, item_location = ?, slot = ?, is_equipped = 0
          WHERE item_unique_id = ? AND item_owner = ? AND item_location = ?
        `,
        [targetOwnerId, target.storageId, targetSlot, item.itemUniqueId, item.ownerId, item.storageId],
      );
      if (update.affectedRows !== 1) {
        throw new TransferError("Item changed while the transfer was being saved.");
      }

      auditRecord = {
        at: new Date().toISOString(),
        portalUserId: request.portalUserId,
        accountId: request.accountId,
        characterId: request.characterId,
        itemUniqueId: item.itemUniqueId,
        itemId: item.itemId,
        itemName: this.itemCatalog.nameFor(item.itemId) ?? `Item ${item.itemId}`,
        count: item.itemCount,
        fromOwnerId: item.ownerId,
        toOwnerId: targetOwnerId,
        fromStorageId: item.storageId,
        toStorageId: target.storageId,
        fromSlot: item.slot,
        toSlot: targetSlot,
      };

      await connection.commit();
      committed = true;

      try {
        if (auditRecord) {
          await appendAudit(this.auditFile, auditRecord);
        }
      } catch (error) {
        console.warn("Warehouse transfer audit append failed", error);
      }
      return {
        itemUniqueId: item.itemUniqueId,
        itemId: item.itemId,
        itemName: this.itemCatalog.nameFor(item.itemId) ?? `Item ${item.itemId}`,
        fromStorageId: source.storageId,
        toStorageId: target.storageId,
        fromStorageName: source.title,
        toStorageName: target.title,
      };
    } catch (error) {
      if (!committed) {
        await rollbackQuietly(connection);
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async moveKinah(request: WarehouseKinahTransferRequest): Promise<WarehouseKinahTransferResult> {
    const amount = parseKinahAmount(request.amount);
    const source = storageDefinition(request.sourceStorageId);
    const target = storageDefinition(request.targetStorageId);
    if (!source || !target) {
      throw new TransferError("Kinah transfer warehouse is not valid.");
    }
    if (source.owner !== "account" || target.owner !== "account") {
      throw new TransferError("Kinah can only be moved between account warehouses.");
    }
    if (source.storageId === target.storageId) {
      throw new TransferError("Choose a different destination warehouse.");
    }

    const connection = await gameDb.getConnection();
    let auditRecord: Record<string, unknown> | undefined;
    let committed = false;
    let objectIdLockAcquired = false;
    try {
      await connection.beginTransaction();

      const character = await lockCharacter(connection, request.accountId, request.characterId);
      if (!character) {
        throw new TransferError("Character was not found on this linked account.", 404);
      }
      if (Boolean(character.online)) {
        throw new TransferError("Log the character out before moving warehouse Kinah.");
      }
      await this.assertAccountOffline(connection, request.accountId);

      const sourceOwnerId = ownerIdFor(source, request.accountId, request.characterId);
      const targetOwnerId = ownerIdFor(target, request.accountId, request.characterId);
      const sourceKinah = await lockKinahRow(connection, sourceOwnerId, source.storageId);
      if (!sourceKinah) {
        throw new TransferError(`${source.title} has no Kinah to move.`);
      }

      const sourceCount = parseStoredKinah(sourceKinah.itemCount, source.title);
      if (sourceCount < amount) {
        throw new TransferError(`${source.title} does not have enough Kinah.`);
      }

      let targetKinah = await lockKinahRow(connection, targetOwnerId, target.storageId);
      if (!targetKinah) {
        objectIdLockAcquired = await acquireObjectIdLock(connection);
        if (!objectIdLockAcquired) {
          throw new TransferError("Could not acquire object id allocation lock.");
        }

        targetKinah = await lockKinahRow(connection, targetOwnerId, target.storageId);
        if (!targetKinah) {
          const [newObjectId] = await allocatePortalObjectIds(connection, 1);
          await insertKinahRow(connection, {
            itemUniqueId: newObjectId,
            ownerId: targetOwnerId,
            storageId: target.storageId,
          });
          targetKinah = {
            itemUniqueId: newObjectId,
            itemCount: "0",
          };
        }
      }

      const targetCount = parseStoredKinah(targetKinah.itemCount, target.title);
      const nextSourceCount = sourceCount - amount;
      const nextTargetCount = targetCount + amount;
      if (nextTargetCount > MAX_BIGINT_SIGNED) {
        throw new TransferError(`${target.title} cannot hold that much Kinah.`);
      }

      await updateKinahCount(connection, sourceKinah.itemUniqueId, nextSourceCount);
      await updateKinahCount(connection, targetKinah.itemUniqueId, nextTargetCount);

      auditRecord = {
        at: new Date().toISOString(),
        portalUserId: request.portalUserId,
        accountId: request.accountId,
        characterId: request.characterId,
        action: "warehouse_kinah_transfer",
        amount: amount.toString(),
        fromOwnerId: sourceOwnerId,
        toOwnerId: targetOwnerId,
        fromStorageId: source.storageId,
        toStorageId: target.storageId,
        fromKinahItemUniqueId: sourceKinah.itemUniqueId,
        toKinahItemUniqueId: targetKinah.itemUniqueId,
      };

      await connection.commit();
      committed = true;

      try {
        if (auditRecord) {
          await appendAudit(this.auditFile, auditRecord);
        }
      } catch (error) {
        console.warn("Warehouse Kinah transfer audit append failed", error);
      }

      return {
        amount: amount.toString(),
        fromStorageId: source.storageId,
        toStorageId: target.storageId,
        fromStorageName: source.title,
        toStorageName: target.title,
      };
    } catch (error) {
      if (!committed) {
        await rollbackQuietly(connection);
      }
      throw error;
    } finally {
      if (objectIdLockAcquired) {
        await releaseObjectIdLock(connection);
      }
      connection.release();
    }
  }

  private async validateDestination(target: WarehouseStorageDefinition, item: ItemLockRow): Promise<void> {
    if (!this.itemStorageValidator) {
      validateDestinationWithLocalCatalog(target, item, this.itemCatalog);
      return;
    }

    const validation = await this.itemStorageValidator({
      itemId: item.itemId,
      isSoulBound: Boolean(item.soulBound),
      targetStorageId: target.storageId,
      targetPolicy: target.policy,
    });
    if (!validation.valid || validation.targetAllowed === false) {
      const detail = validation.errors.filter(Boolean).join(" ");
      throw new TransferError(detail || "The game server rejected this warehouse destination.");
    }
  }

  private async assertAccountOffline(connection: PoolConnection, accountId: number): Promise<void> {
    await assertAccountOfflineInDb(connection, accountId);
    if (!this.accountLiveStateChecker) {
      return;
    }

    let state: AccountLiveStateResult;
    try {
      state = await this.accountLiveStateChecker(accountId);
    } catch (error) {
      throw new TransferError(
        `Could not verify live account state with the game server; account warehouse moves are blocked. ${(error as Error).message}`,
        502,
      );
    }

    const players = Array.isArray(state.players) ? state.players : [];
    const onlineCount = Number.isInteger(state.onlineCount) ? Number(state.onlineCount) : players.length;
    if (state.loaded || state.online || onlineCount > 0) {
      const firstName = players.find(player => player.name)?.name;
      throw new TransferError(
        `Log all characters on this account out before moving account warehouse items.${
          firstName ? ` ${firstName} is loaded in the game server.` : ""
        }`,
      );
    }
  }
}

type CharacterLockRow = RowDataPacket & {
  id: number;
  online: number | boolean;
  whNpcExpands: number;
  whBonusExpands: number;
};

type OnlineAccountCharacterRow = RowDataPacket & {
  id: number;
  name: string;
};

type ItemLockRow = RowDataPacket & {
  itemUniqueId: number;
  itemId: number;
  itemCount: string;
  ownerId: number;
  storageId: number;
  slot: string;
  equipped: number | boolean;
  soulBound: number | boolean;
};

type SlotRow = RowDataPacket & {
  slotValue: string;
};

type KinahRecord = {
  itemUniqueId: number;
  itemCount: string;
};

type KinahRow = RowDataPacket & KinahRecord;

type LockRow = RowDataPacket & {
  locked: number | null;
};

type MaxIdRow = RowDataPacket & {
  maxId: number | string | null;
};

async function lockCharacter(
  connection: PoolConnection,
  accountId: number,
  characterId: number,
): Promise<CharacterLockRow | undefined> {
  const [rows] = await connection.query<CharacterLockRow[]>(
    `
      SELECT
        id,
        online,
        wh_npc_expands AS whNpcExpands,
        wh_bonus_expands AS whBonusExpands
      FROM players
      WHERE account_id = ? AND id = ? AND (deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP)
      LIMIT 1
      FOR UPDATE
    `,
    [accountId, characterId],
  );
  return rows[0];
}

async function assertAccountOfflineInDb(connection: PoolConnection, accountId: number): Promise<void> {
  const [rows] = await connection.query<OnlineAccountCharacterRow[]>(
    `
      SELECT id, name
      FROM players
      WHERE account_id = ?
        AND online <> 0
        AND (deletion_date IS NULL OR deletion_date > CURRENT_TIMESTAMP)
      ORDER BY name
      LIMIT 1
      FOR UPDATE
    `,
    [accountId],
  );
  const onlineCharacter = rows[0];
  if (onlineCharacter) {
    throw new TransferError(
      `Log all characters on this account out before moving account warehouse items. ${onlineCharacter.name} is online.`,
    );
  }
}

async function lockItem(connection: PoolConnection, itemUniqueId: number): Promise<ItemLockRow | undefined> {
  const [rows] = await connection.query<ItemLockRow[]>(
    `
      SELECT
        item_unique_id AS itemUniqueId,
        item_id AS itemId,
        CAST(item_count AS CHAR) AS itemCount,
        item_owner AS ownerId,
        item_location AS storageId,
        CAST(slot AS CHAR) AS slot,
        is_equipped AS equipped,
        is_soul_bound AS soulBound
      FROM inventory
      WHERE item_unique_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [itemUniqueId],
  );
  return rows[0];
}

async function lockKinahRow(
  connection: PoolConnection,
  ownerId: number,
  storageId: number,
): Promise<KinahRecord | undefined> {
  const [rows] = await connection.query<KinahRow[]>(
    `
      SELECT
        item_unique_id AS itemUniqueId,
        CAST(item_count AS CHAR) AS itemCount
      FROM inventory
      WHERE item_owner = ? AND item_location = ? AND item_id = ?
      ORDER BY item_unique_id
      LIMIT 1
      FOR UPDATE
    `,
    [ownerId, storageId, KINAH_ITEM_ID],
  );
  return rows[0];
}

function ownerIdFor(definition: WarehouseStorageDefinition, accountId: number, characterId: number): number {
  return definition.owner === "account" ? accountId : characterId;
}

function validateDestinationWithLocalCatalog(
  target: WarehouseStorageDefinition,
  item: ItemLockRow,
  itemCatalog: ItemCatalog,
): void {
  const soulBound = Boolean(item.soulBound);
  if (!itemCatalog.templateFor(item.itemId)) {
    throw new TransferError("Item template is missing; transfer was blocked.");
  }

  if (target.policy === "characterWarehouse" && !itemCatalog.isStorableInWarehouse(item.itemId)) {
    throw new TransferError("This item cannot be stored in a character warehouse.");
  }

  if (target.policy === "accountWarehouse" && !itemCatalog.isStorableInAccountWarehouse(item.itemId, soulBound)) {
    throw new TransferError("This item cannot be stored in an account warehouse.");
  }
}

function capacityFor(definition: WarehouseStorageDefinition, character: CharacterLockRow): number | null {
  if (definition.storageId === 1) {
    return characterWarehouseCapacity(character);
  }
  return definition.capacity;
}

async function loadUsedSlots(connection: PoolConnection, ownerId: number, storageId: number): Promise<number[]> {
  const [rows] = await connection.query<SlotRow[]>(
    `
      SELECT CAST(slot AS CHAR) AS slotValue
      FROM inventory
      WHERE item_owner = ? AND item_location = ?
      ORDER BY slot
    `,
    [ownerId, storageId],
  );
  return rows
    .map(row => Number.parseInt(row.slotValue, 10))
    .filter(Number.isFinite)
    .filter(slot => slot >= 0);
}

function usableSlots(usedSlots: number[], capacity: number | null): number[] {
  if (capacity === null) {
    return usedSlots;
  }
  return usedSlots.filter(slot => slot < capacity);
}

function nextFreeSlot(usedSlots: number[], capacity: number | null): number {
  const used = new Set(usedSlots);
  const max = capacity ?? Number.MAX_SAFE_INTEGER;
  for (let slot = 0; slot < max; slot += 1) {
    if (!used.has(slot)) {
      return slot;
    }
  }
  throw new TransferError("No destination slot is available.");
}

function parseKinahAmount(raw: string): bigint {
  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new TransferError("Kinah amount is not valid.");
  }
  const amount = BigInt(normalized);
  if (amount <= 0n) {
    throw new TransferError("Kinah amount must be greater than zero.");
  }
  if (amount > MAX_BIGINT_SIGNED) {
    throw new TransferError("Kinah amount is too large.");
  }
  return amount;
}

function parseStoredKinah(raw: string, storageName: string): bigint {
  try {
    const amount = BigInt(raw);
    if (amount < 0n) {
      throw new Error("negative");
    }
    return amount;
  } catch {
    throw new TransferError(`${storageName} has an invalid Kinah amount.`);
  }
}

async function updateKinahCount(connection: PoolConnection, itemUniqueId: number, amount: bigint): Promise<void> {
  const [result] = await connection.execute<ResultSetHeader>(
    "UPDATE inventory SET item_count = ?, slot = ? WHERE item_unique_id = ? AND item_id = ?",
    [amount.toString(), KINAH_STORAGE_SLOT, itemUniqueId, KINAH_ITEM_ID],
  );
  if (result.affectedRows !== 1) {
    throw new TransferError("Kinah changed while the transfer was being saved.");
  }
}

async function insertKinahRow(
  connection: PoolConnection,
  input: {
    itemUniqueId: number;
    ownerId: number;
    storageId: number;
  },
): Promise<void> {
  const [result] = await connection.execute<ResultSetHeader>(
    `
      INSERT INTO inventory (
        item_unique_id,
        item_id,
        item_count,
        item_owner,
        is_equipped,
        is_soul_bound,
        slot,
        item_location
      )
      VALUES (?, ?, 0, ?, 0, 0, ?, ?)
    `,
    [input.itemUniqueId, KINAH_ITEM_ID, input.ownerId, KINAH_STORAGE_SLOT, input.storageId],
  );
  if (result.affectedRows !== 1) {
    throw new TransferError("Could not create destination Kinah row.");
  }
}

async function acquireObjectIdLock(connection: PoolConnection): Promise<boolean> {
  const [rows] = await connection.query<LockRow[]>("SELECT GET_LOCK('aion_portal_object_id', 10) AS locked");
  return rows[0]?.locked === 1;
}

async function releaseObjectIdLock(connection: PoolConnection): Promise<void> {
  await connection.query("SELECT RELEASE_LOCK('aion_portal_object_id')");
}

async function allocatePortalObjectIds(connection: PoolConnection, count: number): Promise<number[]> {
  const [rows] = await connection.query<MaxIdRow[]>(
    `
      SELECT GREATEST(
        ?,
        COALESCE((SELECT MAX(id) FROM players), 0),
        COALESCE((SELECT MAX(item_unique_id) FROM inventory), 0),
        COALESCE((SELECT MAX(item_unique_id) FROM player_registered_items WHERE item_unique_id <> 0), 0),
        COALESCE((SELECT MAX(id) FROM legions), 0),
        COALESCE((SELECT MAX(mail_unique_id) FROM mail), 0),
        COALESCE((SELECT MAX(guide_id) FROM guides), 0),
        COALESCE((SELECT MAX(id) FROM houses), 0),
        COALESCE((SELECT MAX(id) FROM player_pets), 0)
      ) AS maxId
    `,
    [PORTAL_OBJECT_ID_FLOOR - 1],
  );

  const ids: number[] = [];
  let candidate = Number(rows[0]?.maxId ?? PORTAL_OBJECT_ID_FLOOR - 1) + 1;
  while (ids.length < count) {
    if (!isInvalidAionObjectId(candidate)) {
      ids.push(candidate);
    }
    candidate += 1;
    if (candidate >= Number.MAX_SAFE_INTEGER) {
      throw new TransferError("Could not allocate a valid object id.");
    }
  }
  return ids;
}

function isInvalidAionObjectId(id: number): boolean {
  return (id & INVALID_ID_BIT_MASK) === INVALID_ID_BIT_CHECK;
}

async function appendAudit(auditFile: string, record: Record<string, unknown>): Promise<void> {
  await mkdir(path.dirname(auditFile), { recursive: true });
  await appendFile(auditFile, `${JSON.stringify(record)}\n`, "utf8");
}

async function rollbackQuietly(connection: PoolConnection): Promise<void> {
  try {
    await connection.rollback();
  } catch {
    // A rollback failure after a failed transfer should not hide the original error.
  }
}
