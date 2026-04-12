import { SAI_BENCHMARKS } from '@/data/mockData';

interface BenchmarkComparisonProps {
  testType: string;
  score: number;
  ageGroup?: string;
  gender?: string;
  className?: string;
}

export function BenchmarkComparison({ testType, score, ageGroup = 'U-17', gender = 'Male', className }: BenchmarkComparisonProps) {
  const benchmarkLabel = `${ageGroup} ${gender}`;
  const benchmark = SAI_BENCHMARKS.find(b => b.label === benchmarkLabel);

  const getAvg = () => {
    if (!benchmark) return 35;
    const key = testType.toLowerCase().replace(/\s+/g, '') as string;
    if (key.includes('push')) return benchmark.pushups;
    if (key.includes('sit')) return benchmark.situps;
    if (key.includes('pull')) return benchmark.pullups ?? 10;
    return 10;
  };

  const avg = getAvg();
  const diff = Math.round(((score - avg) / avg) * 100);

  return (
    <div className={`bg-card border border-border rounded-2xl p-6 ${className || ''}`}>
      <h2 className="text-lg font-bold text-foreground mb-4">📊 SAI Benchmark Comparison</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Your Score</p>
          <p className="text-2xl font-extrabold text-primary mt-1">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-semibold">{benchmarkLabel} Avg</p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{avg}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Difference</p>
          <p className={`text-2xl font-extrabold mt-1 ${diff >= 0 ? 'text-success' : 'text-warning'}`}>
            {diff >= 0 ? '+' : ''}{diff}%
          </p>
        </div>
      </div>
      <div
        className={`p-4 rounded-xl border ${diff >= 0 ? 'bg-success/5 border-success/20 text-success' : 'bg-warning/5 border-warning/20 text-warning'}`}
        role="status"
      >
        {diff >= 0
          ? `🟢 You exceeded the ${benchmarkLabel} average by ${diff}%! Outstanding performance.`
          : `🟡 You are ${Math.abs(diff)}% below the ${benchmarkLabel} average. Keep training!`}
      </div>
    </div>
  );
}
