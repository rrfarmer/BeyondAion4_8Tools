import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NpcCatalog } from "./npcCatalog.js";
import {
  ISHALGEN_MAP_ID,
  SpawnEditorError,
  SpawnEditorService,
} from "./spawnEditorService.js";

const SPAWN_RELATIVE_PATH = path.join(
  "game-server",
  "data",
  "static_data",
  "spawns",
  "Npcs",
  "220010000_Ishalgen.xml",
);
const SIEGE_MAP_ID = 600090000;
const SIEGE_MAP_KEY = `siege-${SIEGE_MAP_ID}`;
const SIEGE_RELATIVE_PATH = path.join(
  "game-server",
  "data",
  "static_data",
  "spawns",
  "Sieges",
  "600090000_Kaldor.xml",
);

test("applies validated Ishalgen changes atomically to repository XML", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const initial = await fixture.service.snapshot(ISHALGEN_MAP_ID);
  assert.equal(initial.groupCount, 2);
  assert.equal(initial.spotCount, 3);
  assert.equal(initial.editableSpotCount, 2);
  assert.equal(initial.map.kind, "world");
  assert.equal(initial.map.supportsSpawnEditing, true);
  assert.equal(initial.map.projection, "calibrated-game-y-x");
  assert.deepEqual(initial.map.calibration, { offsetX: 740, offsetY: 0, mapWidth: 2300, mapHeight: 2300 });
  assert.equal(initial.groups[0]?.npc.displayName, "Test Mob");
  assert.equal(initial.spots[1]?.editable, false);

  const beforeValidate = await readFile(fixture.spawnPath, "utf8");
  const editableFirst = initial.spots.find(spot => spot.npcId === 210000 && spot.editable)!;
  const secondMob = initial.spots.find(spot => spot.npcId === 210001)!;
  const change = {
    revision: initial.revision,
    operations: [
      { kind: "update" as const, spotKey: editableFirst.key, x: 110.125, y: 200, z: 10, heading: 20 },
      { kind: "delete" as const, spotKey: secondMob.key },
      { kind: "create" as const, npcId: 210000, x: 130, y: 230, z: 13, heading: 50 },
      { kind: "create" as const, npcId: 210002, x: 300, y: 400, z: 20, heading: 60, respawnTime: 420 },
      { kind: "create" as const, npcId: 210002, x: 310, y: 410, z: 21, heading: 61, respawnTime: 420 },
    ],
  };
  const validation = await fixture.service.validate(ISHALGEN_MAP_ID, change);
  assert.deepEqual(
    { created: validation.created, updated: validation.updated, deleted: validation.deleted },
    { created: 3, updated: 1, deleted: 1 },
  );
  assert.equal(validation.resultingGroupCount, 2);
  assert.equal(validation.resultingSpotCount, 5);
  assert.equal(await readFile(fixture.spawnPath, "utf8"), beforeValidate, "validation must not write source XML");

  const applied = await fixture.service.apply(ISHALGEN_MAP_ID, change);
  assert.equal(applied.persisted, true);
  assert.notEqual(applied.snapshot.revision, initial.revision);
  assert.equal(applied.snapshot.groupCount, 2);
  assert.equal(applied.snapshot.spotCount, 5);
  assert.equal(applied.snapshot.groups.filter(group => group.npcId === 210002).length, 1);
  assert.equal(applied.snapshot.spots.filter(spot => spot.npcId === 210002).length, 2);
  assert.deepEqual(applied.sourceRelativePaths, [SPAWN_RELATIVE_PATH.replaceAll("\\", "/")]);
  const backupPath = path.join(fixture.dataDir, applied.backupRelativePath);
  assert.ok(existsSync(backupPath));
  assert.equal(await readFile(backupPath, "utf8"), beforeValidate);

  const written = await readFile(fixture.spawnPath, "utf8");
  assert.match(written, /x="110\.125" y="200\.00" z="10\.0" h="20"/);
  assert.match(written, /npc_id="210002" respawn_time="420"/);
  assert.doesNotMatch(written, /Second Mob/);
  assert.doesNotMatch(written, /(?<!\r)\n/, "the source file should retain CRLF line endings");

  await assert.rejects(
    fixture.service.apply(ISHALGEN_MAP_ID, change),
    (error: unknown) => error instanceof SpawnEditorError && error.code === "STALE_REVISION",
  );
  await assert.rejects(
    fixture.service.validate(ISHALGEN_MAP_ID, {
      revision: applied.snapshot.revision,
      operations: [{
        kind: "delete",
        spotKey: applied.snapshot.spots.find(spot => spot.staticId === 77)!.key,
      }],
    }),
    (error: unknown) => error instanceof SpawnEditorError && error.code === "SPAWN_READ_ONLY",
  );

  const newNpcSpots = applied.snapshot.spots.filter(spot => spot.npcId === 210002);
  const removed = await fixture.service.apply(ISHALGEN_MAP_ID, {
    revision: applied.snapshot.revision,
    operations: newNpcSpots.map(spot => ({ kind: "delete" as const, spotKey: spot.key })),
  });
  assert.equal(removed.snapshot.groupCount, 1);
  assert.equal(removed.snapshot.spotCount, 3);
  assert.doesNotMatch(await readFile(fixture.spawnPath, "utf8"), /npc_id="210002"/);
});

