import os
from PIL import Image

def generate_clean_green_icon(width, height, icon_ratio=0.62):
    # Pure solid emerald green #10b981
    img = Image.new('RGBA', (width, height), (16, 185, 129, 255))
    
    quran = Image.open('public/assets/favicon/quran (2).png').convert('RGBA')
    
    # Scale quran icon to fit
    target_dim = int(min(width, height) * icon_ratio)
    quran.thumbnail((target_dim, target_dim), Image.Resampling.LANCZOS)
    
    ox = (width - quran.width) // 2
    oy = (height - quran.height) // 2
    
    img.paste(quran, (ox, oy), quran)
    return img

# 1. Generate square icons
icons_to_make = [
    ('public/assets/favicon/apple-touch-icon.png', 180, 180, 0.65),
    ('public/assets/favicon/android-chrome-192x192.png', 192, 192, 0.65),
    ('public/assets/favicon/android-chrome-512x512.png', 512, 512, 0.65),
    ('public/assets/favicon/favicon-32x32.png', 32, 32, 0.70),
    ('public/assets/favicon/favicon-16x16.png', 16, 16, 0.70),
    ('public/og-image.png', 1200, 630, 0.55),
    ('public/assets/images/og-image.png', 1200, 630, 0.55),
    ('public/og-square.png', 1200, 1200, 0.65),
]

for path, w, h, ratio in icons_to_make:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img = generate_clean_green_icon(w, h, ratio)
    img.save(path, 'PNG', optimize=True)
    print(f"Generated {path} ({w}x{h}) - Pure Green + Quran Icon")

fav32 = generate_clean_green_icon(32, 32, 0.70)
fav32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
fav32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print("Generated favicon.ico with pure green + Quran icon.")
