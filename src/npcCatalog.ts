import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import sax from "sax";

export type NpcTemplateInfo = {
  id: number;
  name: string;
  displayName: string;
  level: number;
  type: string;
  rank: string;
  rating: string;
  race: string;
  tribe: string;
  ai: string;
};

export class NpcCatalog {
  private readonly templates = new Map<number, NpcTemplateInfo>();
  private sortedTemplates: NpcTemplateInfo[] = [];
  private loaded = false;

  constructor(private readonly beyondAionSharpRepoRoot: string) {}

  async load(): Promise<void> {
    const filePath = path.join(
      this.beyondAionSharpRepoRoot,
      "game-server",
      "data",
      "static_data",
      "npcs",
      "npc_templates.xml",
    );
    if (!existsSync(filePath)) {
      this.loaded = true;
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const parser = sax.createStream(true, {});
      parser.on("opentag", node => {
        if (node.name !== "npc_template") {
          return;
        }
        const attrs = node.attributes as Record<string, string>;
        const id = Number.parseInt(attrs.npc_id ?? "", 10);
        if (!Number.isFinite(id)) {
          return;
        }
        const name = attrs.name?.trim() || `NPC ${id}`;
        this.templates.set(id, {
          id,
          name,
          displayName: humanizeNpcName(name),
          level: parseIntOr(attrs.level, 0),
          type: attrs.type || "NONE",
          rank: attrs.rank || "",
          rating: attrs.rating || "",
          race: attrs.race || "",
          tribe: attrs.tribe || "",
          ai: attrs.ai || "",
        });
      });
      parser.on("error", reject);
      parser.on("end", resolve);
      createReadStream(filePath, "utf8").pipe(parser);
    });

    this.sortedTemplates = [...this.templates.values()].sort((left, right) =>
      left.displayName.localeCompare(right.displayName) || left.id - right.id,
    );
    this.loaded = true;
  }

  templateFor(npcId: number): NpcTemplateInfo | undefined {
    return this.templates.get(npcId);
  }

  search(rawQuery: string, rawLimit = 30): NpcTemplateInfo[] {
    const query = rawQuery.trim().toLocaleLowerCase();
    if (!query) {
      return [];
    }
    const limit = Math.min(Math.max(rawLimit, 1), 50);
    const numeric = /^\d+$/.test(query) ? Number.parseInt(query, 10) : undefined;
    const exactId = numeric == null ? undefined : this.templates.get(numeric);
    const results: Array<{ template: NpcTemplateInfo; score: number }> = [];

    for (const template of this.sortedTemplates) {
      if (template.id === numeric) {
        continue;
      }
      const name = template.displayName.toLocaleLowerCase();
      const internalName = template.name.toLocaleLowerCase();
      const idText = String(template.id);
      let score = Number.POSITIVE_INFINITY;
      if (name === query || internalName === query) {
        score = 0;
      } else if (name.startsWith(query) || internalName.startsWith(query)) {
        score = 1;
      } else if (name.includes(query) || internalName.includes(query)) {
        score = 2;
      } else if (numeric != null && idText.startsWith(query)) {
        score = 3;
      }
      if (Number.isFinite(score)) {
        results.push({ template, score });
      }
    }

    results.sort((left, right) =>
      left.score - right.score
      || left.template.displayName.localeCompare(right.template.displayName)
      || left.template.id - right.template.id,
    );
    const matched = results.slice(0, exactId ? limit - 1 : limit).map(result => result.template);
    return exactId ? [exactId, ...matched] : matched;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  get size(): number {
    return this.templates.size;
  }
}

export function humanizeNpcName(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, letter => letter.toLocaleUpperCase());
}

function parseIntOr(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
