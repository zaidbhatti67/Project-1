const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'nexus-super-secret-key-12345';
const PORT = process.env.PORT || 3001;

// --- AUTH RATE LIMITER ---
const authAttempts = new Map();
const authRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const timeframe = 60 * 1000; // 1 minute
  const maxRequests = 15;

  if (!authAttempts.has(ip)) {
    authAttempts.set(ip, []);
  }

  const timestamps = authAttempts.get(ip).filter(t => now - t < timeframe);
  timestamps.push(now);
  authAttempts.set(ip, timestamps);

  if (timestamps.length > maxRequests) {
    return res.status(429).json({ error: 'Too many authentication attempts. Please try again in 1 minute.' });
  }
  next();
};

// --- FILE AUTHORIZATION HELPER ---
const checkFilePermission = async (fileId, userId, allowedRoles = []) => {
  const perm = await prisma.permission.findFirst({
    where: { fileId, userId }
  });
  if (!perm) return false;
  return allowedRoles.includes(perm.role);
};

app.use(cors());
app.use(express.json());

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTER ---
app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required registration parameters' });
  }
  
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        avatarBg: ['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9'][Math.floor(Math.random() * 5)]
      }
    });
    
    // Seed initial files for the user
    const welcomeDoc = await prisma.file.create({
      data: {
        name: 'Project Research Thesis',
        type: 'docs',
        content: 'Welcome to your full-stack collaborative editor! Document, spreadsheet, and slide coordinates sync in real time over WebSockets.',
        ownerId: user.id,
        revision: 10
      }
    });

    const welcomeSheet = await prisma.file.create({
      data: {
        name: 'Project Budget & Cost Calculations',
        type: 'sheets',
        content: JSON.stringify({
          A1: { rawValue: '4500' },
          A2: { rawValue: '1200' },
          A3: { rawValue: '850' },
          B1: { rawValue: '=SUM(A1:A3)' },
          B2: { rawValue: '=AVERAGE(A1:A3)' },
          C1: { rawValue: 'Calculations' }
        }),
        ownerId: user.id,
        revision: 10
      }
    });

    const welcomeSlides = await prisma.file.create({
      data: {
        name: 'University Presentation Pitch',
        type: 'slides',
        content: JSON.stringify([
          { id: 'slide-1', title: 'Nexus Workspace', subtitle: 'Simulating concurrent WebSockets sync', bgColor: '#ffffff' },
          { id: 'slide-2', title: 'Core Tech Stack', subtitle: 'Express, Prisma ORM, Socket.io, SQLite', bgColor: '#fffcf9' }
        ]),
        ownerId: user.id,
        revision: 10
      }
    });

    // Grant owner permissions
    await prisma.permission.createMany({
      data: [
        { fileId: welcomeDoc.id, userId: user.id, role: 'owner' },
        { fileId: welcomeSheet.id, userId: user.id, role: 'owner' },
        { fileId: welcomeSlides.id, userId: user.id, role: 'owner' }
      ]
    });
    
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, avatarBg: user.avatarBg } });
  } catch (error) {
    res.status(500).json({ error: 'Server registration error: ' + error.message });
  }
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatarBg: user.avatarBg } });
  } catch (error) {
    res.status(500).json({ error: 'Server login error: ' + error.message });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, email: user.email, name: user.name, avatarBg: user.avatarBg } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  try {
    // Check if email already taken by someone else
    const existing = await prisma.user.findFirst({
      where: {
        email,
        id: { not: req.user.id }
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'Email already taken by another user' });
    }
    
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email }
    });
    
    const token = jwt.sign({ id: updated.id, email: updated.email, name: updated.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: updated.id, email: updated.email, name: updated.name, avatarBg: updated.avatarBg } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FOLDERS ROUTER ---
app.get('/api/folders', authenticateToken, async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { ownerId: req.user.id }
    });
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
  const { name, parentId } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name is required' });
  
  try {
    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        ownerId: req.user.id
      }
    });
    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/folders/:id', authenticateToken, async (req, res) => {
  try {
    const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    if (folder.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You do not own this folder' });
    }
    await prisma.folder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- FILES ROUTER ---
app.get('/api/files', authenticateToken, async (req, res) => {
  const { folderId, starred, search } = req.query;
  
  try {
    const queryConditions = {
      ownerId: req.user.id,
      isArchived: false
    };
    
    if (folderId) {
      queryConditions.folderId = folderId === 'root' ? null : folderId;
    }
    
    if (starred === 'true') {
      queryConditions.isFavorite = true;
    }
    
    if (search) {
      queryConditions.name = { contains: search };
    }
    
    const files = await prisma.file.findMany({
      where: queryConditions,
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files', authenticateToken, async (req, res) => {
  const { name, type, folderId } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'File name and type are required' });
  
  let defaultContent = '';
  if (type === 'sheets') {
    defaultContent = JSON.stringify({ A1: { rawValue: '0' } });
  } else if (type === 'slides') {
    defaultContent = JSON.stringify([{ id: 'slide-1', title: 'Click to add title', subtitle: 'Click to add subtitle', bgColor: '#ffffff' }]);
  } else {
    defaultContent = 'Start typing your project outline...\n\n# Document Header';
  }
  
  try {
    const file = await prisma.file.create({
      data: {
        name,
        type,
        content: defaultContent,
        folderId: folderId || null,
        ownerId: req.user.id,
        revision: 10
      }
    });
    
    await prisma.permission.create({
      data: {
        fileId: file.id,
        userId: req.user.id,
        role: 'owner'
      }
    });
    
    res.status(201).json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const isAllowed = await checkFilePermission(req.params.id, req.user.id, ['owner', 'editor', 'viewer']);
    if (!isAllowed) return res.status(403).json({ error: 'Access denied: You do not have permission to view this file' });

    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
      include: {
        permissions: { include: { user: true } },
        comments: { include: { author: true } },
        activities: { include: { user: true } }
      }
    });
    
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/files/:id', authenticateToken, async (req, res) => {
  const { name, content, revision } = req.body;
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const isAllowed = await checkFilePermission(req.params.id, req.user.id, ['owner', 'editor']);
    if (!isAllowed) return res.status(403).json({ error: 'Access denied: You do not have permission to modify this file' });

    // Optimistic concurrency locking check
    if (revision !== undefined && file.revision > revision) {
      return res.status(409).json({
        error: 'Conflict: This document has been modified by another collaborator. Please refresh.',
        currentRevision: file.revision
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (revision) updateData.revision = revision;
    
    const updatedFile = await prisma.file.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    res.json(updatedFile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const isAllowed = await checkFilePermission(req.params.id, req.user.id, ['owner', 'editor', 'viewer']);
    if (!isAllowed) return res.status(403).json({ error: 'Access denied: You do not have permission to duplicate this file' });

    const original = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Original file not found' });
    
    const copy = await prisma.file.create({
      data: {
        name: `${original.name} (Copy)`,
        type: original.type,
        content: original.content,
        folderId: original.folderId,
        ownerId: req.user.id,
        revision: 10
      }
    });
    
    await prisma.permission.create({
      data: {
        fileId: copy.id,
        userId: req.user.id,
        role: 'owner'
      }
    });
    
    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (file.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Only the owner can delete this file' });
    }

    await prisma.file.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/:id/star', authenticateToken, async (req, res) => {
  try {
    const isAllowed = await checkFilePermission(req.params.id, req.user.id, ['owner', 'editor', 'viewer']);
    if (!isAllowed) return res.status(403).json({ error: 'Access denied' });

    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    const updated = await prisma.file.update({
      where: { id: req.params.id },
      data: { isFavorite: !file.isFavorite }
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/:id/permissions', authenticateToken, async (req, res) => {
  const { email, role } = req.body;
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (file.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Only the owner can share this file' });
    }

    const inviteUser = await prisma.user.findUnique({ where: { email } });
    if (!inviteUser) return res.status(404).json({ error: 'No user registered with this email address' });
    
    const perm = await prisma.permission.create({
      data: {
        fileId: req.params.id,
        userId: inviteUser.id,
        role: role || 'viewer'
      }
    });
    
    res.status(201).json(perm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/:id/comments', authenticateToken, async (req, res) => {
  try {
    const isAllowed = await checkFilePermission(req.params.id, req.user.id, ['owner', 'editor', 'viewer']);
    if (!isAllowed) return res.status(403).json({ error: 'Access denied' });

    const comments = await prisma.comment.findMany({
      where: { fileId: req.params.id },
      include: { author: true }
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/:id/comments', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment text is required' });
  
  try {
    const isAllowed = await checkFilePermission(req.params.id, req.user.id, ['owner', 'editor', 'viewer']);
    if (!isAllowed) return res.status(403).json({ error: 'Access denied' });

    const comment = await prisma.comment.create({
      data: {
        fileId: req.params.id,
        authorId: req.user.id,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      include: { author: true }
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/comments/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id }
    });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const isAllowed = await checkFilePermission(comment.fileId, req.user.id, ['owner', 'editor']);
    if (!isAllowed) return res.status(403).json({ error: 'Access denied: Only owner or editor can resolve comments' });

    const updatedComment = await prisma.comment.update({
      where: { id: req.params.id },
      data: { resolved: true }
    });
    res.json(updatedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WEBSOCKET REAL-TIME SYNC LOGIC ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log('Client socket connected with auth user:', socket.user.email, socket.id);
  
  socket.on('join-room', async ({ fileId, username }) => {
    // Check permission
    const isAllowed = await checkFilePermission(fileId, socket.user.id, ['owner', 'editor', 'viewer']);
    if (!isAllowed) {
      console.log(`Unauthorized socket room join attempt by user id ${socket.user.id} for file ${fileId}`);
      return;
    }
    
    socket.join(fileId);
    console.log(`User "${username}" (ID: ${socket.user.id}) joined collaboration room for file: ${fileId}`);
    socket.to(fileId).emit('peer-joined', { username });
  });
  
  socket.on('cursor-move', ({ fileId, username, index }) => {
    socket.to(fileId).emit('cursor-update', { username, index });
  });
  
  socket.on('selection-change', ({ fileId, username, cellId }) => {
    socket.to(fileId).emit('selection-update', { username, cellId });
  });
  
  socket.on('content-change', ({ fileId, username, content, revision }) => {
    socket.to(fileId).emit('content-update', { username, content, revision });
  });
  
  socket.on('element-drag', ({ fileId, username, position }) => {
    socket.to(fileId).emit('element-drag-update', { username, position });
  });

  socket.on('comment-post', ({ fileId, comment }) => {
    socket.to(fileId).emit('comment-added', { comment });
  });
  
  socket.on('disconnect', () => {
    console.log('Client socket disconnected:', socket.id);
  });
});

// Serve static assets from frontend build
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

// Start listening
server.listen(PORT, () => {
  console.log(`Nexus Workspace Full-Stack Node Server listening on port ${PORT}`);
});
