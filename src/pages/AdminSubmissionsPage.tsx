import { useState, useEffect } from 'react';
import { submissionsApi } from '@/lib/api';
import { SubmissionTable } from '@/components/admin/SubmissionTable';
import { VideoReviewPlayer } from '@/components/admin/VideoReviewPlayer';
import { RegionFilter } from '@/components/admin/RegionFilter';
import { ExportButton } from '@/components/common/ExportButton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileVideo } from 'lucide-react';

interface Submission {
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
  hasVideo?: boolean;
}

export default function AdminSubmissionsPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [modal, setModal] = useState<Submission | null>(null);
  const [region, setRegion] = useState('all');
  const [testType, setTestType] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    submissionsApi.list({
      status: status !== 'all' ? status : undefined,
      test_type: testType !== 'all' ? testType : undefined,
      region: region !== 'all' ? region : undefined,
    })
      .then(data => setSubs(data.submissions))
      .catch(err => console.error('Submissions error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [region, testType, status]);

  const act = async (id: string, newStatus: 'approved' | 'flagged', adminRepCount?: number) => {
    try {
      await submissionsApi.update(id, newStatus, adminRepCount);
      setSubs(prev => prev.map(s => s.id === id ? { 
        ...s, 
        status: newStatus,
        admin_rep_count: adminRepCount ?? s.admin_rep_count,
        verified_rep_count: adminRepCount ?? s.verified_rep_count,
      } : s));
      setModal(null);
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleExportSubmissions = async () => {
    try {
      const headers = ['Athlete', 'Age', 'Gender', 'Location', 'Test', 'AI Rep Count', 'Admin Rep Count', 'Verified Rep Count', 'Score', 'Percentile', 'Status', 'Date'];
      const rows = subs.map((s: any) => [
        `"${s.name}"`,
        s.age || 'N/A',
        s.gender || 'N/A',
        `"${s.loc || 'N/A'}"`,
        `"${s.test}"`,
        s.ai_rep_count ?? s.score ?? 0,
        s.admin_rep_count ?? '',
        s.verified_rep_count ?? s.ai_rep_count ?? s.score ?? 0,
        s.score,
        `${s.pct}%`,
        s.status,
        s.date
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sai_submissions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate export.');
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <FileVideo className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Video Submissions</h1>
            </div>
            <p className="text-slate-500 text-sm font-medium">Review and approve athlete test recordings</p>
          </div>
          <div className="w-[200px]"><ExportButton label="Export Submissions" onExport={handleExportSubmissions} /></div>
        </div>

        <RegionFilter
          region={region}
          setRegion={setRegion}
          testType={testType}
          setTestType={setTestType}
          status={status}
          setStatus={setStatus}
          total={subs.length}
        />

        {loading ? (
          <div className="space-y-3 mt-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <SubmissionTable
            submissions={subs}
            onView={setModal}
            onApprove={id => act(id, 'approved')}
            onFlag={id => act(id, 'flagged')}
          />
        )}

        {modal && (
          <VideoReviewPlayer
            submission={modal}
            onApprove={(id, adminReps) => act(id, 'approved', adminReps)}
            onFlag={(id, adminReps) => act(id, 'flagged', adminReps)}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
