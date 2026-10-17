import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

os.makedirs('public', exist_ok=True)
os.makedirs('src/app', exist_ok=True)

# Load the exact extracted logo
raw_logo = Image.open('logo_extracted_0.jpeg').convert('RGBA')

# High quality transparent logo: turn near-white background into transparent
data = raw_logo.getdata()
new_data = []
for item in data:
    # If pixel is near-white (all channels >= 245)
    if item[0] >= 245 and item[1] >= 245 and item[2] >= 245:
        new_data.append((255, 255, 255, 0))
    elif item[0] >= 235 and item[1] >= 235 and item[2] >= 235:
        # smooth anti-aliased edge
        alpha = int(255 * (1 - (min(item[0], item[1], item[2]) - 235) / 10))
        new_data.append((item[0], item[1], item[2], alpha))
    else:
        new_data.append(item)

logo_trans = Image.new('RGBA', raw_logo.size)
logo_trans.putdata(new_data)

# Crop tight bounding box
bbox = logo_trans.getbbox()
if bbox:
    logo_tight = logo_trans.crop(bbox)
else:
    logo_tight = logo_trans

# Make square logo with padding
max_dim = max(logo_tight.width, logo_tight.height)
pad = int(max_dim * 0.08)
square_size = max_dim + pad * 2

square_logo = Image.new('RGBA', (square_size, square_size), (0, 0, 0, 0))
offset_x = (square_size - logo_tight.width) // 2
offset_y = (square_size - logo_tight.height) // 2
square_logo.paste(logo_tight, (offset_x, offset_y), mask=logo_tight)

# Save master logo files
raw_logo.convert('RGB').save('public/logo.jpg', quality=95)
logo_trans.save('public/logo.png', format='PNG')
square_logo.save('public/logo_square.png', format='PNG')
logo_trans.save('src/app/icon.png', format='PNG')
print("Saved master logo files")

# 1. Favicons
fav16 = square_logo.resize((16, 16), Image.Resampling.LANCZOS)
fav32 = square_logo.resize((32, 32), Image.Resampling.LANCZOS)
fav48 = square_logo.resize((48, 48), Image.Resampling.LANCZOS)

fav16.save('public/favicon-16x16.png')
fav32.save('public/favicon-32x32.png')
square_logo.resize((48, 48), Image.Resampling.LANCZOS).save(
    'public/favicon.ico',
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)]
)
square_logo.resize((48, 48), Image.Resampling.LANCZOS).save(
    'src/app/favicon.ico',
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)]
)
print("Saved favicons")

# 2. Apple Touch Icon (180x180 on Deep Violet background)
apple_icon = Image.new('RGBA', (180, 180), (27, 11, 59, 255)) # Deep Violet #1B0B3B
inner_logo = square_logo.resize((144, 144), Image.Resampling.LANCZOS)
apple_icon.paste(inner_logo, (18, 18), mask=inner_logo)
apple_icon.convert('RGB').save('public/apple-touch-icon.png', quality=95)
apple_icon.convert('RGB').save('src/app/apple-icon.png', quality=95)
print("Saved Apple touch icons")

# 3. PWA Icons (192, 512, regular & maskable)
# Standard 192 & 512 (transparent or soft background)
pwa_192 = Image.new('RGBA', (192, 192), (27, 11, 59, 255))
pwa_192_inner = square_logo.resize((150, 150), Image.Resampling.LANCZOS)
pwa_192.paste(pwa_192_inner, (21, 21), mask=pwa_192_inner)
pwa_192.save('public/icon-192.png')

pwa_512 = Image.new('RGBA', (512, 512), (27, 11, 59, 255))
pwa_512_inner = square_logo.resize((400, 400), Image.Resampling.LANCZOS)
pwa_512.paste(pwa_512_inner, (56, 56), mask=pwa_512_inner)
pwa_512.save('public/icon-512.png')

# Maskable icons (requires 20% safe zone margin)
pwa_maskable_192 = Image.new('RGBA', (192, 192), (91, 33, 182, 255)) # Royal Purple #5B21B6
mask_inner_192 = square_logo.resize((120, 120), Image.Resampling.LANCZOS)
pwa_maskable_192.paste(mask_inner_192, (36, 36), mask=mask_inner_192)
pwa_maskable_192.save('public/icon-192-maskable.png')

