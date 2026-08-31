import http.server, socketserver
PORT = 8789
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith('.html'):
            self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def guess_type(self, p):
        return 'text/html; charset=utf-8' if str(p).endswith('.html') else super().guess_type(p)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
print(f"serving {PORT}")
socketserver.TCPServer(("", PORT), H).serve_forever()