test("recreates a group when its last spot is deleted in the same change set", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const initial = await fixture.service.snapshot(ISHALGEN_MAP_ID);
  const secondMob = initial.spots.find(spot => spot.npcId === 210001)!;

  const applied = await fixture.service.apply(ISHALGEN_MAP_ID, {
    revision: initial.revision,
    operations: [
      { kind: "delete", spotKey: secondMob.key },
      { kind: "create", npcId: 210001, x: 700, y: 800, z: 30, heading: 70 },
    ],
  });

  assert.equal(applied.snapshot.groups.filter(group => group.npcId === 210001).length, 1);
  const recreated = applied.snapshot.spots.filter(spot => spot.npcId === 210001);
  assert.equal(recreated.length, 1);
  assert.deepEqual(
    { x: recreated[0]?.x, y: recreated[0]?.y, z: recreated[0]?.z, heading: recreated[0]?.heading },
    { x: 700, y: 800, z: 30, heading: 70 },
  );
  assert.equal(applied.snapshot.groups.find(group => group.npcId === 210001)?.respawnTime, 600);
});

test("aggregates repeated map blocks and applies multi-source changes with a backup per XML", async t => {
  const fixture = await createFixture(true);
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const initial = await fixture.service.snapshot(ISHALGEN_MAP_ID);

  assert.equal(initial.map.sourceRelativePaths.length, 2);
  assert.equal(initial.groupCount, 4);
  assert.equal(initial.spotCount, 5);
  const baseSpot = initial.spots.find(spot => spot.x === 100)!;
  const overlaySpot = initial.spots.find(spot => spot.x === 150)!;
  assert.notEqual(baseSpot.sourceRelativePath, overlaySpot.sourceRelativePath);

  const validation = await fixture.service.validate(ISHALGEN_MAP_ID, {
    revision: initial.revision,
    operations: [
      { kind: "update", spotKey: baseSpot.key, x: 111, y: 211, z: 11, heading: 22 },
      { kind: "update", spotKey: overlaySpot.key, x: 151, y: 251, z: 15, heading: 25 },
    ],
  });
  assert.match(validation.warnings.join(" "), /2 spawn XML files atomically/);

  const applied = await fixture.service.apply(ISHALGEN_MAP_ID, {
    revision: initial.revision,
    operations: [
      { kind: "update", spotKey: baseSpot.key, x: 111, y: 211, z: 11, heading: 22 },
      { kind: "update", spotKey: overlaySpot.key, x: 151, y: 251, z: 15, heading: 25 },
    ],
  });
  assert.equal(applied.sourceRelativePaths.length, 2);
  assert.equal(applied.backupRelativePaths.length, 2);
  assert.ok(applied.backupRelativePaths.every(relative => existsSync(path.join(fixture.dataDir, relative))));
  assert.match(await readFile(fixture.spawnPath, "utf8"), /x="111" y="211"/);
  assert.match(await readFile(fixture.overlayPath!, "utf8"), /x="151" y="251"/);
});

