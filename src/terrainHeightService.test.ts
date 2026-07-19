import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { encode } from "fast-png";
import { TerrainHeightService } from "./terrainHeightService.js";

const MAP_ID = 220010000;
const SHARED_MAP_ID = 220100000;

test("interpolates Aion terrain triangles from 16-bit heightmaps", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const firstTriangle = await fixture.service.lookup(MAP_ID, 8, 2.5, 2.75);
  assert.deepEqual(firstTriangle, {
    available: true,
    z: 13.5,
    source: "terrain-heightmap",
    sourceFile: "220010000.png",
    unitSize: 2,
  });

  const secondTriangle = await fixture.service.lookup(MAP_ID, 8, 3.5, 3);
  assert.equal(secondTriangle.available, true);
  assert.equal(secondTriangle.available && secondTriangle.z, 18);
});

test("indexes shared maps and reports missing or absent terrain without inventing Z", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const shared = await fixture.service.lookup(SHARED_MAP_ID, 8, 2.5, 2.75);
  assert.equal(shared.available, true);
  assert.equal(shared.available && shared.z, 13.5);
  assert.equal(shared.available && shared.sourceFile, "220100000,220200000.png");

  assert.deepEqual(await fixture.service.lookup(999999999, 8, 2.5, 2.75), {
    available: false,
    reason: "HEIGHTMAP_NOT_AVAILABLE",
  });
  assert.deepEqual(await fixture.service.lookup(MAP_ID, 8, 4.5, 2.5), {
    available: false,
    reason: "NO_TERRAIN_SURFACE",
    sourceFile: "220010000.png",
  });
});

async function createFixture(): Promise<{ root: string; service: TerrainHeightService }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "aion-terrain-height-"));
  const geoDir = path.join(root, "game-server", "data", "geo");
  await mkdir(geoDir, { recursive: true });

  const values = new Uint16Array(16);
  values.fill(32);
  values[1 * 4 + 1] = 10 * 32;
  values[1 * 4 + 2] = 14 * 32;
  values[2 * 4 + 1] = 18 * 32;
  values[2 * 4 + 2] = 22 * 32;
  values[3 * 4 + 1] = 0xffff;
  values[3 * 4 + 2] = 0xffff;
  await writeHeightmap(path.join(geoDir, "220010000.png"), values);
  await writeHeightmap(path.join(geoDir, "220100000,220200000.png"), values);

  return { root, service: new TerrainHeightService(root) };
}

async function writeHeightmap(filePath: string, data: Uint16Array): Promise<void> {
  await writeFile(filePath, encode({ width: 4, height: 4, depth: 16, channels: 1, data }));
}
