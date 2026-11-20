import hmac
import logging
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from process_image import ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES, get_session, process_image_bytes

logger = logging.getLogger("rerack-image-worker")


class ImageWorkerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/health":
            self.reject(404, "Not found.")
            return
        if _startup_error is not None:
            self.respond(503, b"model initialization failed", "text/plain")
            return
        if not _model_ready.is_set():
            self.respond(503, b"model is loading", "text/plain")
            return
        self.respond(200, b"ok", "text/plain")

    def do_POST(self):
        if self.path != "/process":
            self.reject(404, "Not found.")
            return

        token = os.environ.get("REMBG_WORKER_TOKEN", "")
        if len(token) < 32 or not hmac.compare_digest(self.headers.get("Authorization", ""), f"Bearer {token}"):
            self.reject(401, "Unauthorized.")
            return

        mime_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if mime_type not in ALLOWED_MIME_TYPES:
            self.reject(415, "Unsupported image format.")
            return

        try:
            content_length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self.reject(411, "Content-Length is required.")
            return
        if content_length < 1 or content_length > MAX_IMAGE_BYTES:
            self.reject(413, "Image size is not allowed.")
            return

        image_bytes = self.rfile.read(content_length)
        if len(image_bytes) != content_length:
            self.reject(400, "Incomplete image upload.")
            return

        started_at = time.perf_counter()
        try:
            result = process_image_bytes(image_bytes, mime_type, session=get_session())
        except Exception:
            logger.exception("Image worker could not process an upload.")
            self.respond(422, b"Image processing failed.", "text/plain")
            return

        logger.info("Background removal completed in %.0f ms.", (time.perf_counter() - started_at) * 1000)
        self.respond(200, result, "image/jpeg")

    def reject(self, status, message):
        self.respond(status, message.encode("utf-8"), "text/plain")

    def respond(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string, *args):
        logger.info("%s - %s", self.address_string(), format_string % args)


def main():
    token = os.environ.get("REMBG_WORKER_TOKEN", "")
    if len(token) < 32:
        raise SystemExit("Set REMBG_WORKER_TOKEN to a random secret of at least 32 characters.")

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    model_name = os.environ.get("REMBG_MODEL", "u2netp")
    server = ThreadingHTTPServer((host, port), ImageWorkerHandler)
    threading.Thread(target=warm_model, name="rembg-model-warmup", daemon=True).start()
    logger.info("Loading rembg model '%s'; health is available at http://%s:%s/health.", model_name, host, port)
    logger.info("Image worker listening on %s:%s.", host, port)
    server.serve_forever()


_model_ready = threading.Event()
_startup_error = None


def warm_model():
    global _startup_error
    try:
        get_session()
        _model_ready.set()
        logger.info("Rembg model is ready.")
    except Exception as error:
        _startup_error = error
        logger.exception("Could not load rembg model.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
