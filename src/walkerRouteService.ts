import { createHash } from "node:crypto";
import { chmod, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DOMParser,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import { SpawnEditorError } from "./spawnEditorService.js";

export type WalkerLoopType = "NONE" | "NORMAL" | "WALK_BACK";

export type WalkerRouteStep = {
  index: number;
  authoredIndex: number;
  synthesized: boolean;
  x: number;
  y: number;
  z: number;
  restTime: number;
};

export type WalkerRoute = {
  id: string;
  revision: string;
  sourceRevision: string;
  sourceRelativePath: string;
  loopType: WalkerLoopType;
  pool: number;
  formation: string;
  rows: number[];
  closesLoop: boolean;
  authoredStepCount: number;
  effectiveStepCount: number;
  authoredSteps: WalkerRouteStep[];
  effectiveSteps: WalkerRouteStep[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  length2d: number;
  length3d: number;
  warnings: string[];
};

export type WalkerRouteInputStep = {
  x: number;
  y: number;
  z: number;
  restTime?: number;
};

export type WalkerRouteChangeRequest = {
  mode: "update" | "create";
  routeId: string;
  revision?: string;
  loopType: WalkerLoopType;
  steps: WalkerRouteInputStep[];
  reason?: string;
};

export type WalkerRouteValidation = {
  ok: true;
  valid: true;
  mode: WalkerRouteChangeRequest["mode"];
  routeId: string;
  sourceRelativePath: string;
  previousRevision?: string;
  sourceRevision: string;
  stepCount: number;
  loopType: WalkerLoopType;
  length2d: number;
  length3d: number;
  warnings: string[];
};

export type WalkerRouteApplyResult = WalkerRouteValidation & {
  persisted: true;
  backupRelativePath: string;
  route: WalkerRoute;
};

type WalkerSource = {
  absolutePath: string;
  relativePath: string;
  source: string;
  revision: string;
};

type WalkerCatalog = {
  routes: Map<string, WalkerRoute>;
  duplicateIds: Set<string>;
};

type PreparedWalkerChange = {
  request: WalkerRouteChangeRequest;
  source: WalkerSource;
  proposedSource: string;
  validation: WalkerRouteValidation;
};

export class WalkerRouteService {
  private catalogLoad?: Promise<WalkerCatalog>;
  private applyQueue: Promise<void> = Promise.resolve();
  private readonly repoRoot: string;
  private readonly walkerRoot: string;
  private readonly dataDir?: string;

  constructor(beyondAionSharpRepoRoot: string, dataDir?: string) {
    this.repoRoot = path.resolve(beyondAionSharpRepoRoot);
    this.walkerRoot = path.join(this.repoRoot, "game-server", "data", "static_data", "npc_walker");
    this.dataDir = dataDir ? path.resolve(dataDir) : undefined;
  }

  async isReady(): Promise<boolean> {
    try {
      return (await this.catalog()).routes.size > 0;
    } catch {
      return false;
    }
  }

  async size(): Promise<number> {
    return (await this.catalog()).routes.size;
  }

  async route(routeId: string): Promise<WalkerRoute> {
    const normalizedId = routeId.trim();
    if (!normalizedId) {
      throw new SpawnEditorError(400, "INVALID_WALKER_ID", "Walker route id is required.");
    }
    const route = (await this.catalog()).routes.get(normalizedId);
    if (!route) {
      throw new SpawnEditorError(404, "WALKER_NOT_FOUND", `Walker route ${normalizedId} was not found.`);
    }
    return route;
  }

  refresh(): void {
    this.catalogLoad = undefined;
  }

  async validate(request: WalkerRouteChangeRequest): Promise<WalkerRouteValidation> {
    return (await this.prepareChange(request)).validation;
  }

  async apply(request: WalkerRouteChangeRequest): Promise<WalkerRouteApplyResult> {
    let releaseQueue!: () => void;
    const previous = this.applyQueue;
    this.applyQueue = new Promise<void>(resolve => {
      releaseQueue = resolve;
    });
    await previous;
    try {
      return await this.applyExclusive(request);
    } finally {
      releaseQueue();
    }
  }

  private async applyExclusive(request: WalkerRouteChangeRequest): Promise<WalkerRouteApplyResult> {
    if (!this.dataDir) {
      throw new SpawnEditorError(500, "WALKER_EDITOR_NOT_CONFIGURED", "Walker editor backup storage is not configured.");
    }
    const prepared = await this.prepareChange(request);
    await this.requireSourceRevision(prepared.source);
    const backupDir = path.join(this.dataDir, "walker-editor-backups");
    await mkdir(backupDir, { recursive: true });
    const sourceMode = (await stat(prepared.source.absolutePath)).mode & 0o777;
    const routeLabel = prepared.request.routeId.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80);
    const backupPath = path.join(
      backupDir,
      `${timestampForFile()}-${routeLabel}-${prepared.source.revision.slice(0, 12)}.xml`,
    );
    const temporaryPath = `${prepared.source.absolutePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(backupPath, prepared.source.source, "utf8");
      await writeFile(temporaryPath, prepared.proposedSource, "utf8");
      await chmod(temporaryPath, sourceMode);
      verifyProposedRoute(prepared.proposedSource, prepared.source.relativePath, prepared.request);
      await this.requireSourceRevision(prepared.source);
      await rename(temporaryPath, prepared.source.absolutePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }

    this.refresh();
    const route = await this.route(prepared.request.routeId);
    return {
      ...prepared.validation,
      persisted: true,
      backupRelativePath: path.relative(this.dataDir, backupPath).replaceAll("\\", "/"),
      route,
    };
  }

  private async prepareChange(rawRequest: WalkerRouteChangeRequest): Promise<PreparedWalkerChange> {
    const request = normalizeChangeRequest(rawRequest);
    this.refresh();
    const catalog = await this.catalog();
    let source: WalkerSource;
    let proposedSource: string;
    let previousRevision: string | undefined;

    if (request.mode === "update") {
      const existing = catalog.routes.get(request.routeId);
      if (!existing) {
        throw new SpawnEditorError(404, "WALKER_NOT_FOUND", `Walker route ${request.routeId} was not found.`);
      }
      if (!request.revision || request.revision !== existing.revision) {
        throw new SpawnEditorError(
          409,
          "STALE_WALKER_REVISION",
          "The walker route changed after it was loaded. Reload the route before applying changes.",
          { expectedRevision: existing.revision },
        );
      }
      source = await this.readSource(path.resolve(this.repoRoot, existing.sourceRelativePath));
      if (source.revision !== existing.sourceRevision) {
        throw new SpawnEditorError(409, "STALE_WALKER_REVISION", "The walker XML changed while it was being loaded.");
      }
      previousRevision = existing.revision;
      proposedSource = replaceRouteSource(source, request);
    } else {
      if (catalog.routes.has(request.routeId)) {
        throw new SpawnEditorError(409, "WALKER_ID_EXISTS", `Walker route ${request.routeId} already exists.`);
      }
      const absolutePath = path.join(this.walkerRoot, "custom_npc_walker.xml");
      source = await this.readSource(absolutePath);
      proposedSource = appendRouteSource(source, request);
    }

    const proposedRoute = verifyProposedRoute(proposedSource, source.relativePath, request);
    return {
      request,
      source,
      proposedSource,
      validation: {
        ok: true,
        valid: true,
        mode: request.mode,
        routeId: request.routeId,
        sourceRelativePath: source.relativePath,
        previousRevision,
        sourceRevision: source.revision,
        stepCount: proposedRoute.authoredStepCount,
        loopType: proposedRoute.loopType,
        length2d: proposedRoute.length2d,
        length3d: proposedRoute.length3d,
        warnings: proposedRoute.warnings,
      },
    };
  }

  private async requireSourceRevision(source: WalkerSource): Promise<void> {
    const current = await readFile(source.absolutePath, "utf8");
    if (sha256(current) !== source.revision) {
      throw new SpawnEditorError(
        409,
        "STALE_WALKER_REVISION",
        `${source.relativePath} changed while the route was being applied. Reload before trying again.`,
      );
    }
  }

  private catalog(): Promise<WalkerCatalog> {
    this.catalogLoad ??= this.loadCatalog().catch(error => {
      this.catalogLoad = undefined;
      throw error;
    });
    return this.catalogLoad;
  }

  private async loadCatalog(): Promise<WalkerCatalog> {
    let files: string[];
    try {
      files = (await listXmlFiles(this.walkerRoot)).sort(compareOrdinal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new SpawnEditorError(
          503,
          "WALKER_REPOSITORY_UNAVAILABLE",
          "The BeyondAionSharp npc_walker directory is unavailable.",
        );
      }
      throw error;
    }
    if (files.length === 0) {
      throw new SpawnEditorError(503, "WALKER_REPOSITORY_UNAVAILABLE", "No walker XML files were found.");
    }

    const routes = new Map<string, WalkerRoute>();
    const duplicateIds = new Set<string>();
    for (const absolutePath of files) {
      const source = await this.readSource(absolutePath);
      const document = parseXml(source.source, source.relativePath);
      const root = document.documentElement;
      if (!root || root.tagName !== "npc_walker") {
        throw new SpawnEditorError(
          500,
          "INVALID_WALKER_XML",
          `${source.relativePath} must have an <npc_walker> document root.`,
        );
      }
      for (const element of directChildElements(root, "walker_template")) {
        const route = parseRoute(element, source);
        if (routes.has(route.id)) {
          duplicateIds.add(route.id);
          continue;
        }
        routes.set(route.id, route);
      }
    }
    for (const routeId of duplicateIds) {
      routes.get(routeId)?.warnings.push("Duplicate route id exists; the first source in server load order is shown.");
    }
    return { routes, duplicateIds };
  }

  private async readSource(absolutePath: string): Promise<WalkerSource> {
    const source = await readFile(absolutePath, "utf8");
    return {
      absolutePath,
      relativePath: path.relative(this.repoRoot, absolutePath).replaceAll("\\", "/"),
      source,
      revision: sha256(source),
    };
  }
}

function parseRoute(element: XmlElement, source: WalkerSource): WalkerRoute {
  const id = element.getAttribute("route_id")?.trim() || "";
  if (!id) {
    throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${source.relativePath} contains a route without route_id.`);
  }
  const loopType = walkerLoopType(element.getAttribute("loop_type"), id, source.relativePath);
  const pool = positiveIntAttribute(element, "pool", 1, id, source.relativePath);
  let formation = element.getAttribute("formation")?.trim() || "POINT";
  let rows = parseRows(element.getAttribute("rows"), id, source.relativePath);
  if (pool === 2) {
    formation = "SQUARE";
    rows = [2];
  } else if (formation === "SQUARE" && !element.getAttribute("rows")) {
    formation = "POINT";
    rows = [];
  }
  const authoredSteps = directChildElements(element, "routestep").map((step, stepIndex) => ({
    index: stepIndex + 1,
    authoredIndex: stepIndex + 1,
    synthesized: false,
    x: finiteFloatAttribute(step, "x", id, source.relativePath),
    y: finiteFloatAttribute(step, "y", id, source.relativePath),
    z: finiteFloatAttribute(step, "z", id, source.relativePath),
    restTime: nonNegativeIntAttribute(step, "rest_time", 0, id, source.relativePath),
  }));
  const effectiveSteps = effectiveRouteSteps(authoredSteps, loopType);
  const closesLoop = loopType !== "NONE" && effectiveSteps.length > 1;
  const warnings: string[] = [];
  if (authoredSteps.length < 2) warnings.push("Route has fewer than two authored waypoints.");
  if (pool > 1) warnings.push(`Route is a ${pool}-member formation centerline.`);
  const bounds = routeBounds(authoredSteps);
  const lengths = routeLengths(effectiveSteps, closesLoop);
  return {
    id,
    revision: sha256(`${source.relativePath}\0${source.revision}\0${id}`),
    sourceRevision: source.revision,
    sourceRelativePath: source.relativePath,
    loopType,
    pool,
    formation,
    rows,
    closesLoop,
    authoredStepCount: authoredSteps.length,
    effectiveStepCount: effectiveSteps.length,
    authoredSteps,
    effectiveSteps,
    bounds,
    length2d: round(lengths.length2d, 3),
    length3d: round(lengths.length3d, 3),
    warnings,
  };
}

