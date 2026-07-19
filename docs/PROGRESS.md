# Progress

## 2026-07-19 Iteration 101

- Added an inline patrol-path editor to the NPC spawn map: existing routes can be edited, redrawn, ground-snapped, and reviewed without leaving the selected spawn.
- Added click-to-draw route creation for editable spawns without a `walker_id`; the spawn position seeds the path and every map-picked point resolves terrain Z before it is accepted.
- Added waypoint selection and map movement, manual X/Y/Z and pause editing, point deletion, loop behavior controls, bulk terrain snapping, runtime `WALK_BACK` previews, and shared-route warnings.
- Added authenticated validation/apply APIs for route updates and creation, plus optional new-route assignment to the selected spawn.
- New-route applies preflight the spawn assignment before writing route XML; the unlikely route-saved/assignment-failed race remains explicit, visible after reload, and audit-recorded as a partial apply.
- Walker persistence now preserves unrelated XML and route formation attributes, writes only authored steps, rejects stale source revisions, verifies serialized output, creates a pre-change backup, and atomically replaces the owning XML. New routes are appended to `custom_npc_walker.xml`.
- Docker now mounts `npc_walker` read/write. Walker backups are stored under `DATA_DIR/walker-editor-backups`, and route applies are recorded in the JSONL admin audit.
- Added service coverage for updates, route creation, duplicate and stale rejection, backups, CRLF and unrelated-route preservation, formation attributes, and spawn `walker_id` assignment.

## 2026-07-19 Iteration 100

- Added a recursive walker-route catalog matching the .NET server's sorted `npc_walker` load order, default loop behavior, `WALK_BACK` runtime expansion, and formation normalization.
- Added an authenticated, map-aware walker API that enriches authored and effective waypoints with cached terrain Z and route/terrain deltas.
- Selecting a spawn with `walker_id` now automatically fits and draws its patrol path with numbered authored waypoints, runtime closure, route metadata, source XML, and terrain-mismatch highlighting.
- Confirmed the reported Gray Mane Scratcher route has 19 waypoints and eight airborne points between 11.6m and 14.9m above terrain.
- Added fixture coverage for recursive sources, loop types, walk-back expansion, duplicate-id load order, formation handling, and unknown routes; verified the real 6,449-route catalog in Docker.

## 2026-07-19 Iteration 99

- Added lazy, cached decoding of the .NET server's prepared 16-bit terrain PNGs, including comma-shared map files and Aion-compatible two-meter triangle interpolation.
- Added an authenticated ground-height API and automatic Z resolution after map picks or debounced X/Y edits, plus explicit Snap to ground controls and manual fallback states.
- Kept geometry-only, missing-surface, and failed lookups non-destructive: existing/manual Z values remain untouched and the editor explains that manual input is required.
- Mounted `BeyondAionSharp/game-server/data/geo` read-only in Docker. Verified real Ishalgen lookups against existing spawn XML and added fixture coverage for both terrain triangles, shared files, missing maps, and absent terrain.

## 2026-07-18 Iteration 98

- Expanded the NPC spawn editor from hard-coded Ishalgen support to all 43 distinct map ids found recursively in the .NET `Npcs` spawn tree.
- Added a repeatable, local-only client map builder (`scripts/cache_client_maps.py`): 49 generated layers totaling about 41.5 MB, with detailed map-window artwork for 32 maps, real radar artwork for 2 maps, and coordinate-grid fallbacks for 9 maps whose artwork is absent from the installed client.
- Corrected plotting to use the exact `zonemap.xml` calibration transform, including non-zero offsets and map extents for Ishalgen, Altgard, Poeta, Sanctum, Pandaemonium, and the academy/lobby maps.
- Added map switching, URL-selected maps, multi-layer Abyss backgrounds, local-artwork labels, calibrated click placement, and source-file details in the dark editor UI.
- Aggregated base and `Custom` XML sources plus repeated `<spawn_map>` blocks. Marker keys retain source ownership; creates target an existing writable group or the base map source.
- Added composite revisions and rollback-capable multi-file applies with one pre-change backup per touched XML. Admin audit records now use the selected map and retain all touched source/backup paths.
- Kept the malformed Belus `z="NaN"` spawn visible as a repairable warning instead of failing the entire map.
- Verified all 43 real snapshots: 12,290 groups and 81,886 spots. Unit tests cover single-source writes, group recreation, repeated map blocks, and atomic two-source applies.

## 2026-07-18 Iteration 97

- Corrected Ishalgen's map projection from direct `x/y` plotting to the client projection: image pixel `[gameY, gameX]`.
- Added the client-declared Ishalgen viewport (`740,0` at `2300x2300`) so the editor opens on the playable map area instead of the full unused texture extent.
- Updated marker placement, random-walk overlays, heading indicators, and map-click coordinate capture to use the same reversible projection.
- Switched the committed image to the locally installed client's newer map-window package at `Textures/ui/newmap/df1/df1.pak`; the minimap/radar tile set remains separate and is not used.

## 2026-07-18 Iteration 96

- Added a level-9 Ishalgen NPC/Mob Spawn Editor at `/admin/spawns`.
- Parsed the authoritative `.NET` repository source `220010000_Ishalgen.xml` and the 63,287-template NPC catalog; no live game-server mutation is used.
- Added map hover/search/filtering, placement inspection, staged coordinate updates, deletion, NPC search, and new placement.
- Added review/apply with coordinate and special-spawn guards, stale-revision rejection, verified atomic XML replacement, pre-write backups, and JSONL admin audit.
- Extracted and committed the 3072x3072 Ishalgen map from the local client's `df1.pak`; runtime map access is local-only.
- Docker now mounts the BeyondAionSharp NPC spawn directory read/write and NPC templates read-only so portal edits remain in the host checkout for the next game-server build.
- Fixture tests cover validation-only behavior, create/update/delete, static spawn protection, stale revisions, group removal/recreation, backups, and CRLF preservation.

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

## 2026-07-05 Iteration 21

- Added `docs/ADMIN_IDEAS.md` for admin utility ideas and the live-vs-DB boundary.
- Express Mail now has explicit Item and Kinah modes in the admin UI.
- Kinah express mail submits through the game-server admin HTTP endpoint and uses the mail Kinah attachment field, not the Kinah item template.
- Portal audit JSONL now records item express mail and Kinah express mail as separate actions.
- The .NET game-server admin HTTP endpoint now accepts Kinah-only express mail while still rejecting empty mail payloads.

## 2026-07-05 Iteration 22

