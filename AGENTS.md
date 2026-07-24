# AGENTS.md — Antigravity Hub Agent Guidelines

This document provides explicit guidelines, rules, and operational boundaries for AI coding agents (such as Antigravity, AGY, or Codex) maintaining or enhancing the `antigravity-hub` codebase.

---

## 🛡️ Core Rules & Operational Boundaries

### 1. Dynamic Language Server Discovery Rule (CRITICAL)
- **NEVER hardcode fixed ports or static CSRF tokens** for the backend `language_server`.
- The native `language_server` binary launches with `--https_server_port 0` (random free port) and a newly generated `--csrf_token` UUID every time the Antigravity engine boots or restarts.
- All backend proxy calls in `server.js` MUST retrieve port and token parameters dynamically via `discoverLanguageServerConfig()`.
- Proxy requests in `server.js` MUST default `cachedConfig.useHttps = true` and handle `ECONNRESET` / `socket hang up` errors during protocol discovery to prevent backend proxy disconnects.

### 2. Electron Native Bridge Polyfill Integrity
- The frontend was extracted from Electron desktop 2.3.1. When modifying `index.html`, **do not remove or break `window.nativeStorage` or polyfilled bridge objects** (`window.electronNative`, `window.dialog`, `window.electronUpdater`).
- `window.nativeStorage` persists user preferences in `localStorage` under `antigravity_native_storage`.

### 3. Stream & Socket Preservation
- Streaming endpoints (`StreamAgentStateUpdates`, `JetboxSubscribeToState`, `ProjectUpdatesStream`, `SubscribeToSidecars`) must NEVER buffer request or response bodies.
- Always use `req.pipe(proxyReq)` and set headers:
  - `Cache-Control: no-cache, no-transform`
  - `X-Accel-Buffering: no`
  - `Connection: keep-alive`

### 4. No Destruction of Offline Assets
- Do not delete or purge `icons_cache/` or offline symbol icon fallback logic. Offline tailscale access relies on local asset resolution.

### 5. Git Commit & Continuous Integration Rule
- **Commit changes as you go**. Whenever a feature, fix, or optimization step is verified successfully via the verification pipeline, stage and commit the changes immediately before proceeding to subsequent tasks or declaring completion.

### 6. Mandatory Web Server Restart Rule
- **Always restart the systemd web service (`sudo systemctl restart antigravity-react-web.service`) whenever changes are made to `index.html`, `mobile-override.css`, `server.js`, or static assets** so that updates take effect immediately in the running browser session.

### 7. Non-Invasive Code Layering Invariant
- **Never modify extracted production bundles (`main.js`, `compiled_tailwind.css`, `jetbox.css`) directly.**
- Keep all CSS overrides isolated in `mobile-override.css` and runtime script polyfills in `index.html`. This guarantees upstream Antigravity version upgrades require zero code merges.

### 8. Capture-Phase Touch Interception Rule
- To disarm unwanted desktop touch-drag behaviors (such as tap-hold project card reordering during touch scrolling), add capture-phase `pointerdown` event listeners (`e.stopImmediatePropagation()`) in `index.html` targeting mobile touch devices (`pointerType === 'touch'`).

### 9. Radix UI Portal & Dropdown Layering Rule
- Floating Radix UI popovers, dropdown menus, and select dialogs appended to `document.body` MUST be styled with `z-index: 100005 !important`, `pointer-events: auto !important`, `visibility: visible !important`, and `opacity: 1 !important` in `mobile-override.css` so they float above full-viewport mobile sidebars (`z-index: 99950`).

---

## 🛠️ Verification & Testing Commands

Whenever modifying `server.js`, `index.html`, `mobile-override.css`, or configuration parameters, execute the following verification pipeline before declaring completion:

```bash
# 1. Verify Node proxy syntax & execution
node -c server.js

# 2. Restart systemd service
sudo systemctl restart antigravity-react-web.service

# 3. Check service status
systemctl status antigravity-react-web.service --no-pager

# 4. Test Root Route Response
curl -s -I http://localhost:3333/

# 5. Test Connect RPC Proxied Endpoint
curl -s -X POST -H "Content-Type: application/json" -d "{}" http://localhost:3333/exa.language_server_pb.LanguageServerService/GetLocalUserInfo

# 6. Verify Symbol Icons Proxy
curl -s -I http://localhost:3333/symbols-icons/icons/files/python.svg
```

---

## 📁 Key File Index

- **`server.js`**: Node.js HTTP server & Connect RPC proxy. Handles TLS bypass (`rejectUnauthorized: false`), dynamic port/CSRF discovery, static asset resolution, and symbol icon caching.
- **`index.html`**: SPA entry point containing `window.__APP_CONFIG__`, native Electron API polyfills, Material Symbols font stylesheets, and viewport declarations.
- **`main.js`**: Extracted React 18 production bundle compiled from Antigravity 2.3.1.
- **`compiled_tailwind.css`**: Design system utilities and custom Tailwind CSS classes.
- **`jetbox.css`**: Core IDE layout styling.
