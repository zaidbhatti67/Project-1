# Implementation Plan - Fully Functional System Settings, Layout Fixes & System Audit

This plan outlines the design and changes to resolve the collapsed spreadsheet view (caused by missing CSS styling for workspace grid layout classes) and fully implement the system settings panel.

## User Review Required

> [!IMPORTANT]
> **Layout Collapse Root Cause**: The class names `g-split-workspace`, `g-editor-canvas-column`, `g-side-dock`, and `g-side-panel` used in `App.jsx` are completely unstyled in `index.css`. As a result, the parent editor containers default to standard block elements with collapsed height, causing Luckysheet to render at `0px` height. We will add layout rules for these classes in `index.css`.
>
> **Database & User Profile schema constraints**: The Prisma database model `User` contains fields `name` and `email` but does not include `organization`. Therefore, `name` and `email` will be updated on the SQLite backend database, while the secondary `organization` preference will be persisted in `localStorage`. 
>
> **Background Autosave control**: Toggling off "Cloud Auto-save" disables all debounced background saves while typing in Docs, cell updates in Sheets, and object manipulations in Slides. Explicit saves (e.g. clicking the "← Dashboard" exit button) will continue to synchronize state to prevent accidental loss of draft data.

## Proposed Changes

---

### Layout & Theme System

#### [MODIFY] [index.css](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/index.css)
- **Add Layout Rules**:
  ```css
  .g-split-workspace {
    display: flex;
    flex-direction: row;
    width: 100%;
    overflow: hidden;
  }
  .g-editor-canvas-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
  .g-side-dock {
    width: 48px;
    background: var(--n-bg-canvas);
    border-left: 1px solid var(--n-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 0;
    gap: 12px;
    flex-shrink: 0;
    z-index: 10;
  }
  .g-side-panel {
    width: 300px;
    background: var(--n-bg-canvas);
    border-left: 1px solid var(--n-border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    z-index: 10;
    height: 100%;
    overflow: hidden;
  }
  .g-avatars-group {
    display: flex;
    align-items: center;
  }
  ```
- **Add Dark Theme Overrides**: Implement a CSS theme selector `[data-theme="dark"]` overriding variables:
  - `--n-bg-workspace`: Deep Slate-900 `#0f172a`
  - `--n-bg-canvas`: Deep Slate-800 `#1e293b`
  - `--n-border`: Dark Border `#334155`
  - `--n-border-hover`: Highlight border `#475569`
  - `--n-text-main`: Off-white `#f8fafc`
  - `--n-text-sub`: Slate-300 `#cbd5e1`
  - `--n-text-light`: Slate-500 `#64748b`
  - `--n-primary-light`: Indigo-950/900 `#1e1b4b`
  - `--n-primary-glow`: Semi-transparent indigo `#312e81`
- Add dark theme support rules for scrollbars, toolbars, modal boxes, and doc paper sheet (`[data-theme="dark"] .docs-paper-sheet` background `#1e293b`, text `#f8fafc`, borders `#334155`).

---

### Backend Components

#### [MODIFY] [server.js](file:///c:/Users/HP/Desktop/Zaid%20Project%202/server/server.js)
- Add a new route `PUT /api/auth/profile` to update user's profile details (`name` and `email`).
- Check if the email is already in use by another user; return error if so.
- Save the updated values to the SQLite database via Prisma.
- Issue and sign a new JWT token containing the updated details and return it to the client.

---

### Frontend Services

#### [MODIFY] [api.js](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/services/api.js)
- Implement an `updateProfile` API service method that sends a PUT request with the user's name and email to `/api/auth/profile`.

---

### Global Controller

#### [MODIFY] [App.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/App.jsx)
- Retrieve stored theme settings in a `useEffect` on mount:
  - If `localStorage.getItem('nexus_theme') === 'dark'`, apply the theme tag: `document.documentElement.setAttribute('data-theme', 'dark')`.
