import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

def get_clean_calligraphy():
    clean_path = 'public/assets/favicon/calligraphy-white-clean.png'
    if os.path.exists(clean_path):
        return Image.open(clean_path).convert('RGBA')
    
    source_path = 'public/final-app-logo.jpeg'
    if not os.path.exists(source_path):
        source_path = 'public/images/logos/1.jpeg'
        
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
    os.makedirs('public/assets/favicon', exist_ok=True)
    art_png.save(clean_path, 'PNG')
    return art_png

def render_logo_badge(art, size=512, bg_color=(24, 24, 27), fg_color=(241, 245, 249), glow_color=(148, 163, 184, 100), icon_ratio=0.82, corner_ratio=0.22, border_color=None, border_width=0):
    scale = 4
    high_size = size * scale
    
    canvas = Image.new('RGBA', (high_size, high_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = int(high_size * corner_ratio)
    
    # Draw rounded background
    draw.rounded_rectangle(
        [(0, 0), (high_size - 1, high_size - 1)],
        radius=radius,
        fill=(*bg_color, 255),
        outline=(*border_color, 255) if border_color else None,
        width=int(border_width * scale) if border_color else 0
    )
    
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
    
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

def create_showcase():
    art = get_clean_calligraphy()
    os.makedirs('public/previews', exist_ok=True)
    
    # Define Palette Variants
    variants = [
        {
            "id": "1_graphite_silver",
            "name": "1. Graphite & Silver",
            "desc": "Matte Charcoal (#18181b) + Platinum Silver",
            "bg": (24, 24, 27),          # #18181b (zinc-900)
            "fg": (241, 245, 249),       # #f1f5f9 (slate-100)
            "glow": (148, 163, 184, 120),# slate-400 glow
            "border": (63, 63, 70),      # #3f3f46 (zinc-700)
            "border_w": 2
        },
        {
            "id": "2_slate_grey",
            "name": "2. Cool Slate Grey",
            "desc": "Slate Grey (#334155) + Crisp White",
            "bg": (51, 65, 85),          # #334155 (slate-700)
            "fg": (255, 255, 255),       # #ffffff
            "glow": (203, 213, 225, 100),# slate-300 glow
            "border": (100, 116, 139),   # #64748b
            "border_w": 2
        },
        {
            "id": "3_titanium_mint",
            "name": "3. Dark Titanium + Mint",
            "desc": "Dark Zinc (#27272a) + Neon Mint Glow (#6df4ce)",
            "bg": (39, 39, 42),          # #27272a (zinc-800)
            "fg": (109, 244, 206),       # #6df4ce (mint accent)
            "glow": (16, 185, 129, 140), # emerald glow
            "border": (82, 82, 91),      # #52525b
            "border_w": 2
        },
        {
            "id": "4_antique_gold",
            "name": "4. Antique Manuscript Gold",
            "desc": "Deep Obsidian (#121316) + Warm Gold (#fbbf24)",
            "bg": (18, 19, 22),          # #121316
            "fg": (251, 191, 36),        # #fbbf24 (amber-400 gold)
            "glow": (217, 119, 6, 140),  # warm amber glow
            "border": (180, 83, 9),      # #b45309 (gold rim)
            "border_w": 2
        },
        {
            "id": "5_deep_forest_jade",
            "name": "5. Deep Forest Jade",
            "desc": "Deep Jade (#06372b) + Luminous Mint",
            "bg": (6, 55, 43),           # #06372b
            "fg": (110, 231, 183),       # #6ee7b7
            "glow": (52, 211, 153, 130), # mint glow
            "border": (16, 185, 129),    # #10b981
            "border_w": 2
        },
        {
            "id": "6_current_emerald_black",
            "name": "6. Current Emerald & Black",
            "desc": "Emerald (#10b981) + Onyx Black (Current)",
            "bg": (16, 185, 129),        # #10b981
            "fg": (12, 18, 14),          # deep black
            "glow": (52, 211, 153, 100), # mint glow
            "border": None,
            "border_w": 0
        }
    ]
    
    # 1. Generate individual 512x512 preview icons
    generated_images = []
    for v in variants:
        img = render_logo_badge(
            art,
            size=512,
            bg_color=v["bg"],
            fg_color=v["fg"],
            glow_color=v["glow"],
            border_color=v["border"],
            border_width=v["border_w"]
        )
        out_path = f"public/previews/logo_{v['id']}.png"
        img.save(out_path, 'PNG')
        print(f"Generated {out_path}")
        generated_images.append((v, img))
        
    # 2. Generate a consolidated Side-by-Side Comparison Showcase on app background (#09090b)
    app_bg = (9, 9, 11) # #09090b
    canvas_w = 1280
    canvas_h = 760
    showcase = Image.new('RGB', (canvas_w, canvas_h), app_bg)
    draw = ImageDraw.Draw(showcase)
    
    # Title text
    try:
        font_title = ImageFont.truetype("arial.ttf", 28)
        font_name = ImageFont.truetype("arial.ttf", 18)
        font_sub = ImageFont.truetype("arial.ttf", 13)
    except:
        font_title = ImageFont.load_default()
        font_name = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        
    draw.text((40, 30), "Al-Juthur Arabic Logo - Color Palette Comparison Preview", fill=(255, 255, 255), font=font_title)
    draw.text((40, 70), "Simulated against the app's real background color (#09090b)", fill=(156, 163, 175), font=font_sub)
    
    # Grid of 6 items (3 columns x 2 rows)
    cols = 3
    card_w = 360
    card_h = 280
    start_x = 40
    start_y = 110
    gap_x = 35
    gap_y = 35
    
    for idx, (v, badge_img) in enumerate(generated_images):
        col = idx % cols
        row = idx // cols
        
        x = start_x + col * (card_w + gap_x)
        y = start_y + row * (card_h + gap_y)
        
        # Draw card container
        draw.rounded_rectangle([(x, y), (x + card_w, y + card_h)], radius=12, fill=(18, 18, 22), outline=(39, 39, 42), width=1)
        
        # Paste 140x140 logo badge in center
        badge_small = badge_img.resize((140, 140), Image.Resampling.LANCZOS)
        badge_x = x + (card_w - 140) // 2
        badge_y = y + 25
        showcase.paste(badge_small, (badge_x, badge_y), badge_small)
        
        # Name and description
        draw.text((x + 20, y + 185), v["name"], fill=(243, 244, 246), font=font_name)
        draw.text((x + 20, y + 215), v["desc"], fill=(156, 163, 175), font=font_sub)
        
    showcase_path = "public/previews/logo_palette_comparison.png"
    showcase.save(showcase_path, "PNG")
    print(f"Generated comparison showcase: {showcase_path}")

if __name__ == '__main__':
    create_showcase()
