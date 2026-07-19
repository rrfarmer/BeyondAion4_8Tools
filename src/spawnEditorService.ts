import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { access, chmod, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DOMParser,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import { NpcCatalog, humanizeNpcName, type NpcTemplateInfo } from "./npcCatalog.js";

export const ISHALGEN_MAP_ID = 220010000;

export type SpawnEditorMapLayer = {
  id: string;
  name: string;
  imageUrl: string;
  assetKind: "map-window" | "radar" | "grid-fallback";
};

export type SpawnEditorMap = {
  id: number;
  name: string;
  clientName: string;
  worldSize: number;
  projection: "calibrated-game-y-x";
  calibration: {
    offsetX: number;
    offsetY: number;
    mapWidth: number;
    mapHeight: number;
  };
  coordinateBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  layers: SpawnEditorMapLayer[];
  defaultLayerId: string;
  imageUrl: string;
  sourceRelativePath: string;
  sourceRelativePaths: string[];
};

export type SpawnEditorGroup = {
  key: string;
  npcId: number;
  npc: NpcTemplateInfo;
  respawnTime: number;
  pool: number;
  handler: string;
  temporary: boolean;
  editable: boolean;
  spotCount: number;
  sourceRelativePath: string;
  attributes: Record<string, string>;
};

export type SpawnEditorSpot = {
  key: string;
  groupKey: string;
  npcId: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  randomWalk: number;
  walkerId: string;
  walkerIndex: number | undefined;
  staticId: number;
  aerial: boolean;
  ai: string;
  anchor: string;
  state: number;
  editable: boolean;
  sourceRelativePath: string;
  warnings: string[];
  attributes: Record<string, string>;
};

export type SpawnEditorSnapshot = {
  ok: true;
  map: SpawnEditorMap;
  revision: string;
  generatedAt: string;
  groupCount: number;
  spotCount: number;
  editableSpotCount: number;
  groups: SpawnEditorGroup[];
  spots: SpawnEditorSpot[];
};

export type SpawnEditorOperation =
  | {
      kind: "update";
      spotKey: string;
      x: number;
      y: number;
      z: number;
      heading: number;
    }
  | {
      kind: "delete";
      spotKey: string;
    }
  | {
      kind: "create";
      clientKey?: string;
      npcId: number;
      x: number;
      y: number;
      z: number;
      heading: number;
      respawnTime?: number;
    };

export type SpawnEditorChangeRequest = {
  revision: string;
  operations: SpawnEditorOperation[];
  reason?: string;
};

export type SpawnEditorValidation = {
  ok: true;
  valid: true;
  revision: string;
  operationCount: number;
  created: number;
  updated: number;
  deleted: number;
  resultingGroupCount: number;
  resultingSpotCount: number;
  warnings: string[];
};

export type SpawnEditorApplyResult = SpawnEditorValidation & {
  persisted: true;
  backupRelativePath: string;
  backupRelativePaths: string[];
  sourceRelativePath: string;
  sourceRelativePaths: string[];
  snapshot: SpawnEditorSnapshot;
};

export class SpawnEditorError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SpawnEditorError";
  }
}

type MapSourceDefinition = {
  sourceRelativePath: string;
  absolutePath: string;
};

type MapDefinition = SpawnEditorMap & {
  sources: MapSourceDefinition[];
  primarySource: MapSourceDefinition;
};

type ParsedSource = {
  definition: MapSourceDefinition;
  sourceIndex: number;
  source: string;
  revision: string;
  newline: "\r\n" | "\n";
  document: XmlDocument;
  mapElements: XmlElement[];
  groups: ParsedGroup[];
};

type ParsedGroup = {
  key: string;
  index: number;
  mapIndex: number;
  element: XmlElement;
  mapElement: XmlElement;
  source: ParsedSource;
  npcId: number;
  respawnTime: number;
  pool: number;
  handler: string;
  temporary: boolean;
  editable: boolean;
  npc: NpcTemplateInfo;
  spots: ParsedSpot[];
};

type ParsedSpot = {
  key: string;
  index: number;
  element: XmlElement;
  group: ParsedGroup;
  editable: boolean;
};

type ParsedMap = {
  definition: MapDefinition;
  sources: ParsedSource[];
  revision: string;
  groups: ParsedGroup[];
  spotsByKey: Map<string, ParsedSpot>;
};

type SourceChange = {
  parsed: ParsedSource;
  source: string;
};

type AppliedDocuments = {
  parsed: ParsedMap;
  changes: SourceChange[];
  validation: SpawnEditorValidation;
};

type ManifestLayer = {
  id: string;
  name: string;
  asset: string;
  assetKind: SpawnEditorMapLayer["assetKind"];
};

