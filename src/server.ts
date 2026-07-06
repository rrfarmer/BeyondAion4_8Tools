import path from "node:path";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import { config } from "./config.js";
import { closeDbPools } from "./db.js";
import { AdminMailService } from "./adminMailService.js";
import {
  authenticateAionAccount,
  KINAH_ITEM_ID,
  loadAdminAccountDetailView,
  loadAdminBrokerReport,
  loadAdminCharacterDetailView,
  loadAdminDashboardView,
  loadAdminEconomyReport,
  loadAdminSearchResults,
  loadAionAccountAccessLevel,
  loadWarehouseHubView,
} from "./aionData.js";
import { AuthStore, type PortalUser } from "./authStore.js";
import { SessionStore } from "./sessions.js";
import { ItemCatalog, type ItemTemplateInfo } from "./itemCatalog.js";
import { IconService } from "./iconService.js";
import {
  adminDashboardPage,
  adminAccountDetailPage,
  adminCharacterDetailPage,
  adminSearchResultsPage,
  errorPanel,
  layout,
  loginPage,
  warehouseHubPage,
} from "./views.js";
import { WarehouseTransferService } from "./warehouseTransfer.js";
import { AdminItemFavoritesStore } from "./adminItemFavorites.js";
import {
  GameServerAdminError,
  GameServerAdminClient,
  type PlayerItemActionKind,
  type ReloadCacheTarget,
  type ValidateExpressMailBatchResult,
  type ValidatePlayerItemActionResult,
} from "./gameServerAdminClient.js";
import { AdminAuditLog, readRecentAuditEntries } from "./adminAudit.js";
import { AdminMailBundleStore, type AdminMailBundleEntry } from "./adminMailBundles.js";
import { AdminMailTemplateStore, type AdminMailTemplateKind } from "./adminMailTemplates.js";

const app = Fastify({ logger: true });
const authStore = new AuthStore(config.usersFile);
const sessions = new SessionStore();
const itemCatalog = new ItemCatalog(config.aionRepoRoot);
const iconService = new IconService(config.iconDir);
const itemTransferAuditPath = path.join(config.dataDir, "item-transfer-audit.jsonl");
const adminMailAuditPath = path.join(config.dataDir, "admin-mail-audit.jsonl");
const adminActionsAuditPath = path.join(config.dataDir, "admin-actions-audit.jsonl");
const MAX_ADMIN_MAIL_KINAH = 2_147_483_647n;
const ADMIN_RELOAD_TARGETS = ["announcements", "html", "item-restrictions"] as const;
const ADMIN_MESSAGE_SCOPES = ["all", "elyos", "asmodians"] as const;
type AdminMessageScope = typeof ADMIN_MESSAGE_SCOPES[number];
const gameServerAdmin = new GameServerAdminClient(config.gameServer);
const warehouseTransfers = new WarehouseTransferService(itemCatalog, itemTransferAuditPath, input =>
  gameServerAdmin.validateItemStorage(input),
  accountId => gameServerAdmin.getAccountState(accountId),
);
const adminMail = new AdminMailService(itemCatalog, adminMailAuditPath, gameServerAdmin);
const adminItemFavorites = new AdminItemFavoritesStore(path.join(config.dataDir, "admin-item-favorites.json"));
const adminMailBundles = new AdminMailBundleStore(path.join(config.dataDir, "admin-mail-bundles.json"));
const adminMailTemplates = new AdminMailTemplateStore(path.join(config.dataDir, "admin-mail-templates.json"));
const adminAudit = new AdminAuditLog(adminActionsAuditPath);

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
    await ensureItemCatalogLoaded();
    // The Economy Safety, Broker Report, Offline Characters, and Recent Admin Audit
    // sections are currently hidden (see adminDashboardPage), so their loaders
    // (loadAdminEconomyReport, loadAdminBrokerReport, readRecentAuditEntries) are
    // intentionally not called here to avoid running unused DB/file work on every
    // dashboard load. Restore them alongside the render lines to re-enable a section.
    const [view, mailBundles, mailTemplates] = await Promise.all([
      loadAdminDashboardView(),
      adminMailBundles.list(),
      adminMailTemplates.list(),
    ]);
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
        body: adminDashboardPage(view, notice, [], mailBundles, mailTemplates),
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

app.get("/admin/search", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const query = request.query as Record<string, string | undefined>;
  const rawQuery = typeof query.q === "string" ? query.q : "";

  try {
    const results = await loadAdminSearchResults(rawQuery);
    return html(
      reply,
      layout({
        title: rawQuery.trim() ? `Search: ${rawQuery.trim()}` : "Search",
        user: current.user,
        body: adminSearchResultsPage(results),
      }),
    );
  } catch (error) {
    return html(
      reply,
      layout({
        title: "Search",
        user: current.user,
        body: errorPanel("Search", `Could not run search: ${messageFor(error)}`),
      }),
    );
  }
});

