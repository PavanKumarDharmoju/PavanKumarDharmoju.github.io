#!/usr/bin/env python3
"""Generate the pixelsbypavan logo files from one pixel grid.

The mark is a "P" drawn on a 5x6 grid of square pixels, plus one stray red
pixel. Every file below is derived from GRID, so re-run this script after
changing it:

    python3 scripts/generate_logo.py

Writes (paths relative to the repo root):
    favicon.svg                     adapts to light/dark browser tabs
    favicon.ico                     16 and 32 px, black tile
    apple-touch-icon.png            180 px, black square (iOS rounds it)
    assets/img/logo/logo.svg        black P on transparent, for light backgrounds
    assets/img/logo/logo-white.svg  white P on transparent, for dark backgrounds
    assets/img/logo/logo-512.png    512 px black tile, for profiles and sharing
"""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# '#' = P pixel, 'r' = red pixel, '.' = empty
GRID = [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#....",
    "#..r.",
]
COLS, ROWS = len(GRID[0]), len(GRID)

RED = "#E5202B"
BLACK = "#111111"
WHITE = "#FFFFFF"


def cells(kind):
    return [(x, y) for y, row in enumerate(GRID) for x, ch in enumerate(row) if ch == kind]


def rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------- SVG ----------

def rects(kind, scale=1, ox=0, oy=0):
    return "".join(
        f'<rect x="{ox + x * scale}" y="{oy + y * scale}" width="{scale}" height="{scale}"/>'
        for x, y in cells(kind)
    )


def mark_svg(color):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {COLS} {ROWS}" shape-rendering="crispEdges">'
        f'<title>pixelsbypavan</title>'
        f'<g fill="{color}">{rects("#")}</g><g fill="{RED}">{rects("r")}</g></svg>\n'
    )


def favicon_svg():
    # 16-unit canvas with 2-unit pixels, so the grid lands on whole device
    # pixels at both 16 and 32 px. The P flips to white on dark browser chrome.
    ox, oy = (16 - COLS * 2) // 2, (16 - ROWS * 2) // 2
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">'
        f'<style>.p{{fill:{BLACK}}}@media (prefers-color-scheme:dark){{.p{{fill:{WHITE}}}}}</style>'
        f'<g class="p">{rects("#", 2, ox, oy)}</g><g fill="{RED}">{rects("r", 2, ox, oy)}</g></svg>\n'
    )


# ---------- PNG / ICO (no third-party dependencies) ----------

def tile_pixels(size, cell, radius):
    """RGBA rows: white P on a black tile with anti-aliased rounded corners."""
    ox, oy = (size - COLS * cell) // 2, (size - ROWS * cell) // 2
    colors = {(x, y): rgb(WHITE) for x, y in cells("#")}
    colors.update({(x, y): rgb(RED) for x, y in cells("r")})
    ss = 4  # supersampling for the corner edges

    def coverage(px, py):
        if radius == 0:
            return 1.0
        hits = 0
        for sy in range(ss):
            for sx in range(ss):
                x, y = px + (sx + 0.5) / ss, py + (sy + 0.5) / ss
                cx = min(max(x, radius), size - radius)
                cy = min(max(y, radius), size - radius)
                hits += (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
        return hits / ss ** 2

    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            gx, gy = px - ox, py - oy
            key = (gx // cell, gy // cell) if gx >= 0 and gy >= 0 else None
            r, g, b = colors.get(key, rgb(BLACK))
            row += bytes((r, g, b, round(255 * coverage(px, py))))
        rows.append(bytes(row))
    return rows


def png(rows):
    size = len(rows)
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def ico(pngs):
    """ICO container holding PNG images (supported by every current browser)."""
    head = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries, body = b"", b""
    for size, data in pngs:
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(data), offset + len(body))
        body += data
    return head + entries + body


def main():
    logo_dir = ROOT / "assets/img/logo"
    logo_dir.mkdir(parents=True, exist_ok=True)
    out = {
        ROOT / "favicon.svg": favicon_svg(),
        logo_dir / "logo.svg": mark_svg(BLACK),
        logo_dir / "logo-white.svg": mark_svg(WHITE),
    }
    for path, text in out.items():
        path.write_text(text)

    # cell sizes are whole pixels so the P stays sharp at every size
    (ROOT / "favicon.ico").write_bytes(ico([
        (16, png(tile_pixels(16, 2, 3))),
        (32, png(tile_pixels(32, 4, 6))),
    ]))
    (ROOT / "apple-touch-icon.png").write_bytes(png(tile_pixels(180, 20, 0)))
    (logo_dir / "logo-512.png").write_bytes(png(tile_pixels(512, 56, 0)))

    for p in [*out, ROOT / "favicon.ico", ROOT / "apple-touch-icon.png", logo_dir / "logo-512.png"]:
        print(p.relative_to(ROOT))


if __name__ == "__main__":
    main()
