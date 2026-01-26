
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, where } from 'firebase/firestore';
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
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);
  const groupPicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatId) return;
    const unsubChat = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Chat;
        setChatInfo(data);
        setNewGroupName(data.groupName || '');
        updateDoc(doc(db, 'chats', chatId), { [`unreadCount.${user.uid}`]: 0 });
      }
    });
    const msgQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(msgQuery, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    });
    const contactsQuery = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubContacts = onSnapshot(contactsQuery, (snap) => {
      const contacts = new Map();
      snap.docs.forEach(doc => {
        const c = doc.data() as Chat;
        if (!c.isGroup) {
          const otherId = c.participants.find(p => p !== user.uid);
          if (otherId) contacts.set(otherId, { id: otherId, ...c.participantData[otherId] });
        }
      });
      setAvailableContacts(Array.from(contacts.values()));
    });
    return () => { unsubChat(); unsubMsgs(); unsubContacts(); };
  }, [chatId, user.uid]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatId) return;
    const text = inputText;
    setInputText('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), { senderId: user.uid, senderName: user.name, text: text, timestamp: serverTimestamp() });
      const otherIds = chatInfo?.participants.filter(p => p !== user.uid) || [];
      const updateData: any = { lastMessage: text, lastMessageTime: serverTimestamp() };
      otherIds.forEach(id => { updateData[`unreadCount.${id}`] = increment(1); });
      await updateDoc(doc(db, 'chats', chatId), updateData);
    } catch (e) {}
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !chatId) return;
    setUploading(true);
    notify('ছবি আপলোড হচ্ছে...', 'info');
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) urls.push(data.data.url);
      }
      if (urls.length > 0) {
        await addDoc(collection(db, 'chats', chatId, 'messages'), { senderId: user.uid, senderName: user.name, text: '', images: urls, timestamp: serverTimestamp() });
        const updateData: any = { lastMessage: '📷 ছবি পাঠানো হয়েছে', lastMessageTime: serverTimestamp() };
        chatInfo?.participants.filter(p => p !== user.uid).forEach(id => { updateData[`unreadCount.${id}`] = increment(1); });
        await updateDoc(doc(db, 'chats', chatId), updateData);
      }
    } catch (e) {} finally { setUploading(false); }
  };

  if (loading || !chatInfo) return <Loader fullScreen />;

  const isGroup = !!chatInfo.isGroup;
  const otherId = isGroup ? null : chatInfo.participants.find(p => p !== user.uid) || '';
  const otherUser = isGroup ? { name: chatInfo.groupName, pic: chatInfo.groupPic } : chatInfo.participantData[otherId!];
  const isOwner = chatInfo.ownerId === user.uid;

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] dark:bg-black max-w-lg mx-auto relative overflow-hidden">
      {/* Fixed Responsive Header */}
      <div className="h-20 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 flex items-center px-4 gap-3 sticky top-0 z-[100] w-full shrink-0">
         <button onClick={() => navigate('/messages')} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0 active:scale-90 transition-all">
            <i className="fas fa-chevron-left"></i>
         </button>
         <div onClick={() => setShowSettings(true)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:opacity-60 transition-opacity">
            <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm ${isGroup ? 'bg-indigo-500 flex items-center justify-center text-white' : ''}`}>
              {otherUser.pic ? <img src={otherUser.pic} className="w-full h-full object-cover" /> : isGroup ? <i className="fas fa-users text-sm"></i> : <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}`} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
               <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white truncate leading-tight">{otherUser.name}</h4>
               <p className="text-[7px] font-black text-green-500 uppercase mt-0.5 tracking-widest">Active Now</p>
            </div>
         </div>
         <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0"><i className="fas fa-ellipsis-v"></i></button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-32">
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
               {isGroup && !isMe && <span className="text-[7px] font-black uppercase text-slate-400 mb-1 ml-2">{msg.senderName}</span>}
               <div className="relative group max-w-[85%]">
                  <div className={`p-3.5 rounded-[22px] relative shadow-sm border border-slate-100 dark:border-white/5 ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                     {msg.text && <p className="text-xs font-medium leading-relaxed">{msg.text}</p>}
                     {msg.images && (
                       <div className="grid grid-cols-1 gap-2 mt-2">
                          {msg.images.map((img, i) => <img key={i} src={img} onClick={() => setViewImage(img)} className="w-full rounded-xl object-cover max-h-56 cursor-pointer" alt="" />)}
                       </div>
                     )}
                  </div>
               </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Responsive Input Bar - Fixed Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl p-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-3 z-[200]">
         <label className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0 cursor-pointer active:scale-90 transition-all">
            <i className={`fas ${uploading ? 'fa-spinner animate-spin' : 'fa-image'}`}></i>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
         </label>
         <div className="flex-1 relative">
            <input placeholder="মেসেজ লিখুন..." className="w-full h-11 bg-slate-100 dark:bg-white/5 rounded-2xl px-5 outline-none font-bold text-xs" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
         </div>
         <button onClick={handleSend} className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0"><i className="fas fa-paper-plane text-xs"></i></button>
      </div>

      {/* Settings Modal - Responsive Scrolling List */}
      {showSettings && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl animate-fade-in flex flex-col p-6" onClick={() => setShowSettings(false)}>
           <div className="flex-1 flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <div className="bg-white dark:bg-zinc-900 w-full max-h-[80vh] rounded-[44px] p-6 flex flex-col shadow-2xl overflow-hidden relative">
                 <div className="text-center mb-6">
                    <img src={otherUser.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}`} className="w-20 h-20 rounded-[28px] mx-auto mb-4 border-4 border-slate-100 dark:border-white/5 object-cover shadow-lg" />
                    <h3 className="font-black uppercase brand-font text-lg truncate px-4">{otherUser.name}</h3>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
                    {isGroup && isOwner && (
                       <button onClick={() => setShowAddMember(!showAddMember)} className="w-full h-14 bg-green-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"><i className="fas fa-user-plus"></i> মেম্বার অ্যাড</button>
                    )}
                    {showAddMember && isGroup && (
                       <div className="bg-slate-50 dark:bg-black/40 rounded-3xl p-3 border border-slate-200 dark:border-white/5 max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                          {availableContacts.filter(c => !chatInfo.participants.includes(c.id)).map(c => (
                             <div key={c.id} onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'chats', chatId), { participants: [...chatInfo.participants, c.id], [`participantData.${c.id}`]: { name: c.name, pic: c.pic || '' } });
                                  notify('অ্যাড করা হয়েছে!', 'success');
                                  setShowAddMember(false);
                                } catch (e) { notify('ব্যর্থ হয়েছে', 'error'); }
                             }} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded-xl cursor-pointer shadow-sm">
                                <span className="text-[10px] font-black uppercase truncate ml-2">{c.name}</span>
                                <i className="fas fa-plus-circle text-green-500"></i>
                             </div>
                          ))}
                       </div>
                    )}
                    {!isGroup && <button onClick={() => navigate(`/seller/${otherId}`)} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 shadow-lg"><i className="fas fa-user"></i> প্রোফাইল দেখুন</button>}
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                       <p className="text-[8px] font-black uppercase text-slate-400 mb-4 tracking-widest">অংশগ্রহণকারী ({chatInfo.participants.length})</p>
                       {chatInfo.participants.map(pid => {
                         const p = chatInfo.participantData[pid];
                         return <div key={pid} className="flex items-center gap-3 mb-2 px-1"><img src={p.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`} className="w-7 h-7 rounded-lg object-cover" /><span className="text-[10px] font-bold uppercase truncate">{p.name} {pid === chatInfo.ownerId && '👑'}</span></div>;
                       })}
                    </div>
                 </div>
                 <button onClick={() => setShowSettings(false)} className="mt-6 w-full h-12 bg-slate-100 dark:bg-white/5 rounded-2xl font-black uppercase text-[10px] text-slate-400">বন্ধ করুন</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
