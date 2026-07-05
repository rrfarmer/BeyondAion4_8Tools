# Progress

## 2026-07-02

- Chosen stack: Node.js + TypeScript + Fastify, separate from the `.NET` game/login/chat processes.
- Scope: inventory MVP only.
- Initial web password was separate from the Aion client password and stored in portal-local JSON with `scrypt`.
- Registration initially linked a portal user to an existing Aion account by account name.
- Implemented MVP route set:
  - `GET /register`, `POST /register`
  - `GET /login`, `POST /login`
  - `GET /characters`
  - `GET /characters/:id/inventory`
- Inventory view includes character inventory, regular warehouse, and account warehouse.
- Static item names are loaded from `game-server/data/static_data/items/item_templates.xml` by streaming parser.
- Local verification:
  - `npm install` completed with no reported vulnerabilities.
  - `npm run build` passed.
  - App started at `http://127.0.0.1:3000`.
  - `GET /health` returned `ok: true` and loaded `102009` item names.
  - Default DB smoke test failed because `127.0.0.1:3307` refused the connection. Start MySQL or update `.env`.
- Docker work:
  - Added `Dockerfile`.
  - Added portal `docker-compose.yml` that joins external network `aion_default`.
  - Portal container connects to Aion MySQL via `mysql:3306`.
  - Portal container mounts `../aion-server` read-only at `/aion-server` so item names can be loaded from static data.
- Live Docker MVP verification:
  - Started `aion-mysql` from `C:\Users\ryanf\Documents\GitHub\aion-server\docker\docker-compose.yml`.
  - Confirmed live DB contents: 1 account, 2 players, 33 inventory rows.
  - Found existing Aion account `rrfarmer` with characters `Farmer` and `Farmn`.
  - Built and started `aion-portal` container.
  - `GET /health` returned `ok: true` and loaded `102009` item names inside the container.
  - Registered a portal-local login for Aion account `rrfarmer`.
  - Verified `/characters` displays `Farmer` and `Farmn`.
  - Verified `/characters/104728/inventory` displays `Farmer` inventory with real DB items.
  - Verified a fresh portal login using the separate portal password can load the same inventory page.

## Security Notes

- This POC verifies that the Aion account exists, but it does not yet prove the registering browser user owns that Aion account.
- Before any real exposure, require `PORTAL_REGISTRATION_CODE` or replace registration with an admin/in-game linking token flow.
- Warehouse transfer mutations are limited to offline characters and supported warehouse locations to avoid live game-state conflicts.

## 2026-07-02 Iteration 2

- Changed character detail page from inventory-focused to warehouse-focused.
- Visible sections were:
  - Character Warehouse: `inventory.item_owner = character_id`, `item_location = 1`
  - Character Online Warehouse: `inventory.item_owner = character_id`, `item_location = 200`
  - Account Warehouse: `inventory.item_owner = account_id`, `item_location = 2`
  - Account Online Warehouse: `inventory.item_owner = account_id`, `item_location = 201`
- Current live DB only has `item_location = 0` rows, so all warehouse sections are expected to render empty until warehouse data or online warehouse data exists.
- Switched UI to dark mode.
- Added `/icons/item/:itemId` route.
- Icon route first serves cached files from `DATA_DIR/icons`.
- Live Codex fetching was later removed from this route; the route now only serves cached files or a local placeholder.
- If icon lookup fails, the route serves a built-in SVG placeholder.
- Local client probe:
  - Found likely icon archives at `C:\Program Files (x86)\Beyond Aion\Data\preset\icons\icons.pak` and `C:\Program Files (x86)\Beyond Aion\Textures\ui`.
  - The `.pak` archives are not regular tar/7z-readable archives.
  - Research found AION-Encdec as the likely extraction path for local client icons.
- Live verification:
  - Rebuilt and restarted `aion-portal`.
  - Verified `GET /characters/104728/warehouses` returns status 200.
  - Verified the page title and heading are `Farmer Warehouses`.
  - Verified the page renders all four requested sections.
  - Verified old `/characters/104728/inventory` redirects to `/characters/104728/warehouses`.
  - Verified cube inventory items are hidden from the warehouse page.
  - Verified dark mode CSS is present.
  - Verified `/icons/item/182400001` returns a cached `image/png` response.
  - Verified the icon cache contains `/app/data/icons/182400001.png` in the portal container volume.

## 2026-07-02 Iteration 3

