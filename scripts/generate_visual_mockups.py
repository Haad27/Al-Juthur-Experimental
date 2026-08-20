import os
import shutil
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

def generate_all():
    artifact_dir = r'C:\Users\Haadm\.gemini\antigravity\brain\f8e1c351-1c3b-40a3-a781-43897f17e4ac'
    os.makedirs(artifact_dir, exist_ok=True)
    os.makedirs('public/previews', exist_ok=True)

    clean_path = 'public/assets/favicon/calligraphy-white-clean.png'
    art = Image.open(clean_path).convert('RGBA')

    variants = [
        {
            'num': '1',
            'id': 'midnight_emerald',
            'name': 'Option 1: Midnight Emerald & Silver (Recommended)',
            'bg': (6, 22, 18),
            'fg': (248, 250, 252),
            'glow': (52, 211, 153, 140),
            'border': (16, 185, 129),
            'border_w': 2,
        },
        {
            'num': '2',
            'id': 'deep_forest_mint',
            'name': 'Option 2: Deep Forest Velvet & Mint',
            'bg': (8, 51, 37),
            'fg': (110, 231, 183),
            'glow': (16, 185, 129, 130),
            'border': (52, 211, 153),
            'border_w': 2,
        },
        {
            'num': '3',
            'id': 'imperial_jade_gold',
            'name': 'Option 3: Imperial Jade & Manuscript Gold',
            'bg': (5, 31, 24),
            'fg': (251, 191, 36),
            'glow': (245, 158, 11, 120),
            'border': (217, 119, 6),
            'border_w': 2,
        },
        {
            'num': '4',
            'id': 'minimal_charcoal_silver',
            'name': 'Option 4: Minimal Charcoal & Silver (Current)',
            'bg': (24, 24, 27),
            'fg': (241, 245, 249),
            'glow': (148, 163, 184, 100),
            'border': (63, 63, 70),
            'border_w': 2,
        },
        {
            'num': '5',
            'id': 'dark_titanium_neon_mint',
            'name': 'Option 5: Dark Titanium & Cyber Mint',
            'bg': (20, 20, 24),
            'fg': (52, 211, 153),
            'glow': (16, 185, 129, 180),
            'border': (45, 212, 191),
            'border_w': 2,
        },
        {
            'num': '6',
            'id': 'royal_sage_warm_pearl',
            'name': 'Option 6: Royal Sage & Warm Pearl',
            'bg': (18, 36, 29),
            'fg': (254, 243, 199),
            'glow': (110, 231, 183, 100),
            'border': (147, 197, 253),
            'border_w': 1.5,
        }
    ]

    def render_logo_badge(art, size, bg, fg, glow, border, border_w, icon_ratio=0.80, corner_ratio=0.22):
        scale = 4
        hs = size * scale
        canvas = Image.new('RGBA', (hs, hs), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        radius = int(hs * corner_ratio)
        
        draw.rounded_rectangle(
            [(0, 0), (hs - 1, hs - 1)],
            radius=radius,
            fill=(*bg, 255),
            outline=(*border, 255) if border else None,
            width=int(border_w * scale) if border else 0
        )
        
        max_dim = int(hs * icon_ratio)
        art_ratio = min(max_dim / art.width, max_dim / art.height)
        nw = int(art.width * art_ratio)
        nh = int(art.height * art_ratio)
        scaled_art = art.resize((nw, nh), Image.Resampling.LANCZOS)
        
        arr = np.array(scaled_art)
        alpha = arr[:, :, 3]
        
        if glow and glow[3] > 0:
            gmask = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=scale * 2.5))
            ox = (hs - nw) // 2
            oy = (hs - nh) // 2
            glayer = Image.new('RGBA', (nw, nh), glow)
            canvas.paste(glayer, (ox, oy), gmask)
            
        ox = (hs - nw) // 2
        oy = (hs - nh) // 2
        
        fg_arr = np.zeros_like(arr)
        fg_arr[:, :, 0] = fg[0]
        fg_arr[:, :, 1] = fg[1]
        fg_arr[:, :, 2] = fg[2]
        fg_arr[:, :, 3] = alpha
        text_img = Image.fromarray(fg_arr)
        canvas.paste(text_img, (ox, oy), text_img)
        return canvas.resize((size, size), Image.Resampling.LANCZOS)

    # Standalone high-res cards
    try:
        font_large = ImageFont.truetype('arialbd.ttf', 20)
        font_sub = ImageFont.truetype('arial.ttf', 13)
    except:
        font_large = font_sub = ImageFont.load_default()

    badge_cache = {}

    for v in variants:
        badge = render_logo_badge(art, 340, v['bg'], v['fg'], v['glow'], v['border'], v['border_w'])
        badge_cache[v['num']] = badge
        
        card = Image.new('RGB', (560, 480), (14, 14, 18))
        draw = ImageDraw.Draw(card)
        
        bx = (560 - 340) // 2
        by = 35
        card.paste(badge, (bx, by), badge)
        
        bbox = draw.textbbox((0, 0), v['name'], font=font_large)
        tw = bbox[2] - bbox[0]
        draw.text(((560 - tw) // 2, 410), v['name'], fill=(240, 240, 245), font=font_large)
        
        fn = f"option_{v['num']}_{v['id']}.png"
        card.save(os.path.join('public/previews', fn), 'PNG')
        card.save(os.path.join(artifact_dir, fn), 'PNG')

    # Mobile Home Screen Mockup
    home_w, home_h = 1000, 500
    home_img = Image.new('RGB', (home_w, home_h), (11, 14, 19))
    draw = ImageDraw.Draw(home_img)

    draw.text((40, 30), 'Real-World Visualization: Mobile App Icons on Home Screen', fill=(255, 255, 255), font=font_large)
    draw.text((40, 62), 'Side-by-side comparison of each color variation as a mobile app icon', fill=(150, 160, 170), font=font_sub)

    mock_apps = [
        ('1. Emerald', badge_cache['1']),
        ('2. Forest', badge_cache['2']),
        ('3. Gold', badge_cache['3']),
        ('4. Charcoal', badge_cache['4']),
        ('5. Cyber', badge_cache['5']),
        ('6. Sage', badge_cache['6']),
    ]

    icon_sz = 110
    gap = 40
    total_grid_w = len(mock_apps) * icon_sz + (len(mock_apps) - 1) * gap
    start_gx = (home_w - total_grid_w) // 2
    start_gy = 140

    draw.rounded_rectangle([(start_gx - 25, start_gy - 20), (start_gx + total_grid_w + 25, start_gy + icon_sz + 60)], radius=24, fill=(18, 22, 28), outline=(35, 45, 55), width=1)

    for idx, (label, b_img) in enumerate(mock_apps):
        ix = start_gx + idx * (icon_sz + gap)
        iy = start_gy
        b_small = b_img.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
        home_img.paste(b_small, (ix, iy), b_small)
        
        bbox = draw.textbbox((0, 0), label, font=font_sub)
        lw = bbox[2] - bbox[0]
        draw.text((ix + (icon_sz - lw) // 2, iy + icon_sz + 12), label, fill=(210, 220, 230), font=font_sub)

    home_img.save('public/previews/mockup_mobile_homescreen.png', 'PNG')
    home_img.save(os.path.join(artifact_dir, 'mockup_mobile_homescreen.png'), 'PNG')

    # Web Navbar Mockup
    nav_w, nav_h = 1000, 420
    nav_img = Image.new('RGB', (nav_w, nav_h), (9, 9, 11))
    draw = ImageDraw.Draw(nav_img)

    draw.text((40, 25), 'Real-World Visualization: In-App Header & Navigation Bar', fill=(255, 255, 255), font=font_large)
    draw.text((40, 55), 'Simulating the top navbar of Al-Juthur with the top color directions', fill=(150, 160, 170), font=font_sub)

    top_navs = [
        ('Option 1: Midnight Emerald & Silver (Recommended)', badge_cache['1']),
        ('Option 2: Deep Forest Velvet & Mint', badge_cache['2']),
        ('Option 4: Charcoal & Silver (Current)', badge_cache['4']),
    ]

    ny = 100
    for title_lbl, b_img in top_navs:
        draw.text((40, ny - 5), title_lbl, fill=(180, 190, 200), font=font_sub)
        
        draw.rounded_rectangle([(40, ny + 18), (960, ny + 74)], radius=8, fill=(18, 18, 22), outline=(39, 39, 42), width=1)
        
        b_nav = b_img.resize((36, 36), Image.Resampling.LANCZOS)
        nav_img.paste(b_nav, (52, ny + 28), b_nav)
        
        draw.text((98, ny + 35), 'Al-Juthur  |  Roots of Quranic Arabic', fill=(245, 245, 250), font=font_large)
        draw.text((640, ny + 38), 'Explore Roots', fill=(16, 185, 129), font=font_sub)
        draw.text((760, ny + 38), 'Surah Index', fill=(156, 163, 175), font=font_sub)
        draw.text((870, ny + 38), 'RAG Search', fill=(156, 163, 175), font=font_sub)
        
        ny += 100

    nav_img.save('public/previews/mockup_navbar_preview.png', 'PNG')
    nav_img.save(os.path.join(artifact_dir, 'mockup_navbar_preview.png'), 'PNG')

    # Copy showcase
    shutil.copy('public/previews/green_theme_options_showcase.png', os.path.join(artifact_dir, 'green_theme_options_showcase.png'))
    print('All preview images successfully generated and copied to artifact directory!')

if __name__ == '__main__':
    generate_all()
