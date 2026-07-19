import assert from "node:assert/strict";
import test from "node:test";
import type { SpawnEditorMap, SpawnEditorSnapshot } from "./spawnEditorService.js";
import type { WalkerRoute } from "./walkerRouteService.js";
import {
  WalkerGroundAuditService,
  type WalkerGroundAuditReport,
} from "./walkerGroundAuditService.js";

test("audits each map-specific route once and reports off-ground authored points", async () => {
  const maps = [map(1, "Alpha"), map(2, "Beta")];
  const snapshots = new Map([
    [1, snapshot(maps[0], [
      spot("alpha-1", "route-a", 101, "group-a"),
      spot("alpha-2", "route-a", 101, "group-a"),
      spot("missing", "missing-route", 102, "group-b"),
    ])],
    [2, snapshot(maps[1], [spot("beta-1", "route-a", 201, "group-c")])],
  ]);
  const routes = new Map([["route-a", route("route-a")]]);
  const service = new WalkerGroundAuditService(
    {
      listMaps: () => maps,
      snapshot: async mapId => snapshots.get(mapId)!,
    },
    {
      route: async routeId => {
        const found = routes.get(routeId);
        if (!found) throw new Error(`Missing ${routeId}`);
        return found;
      },
    },
    {
      lookup: async (mapId, _worldSize, x) => {
        if (mapId === 2 && x === 20) return { available: false, reason: "NO_TERRAIN_SURFACE" };
        const z = mapId === 1 ? 10 : 14.5;
        return { available: true, z, source: "terrain-heightmap", sourceFile: `${mapId}.png`, unitSize: 2 };
      },
    },
  );

  const report = await service.scan();

  assert.equal(report.mapCount, 2);
  assert.equal(report.mapsWithPatrols, 2);
  assert.equal(report.attachedSpawnCount, 4);
  assert.equal(report.mapPathCount, 3);
  assert.equal(report.distinctRouteCount, 2);
  assert.equal(report.auditedPathCount, 2);
  assert.equal(report.checkedPointCount, 3);
  assert.equal(report.unavailablePointCount, 1);
  assert.equal(report.missingRouteCount, 1);
  assert.equal(report.offGroundPathCount, 2);
  assert.equal(report.offGroundPointCount, 2);
  assert.deepEqual(report.findings.map(finding => [finding.mapName, finding.offGroundPointCount]), [
    ["Alpha", 1],
    ["Beta", 1],
  ]);
  assert.equal(report.findings[0].usages.length, 2);
  assert.equal(report.findings[0].points[0].authoredIndex, 2);
  assert.equal(report.findings[0].points[0].delta, 5);
  assert.deepEqual(report.terrainGaps, [{
    mapId: 2,
    mapName: "Beta",
    routeId: "route-a",
    unavailablePointCount: 1,
    reasons: ["NO_TERRAIN_SURFACE"],
  }]);
  assert.equal(report.missingRoutes[0].routeId, "missing-route");
});

test("uses the configured tolerance and rejects invalid values", async () => {
  const fixtureMap = map(1, "Tolerance");
  const report = await singleRouteReport(fixtureMap, 10.75, 0.75);
  assert.equal(report.offGroundPathCount, 0, "a point exactly at tolerance is accepted");

  const strict = await singleRouteReport(fixtureMap, 10.75, 0.5);
  assert.equal(strict.offGroundPathCount, 1);

  const service = new WalkerGroundAuditService(
    { listMaps: () => [], snapshot: async () => { throw new Error("unused"); } },
    { route: async () => { throw new Error("unused"); } },
    { lookup: async () => ({ available: false, reason: "HEIGHTMAP_NOT_AVAILABLE" }) },
  );
  await assert.rejects(() => service.scan(-1), /between 0 and 100/);
});

