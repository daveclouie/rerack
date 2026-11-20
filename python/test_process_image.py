import unittest
from io import BytesIO
from unittest.mock import patch

from PIL import Image

from process_image import MAX_IMAGE_BYTES, process_image_bytes


def make_image(width, height):
    image = Image.new("RGB", (width, height), "#785b42")
    output = BytesIO()
    image.save(output, format="JPEG")
    return output.getvalue()


class ProcessImageTests(unittest.TestCase):
    def test_downsizes_before_background_removal_and_returns_jpeg(self):
        sizes = []

        def preserve_image(image, session):
            sizes.append(image.size)
            return image.copy()

        with patch("process_image.remove", side_effect=preserve_image):
            result = process_image_bytes(make_image(2000, 1000), "image/jpeg", session=object())

        self.assertEqual(sizes, [(1600, 800)])
        with Image.open(BytesIO(result)) as output:
            self.assertEqual(output.format, "JPEG")
            self.assertEqual(output.size, (1024, 1024))

    def test_rejects_oversized_input(self):
        with self.assertRaisesRegex(ValueError, "10 MB"):
            process_image_bytes(b"x" * (MAX_IMAGE_BYTES + 1), "image/jpeg")

    def test_rejects_unsupported_mime_type(self):
        with self.assertRaisesRegex(ValueError, "Unsupported image format"):
            process_image_bytes(b"image", "application/octet-stream")

    def test_reuses_one_configured_session(self):
        created = object()
        with patch("process_image.new_session", return_value=created) as new_session:
            with patch.dict("os.environ", {"REMBG_MODEL": "u2netp"}):
                import process_image
                process_image._session = None
                self.assertIs(process_image.get_session(), created)
                self.assertIs(process_image.get_session(), created)
            new_session.assert_called_once_with(model_name="u2netp")
            process_image._session = None


if __name__ == "__main__":
    unittest.main()
