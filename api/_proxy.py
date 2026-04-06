"""Shared proxy helper for Vercel serverless functions."""
import urllib.request
import urllib.error
import json
from http.server import BaseHTTPRequestHandler


def make_handler(upstream_url):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            try:
                req = urllib.request.Request(
                    upstream_url,
                    headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'},
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = resp.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            except urllib.error.HTTPError as e:
                body = json.dumps({'error': str(e)}).encode()
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                body = json.dumps({'error': str(e)}).encode()
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(body)

        def log_message(self, *args):
            pass

    return Handler
