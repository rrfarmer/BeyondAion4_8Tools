import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  DOMParser,
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

export class WalkerRouteService {
  private catalogLoad?: Promise<WalkerCatalog>;
  private readonly repoRoot: string;
  private readonly walkerRoot: string;

  constructor(beyondAionSharpRepoRoot: string) {
    this.repoRoot = path.resolve(beyondAionSharpRepoRoot);
    this.walkerRoot = path.join(this.repoRoot, "game-server", "data", "static_data", "npc_walker");
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

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
