import path from "node:path";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import { config } from "./config.js";
import { closeDbPools } from "./db.js";
import { AdminMailService } from "./adminMailService.js";
import {
  authenticateAionAccount,
  loadAdminDashboardView,
  loadAionAccountAccessLevel,
  loadWarehouseHubView,
} from "./aionData.js";
import { AuthStore, type PortalUser } from "./authStore.js";
import { SessionStore } from "./sessions.js";
import { ItemCatalog, type ItemTemplateInfo } from "./itemCatalog.js";
import { IconService } from "./iconService.js";
import {
  adminDashboardPage,
  errorPanel,
  layout,
  loginPage,
  warehouseHubPage,
} from "./views.js";
import { WarehouseTransferService } from "./warehouseTransfer.js";
import { AdminItemFavoritesStore } from "./adminItemFavorites.js";

const app = Fastify({ logger: true });
const authStore = new AuthStore(config.usersFile);
const sessions = new SessionStore();
const itemCatalog = new ItemCatalog(config.aionRepoRoot);
const iconService = new IconService(config.iconDir);
const warehouseTransfers = new WarehouseTransferService(itemCatalog, path.join(config.dataDir, "item-transfer-audit.jsonl"));
const adminMail = new AdminMailService(itemCatalog, path.join(config.dataDir, "admin-mail-audit.jsonl"), config.gameServer);
const adminItemFavorites = new AdminItemFavoritesStore(path.join(config.dataDir, "admin-item-favorites.json"));

await app.register(cookie, {
  secret: config.sessionSecret,
});
await app.register(formbody);

const itemCatalogLoad = itemCatalog
  .load()
  .then(() => {
    app.log.info({ itemCount: itemCatalog.size }, "Item catalog loaded");
  })
  .catch(error => {
    app.log.warn({ error }, "Item catalog could not be loaded; inventory will show item IDs");
  });

app.get("/", async (request, reply) => {
  const current = await currentUser(request);
  return reply.redirect(current ? "/warehouses" : "/login");
});

app.get("/health", async () => {
  return {
    ok: true,
    itemCatalogLoaded: itemCatalog.isLoaded,
    itemCatalogSize: itemCatalog.size,
  };
});

app.get("/icons/item/:itemId", async (request, reply) => {
  const { itemId } = request.params as { itemId: string };
  const parsed = Number.parseInt(itemId, 10);
  const icon = await iconService.getItemIcon(parsed);
  return reply
    .type(icon.contentType)
    .header("Cache-Control", icon.cacheControl)
    .send(icon.body);
});

app.get("/register", async (_request, reply) => {
  return reply.redirect("/login");
});

app.post("/register", async (_request, reply) => {
  return reply.redirect("/login");
});

app.get("/login", async (_request, reply) => {
  return html(reply, layout({ title: "Sign In", body: loginPage() }));
});

app.post("/login", async (request, reply) => {
  const body = request.body as Record<string, string | undefined>;
  const aionAccountName = body.username?.trim() ?? "";
  const password = body.password ?? "";
  const account = await authenticateAionAccount(aionAccountName, password, request.ip);
  if (!account) {
    return html(reply, layout({ title: "Sign In", body: loginPage("Aion account or password is incorrect.") }));
  }
  const user = await authStore.findOrCreateAionUser({
    aionAccountId: account.id,
    aionAccountName: account.name,
  });
  setSession(reply, user);
  return reply.redirect("/warehouses");
});

app.post("/logout", async (request, reply) => {
  const current = await currentUser(request);
  if (current) {
    sessions.delete(current.sessionId);
  }
  reply.clearCookie("sid", { path: "/" });
  return reply.redirect("/login");
});

app.get("/characters", async (request, reply) => {
  const current = await requireUser(request, reply);
  if (!current) {
    return;
  }

  return reply.redirect("/warehouses");
});

app.get("/warehouses", async (request, reply) => {
  const current = await requireUser(request, reply);
  if (!current) {
    return;
  }

  try {
    const view = await loadWarehouseHubView(
      current.user.aionAccountId,
      current.user.aionAccountName,
      itemCatalog,
    );
    const query = request.query as Record<string, string | undefined>;
    const notice = query.error
      ? { kind: "error" as const, message: query.error }
      : query.ok
        ? { kind: "success" as const, message: query.ok }
        : undefined;
    return html(
      reply,
      layout({
        title: "Warehouses",
        user: current.user,
        body: warehouseHubPage(view, notice),
      }),
    );
  } catch (error) {
    return html(
      reply,
      layout({
        title: "Warehouses",
        user: current.user,
        body: errorPanel("Warehouses", `Could not load warehouses: ${messageFor(error)}`),
      }),
    );
  }
});

