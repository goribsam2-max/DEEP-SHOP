
import React, { useState, useEffect, useContext, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { User, Chat, Story, UserNote } from '../types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';
import html2canvas from 'html2canvas';

const IMGBB_API_KEY = '31505ba1cbfd565b7218c0f8a8421a7e';

const Messages: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useContext(NotificationContext);
  const [chats, setChats] = useState<Chat[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [storyEditor, setStoryEditor] = useState<{ active: boolean, image: string | null }>({ active: false, image: null });
  
  // Forms
  const [newNote, setNewNote] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [uploadingPic, setUploadingPic] = useState(false);
  
  // Story Edit State
  const [storyText, setStoryText] = useState('');
  const [storyTextColor, setStoryTextColor] = useState('#ffffff');
  const [storyFontSize, setStoryFontSize] = useState(24);
  const [storyTextPos, setStoryTextPos] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyFileInputRef = useRef<HTMLInputElement>(null);
  const storyPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatQuery = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const storyQuery = query(collection(db, 'stories'));
    const noteQuery = query(collection(db, 'notes'));

    const unsubChats = onSnapshot(chatQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
      const pinned = JSON.parse(localStorage.getItem('pinned_chats') || '[]');
      docs.sort((a, b) => {
        const aPinned = pinned.includes(a.id);
        const bPinned = pinned.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0);
      });
      setChats(docs);
      setLoading(false);
    });

    const unsubStories = onSnapshot(storyQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Story));
      docs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setStories(docs);
    });

    const unsubNotes = onSnapshot(noteQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserNote));
      docs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setNotes(docs);
    });

    return () => { unsubChats(); unsubStories(); unsubNotes(); };
  }, [user.uid]);

  const handleUpdateProfilePic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        await updateDoc(doc(db, 'users', user.uid), { profilePic: data.data.url });
        notify('প্রোফাইল পিকচার আপডেট হয়েছে!', 'success');
      }
    } catch (e) {} finally { setUploadingPic(false); }
  };

  const onStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setStoryEditor({ active: true, image: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleStoryTouch = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const rect = storyPreviewRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setStoryTextPos({ x, y });
  };

  const shareStory = async () => {
    if (!storyPreviewRef.current) return;
    setUploadingPic(true);
    notify('স্টোরি তৈরি হচ্ছে...', 'info');
    
    try {
      const canvas = await html2canvas(storyPreviewRef.current, { useCORS: true, scale: 2 });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) throw new Error("Canvas Error");

      const formData = new FormData();
      formData.append('image', blob);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        const sid = Math.random().toString(36).substring(7);
        await setDoc(doc(db, 'stories', sid), {
          userId: user.uid,
          userName: user.name,
          userPic: user.profilePic || '',
          image: data.data.url,
          text: storyText,
          timestamp: serverTimestamp()
        });
        setStoryEditor({ active: false, image: null });
        setStoryText('');
        notify('স্টোরি শেয়ার করা হয়েছে!', 'success');
      }
    } catch (e) {
      notify('স্টোরি শেয়ার করা যায়নি', 'error');
    } finally { setUploadingPic(false); }
  };

  const handleCreateNote = async () => {
    if (!newNote.trim()) return;
    try {
      await setDoc(doc(db, 'notes', user.uid), {
        userId: user.uid,
        userName: user.name,
        userPic: user.profilePic || '',
        text: newNote,
        timestamp: serverTimestamp()
      });
      setNewNote('');
      setShowNoteInput(false);
      notify('নোট শেয়ার হয়েছে!', 'success');
    } catch (e) {
      notify('নোট শেয়ার করা যায়নি', 'error');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return notify('তথ্য দিন', 'error');
    setLoading(true);
    try {
      const groupId = 'group_' + Math.random().toString(36).substring(7);
      const allParticipants = [user.uid, ...selectedParticipants];
      
      const participantData: any = {
        [user.uid]: { name: user.name, pic: user.profilePic || '' }
      };

      for (const pid of selectedParticipants) {
        const uSnap = await getDoc(doc(db, 'users', pid));
        if (uSnap.exists()) {
          const ud = uSnap.data();
          participantData[pid] = { name: ud.name, pic: ud.profilePic || '' };
        }
      }

      await setDoc(doc(db, 'chats', groupId), {
        isGroup: true,
        groupName: groupName,
        ownerId: user.uid,
        participants: allParticipants,
        participantData: participantData,
        lastMessage: 'নতুন গ্রুপ তৈরি হয়েছে',
        lastMessageTime: serverTimestamp(),
        unreadCount: allParticipants.reduce((acc, p) => ({ ...acc, [p]: p === user.uid ? 0 : 1 }), {})
      });
      
      setShowMultiSelect(false);
      setGroupName('');
      setSelectedParticipants([]);
      notify('গ্রুপ তৈরি সফল!', 'success');
      navigate(`/chat/${groupId}`);
    } catch (e: any) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePin = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault(); e.stopPropagation();
    const pinned = JSON.parse(localStorage.getItem('pinned_chats') || '[]');
    let newPinned = pinned.includes(chatId) ? pinned.filter((id: string) => id !== chatId) : [...pinned, chatId];
    localStorage.setItem('pinned_chats', JSON.stringify(newPinned));
    window.location.reload();
  };

  const colors = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
  const pinnedIds = JSON.parse(localStorage.getItem('pinned_chats') || '[]');

  // Get distinct people from existing chats for multi-select
  const distinctContacts = Array.from(new Map(
    chats.flatMap(c => {
      if (c.isGroup) return [];
      const otherId = c.participants.find(p => p !== user.uid);
      if (!otherId) return [];
      return [[otherId, c.participantData[otherId]]];
    })
  ).entries());

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#050505] animate-fade-in pb-32">
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <button onClick={() => setShowProfilePopup(true)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary shadow-lg active:scale-90 transition-all">
                 <img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} className="w-full h-full object-cover" alt="" />
              </button>
              <h1 className="text-2xl font-black uppercase brand-font italic">মেসেজ <span className="text-primary">ইনবক্স</span></h1>
           </div>
           <div className="flex items-center gap-3">
             <button onClick={() => setShowGroupCreate(true)} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400"><i className="fas fa-users-medical"></i></button>
             <button onClick={() => navigate('/explore')} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400"><i className="fas fa-search"></i></button>
           </div>
        </div>

        {/* Notes & Stories */}
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-4">
           <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative">
                 <div className="w-16 h-16 rounded-full p-1 bg-primary/20 border-2 border-dashed border-primary">
                    <img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} className="w-full h-full rounded-full object-cover" alt="" />
                 </div>
                 <label className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white dark:border-black cursor-pointer">
                    <i className="fas fa-plus"></i>
                    <input type="file" accept="image/*" className="hidden" ref={storyFileInputRef} onChange={onStoryFileSelect} />
                 </label>
                 <div onClick={() => setShowNoteInput(true)} className="absolute -top-4 -left-2 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-white/5 px-3 py-1.5 rounded-[20px] shadow-lg max-w-[80px] cursor-pointer animate-float">
                    <p className="text-[8px] font-black text-slate-500 truncate uppercase">নোট দিন</p>
                 </div>
              </div>
              <span className="text-[8px] font-black uppercase text-slate-400">আমার স্টোরি</span>
           </div>

           {stories.map(story => (
              <div key={story.id} className="relative shrink-0">
                <Link to={`/story/${story.id}`} className="flex flex-col items-center gap-2">
                   <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-primary to-amber-500">
                      <img src={story.userPic || `https://ui-avatars.com/api/?name=${encodeURIComponent(story.userName)}&background=random`} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black" alt="" />
                   </div>
                   <span className="text-[8px] font-black uppercase text-slate-400 truncate w-16 text-center">{story.userName}</span>
                </Link>
              </div>
           ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 px-4 space-y-2 mt-4">
        {chats.map(chat => {
          const isGroup = !!chat.isGroup;
          const otherId = isGroup ? null : chat.participants.find(p => p !== user.uid) || '';
          const otherUser = isGroup ? { name: chat.groupName, pic: chat.groupPic } : chat.participantData[otherId!];
          const unread = chat.unreadCount?.[user.uid] || 0;
          const isPinned = pinnedIds.includes(chat.id);
          
          return (
            <div key={chat.id} className="relative group">
              <Link to={`/chat/${chat.id}`} className={`flex items-center gap-4 p-4 rounded-[32px] transition-all active:scale-[0.98] ${isPinned ? 'bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'}`}>
                <div className="relative">
                   {isGroup ? (
                     <div className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl overflow-hidden">
                        {otherUser.pic ? <img src={otherUser.pic} className="w-full h-full object-cover" /> : <i className="fas fa-users"></i>}
                     </div>
                   ) : (
                     <img src={otherUser.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=random`} className="w-14 h-14 rounded-full object-cover" alt="" />
                   )}
                   {isPinned && <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[8px] border-2 border-white dark:border-black"><i className="fas fa-thumbtack"></i></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-black uppercase truncate ${unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{otherUser.name}</h4>
                  <p className={`text-[11px] truncate ${unread > 0 ? 'font-black text-slate-900 dark:text-white' : 'text-slate-400'}`}>{chat.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                   <span className="text-[8px] font-bold text-slate-400 uppercase">{chat.lastMessageTime?.seconds ? new Date(chat.lastMessageTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                   {unread > 0 && <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-lg">{unread}</div>}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button (Pen Icon) */}
      <button 
        onClick={() => setShowMultiSelect(true)}
        className="fixed bottom-28 right-8 w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all z-50 border-4 border-white dark:border-black"
      >
        <i className="fas fa-pen text-xl"></i>
      </button>

      {/* Multi-Select Group Modal */}
      {showMultiSelect && (
        <div className="fixed inset-0 z-[5500] bg-black/80 backdrop-blur-xl flex flex-col p-8">
           <div className="flex items-center justify-between mb-8">
              <button onClick={() => setShowMultiSelect(false)} className="text-white text-xl"><i className="fas fa-times"></i></button>
              <h2 className="text-white font-black brand-font uppercase text-sm">নতুন গ্রুপ তৈরি করুন</h2>
              <button 
                onClick={handleCreateGroup} 
                className="bg-primary text-white px-6 h-10 rounded-full font-black text-[10px] uppercase shadow-lg shadow-primary/20"
                disabled={selectedParticipants.length === 0 || !groupName.trim()}
              >
                তৈরি করুন
              </button>
           </div>
           
           <input 
             placeholder="গ্রুপের নাম দিন..." 
             className="w-full h-16 px-6 bg-white/10 rounded-3xl text-white outline-none border border-white/5 font-bold mb-8"
             value={groupName}
             onChange={e => setGroupName(e.target.value)}
           />

           <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-2 mb-4">মেম্বার সিলেক্ট করুন ({selectedParticipants.length})</p>
              {distinctContacts.map(([id, info]: any) => (
                <div 
                  key={id} 
                  onClick={() => setSelectedParticipants(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])}
                  className={`flex items-center gap-4 p-4 rounded-3xl transition-all ${selectedParticipants.includes(id) ? 'bg-primary text-white' : 'bg-white/5 text-white/60'}`}
                >
                   <img src={info.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(info.name)}`} className="w-10 h-10 rounded-2xl object-cover" />
                   <span className="flex-1 font-black uppercase text-xs truncate">{info.name}</span>
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedParticipants.includes(id) ? 'bg-white text-primary border-white' : 'border-white/20'}`}>
                      {selectedParticipants.includes(id) && <i className="fas fa-check text-[10px]"></i>}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Story Editor Modal */}
      {storyEditor.active && (
        <div className="fixed inset-0 z-[6000] bg-black flex flex-col p-6 animate-fade-in">
           <div className="flex items-center justify-between mb-6">
              <button onClick={() => setStoryEditor({ active: false, image: null })} className="text-white text-xl p-2"><i className="fas fa-times"></i></button>
              <h2 className="text-white font-black brand-font uppercase text-xs tracking-widest">স্টোরি এডিটর</h2>
              <button onClick={shareStory} disabled={uploadingPic} className="bg-primary text-white px-8 h-12 rounded-2xl font-black text-[11px] uppercase shadow-xl shadow-primary/30 active:scale-95 transition-all">
                {uploadingPic ? 'শেয়ার হচ্ছে...' : 'পাবলিশ করুন'}
              </button>
           </div>

           <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div 
                ref={storyPreviewRef}
                onMouseMove={handleStoryTouch}
                onTouchMove={handleStoryTouch}
                className="relative w-full aspect-[9/16] bg-zinc-900 rounded-[44px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              >
                 <img src={storyEditor.image!} className="w-full h-full object-cover" alt="" />
                 {storyText && (
                   <div 
                     onMouseDown={() => setIsDragging(true)}
                     onMouseUp={() => setIsDragging(false)}
                     onTouchStart={() => setIsDragging(true)}
                     onTouchEnd={() => setIsDragging(false)}
                     style={{ 
                       position: 'absolute', 
                       left: `${storyTextPos.x}%`, 
                       top: `${storyTextPos.y}%`, 
                       transform: 'translate(-50%, -50%)',
                       color: storyTextColor,
                       fontSize: `${storyFontSize}px`,
                       cursor: 'move',
                       textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                       lineHeight: '1.2'
                     }}
                     className="font-black uppercase brand-font text-center px-4 select-none"
                   >
                     {storyText}
                   </div>
                 )}
                 <div className="absolute inset-0 pointer-events-none border-[16px] border-black/10 rounded-[44px]"></div>
              </div>

              <div className="w-full space-y-6">
                 <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 space-y-6">
                    <input 
                      placeholder="কিছু লিখুন (ঐচ্ছিক)..." 
                      className="w-full h-14 px-6 bg-white/10 rounded-2xl text-white outline-none border border-white/5 text-center font-bold text-sm"
                      value={storyText}
                      onChange={e => setStoryText(e.target.value)}
                    />
                    
                    {storyText && (
                      <div className="flex items-center gap-4">
                        <i className="fas fa-font text-[10px] text-white/40"></i>
                        <input 
                          type="range" min="14" max="60" 
                          value={storyFontSize} 
                          onChange={(e) => setStoryFontSize(Number(e.target.value))}
                          className="flex-1 accent-primary h-1 bg-white/10 rounded-full appearance-none cursor-pointer" 
                        />
                        <i className="fas fa-font text-xl text-white/40"></i>
                      </div>
                    )}

                    <div className="flex justify-center gap-2.5 overflow-x-auto no-scrollbar py-1">
                      {colors.map(c => (
                        <button key={c} onClick={() => setStoryTextColor(c)} className={`w-8 h-8 rounded-full border-2 shrink-0 transition-all ${storyTextColor === c ? 'border-white scale-125' : 'border-transparent opacity-60'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                 </div>
                 <p className="text-white/30 text-[8px] font-black uppercase text-center tracking-[0.2em]">লেখাটি মুভ করতে ছবির ওপর টাচ করুন</p>
              </div>
           </div>
        </div>
      )}

      {/* Note Input Modal */}
      {showNoteInput && (
        <div className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowNoteInput(false)}>
           <div className="bg-white dark:bg-zinc-900 w-full rounded-[40px] p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black brand-font uppercase mb-6">একটি <span className="text-primary">নোট দিন</span></h3>
              <input autoFocus placeholder="আপনার চিন্তা লিখুন..." className="w-full h-16 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm mb-8" maxLength={60} value={newNote} onChange={e => setNewNote(e.target.value)} />
              <div className="flex gap-4">
                 <button onClick={() => setShowNoteInput(false)} className="flex-1 h-14 bg-slate-100 text-slate-500 font-black uppercase text-[10px]">বাতিল</button>
                 <button onClick={handleCreateNote} className="flex-1 h-14 bg-primary text-white font-black uppercase text-[10px] shadow-xl">শেয়ার করুন</button>
              </div>
           </div>
        </div>
      )}

      {/* Profile Popup */}
      {showProfilePopup && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl animate-fade-in flex flex-col p-8" onClick={() => setShowProfilePopup(false)}>
           <div className="flex-1 flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <div className="bg-white dark:bg-zinc-900 w-full rounded-[56px] p-12 relative shadow-2xl overflow-hidden text-center">
                 <div className="absolute top-0 left-0 w-full h-32 bg-primary/10"></div>
                 <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-6">
                       <img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} className="w-32 h-32 rounded-[44px] object-cover border-4 border-white dark:border-zinc-800 shadow-2xl" alt="" />
                       <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all border-4 border-white dark:border-zinc-800"><i className={`fas ${uploadingPic ? 'fa-spinner animate-spin' : 'fa-camera'}`}></i></button>
                    </div>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleUpdateProfilePic} />
                    <h3 className="text-2xl font-black uppercase brand-font mb-1">{user.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">{user.email}</p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                       <div className="bg-slate-50 dark:bg-black/40 p-5 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase mb-1">ব্যালেন্স</span>
                          <span className="text-lg font-black brand-font italic text-primary">৳{user.walletBalance || 0}</span>
                       </div>
                       <div className="bg-slate-50 dark:bg-black/40 p-5 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase mb-1">পয়েন্ট</span>
                          <span className="text-lg font-black brand-font italic text-indigo-500">{user.rewardPoints || 0}</span>
                       </div>
                    </div>
                    <button onClick={() => setShowProfilePopup(false)} className="mt-12 w-full h-16 bg-slate-900 dark:bg-white dark:text-black text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-xl">বন্ধ করুন</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Legacy Group Create (Keep for compatibility) */}
      {showGroupCreate && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
           <div className="bg-white dark:bg-zinc-900 w-full rounded-[48px] p-10 animate-scale-in">
              <h2 className="text-xl font-black brand-font uppercase mb-6">নতুন <span className="text-primary">গ্রুপ</span></h2>
              <input placeholder="গ্রুপের নাম লিখুন..." className="w-full h-16 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm mb-8" value={groupName} onChange={e => setGroupName(e.target.value)} />
              <div className="flex gap-4">
                 <button onClick={() => setShowGroupCreate(false)} className="flex-1 h-14 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase">বাতিল</button>
                 <button onClick={() => { if(groupName.trim()) setShowMultiSelect(true); setShowGroupCreate(false); }} className="flex-1 h-14 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-primary/20">এগিয়ে যান</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
