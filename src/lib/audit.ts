import type { Prisma } from '@prisma/client';
import { getClientIp } from './login-rate-limit';
import { prisma } from './prisma';

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function logAudit(params: {
  request: Request;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeData: toJson(params.before),
      afterData: toJson(params.after),
      ipAddress: getClientIp(params.request.headers),
    },
  });
}
