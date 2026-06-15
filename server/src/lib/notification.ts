import { prisma } from './prisma';
import type { NotificationType } from '@prisma/client';

export async function createNotification(params: {
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  ticketId?: number;
}) {
  const notification = await prisma.notification.create({
    data: params,
  });
  return notification;
}

export async function createNotificationsForAgents(params: {
  teamId?: number;
  agentIds?: number[];
  type: NotificationType;
  title: string;
  content: string;
  ticketId?: number;
}) {
  let targetAgentIds: number[] = [];

  if (params.agentIds && params.agentIds.length > 0) {
    targetAgentIds = params.agentIds;
  } else if (params.teamId) {
    const agents = await prisma.agent.findMany({
      where: { teamId: params.teamId },
      select: { id: true, userId: true },
    });
    targetAgentIds = agents.map((a) => a.userId);
  } else {
    const agents = await prisma.agent.findMany({
      select: { id: true, userId: true },
    });
    targetAgentIds = agents.map((a) => a.userId);
  }

  const notifications = await prisma.notification.createMany({
    data: targetAgentIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      content: params.content,
      ticketId: params.ticketId,
    })),
  });

  return notifications;
}