- Split account warehouse out of the character warehouse page.
- Character warehouse route:
  - `GET /characters/:id/warehouses`
  - Shows only character-owned storage:
    - Character Warehouse: `inventory.item_owner = character_id`, `item_location = 1`
    - Character Online Warehouse: `inventory.item_owner = character_id`, `item_location = 200`
- Account warehouse route:
  - `GET /account/warehouses`
  - Shows only account-owned storage:
    - Account Warehouse: `inventory.item_owner = account_id`, `item_location = 2`
    - Account Online Warehouse: `inventory.item_owner = account_id`, `item_location = 201`
- The account warehouse is now linked from the top nav and the character list page instead of being nested under a character.

## Item Data and Icons

- Current item database source is `game-server/data/static_data/items/item_templates.xml`.
- The portal currently loads `102009` item templates from that XML at startup.
- The in-memory catalog now includes id, name, `cName`, quality, item group, level, mask, and max stack count.
- Good next step: materialize a portal item catalog table or JSON cache with item id, name, `cName`, quality, item group, level, masks, and later icon path.
- Current web icon behavior is local-cache-only:
  - `/icons/item/:itemId` checks `DATA_DIR/icons`.
  - If missing, it serves a built-in SVG placeholder.
  - The running web app does not fetch Codex or any external icon source live.
- Added a manual Codex cache warmer:
  - `npm run icons:cache-codex -- 182400001 1 1 0`
  - Positional args are `start-id limit concurrency delay-ms`.
  - Direct named args also work after build: `node dist/scripts/cacheCodexIcons.js --start-id 182400001 --limit 100 --concurrency 2 --delay-ms 250`.
  - The tool resumes naturally because it checks `DATA_DIR/icons` before fetching.
  - Default full run is `npm run icons:cache-codex`.
  - Default rate limit is `concurrency = 1`, `delayMs = 500`.
  - The tool writes `DATA_DIR/icon-cache-manifest.json`.
  - Manifest entries include status, item id/name, Codex page URL, remote icon path, final icon URL, local cache path, content type, byte size, timestamp, and error details.
  - This manual tool is the only Codex-fetching code path.
- Local bulk icon extraction is not implemented yet.
- Local client probe found likely icon archives in:
  - `C:\Program Files (x86)\Beyond Aion\Data\preset\icons\icons.pak`
  - `C:\Program Files (x86)\Beyond Aion\Textures\ui`
- These `.pak` files are not standard tar/7z-readable archives.
- Research found `Iswenzz/AION-Encdec` as the likely extraction tool for local `.pak` archives and encoded client XML/HTML.

## Transfer and Trash Notes

- Item transferring is implemented for whole-item warehouse moves only.
- Transfer route:
  - `GET /characters/:id/transfer`
  - `POST /characters/:id/transfer`
- Supported transfer storages:
  - Character Warehouse: `inventory.item_owner = character_id`, `item_location = 1`
  - Character Online Warehouse: `inventory.item_owner = character_id`, `item_location = 120`
  - Account Warehouse: `inventory.item_owner = account_id`, `item_location = 2`
  - Account Online Warehouse: `inventory.item_owner = account_id`, `item_location = 121`
- `120/121` replaced the original `200/201` idea because `inventory.item_location` is a signed `tinyint`.
- Transfer guards currently implemented:
  - Portal user must own the account and character.
  - Character must be offline.
  - Source item is selected with `FOR UPDATE`.
  - Source must still be in one of the supported warehouse locations.
  - Source `item_owner` must match the expected character or account owner for that storage.
  - Equipped items are blocked.
  - Kinah transfers are blocked.
  - Destination storage must be different from source storage.
  - Character warehouse targets require the item `STORABLE_IN_WH` mask.
  - Account warehouse targets require the item `STORABLE_IN_AWH` mask and `!is_soul_bound`.
  - Official character/account warehouses enforce base capacity; portal-only online warehouses are unbounded for now.
  - Destination slot is chosen server-side as the first free slot.
  - Transfer writes an audit line to `DATA_DIR/item-transfer-audit.jsonl`.
- Still not implemented:
  - Stack splitting.
  - Stack merging.
  - Moving directly from cube inventory.
  - Trash/delete.
  - A game-server command/API path that updates live in-memory state for online characters.
- Bound-item guard:
  - The DB column `inventory.is_soul_bound` is visible and displayed.
  - The authoritative account-warehouse rule in the converted game code is `IsStorableInAccWarehouse()`, which requires the account-warehouse item mask and `!IsSoulBound()`.
  - Character warehouse uses `IsStorableInWarehouse()`.
  - The future portal mutation path should reuse or mirror those exact rules, not rely only on `is_soul_bound`.
