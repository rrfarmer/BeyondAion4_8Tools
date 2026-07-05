import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { ItemCatalog } from "../itemCatalog.js";

const FETCH_TIMEOUT_MS = 10_000;
const codexBaseUrl = (process.env.AION_CODEX_BASE_URL?.trim() || "https://aioncodex.com/us").replace(/\/+$/, "");

type Args = {
  limit: number | undefined;
  startId: number | undefined;
  endId: number | undefined;
  concurrency: number;
  delayMs: number;
  manifestPath: string;
  saveEvery: number;
  force: boolean;
  retryMissing: boolean;
  retryFailed: boolean;
};

const args = parseArgs(process.argv.slice(2));
const itemCatalog = new ItemCatalog(config.aionRepoRoot);
await itemCatalog.load();

if (!itemCatalog.isLoaded || itemCatalog.size === 0) {
  throw new Error("Item catalog did not load any items.");
}

const itemIds = itemCatalog
  .allItemIds()
  .filter(itemId => args.startId == null || itemId >= args.startId)
  .filter(itemId => args.endId == null || itemId <= args.endId)
  .slice(0, args.limit);

const manifest = await loadManifest(args.manifestPath);
let nextIndex = 0;
let ok = 0;
let cached = 0;
let missing = 0;
let failed = 0;
let skipped = 0;
let processedSinceSave = 0;
const startedAt = Date.now();

console.log(
  `Caching icons for ${itemIds.length} item ids from ${codexBaseUrl} into ${config.iconDir}`,
);
console.log(`First item id=${itemIds[0] ?? "none"}, last item id=${itemIds.at(-1) ?? "none"}`);
console.log(`Concurrency=${args.concurrency}, delayMs=${args.delayMs}`);
console.log(`Manifest=${args.manifestPath}`);

