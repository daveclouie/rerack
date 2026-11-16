import sys
from io import BytesIO

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from rembg import remove


def main():
    register_heif_opener()
    if len(sys.argv) != 3:
        raise SystemExit("Expected input and output image paths.")

    source_path, output_path = sys.argv[1:]
    Image.MAX_IMAGE_PIXELS = 30_000_000

    with Image.open(source_path) as source:
        if source.width * source.height > Image.MAX_IMAGE_PIXELS:
            raise ValueError("Image dimensions exceed the supported limit.")
        source = ImageOps.exif_transpose(source).convert("RGBA")
        removed = remove(source)
        if isinstance(removed, Image.Image):
            garment = removed.convert("RGBA")
        else:
            garment = Image.open(BytesIO(removed)).convert("RGBA")

    garment.thumbnail((820, 820), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), "#F3EFE8")
    position = ((1024 - garment.width) // 2, (1024 - garment.height) // 2)
    canvas.alpha_composite(garment, position)
    canvas.convert("RGB").save(output_path, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
