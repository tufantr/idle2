#!/usr/bin/env python3
"""A local server for the game, instead of `python3 -m http.server`:

    python3 tools/serve.py          # then http://localhost:8000 (?dev=1 unlocks every tab)
    python3 tools/serve.py 8080     # another port

Python's own server keeps only five connections waiting, so when the game asks for its sixty-odd
modules at once a few are reset and the page half-loads; and it lets the browser keep old copies of
changed files, so an update needs a hard reload. This one keeps a long queue and asks the browser to
check every file again (an unchanged one still comes back as a cheap 304), so a plain reload shows the
latest code. It serves the game folder whatever directory it is started from. Nothing to install.
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.webp': 'image/webp', '.json': 'application/json'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')   # revalidate every time: a changed module is never stale
        super().end_headers()

    def log_message(self, fmt, *args):                  # quiet, but for what went wrong
        if len(args) > 1 and str(getattr(args[1], 'value', args[1]))[:1] in ('4', '5'):
            super().log_message(fmt, *args)


class Server(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with Server(('', port), partial(Handler, directory=str(ROOT))) as httpd:
        print(f'Fantasy Idle on http://localhost:{port}  (Ctrl+C to stop)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
