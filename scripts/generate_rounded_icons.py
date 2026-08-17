import os
from PIL import Image, ImageDraw

def generate_rounded_app_icon(size, icon_ratio=0.55, corner_ratio=0.22):
    # High-resolution supersampling for ultra-smooth anti-aliased rounded corners
    scale = 4
    high_size = size * scale
    
    # 1. Create transparent canvas
    img = Image.new('RGBA', (high_size, high_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 2. Draw smooth rounded rectangle in emerald #10b981
    radius = int(high_size * corner_ratio)
    draw.rounded_rectangle([(0, 0), (high_size - 1, high_size - 1)], radius=radius, fill=(16, 185, 129, 255))
    
    # 3. Load and place Quran line-art icon with generous padding
    quran = Image.open('public/assets/favicon/quran (2).png').convert('RGBA')
    inner_dim = int(high_size * icon_ratio)
    quran.thumbnail((inner_dim, inner_dim), Image.Resampling.LANCZOS)
    
    ox = (high_size - quran.width) // 2
    oy = (high_size - quran.height) // 2
    img.paste(quran, (ox, oy), quran)
    
    # 4. Downscale with high quality Lanczos anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# Generate app icons, favicons, and loading screen assets
app_icons = [
    ('public/assets/favicon/apple-touch-icon.png', 180, 0.55, 0.22),
    ('public/assets/favicon/android-chrome-192x192.png', 192, 0.55, 0.22),
    ('public/assets/favicon/android-chrome-512x512.png', 512, 0.55, 0.22),
    ('public/assets/favicon/favicon-32x32.png', 32, 0.58, 0.22),
    ('public/assets/favicon/favicon-16x16.png', 16, 0.60, 0.22),
]

for path, sz, icon_r, corner_r in app_icons:
    im = generate_rounded_app_icon(sz, icon_ratio=icon_r, corner_ratio=corner_r)
    im.save(path, 'PNG', optimize=True)
    print(f"Generated {path} ({sz}x{sz}) with smooth rounded corners and padding.")

# Generate favicon.ico with anti-aliased rounded icons
im32 = generate_rounded_app_icon(32, 0.58, 0.22)
im16 = generate_rounded_app_icon(16, 0.60, 0.22)
im48 = generate_rounded_app_icon(48, 0.58, 0.22)
im32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
im32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print("Generated favicon.ico with rounded corners and padding.")

# Generate full-bleed solid green share preview image for WhatsApp/iMessage/Telegram link sharing (no white borders)
def generate_og_share_image(width=1200, height=630, icon_ratio=0.45):
    img = Image.new('RGBA', (width, height), (16, 185, 129, 255))
    quran = Image.open('public/assets/favicon/quran (2).png').convert('RGBA')
    inner_dim = int(min(width, height) * icon_ratio)
    quran.thumbnail((inner_dim, inner_dim), Image.Resampling.LANCZOS)
    ox = (width - quran.width) // 2
    oy = (height - quran.height) // 2
    img.paste(quran, (ox, oy), quran)
    return img

og_img = generate_og_share_image(1200, 630, 0.48)
og_img.save('public/og-image.png', 'PNG', optimize=True)
og_img.save('public/assets/images/og-image.png', 'PNG', optimize=True)

og_sq = generate_og_share_image(512, 512, 0.55)
og_sq.save('public/og-share-icon.png', 'PNG', optimize=True)
print("Generated public/og-image.png & public/og-share-icon.png for link preview.")
