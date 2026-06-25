# Resolved Failure Cases & Security Hardening: Nexus Suite

This document registers the successfully resolved failure cases and security improvements implemented in the Nexus Workspace Suite.

---

## 1. Authentication & Access Control (IDOR & WebSocket Bypasses)

### Resolved Case 1: Insecure Direct Object References (IDOR) on REST API
* **Resolution**: Added folder/file authorization checks in the Express REST endpoints:
  * **Ownership Check**: Before deleting files (`DELETE /api/files/:id`) or folders (`DELETE /api/folders/:id`), the server checks if the user is the original owner.
  * **View/Edit Check**: Before viewing (`GET /api/files/:id`), duplicating, or altering starring preferences, the server checks the `Permission` table to ensure the user is an owner, editor, or viewer.
  * **Edit/Owner Check**: Before editing (`PUT /api/files/:id`), the server validates that the user is either the owner or an editor.
  * **Result**: Any unauthorized attempts to read, write, or delete documents return a standard `403 Forbidden` status.

### Resolved Case 2: Authenticated WebSockets & Room Authorization
* **Resolution**: 
  * Configured Socket.io server-side handshake middleware to parse and verify the JWT auth token before accepting websocket connections.
  * Modified the client-side socket connection helper in `src/services/socket.js` to transmit the active JWT token via the `auth` configuration parameter.
  * Updated the backend `join-room` event listener to query the `Permission` database table, allowing connection only if the user is a registered collaborator.
  * **Result**: Anonymous users are blocked from listening to or sending workspace event edits.

---

## 2. Concurrency & Data Synchronization Fixes

### Resolved Case 3 & 4: Optimistic Concurrency Locking
* **Resolution**:
  * Implemented an **Optimistic Revision Check** in the file edit API endpoint (`PUT /api/files/:id`).
  * When a client saves edits, the server compares the incoming `revision` against the current database `revision`. If the database revision is higher (indicating another user saved first), the server rejects the update with a `409 Conflict` status and sends back the current database state.
  * The frontend catches the error and throws a "Save failed: Conflict" toast, prompting the user to refresh instead of silently overwriting.

---

## 3. Database Persistence & Scaling Upgrades

### Resolved Case 5 & 6: Unified Full-Stack Docker Deployment
* **Resolution**:
  * Bundled the Vite static assets to be served directly by the Express Node.js application (using a wildcard path fallback to `dist/index.html`).
  * Created a multi-stage `Dockerfile` making the entire project deployable as a single container on Hugging Face Spaces (using its free, card-less CPU tiers).
  * Enforced relative paths (`/api` and `/`) as defaults for production, ensuring zero-config deployments, while keeping Vite dev proxies active for local `npm run dev` routing.

---

## 4. Input Validation & Resilience Upgrades

### Resolved Case 8: CPU Exhaustion / DoS Protection via Rate Limiting
* **Resolution**:
  * Implemented an in-memory, IP-based authentication rate limiter for the `/api/auth/register` and `/api/auth/login` endpoints.
  * If a client IP submits more than 15 requests within 1 minute, the server rejects subsequent requests with a `429 Too Many Requests` error.
  * **Result**: Protects the server from CPU exhaustion attacks targeting high-work factor `bcrypt` hash algorithms.

### Resolved Case 10: Style-Based Defacement HTML Sanitizer
* **Resolution**:
  * Implemented a `sanitizeStyles(html)` parser helper inside the backend server.
  * During document save calls (`PUT /api/files/:id`), any raw HTML is scanned for `style` attributes. All dangerous positioning, sizing, or overlay properties (e.g. `position`, `z-index`, `top`, `display`) are stripped, whitelisting only safe design layout keys (`text-align`, `color`, `background-color`, `font-family`, `font-size`).
  * **Result**: Prevents collaborator HTML styled-based screen blackouts and visual defacements.

---

## 5. Directory Tree Authorization (IDOR) Fixes

### Resolved Case 9: Target Directory Ownership Verification
* **Resolution**:
  * Added active user verification when creating files (`POST /api/files`) or editing file locations (`PUT /api/files/:id` with `folderId`).
  * The server queries the database to ensure the target `folderId` is owned by `req.user.id` before creating or updating the records.
  * **Result**: Blocks users from injecting documents or subdirectories into other users' workspace folders.

---

## 6. Client Storage Quota Safeguards

### Resolved Case 11: safeStorage LocalStorage Exception Wrapping
* **Resolution**:
  * Created a client-side wrapper utility [storage.js](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/utils/storage.js) wrapping `localStorage.getItem`, `setItem`, and `removeItem` inside `try-catch` exception handling wrappers.
  * Replaced all direct `localStorage` accesses in the client files (`App.jsx`, `SettingsPanel.jsx`, `Login.jsx`, `Register.jsx`) with the `safeStorage` wrapper.
  * **Result**: Prevents the application client from failing or crashing when storage quotes are exhausted or denied by the browser.

---

## 7. Sheet Formula Cycle Defenses

### Resolved Case 12: Circular Reference Interception Hook
* **Resolution**:
  * Implemented circular formula detection helpers (`isCircularReference`, `isCellInRange`) in `SheetsEditor.jsx`.
  * Wired these validators into Luckysheet's `cellUpdateBefore` hook.
  * When a user inputs a formula (e.g. `=SUM(A1:A3)` inside cell `A2` or `A2 + 5`), the hook detects the self-referencing coordinate, halts the change (returning `false`), and displays a Toast alerting the user.
  * **Result**: Saves the browser thread from infinite formula calculation loop locks.
