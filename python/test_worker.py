import http.client
import os
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch

import worker


class ImageWorkerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.token = "test-worker-token-" + ("x" * 32)
        cls.environment = patch.dict(os.environ, {"REMBG_WORKER_TOKEN": cls.token})
        cls.environment.start()
        cls.ready_patch = patch.object(worker, "_model_ready", threading.Event())
        ready = cls.ready_patch.start()
        ready.set()
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), worker.ImageWorkerHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.ready_patch.stop()
        cls.environment.stop()

    def post(self, headers, body=b"image-data"):
        connection = http.client.HTTPConnection("127.0.0.1", self.port)
        connection.request("POST", "/process", body=body, headers=headers)
        response = connection.getresponse()
        result = response.status, response.getheader("Content-Type"), response.read()
        connection.close()
        return result

    def test_health_endpoint(self):
        connection = http.client.HTTPConnection("127.0.0.1", self.port)
        connection.request("GET", "/health")
        response = connection.getresponse()
        result = response.status, response.read()
        connection.close()
        self.assertEqual(result, (200, b"ok"))

    def test_health_reports_model_warming_without_blocking(self):
        with patch.object(worker, "_model_ready", threading.Event()), patch.object(worker, "_startup_error", None):
            connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=1)
            connection.request("GET", "/health")
            response = connection.getresponse()
            result = response.status, response.read()
            connection.close()

        self.assertEqual(result, (503, b"model is loading"))

    def test_health_responds_while_image_is_processing(self):
        started = threading.Event()
        release = threading.Event()

        def wait_for_image(image, mime_type, session):
            started.set()
            release.wait(timeout=2)
            return b"normalized"

        result = []
        with patch.object(worker, "get_session", return_value=object()), patch.object(worker, "process_image_bytes", side_effect=wait_for_image):
            upload = threading.Thread(target=lambda: result.append(self.post({
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "image/jpeg",
            })))
            upload.start()
            self.assertTrue(started.wait(timeout=1))
            connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=1)
            connection.request("GET", "/health")
            response = connection.getresponse()
            health = response.status, response.read()
            connection.close()
            release.set()
            upload.join(timeout=2)

        self.assertEqual(health, (200, b"ok"))
        self.assertEqual(result[0][0], 200)

    def test_requires_worker_token(self):
        status, _, _ = self.post({"Content-Type": "image/jpeg"}, body=b"")
        self.assertEqual(status, 401)

    def test_rejects_unsupported_content_type(self):
        status, _, _ = self.post({
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/octet-stream",
        }, body=b"")
        self.assertEqual(status, 415)

    def test_processes_authenticated_image(self):
        with patch.object(worker, "get_session", return_value=object()), patch.object(worker, "process_image_bytes", return_value=b"normalized"):
            status, content_type, body = self.post({
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "image/jpeg",
            })

        self.assertEqual(status, 200)
        self.assertEqual(content_type, "image/jpeg")
        self.assertEqual(body, b"normalized")


if __name__ == "__main__":
    unittest.main()