app.get("/admin/characters/:id", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const { id } = request.params as { id: string };
  const characterId = Number.parseInt(id, 10);
  if (!Number.isInteger(characterId) || characterId <= 0) {
    return html(
      reply.code(400),
      layout({
        title: "Character Detail",
        user: current.user,
        body: errorPanel("Character Detail", "Character id is not valid."),
      }),
    );
  }

  try {
    await ensureItemCatalogLoaded();
    const view = await loadAdminCharacterDetailView(characterId, itemCatalog);
    if (!view) {
      return html(
        reply.code(404),
        layout({
          title: "Character Detail",
          user: current.user,
          body: errorPanel("Character Detail", "Character was not found."),
        }),
      );
    }
    const query = request.query as Record<string, string | undefined>;
    const notice = query.error
      ? { kind: "error" as const, message: query.error }
      : query.ok
        ? { kind: "success" as const, message: query.ok }
        : undefined;

    return html(
      reply,
      layout({
        title: `${view.character.name} Admin Detail`,
        user: current.user,
        body: adminCharacterDetailPage(view, notice),
      }),
    );
  } catch (error) {
    return html(
      reply,
      layout({
        title: "Character Detail",
        user: current.user,
        body: errorPanel("Character Detail", `Could not load character detail: ${messageFor(error)}`),
      }),
    );
  }
});

app.get("/admin/accounts/:id", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const { id } = request.params as { id: string };
  const accountId = Number.parseInt(id, 10);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return html(
      reply.code(400),
      layout({
        title: "Account Detail",
        user: current.user,
        body: errorPanel("Account Detail", "Account id is not valid."),
      }),
    );
  }

  try {
    await ensureItemCatalogLoaded();
    const view = await loadAdminAccountDetailView(accountId, itemCatalog);
    if (!view) {
      return html(
        reply.code(404),
        layout({
          title: "Account Detail",
          user: current.user,
          body: errorPanel("Account Detail", "Account was not found."),
        }),
      );
    }

    return html(
      reply,
      layout({
        title: `${view.account.name} Admin Detail`,
        user: current.user,
        body: adminAccountDetailPage(view),
      }),
    );
  } catch (error) {
    return html(
      reply,
      layout({
        title: "Account Detail",
        user: current.user,
        body: errorPanel("Account Detail", `Could not load account detail: ${messageFor(error)}`),
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

app.get("/admin/live/capabilities", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  try {
    return reply.send(await gameServerAdmin.getCapabilities());
  } catch (error) {
    return gameServerAdminFailure(reply, error, { endpoints: [] });
  }
});

app.get("/admin/live/online-players", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  try {
    return reply.send(await gameServerAdmin.listOnlinePlayers());
  } catch (error) {
    return gameServerAdminFailure(reply, error, { players: [] });
  }
});

app.get("/admin/live/account-state", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const query = request.query as Record<string, string | undefined>;
  const accountId = Number.parseInt(query.accountId ?? "", 10);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return reply.code(400).send({ ok: false, error: "Account id is not valid." });
  }

  try {
    return reply.send(await gameServerAdmin.getAccountState(accountId));
  } catch (error) {
    return gameServerAdminFailure(reply, error, {
      loaded: false,
      online: false,
      accountId,
      players: [],
    });
  }
});

app.get("/admin/live/player-state", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const query = request.query as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(query.recipientCharacterId ?? query.characterId ?? "", 10);
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }

  try {
    return reply.send(await gameServerAdmin.getPlayerState(recipientCharacterId));
  } catch (error) {
    return gameServerAdminFailure(reply, error, {
      online: false,
      recipientCharacterId,
    });
  }
});

app.get("/admin/live/player-storage-state", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const query = request.query as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(query.recipientCharacterId ?? query.characterId ?? "", 10);
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }

  try {
    return reply.send(await gameServerAdmin.getPlayerStorageState(recipientCharacterId));
  } catch (error) {
    return gameServerAdminFailure(reply, error, {
      online: false,
      recipientCharacterId,
    });
  }
});

