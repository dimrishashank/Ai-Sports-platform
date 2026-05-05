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
import { motion } from 'framer-motion';

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
  { icon: Dumbbell, name: 'Pushups', desc: 'Upper body strength', color: 'bg-blue-50/80 text-blue-700 ring-blue-500/20' },
  { icon: Activity, name: 'Sit-ups', desc: 'Core strength', color: 'bg-orange-50/80 text-orange-700 ring-orange-500/20' },
  { icon: Wind, name: 'Pull-ups', desc: 'Upper body & back strength', color: 'bg-green-50/80 text-green-700 ring-green-500/20' },
  { icon: Timer, name: 'Shuttle Run', desc: 'Speed & agility', color: 'bg-purple-50/80 text-purple-700 ring-purple-500/20' },
  { icon: Footprints, name: 'Endurance Run', desc: 'Cardiovascular', color: 'bg-red-50/80 text-red-700 ring-red-500/20' },
];

const faqs = [
  { q: 'Do I need special equipment?', a: 'No! All you need is a smartphone with a camera. Our AI handles the rest — no sensors, no wearables, no gym needed.' },
  { q: 'How accurate is the AI analysis?', a: 'Our MediaPipe-powered pose detection achieves 98% accuracy on standard fitness tests, validated against SAI benchmarks.' },
  { q: 'Who can use this platform?', a: 'Any athlete aged 14+ in India can register. Schools, sports academies, and district authorities can also onboard their athletes in bulk.' },
  { q: 'Is my data private?', a: 'Absolutely. All data is encrypted and stored securely. Only you and authorized SAI administrators can view your results.' },
  { q: 'How is the percentile calculated?', a: 'Your score is compared against the official Sports Authority of India benchmarks for your age group and gender to derive a national percentile.' },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

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
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-20 bg-background">
        {/* Apple/Vercel Style Ambient Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="absolute top-[-10%] right-[-10%] w-[1000px] h-[1000px] rounded-full bg-indigo-500/10 blur-[120px] opacity-60 animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-violet-500/10 blur-[120px] opacity-60 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 relative z-10 w-full text-center">
          <motion.div initial="hidden" animate="show" variants={staggerContainer} className="flex flex-col items-center">
            
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/50 shadow-premium text-xs sm:text-sm font-bold text-slate-700 mb-8 hover:shadow-premium-hover transition-all cursor-default group">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              Next-Gen Athletic Intelligence
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl lg:text-[5.5rem] font-black text-slate-900 leading-[1.05] tracking-tight mb-8">
              Data-Driven <br className="hidden sm:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient-x">Selection.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl sm:text-2xl font-medium text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              Elevate your game. Record standardized fitness tests with zero specialized equipment, and let our vision AI map your path to the podium.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
              {!authed ? (
                <>
                  <button
                    onClick={() => nav('/register')}
                    className="px-8 py-4 bg-slate-900 text-white font-bold rounded-full shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 text-lg w-full sm:w-auto group"
                  >
                    Start Assessment
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => nav('/login')}
                    className="px-8 py-4 bg-white/80 backdrop-blur-sm text-slate-700 font-bold rounded-full border border-slate-200 shadow-sm hover:shadow-premium hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center text-lg w-full sm:w-auto"
                  >
                    Athlete Login
                  </button>
                </>
              ) : (
                <button
                  onClick={() => nav(user?.role === 'admin' ? '/admin' : '/dashboard')}
                  className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-full shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 text-lg w-full sm:w-auto group"
                >
                  <Activity className="w-5 h-5" />
                  Go to Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-32 relative">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="text-center mb-20">
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">How It Works</motion.h2>
          <motion.p variants={fadeUp} className="text-xl font-medium text-slate-500 max-w-2xl mx-auto">Three simple steps from recording to national ranking.</motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-indigo-100 via-indigo-200 to-indigo-100 -z-10" />

          {steps.map((step, i) => (
            <motion.div variants={fadeUp} key={step.title} className="glass p-10 rounded-[2rem] hover:-translate-y-2 transition-all duration-500 group relative bg-white/60">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
              
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 text-indigo-600 flex items-center justify-center mb-8 shadow-premium group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 relative z-10">
                <step.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{i + 1}. {step.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed text-lg">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section className="bg-slate-50 border-y border-slate-200/50 py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer} className="text-center mb-20">
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">Built for Peak Performance</motion.h2>
            <motion.p variants={fadeUp} className="text-xl font-medium text-slate-500 max-w-2xl mx-auto">Replacing manual combine testing with highly accurate computer vision.</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer} className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <motion.div variants={fadeUp} key={f.title} className="bg-white border border-slate-200/70 p-10 rounded-[2rem] shadow-sm hover:shadow-premium-hover hover:-translate-y-2 transition-all duration-500">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center mb-8 shadow-premium shadow-slate-900/20">
                  <f.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed text-lg">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ SUPPORTED TESTS ═══════════════════ */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-32">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer} className="text-center mb-20">
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">Official SAI Assessment Kit</motion.h2>
          <motion.p variants={fadeUp} className="text-xl font-medium text-slate-500 max-w-2xl mx-auto">Each test maps directly to a Sports Authority of India fitness category.</motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {testTypes.map((t) => (
            <motion.div variants={fadeUp} key={t.name} className={`rounded-[2rem] p-8 text-center shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-300 border ring-1 ring-inset ${t.color} backdrop-blur-sm cursor-default`}>
              <t.icon className="w-10 h-10 mx-auto mb-4 opacity-90" />
              <h3 className="text-lg font-bold mb-2">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">{t.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section className="max-w-screen-lg mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-200/80 rounded-[1.5rem] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 sm:p-8 text-left hover:bg-slate-50/50 transition-colors"
              >
                <span className="font-bold text-xl text-slate-900">{faq.q}</span>
                <ChevronDown className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 sm:px-8 pb-8 pt-2">
                  <p className="text-slate-500 font-medium leading-relaxed text-lg">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ CONTACT SECTION ═══════════════════ */}
      <section id="contact" className="bg-white border-t border-slate-200/50 py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">Get in Touch</h2>
              <p className="text-xl font-medium text-slate-500 mb-12 leading-relaxed max-w-lg">
                Have questions about SAI standards, selection trials, or technical issues? Our support team is here to help.
              </p>

              <div className="space-y-8">
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-110 group-hover:text-indigo-600 transition-all">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xl mb-1">Support</h4>
                    <p className="text-slate-500 font-medium text-lg">support@sai.gov.in</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-110 group-hover:text-indigo-600 transition-all">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xl mb-1">Headquarters</h4>
                    <p className="text-slate-500 font-medium text-lg">JLN Stadium, New Delhi</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] p-8 sm:p-10 shadow-premium">
              <form onSubmit={handleContact} className="space-y-6">
                {!user && (
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Name</label>
                      <input
                        required
                        type="text"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full px-5 py-4 text-base font-medium text-slate-900 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Email</label>
                      <input
                        required
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-5 py-4 text-base font-medium text-slate-900 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Subject</label>
                  <input
                    required
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-5 py-4 text-base font-medium text-slate-900 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-5 py-4 text-base font-medium text-slate-900 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 transition-all outline-none resize-none"
                    placeholder="Write your message here..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-premium hover:shadow-premium-hover active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-lg disabled:opacity-50"
                >
                  {sending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-16 border-t border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-500/20">
            <Target className="w-7 h-7 text-white" />
          </div>
          <p className="text-slate-400 font-bold text-lg mb-2">AI Powered Sports Platform</p>
          <p className="text-slate-500 font-medium">© {new Date().getFullYear()} Sports Authority of India. All rights reserved.</p>
        </div>
      </footer>
    </AppLayout>
  );
}
