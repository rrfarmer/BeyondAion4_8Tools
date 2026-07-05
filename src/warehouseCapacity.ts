export const REGULAR_WAREHOUSE_BASE_CAPACITY = 24;
export const ACCOUNT_WAREHOUSE_CAPACITY = 16;
export const WAREHOUSE_ROW_LENGTH = 8;
export const MAX_WAREHOUSE_EXPANSIONS = 11;

export type WarehouseExpansionSource = {
  whNpcExpands: number;
  whBonusExpands: number;
};

export type WarehouseCapacityInfo = {
  limit: number | null;
  used: number;
  baseLimit: number | null;
  rowLength: number;
  expansionLevel: number | null;
  maxExpansionLevel: number | null;
};

export function warehouseExpansionLevel(source: WarehouseExpansionSource): number {
  const rawLevel = source.whNpcExpands + source.whBonusExpands;
  if (!Number.isFinite(rawLevel)) {
    return 0;
  }
  return Math.max(0, Math.trunc(rawLevel));
}

export function characterWarehouseCapacity(source: WarehouseExpansionSource): number {
  return REGULAR_WAREHOUSE_BASE_CAPACITY + warehouseExpansionLevel(source) * WAREHOUSE_ROW_LENGTH;
}
