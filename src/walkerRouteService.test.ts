import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { SpawnEditorError } from "./spawnEditorService.js";
import { WalkerRouteService } from "./walkerRouteService.js";

test("loads recursive walker XML and mirrors runtime loop expansion", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  assert.equal(await fixture.service.isReady(), true);
  assert.equal(await fixture.service.size(), 3);

  const normal = await fixture.service.route("normal-route");
  assert.equal(normal.loopType, "NORMAL");
  assert.equal(normal.closesLoop, true);
  assert.equal(normal.authoredStepCount, 3);
  assert.equal(normal.effectiveStepCount, 3);
  assert.equal(normal.pool, 3);
  assert.equal(normal.formation, "SQUARE");
  assert.deepEqual(normal.rows, [1, 2]);
  assert.equal(normal.length2d, 34.142);
  assert.equal(normal.length3d, 34.142);
  assert.deepEqual(normal.bounds, { minX: 0, maxX: 10, minY: 0, maxY: 10, minZ: 5, maxZ: 5 });

  const walkBack = await fixture.service.route("walk-back-route");
  assert.equal(walkBack.loopType, "WALK_BACK");
  assert.equal(walkBack.authoredStepCount, 3);
  assert.equal(walkBack.effectiveStepCount, 4);
  assert.deepEqual(walkBack.effectiveSteps.map(step => step.x), [100, 110, 120, 110]);
  assert.deepEqual(walkBack.effectiveSteps.map(step => step.authoredIndex), [1, 2, 3, 2]);
  assert.deepEqual(walkBack.effectiveSteps.map(step => step.synthesized), [false, false, false, true]);
  assert.equal(walkBack.authoredSteps[1]?.restTime, 1500);
  assert.equal(walkBack.formation, "SQUARE");
  assert.deepEqual(walkBack.rows, [2]);
  assert.equal(walkBack.length2d, 40);

  const oneWay = await fixture.service.route("one-way-route");
  assert.equal(oneWay.loopType, "NONE");
  assert.equal(oneWay.closesLoop, false);
  assert.equal(oneWay.length2d, 10);
});

test("uses the first duplicate route in ordinal server load order", async t => {
  const fixture = await createFixture(true);
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const route = await fixture.service.route("normal-route");
  assert.equal(route.sourceRelativePath.endsWith("a_routes.xml"), true);
  assert.match(route.warnings.join(" "), /Duplicate route id/);
});

test("reports an unknown walker id", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  await assert.rejects(
    fixture.service.route("missing-route"),
    (error: unknown) => error instanceof SpawnEditorError && error.code === "WALKER_NOT_FOUND",
  );
});

test("updates only the owning route block with backup and stale-revision protection", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const original = await fixture.service.route("normal-route");
  const before = await readFile(fixture.primaryPath, "utf8");
  const change = {
    mode: "update" as const,
    routeId: original.id,
    revision: original.revision,
    loopType: "NONE" as const,
    steps: [
      { x: 1.125, y: 2.25, z: 5.5, restTime: 0 },
      { x: 11.5, y: 2.25, z: 6.75, restTime: 1250 },
      { x: 21.75, y: 12.5, z: 7.25, restTime: 0 },
    ],
  };

  const validation = await fixture.service.validate(change);
  assert.equal(validation.stepCount, 3);
  assert.equal(validation.loopType, "NONE");
  assert.equal(await readFile(fixture.primaryPath, "utf8"), before, "validation must not write walker XML");

  const applied = await fixture.service.apply(change);
  assert.equal(applied.persisted, true);
  assert.equal(applied.route.loopType, "NONE");
  assert.equal(applied.route.authoredSteps[1]?.restTime, 1250);
  assert.equal(await readFile(path.join(fixture.dataDir, applied.backupRelativePath), "utf8"), before);
  const written = await readFile(fixture.primaryPath, "utf8");
  assert.match(written, /route_id="normal-route" pool="3" formation="SQUARE" rows="1,2" loop_type="NONE"/);
  assert.match(written, /x="11\.5" y="2\.25" z="6\.75" rest_time="1250"/);
  assert.match(written, /route_id="one-way-route" loop_type="NONE">\r\n    <routestep x="20" y="20" z="7" \/>/);
  assert.doesNotMatch(written, /(?<!\r)\n/, "the source must retain CRLF line endings");

  await assert.rejects(
    fixture.service.apply(change),
    (error: unknown) => error instanceof SpawnEditorError && error.code === "STALE_WALKER_REVISION",
  );
});