function normalizeChangeRequest(request: WalkerRouteChangeRequest): WalkerRouteChangeRequest {
  if (!request || typeof request !== "object") {
    throw new SpawnEditorError(400, "INVALID_WALKER_CHANGE", "A walker route change is required.");
  }
  if (request.mode !== "update" && request.mode !== "create") {
    throw new SpawnEditorError(400, "INVALID_WALKER_CHANGE", "Walker change mode must be update or create.");
  }
  const routeId = typeof request.routeId === "string" ? request.routeId.trim() : "";
  if (!routeId || routeId.length > 256 || !/^[A-Za-z0-9_.:-]+$/.test(routeId)) {
    throw new SpawnEditorError(400, "INVALID_WALKER_ID", "Walker route id contains unsupported characters.");
  }
  const loopType = walkerLoopType(String(request.loopType || ""), routeId, "change request");
  if (!Array.isArray(request.steps) || request.steps.length < 2) {
    throw new SpawnEditorError(400, "TOO_FEW_WALKER_STEPS", "A walker route requires at least two waypoints.");
  }
  if (request.steps.length > 2000) {
    throw new SpawnEditorError(400, "TOO_MANY_WALKER_STEPS", "A walker route is limited to 2,000 waypoints.");
  }
  const steps = request.steps.map((step, index) => {
    if (!step || typeof step !== "object") {
      throw new SpawnEditorError(400, "INVALID_WALKER_STEP", `Waypoint ${index + 1} is invalid.`);
    }
    const x = requireFiniteRange(step.x, 0, 100000, `Waypoint ${index + 1} X`);
    const y = requireFiniteRange(step.y, 0, 100000, `Waypoint ${index + 1} Y`);
    const z = requireFiniteRange(step.z, -10000, 10000, `Waypoint ${index + 1} Z`);
    const restTime = step.restTime ?? 0;
    if (!Number.isInteger(restTime) || restTime < 0 || restTime > 86400000) {
      throw new SpawnEditorError(
        400,
        "INVALID_WALKER_STEP",
        `Waypoint ${index + 1} rest time must be a whole number from 0 to 86400000 milliseconds.`,
      );
    }
    return { x: round(x, 5), y: round(y, 5), z: round(z, 5), restTime };
  });
  return {
    mode: request.mode,
    routeId,
    revision: typeof request.revision === "string" ? request.revision : undefined,
    loopType,
    steps,
    reason: typeof request.reason === "string" ? request.reason : undefined,
  };
}

