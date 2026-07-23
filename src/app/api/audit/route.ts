import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { session, response } = await requirePermission('audit.view');
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const action = searchParams.get('action');

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ logs });
}
