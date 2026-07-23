'use client';

import { useState } from 'react';
import { PaymentsRegisterPanel } from './PaymentsRegisterPanel';
import { PaymentsSummaryPanel } from './PaymentsSummaryPanel';

type Permissions = {
  canRegister: boolean;
};

export function PaymentsPanel({ canRegister }: Permissions) {
  const [tab, setTab] = useState<'register' | 'summary'>(canRegister ? 'register' : 'summary');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 border-b border-slate-200">
        {canRegister && (
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`px-3 py-2 text-sm font-medium ${
              tab === 'register' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-brand-600'
            }`}
          >
            Registro
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab('summary')}
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'summary' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-brand-600'
          }`}
        >
          Resumen
        </button>
      </div>

      {tab === 'register' && canRegister && <PaymentsRegisterPanel />}
      {tab === 'summary' && <PaymentsSummaryPanel />}
    </div>
  );
}
