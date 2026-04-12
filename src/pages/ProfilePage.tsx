import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, testsApi } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { User, Mail, MapPin, Calendar, Users, Save, CheckCircle, ShieldAlert, Camera } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', dob: '', gender: '', location: ''
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [testCount, setTestCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        dob: user.dob || '',
        gender: user.gender || '',
        location: user.location || '',
      });
      setProfilePhoto(user.profile_photo || '');
    }
    testsApi.getHistory()
      .then(data => setTestCount(data.tests.length))
      .catch(() => {});
  }, [user]);

  // Calculate age from DOB for display
  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const d = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  };

  const displayAge = calculateAge(form.dob);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');

    try {
      const result = await authApi.updateProfile(form);
      setMsg(result.message);
      const stored = localStorage.getItem('sai_user');
      if (stored) {
        const u = JSON.parse(stored);
        Object.assign(u, result.user);
        localStorage.setItem('sai_user', JSON.stringify(u));
      }
    } catch (error: any) {
      setErr(error.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast({ title: 'Invalid file', description: 'Please upload a JPEG, PNG, WebP, or GIF image.', variant: 'destructive' });
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Photo must be under 5MB.', variant: 'destructive' });
      return;
    }

    setPhotoUploading(true);
    try {
      const result = await authApi.uploadProfilePhoto(file);
      setProfilePhoto(result.user.profile_photo);
      toast({ title: '✅ Photo Updated', description: 'Your profile photo has been updated.' });
      // Update localStorage
      const stored = localStorage.getItem('sai_user');
      if (stored) {
        const u = JSON.parse(stored);
        u.profile_photo = result.user.profile_photo;
        localStorage.setItem('sai_user', JSON.stringify(u));
      }
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message || 'Could not upload photo.', variant: 'destructive' });
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8 max-w-screen-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 text-sm mt-1">Manage your profile and personal details.</p>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 mb-6 flex flex-col sm:flex-row items-center gap-6">
          {/* Profile Photo */}
          <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <User className="w-10 h-10 text-blue-600" />
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {photoUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </div>
          </div>

          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
            <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                {user?.role}
              </span>
              {displayAge && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-bold">
                  {displayAge} years old
                </span>
              )}
              <span className="text-xs text-gray-500">{testCount} tests completed</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="min-h-[40px] mb-4">
          {msg && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{msg}</span>
            </div>
          )}
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded p-3 flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{err}</span>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={form.dob}
                    onChange={e => setForm({ ...form, dob: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                {form.dob && (
                  <p className="text-xs text-indigo-500 font-medium mt-1 ml-1">Age: {calculateAge(form.dob)} years</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none">
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Email (cannot be changed)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={user?.email || ''} disabled
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            <Save className="w-4 h-4" />
            <span>{busy ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
