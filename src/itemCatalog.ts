import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import sax from "sax";

export type ItemTemplateInfo = {
  id: number;
  name: string;
  cName: string | undefined;
  mask: number;
  quality: string | undefined;
  itemGroup: string | undefined;
  itemType: string | undefined;
  race: string | undefined;
  descId: number | undefined;
  price: number;
  level: number;
  maxStackCount: number;
};

export class ItemCatalog {
  private readonly templates = new Map<number, ItemTemplateInfo>();
  private loaded = false;

  constructor(private readonly aionRepoRoot: string) {}

  async load(): Promise<void> {
    const filePath = path.join(this.aionRepoRoot, "game-server", "data", "static_data", "items", "item_templates.xml");
    if (!existsSync(filePath)) {
      this.loaded = true;
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const parser = sax.createStream(true, {});
      parser.on("opentag", node => {
        if (node.name !== "item_template") {
          return;
        }
        const attrs = node.attributes as Record<string, string>;
        const id = Number.parseInt(attrs.id ?? "", 10);
        const name = attrs.name;
        if (Number.isFinite(id) && name) {
          this.templates.set(id, {
            id,
            name,
            cName: attrs.cName ?? attrs.cname,
            mask: parseOptionalInt(attrs.mask, 0),
            quality: attrs.quality,
            itemGroup: attrs.item_group,
            itemType: attrs.item_type,
            race: attrs.race,
            descId: parseOptionalInt(attrs.desc, Number.NaN),
            price: parseOptionalInt(attrs.price, 0),
            level: parseOptionalInt(attrs.level, 0),
            maxStackCount: parseOptionalInt(attrs.max_stack_count, 1),
          });
        }
      });
      parser.on("error", reject);
      parser.on("end", resolve);
      createReadStream(filePath, "utf8").pipe(parser);
    });

    this.loaded = true;
  }

  nameFor(itemId: number): string | undefined {
    return this.templates.get(itemId)?.name;
  }

  templateFor(itemId: number): ItemTemplateInfo | undefined {
    return this.templates.get(itemId);
  }

  allItemIds(): number[] {
    return [...this.templates.keys()].sort((left, right) => left - right);
  }

  allTemplates(): ItemTemplateInfo[] {
    return [...this.templates.values()].sort((left, right) => left.id - right.id);
  }

  hasMask(itemId: number, mask: number): boolean {
    const template = this.templateFor(itemId);
    return template ? (template.mask & mask) === mask : false;
  }

  isStackable(itemId: number): boolean {
    return (this.templateFor(itemId)?.maxStackCount ?? 1) > 1;
  }

  isStorableInWarehouse(itemId: number): boolean {
    return this.hasMask(itemId, ItemMask.StorableInWarehouse);
  }

  isStorableInAccountWarehouse(itemId: number, soulBound: boolean): boolean {
    return this.hasMask(itemId, ItemMask.StorableInAccountWarehouse) && !soulBound;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  get size(): number {
    return this.templates.size;
  }
}

export const ItemMask = {
  StorableInWarehouse: 1 << 3,
  StorableInAccountWarehouse: 1 << 4,
} as const;

function parseOptionalInt(value: string | undefined, fallback: number): number {
  if (value == null || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