app.post("/admin/live/notify-player", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const message = (body.message ?? "").trim();
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (!message || message.length > 1000) {
    return reply.code(400).send({ ok: false, error: "Message must be 1-1000 characters." });
  }

  try {
    const result = await gameServerAdmin.notifyPlayer({ recipientCharacterId, message });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_notify_player",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        delivered: result.delivered,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/kick-player", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const reason = (body.reason ?? "").trim();
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.kickPlayer({ recipientCharacterId, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_kick_player",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        disconnected: result.disconnected,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/move-to-bind-point", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const reason = (body.reason ?? "").trim();
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.moveToBindPoint({ recipientCharacterId, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_move_to_bind_point",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        moved: result.moved,
        from: result.from,
        to: result.to,
        destination: result.destination,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/move-to-instance-exit", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const reason = (body.reason ?? "").trim();
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.moveToInstanceExit({ recipientCharacterId, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_move_to_instance_exit",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        moved: result.moved,
        from: result.from,
        to: result.to,
        destination: result.destination,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/unstuck-player", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const reason = (body.reason ?? "").trim();
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.unstuckPlayer({ recipientCharacterId, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_unstuck_player",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        moved: result.moved,
        unstuckAction: result.action,
        from: result.from,
        to: result.to,
        destination: result.destination,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/refresh-mailbox", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const reason = (body.reason ?? "").trim();
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.refreshMailbox({ recipientCharacterId, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_refresh_mailbox",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        mailboxState: result.mailboxState,
        before: result.before,
        after: result.after,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/refresh-inventory", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const reason = (body.reason ?? "").trim();
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.refreshInventory({ recipientCharacterId, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_refresh_inventory",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        inventory: result.inventory,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/refresh-warehouse", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const reason = (body.reason ?? "").trim();
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.refreshWarehouse({ recipientCharacterId, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_refresh_warehouse",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        warehouse: result.warehouse,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/refresh-account-warehouse", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const accountId = Number.parseInt(body.accountId ?? "", 10);
  const reason = (body.reason ?? "").trim();
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return reply.code(400).send({ ok: false, error: "Account id is not valid." });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.refreshAccountWarehouse({ accountId, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_refresh_account_warehouse",
        via: "gameserver",
        accountId: result.accountId,
        accountName: result.accountName,
        refreshedCount: result.refreshedCount,
        players: result.players,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/validate-player-item-action", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = parseIntegerOrZero(body.recipientCharacterId);
  const itemUniqueId = parseIntegerOrZero(body.itemUniqueId);
  const storageId = parseIntegerOrZero(body.storageId);
  const action = parsePlayerItemActionKind(body.action);
  const targetCount = (body.targetCount ?? "").trim();
  let targetSlot: number | undefined;

  try {
    targetSlot = parseOptionalInteger(body.targetSlot, "Target slot");
  } catch (error) {
    return reply.code(400).send({ ok: false, error: messageFor(error) });
  }

  if (!action) {
    return reply.code(400).send({ ok: false, error: "Action must be discard, repair-slot, or repair-count." });
  }
  if (recipientCharacterId <= 0) {
    return reply.code(400).send({ ok: false, error: "Recipient character is not valid." });
  }
  if (itemUniqueId <= 0) {
    return reply.code(400).send({ ok: false, error: "Item object id is not valid." });
  }

  try {
    const result = await gameServerAdmin.validatePlayerItemAction({
      recipientCharacterId,
      itemUniqueId,
      storageId,
      action,
      targetSlot,
      targetCount,
    });
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/items/discard", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const itemUniqueId = Number.parseInt(body.itemUniqueId ?? "", 10);
  const storageId = Number.parseInt(body.storageId ?? "", 10);
  const reason = (body.reason ?? "admin-inspector-discard").trim();
  const redirectToCharacter = Number.isInteger(recipientCharacterId) && recipientCharacterId > 0
    ? `/admin/characters/${recipientCharacterId}`
    : "/admin";

  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.redirect(`/admin?error=${encodeURIComponent("Recipient character is not valid.")}`);
  }
  if (!Number.isInteger(itemUniqueId) || itemUniqueId <= 0) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Item object id is not valid.")}`);
  }
  if (!Number.isInteger(storageId) || storageId < 0) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Storage id is not valid.")}`);
  }
  if (reason.length > 200) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Reason must be 200 characters or fewer.")}`);
  }

  try {
    const preflight = await gameServerAdmin.validatePlayerItemAction({
      recipientCharacterId,
      itemUniqueId,
      storageId,
      action: "discard",
    });
    if (!preflight.valid) {
      throw new Error(playerItemActionPreflightError(preflight));
    }

    const result = await gameServerAdmin.discardPlayerItem({
      recipientCharacterId,
      itemUniqueId,
      storageId,
      reason,
    });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_discard_player_item",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        itemUniqueId: result.itemUniqueId,
        itemId: result.itemId,
        itemName: result.itemName,
        itemCount: result.itemCount,
        storageId: result.storageId,
        storageName: result.storageName,
        slot: result.slot,
        discarded: result.discarded,
        persisted: result.persisted,
        reason,
      })
      .catch(() => undefined);
    return reply.redirect(
      `${redirectToCharacter}?ok=${encodeURIComponent(
        `Discarded ${formatIntegerString(result.itemCount)} ${result.itemName || `item ${result.itemId}`} from ${result.recipientName}.`,
      )}`,
    );
  } catch (error) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent(messageFor(error))}`);
  }
});

app.post("/admin/items/repair-slot", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const itemUniqueId = Number.parseInt(body.itemUniqueId ?? "", 10);
  const storageId = Number.parseInt(body.storageId ?? "", 10);
  const reason = (body.reason ?? "admin-inspector-slot-repair").trim();
  const redirectToCharacter = Number.isInteger(recipientCharacterId) && recipientCharacterId > 0
    ? `/admin/characters/${recipientCharacterId}`
    : "/admin";

  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.redirect(`/admin?error=${encodeURIComponent("Recipient character is not valid.")}`);
  }
  if (!Number.isInteger(itemUniqueId) || itemUniqueId <= 0) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Item object id is not valid.")}`);
  }
  if (storageId !== 1 && storageId !== 2) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Slot repair only supports game warehouse storage.")}`);
  }
  if (reason.length > 200) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Reason must be 200 characters or fewer.")}`);
  }

  try {
    const preflight = await gameServerAdmin.validatePlayerItemAction({
      recipientCharacterId,
      itemUniqueId,
      storageId,
      action: "repair-slot",
    });
    if (!preflight.valid) {
      throw new Error(playerItemActionPreflightError(preflight));
    }

    const result = await gameServerAdmin.repairItemSlot({
      recipientCharacterId,
      itemUniqueId,
      storageId,
      reason,
    });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_repair_item_slot",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        itemUniqueId: result.itemUniqueId,
        itemId: result.itemId,
        itemName: result.itemName,
        itemCount: result.itemCount,
        storageId: result.storageId,
        storageName: result.storageName,
        previousSlot: result.previousSlot,
        slot: result.slot,
        changed: result.changed,
        persisted: result.persisted,
        warehouse: result.warehouse,
        reason,
      })
      .catch(() => undefined);
    return reply.redirect(
      `${redirectToCharacter}?ok=${encodeURIComponent(
        `Moved ${result.itemName || `item ${result.itemId}`} from slot ${result.previousSlot} to slot ${result.slot}.`,
      )}`,
    );
  } catch (error) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent(messageFor(error))}`);
  }
});

app.post("/admin/items/repair-count", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  const itemUniqueId = Number.parseInt(body.itemUniqueId ?? "", 10);
  const storageId = Number.parseInt(body.storageId ?? "", 10);
  const targetCount = (body.targetCount ?? "").trim();
  const reason = (body.reason ?? "admin-inspector-count-repair").trim();
  const redirectToCharacter = Number.isInteger(recipientCharacterId) && recipientCharacterId > 0
    ? `/admin/characters/${recipientCharacterId}`
    : "/admin";

  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.redirect(`/admin?error=${encodeURIComponent("Recipient character is not valid.")}`);
  }
  if (!Number.isInteger(itemUniqueId) || itemUniqueId <= 0) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Item object id is not valid.")}`);
  }
  if (storageId !== 0 && storageId !== 1 && storageId !== 2) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Count repair only supports live cube and game warehouse storage.")}`);
  }
  if (targetCount && !/^\d+$/.test(targetCount)) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Target count is not valid.")}`);
  }
  if (reason.length > 200) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent("Reason must be 200 characters or fewer.")}`);
  }

  try {
    const preflight = await gameServerAdmin.validatePlayerItemAction({
      recipientCharacterId,
      itemUniqueId,
      storageId,
      action: "repair-count",
      targetCount,
    });
    if (!preflight.valid) {
      throw new Error(playerItemActionPreflightError(preflight));
    }

    const result = await gameServerAdmin.repairItemCount({
      recipientCharacterId,
      itemUniqueId,
      storageId,
      targetCount,
      reason,
    });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_repair_item_count",
        via: "gameserver",
        recipientCharacterId: result.recipientCharacterId,
        recipientName: result.recipientName,
        itemUniqueId: result.itemUniqueId,
        itemId: result.itemId,
        itemName: result.itemName,
        previousCount: result.previousCount,
        itemCount: result.itemCount,
        maxStackCount: result.maxStackCount,
        storageId: result.storageId,
        storageName: result.storageName,
        changed: result.changed,
        persisted: result.persisted,
        inventory: result.inventory,
        warehouse: result.warehouse,
        reason,
      })
      .catch(() => undefined);
    return reply.redirect(
      `${redirectToCharacter}?ok=${encodeURIComponent(
        `Clamped ${result.itemName || `item ${result.itemId}`} from ${formatIntegerString(result.previousCount)} to ${formatIntegerString(result.itemCount)}.`,
      )}`,
    );
  } catch (error) {
    return reply.redirect(`${redirectToCharacter}?error=${encodeURIComponent(messageFor(error))}`);
  }
});

app.post("/admin/live/reload-cache", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const target = (body.target ?? "").trim().toLocaleLowerCase("en-US");
  const reason = (body.reason ?? "").trim();
  if (!isAdminReloadTarget(target)) {
    return reply.code(400).send({
      ok: false,
      error: "Reload target is not valid.",
      target,
      allowedTargets: ADMIN_RELOAD_TARGETS,
    });
  }
  if (reason.length > 200) {
    return reply.code(400).send({ ok: false, error: "Reason must be 200 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.reloadCache({ target, reason });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_reload_cache",
        via: "gameserver",
        target: result.target,
        detail: result.detail,
        itemCount: result.itemCount,
        reason,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/broadcast-message", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const scope = normalizeAdminMessageScope(body.scope);
  const message = (body.message ?? "").trim();
  if (!scope) {
    return reply.code(400).send({
      ok: false,
      error: "Scope must be all, elyos, or asmodians.",
      scope: (body.scope ?? "").trim().toLocaleLowerCase("en-US"),
      allowedScopes: ADMIN_MESSAGE_SCOPES,
    });
  }
  if (!message || message.length > 1000) {
    return reply.code(400).send({ ok: false, error: "Message must be 1-1000 characters." });
  }

  try {
    const result = await gameServerAdmin.broadcastMessage({ scope, message });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_broadcast_message",
        via: "gameserver",
        scope: result.scope,
        deliveredCount: result.deliveredCount,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/maintenance-warning", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const scope = normalizeAdminMessageScope(body.scope);
  const minutesUntilMaintenance = Number.parseInt(body.minutesUntilMaintenance ?? "", 10);
  const messageTemplate = (body.messageTemplate ?? "").trim();
  if (!scope) {
    return reply.code(400).send({
      ok: false,
      error: "Scope must be all, elyos, or asmodians.",
      scope: (body.scope ?? "").trim().toLocaleLowerCase("en-US"),
      allowedScopes: ADMIN_MESSAGE_SCOPES,
    });
  }
  if (!Number.isInteger(minutesUntilMaintenance) || minutesUntilMaintenance < 1 || minutesUntilMaintenance > 1440) {
    return reply.code(400).send({
      ok: false,
      error: "Minutes until maintenance must be between 1 and 1440.",
      minutesUntilMaintenance: Number.isFinite(minutesUntilMaintenance) ? minutesUntilMaintenance : 0,
      minMinutes: 1,
      maxMinutes: 1440,
    });
  }
  if (messageTemplate.length > 1000) {
    return reply.code(400).send({ ok: false, error: "Message template must be 1000 characters or fewer." });
  }

  try {
    const result = await gameServerAdmin.scheduleMaintenanceWarning({
      scope,
      minutesUntilMaintenance,
      messageTemplate,
    });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_live_maintenance_warning",
        via: "gameserver",
        scheduleId: result.scheduleId,
        scope: result.scope,
        minutesUntilMaintenance: result.minutesUntilMaintenance,
        warningCount: result.warningCount,
        warnings: result.warnings,
      })
      .catch(() => undefined);
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/validate-express-mail", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const mailKind = body.mailKind === "kinah" ? "kinah" : "item";
  const recipientCharacterId = parseIntegerOrZero(body.recipientCharacterId);
  const senderName = body.senderName ?? "";
  const title = body.title ?? "";
  const message = body.message ?? "";
  let itemId = 0;
  let itemCount = 0;
  let kinah = 0;

  try {
    if (mailKind === "kinah") {
      const kinahAmount = normalizePositiveIntegerText(body.kinahAmount ?? "", "Kinah amount", MAX_ADMIN_MAIL_KINAH);
      kinah = Number(kinahAmount);
    } else {
      itemId = parseIntegerOrZero(body.itemId);
      itemCount = parseIntegerOrZero(body.itemCount);
    }
  } catch (error) {
    return reply.code(400).send({ ok: false, error: messageFor(error) });
  }

  try {
    const result = await gameServerAdmin.validateExpressMail({
      recipientCharacterId,
      itemId,
      itemCount,
      kinah,
      senderName,
      title,
      message,
    });
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/validate-express-mail-batch", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, unknown>;
  const recipientCharacterId = parseIntegerOrZero(String(body.recipientCharacterId ?? ""));
  const entries = Array.isArray(body.entries)
    ? body.entries.map(entry => {
        const candidate = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
        const itemId = Number(candidate.itemId ?? 0);
        const itemCount = Number(candidate.itemCount ?? 0);
        const kinah = Number(candidate.kinah ?? 0);
        return {
          itemId: Number.isFinite(itemId) ? itemId : 0,
          itemCount: Number.isFinite(itemCount) ? itemCount : 0,
          kinah: Number.isFinite(kinah) ? kinah : 0,
        };
      })
    : [];

  try {
    const result = await gameServerAdmin.validateExpressMailBatch({
      recipientCharacterId,
      senderName: String(body.senderName ?? ""),
      title: String(body.title ?? ""),
      message: String(body.message ?? ""),
      entries,
    });
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
});

app.post("/admin/live/validate-item-storage", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const itemId = parseIntegerOrZero(body.itemId);
  const targetStorageId = parseIntegerOrZero(body.targetStorageId);
  const targetPolicy = body.targetPolicy === "characterWarehouse" || body.targetPolicy === "accountWarehouse"
    ? body.targetPolicy
    : "";
  const isSoulBound = body.isSoulBound === "true" || body.isSoulBound === "1" || body.isSoulBound === "on";
  const currentStorageId = parseIntegerOrZero(body.currentStorageId);
  const currentStorageLimit = parseIntegerOrZero(body.currentStorageLimit);

  try {
    const result = await gameServerAdmin.validateItemStorage({
      itemId,
      isSoulBound,
      targetStorageId,
      targetPolicy,
      itemCount: body.itemCount ?? "",
      currentStorageId,
      currentSlot: body.currentSlot ?? "",
      currentStorageLimit,
    });
    return reply.send(result);
  } catch (error) {
    return gameServerAdminFailure(reply, error);
  }
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

app.post("/admin/mail-templates", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  try {
    const mailKind: AdminMailTemplateKind = body.mailKind === "kinah" ? "kinah" : "item";
    const template = await adminMailTemplates.create({
      name: normalizeAdminText(body.name ?? "", "Template name", 80),
      mailKind,
      senderName: normalizeAdminText(body.senderName || "Aion Portal", "Sender", 16),
      title: normalizeAdminText(body.title || "Admin Delivery", "Title", 20),
      message: normalizeAdminText(body.message || "Admin delivery.", "Message", 1000),
    });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_mail_template_saved",
        via: "portal-json",
        templateId: template.id,
        templateName: template.name,
        mailKind: template.mailKind,
      })
      .catch(() => undefined);
    return reply.redirect(`/admin?ok=${encodeURIComponent(`Saved mail template ${template.name}.`)}`);
  } catch (error) {
    return reply.redirect(`/admin?error=${encodeURIComponent(messageFor(error))}`);
  }
});

app.post("/admin/mail-templates/delete", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const templateId = (body.templateId ?? "").trim();
  const deleted = await adminMailTemplates.delete(templateId);
  if (deleted) {
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_mail_template_deleted",
        via: "portal-json",
        templateId,
      })
      .catch(() => undefined);
  }
  return reply.redirect(
    `/admin?${deleted ? "ok" : "error"}=${encodeURIComponent(deleted ? "Deleted mail template." : "Mail template was not found.")}`,
  );
});

app.post("/admin/mail-bundles", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }
  await ensureItemCatalogLoaded();

  const body = request.body as Record<string, string | undefined>;
  try {
    const bundle = await adminMailBundles.create({
      name: normalizeAdminText(body.name ?? "", "Bundle name", 80),
      senderName: normalizeAdminText(body.senderName || "Aion Portal", "Sender", 16),
      title: normalizeAdminText(body.title || "Admin Delivery", "Title", 20),
      message: normalizeAdminText(body.message || "Admin delivery.", "Message", 1000),
      entries: parseMailBundleEntries(body.entries ?? ""),
    });
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_mail_bundle_saved",
        via: "portal-json",
        bundleId: bundle.id,
        bundleName: bundle.name,
        entryCount: bundle.entries.length,
      })
      .catch(() => undefined);
    return reply.redirect(`/admin?ok=${encodeURIComponent(`Saved mail bundle ${bundle.name}.`)}`);
  } catch (error) {
    return reply.redirect(`/admin?error=${encodeURIComponent(messageFor(error))}`);
  }
});

app.post("/admin/mail-bundles/delete", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const bundleId = (body.bundleId ?? "").trim();
  const deleted = await adminMailBundles.delete(bundleId);
  if (deleted) {
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_mail_bundle_deleted",
        via: "portal-json",
        bundleId,
      })
      .catch(() => undefined);
  }
  return reply.redirect(
    `/admin?${deleted ? "ok" : "error"}=${encodeURIComponent(deleted ? "Deleted mail bundle." : "Mail bundle was not found.")}`,
  );
});

app.post("/admin/mail-bundles/send", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }
  await ensureItemCatalogLoaded();

  const body = request.body as Record<string, string | undefined>;
  const bundleId = (body.bundleId ?? "").trim();
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);
  if (!Number.isInteger(recipientCharacterId) || recipientCharacterId <= 0) {
    return reply.redirect(`/admin?error=${encodeURIComponent("Recipient character is not valid.")}`);
  }

  const bundle = await adminMailBundles.get(bundleId);
  if (!bundle) {
    return reply.redirect(`/admin?error=${encodeURIComponent("Mail bundle was not found.")}`);
  }

  let sentCount = 0;
  let recipientName = String(recipientCharacterId);
  try {
    const result = await gameServerAdmin.sendExpressMailBatch({
      recipientCharacterId,
      senderName: bundle.senderName,
      title: bundle.title,
      message: bundle.message,
      entries: bundle.entries.map(mailBundleEntryPreflightPayload),
    });
    recipientName = result.recipientName || recipientName;
    sentCount = result.sentCount;

    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_express_mail_bundle",
        via: "gameserver",
        bundleId: bundle.id,
        bundleName: bundle.name,
        recipientCharacterId,
        recipientName,
        sentCount,
        entryCount: bundle.entries.length,
        sentEntries: result.sentEntries,
        warnings: result.warnings,
      })
      .catch(() => undefined);
    return reply.redirect(
      `/admin?ok=${encodeURIComponent(`Sent ${sentCount} express mail bundle letter${sentCount === 1 ? "" : "s"} to ${recipientName}.`)}`,
    );
  } catch (error) {
    const batchFailure = gameServerAdminBatchFailure(error);
    if (batchFailure) {
      sentCount = batchFailure.sentCount ?? sentCount;
      recipientName = batchFailure.recipientName || recipientName;
    }
    await adminAudit
      .append({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        action: "admin_express_mail_bundle_failed",
        via: "gameserver",
        bundleId: bundle.id,
        bundleName: bundle.name,
        recipientCharacterId,
        recipientName,
        sentCount,
        entryCount: bundle.entries.length,
        sentEntries: batchFailure?.sentEntries,
        failedEntry: batchFailure?.failedEntry,
        error: messageFor(error),
      })
      .catch(() => undefined);
    const progressText = sentCount > 0 ? ` after ${sentCount}/${bundle.entries.length} letters` : "";
    return reply.redirect(
      `/admin?error=${encodeURIComponent(
        `Bundle failed${progressText}: ${messageFor(error)}`,
      )}`,
    );
  }
});

app.post("/admin/mail-items", async (request, reply) => {
  const current = await requireAdmin(request, reply);
  if (!current) {
    return;
  }

  const body = request.body as Record<string, string | undefined>;
  const mailKind = body.mailKind === "kinah" ? "kinah" : "item";
  const recipientCharacterId = Number.parseInt(body.recipientCharacterId ?? "", 10);

  try {
    if (mailKind === "kinah") {
      const result = await adminMail.sendKinahMail({
        adminPortalUserId: current.user.id,
        adminUsername: current.user.username,
        recipientCharacterId,
        kinahAmount: body.kinahAmount ?? "",
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
          `Sent ${formatIntegerString(result.kinahAmount)} Kinah to ${result.recipientName} by express mail. ${deliveryNote}`,
        )}`,
      );
    }

    const itemId = Number.parseInt(body.itemId ?? "", 10);
    const itemCount = Number.parseInt(body.itemCount ?? "", 10);
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