type ManifestMap = {
  mapId: number;
  name: string;
  clientName: string;
  worldSize: number;
  calibration: SpawnEditorMap["calibration"];
  coordinateBounds: SpawnEditorMap["coordinateBounds"];
  sourceRelativePaths: string[];
  primarySourceRelativePath: string;
  layers: ManifestLayer[];
};

type SpawnMapManifest = {
  version: number;
  maps: ManifestMap[];
};

export class SpawnEditorService {
  private applyQueue: Promise<void> = Promise.resolve();
  private readonly definitions: Map<number, MapDefinition>;

  constructor(
    private readonly beyondAionSharpRepoRoot: string,
    private readonly dataDir: string,
    private readonly npcCatalog: NpcCatalog,
    manifestPath = path.resolve("assets", "maps", "manifest.json"),
  ) {
    this.definitions = loadMapDefinitions(beyondAionSharpRepoRoot, manifestPath);
  }

  listMaps(): SpawnEditorMap[] {
    return [...this.definitions.values()]
      .sort((left, right) => left.name.localeCompare(right.name, "en-US") || left.id - right.id)
      .map(definition => this.publicMap(definition));
  }

  getMap(mapId: number): SpawnEditorMap {
    return this.publicMap(this.mapDefinition(mapId));
  }

  async isReady(): Promise<boolean> {
    const sourcePaths = new Set(
      [...this.definitions.values()].flatMap(definition => definition.sources.map(source => source.absolutePath)),
    );
    if (sourcePaths.size === 0) return false;
    try {
      await Promise.all([...sourcePaths].map(sourcePath => access(sourcePath)));
      return true;
    } catch {
      return false;
    }
  }

  async snapshot(mapId: number): Promise<SpawnEditorSnapshot> {
    return this.snapshotFromParsed(await this.readMap(mapId));
  }

  async validate(mapId: number, request: SpawnEditorChangeRequest): Promise<SpawnEditorValidation> {
    return (await this.prepareChange(mapId, request)).validation;
  }

  async apply(mapId: number, request: SpawnEditorChangeRequest): Promise<SpawnEditorApplyResult> {
    let releaseQueue!: () => void;
    const previous = this.applyQueue;
    this.applyQueue = new Promise<void>(resolve => {
      releaseQueue = resolve;
    });
    await previous;
    try {
      return await this.applyExclusive(mapId, request);
    } finally {
      releaseQueue();
    }
  }

  private async applyExclusive(mapId: number, request: SpawnEditorChangeRequest): Promise<SpawnEditorApplyResult> {
    const prepared = await this.prepareChange(mapId, request);
    await this.requireSourceRevisions(prepared.parsed);

    const backupDir = path.join(this.dataDir, "spawn-editor-backups", String(mapId));
    await mkdir(backupDir, { recursive: true });
    const stamp = timestampForFile();
    const pending: Array<{
      change: SourceChange;
      temporaryPath: string;
      backupPath: string;
      sourceMode: number;
    }> = [];

    try {
      for (const [index, change] of prepared.changes.entries()) {
        const sourceMode = (await stat(change.parsed.definition.absolutePath)).mode & 0o777;
        const sourceLabel = path.basename(change.parsed.definition.sourceRelativePath, ".xml")
          .replace(/[^a-zA-Z0-9_-]+/g, "-")
          .slice(0, 80);
        const backupName = `${stamp}-${index + 1}-${sourceLabel}-${change.parsed.revision.slice(0, 12)}.xml`;
        const backupPath = path.join(backupDir, backupName);
        const temporaryPath = `${change.parsed.definition.absolutePath}.${process.pid}.${Date.now()}.${index}.tmp`;
        await writeFile(backupPath, change.parsed.source, "utf8");
        await writeFile(temporaryPath, change.source, "utf8");
        await chmod(temporaryPath, sourceMode);
        pending.push({ change, temporaryPath, backupPath, sourceMode });
      }

      const proposedSources = prepared.parsed.sources.map(source => ({
        definition: source.definition,
        source: prepared.changes.find(change => change.parsed === source)?.source ?? source.source,
      }));
      const verification = this.parseMapSources(prepared.parsed.definition, proposedSources);
      if (
        verification.groups.length !== prepared.validation.resultingGroupCount
        || verification.spotsByKey.size !== prepared.validation.resultingSpotCount
      ) {
        throw new SpawnEditorError(
          500,
          "WRITE_VERIFICATION_FAILED",
          "Serialized spawn XML did not match the validated change set.",
        );
      }

      await this.requireSourceRevisions(prepared.parsed);
      const renamed: typeof pending = [];
      try {
        for (const item of pending) {
          await rename(item.temporaryPath, item.change.parsed.definition.absolutePath);
          renamed.push(item);
        }
      } catch (error) {
        const rollbackFailures: string[] = [];
        for (const item of renamed.reverse()) {
          const rollbackPath = `${item.change.parsed.definition.absolutePath}.${process.pid}.${Date.now()}.rollback`;
          try {
            await writeFile(rollbackPath, item.change.parsed.source, "utf8");
            await chmod(rollbackPath, item.sourceMode);
            await rename(rollbackPath, item.change.parsed.definition.absolutePath);
          } catch (rollbackError) {
            rollbackFailures.push(`${item.change.parsed.definition.sourceRelativePath}: ${String(rollbackError)}`);
            await rm(rollbackPath, { force: true }).catch(() => undefined);
          }
        }
        if (rollbackFailures.length > 0) {
          throw new SpawnEditorError(
            500,
            "ROLLBACK_FAILED",
            "A multi-file spawn write failed and one or more source files could not be restored automatically.",
            { rollbackFailures, originalError: String(error) },
          );
        }
        throw error;
      }
    } catch (error) {
      await Promise.all(pending.map(item => rm(item.temporaryPath, { force: true }).catch(() => undefined)));
      throw error;
    }

    const snapshot = await this.snapshot(mapId);
    const backupRelativePaths = pending.map(item =>
      path.relative(this.dataDir, item.backupPath).replaceAll("\\", "/"),
    );
    const sourceRelativePaths = prepared.changes.map(change => change.parsed.definition.sourceRelativePath);
    return {
      ...prepared.validation,
      persisted: true,
      backupRelativePath: backupRelativePaths[0] ?? "",
      backupRelativePaths,
      sourceRelativePath: sourceRelativePaths[0] ?? prepared.parsed.definition.sourceRelativePath,
      sourceRelativePaths,
      snapshot,
    };
  }

