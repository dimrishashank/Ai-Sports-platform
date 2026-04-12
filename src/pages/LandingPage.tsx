import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { 
  Users, Target, MapPin, CheckCircle, Zap, TrendingUp, ChevronRight, 
  ChevronDown, Smartphone, BarChart3, Trophy, Dumbbell, Timer, Wind, 
  Footprints, Activity, Send, Loader2, Mail
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supportApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const features = [
  { icon: Zap, title: 'Real-Time Kinetic Analysis', desc: 'Our advanced pose detection tracks rep speed, angle, and form seamlessly from your smartphone camera.' },
  { icon: Target, title: 'SAI Gold Standards', desc: "Instantly compare your athletic profile against the Sports Authority of India's elite benchmarks." },
  { icon: TrendingUp, title: 'National Podium', desc: 'Rise through the ranks. Compete with athletes across the country and build your athletic resume.' },
];

const steps = [
  { icon: Smartphone, title: 'Record Your Test', desc: 'Open the app, select a fitness test, and record yourself performing the exercise with any smartphone.' },
  { icon: BarChart3, title: 'AI Analyzes Form', desc: 'Our computer vision instantly tracks your body mechanics, counts reps, and calculates your score.' },
  { icon: Trophy, title: 'Rank Nationally', desc: 'Your results are compared against SAI benchmarks and you appear on the national leaderboard.' },
];

const testTypes = [
  { icon: Dumbbell, name: 'Pushups', desc: 'Upper body strength', color: 'bg-blue-50 text-blue-700' },
  { icon: Activity, name: 'Sit-ups', desc: 'Core strength', color: 'bg-orange-50 text-orange-700' },
  { icon: Wind, name: 'Pull-ups', desc: 'Upper body & back strength', color: 'bg-green-50 text-green-700' },
  { icon: Timer, name: 'Shuttle Run', desc: 'Speed & agility', color: 'bg-purple-50 text-purple-700' },
  { icon: Footprints, name: 'Endurance Run', desc: 'Cardiovascular', color: 'bg-red-50 text-red-700' },
];

const faqs = [
  { q: 'Do I need special equipment?', a: 'No! All you need is a smartphone with a camera. Our AI handles the rest — no sensors, no wearables, no gym needed.' },
  { q: 'How accurate is the AI analysis?', a: 'Our MediaPipe-powered pose detection achieves 98% accuracy on standard fitness tests, validated against SAI benchmarks.' },
  { q: 'Who can use this platform?', a: 'Any athlete aged 14+ in India can register. Schools, sports academies, and district authorities can also onboard their athletes in bulk.' },
  { q: 'Is my data private?', a: 'Absolutely. All data is encrypted and stored securely. Only you and authorized SAI administrators can view your results.' },
  { q: 'How is the percentile calculated?', a: 'Your score is compared against the official Sports Authority of India benchmarks for your age group and gender to derive a national percentile.' },
];

export default function LandingPage() {
  const nav = useNavigate();
  const { user, authed } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await supportApi.sendMessage({
        ...contactForm,
        name: user ? user.name : contactForm.name,
        email: user ? user.email : contactForm.email,
      });
      toast({ title: "Message Sent", description: "Admin will review your request shortly." });
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20 bg-background border-b border-transparent">
        {/* Abstract Ambient Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-indigo-500/10 blur-[120px] mix-blend-multiply opacity-70 animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[100px] mix-blend-multiply opacity-70 animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 relative z-10 w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-700 mb-8 hover:shadow-md transition-shadow">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Next-Gen Athletic Intelligence
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Data-Driven <br className="hidden sm:block" />
            <span className="text-gradient">Selection.</span>
          </h1>

          <p className="text-xl font-medium text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Elevate your game. Record standardized fitness tests with zero specialized equipment, and let our vision AI map your path to the podium.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            {!authed ? (
              <>
                <button
                  onClick={() => nav('/register')}
                  className="px-8 py-4 bg-slate-900 text-white font-bold rounded-full shadow-[0_8px_20px_rgba(15,23,42,0.2)] hover:shadow-[0_10px_25px_rgba(15,23,42,0.3)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 text-lg"
                >
                  Start Assessment
                  <ChevronRight className="w-5 h-5 -mr-1" />
                </button>
                <button
                  onClick={() => nav('/login')}
                  className="px-8 py-4 bg-white text-slate-700 font-bold rounded-full border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-300 flex items-center justify-center text-lg"
                >
                  Athlete Login
                </button>
              </>
            ) : (
              <button
                onClick={() => nav(user?.role === 'admin' ? '/admin' : '/dashboard')}
                className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-full shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_10px_25px_rgba(79,70,229,0.4)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 text-lg"
              >
                <Activity className="w-5 h-5" />
                Go to Dashboard
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-24 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">How It Works</h2>
          <p className="text-lg font-medium text-slate-500 max-w-2xl mx-auto">Three simple steps from recording to national ranking.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="text-center p-8 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-sm hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <step.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{i + 1}. {step.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section className="bg-slate-50 border-y border-slate-200/50 py-24 relative overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Built for Peak Performance</h2>
            <p className="text-lg font-medium text-slate-500 max-w-2xl mx-auto">Replacing manual combine testing with highly accurate computer vision.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-slate-200/70 p-8 rounded-3xl shadow-sm hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center mb-6 shadow-md shadow-emerald-500/20">
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ SUPPORTED TESTS ═══════════════════ */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Official SAI Assessment Kit</h2>
          <p className="text-lg font-medium text-slate-500 max-w-2xl mx-auto">Each test maps directly to a Sports Authority of India fitness category.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {testTypes.map((t) => (
            <div key={t.name} className={`rounded-3xl p-6 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border border-white/40 ${t.color.replace('bg-', 'bg-opacity-80 bg-').replace('text-', 'text-opacity-90 text-')} backdrop-blur-sm`}>
              <t.icon className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-base font-bold mb-1.5">{t.name}</h3>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section className="max-w-screen-lg mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-lg text-slate-900">{faq.q}</span>
                <ChevronDown className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 pt-2 bg-slate-50/50">
                  <p className="text-slate-600 font-medium leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ CONTACT SECTION ═══════════════════ */}
      <section id="contact" className="bg-white border-t border-slate-200/50 py-24 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-indigo-50/50 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="pt-8">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">Get in Touch</h2>
              <p className="text-lg font-medium text-slate-500 mb-10 leading-relaxed">
                Have questions about SAI standards, selection trials, or technical issues? Our support team is here to help.
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Support</h4>
                    <p className="text-slate-500 font-medium">support@sai.gov.in</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Headquarters</h4>
                    <p className="text-slate-500 font-medium">JLN Stadium, New Delhi</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-slate-200/80 rounded-3xl p-8 shadow-premium">
              <form onSubmit={handleContact} className="space-y-5">
                {!user && (
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Name</label>
                      <input
                        required
                        type="text"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Email</label>
                      <input
                        required
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Subject</label>
                  <input
                    required
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-0.5">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none resize-none"
                    placeholder="Write your message here..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.39)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 py-12">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mx-auto mb-6">
            <Target className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-400 font-medium mb-2">AI Powered Sports Platform</p>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Sports Authority of India. All rights reserved.</p>
        </div>
      </footer>
    </AppLayout>
  );
}
