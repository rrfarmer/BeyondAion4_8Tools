# Admin Utility Ideas

## Operating Principles

- Use live game-server HTTP/admin services when the action must update in-memory game state, notify online players, or run emulator business rules.
- Use direct DB reads for dashboards, search, reports, and inspection views.
- Use direct DB writes only for offline-safe utility state or after we are sure the running server will not hold stale state.
- Keep portal-only preferences and utility data in JSON files under `DATA_DIR`, not the game SQL database.

## Live API Candidates

- Express mail for items and Kinah through `SystemMailService.SendMail`.
- Online player actions: notify, kick, teleport to safe point, unstuck, move to bind point.
- Character/account service actions that affect loaded players: mailbox refresh, inventory refresh, warehouse refresh.
- Server broadcast messages and scheduled maintenance warnings.
- Reload operations for server-owned caches after changing data the server keeps in memory.

## DB/Read-Only Candidates

- Character lookup with account, level, class, race, location, online status, and last online.
- Account lookup with access level, activation, last IP, characters, and ban state.
- Inventory/warehouse/mailbox inspector with filters for item id, quality, bound state, and storage.
- Economy reports: top Kinah holders, expensive items, duplicate unique items, and high-value movement history.
- Broker reports: active listings, expired/settled rows, suspicious prices, and stale broker storage.
- Admin audit viewer for portal actions from JSONL audit files.

## Utility JSON Candidates

- Saved express-mail presets and bundles.

## Admin Panel Feature Ideas

- Mail templates for events, compensation, starter packs, and recovery workflows.
- Item bundle sender that expands a named pack into multiple mails.
- Character detail page that combines profile, online state, inventory, warehouse, mailbox, and broker summaries.
- Account detail page that groups all characters and account warehouse state.
- Stuck character helper with current map/coordinates, bind point, and live unstuck action.
- Item repair tools for invalid slots, impossible counts, missing item templates, and out-of-range warehouse rows.
- Bound/tradeability diagnostics before moving or mailing items.
- Economy safety checks before large Kinah grants.
- Online player dashboard with current online list, map, level, class, and admin-safe actions.