  private async prepareChange(mapId: number, request: SpawnEditorChangeRequest): Promise<AppliedDocuments> {
    const parsed = await this.readMap(mapId);
    if (!request || typeof request.revision !== "string" || request.revision !== parsed.revision) {
      throw new SpawnEditorError(
        409,
        "STALE_REVISION",
        "The spawn files changed after this map was loaded. Reload the map before applying changes.",
        { expectedRevision: parsed.revision },
      );
    }
    if (!Array.isArray(request.operations) || request.operations.length === 0) {
      throw new SpawnEditorError(400, "NO_OPERATIONS", "At least one spawn change is required.");
    }
    if (request.operations.length > 2000) {
      throw new SpawnEditorError(400, "TOO_MANY_OPERATIONS", "A single apply is limited to 2,000 spawn changes.");
    }

    const touchedSpotKeys = new Set<string>();
    const touchedSources = new Set<ParsedSource>();
    let created = 0;
    let updated = 0;
    let deleted = 0;
    const warnings = new Set<string>();

    for (const operation of request.operations) {
      if (!operation || typeof operation !== "object" || typeof operation.kind !== "string") {
        throw new SpawnEditorError(400, "UNKNOWN_OPERATION", "The change set contains an unsupported operation.");
      }
      if (operation.kind === "update") {
        if (touchedSpotKeys.has(operation.spotKey)) {
          throw new SpawnEditorError(400, "DUPLICATE_OPERATION", `Spawn ${operation.spotKey} has more than one operation.`);
        }
        const spot = this.requireEditableSpot(parsed, operation.spotKey);
        this.validatePosition(parsed.definition, operation);
        updatePositionAttributes(spot.element, operation);
        touchedSources.add(spot.group.source);
        touchedSpotKeys.add(operation.spotKey);
        updated++;
      } else if (operation.kind === "delete") {
        if (touchedSpotKeys.has(operation.spotKey)) {
          throw new SpawnEditorError(400, "DUPLICATE_OPERATION", `Spawn ${operation.spotKey} has more than one operation.`);
        }
        const spot = this.requireEditableSpot(parsed, operation.spotKey);
        this.deleteSpot(spot);
        touchedSources.add(spot.group.source);
        touchedSpotKeys.add(operation.spotKey);
        deleted++;
      } else if (operation.kind === "create") {
        const npcId = requirePositiveInt(operation.npcId, "NPC ID");
        const npc = this.npcCatalog.templateFor(npcId);
        if (!npc) {
          throw new SpawnEditorError(400, "NPC_NOT_FOUND", `NPC template ${npcId} does not exist.`);
        }
        this.validatePosition(parsed.definition, operation);
        const originalGroups = parsed.groups.filter(group => group.npcId === npcId);
        const connectedGroups = originalGroups.filter(group => group.element.parentNode === group.mapElement);
        const writableGroups = connectedGroups.filter(
          group => group.editable && group.spots.some(spot => spot.editable),
        );
        const connectedGroup = writableGroups.find(
          group => group.source.definition.sourceRelativePath === parsed.definition.sourceRelativePath,
        ) ?? writableGroups[0];
        const newlyCreatedGroup = parsed.sources.flatMap(source =>
          source.mapElements.flatMap(mapElement =>
            directChildElements(mapElement, "spawn").map(element => ({ source, element })),
          ),
        ).find(candidate =>
          intAttribute(candidate.element, "npc_id", 0) === npcId
          && !originalGroups.some(group => group.element === candidate.element),
        );

        if (connectedGroup) {
          appendSpot(connectedGroup.element, createSpotElement(connectedGroup.source.document, operation));
          touchedSources.add(connectedGroup.source);
          if (connectedGroup.pool > 0) {
            warnings.add(`${npc.displayName} uses a pool; the new location becomes another pool candidate.`);
          }
        } else if (newlyCreatedGroup) {
          appendSpot(newlyCreatedGroup.element, createSpotElement(newlyCreatedGroup.source.document, operation));
          touchedSources.add(newlyCreatedGroup.source);
        } else {
          if (connectedGroups.length > 0) {
            throw new SpawnEditorError(
              400,
              "GROUP_READ_ONLY",
              `${npc.displayName} uses only special/static spawn groups and cannot receive a regular map placement.`,
            );
          }
          const targetSource = parsed.sources.find(
            source => source.definition.sourceRelativePath === parsed.definition.sourceRelativePath,
          ) ?? parsed.sources[0];
          const targetMapElement = targetSource?.mapElements[0];
          if (!targetSource || !targetMapElement) {
            throw new SpawnEditorError(500, "PRIMARY_SOURCE_MISSING", "The map has no writable primary spawn block.");
          }
          const respawnTime = requireIntInRange(
            operation.respawnTime ?? originalGroups[0]?.respawnTime,
            1,
            604800,
            "Respawn time",
          );
          appendSpawnGroup(targetSource.document, targetMapElement, npc, respawnTime, operation);
          touchedSources.add(targetSource);
        }
        created++;
      } else {
        throw new SpawnEditorError(400, "UNKNOWN_OPERATION", "The change set contains an unsupported operation.");
      }
    }

    const changes = parsed.sources
      .filter(source => touchedSources.has(source))
      .map(source => ({ parsed: source, source: serializeDocument(source.document, source.newline) }));
    const proposedSources = parsed.sources.map(source => ({
      definition: source.definition,
      source: changes.find(change => change.parsed === source)?.source ?? source.source,
    }));
    const reparsed = this.parseMapSources(parsed.definition, proposedSources);
    for (const group of reparsed.groups) {
      if (group.spots.length === 0) {
        throw new SpawnEditorError(400, "EMPTY_GROUP", `${group.npc.displayName} has no remaining spawn locations.`);
      }
      if (group.pool > 0 && group.spots.length <= group.pool) {
        throw new SpawnEditorError(
          400,
          "INVALID_POOL_SIZE",
          `${group.npc.displayName} must keep more locations than its pool size (${group.pool}).`,
        );
      }
    }
    if (changes.length > 1) {
      warnings.add(`This change set updates ${changes.length} spawn XML files atomically.`);
    }

    return {
      parsed,
      changes,
      validation: {
        ok: true,
        valid: true,
        revision: parsed.revision,
        operationCount: request.operations.length,
        created,
        updated,
        deleted,
        resultingGroupCount: reparsed.groups.length,
        resultingSpotCount: reparsed.spotsByKey.size,
        warnings: [...warnings],
      },
    };
  }

