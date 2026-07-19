#!/usr/bin/env python3
"""Build the spawn editor's map catalog and local artwork from an Aion client."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont


NPC_SOURCE_ROOT = Path("game-server/data/static_data/spawns/Npcs")
WORLD_MAPS_PATH = Path("game-server/data/static_data/world_maps.xml")
RADAR_FALLBACKS = {
    130090000: ("Arena_L_Clobby", "Radar_Arena_L_Clobby_"),
    140010000: ("Arena_D_Clobby", "Radar_Arena_D_Clobby_"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract every locally available spawn-map texture and write assets/maps/manifest.json."
    )
    parser.add_argument("--client-root", type=Path, default=Path(r"C:\Program Files (x86)\Beyond Aion"))
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(r"C:\Users\ryanf\Documents\GitHub\BeyondAionSharp"),
        help="BeyondAionSharp repository root.",
    )
    parser.add_argument(
        "--encdec-bin",
        type=Path,
        default=Path(os.environ.get("AION_ENCDEC_BIN", r"C:\aion-encdec\bin")),
        help="Directory containing pak2zip.exe, 7z.exe, and AIONdisasm.exe.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "assets" / "maps",
    )
    parser.add_argument(
        "--work-dir",
        type=Path,
        default=Path(tempfile.gettempdir()) / "aion-portal-map-cache",
        help="Reusable extraction cache. It may be deleted at any time.",
    )
    parser.add_argument(
        "--reuse-extracted-root",
        type=Path,
        help="Optional existing extraction root containing <map id>/tiles folders.",
    )
    parser.add_argument("--webp-quality", type=int, default=82)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.client_root = args.client_root.resolve()
    args.repo_root = args.repo_root.resolve()
    args.encdec_bin = args.encdec_bin.resolve()
    args.output_dir = args.output_dir.resolve()
    args.work_dir = args.work_dir.resolve()
    if args.reuse_extracted_root:
        args.reuse_extracted_root = args.reuse_extracted_root.resolve()

    require_file(args.repo_root / WORLD_MAPS_PATH, "BeyondAionSharp world map metadata")
    require_file(args.client_root / "Data" / "World" / "World.pak", "Aion client World.pak")
    tools = {
        "pak2zip": require_file(args.encdec_bin / "pak2zip.exe", "pak2zip.exe"),
        "seven_zip": require_file(args.encdec_bin / "7z.exe", "7z.exe"),
        "disasm": require_file(args.encdec_bin / "AIONdisasm.exe", "AIONdisasm.exe"),
    }
    if not 1 <= args.webp_quality <= 100:
        raise SystemExit("--webp-quality must be between 1 and 100")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.work_dir.mkdir(parents=True, exist_ok=True)
    source_inventory, coordinate_inventory = scan_spawn_sources(args.repo_root)
    world_maps = read_world_maps(args.repo_root / WORLD_MAPS_PATH)
    missing_worlds = sorted(set(source_inventory) - set(world_maps))
    if missing_worlds:
        raise RuntimeError(f"world_maps.xml is missing spawn maps: {missing_worlds}")

    zonemap_path = decode_zonemap(args, tools)
    calibrations = read_zonemap(zonemap_path)
    pak_index = index_map_packages(args.client_root / "Textures" / "ui" / "newmap")
    radar_root: Path | None = None
    manifest_maps: list[dict[str, object]] = []

    map_ids = sorted(source_inventory)
    print(f"Building {len(map_ids)} spawn maps from local client data...")
    for index, map_id in enumerate(map_ids, start=1):
        world = world_maps[map_id]
        calibration = calibration_for(world, calibrations.get(map_id))
        sources = source_inventory[map_id]
        primary_source = next((source for source in sources if "/Custom/" not in f"/{source}"), sources[0])
        display_name = display_name_for(world["name"], map_id, primary_source)
        package = find_package(pak_index, str(world["clientName"]), calibrations.get(map_id, {}).get("name"))
        layers: list[dict[str, object]] = []

        extracted = None
        if args.reuse_extracted_root:
            candidate = args.reuse_extracted_root / str(map_id) / "tiles"
            if candidate.is_dir():
                extracted = candidate
        if extracted is None and package:
            extracted = extract_pak(package, args.work_dir / "map-paks", tools)

        tile_groups = find_tile_groups(extracted, 3, 9) if extracted else []
        for layer_index, tile_group in enumerate(tile_groups, start=1):
            layer_count = len(tile_groups)
            layer_id = "map" if layer_count == 1 else f"layer-{layer_index}"
            layer_name = "Map" if layer_count == 1 else f"Layer {layer_index}"
            asset_name = asset_filename(map_id, display_name, layer_id)
            asset_path = args.output_dir / asset_name
            stitched = stitch_tiles(tile_group, 3)
            save_webp(stitched, asset_path, args.webp_quality)
            layers.append(
                layer_manifest(
                    layer_id,
                    layer_name,
                    asset_name,
                    "map-window",
                    asset_path,
                    package,
                    args.client_root,
                    tile_group,
                )
            )

        if not layers and map_id in RADAR_FALLBACKS:
            if radar_root is None:
                radar_pak = require_file(
                    args.client_root / "Textures" / "ui" / "zonemap" / "Pak_166.pak",
                    "client radar map package Pak_166.pak",
                )
                radar_root = extract_pak(radar_pak, args.work_dir / "radar-pak", tools)
            radar_dir_name, radar_prefix = RADAR_FALLBACKS[map_id]
            radar_dir = find_case_insensitive_directory(radar_root, radar_dir_name)
            radar_tiles = indexed_tiles(radar_dir, radar_prefix, 16) if radar_dir else []
            if radar_tiles:
                asset_name = asset_filename(map_id, display_name, "radar")
                asset_path = args.output_dir / asset_name
                save_webp(stitch_tiles(radar_tiles, 4), asset_path, args.webp_quality)
                radar_pak = args.client_root / "Textures" / "ui" / "zonemap" / "Pak_166.pak"
                layers.append(
                    layer_manifest(
                        "radar",
                        "Map",
                        asset_name,
                        "radar",
                        asset_path,
                        radar_pak,
                        args.client_root,
                        radar_tiles,
                    )
                )

        if not layers:
            asset_name = asset_filename(map_id, display_name, "grid")
            asset_path = args.output_dir / asset_name
            grid = coordinate_grid(display_name, int(world["worldSize"]))
            save_webp(grid, asset_path, args.webp_quality)
            layers.append(
                layer_manifest("grid", "Coordinate grid", asset_name, "grid-fallback", asset_path, None, None, [])
            )

        bounds = coordinate_bounds(
            int(world["worldSize"]),
            calibration,
            coordinate_inventory.get(map_id, []),
        )
        manifest_maps.append(
            {
                "mapId": map_id,
                "name": display_name,
                "clientName": world["clientName"],
                "worldSize": world["worldSize"],
                "calibration": calibration,
                "coordinateBounds": bounds,
                "sourceRelativePaths": sources,
                "primarySourceRelativePath": primary_source,
                "layers": layers,
            }
        )
        kinds = ", ".join(str(layer["assetKind"]) for layer in layers)
        print(f"[{index:02}/{len(map_ids)}] {map_id} {display_name}: {len(layers)} layer(s), {kinds}")

    manifest = {
        "version": 2,
        "generator": "scripts/cache_client_maps.py",
        "clientRoot": str(args.client_root),
        "repoRoot": str(args.repo_root),
        "mapCount": len(manifest_maps),
        "maps": manifest_maps,
    }
    referenced_assets = {
        str(layer["asset"])
        for map_entry in manifest_maps
        for layer in map_entry["layers"]  # type: ignore[index]
    }
    for stale_asset in args.output_dir.glob("*.webp"):
        if re.fullmatch(r"\d{9}-.*\.webp", stale_asset.name) and stale_asset.name not in referenced_assets:
            stale_asset.unlink()
            print(f"Removed stale generated asset {stale_asset.name}")
    manifest_path = args.output_dir / "manifest.json"
    temporary_manifest = manifest_path.with_suffix(".json.tmp")
    temporary_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary_manifest, manifest_path)
    print(f"Wrote {manifest_path} with {len(manifest_maps)} maps.")


def require_file(path: Path, label: str) -> Path:
    if not path.is_file():
        raise SystemExit(f"{label} was not found at {path}")
    return path


def run(command: list[str]) -> None:
    completed = subprocess.run(command, text=True, capture_output=True)
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout).strip()
        raise RuntimeError(f"Command failed ({completed.returncode}): {' '.join(command)}\n{detail}")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_pak(pak_path: Path, cache_root: Path, tools: dict[str, Path]) -> Path:
    digest = sha256_file(pak_path)
    cache_dir = cache_root / f"{safe_slug(pak_path.stem)}-{digest[:12]}"
    extracted_dir = cache_dir / "files"
    marker = cache_dir / ".complete"
    if marker.is_file() and extracted_dir.is_dir():
        return extracted_dir

    shutil.rmtree(cache_dir, ignore_errors=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    zip_path = cache_dir / f"{pak_path.stem}.zip"
    run([str(tools["pak2zip"]), str(pak_path), str(zip_path)])
    run([str(tools["seven_zip"]), "x", "-y", f"-o{extracted_dir}", str(zip_path)])
    marker.write_text(digest + "\n", encoding="ascii")
    zip_path.unlink(missing_ok=True)
    return extracted_dir


def decode_zonemap(args: argparse.Namespace, tools: dict[str, Path]) -> Path:
    world_pak = args.client_root / "Data" / "World" / "World.pak"
    extracted = extract_pak(world_pak, args.work_dir / "world-pak", tools)
    encoded = next((item for item in extracted.rglob("*") if item.is_file() and item.name.lower() == "zonemap.xml"), None)
    if not encoded:
        raise RuntimeError("World.pak did not contain zonemap.xml")
    decoded = encoded.parent / "zonemap.decoded.xml"
    if not decoded.is_file() or decoded.stat().st_mtime_ns < encoded.stat().st_mtime_ns:
        run([str(tools["disasm"]), str(encoded), str(decoded)])
    return decoded


def scan_spawn_sources(repo_root: Path) -> tuple[dict[int, list[str]], dict[int, list[tuple[float, float]]]]:
    root = repo_root / NPC_SOURCE_ROOT
    sources: dict[int, set[str]] = defaultdict(set)
    coordinates: dict[int, list[tuple[float, float]]] = defaultdict(list)
    for source_path in sorted(root.rglob("*.xml"), key=lambda item: str(item).lower()):
        tree = ET.parse(source_path)
        relative = source_path.relative_to(repo_root).as_posix()
        for map_element in tree.findall(".//spawn_map"):
            map_id = int(map_element.attrib["map_id"])
            sources[map_id].add(relative)
            for spot in map_element.findall(".//spot"):
                try:
                    coordinates[map_id].append((float(spot.attrib["x"]), float(spot.attrib["y"])))
                except (KeyError, ValueError):
                    continue
    ordered_sources = {
        map_id: sorted(paths, key=lambda item: ("/Custom/" in f"/{item}", item.lower()))
        for map_id, paths in sources.items()
    }
    return ordered_sources, coordinates


def read_world_maps(path: Path) -> dict[int, dict[str, object]]:
    maps: dict[int, dict[str, object]] = {}
    for element in ET.parse(path).getroot().findall("map"):
        map_id = int(element.attrib["id"])
        maps[map_id] = {
            "name": element.attrib.get("name", f"Map {map_id}"),
            "clientName": element.attrib.get("cName", element.attrib.get("name", str(map_id))),
            "worldSize": int(element.attrib["world_size"]),
        }
    return maps


def read_zonemap(path: Path) -> dict[int, dict[str, object]]:
    maps: dict[int, dict[str, object]] = {}
    for element in ET.parse(path).getroot().findall("zonemap"):
        values = {child.tag: (child.text or "").strip() for child in element}
        map_id = int(values["id"])
        maps[map_id] = {
            "name": values.get("name", ""),
            "offsetX": int(values.get("offset_x", "0") or 0),
            "offsetY": int(values.get("offset_y", "0") or 0),
            "mapWidth": int(values.get("map_width", "0") or 0),
            "mapHeight": int(values.get("map_height", "0") or 0),
        }
    return maps


def calibration_for(world: dict[str, object], client: dict[str, object] | None) -> dict[str, int]:
    size = int(world["worldSize"])
    client = client or {}
    width = int(client.get("mapWidth", 0) or 0)
    height = int(client.get("mapHeight", 0) or 0)
    return {
        "offsetX": int(client.get("offsetX", 0) or 0),
        "offsetY": int(client.get("offsetY", 0) or 0),
        "mapWidth": width if width > 0 else size,
        "mapHeight": height if height > 0 else size,
    }


def coordinate_bounds(
    world_size: int,
    calibration: dict[str, int],
    coordinates: list[tuple[float, float]],
) -> dict[str, float]:
    xs = [coordinate[0] for coordinate in coordinates]
    ys = [coordinate[1] for coordinate in coordinates]
    return {
        "minX": min([0.0, float(calibration["offsetY"]), *xs]),
        "maxX": max([float(world_size), float(calibration["offsetY"] + calibration["mapHeight"]), *xs]),
        "minY": min([0.0, float(calibration["offsetX"]), *ys]),
        "maxY": max([float(world_size), float(calibration["offsetX"] + calibration["mapWidth"]), *ys]),
    }


def index_map_packages(root: Path) -> dict[str, Path]:
    index: dict[str, Path] = {}
    for package in root.rglob("*.pak"):
        index.setdefault(package.stem.lower(), package)
        index.setdefault(package.parent.name.lower(), package)
    return index


def find_package(index: dict[str, Path], *names: object) -> Path | None:
    for name in names:
        if name:
            package = index.get(str(name).lower())
            if package:
                return package
    return None


def find_tile_groups(root: Path, grid_size: int, expected_count: int) -> list[list[Path]]:
    groups: dict[tuple[Path, str], dict[int, Path]] = defaultdict(dict)
    pattern = re.compile(r"^(.*?)(\d{3})$", re.IGNORECASE)
    for tile in root.rglob("*.dds"):
        match = pattern.match(tile.stem)
        if not match:
            continue
        index = int(match.group(2))
        if index < expected_count:
            groups[(tile.parent, match.group(1).lower())][index] = tile
    complete = [
        [tiles[index] for index in range(expected_count)]
        for (_, _), tiles in sorted(groups.items(), key=lambda item: (str(item[0][0]).lower(), item[0][1]))
        if set(tiles) == set(range(expected_count))
    ]
    if any(len(group) != grid_size * grid_size for group in complete):
        raise RuntimeError("Map tile group did not match its expected square grid")
    return complete


def indexed_tiles(root: Path, prefix: str, count: int) -> list[Path]:
    files = {item.name.lower(): item for item in root.glob("*.dds")}
    result = []
    for index in range(count):
        item = files.get(f"{prefix}{index:03}.dds".lower())
        if not item:
            return []
        result.append(item)
    return result


def find_case_insensitive_directory(root: Path, name: str) -> Path | None:
    target = name.lower()
    return next((item for item in root.rglob("*") if item.is_dir() and item.name.lower() == target), None)


def stitch_tiles(tiles: list[Path], grid_size: int) -> Image.Image:
    first = Image.open(tiles[0]).convert("RGB")
    tile_width, tile_height = first.size
    result = Image.new("RGB", (tile_width * grid_size, tile_height * grid_size))
    for column in range(grid_size):
        for row in range(grid_size):
            tile = Image.open(tiles[column * grid_size + row]).convert("RGB")
            if tile.size != (tile_width, tile_height):
                raise RuntimeError(f"Map tile dimensions differ in {tiles[column * grid_size + row]}")
            result.paste(tile, (column * tile_width, row * tile_height))
    return result


def coordinate_grid(name: str, world_size: int) -> Image.Image:
    size = 1024
    image = Image.new("RGB", (size, size), "#091019")
    draw = ImageDraw.Draw(image)
    font = load_font(17)
    title_font = load_font(25)
    minor = "#172536"
    major = "#2b4055"
    label = "#7890a8"
    for index in range(33):
        position = round(index * (size - 1) / 32)
        color = major if index % 4 == 0 else minor
        width = 2 if index % 4 == 0 else 1
        draw.line((position, 0, position, size), fill=color, width=width)
        draw.line((0, position, size, position), fill=color, width=width)
    draw.rectangle((0, 0, size - 1, size - 1), outline="#496177", width=3)
    draw.text((28, 24), name, fill="#d7e2ed", font=title_font)
    draw.text((28, 60), "Local coordinate reference", fill=label, font=font)
    for index in range(0, 33, 4):
        value = round(index * world_size / 32)
        position = round(index * (size - 1) / 32)
        text = f"{value:,}"
        draw.text((position + 5, size - 25), text, fill=label, font=font, anchor="ls")
        draw.text((8, size - position - 5), text, fill=label, font=font, anchor="ls")
    return image


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for font_path in (Path(r"C:\Windows\Fonts\segoeui.ttf"), Path(r"C:\Windows\Fonts\arial.ttf")):
        if font_path.is_file():
            return ImageFont.truetype(str(font_path), size)
    return ImageFont.load_default()


def save_webp(image: Image.Image, path: Path, quality: int) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    image.save(temporary, "WEBP", quality=quality, method=6)
    os.replace(temporary, path)


def layer_manifest(
    layer_id: str,
    name: str,
    asset_name: str,
    asset_kind: str,
    asset_path: Path,
    package: Path | None,
    client_root: Path | None,
    tiles: Iterable[Path],
) -> dict[str, object]:
    result: dict[str, object] = {
        "id": layer_id,
        "name": name,
        "asset": asset_name,
        "assetKind": asset_kind,
        "assetSha256": sha256_file(asset_path),
        "tileLayout": [tile.name for tile in tiles],
    }
    if package and client_root:
        result["clientPak"] = package.relative_to(client_root).as_posix()
        result["clientPakSha256"] = sha256_file(package)
    return result


def asset_filename(map_id: int, display_name: str, layer_id: str) -> str:
    return f"{map_id}-{safe_slug(display_name)}-{safe_slug(layer_id)}.webp"


def safe_slug(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return normalized or "map"


def display_name_for(world_name: object, map_id: int, primary_source: str) -> str:
    source_stem = Path(primary_source).stem
    prefix = f"{map_id}_"
    raw = source_stem[len(prefix):] if source_stem.startswith(prefix) else str(world_name)
    if raw[:1].islower():
        raw = str(world_name)
    if map_id == 900110000:
        raw = "GM_Isle"
    raw = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", raw).replace("_", " ")
    return re.sub(r"\s+", " ", raw).strip()


if __name__ == "__main__":
    main()
