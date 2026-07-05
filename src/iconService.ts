import { readFile } from "node:fs/promises";
import path from "node:path";

export class IconService {
  constructor(private readonly iconDir: string) {}

  async getItemIcon(itemId: number): Promise<IconResponse> {
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return placeholder();
    }

    const existing = await this.readCached(itemId);
    if (existing) {
      return existing;
    }

    return placeholder();
  }

  private async readCached(itemId: number): Promise<IconResponse | undefined> {
    try {
      const body = await readFile(this.iconPath(itemId));
      return {
        contentType: "image/png",
        cacheControl: "public, max-age=604800, immutable",
        body,
      };
    } catch {
      return undefined;
    }
  }

  private iconPath(itemId: number): string {
    return path.join(this.iconDir, `${itemId}.png`);
  }
}

export type IconResponse = {
  contentType: string;
  cacheControl: string;
  body: Buffer | string;
};

function placeholder(): IconResponse {
  return {
    contentType: "image/svg+xml; charset=utf-8",
    cacheControl: "public, max-age=86400",
    body: `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <rect width="44" height="44" rx="6" fill="#182031"/>
  <rect x="6" y="6" width="32" height="32" rx="4" fill="#253049" stroke="#46536f"/>
  <path d="M14 27h16M16 17h12M16 22h8" stroke="#9aa8c7" stroke-width="2" stroke-linecap="round"/>
</svg>`,
  };
}