- Started the live admin action pattern from `docs/ADMIN_IDEAS.md` with a live online-player dashboard.
- Added authenticated `.NET` game-server admin route:
  - `GET /admin/online-players`
  - reads from the running `World.GetAllPlayers()` container, not SQL
  - returns live character/account/class/world/instance/position fields
- Refactored the `.NET` admin HTTP service routing so live reads and express-mail mutations are separate authenticated routes.
- Added portal backend proxy route:
  - `GET /admin/live/online-players`
  - keeps the game-server admin token server-side
- Added an Admin panel `Live Online Players` section with refresh and unavailable states.

## 2026-07-05 Iteration 23

- Expanded the live admin HTTP pattern with player-facing live messages.
- Added authenticated `.NET` game-server admin routes:
  - `POST /admin/notify-player`
  - `POST /admin/broadcast-message`
- Both routes send through `PacketSendUtility.SendMessage(..., ChatType.BRIGHT_YELLOW_CENTER)` so messages are delivered by the running game server.
- Added portal backend proxy routes:
  - `POST /admin/live/notify-player`
  - `POST /admin/live/broadcast-message`
- Added JSONL auditing for live admin actions in `DATA_DIR/admin-actions-audit.jsonl`.
- Added Admin panel controls for notifying a selected live player and broadcasting to all/Elyos/Asmodians.

## 2026-07-05 Iteration 24

- Polished the admin Express Mail compose form so Item and Kinah modes show only the relevant attachment controls.
- Item mode shows item template/count fields and the local item search/favorites browser.
- Kinah mode hides item controls/browser, enables only the Kinah amount field, and changes the submit label to `Send Kinah mail`.

## 2026-07-05 Iteration 25

- Added the next live admin action from `docs/ADMIN_IDEAS.md`: kick/disconnect an online player.
- Added authenticated `.NET` game-server admin route:
  - `POST /admin/kick-player`
  - resolves the live player from the running world
  - disconnects with the same `SM_SYSTEM_MESSAGE.STR_KICK_CHARACTER()` packet used by the existing in-game admin kick command
- Added portal backend proxy route:
  - `POST /admin/live/kick-player`
  - keeps the game-server admin token server-side
  - writes a JSONL audit entry with the target and optional reason
- Added an Admin panel Kick control in the `Live Online Players` section with browser confirmation and post-action refresh.

## 2026-07-05 Iteration 26

- Added the first stuck-character helper action from `docs/ADMIN_IDEAS.md`: move an online player to their bind point.
- Added authenticated `.NET` game-server admin route:
  - `POST /admin/move-to-bind-point`
  - resolves the live player from the running world
  - calls `TeleportService.MoveToBindLocation(player)` so the game server chooses the saved obelisk bind point or the initial-spawn fallback
- Expanded `GET /admin/online-players` to include the server-computed bind destination for each live player.
- Added portal backend proxy route:
  - `POST /admin/live/move-to-bind-point`
  - keeps the game-server admin token server-side
  - writes a JSONL audit entry with source/destination and optional reason
- Added an Admin panel `Move to Bind` control with confirmation, destination context in the live player table, and post-action refresh.

## 2026-07-05 Iteration 27

- Added scheduled maintenance warnings from `docs/ADMIN_IDEAS.md`.
- Added authenticated `.NET` game-server admin route:
  - `POST /admin/maintenance-warning`
  - validates scope and 1-1440 minute countdowns
  - schedules standard countdown warnings through `ThreadPoolManager` on the running game server
  - broadcasts to players who are online at each warning time, not just players online when the portal request was made
- Reused the live broadcast delivery helper so immediate broadcasts and scheduled maintenance warnings share the same race-scope behavior.
- Added portal backend proxy route:
  - `POST /admin/live/maintenance-warning`
  - keeps the game-server admin token server-side
  - writes a JSONL audit entry with the schedule id and warning plan
- Added an Admin panel `Schedule Warning` control with scope, countdown minutes, and a `{minutes}` / `{minuteLabel}` message template.

## 2026-07-05 Iteration 28

- Tightened the Express Mail form mode toggle.
- The Item/Kinah switch now initializes from the mail form itself instead of depending on the item browser setup.
- Switching to Item mode hides Kinah-only controls and enables item template/count validation.
- Switching to Kinah mode hides the item controls/browser and enables only the Kinah amount validation.

## 2026-07-05 Iteration 29

- Added a live mailbox refresh admin action from `docs/ADMIN_IDEAS.md`.
- Added authenticated `.NET` game-server admin route:
  - `POST /admin/refresh-mailbox`
  - resolves an online player from the running world
  - reloads the mailbox through `MailDAO.LoadPlayerMailbox`
  - preserves the player's current mailbox/postman UI state
  - sends `SM_MAIL_SERVICE` and refreshes the visible mail list if the mailbox is open
- Added portal backend proxy route:
  - `POST /admin/live/refresh-mailbox`
  - keeps the game-server admin token server-side
  - writes a JSONL audit entry with before/after mailbox counts
- Added an Admin panel `Refresh Mailbox` control in the `Live Online Players` section.

## 2026-07-05 Iteration 30

- Added a second safe movement live admin action for stuck-instance cases.
- Added authenticated `.NET` game-server admin route:
  - `POST /admin/move-to-instance-exit`
  - resolves an online player from the running world
  - uses `TeleportService.MoveToInstanceExit(player, player.GetWorldId(), player.GetRace())`
  - reports the destination as an `instance-exit` when configured or `bind-fallback` when the server falls back to bind-point behavior
- Added portal backend proxy route:
  - `POST /admin/live/move-to-instance-exit`
  - keeps the game-server admin token server-side
  - writes a JSONL audit entry with source/destination and optional reason
- Added an Admin panel `Move to Exit` control in the `Live Online Players` section.

## 2026-07-05 Iteration 31

- Added safe live packet-refresh actions for loaded players without reloading item rows from SQL.
- Added authenticated `.NET` game-server admin routes:
  - `POST /admin/refresh-inventory`
  - `POST /admin/refresh-warehouse`
- Inventory refresh resends the current in-memory cube/equipment/Kinah packet stream through `SM_INVENTORY_INFO` and updates cube size with `SM_CUBE_UPDATE`.
- Warehouse refresh resends the current in-memory character/account warehouse packet stream through `WarehouseService.SendWarehouseInfo(player, true)` and updates regular warehouse size with `SM_CUBE_UPDATE`.
- Added portal backend proxy routes:
  - `POST /admin/live/refresh-inventory`
  - `POST /admin/live/refresh-warehouse`
  - both keep the game-server admin token server-side and write JSONL audit records with returned in-memory counts
