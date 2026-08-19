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

def generate_black_text_icon(art, size, is_rounded=True, bg_color=(16, 185, 129), icon_ratio=0.83, corner_ratio=0.22):
    scale = 4
    high_size = size * scale
    
    if is_rounded:
        canvas = Image.new('RGBA', (high_size, high_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        radius = int(high_size * corner_ratio)
        draw.rounded_rectangle([(0, 0), (high_size - 1, high_size - 1)], radius=radius, fill=(*bg_color, 255))
    else:
        canvas = Image.new('RGB', (high_size, high_size), bg_color).convert('RGBA')
    
    max_dim = int(high_size * icon_ratio)
    art_ratio = min(max_dim / art.width, max_dim / art.height)
    new_w = int(art.width * art_ratio)
    new_h = int(art.height * art_ratio)
    art_scaled = art.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    art_arr = np.array(art_scaled)
    alpha = art_arr[:, :, 3]
    
    # Subtle soft mint-glow rim for crisp contrast
    glow_mask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=scale * 1.0))
    ox = (high_size - new_w) // 2
    oy = (high_size - new_h) // 2
    glow_color = Image.new('RGBA', (new_w, new_h), (52, 211, 153, 90))
    canvas.paste(glow_color, (ox, oy), glow_mask)
    
    # Deep, rich onyx black calligraphy (12, 18, 14)
    black_art = np.zeros_like(art_arr)
    black_art[:, :, 0] = 12
    black_art[:, :, 1] = 18
    black_art[:, :, 2] = 14
    black_art[:, :, 3] = alpha
    
    text_img = Image.fromarray(black_art)
    canvas.paste(text_img, (ox, oy), text_img)
    
    if not is_rounded:
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
    
    glow_mask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=3))
    ox = (width - new_w) // 2
    oy = (height - new_h) // 2
    glow_color = Image.new('RGBA', (new_w, new_h), (52, 211, 153, 90))
    
    img_rgba = img.convert('RGBA')
    img_rgba.paste(glow_color, (ox, oy), glow_mask)
    
    black_art = np.zeros_like(art_arr)
    black_art[:, :, 0] = 12
    black_art[:, :, 1] = 18
    black_art[:, :, 2] = 14
    black_art[:, :, 3] = alpha
    text_img = Image.fromarray(black_art)
    img_rgba.paste(text_img, (ox, oy), text_img)
    
    return img_rgba.convert('RGB')

def main():
    source_path = 'public/final-app-logo.jpeg'
    if not os.path.exists(source_path):
        source_path = 'public/images/logos/1.jpeg'
    
    art = extract_large_arabic_calligraphy(source_path)

    # 1. In-app Icons & Favicons with Deep Black Calligraphy + Rounded Corners
    rounded_icons = [
        ('public/assets/favicon/apple-touch-icon.png', 180, 0.83, 0.22),
        ('public/assets/favicon/android-chrome-192x192.png', 192, 0.83, 0.22),
        ('public/assets/favicon/android-chrome-512x512.png', 512, 0.83, 0.22),
        ('public/assets/favicon/favicon-32x32.png', 32, 0.85, 0.22),
        ('public/assets/favicon/favicon-16x16.png', 16, 0.85, 0.22),
    ]

    for dest_path, sz, ir, cr in rounded_icons:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        icon = generate_black_text_icon(art, sz, is_rounded=True, icon_ratio=ir, corner_ratio=cr)
        icon.save(dest_path, 'PNG', optimize=True)
        print(f"Generated rounded in-app {dest_path} ({sz}x{sz}) with black calligraphy.")

    # Multi-resolution favicon.ico
    ico_16 = generate_black_text_icon(art, 16, is_rounded=True, icon_ratio=0.85, corner_ratio=0.22)
    ico_32 = generate_black_text_icon(art, 32, is_rounded=True, icon_ratio=0.85, corner_ratio=0.22)
    ico_48 = generate_black_text_icon(art, 48, is_rounded=True, icon_ratio=0.85, corner_ratio=0.22)
    ico_32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print("Generated favicon.ico with black calligraphy.")

    # 2. Social Share Link Previews (Solid full-bleed square with black calligraphy)
    og_sq = generate_black_text_icon(art, 512, is_rounded=False, icon_ratio=0.83)
    og_sq.save('public/og-share-icon.png', 'PNG', optimize=True)

    og_banner = generate_og_share_banner(art, 1200, 630, icon_ratio=0.65)
    og_banner.save('public/og-image.png', 'PNG', optimize=True)
    og_banner.save('public/assets/images/og-image.png', 'PNG', optimize=True)
    print("Generated solid OG share banner & square icon with black calligraphy.")

if __name__ == '__main__':
    main()
