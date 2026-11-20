import os
import sys
import threading
from io import BytesIO

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from rembg import new_session, remove

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 30_000_000
MAX_IMAGE_DIMENSION = 1600
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
DEFAULT_MODEL = "u2netp"
_session = None
_session_lock = threading.Lock()
_inference_lock = threading.Lock()


def get_session():
    global _session
    if _session is not None:
        return _session
    with _session_lock:
        if _session is None:
            model_name = os.environ.get("REMBG_MODEL", DEFAULT_MODEL)
            _session = new_session(model_name=model_name)
    return _session


def process_image_bytes(image_bytes, mime_type=None, session=None):
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Image must be between 1 byte and 10 MB.")
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        raise ValueError("Unsupported image format.")

    register_heif_opener()
    Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

    with Image.open(BytesIO(image_bytes)) as source:
        if source.width * source.height > MAX_IMAGE_PIXELS:
            raise ValueError("Image dimensions exceed the supported limit.")
        source = ImageOps.exif_transpose(source).convert("RGBA")
        source.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)
        with _inference_lock:
            removed = remove(source, session=session or get_session())
        if isinstance(removed, Image.Image):
            garment = removed.convert("RGBA")
        else:
            with Image.open(BytesIO(removed)) as result:
                garment = result.convert("RGBA")

    garment.thumbnail((820, 820), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), "#F3EFE8")
    position = ((1024 - garment.width) // 2, (1024 - garment.height) // 2)
    canvas.alpha_composite(garment, position)
    output = BytesIO()
    canvas.convert("RGB").save(output, format="JPEG", quality=86, optimize=True, progressive=True)
    return output.getvalue()


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Expected input and output image paths.")

    source_path, output_path = sys.argv[1:]
    with open(source_path, "rb") as source:
        result = process_image_bytes(source.read())
    with open(output_path, "wb") as output:
        output.write(result)


if __name__ == "__main__":
    main()
