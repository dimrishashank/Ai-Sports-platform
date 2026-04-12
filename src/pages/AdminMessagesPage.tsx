import { useState, useEffect } from 'react';
import { supportApi } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, User, Clock, MessageSquare, ChevronRight, X, Send, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const isHead = user?.role === 'headadmin';
  const isAdmin = user?.role === 'admin';

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, guest, athlete
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [activeStream, setActiveStream] = useState<'athletes' | 'internal'>(isAdmin ? 'athletes' : 'internal');

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const loadMessages = () => {
    setLoading(true);
    return supportApi.listMessages()
      .then(data => {
        const streamFiltered = data.messages.filter((m: any) => {
          if (activeStream === 'athletes') return m.target_role === 'admin';
          return m.target_role === 'headadmin';
        });
        setMessages(streamFiltered);
        
        // If a message is currently open, update its replies
        if (selectedMsg) {
           const updated = streamFiltered.find((m: any) => m.id === selectedMsg.id);
           if (updated) setSelectedMsg(updated);
        }
      })
      .catch(err => console.error('Messages error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
  }, [activeStream]);

  const filteredMessages = messages.filter(m => {
    if (filter === 'guest') return m.isGuest;
    if (filter === 'athlete') return !m.isGuest;
    return true;
  });

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMsg) return;
    setReplying(true);
    try {
      // If it's a guest user, we also pop open the default mail client so the admin can physically email them
      if (selectedMsg.isGuest) {
        window.location.href = `mailto:${selectedMsg.email}?subject=${encodeURIComponent(`Re: ${selectedMsg.subject}`)}&body=${encodeURIComponent(replyText)}`;
      }

      await supportApi.sendMessage({
        subject: `Re: ${selectedMsg.subject}`,
        message: replyText,
        target_role: selectedMsg.target_role === 'admin' ? 'athlete' : 'admin',
        target_user_id: selectedMsg.userId,
        message_id: selectedMsg.id,
      });

      // Refresh background messages and get real timestamp
      await loadMessages();

      toast({ title: 'Reply Sent', description: 'Your response has been sent.' });
      setReplyText('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setReplying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="px-6 py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {activeStream === 'athletes' ? 'Athlete Support' : 'Internal Messages'}
              </h1>
            </div>
            <p className="text-gray-600 text-sm font-medium">
              {activeStream === 'athletes' ? 'View and respond to athlete inquiries.' : 'Communication with the Head Administrator.'}
            </p>
          </div>

          <div className="flex items-center gap-4">
             {/* Stream Toggle */}
             <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                {(isAdmin || isHead) && (
                  <button
                    onClick={() => setActiveStream('athletes')}
                    className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                      activeStream === 'athletes' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Athletes
                  </button>
                )}
                <button
                  onClick={() => setActiveStream('internal')}
                  className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                    activeStream === 'internal' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {isHead ? 'Admin Feedback' : 'HeadAdmin'}
                </button>
             </div>

             {/* Secondary Filter */}
             {activeStream === 'athletes' && (
               <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter('athlete')}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${filter === 'athlete' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Athletes
                </button>
                <button 
                  onClick={() => setFilter('guest')}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${filter === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Guests
                </button>
               </div>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             [1,2,3,4,5,6].map(i => (
                <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl" />
             ))
          ) : filteredMessages.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
               <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
               <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No messages found</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMsg(msg)}
                className="group bg-white border border-gray-200 shadow-sm rounded-xl p-6 hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                    activeStream === 'internal' ? 'bg-purple-100 text-purple-700' :
                    msg.isGuest ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {activeStream === 'internal' ? 'SUB-ADMIN' : (msg.isGuest ? 'Guest User' : 'Registered Athlete')}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase">
                    <Clock className="w-3 h-3" />
                    {msg.date ? new Date(msg.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">{msg.subject}</h3>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">{msg.message}</p>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{msg.name}</p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{msg.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message View Modal */}
      {selectedMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                 <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Message Details</h3>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                      activeStream === 'internal' ? 'bg-purple-100 text-purple-700' :
                      selectedMsg.isGuest ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {activeStream === 'internal' ? 'SUB-ADMIN' : (selectedMsg.isGuest ? 'GUEST' : 'ATHLETE')}
                    </div>
                 </div>
                 <p className="text-gray-500 text-xs font-medium">Received on {selectedMsg.date ? new Date(selectedMsg.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}</p>
              </div>
              <button onClick={() => { setSelectedMsg(null); setReplyText(''); }} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Sender</label>
                 <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                       <User className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-lg font-bold text-gray-900">{selectedMsg.name}</p>
                       <p className="text-sm font-medium text-blue-600">{selectedMsg.email}</p>
                    </div>
                 </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message</label>
                 <div className="space-y-3">
                    <h4 className="text-xl font-bold text-gray-900 leading-tight">Subject: {selectedMsg.subject}</h4>
                    <div className="p-5 rounded-xl bg-gray-50 border border-gray-200">
                       <p className="text-base text-gray-700 leading-relaxed">{selectedMsg.message}</p>
                    </div>
                 </div>
              </div>

               {/* Previous Replies */}
               {selectedMsg.replies && selectedMsg.replies.length > 0 && (
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Previous Replies</label>
                   <div className="space-y-3">
                     {selectedMsg.replies.map((reply: any, idx: number) => (
                       <div key={idx} className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-xs font-bold text-blue-800">{reply.sender_name} ({reply.sender_role})</span>
                           <span className="text-[10px] text-gray-500 font-medium">{reply.date ? new Date(reply.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}</span>
                         </div>
                         <p className="text-sm text-gray-700">{reply.message}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

              {/* Reply Section */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Quick Reply</label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-gray-400"
                />
              </div>

              <div className="flex gap-4 pt-2">
                 <button
                   onClick={handleReply}
                   disabled={replying || !replyText.trim()}
                   className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                   {replying ? 'Sending...' : 'Send Reply'}
                 </button>
                 <a 
                  href={`mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject}`}
                  className="px-6 py-3 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors border border-gray-300 text-sm flex items-center gap-2"
                 >
                   <Mail className="w-4 h-4" />
                   Email
                 </a>
                 <button 
                  onClick={() => { setSelectedMsg(null); setReplyText(''); }}
                  className="px-6 py-3 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors border border-gray-300 text-sm"
                 >
                   Close
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