  private deleteSpot(spot: ParsedSpot): void {
    const groupElement = spot.group.element;
    removeNodeWithLeadingWhitespace(groupElement, spot.element);
    if (directChildElements(groupElement, "spot").length === 0) {
      removeSpawnGroupWithComment(groupElement);
    }
  }

  private requireEditableSpot(parsed: ParsedMap, spotKey: string): ParsedSpot {
    const spot = parsed.spotsByKey.get(spotKey);
    if (!spot) {
      throw new SpawnEditorError(404, "SPAWN_NOT_FOUND", `Spawn ${spotKey} no longer exists.`);
    }
    if (!spot.editable) {
      throw new SpawnEditorError(400, "SPAWN_READ_ONLY", `Spawn ${spotKey} is a static or special placement and is read-only.`);
    }
    return spot;
  }

  private validatePosition(
    map: SpawnEditorMap,
    position: { x: number; y: number; z: number; heading: number },
  ): void {
    requireNumberInRange(position.x, map.coordinateBounds.minX, map.coordinateBounds.maxX, "X");
    requireNumberInRange(position.y, map.coordinateBounds.minY, map.coordinateBounds.maxY, "Y");
    requireNumberInRange(position.z, -10000, 10000, "Z");
    requireIntInRange(position.heading, 0, 120, "Heading");
  }

