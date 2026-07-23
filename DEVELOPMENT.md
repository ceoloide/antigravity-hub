# DEVELOPMENT.md — Developer Setup & Architecture Guide

This guide covers local development setup, debugging techniques, process discovery mechanisms, and service administration for **Antigravity Hub**.

---

## 🛠️ Environment Prerequisites

- **OS**: Linux (Ubuntu 22.04/24.04 recommended) or macOS.
- **Node.js**: v18.0.0+ (Tested on Node v24.18.0).
- **Google Antigravity Engine**: Installed at `/opt/antigravity/Antigravity-x64/resources/bin/language_server`.

---

## 💻 Local Running & Development

To start the proxy server locally:

```bash
# Clone repository
git clone git@github.com:ceoloide/antigravity-hub.git
cd antigravity-hub

# Install dependencies
npm install

# Start in development mode
npm run dev
```

The server will log its active dynamic discovery parameters upon startup:

```
=======================================================
Antigravity Extracted React Web App running live at:
http://localhost:3333
Dynamic Language Server Port: 46371
Dynamic CSRF Token: <DYNAMIC_CSRF_TOKEN>
=======================================================
```

---

## 🔍 How Dynamic Discovery Works

When the desktop Antigravity engine runs, it launches `language_server` with dynamic flags:

```bash
/opt/antigravity/Antigravity-x64/resources/bin/language_server \
  --standalone \
  --override_ide_name antigravity \
  --subclient_type hub \
  --https_server_port 0 \
  --csrf_token <DYNAMIC_CSRF_TOKEN>
```

In `server.js`, `discoverLanguageServerConfig()` executes:
1. `ps aux` to extract `--csrf_token <uuid>`.
2. `ss -tulpn` to find the active TCP listening port bound to `127.0.0.1`.
3. Caches results and automatically re-evaluates if a proxy connection error occurs.

---

## 🧪 Headless Browser Debugging & Inspection

To debug frontend execution errors or DOM state without a GUI Chrome window, execute the following Chrome DevTools Protocol (CDP) script:

```javascript
// debug_browser.js
import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

async function test() {
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--no-sandbox',
    'http://localhost:3333'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  
  http.get('http://127.0.0.1:9225/json', res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const targets = JSON.parse(data);
      const page = targets.find(t => t.type === 'page');
      const ws = new WebSocket(page.webSocketDebuggerUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      });

      ws.on('message', str => {
        const msg = JSON.parse(str);
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('[Browser Console]', msg.params.args.map(a => a.value || a.description).join(' '));
        }
      });
    });
  });
}
test();
```

---

## 🔧 Systemd Service Administration

Systemd handles automatic service persistence across reboots.

### Service File (`/etc/systemd/system/antigravity-react-web.service`)

```ini
[Unit]
Description=Antigravity React Web Application Hub (Port 3333)
After=network.target antigravity-web.service

[Service]
Type=simple
User=antigravity
WorkingDirectory=/home/antigravity/GitHub/antigravity-hub
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

### Management Commands

```bash
# Reload unit files after editing
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart antigravity-react-web.service

# View status & recent logs
systemctl status antigravity-react-web.service --no-pager
```
