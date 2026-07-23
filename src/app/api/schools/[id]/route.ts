import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess } from '@/lib/school-scope';

const updateSchoolSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  locality: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePermission('schools.edit');
  if (!session) return response;

  const { id } = await context.params;
  if (!hasSchoolAccess(session, id)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { contactEmail, ...rest } = parsed.data;

  const before = await prisma.school.findUnique({ where: { id } });

  const school = await prisma.school.update({
    where: { id },
    data: { ...rest, ...(contactEmail !== undefined ? { contactEmail: contactEmail || null } : {}) },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: 'school.update',
    entityType: 'School',
    entityId: school.id,
    before,
    after: school,
  });

  return NextResponse.json({ school });
}
