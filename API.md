# API.md — Connect RPC Protocol & Language Server API Specification

This document details the **Connect RPC / gRPC-Web API protocol** exposed by the local native `language_server` binary and proxied by **Antigravity Hub**.

---

## 📡 Protocol Overview

The `language_server` communicates using the **Connect RPC protocol** over HTTP/1.1 and HTTP/2 with JSON payloads. 

- **Base Service Path**: `/exa.language_server_pb.LanguageServerService/<MethodName>`
- **HTTP Method**: `POST`
- **Content-Type**: `application/json` (or `application/connect+json`)
- **Required Header**: `x-codeium-csrf-token: <session_csrf_token>`

All RPC requests issued by the frontend web client to `http://localhost:3333/exa.language_server_pb...` are automatically intercepted by `server.js`, injected with the active session token, and proxied to `https://127.0.0.1:<dynamic_ls_port>`.

---

## 🔑 Authentication & Headers

```http
POST /exa.language_server_pb.LanguageServerService/GetLocalUserInfo HTTP/1.1
Host: 127.0.0.1:46371
Content-Type: application/json
Connect-Protocol-Version: 1
x-codeium-csrf-token: <DYNAMIC_CSRF_TOKEN>
Origin: https://127.0.0.1:46371
```

---

## 📋 Core Unary RPC Methods

### 1. `GetLocalUserInfo`
Retrieves local system user account details and home directory URI.

- **Request Payload**: `{}`
- **Response**:
```json
{
  "username": "antigravity",
  "homeDirUri": "file:///home/antigravity"
}
```

---

### 2. `GetMendelFlags`
Fetches active feature flags and experiment toggles.

- **Request Payload**: `{}`
- **Response**:
```json
{
  "flags": {
    "enable_projects": true,
    "enable_sidecars": true,
    "enable_browser_tools": true
  }
}
```

---

### 3. `GetCascadeNuxes`
Retrieves active onboarding dialogs, NUX announcements, and model feature tips.

- **Request Payload**: `{}`
- **Response**:
```json
{
  "nuxes": [
    {
      "uid": 23,
      "location": "CASCADE_NUX_LOCATION_ALWAYS_MOUNTED",
      "trigger": "CASCADE_NUX_TRIGGER_MANAGER_PROJECT_CREATED",
      "priority": 100,
      "title": "Getting started with a Project",
      "body": "Now that you've created a project, configure your agent settings or start a conversation."
    }
  ]
}
```

---

### 4. `GetAllWorkflows`
Discovers registered custom agent workflows and slash command specs for a given workspace URI.

- **Request Payload**:
```json
{
  "workspaceUris": ["file:///home/antigravity/Documents/antigravity/vibrant-salk"]
}
```
- **Response**:
```json
{
  "workflows": [
    {
      "$typeName": "exa.cortex_pb.WorkflowSpec",
      "name": "btw",
      "description": "Ask a quick question without interrupting the main conversation.",
      "path": "btw"
    }
  ]
}
```

---

### 5. `StartCascade`
Initializes a new agent trajectory session (conversation).

- **Request Payload**:
```json
{
  "workspaceUris": ["file:///home/antigravity/Documents/antigravity/vibrant-salk"],
  "cortexTrajectorySource": "CORTEX_TRAJECTORY_SOURCE_USER"
}
```

---

### 6. `SendUserCascadeMessage`
Sends a user message or prompt to an active trajectory conversation.

- **Request Payload**:
```json
{
  "cascadeId": "2de71434-73c8-4d3b-a5a0-c9b697892716",
  "items": [
    {
      "text": "Explain how server.js handles dynamic port discovery."
    }
  ]
}
```

---

## 🌊 Core Streaming RPC Methods

Streaming RPC endpoints maintain chunked HTTP POST connections open indefinitely to deliver real-time agent updates.

| Endpoint | Description |
| :--- | :--- |
| **`StreamAgentStateUpdates`** | Streams real-time step execution events, code diffs, and tool status outputs |
| **`JetboxSubscribeToState`** | Subscribes to global application state updates |
| **`JetboxSubscribeToSummaries`** | Subscribes to trajectory summary updates across conversations |
| **`ProjectUpdatesStream`** | Streams project list and environment status updates |
| **`SubscribeToSidecars`** | Streams events from active background sidecar processes |

### Streaming Proxy Rules (`server.js`)
- Response headers set: `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, `Connection: keep-alive`.
- Socket timeout disabled: `socket.setTimeout(0)`.
- Client requests piped directly using `req.pipe(proxyReq)` without body buffering.
