"""Convert HEIC images to WebP format.

Usage:
    python scripts/python/convert_heic_to_webp.py <src_dir> <dest_dir> [--quality 80]
"""

import argparse
import os
import glob

from pillow_heif import register_heif_opener
from PIL import Image


def convert(src_dir: str, dest_dir: str, quality: int = 80) -> int:
    register_heif_opener()
    os.makedirs(dest_dir, exist_ok=True)

    count = 0
    for f in sorted(glob.glob(os.path.join(src_dir, '*.heic'), recursive=False)):
        name = os.path.splitext(os.path.basename(f))[0]
        out = os.path.join(dest_dir, f'{name}.webp')
        img = Image.open(f)
        img.save(out, 'webp', quality=quality)
        print(f'  {name}.webp')
        count += 1

    return count


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert HEIC to WebP')
    parser.add_argument('src', help='Source directory with .heic files')
    parser.add_argument('dest', help='Destination directory for .webp files')
    parser.add_argument('--quality', type=int, default=80, help='WebP quality (default: 80)')
    args = parser.parse_args()

    total = convert(args.src, args.dest, args.quality)
    print(f'Converted: {total} files')
