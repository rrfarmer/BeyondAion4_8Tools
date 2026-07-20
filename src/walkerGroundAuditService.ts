import type {
  SpawnEditorService,
  SpawnEditorSnapshot,
} from "./spawnEditorService.js";
import type { TerrainHeightLookup, TerrainHeightService } from "./terrainHeightService.js";
import type { WalkerRoute, WalkerRouteService } from "./walkerRouteService.js";

export const DEFAULT_WALKER_GROUND_TOLERANCE_METERS = 2;

export type WalkerGroundAuditUsage = {
  spotKey: string;
  npcId: number;
  npcName: string;
  x: number;
  y: number;
  z: number;
  sourceRelativePath: string;
};

export type WalkerGroundAuditPoint = {
  authoredIndex: number;
  x: number;
  y: number;
  z: number;
  groundZ: number;
  delta: number;
  absoluteDelta: number;
};

export type WalkerGroundAuditFinding = {
  key: string;
  mapId: number;
  mapName: string;
  routeId: string;
  routeRevision: string;
  sourceRelativePath: string;
  authoredPointCount: number;
  offGroundPointCount: number;
  maxAbsoluteDelta: number;
  worstDelta: number;
  usages: WalkerGroundAuditUsage[];
  points: WalkerGroundAuditPoint[];
};

export type WalkerGroundAuditGap = {
  mapId: number;
  mapName: string;
  routeId: string;
  unavailablePointCount: number;
  reasons: string[];
};

export type WalkerGroundAuditMissingRoute = {
  mapId: number;
  mapName: string;
  routeId: string;
  usageCount: number;
  message: string;
};

export type WalkerGroundAuditReport = {
  ok: true;
  generatedAt: string;
  toleranceMeters: number;
  mapCount: number;
  mapsWithPatrols: number;
  attachedSpawnCount: number;
  mapPathCount: number;
  distinctRouteCount: number;
  auditedPathCount: number;
  checkedPointCount: number;
  unavailablePointCount: number;
  offGroundPathCount: number;
  offGroundPointCount: number;
  missingRouteCount: number;
  findings: WalkerGroundAuditFinding[];
  terrainGaps: WalkerGroundAuditGap[];
  missingRoutes: WalkerGroundAuditMissingRoute[];
};

type SpawnAuditSource = Pick<SpawnEditorService, "listMaps" | "snapshot">;
type WalkerAuditSource = Pick<WalkerRouteService, "route">;
type TerrainAuditSource = Pick<TerrainHeightService, "lookup">;

export class WalkerGroundAuditService {
  constructor(
    private readonly spawns: SpawnAuditSource,
    private readonly walkers: WalkerAuditSource,
    private readonly terrain: TerrainAuditSource,
  ) {}

