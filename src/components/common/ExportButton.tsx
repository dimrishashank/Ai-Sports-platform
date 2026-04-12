import { useState } from 'react';
import { Download, Loader2, CheckCircle } from 'lucide-react';

interface ExportButtonProps {
  label?: string;
  onExport?: () => void | Promise<void>;
}

export function ExportButton({ label = 'Export Report', onExport }: ExportButtonProps) {
  const [state, setState] = useState<'idle' | 'exporting' | 'done'>('idle');

  const handleExport = async () => {
    if (!onExport) return;
    setState('exporting');
    try {
      await onExport();
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={state !== 'idle' || !onExport}
      className="w-full px-5 py-2.5 text-sm font-bold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      aria-label={label}
    >
      {state === 'exporting' ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
      ) : state === 'done' ? (
        <><CheckCircle className="w-4 h-4 text-emerald-500" /> Done!</>
      ) : (
        <><Download className="w-4 h-4" /> {label}</>
      )}
    </button>
  );
}
