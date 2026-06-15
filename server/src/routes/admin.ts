import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../lib/auth';

const router = Router();

router.use(authMiddleware);

router.get('/teams', requireRole('AGENT', 'ADMIN'), async (req, res) => {
  const teams = await prisma.team.findMany({
    include: { _count: { select: { agents: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(teams);
});

router.get('/agents', requireRole('AGENT', 'ADMIN'), async (req, res) => {
  const { teamId, status } = req.query;

  const where: any = {};
  if (teamId) where.teamId = Number(teamId);
  if (status) where.status = status as any;

  const agents = await prisma.agent.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  });
  res.json(agents);
});

router.put('/agents/status', requireRole('AGENT', 'ADMIN'), async (req, res) => {
  if (!req.user?.agentId) {
    return res.status(400).json({ error: '不是客服账号' });
  }

  const { status } = z.object({ status: z.enum(['ONLINE', 'BUSY', 'OFFLINE']) }).parse(req.body);

  const agent = await prisma.agent.update({
    where: { id: req.user.agentId },
    data: { status },
    include: {
      user: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
    },
  });
  res.json(agent);
});

router.post('/agents', requireRole('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(2),
      teamId: z.number().optional(),
    });
    const data = schema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(400).json({ error: '邮箱已存在' });

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'AGENT',
      },
    });

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        teamId: data.teamId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    res.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效', details: error.errors });
    }
    res.status(500).json({ error: '创建客服失败' });
  }
});

router.get('/tags', async (req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  res.json(tags);
});

export default router;
