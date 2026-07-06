import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type AdminMailBundleEntry =
  | {
      kind: "item";
      itemId: number;
      itemCount: number;
    }
  | {
      kind: "kinah";
      kinahAmount: string;
    };

export type AdminMailBundle = {
  id: string;
  name: string;
  senderName: string;
  title: string;
  message: string;
  entries: AdminMailBundleEntry[];
  createdAt: string;
  updatedAt: string;
};

type MailBundlesFile = {
  bundles: AdminMailBundle[];
};

export class AdminMailBundleStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<AdminMailBundle[]> {
    const data = await this.read();
    return data.bundles.sort((left, right) => left.name.localeCompare(right.name, "en-US"));
  }

  async get(id: string): Promise<AdminMailBundle | undefined> {
    const data = await this.read();
    return data.bundles.find(bundle => bundle.id === id);
  }

  async create(input: Omit<AdminMailBundle, "id" | "createdAt" | "updatedAt">): Promise<AdminMailBundle> {
    const data = await this.read();
    const now = new Date().toISOString();
    const bundle: AdminMailBundle = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    data.bundles.push(bundle);
    await this.write(data);
    return bundle;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.read();
    const next = data.bundles.filter(bundle => bundle.id !== id);
    if (next.length === data.bundles.length) {
      return false;
    }
    data.bundles = next;
    await this.write(data);
    return true;
  }

  private async read(): Promise<MailBundlesFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<MailBundlesFile>;
      return {
        bundles: sanitizeBundles(parsed.bundles),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { bundles: [] };
      }
      throw error;
    }
  }

  private async write(data: MailBundlesFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify({ bundles: sanitizeBundles(data.bundles) }, null, 2)}\n`, "utf8");
    await rename(tempPath, this.filePath);
  }
}

function sanitizeBundles(value: unknown): AdminMailBundle[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(sanitizeBundle)
    .filter(isPresent);
}

function sanitizeBundle(value: unknown): AdminMailBundle | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Partial<AdminMailBundle>;
  const id = String(candidate.id ?? "").trim();
  const name = String(candidate.name ?? "").trim();
  const senderName = String(candidate.senderName ?? "").trim();
  const title = String(candidate.title ?? "").trim();
  const message = String(candidate.message ?? "").trim();
  const entries = sanitizeEntries(candidate.entries);
  if (!id || !name || !senderName || !title || !message || entries.length === 0) {
    return undefined;
  }
  return {
    id,
    name,
    senderName,
    title,
    message,
    entries,
    createdAt: String(candidate.createdAt ?? ""),
    updatedAt: String(candidate.updatedAt ?? ""),
  };
}

function sanitizeEntries(value: unknown): AdminMailBundleEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(entry => {
      if (!entry || typeof entry !== "object") {
        return undefined;
      }
      const candidate = entry as Partial<AdminMailBundleEntry>;
      if (candidate.kind === "item") {
        const itemId = Number(candidate.itemId);
        const itemCount = Number(candidate.itemCount);
        return Number.isInteger(itemId) && itemId > 0 && Number.isInteger(itemCount) && itemCount > 0
          ? { kind: "item" as const, itemId, itemCount }
          : undefined;
      }
      if (candidate.kind === "kinah") {
        const kinahAmount = String(candidate.kinahAmount ?? "").trim();
        return /^\d+$/.test(kinahAmount) && BigInt(kinahAmount) > 0n
          ? { kind: "kinah" as const, kinahAmount }
          : undefined;
      }
      return undefined;
    })
    .filter(isPresent);
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}
