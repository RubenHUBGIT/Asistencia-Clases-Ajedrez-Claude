'use client';

import { useState } from 'react';
import { AttendanceHistoryPanel } from './AttendanceHistoryPanel';
import { AttendanceRegisterPanel } from './AttendanceRegisterPanel';

type Permissions = {
  canRegister: boolean;
  canViewHistory: boolean;
};

export function AttendancePanel({ canRegister, canViewHistory }: Permissions) {
  const [tab, setTab] = useState<'register' | 'history'>(canRegister ? 'register' : 'history');

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
            Registrar
          </button>
        )}
        {canViewHistory && (
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`px-3 py-2 text-sm font-medium ${
              tab === 'history' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-brand-600'
            }`}
          >
            Histórico
          </button>
        )}
      </div>

      {tab === 'register' && canRegister && <AttendanceRegisterPanel />}
      {tab === 'history' && canViewHistory && <AttendanceHistoryPanel />}
    </div>
  );
}
