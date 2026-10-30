#!/usr/bin/env python3
"""Serve the static site with byte-range support for native MP3 seeking.

Usage: python3 tools/serve.py [--port 8000] [--bind 127.0.0.1]
No third-party dependencies. Uses SimpleHTTPRequestHandler's URL/path handling.
"""
import argparse
import os
import re
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class RangeRequestHandler(SimpleHTTPRequestHandler):
    """Single HTTP byte ranges, including suffixes and HEAD responses."""

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        self._remaining = None
        requested = self.headers.get('Range')
        # Standard handler preserves directory redirects, index resolution,
        # URL unquoting, traversal prevention, conditional requests and errors.
        path = self.translate_path(self.path)
        if not requested or not os.path.isfile(path):
            return super().send_head()
        # Multiple or unknown range types may be ignored under HTTP semantics.
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
        if not match:
            return super().send_head()
        try:
            source = open(path, 'rb')
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, 'File not found')
            return None
        try:
            stat = os.fstat(source.fileno())
            size = stat.st_size
            first, last = match.groups()
            if not first and not last:
                start, end = size, -1
            elif not first:
                suffix = int(last)
                start, end = max(0, size - suffix), size - 1
                if suffix == 0:
                    start = size
            else:
                start = int(first)
                end = min(int(last), size - 1) if last else size - 1
            if not size or start >= size or end < start:
                source.close()
                self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                self.send_header('Content-Range', f'bytes */{size}')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return None
            # If-Range requires a matching current representation. A date value
            # is supported; unknown ETags result in a normal full response.
            if_range = self.headers.get('If-Range')
            if if_range and if_range != self.date_time_string(stat.st_mtime):
                source.close()
                return super().send_head()
            source.seek(start)
            self._remaining = end - start + 1
            self.send_response(HTTPStatus.PARTIAL_CONTENT)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Length', str(self._remaining))
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.send_header('Last-Modified', self.date_time_string(stat.st_mtime))
            self.end_headers()
            return source
        except Exception:
            source.close()
            raise

    def copyfile(self, source, outputfile):
        if self._remaining is None:
            return super().copyfile(source, outputfile)
        remaining = self._remaining
        while remaining:
            block = source.read(min(64 * 1024, remaining))
            if not block:
                break
            outputfile.write(block)
            remaining -= len(block)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--bind', default='127.0.0.1')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    def handler(*handler_args, **kwargs):
        return RangeRequestHandler(*handler_args, directory=str(root), **kwargs)
    with ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f'Serving {root.name} on {args.bind}:{server.server_port} with HTTP byte ranges', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
