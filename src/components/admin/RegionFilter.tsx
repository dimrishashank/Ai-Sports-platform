interface RegionFilterProps {
  region: string;
  setRegion: (v: string) => void;
  testType: string;
  setTestType: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  total: number;
}

const regions = ['all', 'Dehradun', 'Nainital', 'Haridwar', 'Rishikesh', 'Mussoorie', 'Tehri'];
const testTypes = ['all', 'Pushups', 'Sit-ups', 'Vertical Jump', 'Shuttle Run', 'Endurance Run'];

export function RegionFilter({ region, setRegion, testType, setTestType, status, setStatus, total }: RegionFilterProps) {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 flex flex-wrap gap-5 items-end mb-10" role="search" aria-label="Filter submissions">
      <div>
        <label htmlFor="filter-region" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Region</label>
        <select
          id="filter-region"
          value={region}
          onChange={e => setRegion(e.target.value)}
          className="px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none min-w-[140px] shadow-sm transition-all cursor-pointer"
        >
          {regions.map(r => (
            <option key={r} value={r}>{r === 'all' ? 'All Regions' : r}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-test" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Test Type</label>
        <select
          id="filter-test"
          value={testType}
          onChange={e => setTestType(e.target.value)}
          className="px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none min-w-[140px] shadow-sm transition-all cursor-pointer"
        >
          {testTypes.map(t => (
            <option key={t} value={t}>{t === 'all' ? 'All Tests' : t}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-status" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Status</label>
        <select
          id="filter-status"
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-4 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none min-w-[140px] shadow-sm transition-all cursor-pointer"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-auto bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">{total} results</span>
    </div>
  );
}
