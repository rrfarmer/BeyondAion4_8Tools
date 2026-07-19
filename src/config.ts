import path from "node:path";
import { mkdirSync } from "node:fs";
import "dotenv/config";

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type AppConfig = {
  host: string;
  port: number;
  sessionSecret: string;
  portalRegistrationCode: string;
  dataDir: string;
  usersFile: string;
  iconDir: string;
  spawnMapManifestPath: string;
  aionRepoRoot: string;
  beyondAionSharpRepoRoot: string;
  loginDb: DbConfig;
  gameDb: DbConfig;
  gameServer: GameServerAdminConfig;
};

type GameServerAdminConfig = {
  baseUrl: string;
  adminToken: string;
};

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value == null || value.trim() === "" ? fallback : value;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }
  return parsed;
}

function db(prefix: "LOGIN_DB" | "GAME_DB", database: string): DbConfig {
  return {
    host: env(`${prefix}_HOST`, "127.0.0.1"),
    port: envInt(`${prefix}_PORT`, 3307),
    user: env(`${prefix}_USER`, "root"),
    password: env(`${prefix}_PASSWORD`, "aion"),
    database: env(`${prefix}_NAME`, database),
  };
}

const dataDir = path.resolve(env("DATA_DIR", "./data"));
mkdirSync(dataDir, { recursive: true });

export const config: AppConfig = {
  host: env("HOST", "127.0.0.1"),
  port: envInt("PORT", 3000),
  sessionSecret: env("SESSION_SECRET", "dev-only-change-before-sharing"),
  portalRegistrationCode: env("PORTAL_REGISTRATION_CODE", ""),
  dataDir,
  usersFile: path.join(dataDir, "users.json"),
  iconDir: path.join(dataDir, "icons"),
  spawnMapManifestPath: path.resolve(env("SPAWN_MAP_MANIFEST_PATH", "./assets/maps/manifest.json")),
  aionRepoRoot: path.resolve(env("AION_REPO_ROOT", "C:\\Users\\ryanf\\Documents\\GitHub\\aion-server")),
  beyondAionSharpRepoRoot: path.resolve(
    env("BEYOND_AION_SHARP_REPO_ROOT", "C:\\Users\\ryanf\\Documents\\GitHub\\BeyondAionSharp"),
  ),
  loginDb: db("LOGIN_DB", "aion_ls"),
  gameDb: db("GAME_DB", "aion_gs"),
  gameServer: {
    // Admin endpoint on the live game server. Inside docker this is the internal service name; the token must
    // match the game server's ADMIN_API_TOKEN (GAMESERVER_ADMIN_API_TOKEN).
    baseUrl: env("GAME_SERVER_ADMIN_URL", "http://gameserver:7780"),
    adminToken: env("GAME_SERVER_ADMIN_TOKEN", "change-me-admin-token"),
  },
};
