'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

/**
 * チャット通知を監視するコンポーネント
 * チャット画面を開いていなくても、メッセージ受信時に通知を表示する
 */
const ChatNotificationListener = () => {
  const { currentUser } = useAuth();

  // メッセージ単位の重複防止
  const processedMessageKeysRef = useRef<Set<string>>(new Set());

  // 初回読み込み時の大量通知を防ぐフラグ
  const isInitialLoadRef = useRef(true);

  // ユーザーのdisplayNameをキャッシュ
  const userDisplayNamesRef = useRef<Record<string, string>>({});

  // ルームごとの前回の未読数を記録
  const lastUnreadCountsRef = useRef<Record<string, number>>({});

  // 同じ人からの短時間連投を5分でまとめる
  const lastNotifyTimesRef = useRef<Record<string, number>>({});
  const FIVE_MIN = 5 * 60 * 1000; // 5分（ミリ秒）

  useEffect(() => {
    if (!currentUser) {
      console.log('[ChatNotificationListener] currentUserがnullのため終了');
      return;
    }

    console.log('[ChatNotificationListener] 初期化開始, currentUser:', currentUser.uid);

    // 通知設定を確認
    const savedSetting = localStorage.getItem('yyChat_notification_enabled');
    let isEnabled = false;
    if (savedSetting) {
      try {
        isEnabled = JSON.parse(savedSetting);
      } catch {
        isEnabled = savedSetting === 'true';
      }
    }
    console.log('[ChatNotificationListener] 通知設定:', { savedSetting, isEnabled });
    if (typeof window !== 'undefined' && 'Notification' in window) {
      console.log('[ChatNotificationListener] 通知許可状態:', Notification.permission);
    } else {
      console.log('[ChatNotificationListener] 通知許可状態: ブラウザが通知をサポートしていません');
    }

    // 自分が参加しているチャットルームを監視
    const roomsRef = collection(db, 'chatRooms');
    const q = query(roomsRef, where('participants', 'array-contains', currentUser.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const changes = snapshot.docChanges();
      console.log('[ChatNotificationListener] onSnapshot発火 - 変更数:', changes.length, '総ルーム数:', snapshot.docs.length);

      // 初回ロード時は通知しない
      if (isInitialLoadRef.current) {
        console.log('[ChatNotificationListener] 初回ロード処理');
        isInitialLoadRef.current = false;

        // 全ルームについて現在の未読数を保存し、既存のlastMessageをprocessedMessageKeysRefに登録
        snapshot.docs.forEach((doc) => {
          const roomData = doc.data();
          const roomId = doc.id;

          // 現在の未読数を記録
          const currentUnread = roomData.unreadCount?.[currentUser.uid] || 0;
          lastUnreadCountsRef.current[roomId] = currentUnread;

          console.log('[ChatNotificationListener] 初回ロード - ルーム:', roomId, '未読数:', currentUnread);

          // lastMessageがある場合、その内容をprocessedMessageKeysRefに登録
          const lastMsg = roomData.lastMessage;
          if (lastMsg && lastMsg.senderId !== currentUser.uid) {
            const msgKey = `${roomId}_${lastMsg.senderId}_${lastMsg.content}`;
            processedMessageKeysRef.current.add(msgKey);
          }
        });

        return;
      }

      // 変更があったルームを処理
      changes.forEach(async (change) => {
        console.log('[ChatNotificationListener] 変更検知 - タイプ:', change.type, 'ルームID:', change.doc.id);

        // 'modified' は既存のルームに更新があった場合（新着メッセージなど）
        // 'added' は新しいルームが作られた場合
        if (change.type === 'modified' || change.type === 'added') {
          const roomData = change.doc.data();
          const roomId = change.doc.id;
          const lastMsg = roomData.lastMessage;

          console.log('[ChatNotificationListener] ルーム詳細:', {
            roomId,
            hasLastMsg: !!lastMsg,
            senderId: lastMsg?.senderId,
            currentUserId: currentUser.uid,
            unreadCount: roomData.unreadCount?.[currentUser.uid],
          });

          // lastMessageが存在しない、または送信者が自分の場合はスキップ
          if (!lastMsg || lastMsg.senderId === currentUser.uid) {
            console.log('[ChatNotificationListener] スキップ: lastMessageなし or 自分が送信');
            return;
          }

          // 未読件数が増えたときだけ通知候補とする
          const currentUnread = roomData.unreadCount?.[currentUser.uid] || 0;
          const prevUnread = lastUnreadCountsRef.current[roomId] || 0;

          console.log('[ChatNotificationListener] 未読数チェック:', {
            roomId,
            currentUnread,
            prevUnread,
            isIncreased: currentUnread > prevUnread,
          });

          // 未読数が増えていない場合は通知しない
          if (currentUnread <= prevUnread) {
            console.log('[ChatNotificationListener] スキップ: 未読数が増えていない (', currentUnread, '<=', prevUnread, ')');
            // 未読数を更新（既読になった場合など）
            lastUnreadCountsRef.current[roomId] = currentUnread;
            return;
          }

          // 未読数が増えた場合のみ処理を続行
          lastUnreadCountsRef.current[roomId] = currentUnread;
          console.log('[ChatNotificationListener] ✓ 未読数が増加！通知処理を続行');

          // メッセージの一意性を確認（重複通知を防ぐ）
          const msgKey = `${roomId}_${lastMsg.senderId}_${lastMsg.content}`;

          if (processedMessageKeysRef.current.has(msgKey)) {
            console.log('[ChatNotificationListener] スキップ: 既に処理済みのメッセージ');
            return;
          }

          processedMessageKeysRef.current.add(msgKey);

          // 見ている最中は鳴らさない
          const activeRoomId = typeof window !== 'undefined'
            ? localStorage.getItem('yyChat_activeRoomId')
            : null;
          const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';

          console.log('[ChatNotificationListener] 画面状態チェック:', {
            activeRoomId,
            roomId,
            isVisible,
            shouldSkip: isVisible && activeRoomId === roomId,
          });

          if (isVisible && activeRoomId === roomId) {
            console.log('[ChatNotificationListener] スキップ: チャット画面が開いている');
            return;
          }

          // 同じ人からの短時間連投を5分でまとめる
          const now = Date.now();
          const notifyKey = `${roomId}_${lastMsg.senderId}`;
          const lastNotifyAt = lastNotifyTimesRef.current[notifyKey] || 0;

          console.log('[ChatNotificationListener] 連投チェック:', {
            notifyKey,
            lastNotifyAt,
            diff: now - lastNotifyAt,
            shouldSkip: now - lastNotifyAt < FIVE_MIN,
          });

          if (now - lastNotifyAt < FIVE_MIN) {
            console.log('[ChatNotificationListener] スキップ: 5分以内の連続メッセージ');
            return;
          }

          // 通知を出してよいので、時刻を更新
          lastNotifyTimesRef.current[notifyKey] = now;
          console.log('[ChatNotificationListener] ✓ すべてのチェック通過！通知を発火します');

          // 送信者のdisplayNameを取得
          let senderDisplayName = lastMsg.senderUsername || '不明なユーザー';
          if (!userDisplayNamesRef.current[lastMsg.senderId]) {
            try {
              const senderDoc = await getDoc(doc(db, 'users', lastMsg.senderId));
              if (senderDoc.exists()) {
                const senderData = senderDoc.data();
                senderDisplayName = senderData?.displayName || lastMsg.senderUsername || '不明なユーザー';
                userDisplayNamesRef.current[lastMsg.senderId] = senderDisplayName;
              }
            } catch (error) {
              console.error('[ChatNotificationListener] 送信者のdisplayName取得エラー:', error);
            }
          } else {
            senderDisplayName = userDisplayNamesRef.current[lastMsg.senderId];
          }

          // 通知を実行
          triggerNotification(senderDisplayName, lastMsg.content, roomId);
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  const triggerNotification = (title: string, body: string, roomId: string) => {
    console.log('[ChatNotificationListener] ===== triggerNotification呼び出し =====');
    console.log('[ChatNotificationListener] 通知を発火:', { title, body, roomId });

    // 1. 通知設定の確認 (localStorage)
    const savedSetting = localStorage.getItem('yyChat_notification_enabled');
    let isEnabled = false;
    if (savedSetting) {
      try {
        isEnabled = JSON.parse(savedSetting);
      } catch {
        isEnabled = savedSetting === 'true';
      }
    }

    console.log('[ChatNotificationListener] 通知設定:', { savedSetting, isEnabled, parsed: isEnabled });

    if (!isEnabled) {
      console.log('[ChatNotificationListener] ❌ 通知がOFFのためスキップ');
      return;
    }

    // 2. ブラウザの通知許可を確認
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('[ChatNotificationListener] ❌ ブラウザが通知をサポートしていません');
      return;
    }

    const permission = Notification.permission;
    console.log('[ChatNotificationListener] 通知許可状態:', permission);

    if (permission !== 'granted') {
      console.log('[ChatNotificationListener] ❌ 通知許可がありません:', permission);
      return;
    }

    console.log('[ChatNotificationListener] ✓ 通知を表示します');

    // 3. 音を鳴らす（Web Audio APIを使用）
    (async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        console.log('[ChatNotificationListener] ✓ Web Audio APIで通知音を再生しました');
      } catch (e) {
        console.warn('[ChatNotificationListener] 通知音再生失敗:', e);
      }
    })();

    // 4. Windowsトースト通知
    try {
      const notificationMessage = body.length > 50 ? body.substring(0, 50) + '...' : body;

      console.log('[ChatNotificationListener] Notification作成を試みます:', {
        title: `YyChat: ${title}`,
        body: notificationMessage,
        icon: '/favicon.png',
      });

      const notification = new Notification(`YyChat: ${title}`, {
        body: notificationMessage,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: `chat-${roomId}`, // タグをルーム単位にして連続通知でもスパムにならないように
        data: {
          roomId: roomId,
        },
        requireInteraction: false,
        silent: false,
      });

      console.log('[ChatNotificationListener] ✓ 通知を作成しました:', notification);
      console.log('[ChatNotificationListener] 通知の状態:', {
        tag: notification.tag,
        body: notification.body,
        title: notification.title,
      });

      notification.onshow = () => {
        console.log('[ChatNotificationListener] ✓ 通知が表示されました！');
      };

      notification.onerror = (e) => {
        console.error('[ChatNotificationListener] ❌ 通知表示エラー:', e);
      };

      notification.onclose = () => {
        console.log('[ChatNotificationListener] 通知が閉じられました');
      };

      notification.onclick = () => {
        console.log('[ChatNotificationListener] 通知がクリックされました');
        window.focus();
        if (window.location.pathname !== '/userpage') {
          window.location.href = `/userpage?room=${roomId}`;
        }
        notification.close();
      };

      // 4秒後に自動的に閉じる
      setTimeout(() => {
        notification.close();
      }, 4000);
    } catch (e) {
      console.error('[ChatNotificationListener] ❌ 通知作成エラー:', e);
      console.error('[ChatNotificationListener] エラー詳細:', {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
    }
  };

  return null;
};

export default ChatNotificationListener;
