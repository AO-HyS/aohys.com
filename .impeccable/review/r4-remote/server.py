"""Bounded presentation of this round only; never exposes the source profile."""
import http.client
import json
import mimetypes
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path('/Users/corrortiz/Documents/AO/aohys')
REVIEW = ROOT / '.impeccable/review/r4-remote'
COMPS = ROOT / '.impeccable/mocks/decision/aohys-20260918-r4'
CONFIG = Path('/tmp/aohys-r4-public-host.json')
ORIGIN_PORT, PORT, KEY = 50570, 61848, 'f0181936'
READ_ROUTES = {'/', '/img/0', '/img/1', '/img/2', '/next-status'}
POST_ROUTES = {'/heartbeat', '/build-path', '/answer'}
FILES = {'/review.css': REVIEW / 'review.css'}
for direction in ('firma', 'corte', 'escena'):
    FILES['/' + direction + '/'] = REVIEW / (direction + '.html')
    for page in ('inicio', 'interiores'):
        FILES['/assets/' + direction + '-' + page + '.png'] = COMPS / (direction + '-' + page + '.png')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def reply(self, status, data=b'', content_type='text/plain; charset=utf-8'):
        self.send_response(status)
        for key, value in {'Content-Type': content_type, 'Content-Length': str(len(data)),
                           'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
                           'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow'}.items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    def handle_review(self):
        public_host = json.loads(CONFIG.read_text()).get('host', '') if CONFIG.exists() else ''
        host = self.headers.get('Host', '')
        if host not in {f'127.0.0.1:{PORT}', f'localhost:{PORT}', public_host} or not host:
            return self.reply(403)
        target = urllib.parse.urlsplit(self.path)
        if target.scheme or target.netloc:
            return self.reply(400)
        path = target.path
        if self.command in ('GET', 'HEAD') and path in FILES:
            file = FILES[path]
            if not file.is_file():
                return self.reply(404)
            return self.reply(200, file.read_bytes(), mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
        if self.command in ('GET', 'HEAD') and path not in READ_ROUTES:
            return self.reply(404)
        body = None
        if self.command == 'POST':
            if path not in POST_ROUTES:
                return self.reply(404)
            expected = f'https://{public_host}' if host == public_host else f'http://{host}'
            if self.headers.get('Origin') != expected or self.headers.get('Transfer-Encoding'):
                return self.reply(403)
            try:
                size = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                return self.reply(400)
            if not 0 <= size <= 16384:
                return self.reply(413)
            body = self.rfile.read(size)
        headers = {'Host': f'127.0.0.1:{ORIGIN_PORT}'}
        if self.command == 'POST':
            headers.update({'Origin': f'http://127.0.0.1:{ORIGIN_PORT}', 'Content-Type': self.headers.get('Content-Type', 'text/plain')})
        connection = http.client.HTTPConnection('127.0.0.1', ORIGIN_PORT, timeout=15)
        try:
            connection.request('GET' if self.command == 'HEAD' else self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            self.reply(response.status, response.read(), response.getheader('Content-Type', 'application/octet-stream'))
        except (OSError, http.client.HTTPException):
            self.reply(502, b'Temporary comparison origin unavailable.')
        finally:
            connection.close()

    do_GET = handle_review
    do_HEAD = handle_review
    do_POST = handle_review


server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)


def keep_origin():
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


threading.Thread(target=keep_origin, daemon=True).start()
print(f'R4 review: http://127.0.0.1:{PORT}', flush=True)
server.serve_forever()
