import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div 
      className={cn(
        'bg-white/60 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-premium-hover transition-all duration-300 hover:-translate-y-1',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4 relative z-10">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
          {icon}
        </div>
      </div>
      
      <p className="text-3xl font-extrabold text-slate-900 tracking-tight relative z-10">{value}</p>
      

    </div>
  );
}
