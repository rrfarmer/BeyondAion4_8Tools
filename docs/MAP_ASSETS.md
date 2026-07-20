# Spawn Map Assets

The spawn editor serves project-local map images from `assets/maps`. Runtime requests never fetch artwork from Aion Codex or another external site.

## Coverage

`assets/maps/manifest.json` catalogs every distinct map id found recursively under the .NET server's `game-server/data/static_data/spawns/Npcs` directory:

- 43 maps
- 49 artwork layers
- 32 maps backed by the client's detailed map-window packages
- 2 maps backed by the client's radar package (`Wisplight Abbey` and `Fatebound Abbey`)
- 9 maps with generated coordinate grids because this client has no corresponding detailed/radar artwork
- 3 Reshanta layers and 2 layers for each of Belus, Aspida, Atanatos, and Disillon

The manifest records each map's source XML files, primary write target, client package/hash, tile layout, calibration, coordinate bounds, output asset/hash, and asset kind.

## Rebuild From Scratch

The extractor requires Python with Pillow plus AION-Encdec's `pak2zip.exe`, `7z.exe`, and `AIONdisasm.exe`:

```powershell
python -m pip install -r scripts\requirements-maps.txt
python scripts\cache_client_maps.py `
  --client-root "C:\Program Files (x86)\Beyond Aion" `
  --repo-root "C:\Users\ryanf\Documents\GitHub\BeyondAionSharp" `
  --encdec-bin "C:\path\to\aion-encdec\bin"
```

The script uses a reusable extraction cache under `%TEMP%\aion-portal-map-cache`. Deleting that directory forces a literal clean extraction. `--reuse-extracted-root <path>` can reuse an existing `<map id>\tiles` tree during development.

## Tile Layout

Detailed map packages use nine 1024-pixel DDS tiles stored column-first:

```text
000  003  006
001  004  007
002  005  008
```

The two radar fallbacks use the same column-first convention in a 4x4 tile grid. Generated outputs are WebP files; their logical Leaflet extent remains the server world size regardless of raster dimensions.

## Coordinate Transform

Calibration comes from the installed client's `Data/World/World.pak` (`zonemap.xml`). The server axes are transposed relative to map texture axes. For logical image size `S`:

```text
imageU = (gameY - offsetX) * S / mapWidth
imageV = (gameX - offsetY) * S / mapHeight
Leaflet = [S - imageV, imageU]
```

Click placement applies the exact inverse:

```text
gameX = offsetY + (S - latitude) * mapHeight / S
gameY = offsetX + longitude * mapWidth / S
```

This is detailed map-window artwork, not the normal minimap, except for the two entries explicitly marked `radar`. These images are derived from the locally installed game client and should not be published as a separately distributable asset set.

## Ground Height

Visual map artwork contains no elevation data. The editor resolves default Z values from the prepared 16-bit grayscale PNGs under `BeyondAionSharp/game-server/data/geo` instead. Docker mounts that directory read-only; the portal never changes geodata.

Each heightmap pixel represents a 2x2 game-unit terrain sample. The backend follows the emulator's `Terrain` behavior: it reads PNG rows as game X and columns as game Y, converts an unsigned sample to `Z = sample * 2048 / 65536`, and interpolates the same two triangles formed by the four surrounding samples. A sample value of `65535` represents missing terrain.

Heightmaps cover 31 of the 43 maps currently exposed by the editor. Geometry-only maps keep manual Z entry because their `.geo` placements and shared `models.mesh` collision surfaces may contain stacked floors or other positions that cannot be selected unambiguously from a two-dimensional click.

## Patrol Ground Audit

Run the same terrain comparison used by the admin review dialog from the repository root:

```powershell
npm run walkers:audit-ground
```

The default tolerance is 2 meters. A complete machine-readable report can be written without changing any spawn or walker XML:

```powershell
npm run walkers:audit-ground -- --tolerance-m 2 --output data\walker-ground-audit.json
```

Walker routes do not contain a map id, so the scanner first finds every `walker_id` usage in NPC spawn XML and audits the route separately on each referenced map. A route reused on two maps can therefore produce two findings. Missing heightmaps and `65535` terrain samples are reported as unavailable rather than treated as off-ground.