app.post("/warehouses/transfer", async (request, reply) => {
  const current = await requireUser(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const characterId = Number.parseInt(body.characterId ?? "", 10);
  const itemUniqueId = Number.parseInt(body.itemUniqueId ?? "", 10);
  const targetStorageId = Number.parseInt(body.targetStorageId ?? "", 10);
  const redirectBase = "/warehouses";
  const redirectWith = (key: "ok" | "error", message: string) =>
    `${redirectBase}${redirectBase.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;

  if (!Number.isFinite(characterId) || !Number.isFinite(itemUniqueId) || !Number.isFinite(targetStorageId)) {
    return reply.redirect(redirectWith("error", "Transfer request is not valid."));
  }

  try {
    const result = await warehouseTransfers.moveItem({
      portalUserId: current.user.id,
      accountId: current.user.aionAccountId,
      characterId,
      itemUniqueId,
      targetStorageId,
    });
    return reply.redirect(
      redirectWith("ok", `Moved ${result.itemName} from ${result.fromStorageName} to ${result.toStorageName}.`),
    );
  } catch (error) {
    return reply.redirect(redirectWith("error", messageFor(error)));
  }
});

app.post("/warehouses/kinah-transfer", async (request, reply) => {
  const current = await requireUser(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const characterId = Number.parseInt(body.characterId ?? "", 10);
  const sourceStorageId = Number.parseInt(body.sourceStorageId ?? "", 10);
  const targetStorageId = Number.parseInt(body.targetStorageId ?? "", 10);
  const redirectBase = "/warehouses";
  const redirectWith = (key: "ok" | "error", message: string) =>
    `${redirectBase}${redirectBase.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;

  if (!Number.isFinite(characterId) || !Number.isFinite(sourceStorageId) || !Number.isFinite(targetStorageId)) {
    return reply.redirect(redirectWith("error", "Kinah transfer request is not valid."));
  }

  try {
    const result = await warehouseTransfers.moveKinah({
      portalUserId: current.user.id,
      accountId: current.user.aionAccountId,
      characterId,
      sourceStorageId,
      targetStorageId,
      amount: body.amount ?? "",
    });
    return reply.redirect(
      redirectWith(
        "ok",
        `Moved ${formatIntegerString(result.amount)} Kinah from ${result.fromStorageName} to ${result.toStorageName}.`,
      ),
    );
  } catch (error) {
    return reply.redirect(redirectWith("error", messageFor(error)));
  }
});

app.get("/admin", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  try {
    const view = await loadAdminDashboardView();
    const query = request.query as Record<string, string | undefined>;
    const notice = query.error
      ? { kind: "error" as const, message: query.error }
      : query.ok
        ? { kind: "success" as const, message: query.ok }
        : undefined;
    return html(
      reply,
      layout({
        title: "Admin",
        user: current.user,
        body: adminDashboardPage(view, notice),
      }),
    );
  } catch (error) {
    return html(
      reply,
      layout({
        title: "Admin",
        user: current.user,
        body: errorPanel("Admin", `Could not load admin dashboard: ${messageFor(error)}`),
      }),
    );
  }
});

app.get("/admin/items/meta", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }
  await ensureItemCatalogLoaded();
  const templates = itemCatalog.allTemplates();
  return reply.send({
    categories: uniqueSorted(templates.map(template => template.itemGroup).filter(isPresent)),
    qualities: uniqueSorted(templates.map(template => template.quality).filter(isPresent)),
    itemTypes: uniqueSorted(templates.map(template => template.itemType).filter(isPresent)),
  });
});

app.get("/admin/items/search", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }
  await ensureItemCatalogLoaded();

  const query = request.query as Record<string, string | undefined>;
  const favorites = new Set(await adminItemFavorites.list(current.user.id));
  const results = searchAdminItems({
    q: query.q ?? "",
    category: query.category ?? "",
    quality: query.quality ?? "",
    itemType: query.itemType ?? "",
    favoriteIds: favorites,
    limit: 80,
  });
  return reply.send({ items: results });
});

