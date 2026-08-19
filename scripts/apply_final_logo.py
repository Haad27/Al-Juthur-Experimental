import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

def extract_large_arabic_calligraphy(source_path):
    img = Image.open(source_path).convert('RGB')
    arr = np.array(img)
    # The white calligraphy has bright pixels
    white = (arr[:, :, 0] > 180) & (arr[:, :, 1] > 180) & (arr[:, :, 2] > 180)
    y_idx, x_idx = np.where(white)
    
    pad = 10
    crop_box = (x_idx.min() - pad, y_idx.min() - pad, x_idx.max() + pad, y_idx.max() + pad)
    art_crop = img.crop(crop_box).convert('RGBA')
    
    # Take the Arabic calligraphy part
    cal_crop = art_crop.crop((0, 0, art_crop.width, 480))
    cal_arr = np.array(cal_crop, dtype=float)

    bg_color = (cal_arr[:5, :5, :3].mean(axis=(0,1)) + cal_arr[-5:, -5:, :3].mean(axis=(0,1))) / 2

    # Extract crisp calligraphy with smooth alpha
    diff = np.linalg.norm(cal_arr[:, :, :3] - bg_color, axis=2)
    alpha = np.clip((diff - 25) / (175 - 25), 0, 1) * 255

    clean_art = np.zeros_like(cal_arr, dtype=np.uint8)
    clean_art[:, :, :3] = 255
    clean_art[:, :, 3] = alpha.astype(np.uint8)

    # Tight bounding box crop around the calligraphy
    y_non_zero, x_non_zero = np.where(clean_art[:, :, 3] > 15)
    tight_cal = clean_art[y_non_zero.min():y_non_zero.max()+1, x_non_zero.min():x_non_zero.max()+1]

    art_png = Image.fromarray(tight_cal)
    art_png.save('public/assets/favicon/calligraphy-white-clean.png', 'PNG')
    return art_png

def generate_polished_icon(art, size, bg_color=(43, 128, 52), text_tint=(238, 246, 240), icon_ratio=0.83, corner_ratio=0.20):
    scale = 4
    high_size = size * scale
    
    # 1. Background with rounded corners (classic Islamic green matching reference pic)
    canvas = Image.new('RGBA', (high_size, high_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = int(high_size * corner_ratio)
    draw.rounded_rectangle([(0, 0), (high_size - 1, high_size - 1)], radius=radius, fill=(*bg_color, 255))
    
    # 2. Scale calligraphy
    max_dim = int(high_size * icon_ratio)
    art_ratio = min(max_dim / art.width, max_dim / art.height)
    new_w = int(art.width * art_ratio)
    new_h = int(art.height * art_ratio)
    art_scaled = art.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    art_arr = np.array(art_scaled)
    alpha = art_arr[:, :, 3]
    
    # Subtle soft drop shadow for depth and polish
    shadow_mask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=scale * 1.5))
    ox = (high_size - new_w) // 2
    oy = (high_size - new_h) // 2
    shadow_color = Image.new('RGBA', (new_w, new_h), (12, 45, 20, 110))
    canvas.paste(shadow_color, (ox + scale, oy + int(scale * 1.2)), shadow_mask)
    
    # Polished text layer with subtle vertical organic gradient (ivory pearl to soft silver-white)
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
    
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

def generate_og_share_image(art, width=1200, height=630, bg_color=(43, 128, 52), icon_ratio=0.65):
    img = Image.new('RGBA', (width, height), (*bg_color, 255))
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
    
    art = extract_large_arabic_calligraphy(source_path)

    # 1. Generate rounded app icons & favicons with polished ivory calligraphy & authentic green (#2b8034)
    app_icons = [
        ('public/assets/favicon/apple-touch-icon.png', 180, 0.83, 0.20),
        ('public/assets/favicon/android-chrome-192x192.png', 192, 0.83, 0.20),
        ('public/assets/favicon/android-chrome-512x512.png', 512, 0.83, 0.20),
        ('public/assets/favicon/favicon-32x32.png', 32, 0.85, 0.20),
        ('public/assets/favicon/favicon-16x16.png', 16, 0.85, 0.20),
    ]

    for dest_path, sz, ir, cr in app_icons:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        icon = generate_polished_icon(art, sz, icon_ratio=ir, corner_ratio=cr)
        icon.save(dest_path, 'PNG', optimize=True)
        print(f"Generated {dest_path} ({sz}x{sz}) with polished calligraphy & authentic Islamic green.")

    # 2. Multi-resolution favicon.ico
    ico_16 = generate_polished_icon(art, 16, icon_ratio=0.85, corner_ratio=0.20)
    ico_32 = generate_polished_icon(art, 32, icon_ratio=0.85, corner_ratio=0.20)
    ico_48 = generate_polished_icon(art, 48, icon_ratio=0.85, corner_ratio=0.20)
    ico_32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print("Generated favicon.ico in all locations.")

    # 3. OG share preview images
    og_banner = generate_og_share_image(art, 1200, 630, icon_ratio=0.65)
    og_banner.save('public/og-image.png', 'PNG', optimize=True)
    og_banner.save('public/assets/images/og-image.png', 'PNG', optimize=True)

    og_sq = generate_polished_icon(art, 512, icon_ratio=0.83, corner_ratio=0.0) # Full square for OG
    og_sq.save('public/og-share-icon.png', 'PNG', optimize=True)
    print("Generated OG preview images.")

if __name__ == '__main__':
    main()