- Pass current user profile details (`currentUser` and `setCurrentUser`) as props to `<SettingsPanel />`.

---

### Settings UI Panel

#### [MODIFY] [SettingsPanel.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/SettingsPanel.jsx)
- Initialize state variables from `localStorage` values:
  - `autoSave`: `localStorage.getItem('nexus_autosave') !== 'false'`
  - `theme`: `localStorage.getItem('nexus_theme') || 'light'`
  - `zoom`: `localStorage.getItem('nexus_zoom') || '100'`
  - `userProfile`: Load `name` and `email` from the current logged-in user profile, and load `organization` from `localStorage.getItem('nexus_organization') || 'Faculty of Computer Science'`.
- Update `handleSaveSettings` to:
  - Persist `autoSave` value as string `true` or `false` to `localStorage.setItem('nexus_autosave', ...)`.
  - Save visual theme value in `localStorage.setItem('nexus_theme', ...)`.
  - Save default zoom ratio in `localStorage.setItem('nexus_zoom', ...)`.
  - Save the organization value locally in `localStorage.setItem('nexus_organization', ...)`.
  - Apply `document.documentElement.setAttribute('data-theme', theme)` immediately so the dark slate styling adapts in real-time.
  - Invoke `api.updateProfile(name, email)` to save the profile to the database backend.
  - Update `localStorage.setItem('nexus_token', result.token)` and `localStorage.setItem('nexus_user', JSON.stringify(result.user))`.
  - Call the `onUpdateUser(result.user)` prop callback to instantly update the header avatar initials.
  - Dismiss panel and trigger a success toast alert.

---

### Editors Autosave & Zoom Integration

#### [MODIFY] [DocsEditor.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/DocsEditor.jsx)
- Read `localStorage.getItem('nexus_autosave') !== 'false'` in debounced save hook. Skip automatic saves if disabled.
- Set initial `zoom` state by reading `parseInt(localStorage.getItem('nexus_zoom'), 10) || 100`.

#### [MODIFY] [SheetsEditor.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/SheetsEditor.jsx)
- Read `localStorage.getItem('nexus_autosave') !== 'false'` in Luckysheet `debouncedSave` callback. Skip automatic saves if disabled.

#### [MODIFY] [SlidesEditor.jsx](file:///c:/Users/HP/Desktop/Zaid%20Project%202/src/components/SlidesEditor.jsx)
- Read `localStorage.getItem('nexus_autosave') !== 'false'` in `saveSlideState` when triggered by canvas updates (object movement, text typing).

---

## Verification Plan

### Automated Tests
- Run full Vite production build to make sure code compiles without syntax, type, or lint errors:
  ```powershell
  npm.cmd run build
  ```

### Manual System Audit Walkthrough
We will run a complete validation audit of all components:
1. **Layout & Spreadsheet Rendering**:
   - Open a Spreadsheet file and verify that Luckysheet renders properly underneath the menu and toolbar.
2. **Settings Panel**:
   - Open settings, update name to "Zaid Auditor" and email to "auditor@university.edu". Click "Save changes". Check that header avatar initials change instantly to "ZA". Refresh to check persistence.
   - Switch visual theme to "Dark Slate". Check that the UI (dashboard, sidebar, toolbars, modal boxes, and Doc paper sheet) transforms to dark mode.
   - Disable "Cloud Auto-save". Open a document, type text. Verify no background saves are triggered. Close using "← Dashboard" and verify that immediate save triggers correctly to preserve data.
3. **Docs Editor**:
   - Check all 16 fonts, zoom ratios, checklist creation, line spacing, and paragraph indents.
4. **Sheets Editor**:
   - Change cells in Luckysheet, write basic formulas (e.g. `=SUM(A1:A3)`) and check results.
5. **Slides Editor**:
   - Create a slide, add shapes, reorder using Up/Down arrows, switch slides, check if elements persist on load.
