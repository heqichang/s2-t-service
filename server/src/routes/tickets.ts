import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../lib/auth';
import { createNotification, createNotificationsForAgents } from '../lib/notification';
import { io } from '../index';

const router = Router();

router.use(authMiddleware);

const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });
  if (!req.file) return res.status(400).json({ error: '请选择文件' });

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    filename: req.file.originalname,
    url: fileUrl,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['TECHNICAL', 'PRE_SALES', 'COMPLAINT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  tagIds: z.array(z.coerce.number()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    mimeType: z.string(),
    size: z.coerce.number(),
  })).optional(),
});

router.post('/', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  try {
    const data = createTicketSchema.parse(req.body);

    let assignedAgentId: number | null = null;
    const onlineAgents = await prisma.agent.findMany({
      where: { status: 'ONLINE' },
      include: { _count: { select: { assignedTickets: { where: { status: { in: ['PENDING', 'PROCESSING'] } } } } } },
      orderBy: [{ status: 'asc' }],
    });

    if (onlineAgents.length > 0) {
      const sorted = onlineAgents.sort((a, b) => a._count.assignedTickets - b._count.assignedTickets);
      assignedAgentId = sorted[0].id;
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority || 'MEDIUM',
        customerId: req.user.userId,
        agentId: assignedAgentId,
        tags: data.tagIds ? { create: data.tagIds.map((tagId) => ({ tagId })) } : undefined,
        attachments: data.attachments && data.attachments.length > 0
          ? { create: data.attachments }
          : undefined,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        agent: { include: { user: { select: { id: true, name: true, email: true } } } },
        tags: { include: { tag: true } },
        attachments: true,
      },
    });

    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        content: data.description,
        type: 'TEXT',
        userId: req.user.userId,
      },
    });

    if (assignedAgentId) {
      const agent = await prisma.agent.findUnique({ where: { id: assignedAgentId } });
      if (agent) {
        await createNotification({
          userId: agent.userId,
          type: 'NEW_TICKET',
          title: '新工单分配',
          content: `您收到新工单：${ticket.title}`,
          ticketId: ticket.id,
        });
        io?.to(`user:${agent.userId}`).emit('notification', {
          type: 'NEW_TICKET',
          ticketId: ticket.id,
          title: ticket.title,
        });
      }
    } else {
      await createNotificationsForAgents({
        type: 'NEW_TICKET',
        title: '新工单待分配',
        content: `新工单：${ticket.title}`,
        ticketId: ticket.id,
      });
    }

    res.json(ticket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: '创建工单失败' });
  }
});

router.get('/', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  const { status, category, priority, agentId, customerId, search, page = '1', pageSize = '20' } = req.query;

  const where: any = {};

  if (req.user.role === 'CUSTOMER') {
    where.customerId = req.user.userId;
  } else if (req.user.role === 'AGENT' && req.user.agentId) {
    where.OR = [{ agentId: req.user.agentId }, { agentId: null }];
  }

  if (customerId && (req.user.role === 'AGENT' || req.user.role === 'ADMIN')) {
    where.customerId = Number(customerId);
  }
  if (agentId && (req.user.role === 'AGENT' || req.user.role === 'ADMIN')) {
    where.agentId = Number(agentId);
  }
  if (status) where.status = status;
  if (category) where.category = category;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [{ title: { contains: search as string } }, { description: { contains: search as string } }];
  }

  const skip = (Number(page) - 1) * Number(pageSize);

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        agent: { include: { user: { select: { id: true, name: true, email: true } } } },
        tags: { include: { tag: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: Number(pageSize),
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      agent: { include: { user: { select: { id: true, name: true, email: true } }, team: true } },
      tags: { include: { tag: true } },
      attachments: true,
      messages: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          agent: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
      rating: true,
      mergedTo: { select: { id: true, title: true, status: true } },
      mergedFrom: { select: { id: true, title: true, status: true } },
    },
  });

  if (!ticket) return res.status(404).json({ error: '工单不存在' });

  if (req.user.role === 'CUSTOMER' && ticket.customerId !== req.user.userId) {
    return res.status(403).json({ error: '无权查看此工单' });
  }

  res.json(ticket);
});

const assignSchema = z.object({ agentId: z.number() });

