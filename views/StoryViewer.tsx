
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { User, Story } from '../types';
import Loader from '../components/Loader';

const StoryViewer: React.FC<{ user: User }> = ({ user }) => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storyId) return;
    const unsub = onSnapshot(doc(db, 'stories', storyId), (snap) => {
      if (snap.exists()) setStory({ id: snap.id, ...snap.data() } as Story);
      setLoading(false);
    });
    return () => unsub();
  }, [storyId]);

  const handleReaction = async (emoji: string) => {
    if (!story || !storyId) return;
    const currentReactions = story.reactions || {};
    currentReactions[user.uid] = emoji;
    await updateDoc(doc(db, 'stories', storyId), { reactions: currentReactions });
  };

  const handleReply = async () => {
    if (!reply.trim() || !story) return;
    const chatId = [user.uid, story.userId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await updateDoc(chatRef, {
        participants: [user.uid, story.userId],
        participantData: {
          [user.uid]: { name: user.name, pic: user.profilePic || '' },
          [story.userId]: { name: story.userName, pic: story.userPic || '' }
        }
      });
    }

    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: user.uid,
      text: `সংযুক্ত স্টোরি রিপ্লাই: ${reply}`,
      images: [story.image],
      timestamp: serverTimestamp()
    });

    await updateDoc(chatRef, {
      lastMessage: `📷 স্টোরি রিপ্লাই: ${reply}`,
      lastMessageTime: serverTimestamp()
    });

    setReply('');
    navigate('/messages');
  };

  if (loading) return <Loader fullScreen />;
  if (!story) return <div className="p-40 text-center text-white">স্টোরি পাওয়া যায়নি</div>;

  return (
    <div className="fixed inset-0 z-[4000] bg-black flex flex-col animate-fade-in overflow-hidden">
       {/* Progress Bar */}
       <div className="absolute top-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white w-full animate-wave-slow"></div>
       </div>

       {/* Story User Info */}
       <div className="absolute top-10 left-6 right-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
             <img src={story.userPic || `https://ui-avatars.com/api/?name=${encodeURIComponent(story.userName)}`} className="w-10 h-10 rounded-full border-2 border-white" />
             <div>
                <h4 className="text-white text-sm font-black uppercase leading-none">{story.userName}</h4>
                <p className="text-white/40 text-[8px] font-bold uppercase mt-1">
                  {story.timestamp?.seconds ? new Date(story.timestamp.seconds * 1000).toLocaleString() : ''}
                </p>
             </div>
          </div>
          <button onClick={() => navigate('/messages')} className="text-white text-2xl"><i className="fas fa-times"></i></button>
       </div>

       {/* Main Image */}
       <div className="flex-1 flex items-center justify-center p-2">
          <img src={story.image} className="max-w-full max-h-full object-contain rounded-3xl" alt="" />
       </div>

       {/* Story Content & Controls */}
       <div className="p-8 space-y-8 bg-gradient-to-t from-black to-transparent">
          {story.text && <p className="text-white text-center font-bold text-base leading-relaxed">{story.text}</p>}
          
          {/* Reaction Bar */}
          <div className="flex justify-around items-center px-4">
             {['❤️', '😂', '🔥', '😡', '👍', '👎'].map(emo => (
               <button key={emo} onClick={() => handleReaction(emo)} className="text-3xl active:scale-150 transition-transform">
                 {emo}
                 {story.reactions?.[user.uid] === emo && <div className="w-1 h-1 bg-white rounded-full mx-auto mt-1"></div>}
               </button>
             ))}
          </div>

          {/* Reply Area */}
          <div className="flex items-center gap-3">
             <input 
               placeholder="রিপ্লাই দিন..." 
               className="flex-1 h-14 bg-white/10 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-white/40 transition-all"
               value={reply}
               onChange={e => setReply(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleReply()}
             />
             <button onClick={handleReply} className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center active:scale-90 transition-all">
                <i className="fas fa-paper-plane"></i>
             </button>
          </div>
       </div>
    </div>
  );
};

export default StoryViewer;