- Added Admin panel `Refresh Inventory` and `Refresh Warehouse` controls in the `Live Online Players` section.

## 2026-07-05 Iteration 32

- Added a constrained live server reload action for server-owned caches.
- Added authenticated `.NET` game-server admin route:
  - `POST /admin/reload-cache`
  - accepts only `announcements`, `html`, or `item-restrictions`
  - calls `AnnouncementService.Reload()`, `HTMLCache.Reload(true)`, or `AdminService.Reload()` respectively
- Added portal backend proxy route:
  - `POST /admin/live/reload-cache`
  - validates the target enum before forwarding
  - keeps the game-server admin token server-side
  - writes a JSONL audit entry with target/detail/reason
- Added an Admin panel `Reload` control for those cache targets.

## 2026-07-05 Iteration 33

- Added a read-only Admin Audit viewer backed by portal JSONL files.
- Added a JSONL audit reader that:
  - reads `admin-actions-audit.jsonl`, `admin-mail-audit.jsonl`, and `item-transfer-audit.jsonl`
  - tolerates missing files and malformed lines
  - merges entries by timestamp and returns the latest 60
- The `/admin` dashboard now loads audit entries alongside the DB snapshot.
- Added a `Recent Admin Audit` panel showing time, action, admin, source audit file, and compact JSON details.

## 2026-07-05 Iteration 34

- Added portal-local JSON saved mail bundles for the admin Express Mail tool.
- Added `DATA_DIR/admin-mail-bundles.json` storage through `AdminMailBundleStore`; no game SQL tables are used.
- Bundle entries support:
  - `item <templateId> <count>`
  - `<templateId> <count>`
  - `kinah <amount>`
- Bundle creation validates item templates, stack counts, Kinah format, sender/title/message lengths, and caps bundles at 20 express letters.
- Bundle delivery sends each entry through the existing live game-server express-mail HTTP path (`SystemMailService.SendMail` on the .NET server), one letter per entry.
- Added Admin panel `Mail Bundles` controls for saving, sending, and deleting bundles.
- Added JSONL audit entries for bundle save/delete/send/failure.

## 2026-07-05 Iteration 35

- Reworked the Admin Express Mail form so item delivery fields and Kinah delivery fields live in separate mode sections.
- The item browser, selected-item preview, item template id, and item count now only show for item mail.
- The Kinah amount and Kinah delivery note now only show for Kinah mail.
- Added a CSS radio-state fallback in addition to the existing JavaScript mode sync, so the visible form section tracks the selected mail type more reliably.

## 2026-07-05 Iteration 36

- Added the first read-only character detail inspector from `docs/ADMIN_IDEAS.md`.
- Admin character names now link to `/admin/characters/:id`.
- The detail page shows:
  - profile/account/world/coordinate state from `players`
  - character-owned inventory, warehouse, online warehouse, broker storage, and mailbox storage rows
  - account warehouse and account online warehouse rows
  - latest mailbox rows
  - broker listings
- Added diagnostics for missing item templates, invalid item/Kinah counts, and out-of-range game warehouse slots.

## 2026-07-05 Iteration 37

- Added a character-context `Stuck Helper` panel to the admin character detail page.
- The panel uses existing portal live proxy routes so the game-server admin token stays server-side.
- Online characters can now be acted on directly from their detail page:
  - move to instance exit / bind fallback
  - move to bind point
  - refresh inventory packets
  - refresh warehouse packets
  - refresh mailbox state
- These actions still execute through the .NET `AdminHttpService` endpoints; no direct DB writes are used.

## 2026-07-05 Iteration 38

- Added the first read-only account detail inspector from `docs/ADMIN_IDEAS.md`.
- Admin account names now link to `/admin/accounts/:id`.
- Character rows now link account names back to the account inspector.
- The account detail page shows:
  - login-server account profile and account-time state
  - login-blocked summary from activation, expiration, penalty, and matching active bans
  - matching IP/MAC/HDD ban evidence from login-server ban tables
  - all active characters on the account
  - account warehouse and account online warehouse rows
  - latest login history rows
- No direct DB writes are used by the account inspector.

## 2026-07-05 Iteration 39

- Added the first read-only `Economy Safety` dashboard section from `docs/ADMIN_IDEAS.md`.
- The admin dashboard now reports:
  - top accounts by total Kinah across character-owned and account-owned storage
  - top characters by character-owned Kinah
  - highest broker listings with seller/account links
  - largest Kinah mail attachments with recipient/account links
- Economy amounts stay as strings/BigInt in the portal to avoid precision loss on large balances.
- Account warehouse Kinah aggregation uses a grouped account-name subquery so account-owned rows are not multiplied by character count.
- This is read-only reporting only; no game SQL writes or live mutations are performed.

## 2026-07-05 Iteration 40

- Added the first focused read-only `Broker Report` dashboard section from `docs/ADMIN_IDEAS.md`.
- The report shows broker summary counts for active, expired-unsettled, expired-settled, sold-settled, sold-unsettled, missing-storage, and orphan-storage rows.
- Added broker detail tables for:
  - active listings
  - expired but not settled listings
  - settled rows waiting for seller collection/cleanup
  - suspicious price/count rows outside broker service constraints
  - unsold broker rows whose `item_pointer` does not resolve to broker storage owned by the seller
  - broker-storage inventory rows that are not attached to an unsold broker row
- The stale-storage checks mirror the .NET server model: `broker.item_pointer` should point to `inventory.item_unique_id` in `StorageType.BROKER` (`item_location = 126`) for unsold broker rows.
- This is read-only reporting only; no broker SQL writes or live mutations are performed.

## 2026-07-05 Iteration 41

- Added portal-local JSON mail templates for common admin Express Mail workflows.
- Added `DATA_DIR/admin-mail-templates.json` storage through `AdminMailTemplateStore`; no game SQL tables are used.
- Mail templates store:
  - template name
  - default mail type (`item` or `kinah`)
  - sender
  - title
  - message
- Added Admin panel controls to save, apply, and delete mail templates.
- Applying a template updates the existing Express Mail form client-side and leaves the recipient/attachment fields untouched.
- Actual mail delivery still goes through the existing live .NET `AdminHttpService` express-mail path.
- Added JSONL audit entries for template save/delete.

## 2026-07-05 Iteration 42

