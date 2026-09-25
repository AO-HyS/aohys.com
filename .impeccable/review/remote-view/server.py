"""Bounded reverse proxy for the explicitly requested design review artifacts."""
import http.client
import json
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path('/Users/corrortiz/Documents/AO/aohys')
REPORT = ROOT / 'docs/design/aohys-diseno-r3.html'
CONFIG = Path('/tmp/aohys-review-public-host.json')
ORIGIN_PORT = 50569
PORT = 61846
KEY = 'a2c3abe7'
READ_ROUTES = {'/', '/img/0', '/img/1', '/img/2', '/next-status'}
POST_ROUTES = {'/heartbeat', '/build-path', '/answer'}
REPORT_ROUTES = {'/aohys-diseno-r3.html', '/aohys/docs/design/aohys-diseno-r3.html', '/download/aohys-diseno-r3.html'}


class ReviewHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def reply(self, status, data=b'', content_type='text/plain; charset=utf-8', download=False):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Robots-Tag', 'noindex, nofollow')
        if download:
            self.send_header('Content-Disposition', 'attachment; filename="aohys-diseno-r3.html"')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    def handle_review(self):
        public_host = json.loads(CONFIG.read_text()).get('host', '') if CONFIG.exists() else ''
        host = self.headers.get('Host', '')
        allowed_hosts = {f'127.0.0.1:{PORT}', f'localhost:{PORT}'}
        if public_host:
            allowed_hosts.add(public_host)
        if host not in allowed_hosts:
            return self.reply(403)
        target = urllib.parse.urlsplit(self.path)
        if target.scheme or target.netloc:
            return self.reply(400)
        path = target.path
        if self.command in ('GET', 'HEAD') and path in REPORT_ROUTES:
            data = REPORT.read_bytes()
            return self.reply(200, data, 'text/html; charset=utf-8', download=path.startswith('/download/'))
        if self.command in ('GET', 'HEAD') and path not in READ_ROUTES:
            return self.reply(404)
        body = None
        if self.command == 'POST':
            if path not in POST_ROUTES:
                return self.reply(404)
            expected = f'https://{public_host}' if host == public_host else f'http://{host}'
            if self.headers.get('Origin') != expected:
                return self.reply(403)
            if self.headers.get('Transfer-Encoding'):
                return self.reply(400)
            try:
                size = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                return self.reply(400)
            if not 0 <= size <= 16384:
                return self.reply(413)
            body = self.rfile.read(size)
        headers = {'Host': f'127.0.0.1:{ORIGIN_PORT}'}
        if self.command == 'POST':
            headers['Origin'] = f'http://127.0.0.1:{ORIGIN_PORT}'
            headers['Content-Type'] = self.headers.get('Content-Type', 'text/plain')
        connection = http.client.HTTPConnection('127.0.0.1', ORIGIN_PORT, timeout=15)
        try:
            method = 'GET' if self.command == 'HEAD' else self.command
            connection.request(method, self.path, body=body, headers=headers)
            response = connection.getresponse()
            data = response.read()
            self.reply(response.status, data, response.getheader('Content-Type', 'application/octet-stream'))
        except (OSError, http.client.HTTPException):
            self.reply(502, b'The temporary review origin is unavailable.')
        finally:
            connection.close()

    do_GET = handle_review
    do_HEAD = handle_review
    do_POST = handle_review


server = ThreadingHTTPServer(('127.0.0.1', PORT), ReviewHandler)


def keep_origin_available():
    deadline = time.monotonic() + 8 * 60 * 60
    while time.monotonic() < deadline:
        connection = http.client.HTTPConnection('127.0.0.1', ORIGIN_PORT, timeout=5)
        try:
            connection.request('POST', '/heartbeat?key=' + KEY, body=b'')
            response = connection.getresponse()
            response.read()
            if response.status not in (200, 204):
                break
        except (OSError, http.client.HTTPException):
            break
        finally:
            connection.close()
        time.sleep(15)
    server.shutdown()


threading.Thread(target=keep_origin_available, daemon=True).start()
print(f'Review artifacts listening on http://127.0.0.1:{PORT}', flush=True)
server.serve_forever()
