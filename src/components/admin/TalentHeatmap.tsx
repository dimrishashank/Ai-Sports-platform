const regionData: any[] = [];

const maxAthletes = regionData.length > 0 ? Math.max(...regionData.map(r => r.athletes)) : 0;

export function TalentHeatmap() {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6">
      <h2 className="text-xl font-extrabold text-slate-900 mb-6 tracking-tight flex items-center gap-2">🗺️ Talent <span className="text-indigo-600">Distribution</span></h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {regionData.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
            No regional analytics available yet
          </div>
        ) : (
          regionData.map((r) => {
            const intensity = r.athletes / (maxAthletes || 1);
            return (
              <div
                key={r.region}
                className="p-5 rounded-xl border border-slate-200/60 transition-all duration-300 shadow-sm hover:shadow-premium hover:-translate-y-0.5"
                style={{
                  background: `hsla(238, 100%, 96%, ${0.2 + intensity * 0.8})`,
                }}
              >
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{r.region}</p>
                <p className="text-3xl font-extrabold text-indigo-600 tracking-tight">{r.athletes}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">athletes recorded</p>
                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-200/60">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Avg Score</p>
                    <p className="text-sm font-extrabold text-slate-900">{r.avgScore}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Top ⭐</p>
                    <p className="text-sm font-extrabold text-slate-900">{r.topPerformers}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