app.get("/admin/items/favorites", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }
  await ensureItemCatalogLoaded();

  const favoriteIds = await adminItemFavorites.list(current.user.id);
  return reply.send({
    items: favoriteIds
      .map(itemId => itemCatalog.templateFor(itemId))
      .filter(isPresent)
      .map(template => adminItemResult(template, new Set(favoriteIds))),
  });
});

app.post("/admin/items/favorites", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }
  await ensureItemCatalogLoaded();

  const body = request.body as Record<string, string | undefined>;
  const itemId = Number.parseInt(body.itemId ?? "", 10);
  if (!Number.isInteger(itemId) || itemId <= 0 || !itemCatalog.templateFor(itemId)) {
    return reply.code(400).send({ error: "Item id is not valid." });
  }

  const action = body.action ?? "toggle";
  if (action === "add") {
    await adminItemFavorites.setFavorite(current.user.id, itemId, true);
    return reply.send({ itemId, favorite: true });
  }
  if (action === "remove") {
    await adminItemFavorites.setFavorite(current.user.id, itemId, false);
    return reply.send({ itemId, favorite: false });
  }

  const result = await adminItemFavorites.toggle(current.user.id, itemId);
  return reply.send({ itemId, favorite: result.favorite });
});

app.post("/admin/mail-items", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const itemId = Number.parseInt(body.itemId ?? "", 10);
  const itemCount = Number.parseInt(body.itemCount ?? "", 10);

  try {
    const result = await adminMail.sendItemMail({
      adminPortalUserId: current.user.id,
      adminUsername: current.user.username,
      recipientCharacterId,
      itemId,
      itemCount,
      senderName: body.senderName ?? "",
      title: body.title ?? "",
      message: body.message ?? "",
    });
    const deliveryNote =
      result.delivered === "online"
        ? "They were notified instantly (bell + icon)."
        : "They will see it the next time they log in.";
    return reply.redirect(
      `/admin?ok=${encodeURIComponent(
        `Sent ${result.itemCount} ${result.itemName} to ${result.recipientName} by express mail. ${deliveryNote}`,
      )}`,
    );
  } catch (error) {
    return reply.redirect(`/admin?error=${encodeURIComponent(messageFor(error))}`);
  }
});

app.get("/characters/:id/inventory", async (request, reply) => {
  return reply.redirect("/warehouses");
});

app.get("/account/warehouses", async (request, reply) => {
  const current = await requireUser(request, reply);
  if (!current) {
    return;
  }

  return reply.redirect("/warehouses");
});

app.get("/characters/:id/transfer", async (request, reply) => {
  const current = await requireUser(request, reply);
  if (!current) {
    return;
  }

  return reply.redirect("/warehouses");
});

app.post("/characters/:id/transfer", async (request, reply) => {
  const current = await requireUser(request, reply);
  if (!current) {
    return;
  }

  const { id } = request.params as { id: string };
  const characterId = Number.parseInt(id, 10);
  const body = request.body as Record<string, string | undefined>;
  const itemUniqueId = Number.parseInt(body.itemUniqueId ?? "", 10);
  const targetStorageId = Number.parseInt(body.targetStorageId ?? "", 10);

  if (!Number.isFinite(characterId) || !Number.isFinite(itemUniqueId) || !Number.isFinite(targetStorageId)) {
    return reply.redirect(`/warehouses?error=${encodeURIComponent("Transfer request is not valid.")}`);
  }

  try {
    const result = await warehouseTransfers.moveItem({
      portalUserId: current.user.id,
      accountId: current.user.aionAccountId,
      characterId,
      itemUniqueId,
      targetStorageId,
    });
    return reply.redirect(
      `/warehouses?ok=${encodeURIComponent(
        `Moved ${result.itemName} from ${result.fromStorageName} to ${result.toStorageName}.`,
      )}`,
    );
  } catch (error) {
    const message = messageFor(error);
    return reply.redirect(`/warehouses?error=${encodeURIComponent(message)}`);
  }
});

app.get("/characters/:id/warehouses", async (request, reply) => {
  const current = await requireUser(request, reply);
  if (!current) {
    return;
  }

  return reply.redirect("/warehouses");
});

const close = async () => {
  await closeDbPools();
};
process.once("SIGINT", close);
process.once("SIGTERM", close);

await app.listen({ host: config.host, port: config.port });

type CurrentPortalUser = PortalUser & {
  aionAccessLevel: number;
  isAdmin: boolean;
};

type CurrentUser = {
  user: CurrentPortalUser;
  sessionId: string;
};