function replaceRouteSource(source: WalkerSource, request: WalkerRouteChangeRequest): string {
  const document = parseXml(source.source, source.relativePath);
  const route = findRouteElement(document, request.routeId);
  if (!route) {
    throw new SpawnEditorError(409, "STALE_WALKER_REVISION", `Walker route ${request.routeId} moved or was removed.`);
  }
  writeRouteElement(route, request);
  const newline = source.source.includes("\r\n") ? "\r\n" : "\n";
  const replacement = new XMLSerializer().serializeToString(route).replace(/\r\n?/g, "\n").replace(/\n/g, newline);
  const range = findRouteRange(source.source, request.routeId);
  return `${source.source.slice(0, range.start)}${replacement}${source.source.slice(range.end)}`;
}

function appendRouteSource(source: WalkerSource, request: WalkerRouteChangeRequest): string {
  const document = parseXml(source.source, source.relativePath);
  const root = document.documentElement;
  if (!root || root.tagName !== "npc_walker") {
    throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${source.relativePath} must have an <npc_walker> root.`);
  }
  const route = document.createElement("walker_template");
  route.setAttribute("route_id", request.routeId);
  writeRouteElement(route, request);
  const newline = source.source.includes("\r\n") ? "\r\n" : "\n";
  const serialized = new XMLSerializer().serializeToString(route).replace(/\r\n?/g, "\n").replace(/\n/g, newline);
  const closingIndex = source.source.lastIndexOf("</npc_walker>");
  if (closingIndex < 0) {
    throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${source.relativePath} has no closing </npc_walker> tag.`);
  }
  const beforeClosing = source.source.slice(0, closingIndex);
  const separator = beforeClosing.endsWith(newline) ? "" : newline;
  return `${beforeClosing}${separator}\t${serialized}${newline}${source.source.slice(closingIndex)}`;
}

