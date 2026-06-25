# Design Specification - Nexus Collaborative Suite (PSP Methodology)

This document contains the project brief, thinking process, and the formal **Personal Software Process (PSP)** design specification templates for the Nexus Collaborative Suite.

---

## Part 1: Project Brief & Thinking Process

### 1.1 Chat Brief
The objective of this project is to design and develop **Nexus Collaborative Suite**, a high-fidelity cloud productivity clone of Google Docs, Sheets, and Slides.
To make this suitable for a university project, we are:
1. Modeling the application utilizing Watts Humphrey's **PSP Design Templates** (OST, FST, SST, LST) to ensure complete structural and behavioral coverage.
2. Generating comprehensive UML diagrams to model external dynamic, external static, internal dynamic, and internal static behaviors.
3. Implementing a fully client-side **Collaboration Simulator** and **Operational Transformation (OT) Log Engine** that visually demonstrates concurrent conflict resolution in real-time.

### 1.2 Thinking Process & Architectural Rationale
- **Frontend Framework**: We choose **React** with a **Vite** build system. React’s declarative state matches the dynamic nature of collaborative editors, where typing or editing dynamically updates multi-user cursors, comments, cell outputs, and slide canvases.
- **Styling Architecture**: A custom **Vanilla CSS** design system. We avoid bloated frameworks to focus on visual excellence—implementing modern glassmorphic surfaces, dark-mode elements, high contrast grid selectors, and fluid CSS transitions.
- **Real-Time Collaboration Mocking**: Setting up socket servers, Redis instances, and databases is tedious for users to run locally. To resolve this, we build a **Virtual Network Channel** in the frontend. It runs background workers that simulate active editors (e.g., Alice, Charlie) typing, selecting cells, and modifying elements. 
- **Operational Transformation (OT) Design**: True collaboration relies on resolving edits like:
  - **Insertion conflicts**: User A and User B type at the same index simultaneously.
  - **Spreadsheet edit conflicts**: User A updates A1, while User B deletes row 1.
  The simulator logs these conflict scenarios and displays the transformed operations in a visual console, showing how the system maintains eventual consistency.
- **Spreadsheet Formula Engine**: Built as a tokenizing parser that recursively resolves cell dependencies, supports range definitions (e.g. `A1:B3`), and dynamically updates values when dependencies change.

---

## Part 2: Design Specification Templates

### 2.1 Operational Specification Template (OST) - External Dynamic
The OST documents the external-dynamic characteristics of the system by describing user-system interaction scenarios, principal user actions, system responses, and error conditions.

*   **Objective**: Model the collaborative user experience during concurrent document writing and spreadsheet edits.
*   **System Actors**: User (Local Client), Collaborative Bot (Remote Peer), Sync Manager.

| Step | Actor | User Action / Event | System Response / Output | Error / Recovery Conditions |
| :--- | :--- | :--- | :--- | :--- |
| **1** | User | Clicks "+ New" -> "New Document" on Dashboard. | Launcher initializes a new Document instance. Renders TipTap rich text page layout with empty text and cursor focused. | Network failure: Launches editor in "Offline Mode" (read-only / local edits buffered). |
| **2** | User | Types text: *"Developing a collaborative suite."* | TipTap inserts characters in local editor, updates selection, and schedules synchronization. | None. |
| **3** | Peer | Peer types *"university "* at character index 13. | Peer cursor moves to index 13. Peer types characters. Local TipTap Sync Manager receives operation, transforms indices, and merges content seamlessly. | Typing clash: If peer and local user type at the exact same index, OT engine transforms Peer's index forward by local length. |
| **4** | User | Enters `=SUM(A1:A3)` in spreadsheet cell B1. | Luckysheet internal formula engine records formula, evaluates the expression, and displays computed value in B1. | Syntax error: Displays `#ERROR!` in cell B1. Circular dependency: Displays `#REF!` in cell B1. |
| **5** | User | Clicks "Present" in Slides editor. | Slides editor hides workspace toolbar, slides container goes fullscreen, enters slide presentation state, and listens for key inputs. | Exit command: Esc key exits presentation mode and returns to Slide editor view. |

---

## 2.2 Functional Specification Template (FST) - External Static
The FST documents the structural specifications of the classes and components including interfaces, methods, parameter signatures, and exceptions.

### Class: `DocsEditor` (TipTap Rich Text Component)
*   **Attributes**:
    *   `doc`: `Object` (Document state from database containing ID, name, content)
    *   `onSave`: `Function(id: String, content: String, type: String)` (Autosave callback)
    *   `editor`: `Editor` (Active TipTap/ProseMirror editor controller instance)
*   **Methods**:
    *   `useEditor(config: Object) : Editor`
        *   **Description**: React hook initializing TipTap StarterKit with Table, Link, Image, TextAlign, and Underline extensions.
    *   `extractOutline() : Array[Heading]`
        *   **Description**: Traverses the document node tree to extract H1, H2, H3 headings for the navigation outline.
    *   `handleTextSelection(range: Range) : Void`
        *   **Description**: Listens to text highlights to display comment anchors and formatting highlights.

