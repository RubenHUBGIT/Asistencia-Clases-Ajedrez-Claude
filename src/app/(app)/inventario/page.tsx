import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { InventoryPanel } from '@/components/inventory/InventoryPanel';

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user.permissions.includes('inventory.view')) {
    return (
      <main className="p-8">
        <p className="text-sm text-red-600">No tienes permiso para ver esta página.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-brand-700">Inventario</h1>
      <InventoryPanel canManage={session.user.permissions.includes('inventory.manage')} />
    </main>
  );
}