function writeRouteElement(route: XmlElement, request: WalkerRouteChangeRequest): void {
  if (request.loopType === "NORMAL") route.removeAttribute("loop_type");
  else route.setAttribute("loop_type", request.loopType);
  while (route.firstChild) route.removeChild(route.firstChild);
  const document = route.ownerDocument!;
  for (const step of request.steps) {
    route.appendChild(document.createTextNode("\n\t\t"));
    const element = document.createElement("routestep");
    element.setAttribute("x", formatWalkerCoordinate(step.x));
    element.setAttribute("y", formatWalkerCoordinate(step.y));
    element.setAttribute("z", formatWalkerCoordinate(step.z));
    if ((step.restTime ?? 0) > 0) element.setAttribute("rest_time", String(step.restTime));
    route.appendChild(element);
  }
  route.appendChild(document.createTextNode("\n\t"));
}

function verifyProposedRoute(
  proposedSource: string,
  sourceRelativePath: string,
  request: WalkerRouteChangeRequest,
): WalkerRoute {
  const document = parseXml(proposedSource, sourceRelativePath);
  const root = document.documentElement;
  if (!root || root.tagName !== "npc_walker") {
    throw new SpawnEditorError(500, "WALKER_WRITE_VERIFICATION_FAILED", "Serialized walker XML has an invalid root.");
  }
  const matches = directChildElements(root, "walker_template")
    .filter(element => element.getAttribute("route_id") === request.routeId);
  if (matches.length !== 1) {
    throw new SpawnEditorError(
      500,
      "WALKER_WRITE_VERIFICATION_FAILED",
      `Serialized walker XML contains ${matches.length} copies of route ${request.routeId}.`,
    );
  }
  const source: WalkerSource = {
    absolutePath: "",
    relativePath: sourceRelativePath,
    source: proposedSource,
    revision: sha256(proposedSource),
  };
  const route = parseRoute(matches[0]!, source);
  if (route.loopType !== request.loopType || route.authoredStepCount !== request.steps.length) {
    throw new SpawnEditorError(500, "WALKER_WRITE_VERIFICATION_FAILED", "Serialized route metadata did not match the change.");
  }
  for (const [index, expected] of request.steps.entries()) {
    const actual = route.authoredSteps[index];
    if (
      !actual
      || actual.x !== expected.x
      || actual.y !== expected.y
      || actual.z !== expected.z
      || actual.restTime !== (expected.restTime ?? 0)
    ) {
      throw new SpawnEditorError(
        500,
        "WALKER_WRITE_VERIFICATION_FAILED",
        `Serialized waypoint ${index + 1} did not match the validated change.`,
      );
    }
  }
  return route;
}

