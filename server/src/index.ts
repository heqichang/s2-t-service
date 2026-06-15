import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import ticketRoutes from './routes/tickets';
import adminRoutes from './routes/admin';
import { JWT_SECRET } from './lib/auth';
import jwt from 'jsonwebtoken';

export const app = express();
const server = http.createServer(app);

const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

export const io = new Server(server, {
  cors: { origin: '*' },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).userId = decoded.userId;
      (socket as any).userRole = decoded.role;
      next();
    } catch {
      next(new Error('认证失败'));
    }
  } else {
    next(new Error('未提供令牌'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('ticket:join', (ticketId: number) => {
    socket.join(`ticket:${ticketId}`);
  });

  socket.on('ticket:leave', (ticketId: number) => {
    socket.leave(`ticket:${ticketId}`);
  });

  socket.on('disconnect', () => {
    // noop
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
