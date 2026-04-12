interface DataPoint {
  label: string;
  value: number;
  maxValue?: number;
}

interface PerformanceChartProps {
  data: DataPoint[];
  title: string;
  className?: string;
}

export function PerformanceChart({ data, title, className }: PerformanceChartProps) {
  const maxVal = Math.max(...data.map(d => d.maxValue || d.value), 1);

  return (
    <div className={`bg-transparent ${className || ''}`}>
      <h2 className="text-xl font-extrabold text-slate-900 mb-6 tracking-tight">{title}</h2>
      <div className="h-48 flex items-end gap-4" role="img" aria-label={`${title} bar chart`}>
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
            <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2 group-hover:translate-y-0 duration-300">{d.value}</span>
            <div
              style={{ height: `${(d.value / maxVal) * 100}%` }}
              className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl min-h-[4px] shadow-sm group-hover:shadow-[0_0_15px_rgba(79,70,229,0.5)] group-hover:from-indigo-500 group-hover:to-blue-400 transition-all duration-300 relative"
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-full mt-1 group-hover:text-indigo-600 transition-colors">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