### Class: `SheetsEditor` (Luckysheet Component)
*   **Attributes**:
    *   `doc`: `Object` (Document state containing ID, name, workbook JSON content)
    *   `onSave`: `Function(id: String, sheetsData: Array, type: String)` (Autosave callback)
    *   `isReady`: `Boolean` (State guard checking if workbook has fully loaded in DOM)
*   **Methods**:
    *   `cellMapToLuckysheet(cellMap: Object) : Array[Sheet]`
        *   **Description**: Bidirectional adapter translating old cell-map formats into Luckysheet sheets.
    *   `luckysheetToCellMap(sheets: Array) : Object`
        *   **Description**: Reverse adapter converting Luckysheet sheet grid data back to cell-map formats.
    *   `debouncedSave() : Void`
        *   **Description**: Debounces sheet updates by 1 second before invoking `onSave` to save full sheet JSON.
    *   `workbookCreateAfter() : Void`
        *   **Description**: Hook callback that marks `isReady = true` when Luckysheet completes DOM creation.

### Class: `SlidesEditor` (Fabric.js Canvas Component)
*   **Attributes**:
    *   `doc`: `Object` (Slide document state containing slides array)
    *   `onSave`: `Function(id: String, slidesData: Array)` (Autosave callback)
    *   `fabricCanvas`: `Ref[fabric.Canvas]` (Persistent reference to the Fabric canvas wrapper)
    *   `isPresenting`: `Boolean` (Presentation mode state flag)
*   **Methods**:
    *   `addShape(type: String) : Void`
        *   **Description**: Injects a vector shape (rect, circle, triangle) or textbox into the active slide coordinate frame.
    *   `groupObjects() : Void`
        *   **Description**: Packages highlighted vector elements into a single `fabric.Group`.
    *   `changeLayer(direction: String) : Void`
        *   **Description**: Updates object stack order using `bringToFront()` or `sendToBack()`.
    *   `debouncedSave() : Void`
        *   **Description**: Serializes active canvas elements using `.toJSON()` and commits to database.

---

## 2.3 State Specification Template (SST) - Internal Dynamic
The SST documents the internal-dynamic behavior of the system, representing state variables, states, transitions, events, conditions, and resulting actions.

*   **State Variables**:
    *   `clientRevision`: Current local sync revision index.
    *   `bufferEmpty`: Boolean indicating whether local operations are awaiting acknowledgement.
    *   `syncStatus`: Enum [`CONNECTED`, `AWAITING_ACK`, `OFFLINE`].
    *   `isReady`: Boolean state variable indicating whether the Luckysheet/Fabric canvas engine has fully mounted and is ready for sync updates.
    *   `isPresenting`: Boolean state variable indicating whether Slides presentation overlay is active.

### State Action Table

| Current State | Event / Input | Condition | Action | Next State |
| :--- | :--- | :--- | :--- | :--- |
| **Connected_Idle** | Local Edit | `bufferEmpty == true` | Generate Operation `Op`; Apply `Op` locally; Send `Op` to server; Start ack timer. | **Awaiting_Ack** |
| **Connected_Idle** | Local Edit | `bufferEmpty == false` | Add `Op` to local buffer; Apply `Op` locally. | **Connected_Idle** |
| **Connected_Idle** | Remote Op Received | `Op.revision == clientRevision` | Apply `Op` locally; Increment `clientRevision`. | **Connected_Idle** |
| **Awaiting_Ack** | Server Ack Received | `bufferEmpty == true` | Clear wait buffer; Clear ack timer; Increment `clientRevision`. | **Connected_Idle** |
| **Awaiting_Ack** | Remote Op Received | `Op.revision < serverRevision` | Run Operational Transformation `OT(localBuffer, Op)`; Apply transformed remote op locally; Adjust indices in local buffer. | **Awaiting_Ack** |
| **Awaiting_Ack** | Timeout / Connection Lost | Ack timer expires | Set state to offline; Log network failure. | **Offline_Mode** |
| **Offline_Mode** | Network Restored | Network flag active | Send all buffered operations as a bulk sync payload. | **Resolving_Bulk** |
| **Initializing_Workbook**| `workbookCreateAfter` hook fires | None | Set `isReady = true`; Apply queued simulated edits. | **Workbook_Ready** |
| **Workbook_Ready** | Component Unmount | None | Clear container innerHTML; Set `isReady = false`. | **Disconnected** |
| **Workbook_Ready** | Cell Updated hook | `isReady == true` | Trigger `debouncedSave` (1s delay). | **Workbook_Ready** |
| **Workbook_Ready** | Cell Updated hook | `isReady == false`| Ignore event to avoid initialization loop. | **Workbook_Ready** |
| **Slideshow_Idle** | Press "Present" | None | Set `isPresenting = true`; Mount fullscreen slideshow viewport. | **Presenting** |
| **Presenting** | Press "Esc" | None | Set `isPresenting = false`; Exit fullscreen viewport; Enable slide editor. | **Slideshow_Idle** |