- Added a live `.NET` game-server admin endpoint:
  - `GET /admin/player-state`
  - accepts `recipientCharacterId`/`characterId` or `characterName`
  - returns a single online player's live map, instance, coordinates, class/race, account, and bind-point state
  - returns `online=false` as a normal response when the character is not loaded in the live world
- Added portal backend proxy route:
  - `GET /admin/live/player-state`
  - keeps the game-server admin token server-side
- Added `GameServerAdminClient.getPlayerState()`.
- Updated the character detail `Stuck Helper` so action buttons start disabled and are enabled only after the live game-server confirms that character is online.
- The helper no longer trusts the DB `online` flag as the authority for live actions.

## 2026-07-05 Iteration 43

- Tightened the Admin Express Mail item/Kinah mode toggle.
- The selected mail kind is now mirrored onto the form itself, not only the surrounding mail layout.
- Item-only and Kinah-only sections are hidden by form mode, marked `aria-hidden`, and made inert when inactive.
- Inactive attachment fields are disabled and removed from required validation so item mail and Kinah mail no longer show or validate each other's fields.

## 2026-07-05 Iteration 44

- Added a non-mutating live Express Mail preflight path.
- The .NET game-server admin HTTP service now exposes:
  - `POST /admin/validate-express-mail`
  - validates the same recipient, mailbox capacity, item template, count, Kinah, sender, title, and message constraints used around `SystemMailService.SendMail`
  - returns structured `valid`, `errors`, `warnings`, mailbox count, recipient, online/offline delivery state, and item template info
  - does not create mail, inventory rows, mailbox counters, or player notifications
- Added portal backend proxy route:
  - `POST /admin/live/validate-express-mail`
  - keeps the game-server admin token server-side
- Added `GameServerAdminClient.validateExpressMail()`.
- Added an Admin Express Mail `Check delivery` button that calls the live preflight endpoint and displays whether the mail looks deliverable before the admin sends it.
- Actual delivery still uses the existing live `.NET` `POST /admin/express-item-mail` mutation path.

## 2026-07-05 Iteration 45

- Added the missing live `Unstuck` admin action from `docs/ADMIN_IDEAS.md`.
- The .NET game-server admin HTTP service now exposes:
  - `POST /admin/unstuck-player`
  - resolves only loaded/online players from the running world
  - calls `TeleportService.MoveToInstanceExit(player, player.GetWorldId(), player.GetRace())`
  - uses the game server's existing instance-exit logic, including bind fallback when no valid instance exit is configured
  - returns source position, destination, and which unstuck action path was used
- Added portal backend proxy route:
  - `POST /admin/live/unstuck-player`
  - keeps the game-server admin token server-side
  - writes a JSONL admin audit entry with source/destination and reason
- Added `GameServerAdminClient.unstuckPlayer()`.
- Added `Unstuck` controls to:
  - the `Live Online Players` admin panel
  - the character-detail `Stuck Helper`

## 2026-07-05 Iteration 46

- Added a live item storage-rule validation endpoint for admin diagnostics and future repair tooling.
- The .NET game-server admin HTTP service now exposes:
  - `POST /admin/validate-item-storage`
  - validates item template existence from `DataManager.ITEM_DATA`
  - returns the game-server mask verdicts for tradeable, character warehouse, and account warehouse storage
  - applies the same soulbound account-warehouse rule as `Item.IsStorableInAccWarehouse()`
  - accepts an optional target storage id/policy and returns a target-specific allowed/error verdict
- Added portal backend proxy route:
  - `POST /admin/live/validate-item-storage`
  - keeps the game-server admin token server-side
- Added `GameServerAdminClient.validateItemStorage()`.
- Added `Check rules` buttons to admin item-inspector rows so character/account diagnostics can ask the live game server for current storage/tradeability rules instead of relying only on the portal's local XML mirror.

## 2026-07-05 Iteration 47

- Wired the live `.NET` item storage-rule validator into actual portal warehouse item transfers.
- `WarehouseTransferService` now accepts an injected item-storage validator.
- The portal passes `GameServerAdminClient.validateItemStorage()` into the transfer service.
- When the validator is configured, the destination rule verdict comes from the live game-server admin endpoint before the portal commits the inventory row move.
- The local item XML mirror remains as the fallback validator only when no live validator is configured.
- The transfer still keeps existing offline-character, ownership, equipped-item, Kinah, capacity, and row-lock guards on the portal side before writing the DB row.

## 2026-07-05 Iteration 48

- Refactored the `.NET` Express Mail mutation endpoint to reuse the same live validation path as the non-mutating preflight endpoint.
- `POST /admin/express-item-mail` now calls the shared `ValidateExpressMail()` result before `SystemMailService.SendMail`.
- Validation failures now return structured `errors`, `warnings`, recipient/mailbox/item context, and an appropriate HTTP status before any mutation is attempted.
- The send path now uses the validation-normalized recipient, sender, title, and message values when calling `SystemMailService.SendMail`.
- `POST /admin/validate-express-mail` remains non-mutating and continues to expose the same validation verdict for UI preflight.

## 2026-07-05 Iteration 49

- Tightened the Admin Express Mail compose form so the selected mail type controls the visible attachment fields directly.
- Item mode now shows the selected-item preview, item template id, count, and item browser while keeping Kinah amount disabled and hidden.
- Kinah mode now shows only the Kinah amount attachment field and hides the item controls/browser.
- The inactive attachment inputs are disabled so `Check delivery` and the final submit send only fields relevant to the selected mode.

## 2026-07-05 Iteration 50

- Hardened the live `.NET` Express Mail validation boundary for direct admin HTTP callers.
- The shared `ValidateExpressMail()` path now rejects item attachments that use the Kinah item template; Kinah must use the mail Kinah attachment field.
- The same validation now rejects non-Kinah item counts above the template max stack count before `SystemMailService.SendMail` can create a silently clamped item.
- Because the mutation and preflight endpoints share this validator, `/admin/validate-express-mail` and `/admin/express-item-mail` now return the same verdict for these cases.

## 2026-07-05 Iteration 51

- Tightened `.NET` Express Mail normalization around text fields.
- `ValidateExpressMail()` now trims overlong title/message values to the same limits enforced by `SystemMailService.SendMail` before the mutation endpoint calls the mail service.
- The preflight response still returns warnings for overlong title/message input, but the actual send path no longer relies on hidden downstream truncation.

## 2026-07-05 Iteration 52

