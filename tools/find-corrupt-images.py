# Usage: python3 find-corrupt-images.py /path/to/games/

import os
import sys

from PIL import Image

if len(sys.argv) < 2:
    print("Usage: python3 find-corrupt-images.py /path/to/games/")
    sys.exit(1)

walk_dir = sys.argv[1]

if not os.path.isdir(walk_dir):
    print(f"Error: {walk_dir} is not a valid directory")
    sys.exit(1)

print('Directory: ' + os.path.abspath(walk_dir))

count = 0

for root, subdirs, files in os.walk(walk_dir):
    for filename in files:
        if filename.endswith('.png'):
            count = count + 1
            filepath = os.path.join(root, filename)
            try:
                v_image = Image.open(filepath)
                v_image.verify()
            except Exception as e:
                print(f'File {filepath} failed verification: {type(e).__name__}: {e}')

print('Verified', count, 'png files')
