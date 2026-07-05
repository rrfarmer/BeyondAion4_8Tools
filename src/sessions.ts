import { randomBytes } from "node:crypto";

type Session = {
  userId: string;
  expiresAt: number;
};

const ttlMs = 1000 * 60 * 60 * 24 * 7;

export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  create(userId: string): string {
    const id = randomBytes(32).toString("base64url");
    this.sessions.set(id, { userId, expiresAt: Date.now() + ttlMs });
    return id;
  }

  get(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