  private async readMap(mapId: number): Promise<ParsedMap> {
    const definition = this.mapDefinition(mapId);
    const records = await Promise.all(definition.sources.map(async sourceDefinition => {
      try {
        return {
          definition: sourceDefinition,
          source: await readFile(sourceDefinition.absolutePath, "utf8"),
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          throw new SpawnEditorError(
            503,
            "REPOSITORY_UNAVAILABLE",
            `The BeyondAionSharp spawn file is unavailable at ${sourceDefinition.sourceRelativePath}.`,
          );
        }
        throw error;
      }
    }));
    return this.parseMapSources(definition, records);
  }

  private parseMapSources(
    definition: MapDefinition,
    records: Array<{ definition: MapSourceDefinition; source: string }>,
  ): ParsedMap {
    const sources = records.map((record, sourceIndex) =>
      this.parseSource(definition, record.definition, record.source, sourceIndex),
    );
    const groups = sources.flatMap(source => source.groups);
    const spotsByKey = new Map<string, ParsedSpot>();
    for (const group of groups) {
      for (const spot of group.spots) spotsByKey.set(spot.key, spot);
    }
    return {
      definition,
      sources,
      revision: compositeRevision(sources),
      groups,
      spotsByKey,
    };
  }

  private parseSource(
    definition: MapDefinition,
    sourceDefinition: MapSourceDefinition,
    source: string,
    sourceIndex: number,
  ): ParsedSource {
    const document = parseXml(source);
    const root = document.documentElement;
    if (!root || root.tagName !== "spawns") {
      throw new SpawnEditorError(500, "INVALID_SPAWN_XML", "Spawn XML must have a <spawns> document root.");
    }
    const mapElements = directChildElements(root, "spawn_map")
      .filter(element => intAttribute(element, "map_id", 0) === definition.id);
    if (mapElements.length === 0) {
      throw new SpawnEditorError(
        500,
        "MAP_NOT_FOUND_IN_XML",
        `${sourceDefinition.sourceRelativePath} does not contain map ${definition.id}.`,
      );
    }

    const parsedSource: ParsedSource = {
      definition: sourceDefinition,
      sourceIndex,
      source,
      revision: sha256(source),
      newline: source.includes("\r\n") ? "\r\n" : "\n",
      document,
      mapElements,
      groups: [],
    };
    for (const [mapIndex, mapElement] of mapElements.entries()) {
      for (const [groupIndex, element] of directChildElements(mapElement, "spawn").entries()) {
        const npcId = intAttribute(element, "npc_id", 0);
        const comment = previousComment(element);
        const template = this.npcCatalog.templateFor(npcId);
        const npc = template
          ? { ...template, displayName: comment || template.displayName }
          : fallbackNpc(npcId, comment);
        const group: ParsedGroup = {
          key: `g:${sourceIndex}:${mapIndex}:${groupIndex}:${npcId}`,
          index: groupIndex,
          mapIndex,
          element,
          mapElement,
          source: parsedSource,
          npcId,
          respawnTime: intAttribute(element, "respawn_time", 0),
          pool: intAttribute(element, "pool", 0),
          handler: element.getAttribute("handler") || "",
          temporary: directChildElements(element, "temporary_spawn").length > 0,
          editable: true,
          npc,
          spots: [],
        };
        group.editable = !group.handler && !group.temporary;
        parsedSource.groups.push(group);

        for (const [spotIndex, spotElement] of directChildElements(element, "spot").entries()) {
          const key = `s:${sourceIndex}:${mapIndex}:${groupIndex}:${spotIndex}:${npcId}`;
          const staticId = intAttribute(spotElement, "static_id", 0);
          group.spots.push({
            key,
            index: spotIndex,
            element: spotElement,
            group,
            editable: group.editable && staticId === 0,
          });
        }
      }
    }
    return parsedSource;
  }

  private async requireSourceRevisions(parsed: ParsedMap): Promise<void> {
    for (const source of parsed.sources) {
      const currentSource = await readFile(source.definition.absolutePath, "utf8");
      if (sha256(currentSource) !== source.revision) {
        throw new SpawnEditorError(
          409,
          "STALE_REVISION",
          `${source.definition.sourceRelativePath} changed while these edits were being applied. Reload the map before trying again.`,
          { sourceRelativePath: source.definition.sourceRelativePath },
        );
      }
    }
  }

  private snapshotFromParsed(parsed: ParsedMap): SpawnEditorSnapshot {
    const groups = parsed.groups.map(group => ({
      key: group.key,
      npcId: group.npcId,
      npc: group.npc,
      respawnTime: group.respawnTime,
      pool: group.pool,
      handler: group.handler,
      temporary: group.temporary,
      editable: group.editable && group.spots.some(spot => spot.editable),
      spotCount: group.spots.length,
      sourceRelativePath: group.source.definition.sourceRelativePath,
      attributes: attributesOf(group.element),
    }));
    const spots = parsed.groups.flatMap(group => group.spots.map(spot => toSnapshotSpot(spot)));
    return {
      ok: true,
      map: this.publicMap(parsed.definition),
      revision: parsed.revision,
      generatedAt: new Date().toISOString(),
      groupCount: groups.length,
      spotCount: spots.length,
      editableSpotCount: spots.filter(spot => spot.editable).length,
      groups,
      spots,
    };
  }