- Tightened the live game-server system-mail persistence path used by the portal's admin Express Mail endpoint.
- `SystemMailService.SendMail` now stores a generated attached item before storing the mail row, matching the normal player-mail path's FK-safe order.
- If the mail row fails to store after the attachment was inserted, the service marks the generated item deleted and attempts to remove it so a failed send does not leave stray mailbox storage.
- This protects admin HTTP mail delivery because `/admin/express-item-mail` routes through `SystemMailService.SendMail`.

## 2026-07-05 Iteration 53

- Expanded the live `.NET` item-rule validator used by admin storage diagnostics.
- `POST /admin/validate-item-storage` now returns server-owned template facts beyond warehouse/tradeability:
  - quality, type, group, max stack count
  - Kinah/template special case
  - limit-one, split, break, and delete flags
- `GameServerAdminClient.validateItemStorage()` now preserves those fields.
- Admin inspector `Check rules` output now shows the expanded live rule summary so future item repair/trash workflows can use the game server's current item mask interpretation.

## 2026-07-05 Iteration 54

- Extended the live `.NET` item-rule validator from template-only checks into row-context diagnostics.
- `POST /admin/validate-item-storage` now accepts optional item row context:
  - current item count
  - current storage id
  - current slot
  - portal-known usable storage limit
- The validator now returns `countAllowed` and `slotAllowed` verdicts and adds structured errors for impossible counts, counts over the template max stack, invalid slots, and slots outside the usable range.
- The portal admin inspector now passes item count/current storage/slot context into `Check rules`.
- Character detail pages pass the character's expanded warehouse slot limit; account warehouse checks use the fixed 16-slot account warehouse limit.

## 2026-07-05 Iteration 55

- Added live `.NET` economy-safety validation for admin Express Mail Kinah grants.
- `ValidateExpressMail()` now rejects Kinah attachments above `2,147,483,647`, matching the current mail packet read path that serializes attached Kinah as a 32-bit value.
- The validator now returns Kinah context in both preflight and validation-failure responses:
  - requested Kinah amount
  - max safe mail attachment
  - configured Kinah cap state/value
  - online recipient's current Kinah when available
  - whether the grant would exceed the configured cap for that online recipient
- When the Kinah cap is enabled, the validator rejects attachments above the cap and warns when an online recipient's current Kinah plus the attachment could overflow the cap at claim time.
- Portal Kinah mail and bundle validation now use the same `2,147,483,647` ceiling before calling the game-server admin endpoint.
- The Express Mail `Check delivery` summary now shows Kinah amount and configured cap context returned by the live validator.

## 2026-07-05 Iteration 56

- Tightened the live `.NET` player-state endpoint used by the admin Stuck Helper.
- `GET /admin/player-state` now resolves offline characters through `PlayerService.GetOrLoadPlayerCommonData` before returning `online=false`.
- Known offline characters now return stable `recipientCharacterId`, `recipientName`, request timestamp, and a `lastKnown` snapshot with level, race, class, map, coordinates, heading, and last-online time.
- Unknown characters now return `404` instead of an ambiguous `online=false` response with an empty name.
- The portal admin client preserves `lastKnown`, and the character-detail Stuck Helper displays the live-server last-known map/coordinates when a character is offline.

## 2026-07-05 Iteration 57

- Tightened the Admin Express Mail compose form mode switch.
- Item mode now explicitly activates only the selected-item preview, item template id, count, and item browser.
- Kinah mode now explicitly activates only the Kinah amount attachment panel and hides/disables the item fields and browser.
- Inactive attachment sections now use one `data-mail-mode-active` state plus `hidden`/`inert`, so stale required fields do not remain visible or participate in validation.

## 2026-07-05 Iteration 58

- Tightened the admin live movement UI against the .NET movement endpoint contract.
- The Live Online dashboard and character-detail Stuck Helper now prefer the game-server returned `to` snapshot when showing movement success messages.
- If an older game-server response lacks `to`, the UI still falls back to the intended `destination`.
- This keeps the admin-facing result aligned with the actual post-teleport map/instance returned by the live game server instead of only showing the planned destination.

## 2026-07-05 Iteration 59

- Added the first live item repair mutation for admin diagnostics: online item discard.
- The `.NET` game-server admin HTTP service now exposes `POST /admin/discard-player-item`.
- The endpoint resolves only an online player, targets a specific item object id in cube, character warehouse, or account warehouse, blocks Kinah/equipped/quest/non-deletable items, removes through the live `Storage.Delete(..., DISCARD)` path, sends the normal client delete packet, and immediately persists via `InventoryDAO.Store(player)`.
- The portal now proxies this through `POST /admin/items/discard`, keeps the game-server admin token server-side, writes a JSONL admin audit entry, and returns to the character detail page with a status message.
- Character detail inventory inspectors now show a guarded `Discard` action only for online characters and only for live-supported storage rows; mail, broker, portal-only online warehouse, offline character rows, Kinah, equipped items, and quest items remain read-only diagnostics.

## 2026-07-05 Iteration 60

- Tightened portal warehouse transfer safety around direct SQL writes.
- Character warehouse moves still require the selected character to be offline.
- Any item transfer that touches account-owned warehouse storage now requires every character on that Aion account to be offline before the portal updates `inventory`.
- Account warehouse Kinah transfers now use the same account-wide offline guard.
- This keeps portal-side DB writes within the admin ideas rule: direct writes are allowed only when the running game server should not have stale account warehouse state in memory.

## 2026-07-05 Iteration 61

- Added a live item slot repair mutation for out-of-range warehouse rows.
- The `.NET` game-server admin HTTP service now exposes `POST /admin/repair-item-slot`.
- The endpoint resolves only an online player, targets a specific item object id in character or account warehouse storage, blocks Kinah, finds the first free live slot inside the loaded warehouse limit, updates the item slot, sends the normal live warehouse item update, persists via `InventoryDAO.Store(player)`, and returns the previous/new slot plus a warehouse snapshot.
- The portal now proxies this through `POST /admin/items/repair-slot`, keeps the game-server admin token server-side, and writes a JSONL admin audit entry.
- Character detail inventory inspectors now show `Repair slot` only for online characters and only when a character/account warehouse row is outside the known usable slot range.

## 2026-07-05 Iteration 62