- Trash is not implemented.
- First trash version should be soft delete or recycle-bin style, not hard delete, with audit fields, restore support, and stricter quest/protected-item policy than the current `CanRemoveItem` placeholder in the converted game code.

## 2026-07-02 Iteration 4 Verification

- Rebuilt and restarted `aion-portal`.
- `GET /health` returned `ok: true`, `itemCatalogLoaded: true`, and `itemCatalogSize: 102009`.
- Verified `npm run build` passes.
- Verified Codex icon cache warmer with:
  - `npm run icons:cache-codex -- 182400001 1 1 0`
  - `node dist/scripts/cacheCodexIcons.js --start-id 182400001 --limit 1 --concurrency 1 --delay-ms 0`
- Verified transfer route by temporarily staging item object `104703` (`Minor Focus Agent`) into character warehouse, posting a move to account warehouse, confirming DB row became `item_owner = 1`, `item_location = 2`, and restoring the row.
- Verified account online warehouse transfer by temporarily staging the same item, posting a move to `item_location = 121`, confirming MySQL accepts the location, and restoring the row.
- Verified an audit line is written for transfer object `104703`.

## 2026-07-02 Iteration 5

- Removed all live external icon fetching from the running web app.
- `IconService` is now filesystem-only:
  - serves `DATA_DIR/icons/{itemId}.png` when present
  - otherwise serves the built-in SVG placeholder
- Removed `ICON_SOURCE` from runtime config and Docker Compose.
- Kept Codex fetching only in the manual cache warmer:
  - `src/scripts/cacheCodexIcons.ts`
  - `npm run icons:cache-codex -- 182400001 1 1 0`
- Verification:
  - `npm run build` passed.
  - No `fetch(` calls exist in compiled runtime files outside `dist/scripts`.
  - `GET /icons/item/999999999` returned `image/svg+xml` local placeholder.

## 2026-07-02 Iteration 6

- Upgraded `src/scripts/cacheCodexIcons.ts` to be manifest-backed for all-icons runs.
- Full scrape command:
  - `npm run icons:cache-codex`
- Bounded smoke test command:
  - `npm run icons:cache-codex -- 182400001 1 1 0`
- Direct named options after build:
  - `node dist/scripts/cacheCodexIcons.js --start-id 182400001 --limit 100 --concurrency 2 --delay-ms 250`
  - `--manifest <path>`
  - `--save-every <count>`
  - `--retry-missing`
  - `--no-retry-failed`
  - `--force`
- Verification:
  - `npm run build` passed.
  - Created a test manifest at `data/icon-cache-manifest-test.json`.
  - Verified cached resume behavior for item `182400001`.
  - Verified forced refetch for item `182400001`, including remote icon path `/items/icon_item_qina01.png` and local cached PNG metadata.

## 2026-07-02 Iteration 7

- Changed Docker persistence from a named Docker volume to a host bind mount:
  - Host: `C:\Users\ryanf\Documents\GitHub\aion-portal\data`
  - Container: `/app/data`
- This makes the scraper's `data/icons` output immediately reusable by the Docker app after a portal restart, without copying tens of thousands of icon files into a hidden Docker volume.
- Migration caveat: if portal users exist only in the old Docker volume, copy `/app/data/users.json` to `.\data\users.json` once before restarting with the bind mount.

## 2026-07-02 Iteration 8

- Added a read-only `/admin` panel.
- Admin access source of truth is `aion_ls.account_data.access_level`.
- A logged-in portal user is considered admin when their linked Aion account has `access_level >= 9`.
- The `Admin` nav link is shown only for admin users.
- Direct `/admin` requests are also guarded server-side and return 403 for non-admin users.
- Current panel shows account counts, active/admin account counts, character/online counts, inventory row counts, and a table of level 9+ accounts.
- Current live DB check showed account `rrfarmer` has `access_level = 0`, so it will not see the admin link until its Aion account level is raised.
- Updated `rrfarmer` to `access_level = 9` at the user's request.
- Added character lists grouped by game DB online status:
  - Online Characters
  - Offline Characters
- Character rows show character id/name, linked account id/name, race/class, status, and last online timestamp.

## 2026-07-02 Iteration 9

- Added admin-only one-item express mail delivery.
- Route:
  - `POST /admin/mail-items`
