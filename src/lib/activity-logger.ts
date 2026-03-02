import prisma from './prisma';

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'tracking_added'
  | 'shipped'
  | 'delivered'
  | 'note_added'
  | 'assigned'
  | 'comment_added';

export type ActivityEntity = 'order' | 'issue' | 'store' | 'user' | 'setting';

interface LogActivityParams {
  userId: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  data?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    return await prisma.activity.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        data: params.data || {},
      },
    });
  } catch (error) {
    console.error('Activity logging error:', error);
    return null;
  }
}

export async function getEntityActivities(entity: ActivityEntity, entityId: string, limit = 50) {
  return prisma.activity.findMany({
    where: { entity, entityId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