test("creates a new route in custom_npc_walker.xml and rejects duplicate ids", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const change = {
    mode: "create" as const,
    routeId: "NEW_PATROL_220010000",
    loopType: "WALK_BACK" as const,
    steps: [
      { x: 400, y: 500, z: 25.125 },
      { x: 410, y: 520, z: 26.25 },
      { x: 430, y: 540, z: 27.5 },
    ],
  };

  const applied = await fixture.service.apply(change);
  assert.equal(applied.sourceRelativePath.endsWith("custom_npc_walker.xml"), true);
  assert.equal(applied.route.loopType, "WALK_BACK");
  assert.equal(applied.route.authoredStepCount, 3);
  assert.equal(applied.route.effectiveStepCount, 4);
  assert.match(await readFile(fixture.customPath, "utf8"), /route_id="NEW_PATROL_220010000" loop_type="WALK_BACK"/);

  await assert.rejects(
    fixture.service.apply(change),
    (error: unknown) => error instanceof SpawnEditorError && error.code === "WALKER_ID_EXISTS",
  );
});

async function createFixture(includeDuplicate = false): Promise<{
  root: string;
  dataDir: string;
  primaryPath: string;
  customPath: string;
  service: WalkerRouteService;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "aion-walker-viewer-"));
  const dataDir = path.join(root, "portal-data");
  const walkerRoot = path.join(root, "game-server", "data", "static_data", "npc_walker");
  const nestedRoot = path.join(walkerRoot, "instances");
  const primaryPath = path.join(walkerRoot, "a_routes.xml");
  const customPath = path.join(walkerRoot, "custom_npc_walker.xml");
  await mkdir(nestedRoot, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await writeFile(primaryPath, [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<npc_walker>",
    '  <walker_template route_id="normal-route" pool="3" formation="SQUARE" rows="1,2">',
    '    <routestep x="0" y="0" z="5" />',
    '    <routestep x="10" y="0" z="5" />',
    '    <routestep x="10" y="10" z="5" />',
    "  </walker_template>",
    '  <walker_template route_id="one-way-route" loop_type="NONE">',
    '    <routestep x="20" y="20" z="7" />',
    '    <routestep x="30" y="20" z="7" />',
    "  </walker_template>",
    "</npc_walker>",
    "",
  ].join("\r\n"), "utf8");
  await writeFile(customPath, [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<npc_walker>",
    "</npc_walker>",
    "",
  ].join("\r\n"), "utf8");
  await writeFile(path.join(nestedRoot, "z_routes.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<npc_walker>
  <walker_template route_id="walk-back-route" loop_type="WALK_BACK" pool="2">
    <routestep x="100" y="200" z="10" />
    <routestep x="110" y="200" z="10" rest_time="1500" />
    <routestep x="120" y="200" z="10" />
  </walker_template>
</npc_walker>
`, "utf8");
  if (includeDuplicate) {
    await writeFile(path.join(walkerRoot, "z_duplicate.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<npc_walker>
  <walker_template route_id="normal-route">
    <routestep x="999" y="999" z="999" />
  </walker_template>
</npc_walker>
`, "utf8");
  }
  return {
    root,
    dataDir,
    primaryPath,
    customPath,
    service: new WalkerRouteService(root, dataDir),
  };
}