- Added a live item count repair mutation for overstacked item rows.
- The `.NET` game-server admin HTTP service now exposes `POST /admin/repair-item-count`.
- The endpoint resolves only an online player, targets a specific item object id in cube, character warehouse, or account warehouse storage, blocks Kinah, verifies the live item count is above the server template max stack, reduces it to the requested valid target count through `Storage.DecreaseItemCount`, sends the normal live item update packet, persists via `InventoryDAO.Store(player)`, and returns previous/current count plus live inventory or warehouse snapshot context.
- The portal now proxies this through `POST /admin/items/repair-count`, keeps the game-server admin token server-side, and writes a JSONL admin audit entry.
- Character detail inventory inspectors now show `Clamp count` only for online characters and only when a live-supported item row has a positive count above the known template max stack.

## 2026-07-05 Iteration 63

- Hardened the live item count repair HTTP contract around large stored counts.
- The portal now sends `targetCount` to `/admin/repair-item-count` as text instead of converting it to a JavaScript `Number`.
- The `.NET` admin endpoint now parses the optional target count from text and returns `previousCount`, `itemCount`, and `maxStackCount` as text.
- This avoids precision loss at the portal/game-server boundary for `inventory.item_count` values that may exceed JavaScript's safe integer range.

## 2026-07-05 Iteration 64

- Tightened the admin item repair UI against the live `.NET` endpoint contract.
- `Discard`, `Repair slot`, and `Clamp count` controls now render disabled until the character-detail live-state check confirms `/admin/live/player-state` is loaded online in the game server.
- The same forms also have a client-side submit guard, so they cannot submit before confirmed live state even if triggered without clicking the disabled button.
- This aligns the portal UI with the `.NET` repair endpoints, which resolve recipients from live `GameWorld` players rather than trusting the database `online` flag alone.

## 2026-07-05 Iteration 65

- Tightened the Admin Express Mail item/Kinah form split.
- The compose form now uses the selected mail type as the single source of truth for attachment panels: item mode shows item preview/id/count plus the item browser, while Kinah mode shows only the Kinah amount field.
- Inactive attachment controls are hidden, marked inert, disabled, and removed from required validation before preflight checks or submit.
- The portal mail submit route now parses item fields only for item mail; Kinah mail ignores stale item form values entirely.

## 2026-07-05 Iteration 66

- Expanded the read-only Admin `Economy Safety` dashboard with inventory anomaly reporting from `docs/ADMIN_IDEAS.md`.
- Added DB-read-only checks for:
  - inventory rows referencing item templates missing from the local item catalog
  - duplicated `inventory.item_unique_id` values
  - invalid row ids/owners/counts, overstacked rows, and high estimated-value stored item rows
- The new anomaly tables link back to character/account inspectors where ownership can be resolved.
- No game SQL writes or live mutations are used by these reports; repair actions remain separate and guarded behind live game-server HTTP endpoints where needed.

## 2026-07-05 Iteration 67

- Added a live admin HTTP capabilities endpoint on the `.NET` game server.
- The authenticated `GET /admin/capabilities` route returns the supported admin API method/path list, category, mutation flag, API version, timestamp, and current live player count without exposing the admin token.
- Added portal proxy route `GET /admin/live/capabilities`, keeping the game-server admin token server-side.
- The Admin `Live Online Players` panel now checks this endpoint and displays the live admin API endpoint count, mutating endpoint count, and live player count next to the refresh metadata.
- This gives the portal a direct runtime compatibility check before relying on newer live game-server admin calls.

## 2026-07-05 Iteration 68

- Added a read-only live player storage snapshot endpoint on the `.NET` game server.
- The authenticated `GET /admin/player-storage-state` route resolves only a loaded online player and returns live position, inventory, warehouse, and mailbox summaries without sending refresh packets or writing SQL.
- Refactored the `.NET` inventory/warehouse refresh helpers so packet-refresh actions still send client packets while the new storage-state endpoint uses pure snapshot helpers.
- Added portal proxy/client support through `GET /admin/live/player-storage-state`.
- Character detail pages now include a `Check Live Storage` control that is enabled only after the existing live-state check confirms the character is loaded online, then reports live cube, equipped, character warehouse, account warehouse, and mailbox counts.

## 2026-07-05 Iteration 69

- Tightened the Admin Express Mail compose form so item and Kinah attachment controls are separated by real mode fieldsets.
- Inactive attachment sections are now hidden, inert, fieldset-disabled, and excluded from required validation.
- The live `Check delivery` request strips inactive attachment fields before posting, so item checks cannot carry stale Kinah values and Kinah checks cannot carry stale item values.
- The item browser is now treated as part of item mode and hides with the item attachment section when Kinah mode is selected.

## 2026-07-05 Iteration 70

- Added a read-only live account-state endpoint to the `.NET` game-server admin HTTP service:
  - `GET /admin/account-state`
  - resolves loaded players by `accountId` or `accountName`
  - returns live player summaries and a current account warehouse snapshot when any character on the account is loaded
  - appears in `GET /admin/capabilities`
- Added portal support for the endpoint through `GameServerAdminClient.getAccountState()` and admin proxy route `GET /admin/live/account-state`.
- Account-owned warehouse item and Kinah transfers now keep the existing DB offline check and also fail closed if the live game-server account-state check reports a loaded character or cannot be reached.
- This keeps direct portal DB writes aligned with the admin boundary: account warehouse rows are only mutated when the running game server is not holding that account warehouse in memory.

## 2026-07-05 Iteration 71

- Added an account-scoped live warehouse refresh endpoint to the `.NET` game-server admin HTTP service:
  - `POST /admin/refresh-account-warehouse`
  - resolves loaded characters by `accountId` or `accountName`
  - sends the normal live warehouse refresh packet flow to every loaded character on that account
  - returns per-character warehouse snapshots for audit visibility
  - appears in `GET /admin/capabilities`
- Added portal support through `GameServerAdminClient.refreshAccountWarehouse()` and proxy route `POST /admin/live/refresh-account-warehouse`.
- The proxy keeps the game-server admin token server-side and records a JSONL admin audit entry with the account, loaded player count, and returned snapshots.

## 2026-07-05 Iteration 72

- Added a `Live Account` panel to the admin account detail page.
- The panel calls `GET /admin/live/account-state` on load and from `Check Live State`, then enables account warehouse refresh only when the live game server reports loaded characters on that account.
- Added a `Refresh Account Warehouse` action that posts to `POST /admin/live/refresh-account-warehouse`, keeping the game-server admin token server-side.
- The status text summarizes loaded character count, loaded names, account warehouse item count, and account warehouse Kinah from the live `.NET` account-state response.

## 2026-07-05 Iteration 73

