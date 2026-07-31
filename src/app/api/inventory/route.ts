import { InventoryStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const createItemSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).default(1),
  holder: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const { session, response } = await requirePermission('inventory.view');
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const categoryId = searchParams.get('categoryId')?.trim();
  const statusParam = searchParams.get('status');
  const status: InventoryStatus | undefined =
    statusParam === 'ARCHIVED'
      ? InventoryStatus.ARCHIVED
      : statusParam === 'ALL'
        ? undefined
        : InventoryStatus.ACTIVE;

  const items = await prisma.inventoryItem.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { holder: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const { session, response } = await requirePermission('inventory.manage');
  if (!session) return response;

  const body = await request.json().catch(() => null);
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { holder, notes, ...rest } = parsed.data;

  const item = await prisma.inventoryItem.create({
    data: { ...rest, holder: holder || null, notes: notes || null },
    include: { category: true },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: 'inventory.create',
    entityType: 'InventoryItem',
    entityId: item.id,
    after: item,
  });

  return NextResponse.json({ item }, { status: 201 });
}
