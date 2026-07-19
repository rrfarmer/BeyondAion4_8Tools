import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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

async function createFixture(includeDuplicate = false): Promise<{
  root: string;
  service: WalkerRouteService;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "aion-walker-viewer-"));
  const walkerRoot = path.join(root, "game-server", "data", "static_data", "npc_walker");
  const nestedRoot = path.join(walkerRoot, "instances");
  await mkdir(nestedRoot, { recursive: true });
  await writeFile(path.join(walkerRoot, "a_routes.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<npc_walker>
  <walker_template route_id="normal-route">
    <routestep x="0" y="0" z="5" />
    <routestep x="10" y="0" z="5" />
    <routestep x="10" y="10" z="5" />
  </walker_template>
  <walker_template route_id="one-way-route" loop_type="NONE">
    <routestep x="20" y="20" z="7" />
    <routestep x="30" y="20" z="7" />
  </walker_template>
</npc_walker>
`, "utf8");
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
  return { root, service: new WalkerRouteService(root) };
}