pwa_maskable_512 = Image.new('RGBA', (512, 512), (91, 33, 182, 255))
mask_inner_512 = square_logo.resize((320, 320), Image.Resampling.LANCZOS)
pwa_maskable_512.paste(mask_inner_512, (96, 96), mask=mask_inner_512)
pwa_maskable_512.save('public/icon-512-maskable.png')
print("Saved PWA icons")

# 4. OpenGraph (OG) image (1200x630)
og_img = Image.new('RGB', (1200, 630), (27, 11, 59)) # Deep Violet #1B0B3B
draw = ImageDraw.Draw(og_img)

# Draw rich background gradient / accents
for y in range(630):
    ratio = y / 630
    r = int(27 + (45 - 27) * ratio)
    g = int(11 + (15 - 11) * ratio)
    b = int(59 + (95 - 59) * ratio)
    draw.line([(0, y), (1200, y)], fill=(r, g, b))

# Champagne Gold subtle line
draw.rectangle([(80, 50), (84, 580)], fill=(233, 185, 73)) # #E9B949

# Paste the logo
og_logo = square_logo.resize((260, 260), Image.Resampling.LANCZOS)
og_img.paste(og_logo, (120, 185), mask=og_logo)

# Add decorative graphic badges
# Draw text and boxes using default PIL font if truetype is absent
try:
    font_title = ImageFont.truetype("arialbd.ttf", 52)
    font_sub = ImageFont.truetype("arial.ttf", 26)
    font_chips = ImageFont.truetype("arialbd.ttf", 18)
    font_badge = ImageFont.truetype("arialbd.ttf", 15)
except:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_chips = ImageFont.load_default()
    font_badge = ImageFont.load_default()

# Title text
draw.text((420, 160), "HINDU", fill=(255, 255, 255), font=font_title)
draw.text((420, 225), "Subscription & Circulation Management System", fill=(167, 139, 250), font=font_sub) # #A78BFA
draw.text((420, 265), "Royapuram Distribution Zone • Chennai - 600013", fill=(203, 213, 225), font=font_sub)

# Draw 4 newspaper chips
papers = [
    ("DINAKARAN", (225, 29, 72)),     # Ruby Rose
    ("DINAMALAR", (13, 148, 136)),    # Teal
    ("NIE / DIN", (59, 130, 246)),     # Indigo
    ("THE HINDU", (124, 58, 237)),    # Royal Purple
]

x_offset = 420
y_offset = 330
for title, color in papers:
    # Pill background
    draw.rounded_rectangle([(x_offset, y_offset), (x_offset + 165, y_offset + 44)], radius=8, fill=(38, 20, 78), outline=color, width=2)
    draw.text((x_offset + 20, y_offset + 12), title, fill=(255, 255, 255), font=font_chips)
    x_offset += 180

# Feature highlights at bottom
draw.text((420, 420), "✓ Multi-Newspaper Subscription Engine", fill=(233, 185, 73), font=font_badge)
draw.text((420, 450), "✓ Real-Time Multi-Device Sync & Concurrency", fill=(233, 185, 73), font=font_badge)
draw.text((420, 480), "✓ 30-Day Automated Renewal Notification Engine", fill=(233, 185, 73), font=font_badge)
draw.text((420, 510), "✓ Instant WhatsApp & SMS Reminders (English + Tamil)", fill=(233, 185, 73), font=font_badge)

og_img.save('public/og-image.png', quality=95)
print("Saved OG image")

# 5. Mobile Splash screen (1080x1920)
splash = Image.new('RGB', (1080, 1920), (27, 11, 59))
draw_sp = ImageDraw.Draw(splash)
for y in range(1920):
    ratio = y / 1920
    r = int(27 + (40 - 27) * ratio)
    g = int(11 + (15 - 11) * ratio)
    b = int(59 + (90 - 59) * ratio)
    draw_sp.line([(0, y), (1080, y)], fill=(r, g, b))

splash_logo = square_logo.resize((360, 360), Image.Resampling.LANCZOS)
splash.paste(splash_logo, (360, 700), mask=splash_logo)
splash.save('public/splash-screen.png', quality=95)
print("Saved splash screen")

# 6. PDF and Email header logo
pdf_logo = square_logo.resize((120, 120), Image.Resampling.LANCZOS)
pdf_logo.save('public/pdf-header-logo.png')
print("All brand assets generated successfully!")