- UI:
  - `/admin` now includes an `Express Mail Item` form.
  - Recipient choices are populated from the admin character list.
- Mail persistence mirrors the converted server's system mail path:
  - `mail.express = 1`
  - `mail.attached_item_id = inventory.item_unique_id`
  - attached item stored in `inventory` with `item_location = 127`
  - recipient `players.mailbox_letters` is incremented
- Guards:
  - Admin access still requires linked Aion `account_data.access_level >= 9`.
  - Recipient must be an active character.
  - Item template must exist in `item_templates.xml`.
  - Count must be positive and no larger than the template max stack count.
  - Kinah-as-item is blocked for now because mail has a separate kinah field.
  - Mailbox count is checked before sending.
- Portal object IDs for admin mail are allocated from a high reserved range starting at `1900000000`, guarded by a MySQL named lock and the same invalid-ID bitmask used by the game server ID factory.
- Successful sends append audit JSONL to `DATA_DIR/admin-mail-audit.jsonl`.
- Limitation: this POC writes directly to MySQL. Online players may not receive the live in-memory express notification until the portal can call a game-server API/command path.

## 2026-07-03 Iteration 10

- Added a supervised Codex icon scraper runner:
  - `npm run icons:cache-codex-supervised`
- The supervised runner keeps long scrapes moving by launching bounded child-process chunks and clearing Node heap between chunks.
- Defaults:
  - `chunk-size = 5000`
  - `concurrency = 1`
  - `delayMs = 1000`
  - child heap `--max-old-space-size = 2048`
  - `max-retries = 20` per chunk
- Resume example after seeing last item id `112300431`:
  - `npm run icons:cache-codex-supervised -- --start-id 112300431 --chunk-size 5000 --concurrency 1 --delay-ms 1000`
- Added positional compatibility for npm/PowerShell argument forwarding:
  - `npm run icons:cache-codex-supervised -- 112300431 5000 1 1000`
- Existing downloaded icon files are skipped unless `--force` is supplied.

## 2026-07-03 Iteration 11

- Changed portal sign-in to authenticate against the real Aion login account password.
- Aion login password hash behavior mirrors login server source:
  - `Base64(SHA1(UTF-8 password))`
  - checked against `aion_ls.account_data.password`
- Aion account must be activated.
- Expired, penalty-banned, and `ip_force`-restricted accounts are rejected with the same broad policy as the login server.
- On successful game-account login, the portal reuses or auto-creates its local user/session record by `aionAccountId`.
- The portal does not store the game password.
- `/register` now redirects to `/login`; self-service portal password registration is no longer the primary flow.

## 2026-07-04 Iteration 12

- Polished warehouse management UI around slot grids instead of item tables.
- Transfer Workbench now renders two columns:
  - Game Warehouse
  - Online Warehouse
- Each column contains character-level and account-level storage panels.
- Drag/drop transfer is wired client-side:
  - dragging an item tile onto another warehouse panel submits the existing `POST /characters/:id/transfer` endpoint
  - dropping onto the same storage does nothing
  - the backend remains authoritative for ownership, offline-character, item mask, soulbound, Kinah, and capacity guards
- Warehouse pages and transfer pages now render items in Aion-style square slots with icon, stack count, enchant overlay, tooltip metadata, and overflow slot visibility.
- Game-side slot limits are now carried in the warehouse view model:
  - Character Warehouse base: 24 slots
  - Account Warehouse base: 16 slots
  - Warehouse row length: 8 slots
  - Normal character warehouse upgrade cap from `WarehouseService`: 11 expansions
  - Runtime character warehouse capacity follows the stored `players.wh_npc_expands + players.wh_bonus_expands` value, matching `Player.SetWarehouseLimit()`.
- Added shared `warehouseCapacity` helpers so UI slot counts and transfer capacity checks use the same game-derived capacity math.

## 2026-07-04 Iteration 13

- Added custom Aion-style item hover panels on warehouse slot items.
- Tooltip content is built from local/static item template data and inventory row state:
  - item name
  - grade/quality
  - item type/group
  - level, stack size, enchant, race, value, template id, object id
  - soulbound/equipped/storage eligibility flags
- Extended the local item catalog loader with more `item_templates.xml` attributes for tooltip display.
- Changed warehouse slot grids to render 8 columns wide to mirror the Aion warehouse visual layout.
- Kept backend capacity on the emulator source of truth:
  - `StorageType.ACCOUNT_WAREHOUSE(2, 16, 8)` in the game server
  - account warehouse remains 16 usable slots
  - the 8-wide UI shows account warehouse as two full rows

