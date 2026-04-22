from PIL import Image
import os

ICONS_DIR = os.path.join(os.path.dirname(__file__), 'frontend', 'public', 'icons')

# These are the user's original images that have white backgrounds
files_to_convert = ['nethop.png', 'sword.png', 'mace.png', 'vanilla.png']

for fname in files_to_convert:
    path = os.path.join(ICONS_DIR, fname)
    if not os.path.exists(path):
        print(f"Skipping {fname} - not found")
        continue
    
    img = Image.open(path).convert('RGBA')
    pixels = img.load()
    w, h = img.size
    
    # Create new image with black background
    result = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    
    # Paste original on top, using alpha for transparency
    # For pixels that are close to white (background), make them black
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # If pixel is very light (near white) and not transparent, make it black
            if r > 240 and g > 240 and b > 240 and a > 200:
                pixels[x, y] = (0, 0, 0, 255)
    
    # Composite onto black background
    result = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    result = Image.alpha_composite(result, img)
    result.save(path)
    print(f"Converted {fname} - {w}x{h}")

print("Done!")
