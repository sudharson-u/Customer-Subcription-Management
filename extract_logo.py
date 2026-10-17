import pymupdf
from PIL import Image

doc = pymupdf.open('Logo.pdf')
print("Page count:", len(doc))
page = doc[0]
pix = page.get_pixmap(dpi=300)
pix.save('logo_rendered.png')
print(f"Rendered page size: {pix.width}x{pix.height}")

images = page.get_images()
print(f"Images found: {len(images)}")
for i, img in enumerate(images):
    xref = img[0]
    base_image = doc.extract_image(xref)
    image_bytes = base_image['image']
    image_ext = base_image['ext']
    fname = f'logo_extracted_{i}.{image_ext}'
    with open(fname, 'wb') as f:
        f.write(image_bytes)
    print(f"Extracted image {i}: {base_image['width']}x{base_image['height']}, ext: {image_ext} -> {fname}")
