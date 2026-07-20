"""
server.py
---------
MỤC ĐÍCH:
    Python HTTP server cục bộ phục vụ Wings Ads Portal trên port 8000.
    Cung cấp static file serving + API endpoints kích hoạt automation scripts.

CHẠY VỚI:
    .venv/bin/python server.py
    make run

PORT: 8000
URL: http://localhost:8000

API ENDPOINTS:
    POST /api/run-report     — Chạy generate_weekly_dashboard.py (sync ads + report)
    POST /api/sync-pancake   — Chạy auto_sync_pancake.py (lấy JWT từ Chrome → sync leads)

HEADERS:
    CORS: Access-Control-Allow-Origin: * (để JS module gọi được API)
    Tự động serve index.html khi truy cập /

QUAN TRỌNG:
    - Cần Chrome đang chạy ở debug port 9222 để sync-pancake hoạt động
    - Script phải chạy từ thư mục gốc dự án (có index.html)
    - Kết quả API trả về JSON: { status: 'success'|'error', message: '...' }

PHỤ THUỘC:
    subprocess (để gọi Python scripts khác), không cần lib/*
"""
import http.server
import socketserver
import subprocess
import os
import json
import webbrowser
import threading
import time


PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# ─── High Performance Memory Caching & Cache Buster resolution ─────────────────

def resolve_imported_filepath(current_file_path, imported_path):
    """Resolve the absolute path of an imported JS file relative to current_file_path."""
    current_dir = os.path.dirname(current_file_path)
    # Remove query string if present
    imported_path_clean = imported_path.split('?')[0]
    return os.path.abspath(os.path.join(current_dir, imported_path_clean))


def find_js_dependencies(abs_path, visited=None):
    """Recursively discover all JS files imported by the given file."""
    if visited is None:
        visited = set()
        
    if abs_path in visited:
        return set()
        
    visited.add(abs_path)
    dependencies = set()
    
    try:
        if not os.path.exists(abs_path):
            return dependencies
            
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        import re
        # Match standard imports like: from './state.js' or import './utils.js'
        import_pattern = r"(?:from|import)\s+['\"](\.\.?/[^'\"]+\.js)['\"]"
        imports = re.findall(import_pattern, content)
        
        for imp in imports:
            dep_abs_path = resolve_imported_filepath(abs_path, imp)
            if os.path.exists(dep_abs_path):
                dependencies.add(dep_abs_path)
                dependencies.update(find_js_dependencies(dep_abs_path, visited))
    except Exception as e:
        print(f"Error parsing dependencies for {abs_path}: {e}")
        
    return dependencies


def get_file_version(resolved_path):
    """Get stable file version using its modification time (mtime) as a hash buster."""
    try:
        if os.path.exists(resolved_path):
            return str(int(os.path.getmtime(resolved_path)))
    except Exception:
        pass
    return "1"


class MemoryCache:
    def __init__(self):
        self.cache = {} # abs_path -> cached dict
        
    def get(self, abs_path):
        cached = self.cache.get(abs_path)
        if not cached:
            return None
            
        # Verify self mtime
        try:
            if os.path.getmtime(abs_path) != cached['self_mtime']:
                return None
        except OSError:
            return None
            
        # Verify all dependencies mtime
        for dep_path, cached_dep_mtime in cached['dependencies'].items():
            try:
                if os.path.getmtime(dep_path) != cached_dep_mtime:
                    return None
            except OSError:
                return None
                
        return cached

    def set(self, abs_path, content, dependencies, content_type):
        try:
            self_mtime = os.path.getmtime(abs_path)
            dep_mtimes = {}
            max_mtime = self_mtime
            
            for dep_path in dependencies:
                try:
                    mtime = os.path.getmtime(dep_path)
                    dep_mtimes[dep_path] = mtime
                    if mtime > max_mtime:
                        max_mtime = mtime
                except OSError:
                    dep_mtimes[dep_path] = 0
            
            import email.utils
            etag = f'"{int(max_mtime)}-{len(content)}"'
            last_modified = email.utils.formatdate(int(max_mtime), usegmt=True)
            
            self.cache[abs_path] = {
                'content': content,
                'self_mtime': self_mtime,
                'dependencies': dep_mtimes,
                'content_type': content_type,
                'etag': etag,
                'last_modified': last_modified
            }
            return self.cache[abs_path]
        except OSError:
            return None