  async scan(toleranceMeters = DEFAULT_WALKER_GROUND_TOLERANCE_METERS): Promise<WalkerGroundAuditReport> {
    if (!Number.isFinite(toleranceMeters) || toleranceMeters < 0 || toleranceMeters > 100) {
      throw new Error("Walker ground tolerance must be between 0 and 100 meters.");
    }

    const maps = this.spawns.listMaps().filter(map => map.spawnKind === "regular");
    const findings: WalkerGroundAuditFinding[] = [];
    const terrainGaps: WalkerGroundAuditGap[] = [];
    const missingRoutes: WalkerGroundAuditMissingRoute[] = [];
    const distinctRouteIds = new Set<string>();
    let mapsWithPatrols = 0;
    let attachedSpawnCount = 0;
    let mapPathCount = 0;
    let auditedPathCount = 0;
    let checkedPointCount = 0;
    let unavailablePointCount = 0;

    for (const map of maps) {
      const snapshot = await this.spawns.snapshot(map.key);
      const usagesByRoute = routeUsages(snapshot);
      if (usagesByRoute.size > 0) mapsWithPatrols += 1;
      attachedSpawnCount += [...usagesByRoute.values()].reduce((total, usages) => total + usages.length, 0);
      mapPathCount += usagesByRoute.size;

      for (const [routeId, usages] of usagesByRoute) {
        distinctRouteIds.add(routeId);
        let route: WalkerRoute;
        try {
          route = await this.walkers.route(routeId);
        } catch (error) {
          missingRoutes.push({
            mapId: map.id,
            mapName: map.name,
            routeId,
            usageCount: usages.length,
            message: error instanceof Error ? error.message : String(error),
          });
          continue;
        }

        auditedPathCount += 1;
        const lookups = await Promise.all(route.authoredSteps.map(step =>
          this.terrain.lookup(map.id, map.worldSize, step.x, step.y),
        ));
        const points: WalkerGroundAuditPoint[] = [];
        const unavailable: TerrainHeightLookup[] = [];

        for (const [index, step] of route.authoredSteps.entries()) {
          const ground = lookups[index];
          if (!ground?.available) {
            unavailable.push(ground ?? { available: false, reason: "HEIGHTMAP_NOT_AVAILABLE" });
            unavailablePointCount += 1;
            continue;
          }

          checkedPointCount += 1;
          const delta = step.z - ground.z;
          if (Math.abs(delta) <= toleranceMeters) continue;
          points.push({
            authoredIndex: step.authoredIndex,
            x: step.x,
            y: step.y,
            z: step.z,
            groundZ: round(ground.z, 5),
            delta: round(delta, 5),
            absoluteDelta: round(Math.abs(delta), 5),
          });
        }

        if (unavailable.length > 0) {
          terrainGaps.push({
            mapId: map.id,
            mapName: map.name,
            routeId,
            unavailablePointCount: unavailable.length,
            reasons: [...new Set(unavailable.map(result => result.available ? "" : result.reason))]
              .filter(Boolean)
              .sort(),
          });
        }

        if (points.length === 0) continue;
        const worst = points.reduce((current, point) =>
          point.absoluteDelta > current.absoluteDelta ? point : current,
        );
        findings.push({
          key: `${map.id}:${route.id}`,
          mapId: map.id,
          mapName: map.name,
          routeId: route.id,
          routeRevision: route.revision,
          sourceRelativePath: route.sourceRelativePath,
          authoredPointCount: route.authoredStepCount,
          offGroundPointCount: points.length,
          maxAbsoluteDelta: worst.absoluteDelta,
          worstDelta: worst.delta,
          usages,
          points,
        });
      }
    }

    findings.sort((left, right) =>
      right.maxAbsoluteDelta - left.maxAbsoluteDelta
      || left.mapName.localeCompare(right.mapName, "en-US")
      || left.routeId.localeCompare(right.routeId, "en-US"),
    );
    terrainGaps.sort(compareMapRoute);
    missingRoutes.sort(compareMapRoute);

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      toleranceMeters: round(toleranceMeters, 5),
      mapCount: maps.length,
      mapsWithPatrols,
      attachedSpawnCount,
      mapPathCount,
      distinctRouteCount: distinctRouteIds.size,
      auditedPathCount,
      checkedPointCount,
      unavailablePointCount,
      offGroundPathCount: findings.length,
      offGroundPointCount: findings.reduce((total, finding) => total + finding.offGroundPointCount, 0),
      missingRouteCount: missingRoutes.length,
      findings,
      terrainGaps,
      missingRoutes,
    };
  }
}

function routeUsages(snapshot: SpawnEditorSnapshot): Map<string, WalkerGroundAuditUsage[]> {
  const groups = new Map(snapshot.groups.map(group => [group.key, group]));
  const usages = new Map<string, WalkerGroundAuditUsage[]>();
  for (const spot of snapshot.spots) {
    const routeId = spot.walkerId.trim();
    if (!routeId) continue;
    const group = groups.get(spot.groupKey);
    const entry: WalkerGroundAuditUsage = {
      spotKey: spot.key,
      npcId: spot.npcId,
      npcName: group?.npc.displayName || `NPC ${spot.npcId}`,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      sourceRelativePath: spot.sourceRelativePath,
    };
    const routeUsages = usages.get(routeId);
    if (routeUsages) routeUsages.push(entry);
    else usages.set(routeId, [entry]);
  }
  for (const routeUsages of usages.values()) {
    routeUsages.sort((left, right) =>
      left.npcName.localeCompare(right.npcName, "en-US") || left.spotKey.localeCompare(right.spotKey, "en-US"),
    );
  }
  return usages;
}

function compareMapRoute(
  left: Pick<WalkerGroundAuditGap, "mapName" | "routeId">,
  right: Pick<WalkerGroundAuditGap, "mapName" | "routeId">,
): number {
  return left.mapName.localeCompare(right.mapName, "en-US") || left.routeId.localeCompare(right.routeId, "en-US");
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