await Promise.all(
  Array.from({ length: args.concurrency }, async (_unused, workerIndex) => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const itemId = itemIds[index];
      if (itemId == null) {
        return;
      }

      try {
        const result = await fetchAndCacheCodexIcon(itemId, manifest, args);
        if (result.status === "cached") {
          cached += 1;
        } else if (result.status === "fetched") {
          ok += 1;
        } else if (result.status === "missing") {
          missing += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        setManifestEntry(manifest, itemId, {
          status: "failed",
          itemId,
          itemName: itemCatalog.nameFor(itemId),
          codexPageUrl: `${codexBaseUrl}/item/${itemId}/`,
          updatedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
        console.warn(`Worker ${workerIndex} failed for item ${itemId}:`, error);
      }

      processedSinceSave += 1;
      if (processedSinceSave >= args.saveEvery) {
        processedSinceSave = 0;
        await saveManifest(args.manifestPath, manifest);
      }

      const completed = ok + cached + missing + failed + skipped;
      if (completed === 1 || completed % 25 === 0 || completed === itemIds.length) {
        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(
          `Progress ${completed}/${itemIds.length} fetched=${ok} cached=${cached} missing=${missing} failed=${failed} skipped=${skipped} elapsed=${elapsedSeconds}s`,
        );
      }

      if (args.delayMs > 0) {
        await delay(args.delayMs);
      }
    }
  }),
);

await saveManifest(args.manifestPath, manifest);
console.log(`Done. fetched=${ok} cached=${cached} missing=${missing} failed=${failed} skipped=${skipped}`);

type ManifestEntryStatus = "cached" | "fetched" | "missing" | "failed";

type ManifestEntry = {
  itemId: number;
  itemName?: string;
  status: ManifestEntryStatus;
  codexPageUrl: string;
  remoteIconPath?: string;
  iconUrl?: string;
  cachedPath?: string;
  contentType?: string;
  bytes?: number;
  updatedAt: string;
  error?: string;
};

type IconManifest = {
  version: 1;
  codexBaseUrl: string;
  iconDir: string;
  generatedAt: string;
  updatedAt: string;
  entries: Record<string, ManifestEntry>;
};

type CacheResult = {
  status: "cached" | "fetched" | "missing" | "skipped";
};

async function fetchAndCacheCodexIcon(
  itemId: number,
  manifest: IconManifest,
  args: Args,
): Promise<CacheResult> {
  const iconPath = path.join(config.iconDir, `${itemId}.png`);
  const codexPageUrl = `${codexBaseUrl}/item/${itemId}/`;

  if (!args.force && (await hasExistingIcon(iconPath))) {
    setManifestEntry(manifest, itemId, {
      status: "cached",
      itemId,
      itemName: itemCatalog.nameFor(itemId),
      codexPageUrl,
      cachedPath: iconPath,
      updatedAt: new Date().toISOString(),
    });
    return { status: "cached" };
  }

  const existing = manifest.entries[String(itemId)];
  if (
    existing &&
    !args.force &&
    ((existing.status === "missing" && !args.retryMissing) || (existing.status === "failed" && !args.retryFailed))
  ) {
    return { status: "skipped" };
  }

  const page = await fetch(codexPageUrl, {
    headers: { "user-agent": "aion-portal-icon-cache/0.1" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!page.ok) {
    setManifestEntry(manifest, itemId, {
      status: "missing",
      itemId,
      itemName: itemCatalog.nameFor(itemId),
      codexPageUrl,
      updatedAt: new Date().toISOString(),
      error: `Codex page returned HTTP ${page.status}`,
    });
    return { status: "missing" };
  }

  const html = await page.text();
  const iconPathMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*\bitem_icon\b[^"]*"/i);
  const remoteIconPath = iconPathMatch?.[1];
  if (!remoteIconPath) {
    setManifestEntry(manifest, itemId, {
      status: "missing",
      itemId,
      itemName: itemCatalog.nameFor(itemId),
      codexPageUrl,
      updatedAt: new Date().toISOString(),
      error: "No item_icon image was found on the Codex item page.",
    });
    return { status: "missing" };
  }

  const iconUrl = remoteIconPath.startsWith("http")
    ? remoteIconPath
    : `${new URL(codexBaseUrl).origin}${remoteIconPath.startsWith("/") ? "" : "/"}${remoteIconPath}`;
  const icon = await fetch(iconUrl, {
    headers: { "user-agent": "aion-portal-icon-cache/0.1" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!icon.ok) {
    setManifestEntry(manifest, itemId, {
      status: "missing",
      itemId,
      itemName: itemCatalog.nameFor(itemId),
      codexPageUrl,
      remoteIconPath,
      iconUrl,
      updatedAt: new Date().toISOString(),
      error: `Codex icon returned HTTP ${icon.status}`,
    });
    return { status: "missing" };
  }

  const contentType = icon.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    setManifestEntry(manifest, itemId, {
      status: "missing",
      itemId,
      itemName: itemCatalog.nameFor(itemId),
      codexPageUrl,
      remoteIconPath,
      iconUrl,
      contentType,
      updatedAt: new Date().toISOString(),
      error: "Codex icon response was not an image.",
    });
    return { status: "missing" };
  }

  const arrayBuffer = await icon.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  await mkdir(config.iconDir, { recursive: true });
  await writeFile(iconPath, body);
  setManifestEntry(manifest, itemId, {
    status: "fetched",
    itemId,
    itemName: itemCatalog.nameFor(itemId),
    codexPageUrl,
    remoteIconPath,
    iconUrl,
    cachedPath: iconPath,
    contentType,
    bytes: body.length,
    updatedAt: new Date().toISOString(),
  });
  return { status: "fetched" };
}

async function hasExistingIcon(iconPath: string): Promise<boolean> {
  try {
    const existing = await readFile(iconPath);
    return existing.length > 0;
  } catch {
    return false;
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    limit: undefined,
    startId: undefined,
    endId: undefined,
    concurrency: 1,
    delayMs: 500,
    manifestPath: path.join(config.dataDir, "icon-cache-manifest.json"),
    saveEvery: 25,
    force: false,
    retryMissing: false,
    retryFailed: true,
  };

  const cleanedArgv = argv.filter(value => value !== "--");
  const hasNamedArgs = cleanedArgv.some(value => value.startsWith("--"));
  if (!hasNamedArgs && cleanedArgv.length > 0) {
    args.startId = cleanedArgv[0] ? parsePositiveInt("start-id", cleanedArgv[0]) : undefined;
    args.limit = cleanedArgv[1] ? parsePositiveInt("limit", cleanedArgv[1]) : undefined;
    args.concurrency = cleanedArgv[2] ? parsePositiveInt("concurrency", cleanedArgv[2]) : args.concurrency;
    args.delayMs = cleanedArgv[3] ? parseNonNegativeInt("delay-ms", cleanedArgv[3]) : args.delayMs;
    return args;
  }

  for (let index = 0; index < cleanedArgv.length; index += 1) {
    const name = cleanedArgv[index];
    if (name === "--force") {
      args.force = true;
      continue;
    }
    if (name === "--retry-missing") {
      args.retryMissing = true;
      continue;
    }
    if (name === "--no-retry-failed") {
      args.retryFailed = false;
      continue;
    }
    const value = cleanedArgv[index + 1];
    if (!name.startsWith("--")) {
      continue;
    }
    if (value == null || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    index += 1;

    switch (name) {
      case "--limit":
        args.limit = parsePositiveInt(name, value);
        break;
      case "--start-id":
        args.startId = parsePositiveInt(name, value);
        break;
      case "--end-id":
        args.endId = parsePositiveInt(name, value);
        break;
      case "--concurrency":
        args.concurrency = parsePositiveInt(name, value);
        break;
      case "--delay-ms":
        args.delayMs = parseNonNegativeInt(name, value);
        break;
      case "--manifest":
        args.manifestPath = path.resolve(value);
        break;
      case "--save-every":
        args.saveEvery = parsePositiveInt(name, value);
        break;
      default:
        throw new Error(`Unknown argument ${name}.`);
    }
  }

  return args;
}

function parsePositiveInt(name: string, value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function parseNonNegativeInt(name: string, value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return parsed;
}

async function delay(ms: number): Promise<void> {
  await new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function loadManifest(manifestPath: string): Promise<IconManifest> {
  try {
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as IconManifest;
    return {
      version: 1,
      codexBaseUrl,
      iconDir: config.iconDir,
      generatedAt: parsed.generatedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
    };
  } catch {
    const now = new Date().toISOString();
    return {
      version: 1,
      codexBaseUrl,
      iconDir: config.iconDir,
      generatedAt: now,
      updatedAt: now,
      entries: {},
    };
  }
}

function setManifestEntry(manifest: IconManifest, itemId: number, entry: ManifestEntry): void {
  manifest.entries[String(itemId)] = entry;
  manifest.updatedAt = new Date().toISOString();
}

async function saveManifest(manifestPath: string, manifest: IconManifest): Promise<void> {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const tempPath = `${manifestPath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  const nextManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(tempPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  await rename(tempPath, manifestPath);
}
