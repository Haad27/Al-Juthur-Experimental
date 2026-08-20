import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

def extract_large_arabic_calligraphy(source_path):
    clean_cached = 'public/assets/favicon/calligraphy-white-clean.png'
    if os.path.exists(clean_cached):
        return Image.open(clean_cached).convert('RGBA')

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
    art_png.save(clean_cached, 'PNG')
    return art_png

# Palette: Obsidian Black Background + Glowing Emerald Mint Calligraphy (No Border)
BG_COLOR = (12, 12, 15)           # #0c0c0f (Deep Obsidian Black)
FG_COLOR = (110, 231, 183)        # #6ee7b7 (Luminous Mint/Emerald Calligraphy)
GLOW_COLOR = (16, 185, 129, 150)  # #10b981 (Soft Emerald Aura Glow)
BORDER_COLOR = None               # No border
BORDER_WIDTH = 0                  # 0 border width

def generate_logo_icon(art, size, is_rounded=True, bg_color=BG_COLOR, fg_color=FG_COLOR, glow_color=GLOW_COLOR, border_color=BORDER_COLOR, border_width=BORDER_WIDTH, icon_ratio=0.82, corner_ratio=0.22):
    scale = 4
    high_size = size * scale
    
    if is_rounded:
        canvas = Image.new('RGBA', (high_size, high_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        radius = int(high_size * corner_ratio)
        draw.rounded_rectangle(
            [(0, 0), (high_size - 1, high_size - 1)],
            radius=radius,
            fill=(*bg_color, 255),
            outline=(*border_color, 255) if border_color and border_width > 0 else None,
            width=int(border_width * scale) if border_color and border_width > 0 else 0
        )
    else:
        canvas = Image.new('RGB', (high_size, high_size), bg_color).convert('RGBA')
    
    max_dim = int(high_size * icon_ratio)
    art_ratio = min(max_dim / art.width, max_dim / art.height)
    new_w = int(art.width * art_ratio)
    new_h = int(art.height * art_ratio)
    art_scaled = art.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    art_arr = np.array(art_scaled)
    alpha = art_arr[:, :, 3]
    
    # Glow effect
    if glow_color and glow_color[3] > 0:
        glow_mask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=scale * 1.5))
        ox = (high_size - new_w) // 2
        oy = (high_size - new_h) // 2
        glow_layer = Image.new('RGBA', (new_w, new_h), glow_color)
        canvas.paste(glow_layer, (ox, oy), glow_mask)
    else:
        ox = (high_size - new_w) // 2
        oy = (high_size - new_h) // 2
        
    # Foreground Calligraphy
    fg_art = np.zeros_like(art_arr)
    fg_art[:, :, 0] = fg_color[0]
    fg_art[:, :, 1] = fg_color[1]
    fg_art[:, :, 2] = fg_color[2]
    fg_art[:, :, 3] = alpha
    
    text_img = Image.fromarray(fg_art)
    canvas.paste(text_img, (ox, oy), text_img)
    
    if not is_rounded:
        return canvas.convert('RGB').resize((size, size), Image.Resampling.LANCZOS)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

def generate_og_share_banner(art, width=1200, height=630, bg_color=BG_COLOR, fg_color=FG_COLOR, glow_color=GLOW_COLOR, icon_ratio=0.62):
    img = Image.new('RGB', (width, height), bg_color)
    max_dim = int(min(width, height) * icon_ratio)
    art_ratio = min(max_dim / art.width, max_dim / art.height)
    new_w = int(art.width * art_ratio)
    new_h = int(art.height * art_ratio)
    art_scaled = art.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    art_arr = np.array(art_scaled)
    alpha = art_arr[:, :, 3]
    
    glow_mask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=5))
    ox = (width - new_w) // 2
    oy = (height - new_h) // 2
    glow_layer = Image.new('RGBA', (new_w, new_h), glow_color)
    
    img_rgba = img.convert('RGBA')
    img_rgba.paste(glow_layer, (ox, oy), glow_mask)
    
    fg_art = np.zeros_like(art_arr)
    fg_art[:, :, 0] = fg_color[0]
    fg_art[:, :, 1] = fg_color[1]
    fg_art[:, :, 2] = fg_color[2]
    fg_art[:, :, 3] = alpha
    text_img = Image.fromarray(fg_art)
    img_rgba.paste(text_img, (ox, oy), text_img)
    
    return img_rgba.convert('RGB')

def main():
    source_path = 'public/final-app-logo.jpeg'
    if not os.path.exists(source_path):
        source_path = 'public/images/logos/1.jpeg'
    
    art = extract_large_arabic_calligraphy(source_path)

    # 1. In-app Icons & Favicons with Graphite & Silver
    rounded_icons = [
        ('public/assets/favicon/apple-touch-icon.png', 180, 0.82, 0.22),
        ('public/assets/favicon/android-chrome-192x192.png', 192, 0.82, 0.22),
        ('public/assets/favicon/android-chrome-512x512.png', 512, 0.82, 0.22),
        ('public/assets/favicon/favicon-32x32.png', 32, 0.85, 0.22),
        ('public/assets/favicon/favicon-16x16.png', 16, 0.85, 0.22),
        ('public/final-app-logo-cropped.png', 512, 0.82, 0.22),
    ]

    for dest_path, sz, ir, cr in rounded_icons:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        icon = generate_logo_icon(art, sz, is_rounded=True, icon_ratio=ir, corner_ratio=cr)
        icon.save(dest_path, 'PNG', optimize=True)
        print(f"Generated {dest_path} ({sz}x{sz}) - Graphite & Silver")

    # Multi-resolution favicon.ico
    ico_16 = generate_logo_icon(art, 16, is_rounded=True, icon_ratio=0.85, corner_ratio=0.22)
    ico_32 = generate_logo_icon(art, 32, is_rounded=True, icon_ratio=0.85, corner_ratio=0.22)
    ico_48 = generate_logo_icon(art, 48, is_rounded=True, icon_ratio=0.85, corner_ratio=0.22)
    ico_32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print("Generated favicon.ico in all locations.")

    # 2. Social Share Link Previews (Solid full-bleed square with Graphite & Silver)
    og_sq = generate_logo_icon(art, 512, is_rounded=False, icon_ratio=0.82)
    og_sq.save('public/og-share-icon.png', 'PNG', optimize=True)
    og_sq.save('public/og-square.png', 'PNG', optimize=True)

    og_banner = generate_og_share_banner(art, 1200, 630, icon_ratio=0.62)
    og_banner.save('public/og-image.png', 'PNG', optimize=True)
    og_banner.save('public/assets/images/og-image.png', 'PNG', optimize=True)
    print("Generated solid OG share banner & square icons.")

if __name__ == '__main__':
    main()