router.post('/:id/assign', requireRole('AGENT', 'ADMIN'), async (req, res) => {
  try {
    const { agentId } = assignSchema.parse(req.body);
    const ticketId = Number(req.params.id);

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, include: { user: true } });
    if (!agent) return res.status(404).json({ error: '客服不存在' });

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { agentId, status: 'PROCESSING' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        agent: { include: { user: { select: { id: true, name: true, email: true } } } },
        tags: { include: { tag: true } },
      },
    });

    await createNotification({
      userId: agent.userId,
      type: 'TICKET_ASSIGNED',
      title: '工单已分配',
      content: `工单 #${ticketId} 已分配给您：${ticket.title}`,
      ticketId,
    });

    await createNotification({
      userId: ticket.customerId,
      type: 'STATUS_CHANGE',
      title: '工单状态更新',
      content: `您的工单 #${ticketId} 已被客服 ${agent.user.name} 受理`,
      ticketId,
    });

    io?.to(`user:${agent.userId}`).emit('notification', { type: 'TICKET_ASSIGNED', ticketId, title: ticket.title });
    io?.to(`user:${ticket.customerId}`).emit('ticket:update', { ticketId, status: ticket.status });

    res.json(ticket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效' });
    }
    res.status(500).json({ error: '分配失败' });
  }
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']),
});

router.put('/:id/status', requireRole('AGENT', 'ADMIN', 'CUSTOMER'), async (req, res) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const ticketId = Number(req.params.id);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: '工单不存在' });

    if (req.user?.role === 'CUSTOMER' && ticket.customerId !== req.user.userId) {
      return res.status(403).json({ error: '无权操作' });
    }

    if (req.user?.role === 'CUSTOMER' && !['CLOSED'].includes(status)) {
      return res.status(403).json({ error: '客户仅能关闭工单' });
    }

    const updateData: any = { status };
    if (status === 'RESOLVED') updateData.resolvedAt = new Date();
    if (status === 'CLOSED') updateData.closedAt = new Date();

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        agent: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    await createNotification({
      userId: ticket.customerId,
      type: 'STATUS_CHANGE',
      title: '工单状态变更',
      content: `工单 #${ticketId} 状态更新为: ${status}`,
      ticketId,
    });

    if (ticket.agentId) {
      const agent = await prisma.agent.findUnique({ where: { id: ticket.agentId } });
      if (agent) {
        await createNotification({
          userId: agent.userId,
          type: 'STATUS_CHANGE',
          title: '工单状态变更',
          content: `工单 #${ticketId} 状态更新为: ${status}`,
          ticketId,
        });
        io?.to(`user:${agent.userId}`).emit('ticket:update', { ticketId, status });
      }
    }

    io?.to(`user:${ticket.customerId}`).emit('ticket:update', { ticketId, status });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效' });
    }
    res.status(500).json({ error: '状态更新失败' });
  }
});

const replySchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().optional(),
});

router.post('/:id/messages', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  try {
    const { content, isInternal } = replySchema.parse(req.body);
    const ticketId = Number(req.params.id);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: '工单不存在' });

    if (req.user.role === 'CUSTOMER' && ticket.customerId !== req.user.userId) {
      return res.status(403).json({ error: '无权回复此工单' });
    }

    if (req.user.role === 'AGENT' && isInternal && req.user.agentId !== ticket.agentId) {
      return res.status(403).json({ error: '无权发送内部备注' });
    }

    const messageData: any = {
      ticketId,
      content,
      type: 'TEXT',
      isInternal: isInternal || false,
    };

    if (req.user.role === 'CUSTOMER') {
      messageData.userId = req.user.userId;
    } else if (req.user.agentId) {
      messageData.agentId = req.user.agentId;
    }

    const message = await prisma.message.create({
      data: messageData,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        agent: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      },
    });

    if (req.user.role === 'CUSTOMER') {
      if (ticket.agentId) {
        const agent = await prisma.agent.findUnique({ where: { id: ticket.agentId } });
        if (agent) {
          await createNotification({
            userId: agent.userId,
            type: 'CUSTOMER_REPLY',
            title: '客户已回复',
            content: `工单 #${ticketId} 收到客户回复`,
            ticketId,
          });
          io?.to(`user:${agent.userId}`).emit('notification', { type: 'CUSTOMER_REPLY', ticketId });
        }
        if (ticket.status === 'WAITING_CUSTOMER') {
          await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'PROCESSING' } });
        }
      }
    } else {
      await createNotification({
        userId: ticket.customerId,
        type: 'AGENT_REPLY',
        title: '客服已回复',
        content: `工单 #${ticketId} 收到客服回复`,
        ticketId,
      });
      io?.to(`user:${ticket.customerId}`).emit('message:new', { ticketId, message });
    }

    io?.to(`ticket:${ticketId}`).emit('message:new', { ticketId, message });

    res.json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效' });
    }
    console.error(error);
    res.status(500).json({ error: '回复失败' });
  }
});

