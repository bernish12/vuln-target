const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(503, {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '86400',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>503 Service Decommissioned</title>
<style>
  body { background:#0b0f17; color:#94a3b8; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; }
  .box { max-width:500px; padding:40px; border:1px solid #1e293b; border-radius:12px; background:#0f172a; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5); }
  h1 { color:#ef4444; font-size:24px; margin-bottom:12px; }
  p { line-height:1.6; font-size:15px; color:#cbd5e1; margin-bottom:16px; }
  .badge { display:inline-block; padding:6px 14px; background:#1e293b; border-radius:6px; font-family:monospace; color:#38bdf8; font-size:12px; font-weight:bold; }
</style>
</head>
<body>
  <div class="box">
    <h1>503 — Target Decommissioned</h1>
    <p>This benchmark web application has been safely decommissioned and taken offline following the completion of vulnerability assessments.</p>
    <div class="badge">SERVER STATUS: OFFLINE</div>
  </div>
</body>
</html>`);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`VulnTarget is DECOMMISSIONED. Listening on port ${PORT}`);
});
