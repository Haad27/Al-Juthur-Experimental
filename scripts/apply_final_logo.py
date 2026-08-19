import os
from PIL import Image, ImageDraw, ImageOps
import numpy as np

def extract_clean_calligraphy(source_path):
    img = Image.open(source_path).convert('RGB')
    arr = np.array(img)
    # The white calligraphy has bright pixels (e.g. > 180 in all 3 channels)
    white = (arr[:, :, 0] > 180) & (arr[:, :, 1] > 180) & (arr[:, :, 2] > 180)
    y_idx, x_idx = np.where(white)
    
    pad = 10
    crop_box = (x_idx.min() - pad, y_idx.min() - pad, x_idx.max() + pad, y_idx.max() + pad)
    art_crop = img.crop(crop_box).convert('RGBA')
    art_arr = np.array(art_crop, dtype=float)

    # Background color in art_crop is dark green around the corners
    bg_color = (art_arr[:5, :5, :3].mean(axis=(0,1)) + art_arr[-5:, -5:, :3].mean(axis=(0,1))) / 2

    # Extract crisp white with smooth alpha
    diff = np.linalg.norm(art_arr[:, :, :3] - bg_color, axis=2)
    alpha = np.clip((diff - 25) / (180 - 25), 0, 1) * 255

    clean_art = np.zeros_like(art_arr, dtype=np.uint8)
    clean_art[:, :, :3] = 255 # Pure white
    clean_art[:, :, 3] = alpha.astype(np.uint8)

    art_png = Image.fromarray(clean_art)
    art_png.save('public/assets/favicon/calligraphy-white-clean.png', 'PNG')
    return art_png

def generate_rounded_app_icon(art, size, icon_ratio=0.68, corner_ratio=0.20):
    scale = 4
    high_size = size * scale
    
    # 1. Emerald green canvas with rounded corners (#10b981 - signature previous green)
    canvas = Image.new('RGBA', (high_size, high_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = int(high_size * corner_ratio)
    draw.rounded_rectangle([(0, 0), (high_size - 1, high_size - 1)], radius=radius, fill=(16, 185, 129, 255))
    
    # 2. Place clean white calligraphy icon in center with padding
    max_dim = int(high_size * icon_ratio)
    art_ratio = min(max_dim / art.width, max_dim / art.height)
    new_w = int(art.width * art_ratio)
    new_h = int(art.height * art_ratio)
    art_scaled = art.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    ox = (high_size - new_w) // 2
    oy = (high_size - new_h) // 2
    canvas.paste(art_scaled, (ox, oy), art_scaled)
    
    # 3. Downscale with high quality Lanczos anti-aliasing
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

def generate_og_share_image(art, width=1200, height=630, icon_ratio=0.48):
    # Full emerald green banner (#10b981)
    img = Image.new('RGBA', (width, height), (16, 185, 129, 255))
    max_dim = int(min(width, height) * icon_ratio)
    art_ratio = min(max_dim / art.width, max_dim / art.height)
    new_w = int(art.width * art_ratio)
    new_h = int(art.height * art_ratio)
    art_scaled = art.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    ox = (width - new_w) // 2
    oy = (height - new_h) // 2
    img.paste(art_scaled, (ox, oy), art_scaled)
    return img

def main():
    source_path = 'public/final-app-logo.jpeg'
    if not os.path.exists(source_path):
        source_path = 'public/images/logos/1.jpeg'
    
    art = extract_clean_calligraphy(source_path)
    print("Extracted clean white calligraphy.")

    # 1. Generate rounded app icons & favicons with signature emerald green (#10b981)
    app_icons = [
        ('public/assets/favicon/apple-touch-icon.png', 180, 0.68, 0.20),
        ('public/assets/favicon/android-chrome-192x192.png', 192, 0.68, 0.20),
        ('public/assets/favicon/android-chrome-512x512.png', 512, 0.68, 0.20),
        ('public/assets/favicon/favicon-32x32.png', 32, 0.70, 0.20),
        ('public/assets/favicon/favicon-16x16.png', 16, 0.72, 0.20),
    ]

    for dest_path, sz, ir, cr in app_icons:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        icon = generate_rounded_app_icon(art, sz, icon_ratio=ir, corner_ratio=cr)
        icon.save(dest_path, 'PNG', optimize=True)
        print(f"Generated {dest_path} ({sz}x{sz}) with emerald green background.")

    # 2. Multi-resolution favicon.ico
    ico_16 = generate_rounded_app_icon(art, 16, 0.72, 0.20)
    ico_32 = generate_rounded_app_icon(art, 32, 0.70, 0.20)
    ico_48 = generate_rounded_app_icon(art, 48, 0.70, 0.20)
    ico_32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print("Generated favicon.ico in all locations.")

    # 3. OG share preview images
    og_banner = generate_og_share_image(art, 1200, 630, 0.48)
    og_banner.save('public/og-image.png', 'PNG', optimize=True)
    og_banner.save('public/assets/images/og-image.png', 'PNG', optimize=True)

    og_sq = generate_rounded_app_icon(art, 512, 0.68, 0.0) # Full square for OG
    og_sq.save('public/og-share-icon.png', 'PNG', optimize=True)
    print("Generated OG preview images.")

if __name__ == '__main__':
    main()