function gameServerAdminFailure(
  reply: FastifyReply,
  error: unknown,
  fallback: Record<string, unknown> = {},
): FastifyReply {
  if (error instanceof GameServerAdminError && error.payload && typeof error.payload === "object") {
    const status = error.status && error.status >= 400 && error.status <= 599 ? error.status : 502;
    const payload = error.payload as Record<string, unknown>;
    const errorMessage = typeof payload.error === "string" && payload.error ? payload.error : messageFor(error);
    return reply.code(status).send({
      ...fallback,
      ...payload,
      ok: false,
      error: errorMessage,
    });
  }

  return reply.code(502).send({
    ...fallback,
    ok: false,
    error: messageFor(error),
  });
}

function isAdminReloadTarget(value: string): value is ReloadCacheTarget {
  return (ADMIN_RELOAD_TARGETS as readonly string[]).includes(value);
}

function normalizeAdminMessageScope(value: string | undefined): AdminMessageScope | undefined {
  const normalized = (value ?? "").trim().toLocaleLowerCase("en-US");
  const canonical = normalized === "asmo" ? "asmodians" : normalized || "all";
  return (ADMIN_MESSAGE_SCOPES as readonly string[]).includes(canonical)
    ? (canonical as AdminMessageScope)
    : undefined;
}