  private mapDefinition(mapId: number): MapDefinition {
    const definition = this.definitions.get(mapId);
    if (!definition) {
      throw new SpawnEditorError(404, "MAP_NOT_SUPPORTED", `Map ${mapId} is not available in the spawn editor.`);
    }
    return definition;
  }

  private publicMap(definition: MapDefinition): SpawnEditorMap {
    const { sources: _sources, primarySource: _primarySource, ...publicDefinition } = definition;
    return publicDefinition;
  }
}

function loadMapDefinitions(repoRoot: string, manifestPath: string): Map<number, MapDefinition> {
  let manifest: SpawnMapManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SpawnMapManifest;
  } catch (error) {
    throw new Error(`Could not load spawn map manifest at ${manifestPath}: ${String(error)}`);
  }
  if (manifest.version !== 2 || !Array.isArray(manifest.maps) || manifest.maps.length === 0) {
    throw new Error(`Spawn map manifest ${manifestPath} must be version 2 and contain at least one map.`);
  }

  const normalizedRoot = path.resolve(repoRoot);
  const definitions = new Map<number, MapDefinition>();
  for (const entry of manifest.maps) {
    if (!Number.isSafeInteger(entry.mapId) || entry.mapId <= 0 || definitions.has(entry.mapId)) {
      throw new Error(`Spawn map manifest contains an invalid or duplicate map id: ${String(entry.mapId)}.`);
    }
    if (!Number.isFinite(entry.worldSize) || entry.worldSize <= 0) {
      throw new Error(`Spawn map ${entry.mapId} has an invalid world size.`);
    }
    const calibration = entry.calibration;
    if (
      !calibration
      || ![calibration.offsetX, calibration.offsetY, calibration.mapWidth, calibration.mapHeight].every(Number.isFinite)
      || calibration.mapWidth <= 0
      || calibration.mapHeight <= 0
    ) {
      throw new Error(`Spawn map ${entry.mapId} has invalid coordinate calibration.`);
    }
    if (!Array.isArray(entry.sourceRelativePaths) || entry.sourceRelativePaths.length === 0) {
      throw new Error(`Spawn map ${entry.mapId} has no spawn XML sources.`);
    }
    const sources = [...new Set(entry.sourceRelativePaths)].map(sourceRelativePath => {
      const normalizedRelativePath = sourceRelativePath.replaceAll("\\", "/");
      const absolutePath = path.resolve(normalizedRoot, normalizedRelativePath);
      if (absolutePath !== normalizedRoot && !absolutePath.startsWith(`${normalizedRoot}${path.sep}`)) {
        throw new Error(`Spawn map ${entry.mapId} has a source outside the BeyondAionSharp repository.`);
      }
      return { sourceRelativePath: normalizedRelativePath, absolutePath };
    });
    const primarySource = sources.find(source => source.sourceRelativePath === entry.primarySourceRelativePath)
      ?? sources[0];
    const layers = entry.layers?.map(layer => ({
      id: layer.id,
      name: layer.name,
      imageUrl: `/assets/maps/${layer.asset.replaceAll("\\", "/")}`,
      assetKind: layer.assetKind,
    })) ?? [];
    if (layers.length === 0 || layers.some(layer => !layer.id || !layer.name || !layer.imageUrl)) {
      throw new Error(`Spawn map ${entry.mapId} has no valid artwork layers.`);
    }
    const bounds = entry.coordinateBounds;
    if (
      !bounds
      || ![bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].every(Number.isFinite)
      || bounds.minX >= bounds.maxX
      || bounds.minY >= bounds.maxY
    ) {
      throw new Error(`Spawn map ${entry.mapId} has invalid coordinate bounds.`);
    }

    definitions.set(entry.mapId, {
      id: entry.mapId,
      name: entry.name,
      clientName: entry.clientName,
      worldSize: entry.worldSize,
      projection: "calibrated-game-y-x",
      calibration,
      coordinateBounds: bounds,
      layers,
      defaultLayerId: layers[0]!.id,
      imageUrl: layers[0]!.imageUrl,
      sourceRelativePath: primarySource!.sourceRelativePath,
      sourceRelativePaths: sources.map(source => source.sourceRelativePath),
      sources,
      primarySource: primarySource!,
    });
  }
  return definitions;
}

function compositeRevision(sources: ParsedSource[]): string {
  return sha256(sources.map(source => `${source.definition.sourceRelativePath}\0${source.revision}`).join("\0"));
}

