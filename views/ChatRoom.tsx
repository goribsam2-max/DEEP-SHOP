
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);
  const groupPicRef = useRef<HTMLInputElement>(null);

  const reactions = [
    { emoji: '❤️', label: 'love', anime: 'animate-bounce' },
    { emoji: '😂', label: 'haha', anime: 'animate-pulse' },
    { emoji: '🔥', label: 'fire', anime: 'animate-ping' },
    { emoji: '😡', label: 'angry', anime: 'animate-shake' },
    { emoji: '👍', label: 'like', anime: 'animate-bounce' },
    { emoji: '👎', label: 'dislike', anime: 'animate-pulse' }
  ];

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

    return () => { unsubChat(); unsubMsgs(); };
  }, [chatId, user.uid]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatId) return;
    const uSnap = await getDoc(doc(db, 'users', user.uid));
    if (uSnap.exists() && uSnap.data().isBanned) return notify('আপনি ব্যান করা আছেন।', 'error');

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !chatId) return;
    setUploading(true);
    notify('ছবি আপলোড হচ্ছে...', 'info');
    
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) uploadedUrls.push(data.data.url);
      }

      if (uploadedUrls.length > 0) {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          senderId: user.uid,
          senderName: user.name,
          text: '',
          images: uploadedUrls,
          timestamp: serverTimestamp()
        });
        const otherIds = chatInfo?.participants.filter(p => p !== user.uid) || [];
        const updateData: any = { lastMessage: '📷 ছবি পাঠানো হয়েছে', lastMessageTime: serverTimestamp() };
        otherIds.forEach(id => { updateData[`unreadCount.${id}`] = increment(1); });
        await updateDoc(doc(db, 'chats', chatId), updateData);
        notify('ছবি পাঠানো সফল!', 'success');
      }
    } catch (e) {} finally { setUploading(false); }
  };

  const handleGroupPicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId || chatInfo?.ownerId !== user.uid) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        await updateDoc(doc(db, 'chats', chatId), { groupPic: data.data.url });
        notify('গ্রুপ ছবি পরিবর্তন হয়েছে!', 'success');
      }
    } catch (e) {} finally { setUploading(false); }
  };

  const updateGroupName = async () => {
    if (!newGroupName.trim() || !chatId || chatInfo?.ownerId !== user.uid) return;
    await updateDoc(doc(db, 'chats', chatId), { groupName: newGroupName });
    notify('গ্রুপ নাম আপডেট হয়েছে!', 'success');
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setActiveReactionId(id);
      if ('vibrate' in navigator) navigator.vibrate(50);
    }, 500);
  };
  const endLongPress = () => clearTimeout(longPressTimer.current);

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
    const msg = messages.find(m => m.id === msgId);
    const currentReactions = msg?.reactions || {};
    if (currentReactions[user.uid] === emoji) delete currentReactions[user.uid];
    else currentReactions[user.uid] = emoji;
    await updateDoc(msgRef, { reactions: currentReactions });
    setActiveReactionId(null);
  };

  const createGroupFromDirect = async () => {
    if (!chatInfo || chatInfo.isGroup) return;
    const otherId = chatInfo.participants.find(p => p !== user.uid);
    if (!otherId) return;
    const name = prompt('গ্রুপের নাম লিখুন:');
    if (!name) return;
    
    setLoading(true);
    try {
      const groupId = 'group_' + Math.random().toString(36).substring(7);
      const allParticipants = [user.uid, otherId];
      const otherInfo = chatInfo.participantData[otherId];
      
      await setDoc(doc(db, 'chats', groupId), {
        isGroup: true,
        groupName: name,
        ownerId: user.uid,
        participants: allParticipants,
        participantData: {
          [user.uid]: { name: user.name, pic: user.profilePic || '' },
          [otherId]: otherInfo
        },
        lastMessage: 'নতুন গ্রুপ তৈরি হয়েছে',
        lastMessageTime: serverTimestamp(),
        unreadCount: { [user.uid]: 0, [otherId]: 1 }
      });
      notify('গ্রুপ তৈরি সফল!', 'success');
      navigate(`/chat/${groupId}`);
    } catch (e) {
      notify('গ্রুপ তৈরি করা যায়নি', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !chatInfo) return <Loader fullScreen />;

  const isGroup = !!chatInfo.isGroup;
  const otherId = isGroup ? null : chatInfo.participants.find(p => p !== user.uid) || '';
  const otherUser = isGroup ? { name: chatInfo.groupName, pic: chatInfo.groupPic } : chatInfo.participantData[otherId!];
  const isOwner = chatInfo.ownerId === user.uid;

  return (
    <div className="flex flex-col h-screen bg-[#fcfcfc] dark:bg-black max-w-lg mx-auto relative">
      {/* Centered Reaction Popup Overlay */}
      {activeReactionId && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={() => setActiveReactionId(null)}>
           <div className="bg-white dark:bg-zinc-800 rounded-full px-8 py-4 shadow-2xl flex items-center gap-5 animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
              {reactions.map(r => (
                <button key={r.label} onClick={() => toggleReaction(activeReactionId, r.emoji)} className={`text-3xl transition-all hover:scale-150 active:scale-90 ${r.anime}`}>{r.emoji}</button>
              ))}
           </div>
        </div>
      )}

      {/* Settings / Info Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl animate-fade-in flex flex-col p-8" onClick={() => setShowSettings(false)}>
           <div className="flex-1 flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <div className="bg-white dark:bg-zinc-900 w-full rounded-[48px] p-8 md:p-10 relative shadow-2xl overflow-hidden flex flex-col items-center">
                 <div className="absolute top-0 left-0 w-full h-24 bg-primary/10"></div>
                 <div className="relative mb-6">
                    <img 
                      src={otherUser.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=random`} 
                      className="w-24 h-24 rounded-[32px] object-cover border-4 border-white dark:border-zinc-800 shadow-xl" 
                    />
                    {isGroup && isOwner && (
                      <button onClick={() => groupPicRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-800">
                        <i className="fas fa-camera text-[10px]"></i>
                        <input type="file" className="hidden" ref={groupPicRef} onChange={handleGroupPicChange} />
                      </button>
                    )}
                 </div>

                 {isGroup && isOwner ? (
                   <div className="w-full space-y-4 mb-6">
                      <input 
                        className="w-full h-12 px-6 bg-slate-50 dark:bg-black rounded-2xl font-black text-center text-sm outline-none border border-slate-100 dark:border-white/5"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        onBlur={updateGroupName}
                      />
                   </div>
                 ) : (
                   <h3 className="text-xl font-black uppercase brand-font mb-4 text-center">{otherUser.name}</h3>
                 )}

                 <div className="w-full space-y-3">
                    {!isGroup && (
                      <button onClick={() => navigate(`/seller/${otherId}`)} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                         <i className="fas fa-user-tag"></i> প্রোফাইল দেখুন
                      </button>
                    )}
                    {isGroup && (
                      <button onClick={() => { const l = `${window.location.origin}/#/messages?join=${chatId}`; navigator.clipboard.writeText(l); notify('লিঙ্ক কপি হয়েছে!', 'success'); }} className="w-full h-14 bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                         <i className="fas fa-link"></i> ইনভাইট লিঙ্ক কপি
                      </button>
                    )}
                    {!isGroup && (
                      <button onClick={createGroupFromDirect} className="w-full h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                         <i className="fas fa-users-medical"></i> গ্রুপ তৈরি করুন
                      </button>
                    )}
                 </div>
                 
                 <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 w-full">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-4 tracking-widest">অংশগ্রহণকারী</p>
                    <div className="max-h-40 overflow-y-auto space-y-3 no-scrollbar">
                       {chatInfo.participants.map(pid => {
                         const info = chatInfo.participantData[pid];
                         const isParticipantOwner = chatInfo.ownerId === pid;
                         return (
                           <div key={pid} className="flex items-center gap-3">
                              <img src={info.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(info.name)}`} className="w-8 h-8 rounded-xl object-cover" />
                              <span className="text-xs font-bold truncate flex-1">{info.name} {pid === user.uid && '(You)'}</span>
                              {isParticipantOwner && <span className="text-[7px] font-black uppercase text-primary bg-primary/10 px-2 py-1 rounded-md">Group Owner</span>}
                           </div>
                         );
                       })}
                    </div>
                 </div>

                 <button onClick={() => setShowSettings(false)} className="mt-8 text-[10px] font-black uppercase text-slate-400">বন্ধ করুন</button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="h-24 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 flex items-center px-6 gap-4 sticky top-0 z-[100]">
         <button onClick={() => navigate('/messages')} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all">
            <i className="fas fa-chevron-left"></i>
         </button>
         <div onClick={() => setShowSettings(true)} className="flex items-center gap-3 flex-1 cursor-pointer active:opacity-60 transition-opacity">
            {isGroup ? (
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-500/20 overflow-hidden">
                {otherUser.pic ? <img src={otherUser.pic} className="w-full h-full object-cover" /> : <i className="fas fa-users"></i>}
              </div>
            ) : (
              <img src={otherUser.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=random`} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-zinc-800" alt="" />
            )}
            <div className="flex-1">
               <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white truncate max-w-[150px]">{otherUser.name}</h4>
               <p className="text-[8px] font-bold text-green-500 uppercase mt-1">Active Now</p>
            </div>
         </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          const isMsgOwner = chatInfo.ownerId === msg.senderId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
               {isGroup && !isMe && (
                 <div className="flex items-center gap-2 mb-1 ml-2">
                    <span className="text-[8px] font-black uppercase text-slate-400">{msg.senderName}</span>
                    {isMsgOwner && <span className="text-[6px] font-black uppercase text-primary bg-primary/5 px-1 rounded-sm border border-primary/10 italic">Owner</span>}
                 </div>
               )}
               <div className="relative group max-w-[80%]">
                  <div 
                    onTouchStart={() => startLongPress(msg.id)} onTouchEnd={endLongPress}
                    onMouseDown={() => startLongPress(msg.id)} onMouseUp={endLongPress}
                    className={`p-4 rounded-[28px] relative ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-xl border border-slate-100 dark:border-white/5'}`}
                  >
                     {msg.text && <p className="text-[13px] font-medium leading-relaxed">{msg.text}</p>}
                     {msg.images && (
                       <div className="grid grid-cols-1 gap-2 mt-2">
                          {msg.images.map((img, i) => (
                            <img key={i} src={img} onClick={() => setViewImage(img)} className="w-full rounded-2xl object-cover max-h-64 cursor-pointer" alt="" />
                          ))}
                       </div>
                     )}
                     {msg.reactions && Object.values(msg.reactions).length > 0 && (
                        <div className="absolute -bottom-3 -right-2 flex -space-x-1">
                          {Array.from(new Set(Object.values(msg.reactions))).map((emo, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg border border-slate-50 dark:border-white/10 animate-bounce">{emo}</div>
                          ))}
                        </div>
                     )}
                  </div>
               </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-xl p-6 border-t border-slate-100 dark:border-white/5 flex items-center gap-3 z-[200]">
         <label className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all cursor-pointer shrink-0">
            <i className={`fas ${uploading ? 'fa-spinner animate-spin' : 'fa-image'} text-lg`}></i>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
         </label>
         <input 
           placeholder="মেসেজ লিখুন..." 
           className="flex-1 h-14 bg-slate-50 dark:bg-white/5 rounded-2xl px-6 outline-none font-bold text-sm"
           value={inputText}
           onChange={e => setInputText(e.target.value)}
           onKeyDown={e => e.key === 'Enter' && handleSend()}
         />
         <button onClick={handleSend} className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0">
            <i className="fas fa-paper-plane"></i>
         </button>
      </div>

      {/* Image Viewer */}
      {viewImage && (
        <div className="fixed inset-0 z-[6000] bg-black flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewImage(null)}>
           <img src={viewImage} className="max-w-full max-h-full object-contain" alt="" />
           <button className="absolute top-10 right-10 text-white text-3xl"><i className="fas fa-times"></i></button>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