function normalizeAdminText(value: string, label: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

function parseMailBundleEntries(raw: string): AdminMailBundleEntry[] {
  const entries: AdminMailBundleEntry[] = [];
  const lines = raw.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const normalized = line.split("#", 1)[0]?.trim() ?? "";
    if (!normalized) {
      continue;
    }

    const parts = normalized.split(/\s+/);
    const command = parts[0]?.toLocaleLowerCase("en-US");
    if (command === "kinah") {
      const kinahAmount = normalizePositiveIntegerText(parts[1] ?? "", `Line ${index + 1} Kinah amount`, MAX_ADMIN_MAIL_KINAH);
      entries.push({ kind: "kinah", kinahAmount });
      continue;
    }

    const itemOffset = command === "item" ? 1 : 0;
    const itemId = Number.parseInt(parts[itemOffset] ?? "", 10);
    const itemCount = Number.parseInt(parts[itemOffset + 1] ?? "1", 10);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new Error(`Line ${index + 1} item id is not valid.`);
    }
    if (itemId === KINAH_ITEM_ID) {
      throw new Error(`Line ${index + 1} uses the Kinah item template; use "kinah <amount>" instead.`);
    }
    if (!Number.isInteger(itemCount) || itemCount <= 0 || itemCount > 2_147_483_647) {
      throw new Error(`Line ${index + 1} item count is not valid.`);
    }
    const template = itemCatalog.templateFor(itemId);
    if (!template) {
      throw new Error(`Line ${index + 1} item template ${itemId} was not found.`);
    }
    const maxStackCount = Math.max(template.maxStackCount, 1);
    if (itemCount > maxStackCount) {
      throw new Error(`Line ${index + 1} item count exceeds ${template.name}'s max stack count of ${maxStackCount}.`);
    }
    entries.push({ kind: "item", itemId, itemCount });
  }

  if (entries.length === 0) {
    throw new Error("Bundle entries are required.");
  }
  if (entries.length > 20) {
    throw new Error("Mail bundles are limited to 20 letters.");
  }
  return entries;
}

