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
