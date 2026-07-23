import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';

export async function GET() {
  const { session, response } = await requirePermission('users.manage');
  if (!session) return response;

  const schools = await prisma.school.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return NextResponse.json({ schools });
}