test("assigns a walker route to an editable spawn", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const initial = await fixture.service.snapshot(ISHALGEN_MAP_ID);
  const spot = initial.spots.find(candidate => candidate.npcId === 210000 && candidate.editable)!;

  const applied = await fixture.service.apply(ISHALGEN_MAP_ID, {
    revision: initial.revision,
    operations: [{ kind: "set-walker", spotKey: spot.key, walkerId: "NEW_ROUTE_220010000" }],
  });
  assert.equal(applied.snapshot.spots.find(candidate => candidate.key === spot.key)?.walkerId, "NEW_ROUTE_220010000");
  assert.match(await readFile(fixture.spawnPath, "utf8"), /walker_id="NEW_ROUTE_220010000"/);

  await assert.rejects(
    fixture.service.validate(ISHALGEN_MAP_ID, {
      revision: applied.snapshot.revision,
      operations: [{ kind: "set-walker", spotKey: spot.key, walkerId: "bad route id" }],
    }),
    (error: unknown) => error instanceof SpawnEditorError && error.code === "INVALID_WALKER_ID",
  );
});

test("parses and applies placements inside the selected siege context", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const initial = await fixture.service.snapshot(SIEGE_MAP_KEY);
  assert.equal(initial.map.id, SIEGE_MAP_ID);
  assert.equal(initial.map.category, "other");
  assert.equal(initial.map.spawnKind, "siege");
  assert.equal(initial.placementContexts.length, 2);
  assert.equal(initial.groupCount, 2);
  assert.equal(initial.spotCount, 3);
  assert.ok(initial.groups.every(group => group.contextLabel?.startsWith("Siege 7011")));
  const peace = initial.placementContexts.find(context => context.mode === "PEACE")!;
  const activeSiege = initial.placementContexts.find(context => context.mode === "SIEGE")!;

  await assert.rejects(
    fixture.service.validate(SIEGE_MAP_KEY, {
      revision: initial.revision,
      operations: [{ kind: "create", npcId: 210002, x: 300, y: 400, z: 20, heading: 60, respawnTime: 420 }],
    }),
    (error: unknown) => error instanceof SpawnEditorError && error.code === "SIEGE_CONTEXT_REQUIRED",
  );

  const existing = initial.spots.find(spot => spot.editable)!;
  const recreatedSpot = initial.spots.find(spot => spot.npcId === 210001)!;
  const change = {
    revision: initial.revision,
    operations: [
      { kind: "update" as const, spotKey: existing.key, x: 111, y: 211, z: 12, heading: 22 },
      { kind: "create" as const, npcId: 210000, contextKey: peace.key, x: 130, y: 230, z: 13, heading: 50 },
      { kind: "create" as const, npcId: 210002, contextKey: activeSiege.key, x: 300, y: 400, z: 20, heading: 60, respawnTime: 420 },
      { kind: "delete" as const, spotKey: recreatedSpot.key },
      { kind: "create" as const, npcId: 210001, contextKey: activeSiege.key, x: 500, y: 600, z: 25, heading: 30 },
    ],
  };
  const validation = await fixture.service.validate(SIEGE_MAP_KEY, change);
  assert.deepEqual(
    { created: validation.created, updated: validation.updated, groups: validation.resultingGroupCount, spots: validation.resultingSpotCount },
    { created: 3, updated: 1, groups: 3, spots: 5 },
  );

  const applied = await fixture.service.apply(SIEGE_MAP_KEY, change);
  assert.equal(applied.snapshot.groups.find(group => group.npcId === 210002)?.contextKey, activeSiege.key);
  assert.deepEqual(applied.sourceRelativePaths, [SIEGE_RELATIVE_PATH.replaceAll("\\", "/")]);
  const written = await readFile(fixture.siegePath, "utf8");
  assert.match(written, /<siege_mod mod="PEACE">[\s\S]*x="130" y="230" z="13" h="50"/);
  assert.match(written, /<siege_mod mod="SIEGE">[\s\S]*npc_id="210002" respawn_time="420"/);
  assert.doesNotMatch(written, /<spawn_map map_id="600090000">\s*<spawn npc_id=/);
});

