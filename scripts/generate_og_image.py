from PIL import Image, ImageDraw, ImageFont
import os

def create_og_image():
    W, H = 1200, 630
    # Create dark zinc background #09090b
    img = Image.new('RGBA', (W, H), (9, 9, 11, 255))
    draw = ImageDraw.Draw(img)

    # Draw subtle emerald accent glow / border
    draw.rectangle([(0, 0), (W - 1, H - 1)], outline=(16, 185, 129, 90), width=3)
    
    # Left side: Green emblem with Quran icon (size 340x340)
    emblem_size = 340
    emblem = Image.new('RGBA', (emblem_size, emblem_size), (16, 185, 129, 255))
    
    quran = Image.open('public/assets/favicon/quran (2).png').convert('RGBA')
    inner_size = int(emblem_size * 0.72)
    quran.thumbnail((inner_size, inner_size), Image.Resampling.LANCZOS)
    
    ox = (emblem_size - quran.width) // 2
    oy = (emblem_size - quran.height) // 2
    emblem.paste(quran, (ox, oy), quran)
    
    # Rounded corners for the emblem inside the card
    mask = Image.new('L', (emblem_size, emblem_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (emblem_size, emblem_size)], radius=48, fill=255)
    
    emblem_x = 100
    emblem_y = (H - emblem_size) // 2
    img.paste(emblem, (emblem_x, emblem_y), mask)

    # Right side: Title & Description
    text_x = 490
    
    # Try loading Arial/Segoe UI, otherwise default font
    try:
        font_title = ImageFont.truetype("seguiemj.ttf", 60)
    except:
        try:
            font_title = ImageFont.truetype("arial.ttf", 60)
        except:
            font_title = ImageFont.load_default()

    try:
        font_sub = ImageFont.truetype("arial.ttf", 26)
    except:
        font_sub = ImageFont.load_default()

    try:
        font_tag = ImageFont.truetype("arialbd.ttf", 22)
    except:
        font_tag = ImageFont.load_default()

    # Brand Title: Al-Juthur
    draw.text((text_x, 150), "Al-Juthur", fill=(244, 244, 245, 255), font=font_title)
    
    # Emerald Tagline
    draw.text((text_x, 235), "THE QUR'ANIC RESEARCH & TAFSIR WORKSPACE", fill=(52, 211, 153, 255), font=font_tag)

    # Description Lines
    lines = [
        "Classical Arabic root morphology, 130+ Tafsirs in 33 languages,",
        "8+ historical Lexicons & Academic AI Scholar.",
    ]
    y_pos = 285
    for line in lines:
        draw.text((text_x, y_pos), line, fill=(161, 161, 170, 255), font=font_sub)
        y_pos += 38

    # Feature badges
    badges = ["130+ Tafsirs", "33 Languages", "8+ Lexicons", "AI Scholar RAG"]
    badge_x = text_x
    badge_y = 410
    for b in badges:
        b_w = len(b) * 11 + 24
        draw.rounded_rectangle([(badge_x, badge_y), (badge_x + b_w, badge_y + 36)], radius=8, fill=(24, 24, 27, 255), outline=(39, 39, 42, 255), width=1)
        draw.text((badge_x + 12, badge_y + 8), b, fill=(212, 212, 216, 255), font=font_sub)
        badge_x += b_w + 12

    # Save
    os.makedirs('public/assets/images', exist_ok=True)
    img.save('public/og-image.png', 'PNG', optimize=True)
    img.save('public/assets/images/og-image.png', 'PNG', optimize=True)
    print("Created public/og-image.png and public/assets/images/og-image.png (1200x630).")

create_og_image()