function findRouteElement(document: XmlDocument, routeId: string): XmlElement | undefined {
  const root = document.documentElement;
  if (!root) return undefined;
  return directChildElements(root, "walker_template")
    .find(element => element.getAttribute("route_id") === routeId);
}

function findRouteRange(source: string, routeId: string): { start: number; end: number } {
  const opening = /<walker_template\b[^>]*\broute_id\s*=\s*(["'])([^"']+)\1[^>]*>/g;
  for (const match of source.matchAll(opening)) {
    if (match[2] !== routeId || match.index === undefined) continue;
    const closingTag = "</walker_template>";
    const closing = source.indexOf(closingTag, match.index + match[0].length);
    if (closing < 0) break;
    return { start: match.index, end: closing + closingTag.length };
  }
  throw new SpawnEditorError(409, "STALE_WALKER_REVISION", `Could not locate route ${routeId} in its source XML.`);
}

function effectiveRouteSteps(authored: WalkerRouteStep[], loopType: WalkerLoopType): WalkerRouteStep[] {
  const effective = authored.map(step => ({ ...step }));
  if (loopType === "WALK_BACK") {
    for (let index = authored.length - 2; index > 0; index--) {
      const step = authored[index]!;
      effective.push({
        ...step,
        index: effective.length + 1,
        synthesized: true,
      });
    }
  }
  return effective.map((step, index) => ({ ...step, index: index + 1 }));
}

function routeBounds(steps: WalkerRouteStep[]): WalkerRoute["bounds"] {
  if (steps.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  }
  return {
    minX: Math.min(...steps.map(step => step.x)),
    maxX: Math.max(...steps.map(step => step.x)),
    minY: Math.min(...steps.map(step => step.y)),
    maxY: Math.max(...steps.map(step => step.y)),
    minZ: Math.min(...steps.map(step => step.z)),
    maxZ: Math.max(...steps.map(step => step.z)),
  };
}

function routeLengths(steps: WalkerRouteStep[], closesLoop: boolean): { length2d: number; length3d: number } {
  let length2d = 0;
  let length3d = 0;
  const segmentCount = steps.length > 1 ? steps.length - 1 + (closesLoop ? 1 : 0) : 0;
  for (let index = 0; index < segmentCount; index++) {
    const from = steps[index % steps.length]!;
    const to = steps[(index + 1) % steps.length]!;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const horizontal = Math.hypot(dx, dy);
    length2d += horizontal;
    length3d += Math.hypot(horizontal, dz);
  }
  return { length2d, length3d };
}

async function listXmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listXmlFiles(absolutePath));
    else if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith(".xml")) files.push(absolutePath);
  }
  return files;
}