function parseXml(source: string): XmlDocument {
  return new DOMParser({
    locator: true,
    onError(level, message) {
      if (level !== "warning") {
        throw new Error(message);
      }
    },
  }).parseFromString(source, "application/xml");
}

function toSnapshotSpot(spot: ParsedSpot): SpawnEditorSpot {
  const element = spot.element;
  const group = spot.group;
  const warnings: string[] = [];
  const staticId = intAttribute(element, "static_id", 0);
  const walkerId = element.getAttribute("walker_id") || "";
  const randomWalk = intAttribute(element, "random_walk", 0);
  const aerial = boolAttribute(element, "aerial_spawn");
  const rawZ = element.getAttribute("z") || "";
  const parsedZ = Number.parseFloat(rawZ);
  if (staticId > 0) warnings.push("Static placement");
  if (group.handler) warnings.push(`Handler: ${group.handler}`);
  if (group.temporary) warnings.push("Temporary spawn");
  if (group.pool > 0) warnings.push(`Pool: ${group.pool}`);
  if (walkerId) warnings.push(`Walker: ${walkerId}`);
  if (randomWalk > 0) warnings.push(`Random walk: ${randomWalk}m`);
  if (aerial) warnings.push("Aerial spawn");
  if (!Number.isFinite(parsedZ)) warnings.push(`Invalid source Z: ${rawZ || "missing"} (shown as 0)`);

  return {
    key: spot.key,
    groupKey: group.key,
    npcId: group.npcId,
    x: floatAttribute(element, "x"),
    y: floatAttribute(element, "y"),
    z: Number.isFinite(parsedZ) ? parsedZ : 0,
    heading: intAttribute(element, "h", 0),
    randomWalk,
    walkerId,
    walkerIndex: optionalIntAttribute(element, "walker_index"),
    staticId,
    aerial,
    ai: element.getAttribute("ai") || "",
    anchor: element.getAttribute("anchor") || "",
    state: intAttribute(element, "state", 0),
    editable: spot.editable,
    sourceRelativePath: group.source.definition.sourceRelativePath,
    warnings,
    attributes: attributesOf(element),
  };
}

function createSpotElement(
  document: XmlDocument,
  position: { x: number; y: number; z: number; heading: number },
): XmlElement {
  const spot = document.createElement("spot");
  setPositionAttributes(spot, position);
  return spot;
}

function setPositionAttributes(
  spot: XmlElement,
  position: { x: number; y: number; z: number; heading: number },
): void {
  spot.setAttribute("x", formatCoordinate(position.x));
  spot.setAttribute("y", formatCoordinate(position.y));
  spot.setAttribute("z", formatCoordinate(position.z));
  spot.setAttribute("h", String(Math.round(position.heading)));
}

function updatePositionAttributes(
  spot: XmlElement,
  position: { x: number; y: number; z: number; heading: number },
): void {
  if (Number.parseFloat(spot.getAttribute("x") || "") !== position.x) {
    spot.setAttribute("x", formatCoordinate(position.x));
  }
  if (Number.parseFloat(spot.getAttribute("y") || "") !== position.y) {
    spot.setAttribute("y", formatCoordinate(position.y));
  }
  if (Number.parseFloat(spot.getAttribute("z") || "") !== position.z) {
    spot.setAttribute("z", formatCoordinate(position.z));
  }
  if (Number.parseInt(spot.getAttribute("h") || "", 10) !== position.heading) {
    spot.setAttribute("h", String(position.heading));
  }
}

function appendSpot(group: XmlElement, spot: XmlElement): void {
  const closingIndent = lastWhitespaceText(group);
  const indentation = group.ownerDocument!.createTextNode("\n\t\t\t");
  if (closingIndent) {
    group.insertBefore(indentation, closingIndent);
    group.insertBefore(spot, closingIndent);
  } else {
    group.appendChild(indentation);
    group.appendChild(spot);
    group.appendChild(group.ownerDocument!.createTextNode("\n\t\t"));
  }
}

function appendSpawnGroup(
  document: XmlDocument,
  map: XmlElement,
  npc: NpcTemplateInfo,
  respawnTime: number,
  position: { x: number; y: number; z: number; heading: number },
): void {
  const spawn = document.createElement("spawn");
  spawn.setAttribute("npc_id", String(npc.id));
  spawn.setAttribute("respawn_time", String(respawnTime));
  spawn.appendChild(document.createTextNode("\n\t\t\t"));
  spawn.appendChild(createSpotElement(document, position));
  spawn.appendChild(document.createTextNode("\n\t\t"));

  const closingIndent = lastWhitespaceText(map);
  const nodes: XmlNode[] = [
    document.createTextNode("\n\t\t"),
    document.createComment(` ${xmlCommentText(npc.displayName)} `),
    document.createTextNode("\n\t\t"),
    spawn,
  ];
  for (const node of nodes) {
    if (closingIndent) map.insertBefore(node, closingIndent);
    else map.appendChild(node);
  }
  if (!closingIndent) map.appendChild(document.createTextNode("\n\t"));
}

