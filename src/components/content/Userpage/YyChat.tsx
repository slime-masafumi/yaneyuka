'use client';

/**
 * YyChat.tsx
 * v5: 安全な日付変換処理を追加（iPhoneクラッシュ対策）
 */

import React, { useState, useEffect, useRef } from 'react';
import ToolHeader from './ToolHeader';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/AuthContext';
import { ChatMessage, ChatRoom } from '@/types/chat';
import { db } from '@/lib/firebaseClient';
import { 
  collection, addDoc, serverTimestamp, orderBy, updateDoc, doc, getDocs, 
  setDoc, where, arrayUnion, arrayRemove, writeBatch, getDoc, deleteField, 
  query, onSnapshot, deleteDoc
} from 'firebase/firestore';
import { getUsersByUids, listBoardsForUser, addBoardTask, type BoardDoc } from '@/lib/firebaseUserData';
import { useTaskContext } from '@/components/providers/TaskProvider';
import { searchTerms, matchesAll, snippet, splitHits, parseDueHint, mentionsIn, taskTextFrom, minutesHtml, formatTaken } from '@/lib/chatTools';

// --- Types Expansion ---
interface ExtendedChatMessage extends ChatMessage {
  imageUrl?: string;
  /** 写真の撮影日時（EXIF。現場写真は日付が証拠になる） */
  photoTakenAt?: string | null;
}

type SearchHit = { roomId: string; messageId: string; text: string; at: Date; senderId: string };

// --- Helper Components & Functions ---

const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// 安全な日付変換ヘルパー（これがクラッシュを防ぎます）
const toDateSafe = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  // FirestoreのTimestamp型の場合
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // すでにDate型の場合
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // 文字列や数値の場合（ISO文字列など）
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    return d;
  }
  // どれでもない場合は現在時刻を返す（エラー回避）
  return new Date();
};

const LinkifiedText = ({ text, isMe }: { text: string, isMe: boolean }) => {
  if (!text) return null; // テキストがない場合のガード
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a 
              key={i} 
              href={part} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`underline break-all hover:opacity-80 ${isMe ? 'text-blue-100' : 'text-blue-600'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
};

const formatMessageDate = (date: Date) => {
  if (!date) return '';
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && 
                  date.getMonth() === now.getMonth() && 
                  date.getFullYear() === now.getFullYear();
  
  const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) return timeStr;
  
  const year = date.getFullYear().toString().slice(-2);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}/${month}/${day} ${timeStr}`;
};

const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// --- Main Component ---