- Added a non-mutating `.NET` Express Mail bundle preflight endpoint:
  - `POST /admin/validate-express-mail-batch`
  - reuses the existing single-letter live validation rules for recipient, mailbox, item templates, stack counts, Kinah attachment limits, sender, title, and message
  - adds cumulative bundle checks for mailbox capacity and Kinah-cap warnings before any letters are created
  - appears in `GET /admin/capabilities`
- Added portal support through `GameServerAdminClient.validateExpressMailBatch()` and proxy route `POST /admin/live/validate-express-mail-batch`.
- Mail bundle sending now preflights the whole bundle through the live `.NET` endpoint before sending any letters, preventing partial bundle delivery when a later entry would fail.

## 2026-07-05 Iteration 74

- Tightened the Admin Express Mail form mode handling.
- The compose form now uses explicit item/Kinah mode panels so item template/count controls only show for item mail and Kinah amount only shows for Kinah mail.
- The item browser is hidden separately in Kinah mode and is no longer treated as an item form fieldset.
- The submit button now refreshes the selected mode before browser form validation runs, keeping inactive fields disabled and out of required validation.

## 2026-07-05 Iteration 75

- Finished the live `.NET` item-action validation endpoint:
  - `POST /admin/validate-player-item-action`
  - resolves the loaded live player, requested storage, and exact item object
  - validates discard, warehouse slot repair, and overstack count repair without mutating storage or writing inventory
  - mirrors the same guards used by the existing live mutation endpoints for equipped items, Kinah, quest items, deletion rules, slot occupancy, warehouse limits, and target count rules
- Added portal support through `GameServerAdminClient.validatePlayerItemAction()` and proxy route `POST /admin/live/validate-player-item-action`.
- The existing portal admin item actions now preflight through the live validator before calling the mutating `.NET` discard/repair endpoints.

## 2026-07-05 Iteration 76

- Refactored the `.NET` live item mutation endpoints to reuse the same validation path as `POST /admin/validate-player-item-action`.
- `POST /admin/discard-player-item`, `POST /admin/repair-item-slot`, and `POST /admin/repair-item-count` now call the shared live validator before any storage mutation.
- Validation failures return structured `valid=false`, action, item/storage context, errors, and warnings with appropriate HTTP statuses before the game server changes live storage.
- This keeps direct game-server admin HTTP callers aligned with the portal preflight behavior instead of relying on duplicated guard code.

## 2026-07-05 Iteration 77

- Added a live `.NET` Express Mail bundle send endpoint:
  - `POST /admin/express-mail-batch`
  - reuses `ValidateExpressMailBatch()` before sending any letters
  - sends each accepted entry through `SystemMailService.SendMail` on the live game server
  - returns delivered state, recipient, entry count, sent count, sent entry details, Kinah total, and warnings
  - appears in `GET /admin/capabilities`
- Added portal support through `GameServerAdminClient.sendExpressMailBatch()`.
- The Admin mail bundle sender now calls the single live game-server batch endpoint instead of looping over one HTTP request per bundle entry from the portal.

## 2026-07-05 Iteration 78

- Hardened the `.NET` Express Mail batch validation contract.
- `POST /admin/validate-express-mail-batch` and validation failures from `POST /admin/express-mail-batch` now use one shared response payload builder.
- This keeps `valid`, recipient/mailbox/Kinah context, cumulative entry counts, warnings, errors, and per-entry validation details aligned between the non-mutating preflight endpoint and the mutating batch-send endpoint.

## 2026-07-05 Iteration 79

- Preserved structured error payloads from game-server admin HTTP failures in the portal client.
- `GameServerAdminClient` now throws `GameServerAdminError` with the HTTP status and parsed JSON payload when the live admin endpoint returns `ok=false`.
- The Admin mail bundle sender now reads partial-send details from failed `POST /admin/express-mail-batch` responses:
  - updates audit `sentCount`
  - records `sentEntries` and `failedEntry` when present
  - avoids reporting `0/N` when the live game server already sent some letters before rejecting a later entry

## 2026-07-05 Iteration 80

- Consolidated single Express Mail delivery onto the shared portal game-server admin HTTP client.
- Added `GameServerAdminClient.sendExpressMail()` for `POST /admin/express-item-mail`.
- `AdminMailService.sendItemMail()` and `sendKinahMail()` now use the shared client instead of maintaining their own `fetch`/JSON/error handling path.
- This gives item mail, Kinah mail, bundle mail, validators, and live admin actions the same game-server admin HTTP transport behavior and structured failure handling.

## 2026-07-05 Iteration 81

- Tightened the `.NET` single Express Mail mutation path.
- `POST /admin/express-item-mail` now sends and logs attachment values from the shared `ValidateExpressMail()` result rather than reading raw DTO fields after validation.
- The success and validation-failure payloads now include approved `itemId`, `itemCount`, and `kinah` context, keeping single-mail responses closer to the batch-mail response contract.

## 2026-07-05 Iteration 82

- Tightened the Admin Express Mail compose UI for item-vs-Kinah sends.
- Added explicit `data-admin-mail-mode-content` markers so only the active attachment panel is visible: item search/template/count for item mail, Kinah amount for Kinah mail.
- Kept inactive attachment controls hidden, disabled, and out of browser validation/submission when the admin switches mail type.

## 2026-07-05 Iteration 83

- Consolidated the `.NET` single Express Mail response contract.
- `POST /admin/validate-express-mail`, validation failures from `POST /admin/express-item-mail`, delivery rejections from `SystemMailService.SendMail`, and successful single sends now share the same payload builder.
- The shared payload includes recipient/mailbox context, item attachment fields, Kinah fields, errors, warnings, online/offline delivery state, and preserves `valid=true` for send-time delivery rejections that passed validation.

## 2026-07-05 Iteration 84

- Hardened the `.NET` Express Mail batch send response contract.
- Successful `POST /admin/express-mail-batch` sends and send-time `SystemMailService.SendMail` rejections now share a batch send payload builder.
- Partial-send failures still include `sentCount`, `sentEntries`, and `failedEntry` for portal audit/reporting, and now also include the same recipient, mailbox, Kinah-cap, warnings, and per-entry validation context as batch preflight responses.

## 2026-07-05 Iteration 85

- Consolidated the `.NET` live item validation response contracts.
- `POST /admin/validate-player-item-action` and validation failures from live discard/slot-repair/count-repair mutations now use one shared item-action validation payload.
- `POST /admin/validate-item-storage` now uses a shared storage-rule validation payload for item mask, bound/tradeability, count, slot, and target-storage diagnostics.
- This keeps warehouse transfer checks, admin item repair preflights, and mutation rejections aligned on the same server-side rule context.