test("keeps catalog maps without regular spawn XML available as view-only maps", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const mapId = 300300000;
  const map = fixture.service.listMaps().find(candidate => candidate.id === mapId)!;
  assert.equal(map.name, "Empyrean Crucible");
  assert.equal(map.kind, "instance");
  assert.equal(map.supportsSpawnEditing, false);
  assert.deepEqual(map.sourceRelativePaths, []);

  const snapshot = await fixture.service.snapshot(mapId);
  assert.equal(snapshot.groupCount, 0);
  assert.equal(snapshot.spotCount, 0);
  await assert.rejects(
    fixture.service.validate(mapId, {
      revision: snapshot.revision,
      operations: [{ kind: "create", npcId: 210000, x: 10, y: 20, z: 30, heading: 0 }],
    }),
    (error: unknown) => error instanceof SpawnEditorError && error.code === "MAP_VIEW_ONLY",
  );
});

async function createFixture(includeOverlay = false): Promise<{
  root: string;
  repoRoot: string;
  dataDir: string;
  spawnPath: string;
  siegePath: string;
  overlayPath?: string;
  service: SpawnEditorService;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "aion-spawn-editor-"));
  const repoRoot = path.join(root, "BeyondAionSharp");
  const dataDir = path.join(root, "portal-data");
  const manifestPath = path.join(root, "spawn-map-manifest.json");
  const overlayRelativePath = path.join(
    "game-server",
    "data",
    "static_data",
    "spawns",
    "Npcs",
    "Custom",
    "Fixture_Overlay.xml",
  );
  const overlayPath = path.join(repoRoot, overlayRelativePath);
  const spawnPath = path.join(repoRoot, SPAWN_RELATIVE_PATH);
  const siegePath = path.join(repoRoot, SIEGE_RELATIVE_PATH);
  const npcPath = path.join(repoRoot, "game-server", "data", "static_data", "npcs", "npc_templates.xml");
  await mkdir(path.dirname(spawnPath), { recursive: true });
  await mkdir(path.dirname(siegePath), { recursive: true });
  await mkdir(path.dirname(npcPath), { recursive: true });
  await mkdir(dataDir, { recursive: true });

  await writeFile(npcPath, `<?xml version="1.0" encoding="UTF-8"?>
<npc_templates>
  <npc_template npc_id="210000" name="test_mob" level="4" type="MONSTER" rank="NORMAL" />
  <npc_template npc_id="210001" name="second_mob" level="5" type="MONSTER" rank="NORMAL" />
  <npc_template npc_id="210002" name="new_guard" level="10" type="GUARD" rank="NORMAL" />
</npc_templates>
`, "utf8");

  const spawnXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<spawns>",
    '  <spawn_map map_id="220010000">',
    "    <!-- Test Mob -->",
    '    <spawn npc_id="210000" respawn_time="295">',
    '      <spot x="100" y="200.00" z="10.0" h="20" />',
    '      <spot x="101" y="201" z="11" h="21" static_id="77" />',
    "    </spawn>",
    "    <!-- Second Mob -->",
    '    <spawn npc_id="210001" respawn_time="600">',
    '      <spot x="500" y="600" z="25" h="30" />',
    "    </spawn>",
    "  </spawn_map>",
    "</spawns>",
    "",
  ].join("\r\n");
  await writeFile(spawnPath, spawnXml, "utf8");
  await writeFile(siegePath, `<?xml version="1.0" encoding="UTF-8"?>
<spawns>
  <spawn_map map_id="600090000">
    <siege_spawn siege_id="7011">
      <siege_race race="ASMODIANS">
        <siege_mod mod="PEACE">
          <!-- Test Mob -->
          <spawn npc_id="210000" respawn_time="295">
            <spot x="100" y="200" z="10" h="20" />
            <spot x="101" y="201" z="11" h="21" static_id="77" />
          </spawn>
        </siege_mod>
        <siege_mod mod="SIEGE">
          <!-- Second Mob -->
          <spawn npc_id="210001" respawn_time="600">
            <spot x="450" y="550" z="24" h="29" />
          </spawn>
        </siege_mod>
      </siege_race>
    </siege_spawn>
  </spawn_map>
</spawns>
`, "utf8");
  if (includeOverlay) {
    await mkdir(path.dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, `<?xml version="1.0" encoding="UTF-8"?>
<spawns>
  <spawn_map map_id="220010000">
    <spawn npc_id="210000" respawn_time="295">
      <spot x="150" y="250" z="15" h="24" />
    </spawn>
  </spawn_map>
  <spawn_map map_id="220010000">
    <spawn npc_id="210001" respawn_time="600">
      <spot x="550" y="650" z="35" h="34" />
    </spawn>
  </spawn_map>
</spawns>
`, "utf8");
  }
  const sourceRelativePaths = [
    SPAWN_RELATIVE_PATH.replaceAll("\\", "/"),
    ...(includeOverlay ? [overlayRelativePath.replaceAll("\\", "/")] : []),
  ];
  await writeFile(manifestPath, JSON.stringify({
    version: 2,
    maps: [{
      key: String(ISHALGEN_MAP_ID),
      mapId: ISHALGEN_MAP_ID,
      name: "Ishalgen",
      clientName: "DF1",
      kind: "world",
      category: "world",
      spawnKind: "regular",
      supportsSpawnEditing: true,
      worldSize: 3072,
      calibration: { offsetX: 740, offsetY: 0, mapWidth: 2300, mapHeight: 2300 },
      coordinateBounds: { minX: 0, maxX: 3072, minY: 0, maxY: 3072 },
      sourceRelativePaths,
      primarySourceRelativePath: SPAWN_RELATIVE_PATH.replaceAll("\\", "/"),
      layers: [{ id: "map", name: "Map", asset: "ishalgen.webp", assetKind: "map-window" }],
    }, {
      key: "300300000",
      mapId: 300300000,
      name: "Empyrean Crucible",
      clientName: "IDArena",
      kind: "instance",
      category: "instance",
      spawnKind: "regular",
      supportsSpawnEditing: false,
      worldSize: 2048,
      calibration: { offsetX: 0, offsetY: 0, mapWidth: 2048, mapHeight: 2048 },
      coordinateBounds: { minX: 0, maxX: 2048, minY: 0, maxY: 2048 },
      sourceRelativePaths: [],
      primarySourceRelativePath: "",
      layers: [{ id: "grid", name: "Coordinate grid", asset: "empyrean-grid.webp", assetKind: "grid-fallback" }],
    }, {
      key: SIEGE_MAP_KEY,
      mapId: SIEGE_MAP_ID,
      name: "Kaldor (Siege)",
      clientName: "Kaldor",
      kind: "world",
      category: "other",
      spawnKind: "siege",
      supportsSpawnEditing: true,
      worldSize: 2048,
      calibration: { offsetX: 0, offsetY: 0, mapWidth: 2048, mapHeight: 2048 },
      coordinateBounds: { minX: 0, maxX: 2048, minY: 0, maxY: 2048 },
      sourceRelativePaths: [SIEGE_RELATIVE_PATH.replaceAll("\\", "/")],
      primarySourceRelativePath: SIEGE_RELATIVE_PATH.replaceAll("\\", "/"),
      layers: [{ id: "map", name: "Map", asset: "kaldor.webp", assetKind: "map-window" }],
    }],
  }), "utf8");

  const catalog = new NpcCatalog(repoRoot);
  await catalog.load();
  return {
    root,
    repoRoot,
    dataDir,
    spawnPath,
    siegePath,
    overlayPath: includeOverlay ? overlayPath : undefined,
    service: new SpawnEditorService(repoRoot, dataDir, catalog, manifestPath),
  };
}
