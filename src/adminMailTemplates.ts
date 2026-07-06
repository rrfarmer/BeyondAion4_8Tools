import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type AdminMailTemplateKind = "item" | "kinah";

export type AdminMailTemplate = {
  id: string;
  name: string;
  mailKind: AdminMailTemplateKind;
  senderName: string;
  title: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

type MailTemplatesFile = {
  templates: AdminMailTemplate[];
};

export class AdminMailTemplateStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<AdminMailTemplate[]> {
    const data = await this.read();
    return data.templates.sort((left, right) => left.name.localeCompare(right.name, "en-US"));
  }

  async create(input: Omit<AdminMailTemplate, "id" | "createdAt" | "updatedAt">): Promise<AdminMailTemplate> {
    const data = await this.read();
    const now = new Date().toISOString();
    const template: AdminMailTemplate = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    data.templates.push(template);
    await this.write(data);
    return template;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.read();
    const next = data.templates.filter(template => template.id !== id);
    if (next.length === data.templates.length) {
      return false;
    }
    data.templates = next;
    await this.write(data);
    return true;
  }

  private async read(): Promise<MailTemplatesFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<MailTemplatesFile>;
      return {
        templates: sanitizeTemplates(parsed.templates),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { templates: [] };
      }
      throw error;
    }
  }

  private async write(data: MailTemplatesFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify({ templates: sanitizeTemplates(data.templates) }, null, 2)}\n`, "utf8");
    await rename(tempPath, this.filePath);
  }
}

function sanitizeTemplates(value: unknown): AdminMailTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(sanitizeTemplate).filter(isPresent);
}

function sanitizeTemplate(value: unknown): AdminMailTemplate | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Partial<AdminMailTemplate>;
  const id = String(candidate.id ?? "").trim();
  const name = String(candidate.name ?? "").trim();
  const mailKind = candidate.mailKind === "kinah" ? "kinah" : "item";
  const senderName = String(candidate.senderName ?? "").trim();
  const title = String(candidate.title ?? "").trim();
  const message = String(candidate.message ?? "").trim();
  if (!id || !name || !senderName || !title || !message) {
    return undefined;
  }
  return {
    id,
    name,
    mailKind,
    senderName,
    title,
    message,
    createdAt: String(candidate.createdAt ?? ""),
    updatedAt: String(candidate.updatedAt ?? ""),
  };
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}