## 2026-07-04 Iteration 14

- Moved warehouse management to a single account-level `/warehouses` hub.
- Old warehouse routes now redirect to the hub:
  - `/account/warehouses`
  - `/characters/:id/warehouses`
  - `/characters/:id/transfer`
- Character warehouses are now character-agnostic from navigation: all account characters appear as tabs under one `Character Warehouse` section.
- Account Warehouse is cleaned up to show only the game-side account warehouse for this pass:
  - `item_location = 2`
  - 16 usable slots
- Removed drag/drop event handling from the warehouse UI.
- Added click-to-select item movement:
  - click an item tile once
  - click `Move selected -> Online` or `Move selected -> Game`
  - backend transfer guards are unchanged
- Tooltip behavior was changed to show instantly and open beside the item tile instead of underneath it.

## 2026-07-04 Iteration 15

- Removed the visible `/characters` page from the user flow:
  - authenticated root now redirects to `/warehouses`
  - login now redirects to `/warehouses`
  - `/characters` redirects to `/warehouses`
  - nav no longer links to `Characters`
- Removed `warehouses?characterId={id}` routing/state from the UI and redirects.
- Old character-specific routes still redirect to `/warehouses` for compatibility, but no longer preserve character id in the URL.
- Fixed capped warehouse slot rendering:
  - capped storage such as Account Warehouse renders only its configured usable slot count
  - Account Warehouse renders 16 cells, not a huge run of disabled cells
  - any item rows with out-of-range slots are summarized as overflow instead of expanding the grid

## 2026-07-04 Iteration 16

- Restored Account Online Warehouse on the `/warehouses` hub.
- Account Warehouse remains capped to 16 game-side slots.
- Fixed slot grid sizing so capped warehouses do not expand for high DB slot values, while uncapped online warehouses still render enough slots to show their occupied positions.

## 2026-07-04 Iteration 17

- Reworked `/warehouses` into a single Transfer Workbench per selected character.
- Each character tab now shows two columns:
  - Game Warehouse: Character Warehouse and Account Warehouse
  - Online Warehouse: Character Online Warehouse and Account Online Warehouse
- Account warehouse panels now have the same click-to-select move target buttons as character warehouse panels.
- Item tiles now expose valid target storage ids so the UI only enables legal destination buttons for the selected item.
- Capped destination capacity checks now ignore out-of-range legacy slot values when finding the next usable slot.

## 2026-07-04 Iteration 18

- Treated Kinah as warehouse money instead of a slotted item:
  - item template `182400001`
  - money storage slot `65535`, matching `ItemStorage.FIRST_AVAILABLE_SLOT`
- Warehouse section capacity and slot grids now exclude Kinah rows.
- Each warehouse panel renders a separate Kinah balance strip below the item slots.
- Added `POST /warehouses/kinah-transfer` to move a specified Kinah amount between character, account, and online warehouse money balances.
- Kinah transfer keeps the game database shape the emulator expects by debiting/crediting Kinah item counts and creating a destination Kinah row when needed.

## 2026-07-04 Iteration 19

- Aligned the workbench as direct two-column grid rows:
  - Character Warehouse and Character Online Warehouse share the first row.
  - Account Warehouse and Account Online Warehouse share the second row.
- Changed Kinah handling to account-only:
  - Character Warehouse and Character Online Warehouse no longer show Kinah controls.
  - Kinah transfer UI only targets Account Warehouse and Account Online Warehouse.
  - Backend rejects Kinah transfers involving character-owned storage.

## 2026-07-04 Iteration 20

- Expanded the admin Express Mail UI into a two-column mail workspace:
  - compose form on the left
  - local item search/favorites browser on the right
- Added local item catalog admin APIs:
  - `GET /admin/items/meta`
  - `GET /admin/items/search`
  - `GET /admin/items/favorites`
  - `POST /admin/items/favorites`
- Item search uses local `item_templates.xml` data only, not live Codex:
  - search by item id, name, and client name
  - filter by item group/category, item type, and quality
  - results include local item icons, level, stack size, quality, category, and type
- Added admin item favorites stored in `DATA_DIR/admin-item-favorites.json`, keyed per portal admin user.
- Selecting an item from search/favorites fills the Express Mail item id and applies the template max stack count to the count input.
