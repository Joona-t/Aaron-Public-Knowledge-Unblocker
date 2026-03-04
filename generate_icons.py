#!/usr/bin/env python3
"""Generate Aaron extension icons at 16, 48, 128px.
Dark academic aesthetic — hollow diamond on dark background with green accent.
Matches the ◈ logo used in the panel header."""

from PIL import Image, ImageDraw
import os

SIZES = [16, 48, 128]
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')

BG_COLOR = (13, 13, 13, 255)       # #0d0d0d
ACCENT   = (74, 222, 128, 255)     # #4ade80 — same green used in the badge
BORDER   = (42, 42, 42, 255)       # #2a2a2a — subtle border like the panel

def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded background
    margin = max(1, size // 16)
    draw.rounded_rectangle(
        [margin, margin, size - margin - 1, size - margin - 1],
        radius=max(2, size // 8),
        fill=BG_COLOR,
        outline=BORDER,
        width=max(1, size // 32),
    )

    # Outer diamond (green accent)
    cx, cy = size / 2, size / 2
    r = size * 0.32
    outer = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    draw.polygon(outer, fill=ACCENT)

    # Inner diamond (cut out — creates hollow ◈ effect)
    ri = r * 0.5
    inner = [(cx, cy - ri), (cx + ri, cy), (cx, cy + ri), (cx - ri, cy)]
    draw.polygon(inner, fill=BG_COLOR)

    # Flatten to RGB — Chrome Web Store prefers no alpha on icons
    flat = Image.new('RGB', (size, size), (13, 13, 13))
    flat.paste(img, mask=img.split()[3])
    return flat

os.makedirs(OUTPUT_DIR, exist_ok=True)

for size in SIZES:
    icon = draw_icon(size)
    path = os.path.join(OUTPUT_DIR, f'icon{size}.png')
    icon.save(path, format='PNG', optimize=True)
    print(f'  {path} ({size}x{size})')

print('Done.')
