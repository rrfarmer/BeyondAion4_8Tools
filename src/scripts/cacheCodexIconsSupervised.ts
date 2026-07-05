import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { config } from "../config.js";
import { ItemCatalog } from "../itemCatalog.js";

type Args = {
  startId: number | undefined;
  endId: number | undefined;
  chunkSize: number;
  concurrency: number;
  delayMs: number;
  manifestPath: string | undefined;
  saveEvery: number | undefined;
  nodeMaxOldSpaceSize: number;
  retryDelayMs: number;
  maxRetries: number;
  force: boolean;
  retryMissing: boolean;
  retryFailed: boolean;
};

const args = parseArgs(process.argv.slice(2));
const scraperPath = fileURLToPath(new URL("./cacheCodexIcons.js", import.meta.url));
const itemCatalog = new ItemCatalog(config.aionRepoRoot);
await itemCatalog.load();

if (!itemCatalog.isLoaded || itemCatalog.size === 0) {
  throw new Error("Item catalog did not load any items.");
}

const itemIds = itemCatalog
  .allItemIds()
  .filter(itemId => args.startId == null || itemId >= args.startId)
  .filter(itemId => args.endId == null || itemId <= args.endId);

console.log(`Supervised Codex icon cache run.`);
console.log(`Items=${itemIds.length}, first=${itemIds[0] ?? "none"}, last=${itemIds.at(-1) ?? "none"}`);
console.log(
  `chunkSize=${args.chunkSize}, concurrency=${args.concurrency}, delayMs=${args.delayMs}, childHeapMb=${args.nodeMaxOldSpaceSize}`,
);

for (let index = 0; index < itemIds.length; index += args.chunkSize) {
  const chunk = itemIds.slice(index, index + args.chunkSize);
  const chunkStartId = chunk[0];
  const chunkEndId = chunk.at(-1);
  if (chunkStartId == null || chunkEndId == null) {
    break;
  }

  let attempt = 1;
  while (true) {
    console.log(
      `Starting chunk ${Math.floor(index / args.chunkSize) + 1}/${Math.ceil(itemIds.length / args.chunkSize)}: ` +
        `${chunk.length} item ids, start=${chunkStartId}, end=${chunkEndId}, attempt=${attempt}`,
    );
    const code = await runChild(chunkStartId, chunkEndId, args);
    if (code === 0) {
      break;
    }
    if (attempt >= args.maxRetries) {
      throw new Error(`Chunk ${chunkStartId}-${chunkEndId} failed after ${attempt} attempts. Last exit code: ${code}`);
    }
    attempt += 1;
    console.warn(
      `Chunk ${chunkStartId}-${chunkEndId} exited with code ${code}; retrying in ${args.retryDelayMs} ms. ` +
        "Already-written icon files will be skipped.",
    );
    await delay(args.retryDelayMs);
  }
}

console.log("Supervised Codex icon cache run complete.");

function runChild(startId: number, endId: number, args: Args): Promise<number | null> {
  const childArgs = [
    scraperPath,
    "--start-id",
    String(startId),
    "--end-id",
    String(endId),
    "--concurrency",
    String(args.concurrency),
    "--delay-ms",
    String(args.delayMs),
  ];

  if (args.manifestPath) {
    childArgs.push("--manifest", path.resolve(args.manifestPath));
  }
  if (args.saveEvery != null) {
    childArgs.push("--save-every", String(args.saveEvery));
  }
  if (args.force) {
    childArgs.push("--force");
  }
  if (args.retryMissing) {
    childArgs.push("--retry-missing");
  }
  if (!args.retryFailed) {
    childArgs.push("--no-retry-failed");
  }

  const child = spawn(process.execPath, childArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_OPTIONS: withNodeHeapLimit(process.env.NODE_OPTIONS, args.nodeMaxOldSpaceSize),
    },
    stdio: "inherit",
  });

  return new Promise(resolve => {
    child.once("exit", code => resolve(code));
  });
}

function withNodeHeapLimit(existing: string | undefined, heapMb: number): string {
  const withoutHeapLimit = (existing ?? "")
    .split(/\s+/)
    .filter(value => value && !value.startsWith("--max-old-space-size="))
    .join(" ");
  return [`--max-old-space-size=${heapMb}`, withoutHeapLimit].filter(Boolean).join(" ");
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    startId: undefined,
    endId: undefined,
    chunkSize: 5000,
    concurrency: 1,
    delayMs: 1000,
    manifestPath: undefined,
    saveEvery: undefined,
    nodeMaxOldSpaceSize: 2048,
    retryDelayMs: 30_000,
    maxRetries: 20,
    force: false,
    retryMissing: false,
    retryFailed: true,
  };

  const cleanedArgv = argv.filter(value => value !== "--");
  const hasNamedArgs = cleanedArgv.some(value => value.startsWith("--"));
  if (!hasNamedArgs && cleanedArgv.length > 0) {
    args.startId = cleanedArgv[0] ? parsePositiveInt("start-id", cleanedArgv[0]) : undefined;
    args.chunkSize = cleanedArgv[1] ? parsePositiveInt("chunk-size", cleanedArgv[1]) : args.chunkSize;
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
    if (!name.startsWith("--")) {
      throw new Error(`Unexpected positional argument ${name}. Use named arguments.`);
    }

    const value = cleanedArgv[index + 1];
    if (value == null || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    index += 1;

    switch (name) {
      case "--start-id":
        args.startId = parsePositiveInt(name, value);
        break;
      case "--end-id":
        args.endId = parsePositiveInt(name, value);
        break;
      case "--chunk-size":
        args.chunkSize = parsePositiveInt(name, value);
        break;
      case "--concurrency":
        args.concurrency = parsePositiveInt(name, value);
        break;
      case "--delay-ms":
        args.delayMs = parseNonNegativeInt(name, value);
        break;
      case "--manifest":
        args.manifestPath = value;
        break;
      case "--save-every":
        args.saveEvery = parsePositiveInt(name, value);
        break;
      case "--node-max-old-space-size":
        args.nodeMaxOldSpaceSize = parsePositiveInt(name, value);
        break;
      case "--retry-delay-ms":
        args.retryDelayMs = parseNonNegativeInt(name, value);
        break;
      case "--max-retries":
        args.maxRetries = parsePositiveInt(name, value);
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
