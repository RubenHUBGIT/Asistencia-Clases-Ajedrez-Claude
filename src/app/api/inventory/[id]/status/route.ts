import { InventoryStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const statusSchema = z.object({
  status: z.enum([InventoryStatus.ACTIVE, InventoryStatus.ARCHIVED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePermission('inventory.manage');
  if (!session) return response;

  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.' }, { status: 400 });
  }

  const before = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ message: 'Material no encontrado.' }, { status: 404 });
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { category: true },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: 'inventory.status_change',
    entityType: 'InventoryItem',
    entityId: item.id,
    before: { status: before.status },
    after: { status: item.status },
  });

  return NextResponse.json({ item });
}
