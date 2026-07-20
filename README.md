# Aion Portal

Minimal POC web portal for the Aion emulator.

This first slice is intentionally narrow:

- sign in with an existing Aion account password from `aion_ls.account_data`
- keep a portal-local session/user record for audit and preferences without storing the game password
- list characters for the linked account
- warehouse views for character, account, and portal-only online storage
- guarded whole-item transfers between a character's warehouses and account warehouses
- admin tools for linked Aion accounts with `account_data.access_level >= 9`

## Run

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://127.0.0.1:3000`.

Before exposing this beyond local/dev, set `SESSION_SECRET` in `.env`.

Portal sign-in mirrors the normal login password hash check: `Base64(SHA1(UTF-8 password))` against `aion_ls.account_data.password`. It also rejects inactive, expired, penalty-banned, and `ip_force`-restricted accounts.

## Run Against The Aion Docker DB

Start the Aion MySQL service from the main server repo:

```powershell
cd C:\Users\ryanf\Documents\GitHub\aion-server
docker compose -f docker\docker-compose.yml up -d mysql
```

Then start the portal container:

```powershell
cd C:\Users\ryanf\Documents\GitHub\aion-portal
docker compose up -d --build
```

The portal container joins the existing `aion_default` network and connects to MySQL as `mysql:3306`.

Docker uses the host `.\data` directory as `/app/data`. This keeps portal users, transfer audit logs, the icon manifest, and cached icons as normal files under:

```text
C:\Users\ryanf\Documents\GitHub\aion-portal\data
```

If you previously ran the portal with Docker's old named volume, copy `users.json` out once before restarting with the bind mount:

```powershell
docker cp aion-portal:/app/data/users.json .\data\users.json
```

Do this only if `.\data\users.json` does not already exist.

## Warehouse Transfers

Open a character from `/characters`, then use `Transfer with account`.

The current transfer MVP:

- moves whole item rows only
- requires the character to be offline
- supports character warehouse, character online warehouse, account warehouse, and account online warehouse
- uses item template masks for warehouse/account-warehouse eligibility
- blocks soulbound items from account warehouse targets
- blocks Kinah transfers
- writes audit lines to `DATA_DIR/item-transfer-audit.jsonl`

Portal-only online storage ids are `120` for character online warehouse and `121` for account online warehouse. They are intentionally inside the signed `tinyint` range used by `inventory.item_location`.

## Admin Panel

The `/admin` page is available only when the logged-in portal user is linked to an Aion account where `aion_ls.account_data.access_level >= 9`.

The `Admin` nav link is hidden for non-admin users, and direct `/admin` requests are also rejected server-side.

The admin panel currently supports:

- account, character, and inventory storage counts
- characters grouped by online/offline status
- item, Kinah, and bundle express mail delivery through the live `.NET` admin HTTP service

Express Mail is validated and delivered by the running game server so online recipients receive normal live mailbox notifications. Portal audit records are stored under `DATA_DIR`; the portal does not create mail rows directly.

## NPC Spawn Editor

Level-9 accounts can open `/admin/spawns` to inspect and edit NPC/mob spawn locations across every map represented in the .NET server's NPC spawn XML.

The editor:

- loads NPC metadata from `BeyondAionSharp/game-server/data/static_data/npcs/npc_templates.xml`
- aggregates base and `Custom` XML sources, including repeated `<spawn_map>` blocks
- filters the complete catalog into World Maps, Instance Maps, and Others, with map/layer switching, hover/search, coordinate updates, deletion, and new NPC placement
- edits alternate siege spawn datasets on their physical world maps while preserving fortress, faction, and siege-mode context
- uses client `zonemap.xml` calibration and the exact reversible game-coordinate/image transform
- resolves ground Z from the server's prepared 16-bit terrain heightmaps after map picks or X/Y edits, while retaining manual Z entry
- resolves selected `walker_id` routes from the complete recursive `npc_walker` catalog and draws numbered runtime paths over the calibrated map
- compares every authored patrol waypoint with terrain Z so airborne or buried segments are immediately highlighted
- edits existing patrols or draws new routes directly on the map, with each map-picked waypoint snapped to terrain by default
- supports per-waypoint coordinates and pause time, route loop behavior, redraw, bulk ground snapping, and optional assignment of a new route to the selected spawn
- stages all browser changes until an explicit review/apply step
- rejects stale revisions, invalid coordinates, static/special placements, and invalid pooled groups
- writes a pre-change backup per touched source under `DATA_DIR/spawn-editor-backups/<map id>`
- writes walker-route backups under `DATA_DIR/walker-editor-backups` and verifies the serialized route before atomically replacing its XML source
- rolls back already-renamed sources if a later file in a multi-XML apply fails
- records the applied operations and reason in `DATA_DIR/admin-actions-audit.jsonl`

This is repository editing, not live server editing. Changes take effect in game only after the updated `BeyondAionSharp` checkout is used for a later game-server build/restart.

Docker mounts the repository regular, instance, and siege spawn directories plus walker routes read/write, with NPC templates and geodata read-only. All locally generated map assets and the 168-entry manifest are copied into the portal image during `docker compose build`. See `docs/MAP_ASSETS.md` for the repeatable client extraction command, coordinate transform, and terrain-height behavior.

## Icon Cache

The running web app never fetches external icons live. It only serves files already present in `DATA_DIR/icons`; missing icons render a local placeholder.

For the current Codex-backed strategy, warm the cache manually before relying on icons in the portal:

To warm the entire cache from local item templates:

```powershell
npm run icons:cache-codex
```

The default full run uses conservative rate limiting: `concurrency=1` and `delayMs=500`.

For long all-icons runs, prefer the supervised command. It starts bounded child-process chunks so Node heap growth is cleared automatically between chunks:

```powershell
npm run icons:cache-codex-supervised -- --start-id 112300431 --chunk-size 5000 --concurrency 1 --delay-ms 1000
```

If npm/PowerShell strips the named flags and passes only values, the supervised command also accepts this positional form:

```powershell
npm run icons:cache-codex-supervised -- 112300431 5000 1 1000
```

Use the last seen item id as `--start-id`; existing icon files are skipped unless `--force` is supplied. The defaults are `chunk-size=5000`, `concurrency=1`, `delayMs=1000`, child heap `2048 MB`, and `20` retries per chunk.

To warm a small range or test one item through npm:

```powershell
npm run icons:cache-codex -- 182400001 1 1 0
```

Positional arguments are:

```text
start-id limit concurrency delay-ms
```

The scraper writes `DATA_DIR/icon-cache-manifest.json`. The manifest records item id, item name, status, Codex page URL, remote icon path, downloaded icon URL, local cache path, content type, byte size, timestamps, and errors. Re-running resumes from this manifest and the existing files in `DATA_DIR/icons`.

When Docker is running from this compose file, no copy step is needed for icons. The app reads the same `.\data\icons` folder that the scraper writes to. If the container was started before this bind mount change, restart the portal after the scrape finishes:

```powershell
docker compose up -d
```

After `npm run build`, named arguments work directly:

```powershell
node dist/scripts/cacheCodexIcons.js --start-id 182400001 --limit 100 --concurrency 2 --delay-ms 250
```

Useful named options:

- `--manifest data/icon-cache-manifest.json`
- `--save-every 25`
- `--retry-missing`
- `--no-retry-failed`
- `--force`

The manual warmer is the only code path that fetches from Codex.