function xmlCommentText(value: string): string {
  const sanitized = value.replace(/-{2,}/g, run => run.split("").join(" "));
  return sanitized.endsWith("-") ? `${sanitized} ` : sanitized;
}

function removeNodeWithLeadingWhitespace(parent: XmlElement, node: XmlNode): void {
  const previous = node.previousSibling;
  if (previous?.nodeType === 3 && !previous.nodeValue?.trim()) parent.removeChild(previous);
  parent.removeChild(node);
}

function removeSpawnGroupWithComment(group: XmlElement): void {
  const map = group.parentNode;
  if (!map) return;
  const precedingWhitespace = group.previousSibling;
  const possibleComment = precedingWhitespace?.nodeType === 3 ? precedingWhitespace.previousSibling : undefined;
  const commentWhitespace = possibleComment?.nodeType === 8 ? possibleComment.previousSibling : undefined;
  if (precedingWhitespace?.nodeType === 3 && !precedingWhitespace.nodeValue?.trim()) map.removeChild(precedingWhitespace);
  map.removeChild(group);
  if (possibleComment?.nodeType === 8) {
    map.removeChild(possibleComment);
    if (commentWhitespace?.nodeType === 3 && !commentWhitespace.nodeValue?.trim()) map.removeChild(commentWhitespace);
  }
}

function directChildElements(parent: XmlElement, name: string): XmlElement[] {
  const elements: XmlElement[] = [];
  for (let index = 0; index < parent.childNodes.length; index++) {
    const node = parent.childNodes.item(index);
    if (node?.nodeType === 1 && (node as XmlElement).tagName === name) elements.push(node as XmlElement);
  }
  return elements;
}

function lastWhitespaceText(parent: XmlElement): XmlNode | undefined {
  const last = parent.lastChild;
  return last?.nodeType === 3 && !last.nodeValue?.trim() ? last : undefined;
}

function previousComment(element: XmlElement): string {
  let node = element.previousSibling;
  while (node && node.nodeType === 3 && !node.nodeValue?.trim()) node = node.previousSibling;
  return node?.nodeType === 8 ? node.nodeValue?.trim() || "" : "";
}

function fallbackNpc(npcId: number, comment: string): NpcTemplateInfo {
  const displayName = comment || `NPC ${npcId}`;
  return {
    id: npcId,
    name: comment ? comment.toLocaleLowerCase().replaceAll(" ", "_") : `npc_${npcId}`,
    displayName: comment ? displayName : humanizeNpcName(displayName),
    level: 0,
    type: "NONE",
    rank: "",
    rating: "",
    race: "",
    tribe: "",
    ai: "",
  };
}

function attributesOf(element: XmlElement): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < element.attributes.length; index++) {
    const attribute = element.attributes.item(index);
    if (attribute) result[attribute.name] = attribute.value;
  }
  return result;
}

function intAttribute(element: XmlElement, name: string, fallback: number): number {
  const parsed = Number.parseInt(element.getAttribute(name) || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalIntAttribute(element: XmlElement, name: string): number | undefined {
  const value = element.getAttribute(name);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function floatAttribute(element: XmlElement, name: string): number {
  const parsed = Number.parseFloat(element.getAttribute(name) || "");
  if (!Number.isFinite(parsed)) {
    throw new SpawnEditorError(500, "INVALID_COORDINATE", `<${element.tagName}> has an invalid ${name} coordinate.`);
  }
  return parsed;
}

function boolAttribute(element: XmlElement, name: string): boolean {
  return (element.getAttribute(name) || "").toLocaleLowerCase() === "true";
}

function requireNumberInRange(value: number, minimum: number, maximum: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new SpawnEditorError(400, "INVALID_POSITION", `${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function requireIntInRange(value: number | undefined, minimum: number, maximum: number, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new SpawnEditorError(400, "INVALID_NUMBER", `${label} must be a whole number between ${minimum} and ${maximum}.`);
  }
  return value;
}

function requirePositiveInt(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SpawnEditorError(400, "INVALID_NUMBER", `${label} must be a positive whole number.`);
  }
  return value;
}

function serializeDocument(document: XmlDocument, newline: "\r\n" | "\n"): string {
  const serialized = new XMLSerializer().serializeToString(document);
  const normalized = serialized.replace(/\r\n?/g, "\n");
  return newline === "\r\n" ? normalized.replace(/\n/g, "\r\n") : normalized;
}

function formatCoordinate(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function timestampForFile(): string {
  return new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}