## 2026-07-05 Iteration 86

- Added structured `.NET` payloads for live item mutation failures after validation succeeds.
- Discard failures, slot-repair persistence failures, count-repair race failures, and count-repair persistence failures now return the same item-action context as preflight responses plus `persisted=false`.
- These responses keep recipient, item object id, template id/name, count, storage id/name, slot/target context, errors, and warnings available to portal callers instead of collapsing mutation-time failures into a bare error string.

## 2026-07-05 Iteration 87

- Corrected `.NET` admin API capability metadata for live side-effect endpoints.
- `POST /admin/notify-player`, inventory/warehouse refreshes, account warehouse refresh, and server broadcast now report `mutates=true` because they send live packets or otherwise affect live clients.
- The portal Admin API summary now counts those endpoints as mutating actions instead of under-reporting admin-risk operations.

## 2026-07-05 Iteration 88

- Corrected the `.NET` live notify response contract.
- `POST /admin/notify-player` now returns `recipientCharacterId` from `PlayerCommonData.GetPlayerObjId()`, matching the other live admin endpoints, instead of using the transient live object id accessor.
- Portal audit rows and action summaries now receive the same canonical character id shape for notify actions as kick, movement, refresh, and item-repair actions.

## 2026-07-05 Iteration 89

- Added a shared `.NET` not-online response payload for live-only admin endpoints.
- Live storage-state, notify, kick, movement, unstuck, mailbox refresh, inventory refresh, and warehouse refresh now return `online=false`, canonical recipient id/name when resolvable, and a `lastKnown` character snapshot for offline-but-known characters.
- `GET /admin/player-state` now reuses the same offline character snapshot builder, keeping live action failures and explicit player-state checks aligned.

## 2026-07-05 Iteration 90

- Added a canonical `.NET` single Express Mail route:
  - `POST /admin/express-mail`
- Kept `POST /admin/express-item-mail` as a legacy compatibility alias because older portal builds or scripts may still use it.
- Updated the portal game-server admin client to send single item and Kinah express mail through `/admin/express-mail`, matching the endpoint's actual item-or-Kinah behavior.

## 2026-07-05 Iteration 91

- Added explicit `.NET` capability metadata for legacy route aliases.
- The `POST /admin/express-item-mail` capability now reports `deprecated=true` and `canonicalPath=/admin/express-mail`, and the admin API version reports `2`.
- The portal client preserves `deprecated` and `canonicalPath` from `GET /admin/capabilities`.
- The admin dashboard now reports active mutating endpoints separately from legacy aliases so compatibility routes do not inflate the live-action risk count.

## 2026-07-05 Iteration 92

- Tightened the Admin Express Mail item/Kinah form switch again.
- Inactive attachment panels are now forced out of layout with both `hidden` and inline display state.
- All controls nested inside inactive attachment panels are disabled, so item fields are not shown/submitted for Kinah mail and Kinah fields are not shown/submitted for item mail.

## 2026-07-05 Iteration 93

- Hardened `.NET` admin HTTP validation for server-scoped actions.
- `POST /admin/reload-cache` now returns structured invalid-target responses with the rejected target and `allowedTargets`.
- `POST /admin/broadcast-message` and `POST /admin/maintenance-warning` now normalize the old `asmo` alias to `asmodians` and return structured invalid-scope responses with `allowedScopes`.
- Maintenance warning countdown validation now returns the submitted minutes plus `minMinutes` and `maxMinutes`.
- `GET /admin/capabilities` now exposes allowed cache targets and message scopes for those endpoints, and the portal admin client preserves that metadata.

## 2026-07-05 Iteration 94

- Preserved structured game-server admin HTTP failures through the portal live proxy routes.
- `GameServerAdminClient` now throws `GameServerAdminError` with parsed payloads for GET endpoints as well as POST endpoints.
- Portal `/admin/live/*` JSON proxy routes now return the original `.NET` failure payload and status when available instead of collapsing errors to `{ ok: false, error }`.
- Portal reload, broadcast, and maintenance proxy validation now mirrors the `.NET` allowed-value contract:
  - invalid reload targets return `target` and `allowedTargets`
  - invalid broadcast/maintenance scopes return `scope` and `allowedScopes`
  - invalid maintenance countdowns return `minutesUntilMaintenance`, `minMinutes`, and `maxMinutes`
- The portal no longer silently coerces invalid broadcast or maintenance scopes to `all`.

## 2026-07-05 Iteration 95

- Scope simplification per request: dropped the planned high-value movement-history report and the broader reload-cache targets idea. Parked (not removed) inventory/mailbox inspector filters and missing-template cleanup pending a decision.
- Hid four admin dashboard sections on the web side while keeping all their code: Economy Safety, Broker Report, Offline Characters, and Recent Admin Audit. `adminDashboardPage` no longer renders them (documented inline); the render functions and data types are untouched so any section is a one-line restore.
- Stopped running the hidden sections' loaders on every `/admin` load. The `GET /admin` route no longer calls `loadAdminEconomyReport`, `loadAdminBrokerReport`, or `readRecentAuditEntries`, removing wasted DB/file work while the sections are hidden.
- Added character/account lookup:
  - `GET /admin/search?q=` searches characters (game DB `players`) by name, id, account name, and account id, and accounts (login DB `account_data`) by name, id, current `last_ip`, and `account_login_history` IP, in one pass.
  - New `loadAdminSearchResults()` in `aionData.ts` (LIKE metacharacters escaped, results capped at 50 with truncation flags), and `adminSearchResultsPage()` / `adminSearchBox()` in `views.ts`.
  - A prominent search box now sits at the top of the `/admin` dashboard; results render as grouped Characters and Accounts tables linking to the existing detail pages.
  - Verified the new SQL directly against the live Docker MySQL (name, id, current-IP, and login-history-IP paths all return correct rows).
- UI polish pass on the shared design system (dark theme kept): added design tokens (radius/shadow/ring/gold), a gradient brand mark + wordmark in the header, active nav-link highlighting, gradient buttons with hover/active/focus-visible rings, elevated stat cards with an accent top-bar, sheened panels, and sticky uppercase gradient table headers with zebra rows.
- Fixed a pre-existing mobile horizontal-overflow bug: `.panel` grid items lacked `min-width: 0`, so wide tables pushed the page wider than the viewport instead of scrolling inside their `.table-scroll` wrappers. Added `min-width: 0` to panels and stack children; verified no horizontal page overflow at 375px.
- `tsc --noEmit` passes clean throughout.
