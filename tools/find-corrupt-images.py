# Usage: python3 find-corrupt-images.py /path/to/games/
#
# Operator tool: walks the given games directory (the storage dir's "games" folder) and
# verifies every PNG in it. It only ever reads files below that directory and does not
# follow symlinks out of it.

import os
import sys

from PIL import Image

if len(sys.argv) != 2:
    print('Usage: python3 find-corrupt-images.py /path/to/games/')
    sys.exit(1)

walk_dir = os.path.realpath(sys.argv[1])

if not os.path.isdir(walk_dir):
    print('Error: not a valid directory: ' + walk_dir)
    sys.exit(1)

print('Directory: ' + walk_dir)

count = 0

for root, subdirs, files in os.walk(walk_dir, followlinks=False):
    for filename in files:
        if filename.endswith('.png'):
            filepath = os.path.join(root, filename)
            # skip symlinks and anything that resolves outside the directory being checked
            if os.path.islink(filepath) or os.path.commonpath([walk_dir, os.path.realpath(filepath)]) != walk_dir:
                continue
            count = count + 1
            try:
                with Image.open(filepath) as v_image:
                    v_image.verify()
            except Exception:
                print('File', filepath, 'failed verification!')

print('Verified', count, 'png files')
