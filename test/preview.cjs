// Serve only an explicitly supplied generated fixture directory on loopback.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const base = fs.realpathSync(process.argv[2]);
const port = Number(process.argv[3] || 4018);
http.createServer((request, response) => {
  let file;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/notebook(?=\/|$)/, '');
    file = path.resolve(base, `.${pathname}`);
    if (!file.startsWith(base + path.sep) && file !== base) throw new Error('outside root');
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Fixture preview: http://127.0.0.1:${port}/notebook/`));
