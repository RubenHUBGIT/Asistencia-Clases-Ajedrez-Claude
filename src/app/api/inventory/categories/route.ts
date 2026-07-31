import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const createCategorySchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  const { session, response } = await requirePermission('inventory.view');
  if (!session) return response;

  const categories = await prisma.inventoryCategory.findMany({ orderBy: { name: 'asc' } });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const { session, response } = await requirePermission('inventory.manage');
  if (!session) return response;

  const body = await request.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const category = await prisma.inventoryCategory.create({ data: { name: parsed.data.name } });

    await logAudit({
      request,
      userId: session.user.id,
      action: 'inventory.category_create',
      entityType: 'InventoryCategory',
      entityId: category.id,
      after: category,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'Ya existe una categoría con ese nombre.' }, { status: 409 });
    }
    throw error;
  }
}
