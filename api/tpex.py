import urllib.request
import urllib.error
import json
from http.server import BaseHTTPRequestHandler

UPSTREAM = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes'

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            req = urllib.request.Request(UPSTREAM, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def log_message(self, *args):
        pass
