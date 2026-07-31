'use client';

import { useEffect, useState } from 'react';

type Category = { id: string; name: string };

type InventoryItem = {
  id: string;
  name: string;
  categoryId: string;
  category: Category;
  quantity: number;
  holder: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
};

const EMPTY_FORM = {
  name: '',
  categoryId: '',
  quantity: '1',
  holder: '',
  notes: '',
};

export function InventoryPanel({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCategories() {
    const response = await fetch('/api/inventory/categories');
    if (!response.ok) return;
    const data = (await response.json()) as { categories: Category[] };
    setCategories(data.categories);
  }

  async function loadItems() {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter });
    if (query) params.set('q', query);
    if (categoryFilter) params.set('categoryId', categoryFilter);
    const response = await fetch(`/api/inventory?${params.toString()}`);
    const data = (await response.json()) as { items: InventoryItem[] };
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  async function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    loadItems();
  }

  async function handleToggleStatus(item: InventoryItem) {
    setError(null);
    const nextStatus = item.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    const response = await fetch(`/api/inventory/${item.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { message: string };
      setError(data.message);
      return;
    }
    loadItems();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por material o quién lo tiene…"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Buscar
          </button>
        </form>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="ACTIVE">Activos</option>
          <option value="ARCHIVED">Archivados</option>
          <option value="ALL">Todos</option>
        </select>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
            className="ml-auto rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showCreateForm ? 'Cancelar' : 'Nuevo material'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showCreateForm && canManage && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <ItemForm
            categories={categories}
            onCategoryCreated={(category) => setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))}
            onSubmit={async (values) => {
              const response = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, quantity: Number(values.quantity) }),
              });
              if (!response.ok) {
                const data = (await response.json()) as { message: string };
                setError(data.message);
                return;
              }
              setShowCreateForm(false);
              loadItems();
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando inventario…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Material</th>
              <th className="py-2 pr-4">Categoría</th>
              <th className="py-2 pr-4">Cantidad</th>
              <th className="py-2 pr-4">Quién lo tiene</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                categories={categories}
                canManage={canManage}
                isEditing={editingId === item.id}
                onToggleEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                onToggleStatus={() => handleToggleStatus(item)}
                onCategoryCreated={(category) => setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))}
                onSaved={() => {
                  setEditingId(null);
                  loadItems();
                }}
              />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No hay material que coincida con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ItemRow({
  item,
  categories,
  canManage,
  isEditing,
  onToggleEdit,
  onToggleStatus,
  onCategoryCreated,
  onSaved,
}: {
  item: InventoryItem;
  categories: Category[];
  canManage: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleStatus: () => void;
  onCategoryCreated: (category: Category) => void;
  onSaved: () => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-100">
        <td className="py-2 pr-4">{item.name}</td>
        <td className="py-2 pr-4 text-slate-500">{item.category.name}</td>
        <td className="py-2 pr-4">{item.quantity}</td>
        <td className="py-2 pr-4 text-slate-500">{item.holder ?? '—'}</td>
        <td className="py-2 pr-4">{item.status === 'ACTIVE' ? 'Activo' : 'Archivado'}</td>
        <td className="flex gap-3 py-2 pr-4">
          {canManage && (
            <>
              <button type="button" onClick={onToggleEdit} className="text-sm text-brand-600 hover:underline">
                {isEditing ? 'Cerrar' : 'Editar'}
              </button>
              <button type="button" onClick={onToggleStatus} className="text-sm text-slate-600 hover:underline">
                {item.status === 'ACTIVE' ? 'Archivar' : 'Restaurar'}
              </button>
            </>
          )}
        </td>
      </tr>
      {isEditing && canManage && (
        <tr className="border-b border-slate-100 bg-slate-50">
          <td colSpan={6} className="p-4">
            <ItemForm
              initial={item}
              categories={categories}
              onCategoryCreated={onCategoryCreated}
              onSubmit={async (values) => {
                const response = await fetch(`/api/inventory/${item.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...values, quantity: Number(values.quantity) }),
                });
                if (response.ok) onSaved();
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function ItemForm({
  initial,
  categories,
  onCategoryCreated,
  onSubmit,
}: {
  initial?: InventoryItem;
  categories: Category[];
  onCategoryCreated: (category: Category) => void;
  onSubmit: (values: typeof EMPTY_FORM) => Promise<void>;
}) {
  const [values, setValues] = useState(
    initial
      ? {
          name: initial.name,
          categoryId: initial.categoryId,
          quantity: String(initial.quantity),
          holder: initial.holder ?? '',
          notes: initial.notes ?? '',
        }
      : { ...EMPTY_FORM, categoryId: categories[0]?.id ?? '' },
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    setError(null);
    const response = await fetch('/api/inventory/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    const data = (await response.json()) as { category?: Category; message?: string };
    setCreatingCategory(false);
    if (!response.ok || !data.category) {
      setError(data.message ?? 'No se ha podido crear la categoría.');
      return;
    }
    onCategoryCreated(data.category);
    setValues((current) => ({ ...current, categoryId: data.category!.id }));
    setNewCategoryName('');
    setShowNewCategory(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.categoryId) {
      setError('Selecciona o crea una categoría.');
      return;
    }
    setError(null);
    setSubmitting(true);
    await onSubmit(values);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Material
          <input
            required
            value={values.name}
            onChange={(e) => setValues((current) => ({ ...current, name: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm text-slate-700">
          Categoría
          <div className="flex items-center gap-2">
            <select
              required
              value={values.categoryId}
              onChange={(e) => setValues((current) => ({ ...current, categoryId: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="" disabled>
                Selecciona una categoría
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCategory((value) => !value)}
              className="whitespace-nowrap text-sm text-brand-600 hover:underline"
            >
              {showNewCategory ? 'Cancelar' : '+ Nueva'}
            </button>
          </div>
          {showNewCategory && (
            <div className="mt-1 flex items-center gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nombre de la categoría"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={creatingCategory}
                onClick={handleCreateCategory}
                className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                {creatingCategory ? 'Creando…' : 'Añadir'}
              </button>
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Cantidad
          <input
            required
            type="number"
            min={0}
            value={values.quantity}
            onChange={(e) => setValues((current) => ({ ...current, quantity: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Quién lo tiene
          <input
            value={values.holder}
            onChange={(e) => setValues((current) => ({ ...current, holder: e.target.value }))}
            placeholder="Nombre de la persona o colegio"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Notas
        <textarea
          value={values.notes}
          onChange={(e) => setValues((current) => ({ ...current, notes: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          rows={2}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Añadir material'}
      </button>
    </form>
  );
}