function mailBundleEntryPreflightPayload(entry: AdminMailBundleEntry): {
  itemId: number;
  itemCount: number;
  kinah: number;
} {
  if (entry.kind === "item") {
    return {
      itemId: entry.itemId,
      itemCount: entry.itemCount,
      kinah: 0,
    };
  }

  return {
    itemId: 0,
    itemCount: 0,
    kinah: Number(entry.kinahAmount),
  };
}

function mailBundlePreflightError(preflight: ValidateExpressMailBatchResult): string {
  const messages = [
    ...preflight.errors,
    ...preflight.entries.flatMap(entry =>
      entry.valid ? [] : entry.errors.map(error => `Entry ${entry.index + 1}: ${error}`),
    ),
  ].filter(Boolean);
  return `Bundle preflight failed before sending any letters.${messages.length ? ` ${messages.join(" ")}` : ""}`;
}

function playerItemActionPreflightError(preflight: ValidatePlayerItemActionResult): string {
  const itemLabel = preflight.itemName
    || (preflight.itemId > 0 ? `item ${preflight.itemId}` : `item object ${preflight.itemUniqueId}`);
  const messages = [...preflight.errors, ...preflight.warnings].filter(Boolean);
  return `Live item action preflight failed for ${itemLabel}.${messages.length ? ` ${messages.join(" ")}` : ""}`;
}

