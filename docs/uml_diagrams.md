# UML Diagrams - Nexus Collaborative Suite

This document presents the UML diagrams for the **Nexus Collaborative Suite**, modeled using Mermaid.js. These diagrams represent the external behavior, internal structure, dynamic interaction, and lifecycle states of the collaborative system.

---

## 1. Use Case Diagram (External Dynamics)

The Use Case diagram shows the interactions between the primary **User**, the **Collaborative Peer** (simulated or remote user), the **Collaboration Server** (sync engine), and the system boundary.

```mermaid
rect User
    U["User"]
end
rect Remote
    R["Collaborative Peer (Sync Server)"]
end

subgraph Nexus Suite Boundary
    UC1("Manage Workspaces (Docs/Sheets/Slides)")
    UC2("Edit Document (Rich Text & Comments)")
    UC3("Edit Sheet (Cells & Formulas)")
    UC4("Edit Slide Deck (Add/Edit/Present)")
    UC5("Real-Time Collaboration & Chat")
    UC6("Resolve Synchronization Conflicts (OT)")
end

U --> UC1
U --> UC2
U --> UC3
U --> UC4
U --> UC5

UC2 <--> UC6
UC3 <--> UC6
UC4 <--> UC6

UC5 <--> R
UC6 <--> R
```

---

## 2. Class Diagram (Internal Statics)

The Class diagram details the objects and relations within the Nexus Collaborative Suite, including inheritance for document types, associations with users and operations, and helper engines like the `FormulaEvaluator` and `OTEngine`.

```mermaid
classDiagram
    class User {
        +String userId
        +String username
        +String cursorColor
        +String currentSelection
        +updateCursorPosition(row, col)
    }

    class Workspace {
        +List~Document~ documents
        +User currentUser
        +List~User~ activeCollaborators
        +createDocument(type)
        +openDocument(id)
    }

    class Document {
        <<Abstract>>
        +String id
        +String name
        +String type
        +Date lastSaved
        +List~Comment~ comments
        +addComment(text)
        +saveState()
    }

    class DocsDocument {
        +String htmlContent
        +Editor editorInstance
        +List~Heading~ outline
        +onUpdate()
    }

    class Editor {
        +JSONContent getJSON()
        +String getHTML()
        +Boolean isActive(name, attributes)
        +chain()
    }

    class SheetsDocument {
        +List~Sheet~ sheets
        +Boolean isReady
        +cellMapToLuckysheet(cellMap)
        +luckysheetToCellMap(sheets)
        +debouncedSave()
    }

    class Sheet {
        +String name
        +String color
        +int status
        +int order
        +int column
        +int row
        +List~CellData~ celldata
        +int defaultRowHeight
        +int defaultColWidth
    }

    class CellData {
        +int r
        +int c
        +CellValue v
    }

    class CellValue {
        +String v
        +String m
        +String f
        +CellType ct
    }

    class CellType {
        +String fa
        +String t
    }

    class SlidesDocument {
        +List~Slide~ slides
        +int currentSlideIndex
        +Boolean isPresenting
        +String speakerNotes
        +String transitionEffect
        +addSlide()
        +saveSlideCanvas()
    }

    class Slide {
        +String title
        +String fabricJSON
        +String bgColor
        +String notes
        +String transition
    }

    class FabricCanvas {
        +String version
        +List~FabricObject~ objects
        +String background
        +toJSON()
        +loadFromJSON(json, callback)
    }

    class FabricObject {
        +String type
        +double left
        +double top
        +double width
        +double height
        +double scaleX
        +double scaleY
        +double angle
        +String fill
    }

    class OTEngine {
        +int clientRevision
        +int serverRevision
        +List~Operation~ pendingOps
        +transform(localOp, remoteOp) Operation
        +apply(op)
    }

    class Operation {
        +String type
        +String targetId
        +Object delta
        +int revision
    }

    Workspace "1" *-- "many" Document
    Workspace "1" *-- "many" User
    Document <|-- DocsDocument
    Document <|-- SheetsDocument
    Document <|-- SlidesDocument
    DocsDocument "1" *-- "1" Editor
    SheetsDocument "1" *-- "many" Sheet
    Sheet "1" *-- "many" CellData
    CellData "1" *-- "1" CellValue
    CellValue "1" *-- "1" CellType
    SlidesDocument "1" *-- "many" Slide
    Slide "1" *-- "1" FabricCanvas
    FabricCanvas "1" *-- "many" FabricObject
    Document "1" o-- "1" OTEngine
    OTEngine "1" *-- "many" Operation
```

