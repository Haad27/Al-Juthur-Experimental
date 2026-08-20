import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

def draw_glow_rectangle(canvas, x1, y1, x2, y2, color, blur_radius=10):
    w, h = canvas.size
    glow_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow_img)
    d.rounded_rectangle([(x1, y1), (x2, y2)], radius=(y2 - y1) // 2, fill=color)
    blurred = glow_img.filter(ImageFilter.GaussianBlur(blur_radius))
    canvas.paste(blurred, (0, 0), blurred)

def render_loader_mockup(option_type, width=800, height=520):
    bg_color = (9, 9, 11) # #09090b
    canvas = Image.new('RGBA', (width, height), (*bg_color, 255))
    draw = ImageDraw.Draw(canvas)
    
    # 1. Ambient Background Glows
    glow_bg = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_bg)
    glow_draw.ellipse([(-100, -100), (350, 350)], fill=(16, 185, 129, 25))
    glow_draw.ellipse([(width - 250, height - 250), (width + 100, height + 100)], fill=(20, 184, 166, 20))
    # Center ambient glow behind logo
    center_x = width // 2
    logo_y = 130
    glow_draw.ellipse([(center_x - 120, logo_y - 80), (center_x + 120, logo_y + 160)], fill=(16, 185, 129, 35))
    blurred_bg = glow_bg.filter(ImageFilter.GaussianBlur(50))
    canvas.paste(blurred_bg, (0, 0), blurred_bg)

    # 2. Revolving Ripple Rings around Logo
    for r, alpha in [(52, 50), (66, 35), (80, 20)]:
        ring_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        rd = ImageDraw.Draw(ring_img)
        rd.ellipse([(center_x - r, logo_y + 36 - r), (center_x + r, logo_y + 36 + r)], outline=(16, 185, 129, alpha), width=1)
        canvas.paste(ring_img, (0, 0), ring_img)

    # 3. Paste Logo
    logo_path = 'public/assets/favicon/apple-touch-icon.png'
    if os.path.exists(logo_path):
        logo_img = Image.open(logo_path).convert('RGBA').resize((72, 72), Image.Resampling.LANCZOS)
        canvas.paste(logo_img, (center_x - 36, logo_y), logo_img)
        
    # 4. Fonts
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 13)
        font_sub = ImageFont.truetype("arial.ttf", 13)
        font_label = ImageFont.truetype("arialbd.ttf", 11)
        font_pct = ImageFont.truetype("arialbd.ttf", 12)
        font_opt_title = ImageFont.truetype("arialbd.ttf", 17)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_label = ImageFont.load_default()
        font_pct = ImageFont.load_default()
        font_opt_title = ImageFont.load_default()

    # 5. Titles
    title_text = "INITIALIZING AL JUTHUR"
    sub_text = "An engaging Quran experience"
    
    t_bbox = font_title.getbbox(title_text)
    t_w = t_bbox[2] - t_bbox[0]
    draw.text((center_x - t_w // 2, logo_y + 90), title_text, fill=(244, 244, 245), font=font_title)
    
    s_bbox = font_sub.getbbox(sub_text)
    s_w = s_bbox[2] - s_bbox[0]
    draw.text((center_x - s_w // 2, logo_y + 112), sub_text, fill=(161, 161, 170), font=font_sub)

    # 6. Progress Bar Area
    bar_w = 340
    bar_x = center_x - bar_w // 2
    bar_y = logo_y + 185
    progress = 0.76 # 76% filled
    fill_w = int(bar_w * progress)

    # Option 1: Luminescent Emerald Laser
    if option_type == 1:
        # Header text
        draw.text((bar_x, bar_y - 22), "LOADING ASSETS", fill=(110, 231, 183), font=font_label)
        pct_text = "76%"
        p_bbox = font_pct.getbbox(pct_text)
        draw.text((bar_x + bar_w - (p_bbox[2] - p_bbox[0]), bar_y - 22), pct_text, fill=(109, 244, 206), font=font_pct)
        
        # Track
        draw.rounded_rectangle([(bar_x, bar_y), (bar_x + bar_w, bar_y + 4)], radius=2, fill=(24, 24, 27))
        
        # Intense ambient drop glow
        draw_glow_rectangle(canvas, bar_x, bar_y - 1, bar_x + fill_w, bar_y + 5, (16, 185, 129, 160), blur_radius=10)
        draw_glow_rectangle(canvas, bar_x, bar_y, bar_x + fill_w, bar_y + 4, (109, 244, 206, 220), blur_radius=5)
        
        # Gradient bar
        grad = Image.new('RGBA', (fill_w, 4), (0, 0, 0, 0))
        g_arr = np.zeros((4, fill_w, 4), dtype=np.uint8)
        for x in range(fill_w):
            ratio = x / max(1, fill_w)
            # from #059669 (5, 150, 105) to #6df4ce (109, 244, 206)
            r = int(5 + (109 - 5) * ratio)
            g = int(150 + (244 - 150) * ratio)
            b = int(105 + (206 - 105) * ratio)
            g_arr[:, x] = [r, g, b, 255]
        grad = Image.fromarray(g_arr)
        canvas.paste(grad, (bar_x, bar_y), grad)
        
        # Leading laser comet pulse at tip
        tip_x = bar_x + fill_w
        comet_glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        cd = ImageDraw.Draw(comet_glow)
        cd.ellipse([(tip_x - 14, bar_y + 2 - 14), (tip_x + 14, bar_y + 2 + 14)], fill=(109, 244, 206, 180))
        cd.ellipse([(tip_x - 5, bar_y + 2 - 5), (tip_x + 5, bar_y + 2 + 5)], fill=(255, 255, 255, 255))
        canvas.paste(comet_glow.filter(ImageFilter.GaussianBlur(4)), (0, 0), comet_glow)

    # Option 2: Platinum Glass + Shimmer Sweep
    elif option_type == 2:
        draw.text((bar_x, bar_y - 24), "LOADING ASSETS", fill=(212, 212, 216), font=font_label)
        
        # Pill badge for percentage
        badge_w, badge_h = 46, 20
        badge_x = bar_x + bar_w - badge_w
        badge_y = bar_y - 28
        draw.rounded_rectangle([(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)], radius=10, fill=(6, 40, 30), outline=(16, 185, 129, 180), width=1)
        draw.text((badge_x + 10, badge_y + 3), "76%", fill=(110, 231, 183), font=font_pct)
        
        # Capsule Track
        track_h = 8
        draw.rounded_rectangle([(bar_x, bar_y), (bar_x + bar_w, bar_y + track_h)], radius=track_h//2, fill=(24, 24, 27), outline=(63, 63, 70), width=1)
        
        # Glass fill: Platinum Silver to Emerald with soft glow
        draw_glow_rectangle(canvas, bar_x + 1, bar_y + 1, bar_x + fill_w, bar_y + track_h - 1, (16, 185, 129, 110), blur_radius=6)
        
        grad = Image.new('RGBA', (fill_w, track_h - 2), (0, 0, 0, 0))
        g_arr = np.zeros((track_h - 2, fill_w, 4), dtype=np.uint8)
        for x in range(fill_w):
            ratio = x / max(1, fill_w)
            # from #e2e8f0 (silver) to #10b981 (emerald)
            r = int(226 + (16 - 226) * ratio)
            g = int(232 + (185 - 232) * ratio)
            b = int(240 + (129 - 240) * ratio)
            g_arr[:, x] = [r, g, b, 255]
        # Top shine line
        g_arr[0, :] = [255, 255, 255, 200]
        grad = Image.fromarray(g_arr)
        canvas.paste(grad, (bar_x + 1, bar_y + 1), grad)

    # Option 3: Electric Mint Ribbon with Ground Glow
    elif option_type == 3:
        draw.text((bar_x, bar_y - 20), "LOADING ASSETS", fill=(161, 161, 170), font=font_label)
        draw.text((bar_x + bar_w - 30, bar_y - 20), "76%", fill=(110, 231, 183), font=font_pct)
        
        # Ambient floor glow beneath bar
        floor_glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        fg_d = ImageDraw.Draw(floor_glow)
        fg_d.ellipse([(bar_x - 30, bar_y - 5), (bar_x + bar_w + 30, bar_y + 40)], fill=(16, 185, 129, 45))
        canvas.paste(floor_glow.filter(ImageFilter.GaussianBlur(16)), (0, 0), floor_glow)
        
        # Razor-sharp Electric Mint Line (2px)
        draw.rectangle([(bar_x, bar_y), (bar_x + bar_w, bar_y + 2)], fill=(39, 39, 42))
        draw_glow_rectangle(canvas, bar_x, bar_y - 2, bar_x + fill_w, bar_y + 4, (109, 244, 206, 200), blur_radius=6)
        draw.rectangle([(bar_x, bar_y), (bar_x + fill_w, bar_y + 2)], fill=(109, 244, 206))

    return canvas

def generate_all_loader_previews():
    os.makedirs('public/previews', exist_ok=True)
    
    # 1. Generate individual full mockups
    opt1 = render_loader_mockup(1)
    opt1.save('public/previews/loader_option1_emerald_laser.png')
    
    opt2 = render_loader_mockup(2)
    opt2.save('public/previews/loader_option2_shimmer_glass.png')
    
    opt3 = render_loader_mockup(3)
    opt3.save('public/previews/loader_option3_electric_mint.png')
    
    # 2. Consolidated Comparison Showcase
    canvas_w = 1280
    canvas_h = 880
    showcase = Image.new('RGB', (canvas_w, canvas_h), (9, 9, 11))
    draw = ImageDraw.Draw(showcase)
    
    try:
        font_heading = ImageFont.truetype("arialbd.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 14)
        font_card_title = ImageFont.truetype("arialbd.ttf", 16)
        font_card_desc = ImageFont.truetype("arial.ttf", 12)
    except:
        font_heading = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_card_title = ImageFont.load_default()
        font_card_desc = ImageFont.load_default()
        
    draw.text((40, 25), "Loading Screen Design Concepts - Visual Comparison", fill=(255, 255, 255), font=font_heading)
    draw.text((40, 60), "Harmonizing the Graphite & Silver Logo with Vibrant Emerald/Mint Accent Treatments", fill=(161, 161, 170), font=font_sub)
    
    previews = [
        (opt1, "Option 1: Luminescent Emerald & Mint Laser (Recommended)", "Rich gradient glow with leading comet pulse & emerald ambient light.", 110),
        (opt2, "Option 2: Platinum Glass Capsule & Shimmer", "Rounded glass capsule with silver-to-emerald gradient & badge percentage.", 360),
        (opt3, "Option 3: Electric Mint Ribbon with Ground Glow", "Sharp modern neon mint line with wide feathered floor reflection.", 610)
    ]
    
    for img, title, desc, y_pos in previews:
        # Draw card border
        draw.rounded_rectangle([(40, y_pos), (1240, y_pos + 225)], radius=12, fill=(18, 18, 22), outline=(39, 39, 42), width=1)
        
        # Crop & paste preview snippet
        crop_region = img.crop((120, 110, 680, 390)).resize((520, 200), Image.Resampling.LANCZOS)
        showcase.paste(crop_region, (55, y_pos + 12))
        
        # Text descriptions on the right
        text_x = 610
        draw.text((text_x, y_pos + 35), title, fill=(244, 244, 245), font=font_card_title)
        draw.text((text_x, y_pos + 70), desc, fill=(156, 163, 175), font=font_sub)
        
        # Key Highlights
        draw.text((text_x, y_pos + 110), "• Highlights:", fill=(110, 231, 183), font=font_card_desc)
        if "Option 1" in title:
            draw.text((text_x + 90, y_pos + 110), "Intense Emerald Glow + Animated Tip Pulse + Vibrant Mint Contrast", fill=(212, 212, 216), font=font_card_desc)
        elif "Option 2" in title:
            draw.text((text_x + 90, y_pos + 110), "Glass Track + Smooth Metallic Silver to Emerald Shimmer", fill=(212, 212, 216), font=font_card_desc)
        else:
            draw.text((text_x + 90, y_pos + 110), "High-Contrast Minimalist Neon + Ambient Diffused Underglow", fill=(212, 212, 216), font=font_card_desc)

    showcase_path = 'public/previews/loader_comparison_showcase.png'
    showcase.save(showcase_path, 'PNG')
    print("Generated loader preview mockups!")

if __name__ == '__main__':
    generate_all_loader_previews()
