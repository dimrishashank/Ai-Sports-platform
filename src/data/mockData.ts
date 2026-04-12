export interface TestRecord {
  id: string;
  type: string;
  score: number;
  percentile: number;
  rating: string;
  date: string;
  unit?: string;
}

export const TESTS_HISTORY: TestRecord[] = [];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  age: number;
  gender: string;
  location: string;
  score: number;
  percentile: number;
}

export const LEADERBOARD: LeaderboardEntry[] = [];

export interface Submission {
  id: string;
  name: string;
  age: number;
  gender: string;
  loc: string;
  test: string;
  score: number;
  pct: number;
  date: string;
  status: 'pending' | 'approved' | 'flagged';
}

export const SUBMISSIONS_INIT: Submission[] = [];

export interface AthleteRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  tests: number;
  avgPct: number;
  status: 'active' | 'flagged' | 'inactive';
}

export const ATHLETES_LIST: AthleteRecord[] = [];

export const TEST_TYPES = [
  { name: 'Pushups', desc: 'Upper body strength', dur: '60s', unit: 'reps', icon: '💪' },
  { name: 'Sit-ups', desc: 'Core strength', dur: '60s', unit: 'reps', icon: '🔥' },
  { name: 'Pull-ups', desc: 'Upper body & back strength', dur: '60s', unit: 'reps', icon: '🏋️' },
  { name: 'Shuttle Run', desc: 'Speed & agility', dur: '4×10m', unit: 'sec', icon: '⚡' },
  { name: 'Endurance Run', desc: 'Cardiovascular', dur: '800m', unit: 'min', icon: '🏃' },
];

export const SAI_BENCHMARKS = [
  { label: 'U-15 Male', pushups: 25, situps: 32, pullups: 8 },
  { label: 'U-15 Female', pushups: 18, situps: 28, pullups: 4 },
  { label: 'U-17 Male', pushups: 35, situps: 40, pullups: 12 },
  { label: 'U-17 Female', pushups: 25, situps: 35, pullups: 6 },
  { label: 'U-19 Male', pushups: 40, situps: 45, pullups: 15 },
  { label: 'U-19 Female', pushups: 28, situps: 38, pullups: 8 },
];