const transferSchema = z.object({ agentId: z.number() });

router.post('/:id/transfer', requireRole('AGENT', 'ADMIN'), async (req, res) => {
  try {
    const { agentId } = transferSchema.parse(req.body);
    const ticketId = Number(req.params.id);

    const targetAgent = await prisma.agent.findUnique({ where: { id: agentId }, include: { user: true } });
    if (!targetAgent) return res.status(404).json({ error: '目标客服不存在' });

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { agentId },
      include: {
        customer: { select: { id: true, name: true } },
        agent: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    await prisma.message.create({
      data: {
        ticketId,
        content: `工单已转交给客服 ${targetAgent.user.name}`,
        type: 'SYSTEM',
      },
    });

    await createNotification({
      userId: targetAgent.userId,
      type: 'TICKET_ASSIGNED',
      title: '工单转交',
      content: `工单 #${ticketId} 已转交给您：${ticket.title}`,
      ticketId,
    });

    io?.to(`user:${targetAgent.userId}`).emit('notification', { type: 'TICKET_ASSIGNED', ticketId });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: '转交失败' });
  }
});

const mergeSchema = z.object({ targetTicketId: z.coerce.number() });

router.post('/:id/merge', requireRole('AGENT', 'ADMIN'), async (req, res) => {
  try {
    const { targetTicketId } = mergeSchema.parse(req.body);
    const sourceTicketId = Number(req.params.id);

    if (sourceTicketId === targetTicketId) {
      return res.status(400).json({ error: '不能合并到自己' });
    }

    const targetTicket = await prisma.ticket.findUnique({ where: { id: targetTicketId } });
    if (!targetTicket) return res.status(404).json({ error: '目标工单不存在' });

    await prisma.$transaction([
      prisma.ticket.update({
        where: { id: sourceTicketId },
        data: { mergedToId: targetTicketId, status: 'CLOSED' },
      }),
      prisma.message.create({
        data: {
          ticketId: targetTicketId,
          content: `已合并工单 #${sourceTicketId}`,
          type: 'SYSTEM',
        },
      }),
    ]);

    const ticket = await prisma.ticket.findUnique({
      where: { id: targetTicketId },
      include: { mergedFrom: { select: { id: true, title: true, status: true } } },
    });

    io?.to(`ticket:${targetTicketId}`).emit('ticket:merged', { sourceTicketId, targetTicketId });

    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '合并失败' });
  }
});

const ratingSchema = z.object({ rating: z.number().min(1).max(5), comment: z.string().optional() });

router.post('/:id/rate', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  try {
    const { rating, comment } = ratingSchema.parse(req.body);
    const ticketId = Number(req.params.id);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    if (ticket.customerId !== req.user.userId) return res.status(403).json({ error: '无权评价' });
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return res.status(400).json({ error: '工单未解决，无法评价' });
    }

    const existing = await prisma.ticketRating.findUnique({ where: { ticketId } });
    if (existing) return res.status(400).json({ error: '已评价过' });

    const result = await prisma.ticketRating.create({
      data: { ticketId, userId: req.user.userId, rating, comment },
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效' });
    }
    res.status(500).json({ error: '评价失败' });
  }
});

router.get('/notifications/list', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  const { unread = 'false' } = req.query;
  const where: any = { userId: req.user.userId };
  if (unread === 'true') where.read = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(notifications);
});

router.post('/notifications/:id/read', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  await prisma.notification.updateMany({
    where: { id: Number(req.params.id), userId: req.user.userId },
    data: { read: true },
  });

  res.json({ success: true });
});

router.post('/notifications/read-all', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  await prisma.notification.updateMany({
    where: { userId: req.user.userId, read: false },
    data: { read: true },
  });

  res.json({ success: true });
});

export default router;
