import os
from PIL import Image

def create_full_green_icon(size, padding_ratio=0.20):
    # Base solid emerald green background #10b981 -> (16, 185, 129, 255)
    bg = Image.new('RGBA', (size, size), (16, 185, 129, 255))
    
    # Load quran line-art icon
    quran = Image.open('public/assets/favicon/quran (2).png').convert('RGBA')
    
    # Target icon dimension inside the green square
    inner_size = int(size * (1.0 - padding_ratio * 2))
    
    # Resize preserving aspect ratio
    quran.thumbnail((inner_size, inner_size), Image.Resampling.LANCZOS)
    
    # Center position
    offset_x = (size - quran.width) // 2
    offset_y = (size - quran.height) // 2
    
    # Paste Quran icon over solid green background using alpha mask
    bg.paste(quran, (offset_x, offset_y), quran)
    
    return bg

# Generate all favicon & app icon sizes
icons = {
    'public/assets/favicon/apple-touch-icon.png': 180,
    'public/assets/favicon/android-chrome-192x192.png': 192,
    'public/assets/favicon/android-chrome-512x512.png': 512,
    'public/assets/favicon/favicon-32x32.png': 32,
    'public/assets/favicon/favicon-16x16.png': 16,
}

for path, sz in icons.items():
    img = create_full_green_icon(sz, padding_ratio=0.18)
    img.save(path, 'PNG', optimize=True)
    print(f"Generated {path} ({sz}x{sz}) with full solid #10b981 background.")

# Also generate favicon.ico
fav32 = create_full_green_icon(32, padding_ratio=0.15)
fav16 = create_full_green_icon(16, padding_ratio=0.15)
fav32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
fav32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print("Generated favicon.ico with full solid green background.")
