import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { User, ChatMessage, Chat } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const IMGBB_API_KEY = '31505ba1cbfd565b7218c0f8a8421a7e';

const ChatRoom: React.FC<{ user: User }> = ({ user }) => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatId) return;
    const unsubChat = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Chat;
        setChatInfo(data);
        updateDoc(doc(db, 'chats', chatId), { [`unreadCount.${user.uid}`]: 0 });
      }
    });
    const msgQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(msgQuery, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    });
    return () => { unsubChat(); unsubMsgs(); };
  }, [chatId, user.uid]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatId) return;
    const text = inputText;
    setInputText('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), { 
        senderId: user.uid, 
        senderName: user.name, 
        text: text, 
        timestamp: serverTimestamp() 
      });
      const otherIds = chatInfo?.participants.filter(p => p !== user.uid) || [];
      const updateData: any = { lastMessage: text, lastMessageTime: serverTimestamp() };
      otherIds.forEach(id => { updateData[`unreadCount.${id}`] = increment(1); });
      await updateDoc(doc(db, 'chats', chatId), updateData);
    } catch (e) {}
  };

  const handleImageSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;
    setUploading(true);
    notify('ছবি পাঠানো হচ্ছে...', 'info');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          senderId: user.uid,
          senderName: user.name,
          images: [data.data.url],
          text: '',
          timestamp: serverTimestamp()
        });
        await updateDoc(doc(db, 'chats', chatId), { lastMessage: '📷 ছবি পাঠানো হয়েছে', lastMessageTime: serverTimestamp() });
      }
    } catch (e) { notify('ব্যর্থ হয়েছে', 'error'); }
    finally { setUploading(false); }
  };

  if (loading || !chatInfo) return <Loader fullScreen />;

  const isGroup = !!chatInfo.isGroup;
  const otherId = isGroup ? null : chatInfo.participants.find(p => p !== user.uid) || '';
  const otherUser = isGroup ? { name: chatInfo.groupName, pic: chatInfo.groupPic } : chatInfo.participantData[otherId!];

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#050505] animate-fade-in relative">
      
      {/* Centered Professional Header */}
      <div className="h-20 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-4 sticky top-0 z-[100]">
         <div className="w-1/4">
           <button onClick={() => navigate('/messages')} className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100 dark:border-white/10">
              <i className="fas fa-arrow-left"></i>
           </button>
         </div>
         
         <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white truncate brand-font tracking-tight">{otherUser.name}</h4>
            <div className="flex items-center gap-1 mt-0.5">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
               <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Online</p>
            </div>
         </div>

         <div className="w-1/4 flex justify-end">
           <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100 dark:border-white/10">
              <i className="fas fa-ellipsis-v text-xs"></i>
           </button>
         </div>
      </div>

      {/* Full Width Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 no-scrollbar pb-32">
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          const isBot = msg.senderId === 'system_bot';
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : (isBot ? 'items-center' : 'items-start')} animate-scale-in w-full`}>
               {!isMe && !isBot && <span className="text-[8px] font-black uppercase text-slate-400 mb-1 ml-2 tracking-widest">{msg.senderName}</span>}
               <div className={`relative max-w-[85%] ${isMe ? 'pl-10' : 'pr-10'}`}>
                  <div className={`p-4 rounded-[24px] shadow-sm border ${
                    isBot ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-center text-[9px] font-black uppercase tracking-widest' : 
                    isMe ? 'bg-primary text-white rounded-tr-none border-primary' : 
                    'bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 rounded-tl-none border-slate-100 dark:border-white/5 shadow-md'
                  }`}>
                     {msg.text && <p className="text-[13px] font-medium leading-relaxed">{msg.text}</p>}
                     {msg.images?.[0] && (
                       <div className="mt-2 rounded-2xl overflow-hidden border border-white/20 shadow-lg">
                         <img src={msg.images[0]} className="w-full h-auto object-cover" alt="Sent image" />
                       </div>
                     )}
                  </div>
                  <span className={`text-[7px] font-black text-slate-300 uppercase mt-1 block ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                  </span>
               </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md animate-fade-in flex items-center justify-center p-6" onClick={() => setShowSettings(false)}>
           <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[44px] p-10 flex flex-col shadow-2xl relative border border-white/5" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-8">
                 <img src={otherUser.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}`} className="w-24 h-24 mx-auto mb-6 rounded-[36px] border-4 border-slate-50 dark:border-white/5 object-cover shadow-2xl" />
                 <h3 className="font-black uppercase brand-font text-xl">{otherUser.name}</h3>
                 <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Active User</p>
              </div>
              <div className="space-y-3">
                 {!isGroup && <button onClick={() => navigate(`/seller/${otherId}`)} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">ভিউ প্রোফাইল</button>}
                 <button onClick={() => setShowSettings(false)} className="w-full h-14 bg-slate-50 dark:bg-white/5 rounded-2xl font-black uppercase text-[10px] text-slate-400">বন্ধ করুন</button>
              </div>
           </div>
        </div>
      )}

      {/* Professional Input Bar */}
      <div className="absolute bottom-6 left-4 right-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl p-3 rounded-[32px] border border-slate-200 dark:border-white/10 flex items-center gap-3 shadow-2xl z-[200]">
         <button onClick={() => chatFileRef.current?.click()} className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 active:scale-90 transition-all border border-slate-100 dark:border-white/10">
            <i className={`fas ${uploading ? 'fa-spinner animate-spin' : 'fa-image'} text-base`}></i>
         </button>
         <input type="file" className="hidden" ref={chatFileRef} onChange={handleImageSend} accept="image/*" />
         
         <input 
            placeholder="মেসেজ লিখুন..." 
            className="flex-1 h-12 bg-transparent px-2 outline-none font-bold text-sm text-slate-900 dark:text-white" 
            value={inputText} 
            onChange={e => setInputText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend()} 
         />
         
         <button onClick={handleSend} className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all shrink-0">
            <i className="fas fa-paper-plane text-sm"></i>
         </button>
      </div>
    </div>
  );
};

export default ChatRoom;
