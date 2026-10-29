"""Prueba PWA en Chrome, perfil/origen temporales y datos sintéticos.
Ejecutar: py tests/pwa.regresion.py
No lee perfiles existentes ni escribe en el proyecto.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import base64, hashlib, json, os, re, socket, struct, subprocess, tempfile, threading, time, urllib.request

ROOT = Path(__file__).resolve().parents[1]
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')
VERSION = re.search(r"const VERSION = '([^']+)'", SW).group(1)
state = {'mode': 'legacy', 'offline': False}
LEGACY = """
self.addEventListener('install', e => e.waitUntil((async () => {
 const c = await caches.open('casino-v1');
 await c.put('/js/servicios/PartidaService.js', new Response('// __obsolete'));
 await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
"""

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_GET(self):
        if state['offline']:
            self.close_connection = True
            self.connection.shutdown(socket.SHUT_RDWR)
            self.connection.close()
            return
        path = self.path.split('?', 1)[0]
        if path in ['/sw.js', '/tests/pwa-probe']:
            text = '<!doctype html><title>PWA aislada</title>'
            if path == '/sw.js':
                text = LEGACY if state['mode'] == 'legacy' else SW
                if state['mode'] == 'updated':
                    text = text.replace(VERSION, VERSION + '-prueba')
            data = text.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript' if path == '/sw.js' else 'text/html')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        return super().do_GET()

class CDP:
    def __init__(self, url):
        from urllib.parse import urlparse
        u = urlparse(url)
        self.sock = socket.create_connection((u.hostname, u.port), timeout=20)
        key = base64.b64encode(os.urandom(16)).decode()
        request = ('GET ' + u.path + ' HTTP/1.1\r\nHost: ' + u.netloc +
            '\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ' + key +
            '\r\nSec-WebSocket-Version: 13\r\n\r\n')
        self.sock.sendall(request.encode())
        header = b''
        while not header.endswith(b'\r\n\r\n'):
            header += self.sock.recv(1)
        assert header.split(b' ', 2)[1] == b'101', header
        self.seq = 0
        self.events = []
    def read(self, n):
        data = b''
        while len(data) < n:
            chunk = self.sock.recv(n - len(data))
            if not chunk: raise RuntimeError('CDP desconectado')
            data += chunk
        return data
    def send(self, data, opcode=1):
        data = data if isinstance(data, bytes) else data.encode()
        n = len(data)
        header = bytes([128 | opcode])
        if n < 126: header += bytes([128 | n])
        elif n < 65536: header += bytes([128 | 126]) + struct.pack('>H', n)
        else: header += bytes([128 | 127]) + struct.pack('>Q', n)
        mask = os.urandom(4)
        self.sock.sendall(header + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
    def receive(self):
        while True:
            first, second = self.read(2)
            n = second & 127
            if n == 126: n = struct.unpack('>H', self.read(2))[0]
            if n == 127: n = struct.unpack('>Q', self.read(8))[0]
            mask = self.read(4) if second & 128 else None
            data = self.read(n)
            if mask: data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            if first & 15 == 9:
                self.send(data, 10)
                continue
            if first & 15 == 1: return json.loads(data)
            if first & 15 == 8: raise RuntimeError('WebSocket cerrado')
    def call(self, method, params=None):
        self.seq += 1
        seq = self.seq
        self.send(json.dumps({'id': seq, 'method': method, 'params': params or {}}))
        while True:
            data = self.receive()
            if data.get('method') == 'ServiceWorker.workerErrorReported': print('SW_ERROR', json.dumps(data), flush=True)
            if data.get('id') == seq:
                if 'error' in data: raise RuntimeError(data['error'])
                return data.get('result', {})
    def js(self, expression):
        if expression.startswith('(async'): expression = 'await ' + expression
        result = self.call('Runtime.evaluate', {'expression': expression,
            'awaitPromise': True, 'replMode': True, 'returnByValue': True})
        if 'exceptionDetails' in result: raise RuntimeError(result['exceptionDetails'])
        return result.get('result', {}).get('value')

def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = 'http://127.0.0.1:' + str(server.server_port)
    profile = Path(tempfile.mkdtemp(prefix='casino-pwa-'))
    chrome = os.environ.get('CHROME_PATH', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    process = subprocess.Popen([chrome, '--headless', '--disable-gpu', '--no-first-run',
        '--no-default-browser-check', '--disable-background-networking',
        '--remote-debugging-port=0', '--user-data-dir=' + str(profile), 'about:blank'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    c = None
    results = []
    def check(condition, name):
        assert condition, name
        results.append(name)
    def wait(expression, timeout=20):
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            try:
                value = c.js(expression)
                if value: return value
            except RuntimeError:
                pass
            time.sleep(0.1)
        print('DEBUG', c.js("(async()=>({caches:await caches.keys(),reg:(await navigator.serviceWorker.getRegistrations()).map(r=>({active:r.active?.state,installing:r.installing?.state,waiting:r.waiting?.state}))}))()"), flush=True)
        raise AssertionError('Tiempo agotado: ' + expression)
    def navigate(path):
        c.call('Page.navigate', {'url': origin + path})
        wait('location.pathname === ' + json.dumps(path) + ' && document.readyState === "complete"')
    try:
        end = time.monotonic() + 15
        while not (profile / 'DevToolsActivePort').exists():
            assert time.monotonic() < end, 'Chrome no inició'
            time.sleep(0.1)
        port = (profile / 'DevToolsActivePort').read_text().splitlines()[0]
        targets = json.load(urllib.request.urlopen('http://127.0.0.1:' + port + '/json'))
        c = CDP(next(t['webSocketDebuggerUrl'] for t in targets if t['type'] == 'page'))
        c.call('Page.enable')
        c.call('Runtime.enable')
        c.call('Network.enable')
        c.call('ServiceWorker.enable')
        navigate('/tests/pwa-probe')
        c.js("await navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'}); true")
        wait('Boolean(navigator.serviceWorker.controller)')
        check('__obsolete' in c.js("await (await fetch('/js/servicios/PartidaService.js')).text()"),
            'Reproducción aislada de código antiguo en casino-v1')
        c.js("await (await caches.open('otra-aplicacion')).put('/sentinela',new Response('conservar')); true")
        state['mode'] = 'current'
        c.js("await (await navigator.serviceWorker.getRegistration()).update(); true")
        wait("(async()=> (await caches.keys()).includes('casino-shell-" + VERSION + "') && !(await caches.keys()).includes('casino-v1'))()")
        check(c.js("(await caches.keys()).includes('otra-aplicacion')"), 'Actualización elimina solo cachés propias')
        navigate('/index.html')
        wait("window.Alpine?.version === '3.14.8'")
        check(c.js("Boolean(await navigator.serviceWorker.getRegistration())"), 'Registro desde aplicación, instalación y activación')
        manifest = c.call('Page.getAppManifest')
        check(not manifest.get('errors') and bool(manifest.get('data')), 'Manifest aceptado por Chrome')
        check(c.js("document.querySelector('script[src=\"/js/vendor/alpine-3.14.8.min.js\"]') !== null"),
            'Alpine local 3.14.8 sin dependencia del CDN')
        for icon in json.loads((ROOT / 'manifest.json').read_text())['icons']:
            check(c.js("(await fetch(" + json.dumps(icon['src']) + ")).ok"), 'Icono accesible ' + icon['sizes'])
        c.js("await (await caches.open('casino-shell-" + VERSION + "')).put('/js/servicios/PartidaService.js',new Response('// __obsolete')); true")
        fresh = c.js("await (await fetch('/js/servicios/PartidaService.js',{cache:'no-store'})).text()")
        check('__obsolete' not in fresh and 'transaccionPartidas' in fresh,
            'Red primero reemplaza JavaScript antiguo y conserva correcciones')
        # Solo datos sintéticos del perfil y origen recién creados.
        c.js("""(async()=> {
          const {LocalStorageRepository}=await import('/js/repositorio/LocalStorageRepository.js');
          const repo=new LocalStorageRepository();
          await repo.crear('usuarios',{id:'pwa-simulado',nombre:'Prueba PWA',correo:'pwa@example.invalid',rol:'jugador',saldo:100,creado:new Date().toISOString()});
          await repo.crear('sesion',{id:'actual',usuarioId:'pwa-simulado'});
          return true;
        })()""")
        navigate('/jugador/dashboard.html')
        wait("document.body.innerText.includes('Prueba PWA')")
        state['mode'] = 'updated'
        c.js("await (await navigator.serviceWorker.getRegistration()).update(); true")
        wait("(async()=> (await caches.keys()).includes('casino-shell-" + VERSION + "-prueba') && !(await caches.keys()).includes('casino-shell-" + VERSION + "'))()")
        wait("Boolean(document.querySelector('#actualizacion-pwa'))")
        check(c.js("location.pathname === '/jugador/dashboard.html'"), 'Actualización avisa sin perder formularios por recarga automática')
        state['offline'] = True
        c.call('Network.emulateNetworkConditions', {'offline': True, 'latency': 0, 'downloadThroughput': 0, 'uploadThroughput': 0})
        for path in ['/jugador/dashboard.html','/jugador/juegos.html','/jugador/ruleta.html',
            '/jugador/blackjack.html','/jugador/historial.html','/jugador/ranking.html']:
            navigate(path)
            wait("window.Alpine?.version === '3.14.8' && document.querySelector('.aplicacion') !== null")
            check(True, 'Navegación y Alpine sin conexión: ' + path)
        c.js("""(async()=> {
          const {LocalStorageRepository}=await import('/js/repositorio/LocalStorageRepository.js');
          const repo=new LocalStorageRepository();
          await repo.crear('usuarios',{id:'pwa-admin-simulado',nombre:'Admin PWA',correo:'admin-pwa@example.invalid',rol:'admin',saldo:0,creado:new Date().toISOString()});
          await repo.editar('sesion',{id:'actual',usuarioId:'pwa-admin-simulado'});
          return true;
        })()""")
        for path in ['/admin/panel.html','/admin/usuarios.html','/admin/juegos.html',
            '/admin/partidas.html','/admin/estadisticas.html']:
            navigate(path)
            wait("window.Alpine?.version === '3.14.8' && document.querySelector('.aplicacion') !== null")
            check(True, 'Página administrativa sin conexión: ' + path)
        c.js("""(async()=> {
          const {LocalStorageRepository}=await import('/js/repositorio/LocalStorageRepository.js');
          await new LocalStorageRepository().eliminar('sesion','actual');
          return true;
        })()""")
        for path in ['/index.html','/registro.html','/menu.html','/jugador/inicio.html']:
            navigate(path)
            check(c.js("document.body.innerText.length > 0"), 'Página pública sin conexión: ' + path)
        for path in ['/js/main.js','/js/repositorio/LocalStorageRepository.js',
            '/js/servicios/PartidaService.js','/js/controladores/PartidaController.js']:
            digest = c.js("""(async()=> { const r=await fetch(PATH); const h=await crypto.subtle.digest('SHA-256',await r.arrayBuffer()); return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join(''); })()""".replace('PATH', json.dumps(path)))
            check(digest == hashlib.sha256((ROOT / path.lstrip('/')).read_bytes()).hexdigest(),
                'Código actualizado disponible offline: ' + path)
        state['offline'] = False
        c.call('Network.emulateNetworkConditions', {'offline': False, 'latency': 0, 'downloadThroughput': -1, 'uploadThroughput': -1})
        check(c.js("(await fetch('/manifest.json',{cache:'no-store'})).ok"), 'Recuperación de conexión')
        navigate('/tests/partidas.regresion.html')
        wait("document.querySelector('#resultado')?.textContent.includes('28 pruebas aprobadas')")
        check(True, '28 regresiones de partidas pasan bajo el SW actualizado')
        print(json.dumps({'ok': True, 'checks': len(results), 'results': results,
            'origin': origin, 'profile': str(profile)}, ensure_ascii=True))
    finally:
        if c:
            try: c.call('Browser.close')
            except Exception: pass
        try: process.wait(timeout=5)
        except subprocess.TimeoutExpired: process.terminate()
        server.shutdown()

if __name__ == '__main__':
    run()
