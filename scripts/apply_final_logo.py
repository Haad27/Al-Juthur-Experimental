import os
from PIL import Image, ImageDraw, ImageOps

def crop_green_card(input_path):
    img = Image.open(input_path).convert('RGB')
    # Exact green card crop bounding box: left=86, top=82, right=941, bottom=937 (855x855)
    cropped = img.crop((86, 82, 941, 937))
    return cropped

def generate_rounded_icon(base_img, size, corner_ratio=0.20):
    # Supersampling 4x for ultra-smooth anti-aliased edges
    scale = 4
    high_size = size * scale
    
    # Resize base image to high_size
    resized = base_img.resize((high_size, high_size), Image.Resampling.LANCZOS).convert('RGBA')
    
    # Create rounded rectangle mask
    mask = Image.new('L', (high_size, high_size), 0)
    draw = ImageDraw.Draw(mask)
    radius = int(high_size * corner_ratio)
    draw.rounded_rectangle([(0, 0), (high_size - 1, high_size - 1)], radius=radius, fill=255)
    
    # Apply mask
    rounded = Image.new('RGBA', (high_size, high_size), (0, 0, 0, 0))
    rounded.paste(resized, (0, 0), mask=mask)
    
    # Downscale with high quality Lanczos anti-aliasing
    final_icon = rounded.resize((size, size), Image.Resampling.LANCZOS)
    return final_icon

def main():
    source_path = 'public/final-app-logo.jpeg'
    if not os.path.exists(source_path):
        source_path = 'public/images/logos/1.jpeg'
    
    base_square = crop_green_card(source_path)
    # Save the master cropped green logo
    base_square.save('public/final-app-logo-cropped.png', 'PNG', optimize=True)
    print("Saved public/final-app-logo-cropped.png (855x855)")

    # 1. Generate rounded app icons & favicons
    app_icons = [
        ('public/assets/favicon/apple-touch-icon.png', 180, 0.20),
        ('public/assets/favicon/android-chrome-192x192.png', 192, 0.20),
        ('public/assets/favicon/android-chrome-512x512.png', 512, 0.20),
        ('public/assets/favicon/favicon-32x32.png', 32, 0.20),
        ('public/assets/favicon/favicon-16x16.png', 16, 0.20),
    ]

    for dest_path, sz, cr in app_icons:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        icon = generate_rounded_icon(base_square, sz, corner_ratio=cr)
        icon.save(dest_path, 'PNG', optimize=True)
        print(f"Generated {dest_path} ({sz}x{sz}) with smooth rounded corners.")

    # 2. Generate multi-resolution favicon.ico
    ico_16 = generate_rounded_icon(base_square, 16, corner_ratio=0.20)
    ico_32 = generate_rounded_icon(base_square, 32, corner_ratio=0.20)
    ico_48 = generate_rounded_icon(base_square, 48, corner_ratio=0.20)
    ico_32.save('public/assets/favicon/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/assets/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    ico_32.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print("Generated favicon.ico in all locations.")

    # 3. Generate OG share preview images
    # 1200x630 banner for social shares
    og_banner = Image.new('RGB', (1200, 630), (14, 55, 36)) # deep emerald match
    # Place 500x500 square logo in center
    logo_500 = base_square.resize((480, 480), Image.Resampling.LANCZOS)
    ox = (1200 - 480) // 2
    oy = (630 - 480) // 2
    og_banner.paste(logo_500, (ox, oy))
    og_banner.save('public/og-image.png', 'PNG', optimize=True)
    og_banner.save('public/assets/images/og-image.png', 'PNG', optimize=True)

    # 512x512 square OG icon
    og_sq = base_square.resize((512, 512), Image.Resampling.LANCZOS)
    og_sq.save('public/og-share-icon.png', 'PNG', optimize=True)
    print("Generated OG preview images.")

if __name__ == '__main__':
    main()
