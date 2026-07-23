import { SchoolStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/school-scope';

const createSchoolSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  locality: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const { session, response } = await requirePermission('schools.view');
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const statusParam = searchParams.get('status');
  const status: SchoolStatus | undefined =
    statusParam === 'ARCHIVED' ? SchoolStatus.ARCHIVED : statusParam === 'ALL' ? undefined : SchoolStatus.ACTIVE;

  const schools = await prisma.school.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { locality: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(isAdmin(session) ? {} : { id: { in: session.user.schoolIds } }),
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ schools });
}

export async function POST(request: Request) {
  const { session, response } = await requirePermission('schools.create');
  if (!session) return response;

  const body = await request.json().catch(() => null);
  const parsed = createSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { contactEmail, ...rest } = parsed.data;

  const school = await prisma.school.create({
    data: { ...rest, contactEmail: contactEmail || null },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: 'school.create',
    entityType: 'School',
    entityId: school.id,
    after: school,
  });

  return NextResponse.json({ school }, { status: 201 });
}