async function singleRouteReport(
  fixtureMap: SpawnEditorMap,
  routeZ: number,
  tolerance: number,
): Promise<WalkerGroundAuditReport> {
  const fixtureRoute = route("route-a");
  fixtureRoute.authoredSteps = [step(1, 10, 10, routeZ)];
  fixtureRoute.effectiveSteps = fixtureRoute.authoredSteps;
  fixtureRoute.authoredStepCount = 1;
  fixtureRoute.effectiveStepCount = 1;
  const service = new WalkerGroundAuditService(
    {
      listMaps: () => [fixtureMap],
      snapshot: async () => snapshot(fixtureMap, [spot("spot", "route-a", 101, "group-a")]),
    },
    { route: async () => fixtureRoute },
    {
      lookup: async () => ({
        available: true,
        z: 10,
        source: "terrain-heightmap",
        sourceFile: "1.png",
        unitSize: 2,
      }),
    },
  );
  return service.scan(tolerance);
}

function map(id: number, name: string): SpawnEditorMap {
  return {
    id,
    name,
    clientName: name,
    worldSize: 100,
    projection: "calibrated-game-y-x",
    calibration: { offsetX: 0, offsetY: 0, mapWidth: 100, mapHeight: 100 },
    coordinateBounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    layers: [{ id: "map", name: "Map", imageUrl: "/map.webp", assetKind: "map-window" }],
    defaultLayerId: "map",
    imageUrl: "/map.webp",
    sourceRelativePath: `${id}.xml`,
    sourceRelativePaths: [`${id}.xml`],
  };
}

function snapshot(fixtureMap: SpawnEditorMap, spots: SpawnEditorSnapshot["spots"]): SpawnEditorSnapshot {
  const groupIds = [...new Set(spots.map(entry => entry.groupKey))];
  return {
    ok: true,
    map: fixtureMap,
    revision: "revision",
    generatedAt: "2026-07-19T00:00:00.000Z",
    groupCount: groupIds.length,
    spotCount: spots.length,
    editableSpotCount: spots.length,
    groups: groupIds.map((groupKey, index) => ({
      key: groupKey,
      npcId: spots.find(entry => entry.groupKey === groupKey)!.npcId,
      npc: {
        id: spots.find(entry => entry.groupKey === groupKey)!.npcId,
        name: `npc_${index + 1}`,
        displayName: `NPC ${index + 1}`,
        level: 1,
        type: "MONSTER",
        rank: "NORMAL",
        rating: "NORMAL",
        race: "NONE",
        tribe: "NONE",
        ai: "",
      },
      respawnTime: 60,
      pool: 1,
      handler: "",
      temporary: false,
      editable: true,
      spotCount: spots.filter(entry => entry.groupKey === groupKey).length,
      sourceRelativePath: fixtureMap.sourceRelativePath,
      attributes: {},
    })),
    spots,
  };
}

function spot(key: string, walkerId: string, npcId: number, groupKey: string): SpawnEditorSnapshot["spots"][number] {
  return {
    key,
    groupKey,
    npcId,
    x: 5,
    y: 5,
    z: 10,
    heading: 0,
    randomWalk: 0,
    walkerId,
    walkerIndex: undefined,
    staticId: 0,
    aerial: false,
    ai: "",
    anchor: "",
    state: 0,
    editable: true,
    sourceRelativePath: "spawn.xml",
    warnings: [],
    attributes: {},
  };
}

function route(id: string): WalkerRoute {
  const authoredSteps = [step(1, 10, 10, 10), step(2, 20, 20, 15)];
  return {
    id,
    revision: `${id}-revision`,
    sourceRevision: "source-revision",
    sourceRelativePath: "game-server/data/static_data/npc_walker/routes.xml",
    loopType: "NORMAL",
    pool: 1,
    formation: "POINT",
    rows: [],
    closesLoop: true,
    authoredStepCount: authoredSteps.length,
    effectiveStepCount: authoredSteps.length,
    authoredSteps,
    effectiveSteps: authoredSteps,
    bounds: { minX: 10, maxX: 20, minY: 10, maxY: 20, minZ: 10, maxZ: 15 },
    length2d: 14.142,
    length3d: 15,
    warnings: [],
  };
}

function step(index: number, x: number, y: number, z: number): WalkerRoute["authoredSteps"][number] {
  return { index, authoredIndex: index, synthesized: false, x, y, z, restTime: 0 };
}