STATIC_CACHE = MemoryCache()


class PortalRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
        
    def _check_conditional_get(self, etag, last_modified):
        """Return True if the browser's cached copy is still valid (304)."""
        if_none_match   = self.headers.get('If-None-Match', '')
        if_mod_since    = self.headers.get('If-Modified-Since', '')
        if etag and if_none_match and if_none_match == etag:
            return True
        if last_modified and if_mod_since and if_mod_since == last_modified:
            return True
        return False

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        if not getattr(self, '_cache_header_sent', False):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def _serve_and_cache_js_file(self, js_path, clean_path):
        """Perform regex dynamic imports replacement, cache in memory, and serve with conditional GET."""
        cached = STATIC_CACHE.get(js_path)
        if not cached:
            try:
                with open(js_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find all dependencies recursively to form dependency graph
                deps = find_js_dependencies(js_path)
                
                # Rewrite intra-module imports to include stable ?v=mtime buster
                import re
                
                def replace_import(match):
                    prefix = match.group(1) # e.g. "from '"
                    imported_path = match.group(2) # e.g. "./state.js"
                    suffix = match.group(4) # e.g. "'"
                    resolved = resolve_imported_filepath(js_path, imported_path)
                    v = get_file_version(resolved)
                    return f"{prefix}{imported_path}?v={v}{suffix}"
                
                # Replace 'from' and 'import' imports
                content = re.sub(
                    r"(from\s+['\"])(\.\.?/[^'\"?]+\.js)(\?v=\d+)?(['\"])",
                    replace_import,
                    content
                )
                content = re.sub(
                    r"(import\s+['\"])(\.\.?/[^'\"?]+\.js)(\?v=\d+)?(['\"])",
                    replace_import,
                    content
                )
                
                content_bytes = content.encode('utf-8')
                cached = STATIC_CACHE.set(js_path, content_bytes, deps, 'application/javascript; charset=utf-8')
            except Exception as e:
                print(f"Error compiling/caching {clean_path}: {e}")
                return False
                
        if cached:
            # ── 304 Not Modified shortcut ─────────────────────────
            if self._check_conditional_get(cached['etag'], cached['last_modified']):
                self.send_response(304)
                self._cache_header_sent = True
                self.send_header('ETag', cached['etag'])
                self.send_header('Last-Modified', cached['last_modified'])
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                return True

            self.send_response(200)
            self.send_header('Content-Type', cached['content_type'])
            self._cache_header_sent = True
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('ETag', cached['etag'])
            self.send_header('Last-Modified', cached['last_modified'])
            self.end_headers()
            if not getattr(self, '_is_head', False):
                self.wfile.write(cached['content'])
            return True
        return False

    def _serve_and_cache_html_file(self, html_path, clean_path):
        """Serve HTML and update its links to portal assets dynamically using stable mtime versions."""
        cached = STATIC_CACHE.get(html_path)
        if not cached:
            try:
                with open(html_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                import re
                deps = []
                
                portal_js_path = os.path.join(DIRECTORY, 'portal.js')
                portal_css_path = os.path.join(DIRECTORY, 'portal.css')
                ap_js_path = os.path.join(DIRECTORY, 'assessment-portal.js')
                ap_css_path = os.path.join(DIRECTORY, 'assessment-portal.css')
                
                for path in [portal_js_path, portal_css_path, ap_js_path, ap_css_path]:
                    if os.path.exists(path):
                        deps.append(path)
                
                def replace_html_asset(match):
                    asset_name = match.group(1) # e.g. "portal.js"
                    asset_abs_path = os.path.join(DIRECTORY, asset_name)
                    v = get_file_version(asset_abs_path)
                    return f"{asset_name}?v={v}"
                
                content = re.sub(
                    r'(portal\.js|portal\.css|assessment-portal\.js|assessment-portal\.css)\?v=\d+',
                    replace_html_asset,
                    content
                )
                
                content_bytes = content.encode('utf-8')
                cached = STATIC_CACHE.set(html_path, content_bytes, deps, 'text/html; charset=utf-8')
            except Exception as e:
                print(f"Error serving/caching HTML {clean_path}: {e}")
                return False
                
        if cached:
            # ── 304 Not Modified shortcut ─────────────────────────
            if self._check_conditional_get(cached['etag'], cached['last_modified']):
                self.send_response(304)
                self._cache_header_sent = True
                self.send_header('ETag', cached['etag'])
                self.send_header('Last-Modified', cached['last_modified'])
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                return True

            self.send_response(200)
            self.send_header('Content-Type', cached['content_type'])
            self._cache_header_sent = True
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('ETag', cached['etag'])
            self.send_header('Last-Modified', cached['last_modified'])
            self.end_headers()
            if not getattr(self, '_is_head', False):
                self.wfile.write(cached['content'])
            return True
        return False
        
    def do_HEAD(self):
        """Handle HEAD requests cleanly using the GET logic without sending response body."""
        self._is_head = True
        self.do_GET()

    def do_GET(self):
        # Ensure _is_head flag is initialized
        if not hasattr(self, '_is_head'):
            self._is_head = False
            
        clean_path = self.path.split('?')[0]
        
        # 1. HTML routes
        if clean_path in ('/assessment', '/assessment.html'):
            page_path = os.path.join(DIRECTORY, 'assessment.html')
            if self._serve_and_cache_html_file(page_path, clean_path):
                return
        elif clean_path in ('/', '/index.html'):
            index_path = os.path.join(DIRECTORY, 'index.html')
            if self._serve_and_cache_html_file(index_path, clean_path):
                return
                
        # 2. Main Entry Points JS
        elif clean_path == '/portal.js':
            portal_path = os.path.join(DIRECTORY, 'portal.js')
            if self._serve_and_cache_js_file(portal_path, clean_path):
                return
        elif clean_path == '/assessment-portal.js':
            ap_path = os.path.join(DIRECTORY, 'assessment-portal.js')
            if self._serve_and_cache_js_file(ap_path, clean_path):
                return
                
        # 3. Main Entry Points CSS
        elif clean_path == '/portal.css':
            portal_css_path = os.path.join(DIRECTORY, 'portal.css')
            cached = STATIC_CACHE.get(portal_css_path)
            if not cached:
                try:
                    with open(portal_css_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    import re
                    css_imports = re.findall(r"@import\s+['\"](\.\.?/[^'\"]+\.css)['\"]", content)
                    deps = [resolve_imported_filepath(portal_css_path, imp) for imp in css_imports]
                    
                    def replace_css_import(match):
                        imported_path = match.group(1)
                        resolved = resolve_imported_filepath(portal_css_path, imported_path)
                        v = get_file_version(resolved)
                        return f"@import '{imported_path}?v={v}'"
                        
                    content = re.sub(r"@import\s+['\"](\.\.?/[^'\"]+\.css)['\"]", replace_css_import, content)
                    content_bytes = content.encode('utf-8')
                    cached = STATIC_CACHE.set(portal_css_path, content_bytes, deps, 'text/css; charset=utf-8')
                except Exception as e:
                    print(f"Error serving/caching portal.css: {e}")
                    
            if cached:
                if self._check_conditional_get(cached['etag'], cached['last_modified']):
                    self.send_response(304)
                    self._cache_header_sent = True
                    self.send_header('ETag', cached['etag'])
                    self.send_header('Last-Modified', cached['last_modified'])
                    self.send_header('Cache-Control', 'no-cache')
                    self.end_headers()
                    return
                self.send_response(200)
                self.send_header('Content-Type', cached['content_type'])
                self._cache_header_sent = True
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('ETag', cached['etag'])
                self.send_header('Last-Modified', cached['last_modified'])
                self.end_headers()
                if not self._is_head:
                    self.wfile.write(cached['content'])
                return
                
        elif clean_path == '/assessment-portal.css':
            ap_css_path = os.path.join(DIRECTORY, 'assessment-portal.css')
            cached = STATIC_CACHE.get(ap_css_path)
            if not cached:
                try:
                    with open(ap_css_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    import re
                    css_imports = re.findall(r"@import\s+['\"](\.\.?/[^'\"]+\.css)['\"]", content)
                    deps = [resolve_imported_filepath(ap_css_path, imp) for imp in css_imports]
                    
                    def replace_css_import(match):
                        imported_path = match.group(1)
                        resolved = resolve_imported_filepath(ap_css_path, imported_path)
                        v = get_file_version(resolved)
                        return f"@import '{imported_path}?v={v}'"
                        
                    content = re.sub(r"@import\s+['\"](\.\.?/[^'\"]+\.css)['\"]", replace_css_import, content)
                    content_bytes = content.encode('utf-8')
                    cached = STATIC_CACHE.set(ap_css_path, content_bytes, deps, 'text/css; charset=utf-8')
                except Exception as e:
                    print(f"Error serving/caching assessment-portal.css: {e}")
                    
            if cached:
                if self._check_conditional_get(cached['etag'], cached['last_modified']):
                    self.send_response(304)
                    self._cache_header_sent = True
                    self.send_header('ETag', cached['etag'])
                    self.send_header('Last-Modified', cached['last_modified'])
                    self.send_header('Cache-Control', 'no-cache')
                    self.end_headers()
                    return
                self.send_response(200)
                self.send_header('Content-Type', cached['content_type'])
                self._cache_header_sent = True
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('ETag', cached['etag'])
                self.send_header('Last-Modified', cached['last_modified'])
                self.end_headers()
                if not self._is_head:
                    self.wfile.write(cached['content'])
                return

        # 4. Intra-module JS files
        elif clean_path.startswith('/js/') and clean_path.endswith('.js'):
            js_path = os.path.join(DIRECTORY, clean_path.lstrip('/'))
            if self._serve_and_cache_js_file(js_path, clean_path):
                return

        # 5. Intra-module CSS files
        elif clean_path.startswith('/css/') and clean_path.endswith('.css'):
            try:
                css_path = os.path.join(DIRECTORY, clean_path.lstrip('/'))
                cached = STATIC_CACHE.get(css_path)
                if not cached:
                    with open(css_path, 'rb') as f:
                        raw_content = f.read()
                    cached = STATIC_CACHE.set(css_path, raw_content, [], 'text/css; charset=utf-8')
                
                if cached:
                    if self._check_conditional_get(cached['etag'], cached['last_modified']):
                        self.send_response(304)
                        self._cache_header_sent = True
                        self.send_header('ETag', cached['etag'])
                        self.send_header('Last-Modified', cached['last_modified'])
                        self.send_header('Cache-Control', 'no-cache')
                        self.end_headers()
                        return
                    self.send_response(200)
                    self.send_header('Content-Type', cached['content_type'])
                    self._cache_header_sent = True
                    self.send_header('Cache-Control', 'no-cache')
                    self.send_header('ETag', cached['etag'])
                    self.send_header('Last-Modified', cached['last_modified'])
                    self.end_headers()
                    if not self._is_head:
                        self.wfile.write(cached['content'])
                    return
            except Exception as e:
                print(f"Error serving {clean_path}: {e}")

        super().do_GET()
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
        
    def do_POST(self):
        if self.path == '/api/run-report':
            print("Received request to run weekly dashboard...")
            try:
                # Execute the weekly dashboard script using the virtualenv python
                script_path = os.path.join(DIRECTORY, "generate_weekly_dashboard.py")
                venv_python = os.path.join(DIRECTORY, ".venv/bin/python")
                
                if not os.path.exists(venv_python):
                    venv_python = "python" # fallback
                    
                result = subprocess.run(
                    [venv_python, script_path],
                    capture_output=True,
                    text=True,
                    check=True
                )
                
                response_data = {
                    "status": "success",
                    "message": "Báo cáo đã được cập nhật thành công!",
                    "stdout": result.stdout
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
            except subprocess.CalledProcessError as e:
                response_data = {
                    "status": "error",
                    "message": f"Lỗi khi chạy báo cáo: {e.stderr}"
                }
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                response_data = {
                    "status": "error",
                    "message": f"Lỗi không xác định: {str(e)}"
                }
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/sync-pancake':
            print("Received request to sync pancake leads...")
            try:
                script_path = os.path.join(DIRECTORY, "auto_sync_pancake.py")
                venv_python = os.path.join(DIRECTORY, ".venv/bin/python")
                
                if not os.path.exists(venv_python):
                    venv_python = "python"
                    
                result = subprocess.run(
                    [venv_python, script_path],
                    capture_output=True,
                    text=True,
                    check=True
                )
                
                try:
                    sync_result = json.loads(result.stdout.strip())
                except Exception:
                    sync_result = {
                        "status": "error",
                        "message": f"Script output is not valid JSON: {result.stdout}"
                    }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(sync_result, ensure_ascii=False).encode('utf-8'))
            except subprocess.CalledProcessError as e:
                response_data = {
                    "status": "error",
                    "message": f"Lỗi khi chạy đồng bộ: {e.stderr or e.stdout}"
                }
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                response_data = {
                    "status": "error",
                    "message": f"Lỗi không xác định: {str(e)}"
                }
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def background_sync_scheduler():
    """Tự động đồng bộ leads từ Pancake về Supabase mỗi giờ."""
    # Đợi 10 giây sau khi server khởi động để tránh xung đột
    time.sleep(10)
    print("Background Sync: Bắt đầu tiến trình tự động đồng bộ (mỗi 1 giờ)...")
    while True:
        try:
            print("Background Sync: Đang tự động đồng bộ từ Pancake...")
            script_path = os.path.join(DIRECTORY, "auto_sync_pancake.py")
            venv_python = os.path.join(DIRECTORY, ".venv/bin/python")
            
            if not os.path.exists(venv_python):
                venv_python = "python"
                
            result = subprocess.run(
                [venv_python, script_path],
                capture_output=True,
                text=True
            )
            print(f"Background Sync Kết quả: {result.stdout.strip()}")
            if result.stderr:
                print(f"Background Sync Lỗi: {result.stderr.strip()}")
        except Exception as e:
            print(f"Background Sync Exception: {e}")
        
        # Đợi 1 giờ (3600 giây)
        time.sleep(3600)

def open_browser():
    time.sleep(1.5)
    url = f"http://localhost:{PORT}/"
    print(f"Opening browser at: {url}")
    webbrowser.open(url)

def main():
    # Make sure we run in the directory of the script
    os.chdir(DIRECTORY)
    
    # Configure socket reuse to avoid "Address already in use" errors
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    
    with socketserver.ThreadingTCPServer(("", PORT), PortalRequestHandler) as httpd:
        print(f"Wings Portal Server started at port {PORT}")
        print("Press Ctrl+C to stop the server.")
        
        # Start browser thread
        threading.Thread(target=open_browser, daemon=True).start()
        
        # Start background sync thread
        threading.Thread(target=background_sync_scheduler, daemon=True).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")
            httpd.shutdown()

if __name__ == "__main__":
    main()
