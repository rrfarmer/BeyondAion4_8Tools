import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type FavoritesFile = {
  favoritesByUser: Record<string, number[]>;
};

export class AdminItemFavoritesStore {
  constructor(private readonly filePath: string) {}

  async list(userId: string): Promise<number[]> {
    const data = await this.read();
    return sanitizeIds(data.favoritesByUser[userId] ?? []);
  }

  async setFavorite(userId: string, itemId: number, favorite: boolean): Promise<number[]> {
    const data = await this.read();
    const current = new Set(sanitizeIds(data.favoritesByUser[userId] ?? []));
    if (favorite) {
      current.add(itemId);
    } else {
      current.delete(itemId);
    }
    data.favoritesByUser[userId] = [...current].sort((left, right) => left - right);
    await this.write(data);
    return data.favoritesByUser[userId];
  }

  async toggle(userId: string, itemId: number): Promise<{ favorite: boolean; itemIds: number[] }> {
    const data = await this.read();
    const current = new Set(sanitizeIds(data.favoritesByUser[userId] ?? []));
    const favorite = !current.has(itemId);
    if (favorite) {
      current.add(itemId);
    } else {
      current.delete(itemId);
    }
    data.favoritesByUser[userId] = [...current].sort((left, right) => left - right);
    await this.write(data);
    return {
      favorite,
      itemIds: data.favoritesByUser[userId],
    };
  }

  private async read(): Promise<FavoritesFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<FavoritesFile>;
      return {
        favoritesByUser: sanitizeFavoritesByUser(parsed.favoritesByUser),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { favoritesByUser: {} };
      }
      throw error;
    }
  }

  private async write(data: FavoritesFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(tempPath, this.filePath);
  }
}

function sanitizeFavoritesByUser(value: unknown): Record<string, number[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([userId, itemIds]) => [
      userId,
      sanitizeIds(Array.isArray(itemIds) ? itemIds : []),
    ]),
  );
}

function sanitizeIds(values: unknown[]): number[] {
  return [...new Set(values.map(value => Number(value)).filter(Number.isInteger).filter(value => value > 0))]
    .sort((left, right) => left - right);
}
