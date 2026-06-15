import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken, authMiddleware } from '../lib/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: '邮箱已被注册' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: 'CUSTOMER',
      },
    });

    const token = signToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效', details: error.errors });
    }
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    let agentId: number | undefined;
    if (user.role === 'AGENT' || user.role === 'ADMIN') {
      const agent = await prisma.agent.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (agent) agentId = agent.id;
    }

    const token = signToken({ userId: user.id, role: user.role, agentId });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agentId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入数据无效', details: error.errors });
    }
    res.status(500).json({ error: '登录失败' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatar: true,
    },
  });

  if (!user) return res.status(404).json({ error: '用户不存在' });

  let agentData = null;
  if (user.role === 'AGENT' || user.role === 'ADMIN') {
    const agent = await prisma.agent.findUnique({
      where: { userId: user.id },
      include: { team: true },
    });
    if (agent) {
      agentData = {
        id: agent.id,
        status: agent.status,
        team: agent.team ? { id: agent.team.id, name: agent.team.name } : null,
      };
    }
  }

  res.json({ ...user, agent: agentData });
});

export default router;
