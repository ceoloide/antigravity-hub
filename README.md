# Antigravity Hub 🚀

**Antigravity Hub** is a standalone, web-based React application and Connect RPC proxy server extracted from the **Google Antigravity Desktop Application (v2.3.1)**. It provides a browser-accessible Web UI and proxy bridge to the local native `language_server` gRPC engine without requiring the Electron container runtime.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.3.1-indigo.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![Service](https://img.shields.io/badge/systemd-active-success.svg)

---

## 🌟 Key Features

- **Browser-Native React Web App**: Fully functional extracted frontend from Antigravity 2.3.1, decoupled from Electron.
- **Electron Bridge Polyfill**: Native browser polyfills for `window.nativeStorage` (via `localStorage`), `window.dialog`, `window.electronNative`, `window.electronUpdater`, and `AudioWorklet` handlers.
- **Dynamic Language Server Proxy**: Intelligent Node.js proxy server (`server.js`) that automatically discovers the active native `language_server` HTTPS port (`--https_server_port`) and session CSRF token (`--csrf_token`) upon boot or process restarts.
- **Connect RPC & gRPC-Web Compatibility**: Handles both unary RPC requests and continuous chunked streaming endpoints (`StreamAgentStateUpdates`, `JetboxSubscribeToState`, `ProjectUpdatesStream`) with socket keep-alives and zero-buffering response piping.
- **Tailscale & Remote Access Ready**: Bindable to all local interfaces (`0.0.0.0:3333`) for access across Tailscale VPNs, laptops, tablets, and smartphones.
- **Offline Symbol Icon Set**: Ships with 200+ native VS Code symbol icons (`/symbols-icons/*`) and dynamic fallback resolvers for offline file/folder tree rendering.
- **Systemd Integration**: Configured to start automatically on system boot via `antigravity-react-web.service`.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    Client["Browser / Mobile Device (Tailscale)"] -->|HTTP / Connect RPC (Port 3333)| Proxy["Antigravity Hub Node.js Server (server.js)"]
    
    subgraph Localhost VM 200
        Proxy -->|Static Assets| Frontend["React Frontend (main.js, compiled_tailwind.css)"]
        Proxy -->|Dynamic Process Scan| Discovery["Port & CSRF Token Auto-Discovery"]
        Discovery -.->|Discovers Active Port & Token| Proxy
        Proxy -->|HTTPS / TLS Bypass with x-codeium-csrf-token| LS["Native Language Server (https://127.0.0.1:<dynamic_port>)"]
    end
    
    LS -->|gRPC / AI Models| Gemini["Google Gemini / Cortex AI Models"]
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher.
- **Antigravity Engine**: Google Antigravity Desktop App installed locally (`/opt/antigravity/Antigravity-x64/resources/bin/language_server`).

### Installation & Execution

```bash
# 1. Clone the repository
git clone git@github.com:ceoloide/antigravity-hub.git
cd antigravity-hub

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Once running, navigate to:
- **Local Access**: `http://localhost:3333`
- **Tailscale Remote Access**: `http://100.80.254.38:3333`

---

## ⚙️ Systemd Service Configuration

Antigravity Hub is managed by systemd under `/etc/systemd/system/antigravity-react-web.service`:

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

### Useful Commands

```bash
# Check status
systemctl status antigravity-react-web.service

# Restart service
sudo systemctl restart antigravity-react-web.service

# View live logs
journalctl -u antigravity-react-web.service -f
```

---

## 📁 Repository Structure

```
antigravity-hub/
├── server.js              # Node.js HTTP & Connect RPC proxy server with dynamic port discovery
├── index.html             # React entry point with Electron API polyfills & font declarations
├── main.js                # Compiled React 18 frontend bundle (7.7 MB)
├── compiled_tailwind.css  # Production Tailwind CSS design system (164 KB)
├── jetbox.css             # Base layout stylesheet (134 KB)
├── prism_bundle.js        # Prism syntax highlighting bundle (126 KB)
├── audio_processor.js     # Web AudioWorklet processor module
├── diff_worker.js         # Web Worker for code diff computation
├── favicon.svg            # Official rainbow arc logo
├── icons_cache/           # Extracted native VS Code file & folder symbol icons
├── package.json           # Node project manifesto
├── README.md              # Project documentation
├── AGENTS.md              # Guidelines for AI coding agents
├── DEVELOPMENT.md         # Developer setup & debugging procedures
└── API.md                 # Connect RPC & Language Server protocol specification
```

---

## 📜 License

MIT License. Developed for use with Google Antigravity.