---

## 3. Sequence Diagram (External Dynamics - Collaborative Edit & Sync)

This Sequence Diagram depicts how User A and User B concurrently edit the same document. It details the client buffers, local changes, Operational Transformation (OT) conflict resolution on the Server (Sync Engine), and the update loop.

```mermaid
sequenceDiagram
    autonumber
    actor UserA as User A (Client)
    participant SyncServer as Sync Engine (Server)
    actor UserB as User B (Client)

    Note over UserA, UserB: Document is synchronized at Revision 10

    UserA->>UserA: Edit cell A1 locally (Insert "10")
    Note over UserA: Local State: Edited A1 (Unsaved locally, pending sync)
    
    UserB->>UserB: Edit cell A1 locally (Insert "20")
    Note over UserB: Local State: Edited A1 (Unsaved locally, pending sync)

    UserA->>SyncServer: Send Operation Op_A (Set A1 = 10, Revision: 10)
    activate SyncServer
    
    UserB->>SyncServer: Send Operation Op_B (Set A1 = 20, Revision: 10)

    Note over SyncServer: Server receives Op_A first.
    SyncServer->>SyncServer: Apply Op_A (A1 = 10). Increment Revision to 11.
    SyncServer-->>UserA: Acknowledge Op_A (Revision: 11)
    deactivate SyncServer

    activate SyncServer
    Note over SyncServer: Server receives Op_B (at revision 10, but server is now at 11).
    SyncServer->>SyncServer: Transform Op_B against Op_A (OT Conflict Resolution)
    Note over SyncServer: Op_B' transformed to target Revision 11.
    SyncServer->>SyncServer: Apply Op_B' (e.g., A1 resolved based on timestamps or priority).
    SyncServer-->>UserB: Acknowledge transformed Op_B' (Revision: 12)
    SyncServer-->>UserA: Broadcast transformed Op_B' (Revision: 12)
    deactivate SyncServer

    activate UserA
    UserA->>UserA: Apply Op_B' to local editor view
    Note over UserA: Sync Complete. Revision: 12
    deactivate UserA

    activate UserB
    UserB->>UserB: Apply server correction/ack
    Note over UserB: Sync Complete. Revision: 12
    deactivate UserB
```

---

## 4. State Diagram (Internal Dynamics - Document Synchronization)

The State Diagram represents the lifecycle states of the Client's Sync Manager while coordinating local modifications with remote server operations.

```mermaid
stateDiagram-v2
    [*] --> Disconnected : Initialize App

    Disconnected --> Connected_Idle : Connect to Network

    state Connected_Idle {
        [*] --> Idle
        Idle --> LocalEdit : User types/edits cell
        LocalEdit --> Idle : Local render complete
    }

    Connected_Idle --> Local_Edit_Pending : Edit occurred, preparing sync payload
    
    state Local_Edit_Pending {
        [*] --> BufferingOps
        BufferingOps --> QueueReady : Create Sync operation
    }

    Local_Edit_Pending --> Sync_Sent_Waiting : Transmit Op to Server
    
    state Sync_Sent_Waiting {
        [*] --> AwaitingAck
        AwaitingAck --> IncomingRemoteOp : Remote edit received while waiting
        IncomingRemoteOp --> AwaitingAck : Buffer remote edit
    }

    Sync_Sent_Waiting --> Connected_Idle : Server Ack Received (No Conflicts)
    
    Sync_Sent_Waiting --> Resolving_Conflict : Server returns Conflict / Transformed Op
    
    state Resolving_Conflict {
        [*] --> TransformOperations
        TransformOperations --> MergeLocalState : Apply OT transformation logic
        MergeLocalState --> UpdateView : Render resolved document state
    }

    Resolving_Conflict --> Connected_Idle : Sync complete, back to Idle

    Connected_Idle --> Disconnected : Connection Lost / Offline Mode
    Sync_Sent_Waiting --> Disconnected : Connection Timeout
    Disconnected --> Connected_Idle : Reconnect / Re-sync workspace
```
