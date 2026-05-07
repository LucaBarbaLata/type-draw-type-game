# Usage: python3 find-corrupt-images.py /path/to/games/

import os
import sys

from PIL import Image

walk_dir = os.path.realpath(sys.argv[1])

if not os.path.isdir(walk_dir):
    print('Error: not a valid directory: ' + walk_dir)
    sys.exit(1)

print('Directory: ' + walk_dir)

count = 0

for root, subdirs, files in os.walk(walk_dir):
    for filename in files:
        if filename.endswith('.png'):
            count = count + 1
            filepath = os.path.join(root, filename)
            v_image = Image.open(filepath)
            try:
                v_image.verify()
            except:
                print('File', filepath, 'failed verification!')
            
print('Verified', count, 'png files')