async function currentUser(request: FastifyRequest): Promise<CurrentUser | undefined> {
  const signedCookie = request.cookies.sid;
  if (!signedCookie) {
    return undefined;
  }
  const unsigned = request.unsignCookie(signedCookie);
  if (!unsigned.valid || !unsigned.value) {
    return undefined;
  }
  const session = sessions.get(unsigned.value);
  if (!session) {
    return undefined;
  }
  const user = await authStore.findById(session.userId);
  if (!user) {
    return undefined;
  }

  let accessLevel = 0;
  try {
    accessLevel = await loadAionAccountAccessLevel(user.aionAccountId);
  } catch (error) {
    app.log.warn({ error, aionAccountId: user.aionAccountId }, "Could not load Aion account access level");
  }

  return {
    user: {
      ...user,
      aionAccessLevel: accessLevel,
      isAdmin: accessLevel >= 9,
    },
    sessionId: unsigned.value,
  };
}

async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<CurrentUser | undefined> {
  const user = await currentUser(request);
  if (!user) {
    reply.redirect("/login");
    return undefined;
  }
  return user;
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<CurrentUser | undefined> {
  const current = await requireUser(request, reply);
  if (!current) {
    return undefined;
  }
  if (!current.user.isAdmin) {
    html(
      reply.code(403),
      layout({
        title: "Admin",
        user: current.user,
        body: errorPanel("Admin", "Admin access requires Aion account access level 9."),
      }),
    );
    return undefined;
  }
  return current;
}

function setSession(reply: FastifyReply, user: PortalUser): void {
  const sessionId = sessions.create(user.id);
  reply.setCookie("sid", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    signed: true,
    maxAge: 60 * 60 * 24 * 7,
  });
}

function html(reply: FastifyReply, content: string): FastifyReply {
  return reply.type("text/html; charset=utf-8").send(content);
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function ensureItemCatalogLoaded(): Promise<void> {
  await itemCatalogLoad;
}

type AdminItemSearchOptions = {
  q: string;
  category: string;
  quality: string;
  itemType: string;
  favoriteIds: Set<number>;
  limit: number;
};

function searchAdminItems(options: AdminItemSearchOptions): AdminItemResult[] {
  const query = options.q.trim().toLocaleLowerCase("en-US");
  const terms = query.split(/\s+/).filter(Boolean);
  const idQuery = /^\d+$/.test(query) ? Number.parseInt(query, 10) : undefined;

  return itemCatalog
    .allTemplates()
    .filter(template => !options.category || template.itemGroup === options.category)
    .filter(template => !options.quality || template.quality === options.quality)
    .filter(template => !options.itemType || template.itemType === options.itemType)
    .filter(template => {
      if (!query) {
        return true;
      }
      if (idQuery !== undefined && template.id === idQuery) {
        return true;
      }
      const haystack = `${template.name} ${template.cName ?? ""} ${template.id}`.toLocaleLowerCase("en-US");
      return terms.every(term => haystack.includes(term));
    })
    .sort((left, right) => {
      const favoriteDelta = Number(options.favoriteIds.has(right.id)) - Number(options.favoriteIds.has(left.id));
      if (favoriteDelta !== 0) {
        return favoriteDelta;
      }
      return left.name.localeCompare(right.name, "en-US") || left.id - right.id;
    })
    .slice(0, options.limit)
    .map(template => adminItemResult(template, options.favoriteIds));
}

type AdminItemResult = {
  id: number;
  name: string;
  cName: string | undefined;
  category: string | undefined;
  itemType: string | undefined;
  quality: string | undefined;
  level: number;
  maxStackCount: number;
  price: number;
  favorite: boolean;
  iconUrl: string;
};

function adminItemResult(template: ItemTemplateInfo, favoriteIds: Set<number>): AdminItemResult {
  return {
    id: template.id,
    name: template.name,
    cName: template.cName,
    category: template.itemGroup,
    itemType: template.itemType,
    quality: template.quality,
    level: template.level,
    maxStackCount: template.maxStackCount,
    price: template.price,
    favorite: favoriteIds.has(template.id),
    iconUrl: `/icons/item/${template.id}`,
  };
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en-US"));
}

function isPresent<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null && value !== "";
}

function formatIntegerString(value: string): string {
  try {
    return new Intl.NumberFormat("en-US").format(BigInt(value));
  } catch {
    return value;
  }
}
