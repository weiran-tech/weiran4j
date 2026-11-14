"""隔离 Docker 网络中验证仓库 Nginx 配置，不连接真实业务或发布端口。"""
import json
import pathlib
import subprocess
import tempfile
import time
import urllib.request
import uuid

ROOT = next(parent for parent in pathlib.Path(__file__).resolve().parents if (parent / 'packages/manage/nginx.conf').is_file())
NAME = 'weiran-ip-' + uuid.uuid4().hex[:8]
created = []

def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()

try:
    run('docker', 'network', 'create', NAME)
    with tempfile.TemporaryDirectory(prefix='weiran-ip-') as tmp:
        path = pathlib.Path(tmp)
        (path / 'echo.py').write_text('''from http.server import BaseHTTPRequestHandler, HTTPServer
import json
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  body=json.dumps(dict(self.headers)).encode()
  self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers(); self.wfile.write(body)
HTTPServer(('0.0.0.0',5200),Handler).serve_forever()
''')
        backend = NAME + '-backend'
        run('docker', 'run', '-d', '--name', backend, '--network', NAME, '--network-alias', 'backend', '-v', f'{path}/echo.py:/echo.py:ro', 'python:3.12-slim-bookworm', 'python', '/echo.py')
        created.append(backend)
        config = (ROOT / 'packages/manage/nginx.conf').read_text()
        conf = path / 'default.conf'
        conf.write_text(config)
        web = NAME + '-web'
        run('docker', 'run', '-d', '--name', web, '--network', NAME, '--network-alias', 'web', '-p', '127.0.0.1::80', '-v', f'{conf}:/etc/nginx/conf.d/default.conf:ro', 'nginx:stable-alpine')
        created.append(web)
        print(run('docker', 'exec', web, 'nginx', '-v'))
        print(run('docker', 'exec', web, 'nginx', '-t'))
        port = json.loads(run('docker', 'inspect', web))[0]['NetworkSettings']['Ports']['80/tcp'][0]['HostPort']
        url = f'http://127.0.0.1:{port}/api-backend/ip-check'
        def request(xff):
            req = urllib.request.Request(url, headers={'X-Forwarded-For': xff, 'X-Real-IP': '192.0.2.77', 'Forwarded': 'for=192.0.2.88', 'X-Request-Id': 'ip-boundary-proxy'})
            with urllib.request.urlopen(req, timeout=5) as res:
                return {key.lower(): value for key, value in json.load(res).items()}
        for attempt in range(30):
            try:
                first = request('192.0.2.66')
                break
            except Exception:
                if attempt == 29: raise
                time.sleep(.2)
        second = request('192.0.2.99')
        actual = first['x-forwarded-for']
        assert actual == second['x-forwarded-for'] == first['x-real-ip']
        assert actual not in ('192.0.2.66', '192.0.2.77', '192.0.2.99')
        assert 'forwarded' not in first
        assert first['x-request-id'] == 'ip-boundary-proxy'
        print('PASS edge: changed spoofed headers yield same actual peer; Forwarded removed; requestId retained')
        conf.write_text(config.replace('    server_name _;', f'    server_name _;\n    set_real_ip_from {actual};\n    set_real_ip_from 10.0.0.3/32;\n    real_ip_header X-Forwarded-For;\n    real_ip_recursive on;'))
        print(run('docker', 'exec', web, 'nginx', '-t'))
        run('docker', 'exec', web, 'nginx', '-s', 'reload')
        for attempt in range(30):
            multi = request('192.0.2.66,203.0.113.7,10.0.0.3')
            if multi['x-forwarded-for'] == '203.0.113.7': break
            time.sleep(.2)
        assert multi['x-forwarded-for'] == multi['x-real-ip'] == '203.0.113.7'
        assert 'forwarded' not in multi
        print('PASS trusted upstream: recursive chain stops at last non-trusted address and forwards clean single IP')
        result = json.loads(run('docker', 'exec', backend, 'python', '-c', "import json,urllib.request; r=urllib.request.Request('http://web/api-backend/ip-check',headers={'X-Forwarded-For':'192.0.2.66,203.0.113.7,10.0.0.3'}); print(urllib.request.urlopen(r).read().decode())"))
        actual_backend = json.loads(run('docker', 'inspect', backend))[0]['NetworkSettings']['Networks'][NAME]['IPAddress']
        assert result['X-Forwarded-For'] == actual_backend
        print('PASS untrusted upstream: realip ignores forged chain from other network peer')
finally:
    for container in reversed(created):
        subprocess.run(['docker', 'rm', '-f', container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(['docker', 'network', 'rm', NAME], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