function parseXml(source: string, sourceRelativePath: string): XmlDocument {
  return new DOMParser({
    locator: true,
    onError(level, message) {
      if (level !== "warning") {
        throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${sourceRelativePath}: ${message}`);
      }
    },
  }).parseFromString(source, "application/xml");
}

function directChildElements(parent: XmlElement, name: string): XmlElement[] {
  const elements: XmlElement[] = [];
  for (let index = 0; index < parent.childNodes.length; index++) {
    const node = parent.childNodes.item(index);
    if (node?.nodeType === 1 && (node as XmlElement).tagName === name) elements.push(node as XmlElement);
  }
  return elements;
}

function walkerLoopType(raw: string | null, routeId: string, source: string): WalkerLoopType {
  const value = raw?.trim() || "NORMAL";
  if (value === "NONE" || value === "NORMAL" || value === "WALK_BACK") return value;
  throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${source} route ${routeId} has invalid loop_type ${value}.`);
}

function parseRows(raw: string | null, routeId: string, source: string): number[] {
  if (!raw?.trim()) return [];
  const values = raw.split(",");
  // The legacy Java loader's String.split drops trailing empty values (for example rows="1,").
  while (values.length > 0 && !values.at(-1)?.trim()) values.pop();
  return values.map(value => {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${source} route ${routeId} has invalid rows.`);
    }
    return parsed;
  });
}

function finiteFloatAttribute(element: XmlElement, name: string, routeId: string, source: string): number {
  const value = Number(element.getAttribute(name));
  if (!Number.isFinite(value) || element.getAttribute(name) === null) {
    throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${source} route ${routeId} has an invalid ${name} waypoint.`);
  }
  return value;
}

function positiveIntAttribute(
  element: XmlElement,
  name: string,
  fallback: number,
  routeId: string,
  source: string,
): number {
  const raw = element.getAttribute(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${source} route ${routeId} has invalid ${name}.`);
  }
  return value;
}

function nonNegativeIntAttribute(
  element: XmlElement,
  name: string,
  fallback: number,
  routeId: string,
  source: string,
): number {
  const raw = element.getAttribute(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new SpawnEditorError(500, "INVALID_WALKER_XML", `${source} route ${routeId} has invalid ${name}.`);
  }
  return value;
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function requireFiniteRange(value: number, minimum: number, maximum: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new SpawnEditorError(400, "INVALID_WALKER_STEP", `${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function formatWalkerCoordinate(value: number): string {
  return String(round(value, 5));
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function timestampForFile(): string {
  return new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}
