"""
Simple HTTP server that:
1. Serves static files from the same directory
2. Proxies /api/* requests to openapi.twse.com.tw (bypassing CORS)
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import json
import os
import sys

PORT = 3001
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PROXY_ROUTES = {
    '/api/companies':   'https://openapi.twse.com.tw/v1/opendata/t187ap03_L',
    '/api/valuations':  'https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_d',
    '/api/revenue':     'https://openapi.twse.com.tw/v1/opendata/t187ap05_L',
    '/api/tpex':        'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
    '/api/tpex_companies': 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_companies',
}

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path in PROXY_ROUTES:
            self.proxy(PROXY_ROUTES[path])
        else:
            super().do_GET()

    def send_response(self, code, message=None):
        super().send_response(code, message)
        # Disable caching so JS/CSS changes are always picked up
        self.send_header('Cache-Control', 'no-store')

    def proxy(self, url):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def log_message(self, fmt, *args):
        pass  # suppress access logs

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

if __name__ == '__main__':
    with ThreadingServer(('', PORT), Handler) as httpd:
        print(f'Serving on http://localhost:{PORT}', flush=True)
        httpd.serve_forever()
