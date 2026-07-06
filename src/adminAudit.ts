import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type AdminAuditEntry = Record<string, unknown> & {
  at?: string;
  action?: string;
  adminUsername?: string;
  source?: string;
};

export class AdminAuditLog {
  constructor(private readonly auditPath: string) {}

  async append(record: Record<string, unknown>): Promise<void> {
    await mkdir(path.dirname(this.auditPath), { recursive: true });
    await appendFile(
      this.auditPath,
      `${JSON.stringify({
        at: new Date().toISOString(),
        ...record,
      })}\n`,
      "utf8",
    );
  }
}

export async function readRecentAuditEntries(auditPaths: string[], limit = 60): Promise<AdminAuditEntry[]> {
  const entries = (await Promise.all(auditPaths.map(readAuditFile))).flat();
  return entries
    .sort((left, right) => timestamp(right.at) - timestamp(left.at))
    .slice(0, limit);
}

async function readAuditFile(auditPath: string): Promise<AdminAuditEntry[]> {
  let body: string;
  try {
    body = await readFile(auditPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const source = path.basename(auditPath);
  return body
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => parseAuditLine(line, source))
    .filter(isPresent);
}

function parseAuditLine(line: string, source: string): AdminAuditEntry | undefined {
  try {
    const parsed = JSON.parse(line) as AdminAuditEntry;
    return {
      source,
      ...parsed,
    };
  } catch {
    return undefined;
  }
}

function timestamp(value: unknown): number {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}
