# Failure Cases & Security Audit: Nexus Collaborative Suite

This document registers the critical failure cases, design vulnerabilities, and security flaws identified within the Nexus Workspace codebase before remediation.

---

## 1. Authentication & Access Control (IDOR & WebSocket Bypasses)

### Case 1: Insecure Direct Object References (IDOR) on REST API
* **Vulnerability**: The server checks user authentication via the JWT token but **never validates authorization permissions** for file manipulation operations.
* **Failure Scenarios**:
  1. **Unauthorized Deletion**: Any logged-in user can delete any folder or file by sending a `DELETE /api/files/:id` or `DELETE /api/folders/:id` request containing the target ID.
  2. **Unauthorized Edits**: Any logged-in user can modify the content and name of any document, sheet, or slide by sending a `PUT /api/files/:id` request.
  3. **Unauthorized Reading**: Any logged-in user can query metadata, collaborator lists, comments, and action history for any file via `GET /api/files/:id`.

### Case 2: Unauthenticated WebSockets Collaboration Rooms
* **Vulnerability**: The Socket.io connection and room join handler (`join-room`) do not verify the collaborator's JWT token or check if the user is granted view/edit access.
* **Failure Scenarios**:
  * An anonymous user can connect via Socket.io and send simulated edit, cursor, selection, or drag events to any active workspace room, leading to page defacement or content disruption.

---

## 2. Concurrency & Data Synchronization Failures

### Case 3: Last-Write-Wins (LWW) Collisions
* **Vulnerability**: The backend does not run the Operational Transformation (OT) engine defined in `otEngine.js`. It performs a brute-force string/JSON replacement on the Prisma database entry.
* **Failure Scenarios**:
  * **Lost Edits**: If User A and User B edit the same paragraph at the same time, the server saves both full states in sequence. The latter update completely overwrites the former, wiping out one of the users' work entirely.

### Case 4: Reconnection & Offline Resync Gaps
* **Vulnerability**: The client does not sync state differences or lock editing when connection is lost.
* **Failure Scenarios**:
  * If a user loses connection, types offline, and reconnects, they push their outdated revision, overwriting all changes made by other online collaborators in the meantime.

---

## 3. Database Persistence & Scaling Issues

### Case 5: Ephemeral SQLite Disk on Cloud Container Restarts
* **Vulnerability**: The application relies on a local SQLite file database (`dev.db`).
* **Failure Scenarios**:
  * Free containers (on Zeabur, Render, or Hugging Face Spaces) restart or sleep on inactivity. When they reboot, the local SQLite database file is reset to empty, resulting in the permanent loss of all user accounts, directories, and files.

### Case 6: Concurrent Database Write Locks
* **Vulnerability**: SQLite locks the database file during write transactions.
* **Failure Scenarios**:
  * If multiple users are typing simultaneously, the frequent REST API `PUT` updates will clash, triggering `SQLITE_BUSY` errors and failing to save documents.

---

## 4. Input Validation & Denial of Service Vulnerabilities

### Case 7: Stored Cross-Site Scripting (XSS)
* **Vulnerability**: The rich text editor (TipTap) saves content as raw HTML strings, which are rendered raw on the client without sanitization.
* **Failure Scenarios**:
  * A user inserts a malicious script inside a shared document. When another user opens the document, the script runs in their session, potentially hijacking their authentication token.

### Case 8: CPU Exhaustion / Denial of Service (DoS) via Bcrypt Spam
* **Vulnerability**: The server does not rate limit authentication routes.
* **Failure Scenarios**:
  * An attacker can spam thousands of registration or login requests. Running the CPU-heavy `bcrypt.compare` and `bcrypt.hash` functions repeatedly will saturate CPU cores, causing a Denial of Service.
