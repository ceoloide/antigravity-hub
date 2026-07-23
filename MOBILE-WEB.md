# Antigravity Hub — Mobile Web Optimization & Analysis (v2.3.1)

## Executive Summary

This document presents the GUI and CSS analysis for **Antigravity Hub (v2.3.1)**, an extracted desktop React web application. The primary goal is to make the application mobile-friendly on smartphones and tablets while strictly preserving the desktop layout, minimizing code changes, and avoiding future merge conflicts when upstream Electron app updates are applied.

---

## 🔍 GUI & CSS Analysis Findings

### 1. The Bottom Prompt Box Clipping Issue
* **Root Cause**: The top-level containers (`#root` and the primary app frame in `main.js`) use `height: 100vh` (`.h-screen` / `.h-[100vh]`). In mobile browsers (iOS Safari and Android Chrome), `100vh` calculates height based on the maximum screen height *excluding* browser address bars and bottom navigation bars. As a result, the bottom-pinned prompt box (`#antigravity.agentSidePanelInputBox`, `.sticky.bottom-0`) is pushed 44px–60px off-screen or submerged beneath mobile browser controls and virtual keyboards.
* **Textarea Auto-Zoom**: On iOS Safari, text inputs with font sizes smaller than 16px cause the browser to force-zoom into the page, breaking layout bounds.

### 2. The Top Header & Breadcrumb Clipping Issue
* **Root Cause**: Fixed and sticky headers (`.sticky.top-0`, `z-10`) lack safe-area padding (`env(safe-area-inset-top)`). On devices with notches or camera cutouts, top controls (breadcrumbs, left/right sidebar toggles) overlap with device status bars.
* **Truncation & Touch Targets**: Breadcrumb elements truncate text without horizontal touch scrolling. Sidebar toggle buttons and collapse icons use 28px (`h-7`) or 32px (`h-8`) sizes, which fall below touch accessibility standards (minimum 38px–44px).

---

## 🏗️ Non-Invasive CSS Override Architecture

To ensure future updates to the extracted React bundle (`main.js` and `compiled_tailwind.css`) do not overwrite mobile adjustments:
* **No modifications were made to `compiled_tailwind.css`, `jetbox.css`, or `main.js`**.
* All mobile layout fixes, safe-area inset rules, dynamic viewport overrides, and touch target expansions are isolated in a standalone stylesheet: **`mobile-override.css`**.
* `index.html` includes `<link rel="stylesheet" href="/mobile-override.css" />` *after* `compiled_tailwind.css`, allowing `mobile-override.css` to override upstream utility classes cleanly via standard CSS specificity and media queries.

---

## 🛠️ Summary of Implemented Changes

### 1. Project Versioning Manifest (`index.json`)
Created `/home/antigravity/GitHub/antigravity-hub/index.json` to formally document the extracted application version:
```json
{
  "name": "antigravity-hub",
  "version": "2.3.1",
  "description": "Extracted React Web App and Connect RPC Proxy Server for Google Antigravity Desktop 2.3.1",
  "customCss": "mobile-override.css",
  "lastUpdated": "2026-07-23"
}
```

### 2. Standalone Override Stylesheet (`mobile-override.css`)
Key rules implemented:
* **Dynamic Viewport Height (`100dvh`)**: Replaces rigid `100vh` with `100dvh` (dynamic viewport height), automatically resizing the workspace when mobile address bars expand or collapse.
* **Safe-Area Insets**: Utilizes `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for iOS notches and Android home bars.
* **Bottom Prompt Box Pinning**: `#antigravity.agentSidePanelInputBox` and `.sticky.bottom-0` receive bottom padding (`calc(var(--safe-bottom) + 8px)`) and explicit background fill.
* **Input Textarea Font Size**: Set to `16px` on mobile screens to prevent iOS Safari auto-zoom.
* **Touch Target Expansion**: Header toggle buttons (`button[aria-label*="Toggle"]`, `button[class*="size-icon"]`) scaled to a minimum touch footprint of 38px × 38px.
* **Horizontal Breadcrumb Scrolling**: `div[class*="breadcrumb"]` styled with `overflow-x: auto` and touch momentum scrolling (`-webkit-overflow-scrolling: touch`).
* **Mutual Exclusion for Sidebar Toggles**: When either the left or right sidebar is open on mobile, CSS `:has()` rules automatically hide the opposite toggle button (`display: none !important`), preventing UI clutter and button overlap.
* **Dropdown Modals & Filter Menus (`z-index: 100005`)**: Project filter menus (`div[class*="origin-top-left"]`), Radix popovers, and dropdown dialogs are assigned `z-index: 100005 !important` so they float above the sidebars when clicked.
* **Touch Scroll vs Drag-and-Drop Fix**: Disarms tap-hold project card drag reordering on mobile touchscreens via capture-phase pointer interceptors in `index.html` and `touch-action: pan-y !important` rules, allowing smooth vertical list scrolling.

### 3. Viewport Declaration (`index.html`)
Updated the viewport tag in `index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<link rel="stylesheet" href="/mobile-override.css" />
```

---

## 🧪 Verification & Maintenance Protocol

1. **Syntax & Proxy Verification**:
   ```bash
   node -c server.js
   sudo systemctl restart antigravity-react-web.service
   systemctl status antigravity-react-web.service --no-pager
   curl -s -I http://localhost:3333/
   ```
2. **Upstream Updating**: When upgrading to future versions of Antigravity Desktop, replace `main.js` and `compiled_tailwind.css`. `mobile-override.css` will continue to apply mobile viewport, safe-area, and touch fixes seamlessly.
