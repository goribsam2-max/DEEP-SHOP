
import React, { useState, useEffect, useContext, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { User, Chat, Story, UserNote } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';
import html2canvas from 'html2canvas';

const IMGBB_API_KEY = '31505ba1cbfd565b7218c0f8a8421a7e';

const Messages: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [chats, setChats] = useState<Chat[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [storyEditor, setStoryEditor] = useState<{ active: boolean, image: string | null }>({ active: false, image: null });
  
  const [newNote, setNewNote] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [uploadingPic, setUploadingPic] = useState(false);
  
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
      notify('নোট শেয়ার হয়েছে!', 'success');
    } catch (e) {
      notify('নোট শেয়ার করা যায়নি', 'error');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return notify('তথ্য দিন', 'error');
    setLoading(true);
    try {
      const groupId = 'group_' + Math.random().toString(36).substring(7);
      const allParticipants = [user.uid, ...selectedParticipants];
      const participantData: any = { [user.uid]: { name: user.name, pic: user.profilePic || '' } };
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
        lastMessage: 'নতুন গ্রুপ তৈরি হয়েছে',
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

  const colors = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
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
    <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#050505] animate-fade-in pb-32 overflow-x-hidden">
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <button onClick={() => setShowProfilePopup(true)} className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden active:scale-90 transition-all shrink-0">
                 <img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} className="w-full h-full object-cover" alt="" />
              </button>
              <h1 className="text-xl font-black uppercase brand-font italic truncate">মেসেজ <span className="text-primary">ইনবক্স</span></h1>
           </div>
           <div className="flex items-center gap-2">
             <button onClick={() => setShowMultiSelect(true)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500"><i className="fas fa-users"></i></button>
             <button onClick={() => navigate('/explore')} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500"><i className="fas fa-search"></i></button>
           </div>
        </div>

        {/* Stories & Notes - Improved Scrolling & Visibility */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2 items-start h-32">
           {/* My Story/Note Action */}
           <div className="flex flex-col items-center gap-2 shrink-0 w-20">
              <div className="relative">
                 <div className="w-16 h-16 rounded-full p-1 bg-primary/10 border-2 border-dashed border-primary">
                    <img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} className="w-full h-full rounded-full object-cover" alt="" />
                 </div>
                 <button onClick={() => setShowNoteInput(true)} className="absolute -top-2 -right-1 bg-white dark:bg-zinc-800 shadow-xl border border-slate-100 rounded-full w-7 h-7 flex items-center justify-center text-[10px] text-primary"><i className="fas fa-comment-dots"></i></button>
                 <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white dark:border-black cursor-pointer">
                    <i className="fas fa-plus"></i>
                    <input type="file" accept="image/*" className="hidden" ref={storyFileInputRef} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setStoryEditor({ active: true, image: ev.target?.result as string });
                        reader.readAsDataURL(file);
                      }
                    }} />
                 </label>
              </div>
              <span className="text-[8px] font-black uppercase text-slate-400">আমার আপডেট</span>
           </div>

           {/* Notes Rendering - Fixed Clarity */}
           {notes.map(note => (
             <div key={note.id} className="flex flex-col items-center gap-2 shrink-0 w-20 relative">
                <div className="relative w-16 h-16 rounded-full p-0.5 bg-slate-200 dark:bg-zinc-800">
                  <img src={note.userPic || `https://ui-avatars.com/api/?name=${encodeURIComponent(note.userName)}`} className="w-full h-full rounded-full object-cover" alt="" />
                  {/* Note Bubble - Clear and Sharp */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-2xl shadow-lg z-30 min-w-[80px] text-center">
                    <p className="text-[10px] font-black text-black dark:text-white leading-tight line-clamp-2">{note.text}</p>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-zinc-900 rotate-45 border-r border-b border-slate-200 dark:border-white/10"></div>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400 truncate w-full text-center">{note.userName}</span>
             </div>
           ))}

           {stories.map(story => (
              <div key={story.id} className="relative shrink-0 w-20">
                <Link to={`/story/${story.id}`} className="flex flex-col items-center gap-2">
                   <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-primary to-amber-500">
                      <img src={story.userPic || `https://ui-avatars.com/api/?name=${encodeURIComponent(story.userName)}&background=random`} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black" alt="" />
                   </div>
                   <span className="text-[8px] font-black uppercase text-slate-400 truncate w-full text-center">{story.userName}</span>
                </Link>
              </div>
           ))}
        </div>
      </div>

      {/* Chat List - Responsive Items */}
      <div className="flex-1 px-4 space-y-2">
        {chats.map(chat => {
          const isGroup = !!chat.isGroup;
          const otherId = isGroup ? null : chat.participants.find(p => p !== user.uid) || '';
          const otherUser = isGroup ? { name: chat.groupName, pic: chat.groupPic } : chat.participantData[otherId!];
          const unread = chat.unreadCount?.[user.uid] || 0;
          return (
            <Link key={chat.id} to={`/chat/${chat.id}`} className="flex items-center gap-4 p-4 rounded-[28px] transition-all hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent active:scale-[0.98]">
              <div className="relative shrink-0">
                 {isGroup ? (
                   <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl overflow-hidden">
                      {otherUser.pic ? <img src={otherUser.pic} className="w-full h-full object-cover" /> : <i className="fas fa-users"></i>}
                   </div>
                 ) : (
                   <img src={otherUser.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=random`} className="w-12 h-12 rounded-full object-cover" alt="" />
                 )}
                 {unread > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[8px] border-2 border-white dark:border-black font-black">{unread}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-black uppercase truncate ${unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{otherUser.name}</h4>
                <p className={`text-[11px] truncate ${unread > 0 ? 'font-black text-slate-800 dark:text-white' : 'text-slate-400'}`}>{chat.lastMessage}</p>
              </div>
              <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">{chat.lastMessageTime?.seconds ? new Date(chat.lastMessageTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </Link>
          );
        })}
      </div>

      {/* Floating Action Button (Pen Icon) */}
      <button onClick={() => setShowMultiSelect(true)} className="fixed bottom-28 right-8 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl z-50 border-4 border-white dark:border-black active:scale-90 transition-all"><i className="fas fa-pen"></i></button>

      {/* Note Input Modal */}
      {showNoteInput && (
        <div className="fixed inset-0 z-[7000] bg-black/60 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowNoteInput(false)}>
           <div className="bg-white dark:bg-zinc-900 w-full rounded-[40px] p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black brand-font uppercase mb-6">নোট <span className="text-primary">দিন</span></h3>
              <input autoFocus placeholder="কি ভাবছেন? (সর্বোচ্চ ৫০ অক্ষর)" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm mb-6 text-black dark:text-white border border-slate-100 dark:border-white/5" maxLength={50} value={newNote} onChange={e => setNewNote(e.target.value)} />
              <div className="flex gap-3">
                 <button onClick={() => setShowNoteInput(false)} className="flex-1 h-12 bg-slate-100 dark:bg-white/5 text-slate-500 font-black uppercase text-[10px] rounded-xl">বাতিল</button>
                 <button onClick={handleCreateNote} className="flex-1 h-12 bg-primary text-white font-black uppercase text-[10px] shadow-lg rounded-xl">শেয়ার</button>
              </div>
           </div>
        </div>
      )}

      {/* Multi-Select Group Modal */}
      {showMultiSelect && (
        <div className="fixed inset-0 z-[5500] bg-black/80 backdrop-blur-xl flex flex-col p-6">
           <div className="flex items-center justify-between mb-8">
              <button onClick={() => setShowMultiSelect(false)} className="text-white text-xl p-2"><i className="fas fa-times"></i></button>
              <h2 className="text-white font-black brand-font uppercase text-xs">নতুন গ্রুপ</h2>
              <button onClick={handleCreateGroup} className="bg-primary text-white px-6 h-10 rounded-full font-black text-[10px] uppercase shadow-lg" disabled={selectedParticipants.length === 0 || !groupName.trim()}>তৈরি</button>
           </div>
           <input placeholder="গ্রুপের নাম দিন..." className="w-full h-14 px-6 bg-white/10 rounded-2xl text-white outline-none border border-white/5 font-bold mb-6" value={groupName} onChange={e => setGroupName(e.target.value)} />
           <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
              <p className="text-[10px] font-black text-white/30 uppercase mb-4 tracking-widest">কন্টাক্ট লিস্ট ({selectedParticipants.length})</p>
              {distinctContacts.map(([id, info]: any) => (
                <div key={id} onClick={() => setSelectedParticipants(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])} className={`flex items-center gap-4 p-4 rounded-[24px] transition-all ${selectedParticipants.includes(id) ? 'bg-primary text-white' : 'bg-white/5 text-white/60'}`}>
                   <img src={info.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(info.name)}`} className="w-10 h-10 rounded-xl object-cover" />
                   <span className="flex-1 font-bold text-sm truncate uppercase">{info.name}</span>
                   <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedParticipants.includes(id) ? 'bg-white text-primary border-white' : 'border-white/20'}`}>
                      {selectedParticipants.includes(id) && <i className="fas fa-check text-[8px]"></i>}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Story Editor Modal */}
      {storyEditor.active && (
        <div className="fixed inset-0 z-[6000] bg-black flex flex-col p-4 animate-fade-in overflow-y-auto no-scrollbar">
           <div className="flex items-center justify-between mb-4 mt-2">
              <button onClick={() => setStoryEditor({ active: false, image: null })} className="text-white text-xl p-2"><i className="fas fa-times"></i></button>
              <h2 className="text-white font-black brand-font uppercase text-[10px] tracking-widest">স্টোরি এডিটর</h2>
              <button onClick={async () => {
                if (!storyPreviewRef.current) return;
                setUploadingPic(true);
                try {
                  const canvas = await html2canvas(storyPreviewRef.current, { useCORS: true, scale: 2 });
                  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
                  if (!blob) throw new Error();
                  const formData = new FormData();
                  formData.append('image', blob);
                  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                  const data = await res.json();
                  if (data.success) {
                    await setDoc(doc(db, 'stories', Math.random().toString(36).substring(7)), {
                      userId: user.uid, userName: user.name, userPic: user.profilePic || '',
                      image: data.data.url, text: storyText, timestamp: serverTimestamp()
                    });
                    setStoryEditor({ active: false, image: null });
                    setStoryText('');
                    notify('স্টোরি শেয়ার করা হয়েছে!', 'success');
                  }
                } catch (e) { notify('সমস্যা হয়েছে', 'error'); }
                finally { setUploadingPic(false); }
              }} disabled={uploadingPic} className="bg-primary text-white px-6 h-10 rounded-xl font-black text-[10px] uppercase shadow-lg">{uploadingPic ? 'শেয়ার হচ্ছে' : 'পাবলিশ'}</button>
           </div>
           <div className="flex-1 flex flex-col items-center">
              <div ref={storyPreviewRef} onMouseMove={(e) => { if(!isDragging) return; const rect = storyPreviewRef.current?.getBoundingClientRect(); if(!rect) return; setStoryTextPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 }); }} className="relative w-full max-w-[360px] aspect-square bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-white/10">
                 <img src={storyEditor.image!} className="w-full h-full object-cover" alt="" />
                 {storyText && <div onMouseDown={() => setIsDragging(true)} onMouseUp={() => setIsDragging(false)} style={{ position: 'absolute', left: `${storyTextPos.x}%`, top: `${storyTextPos.y}%`, transform: 'translate(-50%, -50%)', color: storyTextColor, fontSize: `${storyFontSize}px`, textShadow: '0 2px 10px rgba(0,0,0,0.8)', cursor: 'move' }} className="font-black uppercase brand-font text-center px-4 select-none break-words w-full">{storyText}</div>}
              </div>
              <div className="w-full max-w-[360px] space-y-6 mt-6">
                 <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 space-y-6">
                    <input placeholder="কিছু লিখুন..." className="w-full h-12 px-6 bg-white/10 rounded-xl text-white outline-none border border-white/5 text-center font-bold text-sm" value={storyText} onChange={e => setStoryText(e.target.value)} />
                    {storyText && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <input type="range" min="14" max="80" value={storyFontSize} onChange={(e) => setStoryFontSize(Number(e.target.value))} className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                        </div>
                        <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar py-2">
                          {colors.map(c => <button key={c} onClick={() => setStoryTextColor(c)} className={`w-8 h-8 rounded-full border-2 shrink-0 ${storyTextColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                        </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
