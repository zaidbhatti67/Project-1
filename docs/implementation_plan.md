# Implementation Plan - Resolving Security & Concurrency Failure Cases & Dashboard Cleanup

This plan details the changes to resolve the critical failure cases and security vulnerabilities in the Nexus Workspace Suite, as well as the cleanup of the dashboard metrics bar.

## User Review Required

> [!IMPORTANT]
> **Dashboard UI Modification**:
> - We will **remove the entire Quick Metrics stats counter row** (`.n-stats-bar`) displaying Total Workspaces, Starred Files, and Directories from the Dashboard component.

---

## Proposed Changes

### Backend Security, Authentication & Rate Limiting

#### [MODIFY] [server.js](file:///c:/Users/HP/Desktop/Zaid%20Project%202/server/server.js)
- **Environment Variables**: Use `process.env.JWT_SECRET` instead of the hardcoded secret, with the old secret as a development fallback.
- **Rate-Limiting Middleware**: Implement an in-memory IP-based rate limiter for `/api/auth/register` and `/api/auth/login` (allowing max 15 requests per minute).
- **Authorization Helper**: Implement a database check helper `checkFilePermission(fileId, userId, allowedRoles)` to check if a user is an owner, editor, or viewer of the given file.
- **REST Endpoints Authorization**:
  - `GET /api/files/:id`: Deny access if user has no view/edit role in permissions.
  - `PUT /api/files/:id`: Deny access if user has no edit/owner role. Also, implement **optimistic locking**: reject the update with a `409 Conflict` if the incoming `revision` is less than the database `revision`.
  - `DELETE /api/files/:id`: Deny access if user is not the file owner.
  - `POST /api/files/:id/permissions` (sharing): Deny access if user is not the file owner.
  - `GET/POST /api/files/:id/comments`: Deny access if user has no view/edit permission.
  - `DELETE /api/folders/:id`: Validate that the folder belongs to the logged-in user before deleting.
- **Socket.io Authentication Middleware**:
  - Verify the JWT handshake token before establishing connection.
  - On `join-room`, query the database to verify the user has access to that `fileId` room before allowing `socket.join`.

---

### Dashboard UI Cleanup

#### [MODIFY] [Dashboard.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/Dashboard.jsx)
- Remove the entire `.n-stats-bar` Quick Metrics div (lines 345–359) to clean up the workspace presentation view.

---

### Client Socket Authentication

#### [MODIFY] [socket.js](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/services/socket.js)
- Update `connectSocket` to pass the local storage JWT token in the Socket.io `auth` handshake configuration:
  ```javascript
  const token = localStorage.getItem('nexus_token');
  socket = io(SOCKET_URL, { auth: { token } });
  ```

---

### Documentation of Resolutions

#### [NEW] [resolved_cases.md](file:///c:/Users/HP/Desktop/Zaid%20Project%202/docs/resolved_cases.md)
- Create a markdown document inside the `docs/` directory detailing how each failure case was successfully resolved.

---

## Verification Plan

### Automated Verification
- Verify the Vite compilation runs without errors:
  ```powershell
  npm.cmd run build
  ```

### Manual Verification
1. **Dashboard Check**: Load the dashboard. Verify that the stats bar (Total Workspaces, Starred Files, Directories) is completely removed and the layout adjusts cleanly.
2. **Rate Limiting**: Attempt to hit the registration endpoint rapidly 15+ times. Verify that a `429 Too Many Requests` error is returned.
3. **Access Control (IDOR)**:
   - Create two accounts (User A and User B).
   - Get the UUID of User A's private document.
   - Using User B's token, attempt to edit (`PUT /api/files/:id`) or delete (`DELETE /api/files/:id`) User A's file. Verify the server returns `403 Forbidden`.
4. **WebSockets Protection**:
   - Attempt to connect an anonymous Socket.io client to a private file room. Verify that connection is rejected.
5. **Optimistic Locking**:
   - Manually trigger two quick edits with identical revisions. Verify that the second edit returns a `409 Conflict` and throws a "Save failed" toast in the UI.
