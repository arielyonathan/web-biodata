import http.server
import socketserver
import json
import os
import urllib.parse
import socket

PORT = 8000
COMMENTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'comments.json')

# Inisialisasi file comments.json jika belum ada
if not os.path.exists(COMMENTS_FILE):
    with open(COMMENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f, ensure_ascii=False, indent=2)

def load_comments():
    try:
        with open(COMMENTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[Error] Gagal membaca comments.json: {e}")
        return []

def save_comments(comments):
    try:
        with open(COMMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(comments, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[Error] Gagal menyimpan comments.json: {e}")
        return False

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

class SimpleCommentServer(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Header CORS agar bisa diakses dari berbagai port / device
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Endpoint API Komentar: GET /api/comments
        if parsed.path == '/api/comments':
            comments = load_comments()
            data = json.dumps(comments, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        # Default: Sajikan file HTML, CSS, JS, Gambar seperti biasa
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Endpoint API Komentar: POST /api/comments
        if parsed.path == '/api/comments':
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length).decode('utf-8')
            
            try:
                new_item = json.loads(post_body)
                author = new_item.get('author', '').strip() or 'Pengunjung'
                text = new_item.get('text', '').strip()
                tag = new_item.get('tag', '💬 Diskusi')
                time_str = new_item.get('time', '')
                
                if not text:
                    self.send_error(400, "Teks komentar tidak boleh kosong")
                    return

                comment_obj = {
                    "id": new_item.get('id') or int(os.times().system * 1000) or 1,
                    "author": author,
                    "text": text,
                    "tag": tag,
                    "time": time_str
                }

                # Simpan ke comments.json
                comments = load_comments()
                comments.insert(0, comment_obj)
                save_comments(comments)

                response_data = json.dumps({
                    "success": True,
                    "message": "Komentar berhasil disimpan",
                    "comment": comment_obj,
                    "comments": comments
                }, ensure_ascii=False).encode('utf-8')

                self.send_response(201)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(response_data)))
                self.end_headers()
                self.wfile.write(response_data)
                print(f"[Komentar Baru] Dari {author}: {text[:30]}...")
                return

            except Exception as e:
                print(f"[Error POST]: {e}")
                self.send_error(500, f"Gagal memproses data: {e}")
                return

        return super().do_POST()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Endpoint API Komentar: DELETE /api/comments?id=...
        if parsed.path == '/api/comments':
            query = urllib.parse.parse_qs(parsed.query)
            target_id = query.get('id', [None])[0]

            if not target_id:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    try:
                        body_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
                        target_id = body_data.get('id')
                    except Exception:
                        pass

            if not target_id:
                self.send_error(400, "ID komentar tidak ditemukan")
                return

            comments = load_comments()
            comments = [c for c in comments if str(c.get('id')) != str(target_id)]
            save_comments(comments)

            response_data = json.dumps({
                "success": True,
                "message": "Komentar berhasil dihapus",
                "comments": comments
            }, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(response_data)))
            self.end_headers()
            self.wfile.write(response_data)
            return

        self.send_error(404, "Endpoint tidak ditemukan")


if __name__ == '__main__':
    # Pastikan direktori kerja saat ini adalah folder file ini
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    local_ip = get_local_ip()
    
    class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        allow_reuse_address = True

    try:
        with ThreadingTCPServer(("0.0.0.0", PORT), SimpleCommentServer) as httpd:
            print("=" * 68)
            print("🚀 BACKEND SERVER KOMENTAR & WEB BIODATA BERJALAN DENGAN SUKSES!")
            print("=" * 68)
            print(f"💻 Akses dari Laptop ini        : http://localhost:{PORT}/dashboard.html")
            print(f"📱 Akses dari HP / Device Lain   : http://{local_ip}:{PORT}/dashboard.html")
            print(f"📁 Komentar disimpan permanen di : {COMMENTS_FILE}")
            print("-" * 68)
            print("💡 TIPS UNTUK BUKA DI HP / DEVICE LAIN:")
            print(f"   Pastikan HP & Laptop terhubung ke Wi-Fi yang sama, lalu")
            print(f"   buka link: http://{local_ip}:{PORT}/dashboard.html")
            print("=" * 68)
            print("Tekan CTRL + C di terminal ini jika ingin mematikan server.")
            print()
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server dimatikan]")
    except Exception as err:
        print(f"\n[Gagal menjalankan server]: {err}")

