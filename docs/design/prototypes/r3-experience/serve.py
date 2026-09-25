"""Temporary, read-only server for the two explicitly requested design mocks.

Run: python3 docs/design/prototypes/r3-experience/serve.py
Serves only reviewed static asset types inside this prototype directory.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes

ROOT = Path(__file__).resolve().parent
PORT = 61847
ALLOWED = {'.html', '.css', '.js', '.png', '.jpg', '.svg', '.woff2'}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/sobreimpresion/')
            self.end_headers()
            return
        target = (ROOT / path.lstrip('/')).resolve()
        if target.is_dir():
            target = target / 'index.html'
        if not target.is_relative_to(ROOT) or target.suffix not in ALLOWED or not target.is_file():
            self.send_error(404)
            return
        body = target.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Robots-Tag', 'noindex, nofollow')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    do_HEAD = do_GET


if __name__ == '__main__':
    print(f'Two design mocks: http://127.0.0.1:{PORT}/sobreimpresion/ and /firma/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
