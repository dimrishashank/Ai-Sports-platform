import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testsApi } from '@/lib/api';
import { VideoRecorder } from '@/components/video/VideoRecorder';
import { VideoUploader } from '@/components/video/VideoUploader';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft, Clock, Ruler, ChevronRight, Target, 
  Dumbbell, Activity, Wind, Timer, Footprints, CheckCircle, 
  Video, Upload, Lock
} from 'lucide-react';

interface TestType {
  name: string;
  description: string;
  duration: string;
  unit: string;
  icon: string;
  status?: string;
}

const TEST_AESTHETICS: Record<string, { icon: React.ElementType, ring: string }> = {
  'Pushups': { icon: Dumbbell, ring: 'border-blue-500 text-blue-500' },
  'Sit-ups': { icon: Activity, ring: 'border-orange-500 text-orange-500' },
  'Pull-ups': { icon: Target, ring: 'border-green-500 text-green-500' },
  'Shuttle Run': { icon: Timer, ring: 'border-purple-400 text-purple-400' },
  'Endurance Run': { icon: Footprints, ring: 'border-red-400 text-red-400' },
};

const DEFAULT_AESTHETIC = { icon: Target, ring: 'border-blue-600 text-blue-600' };

const TEST_INSTRUCTIONS: Record<string, string[]> = {
  'Pushups': [
    'Place hands slightly wider than shoulder-width.',
    'Maintain a straight line from head to heels.',
    'Lower chest until elbows reach 90 degrees.',
    'Ensure the camera sees your full side profile.',
  ],
  'Sit-ups': [
    'Lie on your back with knees bent at 90 degrees.',
    'Cross arms over chest or place hands by ears.',
    'Lift torso until elbows touch mid-thigh.',
    'Maintain a full side-on view for the camera.',
  ],
  'Pull-ups': [
    'Grip the bar slightly wider than shoulder-width.',
    'Hang with arms fully extended before starting.',
    'Pull up until chin is above the bar.',
    'Ensure the camera sees your full side profile.',
  ],
};

export default function RecordTestPage() {
  const nav = useNavigate();
  const [sel, setSel] = useState<TestType | null>(null);
  const [mode, setMode] = useState<'select' | 'instructions' | 'record' | 'upload'>('select');
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testsApi.getTypes()
      .then(data => setTestTypes(data.types))
      .catch(err => console.error('Failed to load test types:', err))
      .finally(() => setLoading(false));
  }, []);

  // Separate active and coming soon tests
  const activeTests = testTypes.filter(t => t.status !== 'coming_soon');
  const comingSoonTests = testTypes.filter(t => t.status === 'coming_soon');

  const handleComplete = (r: { testType: string; score: number; duration: number }) => {
    nav('/results', { state: { results: r } });
  };

  // Selected test view
  if (sel && mode !== 'select') {
    const aesthetic = TEST_AESTHETICS[sel.name] || DEFAULT_AESTHETIC;
    const Icon = aesthetic.icon;

    return (
      <DashboardLayout>
        <div className="max-w-screen-md mx-auto px-6 py-8">
          <button
            onClick={() => { setSel(null); setMode('select'); }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tests
          </button>
          
          {/* Test Header */}
          <div className="bg-white border border-gray-200 p-6 rounded-xl mb-6 flex items-center gap-5 shadow-sm">
            <div className={`w-14 h-14 rounded-xl bg-gray-50 border-2 flex items-center justify-center shrink-0 ${aesthetic.ring}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{sel.name}</h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{sel.duration} · {sel.unit} Test</p>
            </div>
          </div>

          {/* Instructions View */}
          {mode === 'instructions' && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Target className="w-5 h-5 text-blue-600" />
                Proper Form & Setup
              </h2>

              <div className="space-y-4 mb-8">
                {(TEST_INSTRUCTIONS[sel.name] || ['Please follow official SAI protocols.']).map((inst, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-gray-700">{inst}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg flex items-center gap-4 mb-8">
                <CheckCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                <p className="text-sm text-yellow-800">
                  Position your camera so your full body is visible. Good lighting helps AI accuracy.
                </p>
              </div>

              {/* Choose: Record Live or Upload Video */}
              <p className="text-sm font-bold text-gray-700 mb-3">Choose how to submit:</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('record')}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-center"
                >
                  <Video className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-bold text-gray-900 text-sm">Record Live</p>
                  <p className="text-xs text-gray-500 mt-1">Use your camera</p>
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group text-center"
                >
                  <Upload className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-bold text-gray-900 text-sm">Upload Video</p>
                  <p className="text-xs text-gray-500 mt-1">From your phone/gallery</p>
                </button>
              </div>
            </div>
          )}

          {/* Record Live View */}
          {mode === 'record' && (
            <VideoRecorder testType={sel.name} onComplete={handleComplete} />
          )}

          {/* Upload Video View */}
          {mode === 'upload' && (
            <VideoUploader testType={sel.name} onComplete={handleComplete} />
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Test Selection Grid
  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Fitness Tests</h1>
          </div>
          <p className="text-gray-600 text-sm">Select a fitness test to record live or upload a pre-recorded video.</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Active Tests */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {activeTests.map((t) => {
                const aesthetic = TEST_AESTHETICS[t.name] || DEFAULT_AESTHETIC;
                const Icon = aesthetic.icon;
                
                return (
                  <button
                    key={t.name}
                    onClick={() => { setSel(t); setMode('instructions'); }}
                    className="bg-white border border-gray-200 rounded-xl p-6 text-left group overflow-hidden transition-all hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-lg bg-gray-50 border-2 flex items-center justify-center mb-4 ${aesthetic.ring}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{t.name}</h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">{t.description}</p>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-600">
                          <Clock className="w-3.5 h-3.5" /> {t.duration}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-600">
                          <Ruler className="w-3.5 h-3.5" /> {t.unit}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Start Test <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Coming Soon Tests */}
            {comingSoonTests.length > 0 && (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-500">Coming Soon</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {comingSoonTests.map((t) => {
                    const aesthetic = TEST_AESTHETICS[t.name] || DEFAULT_AESTHETIC;
                    const Icon = aesthetic.icon;
                    
                    return (
                      <div
                        key={t.name}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-left opacity-60 cursor-not-allowed relative"
                      >
                        {/* Coming Soon Badge */}
                        <div className="absolute top-3 right-3 px-2 py-1 bg-gray-200 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Coming Soon
                        </div>

                        <div className={`w-12 h-12 rounded-lg bg-gray-100 border-2 border-gray-300 flex items-center justify-center mb-4 text-gray-400`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        <h3 className="text-lg font-bold text-gray-500 mb-1">{t.name}</h3>
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{t.description}</p>
                        
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-200 text-xs font-medium text-gray-500">
                            <Clock className="w-3.5 h-3.5" /> {t.duration}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-200 text-xs font-medium text-gray-500">
                            <Ruler className="w-3.5 h-3.5" /> {t.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
