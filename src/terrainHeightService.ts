import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { decode } from "fast-png";

const HEIGHTMAP_UNIT_SIZE = 2;
const HEIGHTMAP_MAX_Z_EXCLUSIVE = 2048;
const NO_TERRAIN_VALUE = 0xffff;
const HEIGHTMAP_FILE_PATTERN = /^\d+(?:,\d+)*\.png$/i;

type TerrainHeightmap = {
  width: number;
  height: number;
  values: Uint16Array;
  sourceFile: string;
};

export type TerrainHeightLookup =
  | {
      available: true;
      z: number;
      source: "terrain-heightmap";
      sourceFile: string;
      unitSize: typeof HEIGHTMAP_UNIT_SIZE;
    }
  | {
      available: false;
      reason: "HEIGHTMAP_NOT_AVAILABLE" | "NO_TERRAIN_SURFACE";
      sourceFile?: string;
    };

export class TerrainHeightService {
  private fileIndex?: Promise<Map<number, string>>;
  private readonly terrainCache = new Map<number, Promise<TerrainHeightmap | undefined>>();
  private readonly geoDir: string;

  constructor(beyondAionSharpRepoRoot: string) {
    this.geoDir = path.join(beyondAionSharpRepoRoot, "game-server", "data", "geo");
  }

  async lookup(mapId: number, worldSize: number, x: number, y: number): Promise<TerrainHeightLookup> {
    const terrain = await this.loadTerrain(mapId);
    if (!terrain) {
      return { available: false, reason: "HEIGHTMAP_NOT_AVAILABLE" };
    }
    if (terrain.height * HEIGHTMAP_UNIT_SIZE !== worldSize || terrain.width * HEIGHTMAP_UNIT_SIZE !== worldSize) {
      throw new Error(
        `Terrain heightmap ${terrain.sourceFile} is ${terrain.width}x${terrain.height}, expected ${worldSize / HEIGHTMAP_UNIT_SIZE}x${worldSize / HEIGHTMAP_UNIT_SIZE}.`,
      );
    }

    const z = interpolateTerrainZ(terrain, x, y);
    if (!Number.isFinite(z)) {
      return {
        available: false,
        reason: "NO_TERRAIN_SURFACE",
        sourceFile: terrain.sourceFile,
      };
    }
    return {
      available: true,
      z,
      source: "terrain-heightmap",
      sourceFile: terrain.sourceFile,
      unitSize: HEIGHTMAP_UNIT_SIZE,
    };
  }

  private async loadTerrain(mapId: number): Promise<TerrainHeightmap | undefined> {
    const cached = this.terrainCache.get(mapId);
    if (cached) return cached;

    const load = this.loadTerrainUncached(mapId);
    this.terrainCache.set(mapId, load);
    try {
      return await load;
    } catch (error) {
      this.terrainCache.delete(mapId);
      throw error;
    }
  }

  private async loadTerrainUncached(mapId: number): Promise<TerrainHeightmap | undefined> {
    const sourceFile = (await this.getFileIndex()).get(mapId);
    if (!sourceFile) return undefined;

    const image = decode(await readFile(path.join(this.geoDir, sourceFile)), { checkCrc: true });
    if (image.depth !== 16 || image.channels !== 1 || !(image.data instanceof Uint16Array)) {
      throw new Error(
        `Terrain heightmap ${sourceFile} must be a 16-bit single-channel PNG; received depth ${image.depth} with ${image.channels} channels.`,
      );
    }
    if (image.data.length !== image.width * image.height) {
      throw new Error(`Terrain heightmap ${sourceFile} has an unexpected decoded size.`);
    }
    return {
      width: image.width,
      height: image.height,
      values: image.data,
      sourceFile,
    };
  }

  private getFileIndex(): Promise<Map<number, string>> {
    this.fileIndex ??= this.buildFileIndex();
    return this.fileIndex;
  }

  private async buildFileIndex(): Promise<Map<number, string>> {
    let names: string[];
    try {
      names = await readdir(this.geoDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
      throw error;
    }

    const index = new Map<number, string>();
    for (const name of names.sort()) {
      if (!HEIGHTMAP_FILE_PATTERN.test(name) || name.toLocaleLowerCase().includes("_materials")) continue;
      for (const rawMapId of name.slice(0, -4).split(",")) {
        const mapId = Number.parseInt(rawMapId, 10);
        if (!Number.isSafeInteger(mapId) || mapId <= 0) continue;
        const existing = index.get(mapId);
        if (existing && existing !== name) {
          throw new Error(`Map ${mapId} has duplicate terrain heightmaps: ${existing} and ${name}.`);
        }
        index.set(mapId, name);
      }
    }
    return index;
  }
}

function interpolateTerrainZ(terrain: TerrainHeightmap, x: number, y: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return Number.NaN;

  const xIndexNorth = Math.floor(x / HEIGHTMAP_UNIT_SIZE);
  const yIndexWest = Math.floor(y / HEIGHTMAP_UNIT_SIZE);
  const xOffset = x / HEIGHTMAP_UNIT_SIZE - xIndexNorth;
  const yOffset = y / HEIGHTMAP_UNIT_SIZE - yIndexWest;
  const z2 = sampleTerrainZ(terrain, xIndexNorth, yIndexWest + 1);
  const z3 = sampleTerrainZ(terrain, xIndexNorth + 1, yIndexWest);
  if (!Number.isFinite(z2) || !Number.isFinite(z3)) return Number.NaN;

  const diagonal = xOffset + yOffset;
  if (diagonal === 1) {
    return z2 + xOffset * (z3 - z2);
  }
  if (diagonal < 1) {
    const z1 = sampleTerrainZ(terrain, xIndexNorth, yIndexWest);
    return Number.isFinite(z1)
      ? z1 + yOffset * (z2 - z1) + xOffset * (z3 - z1)
      : Number.NaN;
  }

  const z4 = sampleTerrainZ(terrain, xIndexNorth + 1, yIndexWest + 1);
  return Number.isFinite(z4)
    ? z4 + (1 - xOffset) * (z2 - z4) + (1 - yOffset) * (z3 - z4)
    : Number.NaN;
}

function sampleTerrainZ(terrain: TerrainHeightmap, xIndex: number, yIndex: number): number {
  if (xIndex < 0 || yIndex < 0 || xIndex > terrain.height || yIndex > terrain.width) return Number.NaN;
  if (xIndex === 0 || yIndex === 0 || xIndex === terrain.height || yIndex === terrain.width) return 0;

  // Aion's terrain PNG rows represent game X and columns represent game Y.
  const raw = terrain.values[xIndex * terrain.width + yIndex];
  if (raw === undefined || raw === NO_TERRAIN_VALUE) return Number.NaN;
  return raw * HEIGHTMAP_MAX_Z_EXCLUSIVE / (NO_TERRAIN_VALUE + 1);
}
