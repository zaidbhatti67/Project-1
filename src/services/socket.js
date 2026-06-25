import { io } from 'socket.io-client';

let socket = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

export const connectSocket = (fileId, username) => {
  if (socket) {
    socket.disconnect();
  }

  const token = localStorage.getItem('nexus_token');
  socket = io(SOCKET_URL, {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Socket connected to server rooms successfully:', socket.id);
    socket.emit('join-room', { fileId, username });
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// --- Emitters ---
export const emitCursor = (fileId, username, index) => {
  if (socket) socket.emit('cursor-move', { fileId, username, index });
};

export const emitSelection = (fileId, username, cellId) => {
  if (socket) socket.emit('selection-change', { fileId, username, cellId });
};

export const emitContent = (fileId, username, content, revision) => {
  if (socket) socket.emit('content-change', { fileId, username, content, revision });
};

export const emitElementDrag = (fileId, username, position) => {
  if (socket) socket.emit('element-drag', { fileId, username, position });
};

export const emitComment = (fileId, comment) => {
  if (socket) socket.emit('comment-post', { fileId, comment });
};

// --- Listeners ---
export const registerSocketListeners = (callbacks) => {
  if (!socket) return;

  if (callbacks.onPeerJoined) {
    socket.on('peer-joined', callbacks.onPeerJoined);
  }
  if (callbacks.onCursorUpdate) {
    socket.on('cursor-update', callbacks.onCursorUpdate);
  }
  if (callbacks.onSelectionUpdate) {
    socket.on('selection-update', callbacks.onSelectionUpdate);
  }
  if (callbacks.onContentUpdate) {
    socket.on('content-update', callbacks.onContentUpdate);
  }
  if (callbacks.onElementDragUpdate) {
    socket.on('element-drag-update', callbacks.onElementDragUpdate);
  }
  if (callbacks.onCommentAdded) {
    socket.on('comment-added', callbacks.onCommentAdded);
  }
};