function gameServerAdminBatchFailure(error: unknown):
  | { sentCount?: number; recipientName?: string; sentEntries?: unknown[]; failedEntry?: unknown }
  | undefined {
  if (!(error instanceof GameServerAdminError) || !error.payload || typeof error.payload !== "object") {
    return undefined;
  }

  const payload = error.payload as Record<string, unknown>;
  return {
    sentCount: safeInteger(payload.sentCount),
    recipientName: typeof payload.recipientName === "string" ? payload.recipientName : undefined,
    sentEntries: Array.isArray(payload.sentEntries) ? payload.sentEntries : undefined,
    failedEntry: payload.failedEntry,
  };
}

function parsePlayerItemActionKind(value: string | undefined): PlayerItemActionKind | undefined {
  if (value === "discard" || value === "repair-slot" || value === "repair-count") {
    return value;
  }
  return undefined;
}

function parseOptionalInteger(value: string | undefined, label: string): number | undefined {
  const normalized = (value ?? "").trim();
  if (!normalized) {
    return undefined;
  }
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`${label} is not a valid integer.`);
  }
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} is not a safe integer.`);
  }
  return parsed;
}

function normalizePositiveIntegerText(value: string, label: string, maxValue: bigint): string {
  const normalized = value.trim().replace(/[,_\s]/g, "");
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a positive whole number.`);
  }

  const parsed = BigInt(normalized);
  if (parsed <= 0n) {
    throw new Error(`${label} must be greater than zero.`);
  }
  if (parsed > maxValue) {
    throw new Error(`${label} is too large.`);
  }

  return parsed.toString();
}

function parseIntegerOrZero(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) ? parsed : 0;
}

function safeInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
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
