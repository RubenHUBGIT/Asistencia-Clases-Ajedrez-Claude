import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess } from '@/lib/school-scope';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (!session) return response;

  const { id } = await context.params;
  if (!hasSchoolAccess(session, id)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const groups = await prisma.classGroup.findMany({
    where: { schoolId: id },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ groups });
}
