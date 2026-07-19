import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { NpcCatalog } from "../npcCatalog.js";
import { SpawnEditorService } from "../spawnEditorService.js";
import { TerrainHeightService } from "../terrainHeightService.js";
import {
  DEFAULT_WALKER_GROUND_TOLERANCE_METERS,
  WalkerGroundAuditService,
  type WalkerGroundAuditReport,
} from "../walkerGroundAuditService.js";
import { WalkerRouteService } from "../walkerRouteService.js";

type Args = {
  toleranceMeters: number;
  json: boolean;
  outputPath: string | undefined;
  help: boolean;
};

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
} else {
  const npcCatalog = new NpcCatalog(config.beyondAionSharpRepoRoot);
  await npcCatalog.load();
  const spawnEditor = new SpawnEditorService(
    config.beyondAionSharpRepoRoot,
    config.dataDir,
    npcCatalog,
    config.spawnMapManifestPath,
  );
  const audit = new WalkerGroundAuditService(
    spawnEditor,
    new WalkerRouteService(config.beyondAionSharpRepoRoot),
    new TerrainHeightService(config.beyondAionSharpRepoRoot),
  );
  const report = await audit.scan(args.toleranceMeters);

  if (args.outputPath) {
    const outputPath = path.resolve(args.outputPath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    if (!args.json) console.log(`Wrote ${outputPath}`);
  }

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
}

function printReport(report: WalkerGroundAuditReport): void {
  console.log("Walker ground audit");
  console.log(`Tolerance: ${formatNumber(report.toleranceMeters)}m`);
  console.log(
    `Scanned ${report.auditedPathCount.toLocaleString()} map-specific paths `
      + `(${report.distinctRouteCount.toLocaleString()} route ids, ${report.checkedPointCount.toLocaleString()} checked points).`,
  );
  console.log(
    `Flagged ${report.offGroundPathCount.toLocaleString()} paths with `
      + `${report.offGroundPointCount.toLocaleString()} off-ground points.`,
  );
  if (report.unavailablePointCount > 0) {
    console.log(
      `Could not check ${report.unavailablePointCount.toLocaleString()} points across `
        + `${report.terrainGaps.length.toLocaleString()} map-specific paths.`,
    );
  }
  if (report.missingRouteCount > 0) {
    console.log(`${report.missingRouteCount.toLocaleString()} referenced routes were missing from the walker catalog.`);
  }

  for (const finding of report.findings) {
    const npcNames = [...new Set(finding.usages.map(usage => usage.npcName))];
    const usageLabel = npcNames.slice(0, 2).join(", ") + (npcNames.length > 2 ? ` +${npcNames.length - 2}` : "");
    console.log(
      `${finding.mapName} (${finding.mapId}) | ${finding.routeId} | `
        + `${finding.offGroundPointCount}/${finding.authoredPointCount} points | `
        + `worst ${formatSigned(finding.worstDelta)}m | ${usageLabel}`,
    );
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    toleranceMeters: DEFAULT_WALKER_GROUND_TOLERANCE_METERS,
    json: false,
    outputPath: undefined,
    help: false,
  };
  const cleaned = argv.filter(value => value !== "--");
  for (let index = 0; index < cleaned.length; index += 1) {
    const name = cleaned[index];
    if (name === "--json") {
      args.json = true;
      continue;
    }
    if (name === "--help" || name === "-h") {
      args.help = true;
      continue;
    }
    if (!name.startsWith("--")) throw new Error(`Unexpected positional argument ${name}. Use named arguments.`);
    const value = cleaned[index + 1];
    if (value == null || value.startsWith("--")) throw new Error(`${name} requires a value.`);
    index += 1;
    if (name === "--tolerance-m" || name === "--tolerance") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        throw new Error(`${name} must be a number from 0 to 100.`);
      }
      args.toleranceMeters = parsed;
    } else if (name === "--output") {
      args.outputPath = value;
    } else {
      throw new Error(`Unknown argument ${name}.`);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Usage: npm run walkers:audit-ground -- [options]

Options:
  --tolerance-m <meters>  Off-ground threshold (default ${DEFAULT_WALKER_GROUND_TOLERANCE_METERS})
  --json                  Print the complete report as JSON
  --output <path>         Write the complete JSON report to a file
  --help, -h              Show this help`);
}

function formatNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function formatSigned(value: number): string {
  const formatted = formatNumber(value);
  return value > 0 ? `+${formatted}` : formatted;
}

