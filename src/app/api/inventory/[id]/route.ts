import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(0).optional(),
  holder: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePermission('inventory.manage');
  if (!session) return response;

  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { holder, notes, ...rest } = parsed.data;

  const before = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ message: 'Material no encontrado.' }, { status: 404 });
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...rest,
      ...(holder !== undefined ? { holder: holder || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
    },
    include: { category: true },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: 'inventory.update',
    entityType: 'InventoryItem',
    entityId: item.id,
    before,
    after: item,
  });

  return NextResponse.json({ item });
}
