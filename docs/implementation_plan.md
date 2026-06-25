# Implementation Plan - Resolving Failure Cases Batch 2

This plan details the implementation of security and stability improvements for the second batch of system failure cases:
1. **Directory Tree IDOR Checks**: Validating folder ownership before file creations or movements.
2. **Visual Style Sanitization**: Restricting raw HTML style injection defacement.
3. **Safe Storage Wrapper**: Wrapping `localStorage` writes and reads to prevent crashes on disk exhaustion.
4. **Spreadsheet Circular Reference Block**: Catching circular formula references in Luckysheet before they freeze the main UI thread.

## Proposed Changes

---

### Backend Security & Sanitization

#### [MODIFY] [server.js](file:///c:/Users/HP/Desktop/Zaid%20Project%202/server/server.js)
- **Folder IDOR Validation**:
  - In `POST /api/files` and `PUT /api/files/:id`, if `folderId` is provided in the request payload, verify the folder exists and is owned by `req.user.id` before creating or updating the file record.
- **Style Sanitizer**:
  - Implement a `sanitizeStyles(html)` helper function to strip out dangerous CSS properties (e.g. `position`, `z-index`, `top`, `display`) from document content strings, permitting only safe design attributes (`text-align`, `color`, `background-color`, `font-family`, `font-size`).
  - Run this sanitizer in `PUT /api/files/:id` when the file type is `'docs'`.

---

### Client Safe LocalStorage Wrapper

#### [NEW] [storage.js](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/utils/storage.js)
- Create a utility file exporting `safeStorage` with `getItem`, `setItem`, and `removeItem` wrapped in `try-catch` blocks to prevent browser quota exhaustion crashes.

#### [MODIFY] [App.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/App.jsx)
#### [MODIFY] [SettingsPanel.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/SettingsPanel.jsx)
#### [MODIFY] [Login.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/auth/Login.jsx)
#### [MODIFY] [Register.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/auth/Register.jsx)
- Import `safeStorage` and replace direct `localStorage` accesses to protect token and preference operations.

---

### Spreadsheet Circular Reference Prevention

#### [MODIFY] [SheetsEditor.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/SheetsEditor.jsx)
- Implement `isCellInRange(cell, start, end)` and `isCircularReference(formula, cellId)` helpers.
- Register the `cellUpdateBefore` hook in `window.luckysheet.create()`:
  - Intercept formulas starting with `=`.
  - Validate that the formula does not reference the target cell directly or fall inside a range reference containing the cell coordinate.
  - If a circular reference is caught, display an error Toast and return `false` to abort the change, saving the browser thread from locking up.

---

### Documentation of Resolutions

#### [MODIFY] [resolved_cases.md](file:///c:/Users/HP/Desktop/Zaid%20Project%202/docs/resolved_cases.md)
- Append details of these new resolutions to the documentation.

---

## Verification Plan

### Automated Verification
- Verify that Vite compiled production files build cleanly:
  ```powershell
  npm run build
  ```

### Manual Verification
1. **Folder IDOR**: Attempt to create a file inside another user's folder UUID using a POST request. Verify it returns `403 Forbidden`.
2. **Style Defacement**: Save a document containing `<p style="position:fixed; z-index:9999; background:black;">Text</p>`. Load the document, verify the dangerous inline styles are stripped and the page doesn't black out.
3. **Circular Reference**:
   - Open a spreadsheet and edit cell `A2`.
   - Input `=SUM(A1:A3)` and hit enter.
   - Verify that the cell update is blocked, the value reverts, and a "Circular reference detected in cell A2!" toast displays.