---

## 2.4 Logic Specification Template (LST) - Internal Static
The LST documents the internal-static logic of critical procedures, utilizing pseudocode and logic verification details.

### Algorithm 1: Operational Transformation (OT) Text Merge (`transformText`)
*   **Objective**: Given a local insertion and a remote concurrent insertion, transform the indices so both clients arrive at identical document text.
*   **Pseudocode**:
```text
FUNCTION transformText(localOp, remoteOp):
    // An operation has format: { type: "insert"|"delete", index: Integer, text: String }
    IF localOp.type == "insert" AND remoteOp.type == "insert" THEN
        IF localOp.index < remoteOp.index THEN
            // Local op was earlier. Shift remote op index by length of local text
            remoteOp.transformedIndex = remoteOp.index + length(localOp.text)
            localOp.transformedIndex = localOp.index
        ELSE IF localOp.index > remoteOp.index THEN
            // Remote op was earlier. Shift local op index by length of remote text
            localOp.transformedIndex = localOp.index + length(remoteOp.text)
            remoteOp.transformedIndex = remoteOp.index
        ELSE
            // TIE-BREAKER: Resolve index collision using Client ID comparison
            IF localOp.clientId < remoteOp.clientId THEN
                remoteOp.transformedIndex = remoteOp.index + length(localOp.text)
                localOp.transformedIndex = localOp.index
            ELSE
                localOp.transformedIndex = localOp.index + length(remoteOp.text)
                remoteOp.transformedIndex = remoteOp.index
            ENDIF
        ENDIF
    ENDIF
    RETURN [localOp, remoteOp]
```
*   **Verification (Loop Invariant & Correctness)**:
    - **Pre-condition**: Both clients A and B start with identical text string `S`, at revision `R`.
    - **Action**: A inserts text `T_A` at index `I`. B inserts text `T_B` at index `I`.
    - **Execution**:
      - Client A sends `{type: "insert", index: I, text: T_A, clientId: "A"}`.
      - Client B sends `{type: "insert", index: I, text: T_B, clientId: "B"}`.
      - Assuming ASCII order: `"A" < "B"`.
      - On transformation: Client A (Client ID "A") has priority.
      - Client B's operation transformed index becomes `I + length(T_A)`.
      - Client A's operation transformed index remains `I`.
    - **Post-condition**: Both client editors apply the operations to resolve to text: `S[0...I] + T_A + T_B + S[I...]`. Eventual consistency is maintained.

### Algorithm 2: Cell-Map to Luckysheet Converter (`cellMapToLuckysheet`)
*   **Objective**: Convert database cellular mappings (compatible with legacy storage schemas) to Luckysheet's 2D grid structure representation.
*   **Pseudocode**:
```text
FUNCTION cellMapToLuckysheet(cellMap):
    celldata = []
    
    FOR EACH [cellId, cellObj] IN entries(cellMap):
        idx = cellToIndices(cellId)
        IF idx IS NOT NULL THEN
            rawValue = cellObj.rawValue OR cellObj.value OR ""
            cellDataValue = {
                ct: { fa: "@", t: "g" }
            }
            
            IF rawValue STARTS WITH "=" THEN
                cellDataValue.f = rawValue
                cellDataValue.v = ""
            ELSE
                cellDataValue.v = rawValue
                cellDataValue.m = rawValue
            ENDIF
            
            celldata.push({
                r: idx.row,
                c: idx.col,
                v: cellDataValue
            })
        ENDIF
    ENDFOR
    
    RETURN [
        {
            name: "Sheet1",
            status: 1,
            order: 0,
            column: 18,
            row: 50,
            celldata: celldata,
            defaultRowHeight: 20,
            defaultColWidth: 90
        }
    ]
```

### Algorithm 3: Container Unmount Cleanup (Luckysheet Memory Leak & Crash Fix)
*   **Objective**: Clean up container nodes safely during React component unmounts without throwing fatal runtime errors due to Luckysheet's lack of a native `.destroy()` API.
*   **Pseudocode / Implementation Details**:
```javascript
useEffect(() => {
    // Initialization block...
    window.luckysheet.create({
        container: "luckysheet-container",
        // ...
        hook: {
            workbookCreateAfter: () => setIsReady(true)
        }
    });

    return () => {
        // DO NOT call window.luckysheet.destroy() as it throws undefined exceptions
        // and crashes React's state lifecycle. Instead, wipe the DOM container.
        const container = document.getElementById("luckysheet-container");
        if (container) {
            container.innerHTML = ""; // Hard purge child elements
        }
    };
}, [doc.id]);
```
*   **Verification**:
    - Ensures that when a user switches between Sheets and Documents, React does not attempt to execute non-existent destructor methods inside Luckysheet, thereby keeping the JS thread running smoothly.