const YyChat: React.FC = () => {
  const { currentUser, isLoggedIn } = useAuth();

  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{ uid: string; username: string; email: string | null }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [customNicknames, setCustomNicknames] = useState<Record<string, string>>({});
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');

  const [showIconSettings, setShowIconSettings] = useState(false);
  const [iconImageSrc, setIconImageSrc] = useState<string>(''); 
  const [iconPosition, setIconPosition] = useState({ x: 0, y: 0 }); 
  const [iconScale, setIconScale] = useState(1); 
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const roomMenuRef = useRef<HTMLDivElement>(null);

  // 現場チャット: 物件ルーム・検索・議事録・タスク
  const { categories: myTaskCategories, addTask } = useTaskContext();
  const [inputPhotoTaken, setInputPhotoTaken] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState('');
  const [projectName, setProjectName] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [decisionIds, setDecisionIds] = useState<Set<string>>(new Set());
  const [minutesDone, setMinutesDone] = useState('');
  const [taskFor, setTaskFor] = useState<ExtendedChatMessage | null>(null);
  const [taskText, setTaskText] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskTarget, setTaskTarget] = useState('');
  const [taskBoards, setTaskBoards] = useState<BoardDoc[]>([]);
  const [taskDone, setTaskDone] = useState('');
    
  // --- Effects ---

  useEffect(() => {
    setSelectedRoom(null);
    setMessages([]);
    return () => {
      if (typeof window !== 'undefined') localStorage.removeItem('yyChat_activeRoomId');
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
        if (snap.exists() && snap.data().avatarUrl) {
          setUserAvatars(prev => ({ ...prev, [currentUser.uid]: snap.data().avatarUrl }));
        }
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, 'users', currentUser.uid, 'contacts');
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, string> = {};
      snap.forEach(d => { map[d.id] = d.data().nickname; });
      setCustomNicknames(map);
    });
    return () => unsub();
  }, [currentUser]);

  const saveDraft = (roomId: string, text: string) => {
    if (!currentUser) return;
    const key = `yyChat_draft_${currentUser.uid}_${roomId}`;
    text.trim() ? localStorage.setItem(key, text) : localStorage.removeItem(key);
  };
  
  const loadDraft = (roomId: string) => {
    if (!currentUser) return '';
    return localStorage.getItem(`yyChat_draft_${currentUser.uid}_${roomId}`) || '';
  };

  useEffect(() => {
    if (selectedRoom) {
      const draft = loadDraft(selectedRoom.id);
      setInputValue(draft);
      setInputImage(null);
      localStorage.setItem('yyChat_activeRoomId', selectedRoom.id);
      setIsEditingName(false);
    } else {
      localStorage.removeItem('yyChat_activeRoomId');
    }
  }, [selectedRoom?.id]);

  useEffect(() => {
    if (!selectedRoom || !currentUser) {
      setMessages([]);
      return;
    }

    const q = query(collection(db, 'chatRooms', selectedRoom.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: ExtendedChatMessage[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id, roomId: selectedRoom.id, senderId: d.senderId, senderUsername: d.senderUsername,
          content: d.content, imageUrl: d.imageUrl, photoTakenAt: d.photoTakenAt ?? null,
          // ★ここで安全な変換関数を使用
          createdAt: toDateSafe(d.createdAt),
          readAt: d.readAt ? toDateSafe(d.readAt) : undefined,
          readBy: d.readBy || []
        };
      });

      const uids = Array.from(new Set(newMessages.map(m => m.senderId)));
      getUsersByUids(uids).then(users => {
        const names: any = {}, avts: any = {};
        users.forEach(u => {
          if (u.displayName) names[u.uid] = u.displayName;
          if (u.avatarUrl) avts[u.uid] = u.avatarUrl;
        });
        setUserDisplayNames(prev => ({ ...prev, ...names }));
        setUserAvatars(prev => ({ ...prev, ...avts }));
      });

      setMessages(newMessages);
    });
    return () => unsubscribe();
  }, [selectedRoom?.id, currentUser]);

  useEffect(() => {
    if (highlightId) {
      const el = document.getElementById(`msg-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightId]);

  // ルームを替えたら選択・強調をやめる
  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setDecisionIds(new Set());
    setMinutesDone('');
  }, [selectedRoom?.id]);

  // メッセージを実際に閲覧した時のみ実行されるようにガードを強化
  useEffect(() => {
    // selectedRoomがない、または currentUser がいない場合は即終了
    if (!selectedRoom || !currentUser || messages.length === 0) return;

    // 追加：もしコンポーネントが「未読表示用」などで裏側で動いているなら、
    // 画面上の特定の要素（メッセージリスト本体）が存在するかチェック
    if (typeof document !== 'undefined' && !document.querySelector('.chat-message-list')) {
      // メッセージ表示部分がDOMに存在しない場合は何もしない
      return;
    }

    // 自分のメッセージ以外で、かつ自分がまだ既読をつけていないものを抽出
    const unreadMessages = messages.filter(m => 
      m.senderId !== currentUser.uid && 
      !m.readBy?.includes(currentUser.uid)
    );

    // 未読メッセージが1つもない、かつ未読カウントが既に0なら何もしない
    const currentUnreadCount = selectedRoom.unreadCount?.[currentUser.uid] || 0;
    if (unreadMessages.length === 0 && currentUnreadCount === 0) return;

    const timer = setTimeout(() => {
      // 実行時にブラウザのタブがアクティブでない場合は既読にしない（iPhone等のバックグラウンド対策）
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      // 実行時にまだ同じルームを選択しているか再確認（別のルームに切り替えていたら中止）
      // localStorageやStateで「現在アクティブなルームID」を厳密にチェック
      const activeRoomId = localStorage.getItem('yyChat_activeRoomId');
      if (activeRoomId !== selectedRoom.id) {
        return;
      }

      // メッセージ表示部分がDOMに存在するか再確認
      if (typeof document !== 'undefined' && !document.querySelector('.chat-message-list')) {
        return;
      }

      console.log('既読リセット実行:', selectedRoom.id);

      const batch = writeBatch(db);
      let needsBatch = false;

      // 1. 個別のメッセージに既読をつける
      unreadMessages.forEach(m => {
        batch.update(doc(db, 'chatRooms', selectedRoom.id, 'messages', m.id), {
          readBy: arrayUnion(currentUser.uid), 
          readAt: serverTimestamp()
        });
        needsBatch = true;
      });

      // 2. ルーム全体の未読カウントを0にする（カウントがある場合のみ）
      if (currentUnreadCount > 0) {
        batch.update(doc(db, 'chatRooms', selectedRoom.id), { 
          [`unreadCount.${currentUser.uid}`]: 0 
        });
        needsBatch = true;
      }

      if (needsBatch) {
        batch.commit().catch(console.error);
      }
    }, 1500); // 1.5秒程度、実際に「見ている」時間を確保
    
    return () => clearTimeout(timer);
  }, [messages.length, selectedRoom?.id, currentUser?.uid]); 
  // 依存関係を整理：メッセージの「数」が変わった時と、ルームが切り替わった時だけに限定

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'chatRooms'), where('participants', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id, ...data,
            // ★ここでも安全な変換を使用
            createdAt: toDateSafe(data.createdAt),
            lastActivityAt: toDateSafe(data.lastActivityAt),
            lastMessage: data.lastMessage ? { 
              ...data.lastMessage, 
              createdAt: toDateSafe(data.lastMessage.createdAt) 
            } : undefined
          } as ChatRoom;
        })
        // 削除されていないルームのみを表示（deletedByに自分のUIDが含まれていない）
        .filter(room => !room.deletedBy?.includes(currentUser.uid))
        .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
      
      setRooms(list);
      setRoomsLoading(false);
      if (selectedRoom) {
        const current = list.find(r => r.id === selectedRoom.id);
        if (current) setSelectedRoom(current);
        // 削除されたルームが選択されている場合は選択を解除
        else if (selectedRoom.deletedBy?.includes(currentUser.uid)) {
          setSelectedRoom(null);
        }
      }
    });
    return () => unsub();
  }, [currentUser]);

  const loadUsers = async () => {
    setUsersLoading(true);
    const snap = await getDocs(collection(db, 'users'));
    setAvailableUsers(snap.docs.map(d => ({ 
      uid: d.id, username: d.data().displayName || '不明', email: d.data().email 
    })));
    setUsersLoading(false);
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !inputImage) || !selectedRoom || !currentUser) return;
    
    const content = inputValue.trim();
    const imageToSend = inputImage;
    const takenAt = imageToSend ? inputPhotoTaken : null;

    setInputValue('');
    setInputImage(null);
    setInputPhotoTaken(null);
    saveDraft(selectedRoom.id, '');
    
    const tempId = `temp-${Date.now()}`;
    const newMsg: ExtendedChatMessage = {
      id: tempId, roomId: selectedRoom.id, senderId: currentUser.uid, 
      senderUsername: currentUser.username, content, imageUrl: imageToSend || undefined, photoTakenAt: takenAt,
      createdAt: new Date(), readBy: [currentUser.uid]
    };
    setMessages(prev => [...prev, newMsg]);

    try {
      await addDoc(collection(db, 'chatRooms', selectedRoom.id, 'messages'), {
        senderId: currentUser.uid, senderUsername: currentUser.username, 
        content, 
        imageUrl: imageToSend || null,
        ...(takenAt ? { photoTakenAt: takenAt } : {}),
        createdAt: serverTimestamp(), readBy: [currentUser.uid]
      });
      
      const otherUid = selectedRoom.participants.find(u => u !== currentUser.uid);
      const updateData: any = {
        lastMessage: { 
          content: imageToSend ? (content ? content : '画像が送信されました') : content, 
          senderId: currentUser.uid, 
          senderUsername: currentUser.username, 
          createdAt: serverTimestamp() 
        },
        lastActivityAt: serverTimestamp()
      };
      if (otherUid) updateData[`unreadCount.${otherUid}`] = (selectedRoom.unreadCount?.[otherUid] || 0) + 1;
      
      await updateDoc(doc(db, 'chatRooms', selectedRoom.id), updateData);
    } catch (e) {
      console.error(e);
      alert('送信失敗');
    }
  };

  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setInputImage(compressed);
      // 撮影日時（縮小すると EXIF が消えるので、元のファイルから読む）
      setInputPhotoTaken(null);
      try {
        const exifr = await import('exifr');
        const ex = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] });
        const d = ex?.DateTimeOriginal || ex?.CreateDate;
        if (d instanceof Date && !isNaN(d.getTime())) setInputPhotoTaken(formatTaken(d));
      } catch {
        /* EXIF の無い画像（スクショ等）は撮影日時なし */
      }
    } catch (err) {
      console.error(err);
      alert('画像の読み込みに失敗しました');
    }
    e.target.value = '';
  };

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setIconImageSrc(e.target?.result as string);
      setIconPosition({x:0, y:0}); setIconScale(1);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveIcon = async () => {
    if (!currentUser || !iconImageSrc) return;
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = iconImageSrc;
    await new Promise<void>(resolve => { img.onload = () => resolve(); });

    ctx.fillStyle = '#FFF'; ctx.fillRect(0,0,200,200);
    ctx.beginPath(); ctx.arc(100,100,100,0,Math.PI*2); ctx.clip();

    const previewSize = previewContainerRef.current?.clientWidth || 1;
    const scaleRatio = 200 / previewSize;
    
    ctx.translate(100, 100);
    ctx.translate(iconPosition.x * scaleRatio, iconPosition.y * scaleRatio);
    ctx.scale(iconScale * scaleRatio, iconScale * scaleRatio);
    ctx.drawImage(img, -img.naturalWidth/2, -img.naturalHeight/2);

    const url = canvas.toDataURL('image/png');
    await setDoc(doc(db, 'users', currentUser.uid), { avatarUrl: url }, { merge: true });
    setUserAvatars(prev => ({ ...prev, [currentUser.uid]: url }));
    setShowIconSettings(false);
    setIconImageSrc('');
  };

  const handleRemoveIcon = async () => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), { avatarUrl: deleteField() });
    setUserAvatars(prev => { const n = {...prev}; delete n[currentUser.uid]; return n; });
    setIconImageSrc('');
  };

  const toggleRoomAvatarVisibility = async () => {
    if (!selectedRoom || !currentUser) return;
    const isHidden = selectedRoom.hiddenAvatarUserIds?.includes(currentUser.uid);
    await updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
      hiddenAvatarUserIds: isHidden ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  const handleSaveNickname = async () => {
    if (!currentUser || !selectedRoom) return;
    const otherUid = selectedRoom.participants.find(u => u !== currentUser.uid);
    if (!otherUid) return;

    try {
      if (!editingNameValue.trim()) {
        await setDoc(doc(db, 'users', currentUser.uid, 'contacts', otherUid), { nickname: null }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', currentUser.uid, 'contacts', otherUid), {
          nickname: editingNameValue.trim()
        }, { merge: true });
      }
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to save nickname", error);
    }
  };

  const getDisplayName = (uid: string) => {
    if (uid === currentUser?.uid) return currentUser?.username || '';
    if (customNicknames[uid]) return customNicknames[uid];
    return userDisplayNames[uid] || 'ユーザー';
  };

  const getOtherParticipantUid = (room: ChatRoom) => {
    return room.participants.find(u => u !== currentUser?.uid);
  };

  const getOtherParticipantName = (room: ChatRoom) => {
    if (!currentUser) return '';
    const otherUid = getOtherParticipantUid(room);
    if (!otherUid) return '不明';
    return customNicknames[otherUid] || userDisplayNames[otherUid] || room.participantUsernames[otherUid] || '不明';
  };

  const roomLabel = (room: ChatRoom) => getOtherParticipantName(room) + (room.project ? ` / ${room.project}` : '');
  const projectNames = Array.from(new Set(rooms.map((r) => r.project).filter((p): p is string => !!p))).sort();
  const visibleRooms = roomFilter ? rooms.filter((r) => r.project === roomFilter) : rooms;
  const terms = searchTerms(searchQ);

  /** 全ルームを横断して探す（参加しているルームだけ。最近の 40 ルームまで） */
  const runSearch = async () => {
    const t = searchTerms(searchQ);
    if (!t.length || !currentUser) {
      setSearchHits(null);
      return;
    }
    setSearching(true);
    try {
      const hits: SearchHit[] = [];
      const targets = (roomFilter ? rooms.filter((r) => r.project === roomFilter) : rooms).slice(0, 40);
      const snaps = await Promise.all(targets.map((room) => getDocs(collection(db, 'chatRooms', room.id, 'messages')).then((sn) => ({ room, sn }))));
      for (const { room, sn } of snaps) {
        sn.forEach((d) => {
          const data = d.data();
          const text = String(data.content ?? '');
          if (matchesAll(text, t)) hits.push({ roomId: room.id, messageId: d.id, text, at: toDateSafe(data.createdAt), senderId: data.senderId });
        });
      }
      hits.sort((a, b) => b.at.getTime() - a.at.getTime());
      setSearchHits(hits.slice(0, 200));
    } catch (e) {
      console.error('チャット検索に失敗', e);
      setSearchHits([]);
    } finally {
      setSearching(false);
    }
  };

  const createProjectRoom = async (project: string) => {
    if (!currentUser || !selectedRoom) return;
    const otherUid = getOtherParticipantUid(selectedRoom);
    if (!otherUid || !project.trim()) return;
    const existing = rooms.find((r) => r.participants.includes(otherUid) && r.project === project.trim());
    if (existing) {
      setSelectedRoom(existing);
    } else {
      const ref = doc(collection(db, 'chatRooms'));
      const newRoom = {
        id: ref.id, participants: [currentUser.uid, otherUid], project: project.trim(),
        participantUsernames: selectedRoom.participantUsernames,
        createdAt: new Date(), lastActivityAt: new Date(),
      };
      await setDoc(ref, { ...newRoom, createdAt: serverTimestamp(), lastActivityAt: serverTimestamp() });
      setSelectedRoom(newRoom as any);
    }
    setProjectName('');
    setShowRoomMenu(false);
  };

  const renameProject = async (project: string) => {
    if (!selectedRoom) return;
    await updateDoc(doc(db, 'chatRooms', selectedRoom.id), { project: project.trim() ? project.trim() : deleteField() });
    setProjectName('');
    setShowRoomMenu(false);
  };

  const toggleIn = (set: Set<string>, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  };

  /** 選んだ発言をメモの議事録にする（フォルダは物件名、無ければ「議事録」） */
  const saveMinutes = async () => {
    if (!currentUser || !selectedRoom || !selectedIds.size) return;
    const lines = messages.filter((m) => selectedIds.has(m.id) && !m.id.startsWith('temp-'));
    const label = roomLabel(selectedRoom);
    const html = minutesHtml({ room: label, lines, nameOf: getDisplayName, decisions: decisionIds });
    const now = Date.now();
    const folder = selectedRoom.project || '議事録';
    await addDoc(collection(db, 'users', currentUser.uid, 'memos'), {
      title: `${label} 打合せ ${new Date().toLocaleDateString('ja-JP')}`,
      content: html, category: folder, tags: ['yychat'],
      createdAt: now, updatedAt: now, isFavorite: false, isLocked: false, order: -now,
    });
    setMinutesDone(`メモの「${folder}」に ${lines.length} 件の議事録を作りました`);
    setSelectMode(false);
    setSelectedIds(new Set());
    setDecisionIds(new Set());
  };

  const openTask = (m: ExtendedChatMessage) => {
    setTaskFor(m);
    const base = taskTextFrom(m.content) || '（写真の確認）';
    setTaskText(selectedRoom?.project ? `【${selectedRoom.project}】${base}` : base);
    setTaskDue(parseDueHint(m.content, new Date()) ?? '');
    setTaskTarget(`my:${myTaskCategories[0]?.id ?? '1'}`);
    setTaskDone('');
    if (currentUser) listBoardsForUser(currentUser.uid).then(setTaskBoards).catch(() => setTaskBoards([]));
  };

  const saveTask = async () => {
    if (!taskFor || !selectedRoom || !taskText.trim()) return;
    const [kind, id] = [taskTarget.slice(0, taskTarget.indexOf(':')), taskTarget.slice(taskTarget.indexOf(':') + 1)];
    try {
      if (kind === 'my') {
        await addTask(id, taskText.trim(), taskDue || null);
      } else {
        const board = taskBoards.find((b) => b.id === id);
        // @相手 と書かれていて、相手がそのボードのメンバーなら担当にする
        const other = getOtherParticipantUid(selectedRoom);
        const otherName = other ? getDisplayName(other) : '';
        const mentioned = !!other && mentionsIn(taskFor.content).some((n) => otherName.includes(n) || n.includes(otherName));
        const member = !!board && !!other && (board.ownerUid === other || board.memberUids.includes(other));
        await addBoardTask(id, {
          title: taskText.trim(), completed: false, dueDate: taskDue || null, priority: 'medium',
          assigneeUid: mentioned && member ? other! : null,
          details: `yychat（${roomLabel(selectedRoom)}）${formatMessageDate(taskFor.createdAt)} ${getDisplayName(taskFor.senderId)}:\n${taskFor.content}`,
        });
      }
      setTaskDone(`「${taskText.trim()}」を追加しました`);
    } catch (e) {
      console.error('タスクの追加に失敗', e);
      setTaskDone('追加できませんでした');
    }
  };

  const getAvatarUrl = (uid: string, roomId?: string) => {
    if (!roomId || !currentUser) return userAvatars[uid];
    
    const room = rooms.find(r => r.id === roomId);
    if (!room) return userAvatars[uid];
    
    // 自分のアイコンを表示しようとしている場合
    if (uid === currentUser.uid) {
      // 自分のアイコンは常に表示する（自分の設定に関わらず、相手側でも表示される）
      return userAvatars[uid];
    }
    
    // 相手のアイコンを表示しようとしている場合
    // 自分が「この相手(uid)のアイコンを隠す」設定にしているならnullを返す
    if (room.hiddenAvatarUserIds?.includes(uid)) {
      return null;
    }
    
    return userAvatars[uid];
  };

  // 未ログインでも帯は出す。帯が無いとツール名が画面から消えてしまう。
  if (!isLoggedIn || !currentUser) {
    return (
      <div>
        <ToolHeader
          title="yychat"
          description="現場チャット。物件ごとに部屋を分け、全ルームを横断して検索。写真には撮影日時が付き、発言はそのままタスクや議事録（メモ）にできます"
        />
        <div className="p-4">ログインしてください</div>
      </div>
    );
  }

  return (
    <div className="pt-0 pb-4">
      <ToolHeader
        title="yychat"
        description="現場チャット。物件ごとに部屋を分け、全ルームを横断して検索。写真には撮影日時が付き、発言はそのままタスクや議事録（メモ）にできます"
      />
      <div className="flex h-[600px] bg-white border border-[#3b3b3b] overflow-hidden font-sans mx-4 mt-3">
      <div className={`${selectedRoom ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-col border-r bg-gray-50`}>
        <div className="px-4 py-3 bg-white border-b flex items-center justify-between shadow-sm z-10">
          <div 
             className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg -ml-1 transition"
             onClick={() => setShowIconSettings(true)}
             title="自分のプロフィール設定"
          >
             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm overflow-hidden border-2 border-white">
                {userAvatars[currentUser.uid] ? (
                  <img src={userAvatars[currentUser.uid]} className="w-full h-full object-cover" />
                ) : currentUser.username[0]}
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-bold text-gray-800 leading-tight">{currentUser.username}</span>
               <span className="text-[10px] text-gray-400">マイページ</span>
             </div>
          </div>
          <div className="flex gap-1">
             <button 
              onClick={() => setShowIconSettings(true)}
              className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition"
              title="設定"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
            <button 
              onClick={() => { setShowUserSelect(true); loadUsers(); }}
              className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-sm"
              title="新規チャット"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
        </div>

        {!showUserSelect && (
          <div className="px-2 py-2 border-b bg-white space-y-1.5">
            <input
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); if (!e.target.value.trim()) setSearchHits(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }}
              placeholder="全ルームを検索（Enter）"
              className="w-full text-xs border px-2 py-1.5 focus:outline-none focus:border-gray-700"
            />
            {projectNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {['', ...projectNames].map((p) => (
                  <button
                    key={p || '__all'}
                    type="button"
                    onClick={() => setRoomFilter(p)}
                    className={`text-[10px] px-1.5 py-0.5 border ${roomFilter === p ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    {p || 'すべて'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {!showUserSelect && (searching || searchHits) ? (
            <div>
              <div className="px-3 py-1.5 text-[10px] text-gray-500 flex justify-between">
                <span>{searching ? '検索中…' : `${searchHits!.length} 件`}</span>
                <button type="button" className="underline" onClick={() => { setSearchHits(null); setSearchQ(''); setHighlightId(null); }}>閉じる</button>
              </div>
              {searchHits?.map((h) => {
                const room = rooms.find((r) => r.id === h.roomId);
                return (
                  <button
                    key={h.roomId + h.messageId}
                    type="button"
                    onClick={() => { if (room) { setHighlightId(h.messageId); setSelectedRoom(room); } }}
                    className="w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-white"
                  >
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span className="truncate">{room ? roomLabel(room) : ''}</span>
                      <span className="shrink-0 ml-1">{formatMessageDate(h.at)}</span>
                    </div>
                    <div className="text-xs text-gray-700 break-words">
                      {splitHits(snippet(h.text, terms), terms).map(([t, hit], i) => (hit ? <mark key={i} className="bg-yellow-200">{t}</mark> : <span key={i}>{t}</span>))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : showUserSelect ? (
            <div className="p-2">
              <div className="flex items-center gap-2 mb-2 p-1">
                <button onClick={() => setShowUserSelect(false)} className="text-xs text-gray-500 hover:text-gray-800">← 戻る</button>
                <input 
                  className="flex-1 text-xs border rounded px-2 py-1.5 focus:outline-none focus:border-blue-500" 
                  placeholder="ユーザー検索..." 
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                />
              </div>
              {usersLoading ? <div className="text-xs p-4 text-center text-gray-400">読み込み中...</div> : (
                <div className="space-y-0.5">
                  {availableUsers
                    .filter(u => u.uid !== currentUser.uid && (u.username.includes(userSearchTerm) || u.email?.includes(userSearchTerm)))
                    .map(u => (
                      <div key={u.uid} 
                        onClick={async () => {
                          const existing = rooms.find(r => r.participants.includes(u.uid) && r.participants.length === 2 && !r.project);
                          if (existing) {
                            setSelectedRoom(existing);
                          } else {
                            const ref = doc(collection(db, 'chatRooms'));
                            const newRoom = {
                              id: ref.id, participants: [currentUser.uid, u.uid],
                              participantUsernames: { [currentUser.uid]: currentUser.username, [u.uid]: u.username },
                              createdAt: new Date(), lastActivityAt: new Date()
                            };
                            await setDoc(ref, { ...newRoom, createdAt: serverTimestamp(), lastActivityAt: serverTimestamp() });
                            setSelectedRoom(newRoom as any);
                          }
                          setShowUserSelect(false);
                        }}
                        className="p-2 hover:bg-white rounded-lg cursor-pointer flex items-center gap-2 transition"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-white text-[10px] overflow-hidden">
                          {getAvatarUrl(u.uid) ? <img src={getAvatarUrl(u.uid)!} className="w-full h-full object-cover"/> : u.username[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700">{u.username}</div>
                          <div className="text-[10px] text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {visibleRooms.length === 0 && <div className="p-8 text-xs text-center text-gray-400">チャットルームがありません</div>}
              {visibleRooms.map(room => {
                const otherUid = room.participants.find(u => u !== currentUser.uid);
                const isActive = selectedRoom?.id === room.id;
                const unread = room.unreadCount?.[currentUser.uid] || 0;
                const lastMsg = room.lastMessage?.content || '';
                
                return (
                  <div key={room.id}
                    onClick={() => { setHighlightId(null); setSelectedRoom(room); }}
                    className={`px-3 py-2.5 cursor-pointer transition flex gap-3 items-center border-b border-transparent hover:bg-white ${isActive ? 'bg-white border-l-4 border-l-blue-500 shadow-sm' : 'hover:bg-opacity-60 border-l-4 border-l-transparent'}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold overflow-hidden border border-gray-100">
                      {otherUid && getAvatarUrl(otherUid, room.id) ? (
                        <img src={getAvatarUrl(otherUid, room.id)!} className="w-full h-full object-cover" />
                      ) : getOtherParticipantName(room)[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className={`text-sm font-medium truncate ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                          {getOtherParticipantName(room)}
                          {room.project && <span className="ml-1 text-[10px] font-normal px-1 border border-gray-300 text-gray-500">{room.project}</span>}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                          {room.lastActivityAt ? formatMessageDate(room.lastActivityAt) : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="text-xs text-gray-500 truncate max-w-[140px] h-4 leading-4 block">
                            {lastMsg || <span className="text-gray-300 italic">No messages</span>}
                        </span>
                        {unread > 0 && <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">{unread}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={`${!selectedRoom ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#F3F4F6] relative`}>
        {!selectedRoom ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
            <p className="text-sm font-medium">チャットを選択してください</p>
          </div>
        ) : (
          <>
            <div className="h-14 px-4 bg-white/90 backdrop-blur-sm border-b flex items-center justify-between shadow-sm z-10 sticky top-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedRoom(null)} className="md:hidden text-gray-500 hover:text-gray-800">←</button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                    {(() => {
                      const uid = selectedRoom.participants.find(u => u !== currentUser.uid);
                      const url = uid ? getAvatarUrl(uid, selectedRoom.id) : null;
                      return url ? <img src={url} className="w-full h-full object-cover"/> : getOtherParticipantName(selectedRoom)[0];
                    })()}
                  </div>
                  
                  {isEditingName ? (
                    <div className="flex items-center gap-1">
                        <input 
                            autoFocus
                            className="text-sm border-b border-blue-500 px-1 py-0.5 focus:outline-none min-w-[120px]"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNickname();
                                if (e.key === 'Escape') setIsEditingName(false);
                            }}
                            placeholder="表示名を入力..."
                        />
                        <button onClick={handleSaveNickname} className="text-blue-600 text-xs hover:bg-blue-50 p-1 rounded">完了</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                        const currentName = getOtherParticipantName(selectedRoom);
                        setEditingNameValue(currentName === '不明' ? '' : currentName);
                        setIsEditingName(true);
                    }}>
                        <h2 className="font-bold text-gray-800 text-sm truncate">{getOtherParticipantName(selectedRoom)}</h2>
                        {selectedRoom.project && <span className="text-[10px] px-1 border border-gray-400 text-gray-600 shrink-0">{selectedRoom.project}</span>}
                        <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative shrink-0" ref={roomMenuRef}>
                <button onClick={() => setShowRoomMenu(!showRoomMenu)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                </button>
                {showRoomMenu && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-20 py-1">
                     <div className="px-3 py-2 space-y-1.5">
                       <div className="text-[11px] font-medium text-gray-700">物件ルーム</div>
                       <input
                         value={projectName}
                         onChange={(e) => setProjectName(e.target.value)}
                         placeholder={selectedRoom.project || '物件名（A邸 新築工事）'}
                         className="w-full text-xs border px-2 py-1 focus:outline-none focus:border-gray-700"
                       />
                       <div className="flex gap-1">
                         <button type="button" disabled={!projectName.trim()} onClick={() => void createProjectRoom(projectName)} className="flex-1 text-[10px] px-1 py-1 border border-[#3b3b3b] disabled:opacity-40">この相手と新しく作る</button>
                         <button type="button" onClick={() => void renameProject(projectName)} className="flex-1 text-[10px] px-1 py-1 border border-gray-300" title="空のまま押すと物件名を外す">この部屋の名前にする</button>
                       </div>
                       <p className="text-[10px] text-gray-400 leading-snug">同じ相手でも物件ごとに部屋を分けると、どの現場の話かが混ざりません</p>
                     </div>
                     <div className="border-t border-gray-100 my-1"></div>
                     <button
                        onClick={() => { setSelectMode(true); setShowRoomMenu(false); setMinutesDone(''); }}
                        className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <div className="font-medium">発言を選んで議事録にする</div>
                        <div className="text-[10px] text-gray-400">メモに保存。決定事項はチェック項目になります</div>
                      </button>
                     <div className="border-t border-gray-100 my-1"></div>
                     <button
                        onClick={toggleRoomAvatarVisibility}
                        className="w-full text-left px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">自分のアイコンを表示</div>
                          <div className="text-[10px] text-gray-400">OFFでイニシャル表示</div>
                        </div>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${!selectedRoom.hiddenAvatarUserIds?.includes(currentUser.uid) ? 'bg-blue-500' : 'bg-gray-300'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${!selectedRoom.hiddenAvatarUserIds?.includes(currentUser.uid) ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={async () => {
                          if (!selectedRoom || !currentUser) return;
                          if (confirm('このチャットを削除しますか？相手側には表示され続けます。')) {
                            try {
                              await updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
                                deletedBy: arrayUnion(currentUser.uid)
                              });
                              setSelectedRoom(null);
                              setShowRoomMenu(false);
                            } catch (error) {
                              console.error('Failed to delete room:', error);
                              alert('チャットの削除に失敗しました');
                            }
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="font-medium">チャットを削除</span>
                      </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-[#F3F4F6] chat-message-list">
              {messages.map((m, i) => {
                const isMe = m.senderId === currentUser.uid;
                const avatarUrl = getAvatarUrl(m.senderId, selectedRoom.id);
                const name = getDisplayName(m.senderId);
                const prev = messages[i-1];
                const isSequence = prev && prev.senderId === m.senderId && (m.createdAt.getTime() - prev.createdAt.getTime() < 60000);

                return (
                  <div key={m.id} id={`msg-${m.id}`} className={`flex gap-1.5 ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-0.5' : 'mt-2'} ${highlightId === m.id ? 'bg-yellow-100/70 -mx-2 px-2 py-1' : ''}`}>
                    {selectMode && (
                      <div className="flex flex-col items-center justify-center gap-0.5 order-first shrink-0">
                        <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => setSelectedIds((p) => toggleIn(p, m.id))} aria-label="議事録に入れる" />
                        {selectedIds.has(m.id) && (
                          <button type="button" onClick={() => setDecisionIds((p) => toggleIn(p, m.id))} className={`text-[9px] px-1 border ${decisionIds.has(m.id) ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white text-gray-500 border-gray-300'}`} title="決定事項として議事録の先頭に出す">
                            決定
                          </button>
                        )}
                      </div>
                    )}
                    {!isMe && (
                      <div className="flex flex-col justify-end">
                         <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center overflow-hidden text-[9px] text-white">
                           {!isSequence && (avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : name[0])}
                         </div>
                      </div>
                    )}
                    {isMe && !isSequence && (
                      <div className="flex flex-col justify-end">
                         <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center overflow-hidden text-[9px] text-white">
                           {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : name[0]}
                         </div>
                      </div>
                    )}
                    <div className={`max-w-[75%] group relative`}>
                      {!isMe && !isSequence && <div className="text-[9px] text-gray-400 mb-0.5 ml-1">{name}</div>}
                      <div className={`px-3 py-1.5 text-sm shadow-sm break-words whitespace-pre-wrap ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                      }`}>
                        {m.imageUrl && (
                          <div className="mb-1 rounded-lg overflow-hidden border border-black/10">
                            <img src={m.imageUrl} alt="添付画像" className="max-w-full h-auto object-cover" />
                            {m.photoTakenAt && (
                              <div className={`text-[9px] px-1.5 py-0.5 ${isMe ? 'bg-blue-700 text-blue-100' : 'bg-gray-50 text-gray-500'}`}>撮影 {m.photoTakenAt}</div>
                            )}
                          </div>
                        )}
                        {terms.length > 0 && searchHits ? (
                          splitHits(m.content, terms).map(([t, hit], i) => (hit ? <mark key={i} className="bg-yellow-200 text-gray-900">{t}</mark> : <React.Fragment key={i}>{t}</React.Fragment>))
                        ) : (
                          <LinkifiedText text={m.content} isMe={isMe} />
                        )}
                      </div>
                      <div className={`text-[9px] text-gray-400 mt-0.5 flex gap-1 items-center ${isMe ? 'justify-end' : 'justify-start'} opacity-70`}>
                        {formatMessageDate(m.createdAt)}
                        {!m.id.startsWith('temp-') && (
                          <button
                            type="button"
                            onClick={() => openTask(m)}
                            className="ml-1 text-gray-400 hover:text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity underline"
                            title="この発言をタスクにする（@名前 と期限を読み取ります）"
                          >
                            タスク
                          </button>
                        )}
                        {isMe && (
                           <span>
                             {selectedRoom.participants.find(u => u !== currentUser.uid) && m.readBy?.includes(selectedRoom.participants.find(u => u !== currentUser.uid)!) ? ' 既読' : ''}
                           </span>
                        )}
                        {isMe && (
                          <button
                            onClick={async () => {
                              if (!selectedRoom || !currentUser) return;
                              if (confirm('このメッセージを削除しますか？')) {
                                try {
                                  await deleteDoc(doc(db, 'chatRooms', selectedRoom.id, 'messages', m.id));
                                  // 最後のメッセージが削除された場合、ルームのlastMessageを更新
                                  const remainingMessages = messages.filter(msg => msg.id !== m.id);
                                  if (remainingMessages.length > 0) {
                                    const lastMsg = remainingMessages[remainingMessages.length - 1];
                                    await updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
                                      lastMessage: {
                                        content: lastMsg.imageUrl ? (lastMsg.content ? lastMsg.content : '画像が送信されました') : lastMsg.content,
                                        senderId: lastMsg.senderId,
                                        senderUsername: lastMsg.senderUsername,
                                        createdAt: serverTimestamp()
                                      }
                                    });
                                  } else {
                                    // メッセージがなくなった場合
                                    await updateDoc(doc(db, 'chatRooms', selectedRoom.id), {
                                      lastMessage: deleteField()
                                    });
                                  }
                                } catch (error) {
                                  console.error('Failed to delete message:', error);
                                  alert('メッセージの削除に失敗しました');
                                }
                              }
                            }}
                            className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="メッセージを削除"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {minutesDone && !selectMode && (
              <div className="px-3 py-1 text-[11px] bg-green-50 text-green-800 border-t flex justify-between">
                <span>{minutesDone}</span>
                <button type="button" className="underline" onClick={() => setMinutesDone('')}>閉じる</button>
              </div>
            )}
            {selectMode ? (
              <div className="p-2 bg-white border-t flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-600">{selectedIds.size} 件選択（うち決定 {decisionIds.size}）</span>
                <button type="button" onClick={() => setSelectedIds(new Set(messages.filter((m) => !m.id.startsWith('temp-')).map((m) => m.id)))} className="px-2 py-1 border border-gray-300">すべて</button>
                <div className="flex-1" />
                <button type="button" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); setDecisionIds(new Set()); }} className="px-2 py-1 border border-gray-300">やめる</button>
                <button type="button" disabled={!selectedIds.size} onClick={() => void saveMinutes()} className="px-3 py-1 bg-[#3b3b3b] text-white disabled:opacity-40">メモの議事録へ</button>
              </div>
            ) : (
            <div className="p-2 bg-white border-t">
              {inputImage && (
                <div className="px-2 pb-2 flex items-center">
                   <div className="relative group">
                      <img src={inputImage} className="h-16 rounded border border-gray-200" alt="preview" />
                      <button 
                        onClick={() => setInputImage(null)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-gray-800"
                      >✕</button>
                   </div>
                   <div className="ml-2 text-xs text-gray-400">画像を送信します{inputPhotoTaken ? `（撮影 ${inputPhotoTaken}）` : ''}</div>
                </div>
              )}

              <div className="flex gap-2 items-end bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-sm transition-all">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                  title="画像を添付"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleSelectImage}
                />

                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={e => {
                    setInputValue(e.target.value);
                    saveDraft(selectedRoom.id, e.target.value);
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
                    }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="メッセージを入力..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none max-h-[100px] py-1 px-1"
                  rows={1}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() && !inputImage}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition mb-0.5 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              </div>
            </div>
            )}
          </>
        )}
      </div>

      <ModalPortal>
        {taskFor && selectedRoom && (
          <div className="fixed inset-x-0 bottom-0 bg-black/40 z-[9999] flex items-start justify-center p-4 pt-16" style={{ top: 'var(--nav-height, 35px)' }} onClick={() => setTaskFor(null)}>
            <div className="bg-white w-full max-w-md border border-[#3b3b3b] p-4 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[13px]">発言をタスクにする</span>
                <button type="button" onClick={() => setTaskFor(null)} aria-label="閉じる">✕</button>
              </div>
              <div className="text-[11px] text-gray-500 border-l-2 border-gray-300 pl-2 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                {getDisplayName(taskFor.senderId)}: {taskFor.content || '（写真）'}
              </div>
              <label className="block">
                <span className="text-gray-500">内容</span>
                <input value={taskText} onChange={(e) => setTaskText(e.target.value)} className="w-full border px-2 py-1 mt-0.5" />
              </label>
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="text-gray-500">期限{taskDue && parseDueHint(taskFor.content, new Date()) === taskDue ? '（文面から）' : ''}</span>
                  <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="w-full border px-2 py-1 mt-0.5" />
                </label>
                <label className="flex-1">
                  <span className="text-gray-500">追加先</span>
                  <select value={taskTarget} onChange={(e) => setTaskTarget(e.target.value)} className="w-full border px-1 py-1 mt-0.5">
                    <optgroup label="Myタスク">
                      {myTaskCategories.map((c) => <option key={c.id} value={`my:${c.id}`}>{c.title}</option>)}
                    </optgroup>
                    {taskBoards.length > 0 && (
                      <optgroup label="Teamタスク">
                        {taskBoards.map((b) => <option key={b.id} value={`team:${b.id}`}>{b.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </label>
              </div>
              {taskTarget.startsWith('team:') && mentionsIn(taskFor.content).length > 0 && (
                <p className="text-[10px] text-gray-500">@{mentionsIn(taskFor.content).join(' @')} — 相手がこのボードのメンバーなら担当に入ります</p>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                {taskDone && <span className="text-[11px] text-green-700 mr-auto">{taskDone}</span>}
                <button type="button" onClick={() => setTaskFor(null)} className="px-3 py-1 border border-gray-300">閉じる</button>
                <button type="button" disabled={!taskText.trim()} onClick={() => void saveTask()} className="px-3 py-1 bg-[#3b3b3b] text-white disabled:opacity-40">追加</button>
              </div>
            </div>
          </div>
        )}
        {showIconSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">プロフィール設定</h3>
                <button onClick={() => { setShowIconSettings(false); setIconImageSrc(''); }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {!iconImageSrc ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shadow-inner text-3xl text-gray-400 relative group">
                      {userAvatars[currentUser.uid] ? (
                        <img src={userAvatars[currentUser.uid]} className="w-full h-full object-cover" />
                      ) : currentUser.username[0]}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition" />
                    </div>
                    {userAvatars[currentUser.uid] && (
                      <button onClick={handleRemoveIcon} className="text-sm text-red-500 hover:underline">
                        写真を削除
                      </button>
                    )}
                  </div>
                  
                  <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition group">
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
                    <div className="text-xl mb-1 group-hover:scale-110 transition">📷</div>
                    <span className="text-sm font-bold text-gray-500 group-hover:text-blue-600">画像をアップロード</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div 
                    ref={previewContainerRef}
                    className="relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-move border shadow-inner"
                    onMouseDown={e => { setIsDragging(true); setDragStart({x: e.clientX-iconPosition.x, y: e.clientY-iconPosition.y}); }}
                    onMouseMove={e => { if(isDragging) setIconPosition({x: e.clientX-dragStart.x, y: e.clientY-dragStart.y}); }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                  >
                    <img 
                      src={iconImageSrc} 
                      className="absolute max-w-none select-none pointer-events-none"
                      style={{
                        left: '50%', top: '50%',
                        transform: `translate(-50%, -50%) translate(${iconPosition.x}px, ${iconPosition.y}px) scale(${iconScale})`
                      }}
                    />
                    <div className="absolute inset-0 pointer-events-none" 
                         style={{background: 'radial-gradient(circle at center, transparent 48%, rgba(0,0,0,0.5) 49%)'}}></div>
                  </div>
                  
                  <div className="flex items-center gap-3 px-2">
                    <span className="text-xs text-gray-500">－</span>
                    <input type="range" min="0.5" max="3" step="0.1" value={iconScale} onChange={e => setIconScale(parseFloat(e.target.value))} className="flex-1 accent-blue-600 h-1 bg-gray-200 rounded-lg appearance-none" />
                    <span className="text-xs text-gray-500">＋</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setIconImageSrc('')} className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">キャンセル</button>
                    <button onClick={handleSaveIcon} className="flex-1 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-bold shadow-md">保存して適用</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalPortal>
      </div>
    </div>
  );
};

export default YyChat;
