import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

def extract_large_arabic_calligraphy(source_path):
    img = Image.open(source_path).convert('RGB')
    arr = np.array(img)
    white = (arr[:, :, 0] > 180) & (arr[:, :, 1] > 180) & (arr[:, :, 2] > 180)
    y_idx, x_idx = np.where(white)
    
    pad = 10
    crop_box = (x_idx.min() - pad, y_idx.min() - pad, x_idx.max() + pad, y_idx.max() + pad)
    art_crop = img.crop(crop_box).convert('RGBA')
    
    cal_crop = art_crop.crop((0, 0, art_crop.width, 480))
    cal_arr = np.array(cal_crop, dtype=float)

    bg_color = (cal_arr[:5, :5, :3].mean(axis=(0,1)) + cal_arr[-5:, -5:, :3].mean(axis=(0,1))) / 2

    diff = np.linalg.norm(cal_arr[:, :, :3] - bg_color, axis=2)
    alpha = np.clip((diff - 25) / (175 - 25), 0, 1) * 255

    clean_art = np.zeros_like(cal_arr, dtype=np.uint8)
    clean_art[:, :, :3] = 255
    clean_art[:, :, 3] = alpha.astype(np.uint8)

    y_non_zero, x_non_zero = np.where(clean_art[:, :, 3] > 15)
    tight_cal = clean_art[y_non_zero.min():y_non_zero.max()+1, x_non_zero.min():x_non_zero.max()+1]

    art_png = Image.fromarray(tight_cal)
    art_png.save('public/assets/favicon/calligraphy-white-clean.png', 'PNG')
    return art_png

def generate_vibrant_icon(art, size, is_solid=True, bg_color=(16, 185, 129), text_tint=(238, 246, 240), icon_ratio=0.83, corner_ratio=0.20):
    scale = 4
    high_size = size * scale
    
    # Solid background eliminates transparent white-corner artifacts on WhatsApp / iOS
    mode = 'RGB' if is_solid else 'RGBA'
    canvas = Image.new('RGBA', (high_size, high_size), (0, 0, 0, 0) if not is_solid else (*bg_color, 255))
    draw = ImageDraw.Draw(canvas)
    
    if not is_solid:
        radius = int(high_size * corner_ratio)
        draw.rounded_rectangle([(0, 0), (high_size - 1, high_size - 1)], radius=radius, fill=(*bg_color, 255))
    
    # Place calligraphy with balanced padding
    max_dim = int(high_size * icon_ratio)
    art_ratio = min(max_dim / art.width, max_dim / art.height)
    new_w = int(art.width * art_ratio)
    new_h = int(art.height * art_ratio)
    art_scaled = art.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    art_arr = np.array(art_scaled)
    alpha = art_arr[:, :, 3]
    
    # Soft shadow behind calligraphy
    shadow_mask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=scale * 1.5))
    ox = (high_size - new_w) // 2
    oy = (high_size - new_h) // 2
    shadow_color = Image.new('RGBA', (new_w, new_h), (5, 90, 60, 110))
    canvas.paste(shadow_color, (ox + scale, oy + int(scale * 1.2)), shadow_mask)
    
    # Polished pearl-ivory calligraphy with subtle gradient
    tinted_art = np.zeros_like(art_arr)
    y_coords = np.linspace(0, 1, new_h).reshape(-1, 1)
    r_grad = 250 - y_coords * (250 - text_tint[0])
    g_grad = 253 - y_coords * (253 - text_tint[1])
    b_grad = 250 - y_coords * (250 - text_tint[2])
    
    tinted_art[:, :, 0] = np.clip(r_grad, 0, 255).astype(np.uint8)
    tinted_art[:, :, 1] = np.clip(g_grad, 0, 255).astype(np.uint8)
    tinted_art[:, :, 2] = np.clip(b_grad, 0, 255).astype(np.uint8)
    tinted_art[:, :, 3] = alpha
    
    text_img = Image.fromarray(tinted_art)
    canvas.paste(text_img, (ox, oy), text_img)
    
    if is_solid:
        return canvas.convert('RGB').resize((size, size), Image.Resampling.LANCZOS)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

def generate_og_share_banner(art, width=1200, height=630, bg_color=(16, 185, 129), icon_ratio=0.65):
    img = Image.new('RGB', (width, height), bg_color)
    max_dim = int(min(width, height) * icon_ratio)
    art_ratio = min(max_dim / art.width, max_dim / art.height)
    new_w = int(art.width * art_ratio)
    new_h = int(art.height * art_ratio)
    art_scaled = art.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    art_arr = np.array(art_scaled)
    alpha = art_arr[:, :, 3]
    
    shadow_mask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=4))
    ox = (width - new_w) // 2
    oy = (height - new_h) // 2
    shadow_color = Image.new('RGBA', (new_w, new_h), (5, 90, 60, 110))
    
    img_rgba = img.convert('RGBA')
    img_rgba.paste(shadow_color, (ox + 3, oy + 4), shadow_mask)
    img_rgba.paste(art_scaled, (ox, oy), art_scaled)
    return img_rgba.convert('RGB')

def main():
    source_path = 'public/final-app-logo.jpeg'
    if not os.path.exists(source_path):
        source_path = 'public/images/logos/1.jpeg'
    
    art = extract_large_arabic_calligraphy(source_path)

    # 1. Solid full-bleed icons (NO WHITE CORNERS on WhatsApp / iOS / Android)
    solid_icons = [
        ('public/assets/favicon/apple-touch-icon.png', 180, 0.83),
        ('public/assets/favicon/android-chrome-192x192.png', 192, 0.83),
        ('public/assets/favicon/android-chrome-512x512.png', 512, 0.83),
        ('public/og-share-icon.png', 512, 0.83),
    ]

    for dest_path, sz, ir in solid_icons:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        icon = generate_vibrant_icon(art, sz, is_solid=True, icon_ratio=ir)
        icon.save(dest_path, 'PNG', optimize=True)
        print(f"Generated solid {dest_path} ({sz}x{sz}) with vibrant emerald green.")

    # 2. Browser Tab Favicons
    fav_32 = generate_vibrant_icon(art, 32, is_solid=False, icon_ratio=0.85, corner_ratio=0.20)
    fav_16 = generate_vibrant_icon(art, 16, is_solid=False, icon_ratio=0.85, corner_ratio=0.20)
    fav_32.save('public/assets/favicon/favicon-32x32.png', 'PNG')
    fav_16.save('public/assets/favicon/favicon-16x16.png', 'PNG')

    # Multi-resolution favicon.ico
    ico_16 = generate_vibrant_icon(art, 16, is_solid=False, icon_ratio=0.85, corner_ratio=0.20)
    ico_32 = generate_vibrant_icon(art, 32, is_solid=False, icon_ratio=0.85, corner_ratio=0.20)
    ico_48 = generate_vibrant_icon(art, 48, is_solid=False, icon_ratio=0.85, corner_ratio=0.20)
    ico_32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print("Generated favicon.ico in all locations.")

    # 3. OG banner
    og_banner = generate_og_share_banner(art, 1200, 630, icon_ratio=0.65)
    og_banner.save('public/og-image.png', 'PNG', optimize=True)
    og_banner.save('public/assets/images/og-image.png', 'PNG', optimize=True)
    print("Generated solid OG share banner.")

if __name__ == '__main__':
    main()
