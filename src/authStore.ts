import { constants as fsConstants } from "node:fs";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const scrypt = promisify(scryptCallback);

export type PortalUser = {
  id: string;
  username: string;
  usernameKey: string;
  aionAccountId: number;
  aionAccountName: string;
  passwordHash: string;
  createdAt: string;
};

type UsersFile = {
  version: 1;
  users: PortalUser[];
};

export class AuthStore {
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async findById(id: string): Promise<PortalUser | undefined> {
    const data = await this.read();
    return data.users.find(user => user.id === id);
  }

  async findByUsername(username: string): Promise<PortalUser | undefined> {
    const key = normalize(username);
    const data = await this.read();
    return data.users.find(user => user.usernameKey === key);
  }

  async findByAionAccountId(aionAccountId: number): Promise<PortalUser | undefined> {
    const data = await this.read();
    return data.users.find(user => user.aionAccountId === aionAccountId);
  }

  async validateLogin(username: string, password: string): Promise<PortalUser | undefined> {
    const user = await this.findByUsername(username);
    if (!user) {
      return undefined;
    }
    return (await verifyPassword(password, user.passwordHash)) ? user : undefined;
  }

  async createUser(input: {
    username: string;
    password: string;
    aionAccountId: number;
    aionAccountName: string;
  }): Promise<PortalUser> {
    const username = input.username.trim();
    if (username.length < 3) {
      throw new Error("Portal username must be at least 3 characters.");
    }
    if (input.password.length < 8) {
      throw new Error("Portal password must be at least 8 characters.");
    }

    return this.mutate(async data => {
      const usernameKey = normalize(username);
      if (data.users.some(user => user.usernameKey === usernameKey)) {
        throw new Error("That portal username already exists.");
      }
      if (data.users.some(user => user.aionAccountId === input.aionAccountId)) {
        throw new Error("That Aion account is already linked to a portal user.");
      }

      const user: PortalUser = {
        id: randomBytes(16).toString("hex"),
        username,
        usernameKey,
        aionAccountId: input.aionAccountId,
        aionAccountName: input.aionAccountName,
        passwordHash: await hashPassword(input.password),
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      return user;
    });
  }

  async findOrCreateAionUser(input: {
    aionAccountId: number;
    aionAccountName: string;
  }): Promise<PortalUser> {
    return this.mutate(async data => {
      const existing = data.users.find(user => user.aionAccountId === input.aionAccountId);
      if (existing) {
        existing.aionAccountName = input.aionAccountName;
        return existing;
      }

      const baseUsername = input.aionAccountName.trim() || `Account ${input.aionAccountId}`;
      let username = baseUsername;
      let usernameKey = normalize(username);
      if (data.users.some(user => user.usernameKey === usernameKey)) {
        username = `${baseUsername}-${input.aionAccountId}`;
        usernameKey = normalize(username);
      }

      const user: PortalUser = {
        id: randomBytes(16).toString("hex"),
        username,
        usernameKey,
        aionAccountId: input.aionAccountId,
        aionAccountName: input.aionAccountName,
        passwordHash: "aion-account-login",
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      return user;
    });
  }

  private async mutate<T>(operation: (data: UsersFile) => Promise<T>): Promise<T> {
    const next = this.writeQueue.then(async () => {
      const data = await this.read();
      const result = await operation(data);
      await this.write(data);
      return result;
    });
    this.writeQueue = next.catch(() => undefined);
    return next;
  }

  private async read(): Promise<UsersFile> {
    try {
      await access(this.filePath, fsConstants.F_OK);
    } catch {
      return { version: 1, users: [] };
    }

    const raw = await readFile(this.filePath, "utf8");
    if (raw.trim() === "") {
      return { version: 1, users: [] };
    }
    const parsed = JSON.parse(raw) as UsersFile;
    return {
      version: 1,
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
  }

  private async write(data: UsersFile): Promise<void> {
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
