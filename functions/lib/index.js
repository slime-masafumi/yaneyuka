"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDeadlineReminders = exports.notifyTaskAssignee = exports.cleanupShareDownloadGuards = exports.cleanupTempFiles = exports.sendChatNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
admin.initializeApp();
/**
 * チャットメッセージ送信時に通知を送信するCloud Function
 * メッセージが作成された時に自動的にトリガーされる
 */
exports.sendChatNotification = functions.firestore
    .document('chatRooms/{roomId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
    const messageData = snap.data();
    const roomId = context.params.roomId;
    const messageId = context.params.messageId;
    console.log(`[sendChatNotification] メッセージ作成を検知: roomId=${roomId}, messageId=${messageId}, senderId=${messageData.senderId}`);
    // 送信者以外の参加者を取得
    const roomDoc = await admin.firestore().doc(`chatRooms/${roomId}`).get();
    if (!roomDoc.exists) {
        console.error(`[sendChatNotification] ルーム ${roomId} が見つかりません`);
        return null;
    }
    const roomData = roomDoc.data();
    if (!roomData) {
        console.error(`[sendChatNotification] ルーム ${roomId} のデータがありません`);
        return null;
    }
    const participants = roomData.participants || [];
    const recipients = participants.filter((uid) => uid !== messageData.senderId);
    console.log(`[sendChatNotification] 参加者: ${participants.join(', ')}, 受信者: ${recipients.join(', ')}`);
    if (recipients.length === 0) {
        console.log('[sendChatNotification] 通知送信先がありません');
        return null;
    }
    // 送信者のdisplayNameを取得（最新の表示名を使用）
    let senderDisplayName = messageData.senderUsername || '不明なユーザー';
    try {
        const senderDoc = await admin.firestore().doc(`users/${messageData.senderId}`).get();
        if (senderDoc.exists) {
            const senderData = senderDoc.data();
            senderDisplayName = senderData?.displayName || messageData.senderUsername || '不明なユーザー';
        }
    }
    catch (error) {
        console.error('送信者のdisplayName取得エラー:', error);
    }
    // メッセージ内容を整形（50文字まで）
    const messageContent = messageData.content || '';
    const notificationBody = messageContent.length > 50
        ? messageContent.substring(0, 50) + '...'
        : messageContent;
    // 各受信者のFCMトークンを取得
    const tokens = [];
    const tokenToUidMap = {};
    for (const recipientId of recipients) {
        try {
            const userDoc = await admin.firestore().doc(`users/${recipientId}`).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const fcmToken = userData?.fcmToken;
                if (fcmToken) {
                    tokens.push(fcmToken);
                    tokenToUidMap[fcmToken] = recipientId;
                }
            }
        }
        catch (error) {
            console.error(`[sendChatNotification] ユーザー ${recipientId} のトークン取得エラー:`, error);
        }
    }
    if (tokens.length === 0) {
        console.log('[sendChatNotification] 有効なFCMトークンがありません');
        return null;
    }
    // MulticastMessageを作成
    const message = {
        tokens: tokens,
        notification: {
            title: `YyChat: ${senderDisplayName}`,
            body: notificationBody,
        },
        data: {
            roomId: roomId,
            senderId: messageData.senderId,
            type: 'chat',
        },
        webpush: {
            notification: {
                icon: '/favicon.png',
                badge: '/favicon.png',
                tag: `chat-${roomId}`,
            },
            fcmOptions: {
                link: `/userpage?room=${roomId}`,
            },
        },
    };
    try {
        console.log(`[sendChatNotification] ${tokens.length}件のトークンに通知を送信します...`);
        const batchResponse = await admin.messaging().sendEachForMulticast(message);
        console.log(`[sendChatNotification] 送信完了: 成功=${batchResponse.successCount}, 失敗=${batchResponse.failureCount}`);
        // 失敗したトークンの処理（無効なトークンの削除など）
        if (batchResponse.failureCount > 0) {
            const failedTokens = [];
            batchResponse.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const failedToken = tokens[idx];
                    failedTokens.push(failedToken);
                    console.error(`[sendChatNotification] 送信失敗 (${tokenToUidMap[failedToken]}):`, resp.error);
                    // 無効なトークンなら削除
                    if (resp.error?.code === 'messaging/invalid-registration-token' ||
                        resp.error?.code === 'messaging/registration-token-not-registered') {
                        const uid = tokenToUidMap[failedToken];
                        if (uid) {
                            console.log(`[sendChatNotification] 無効なトークンを削除します: user=${uid}`);
                            admin.firestore().doc(`users/${uid}`).update({
                                fcmToken: admin.firestore.FieldValue.delete(),
                            }).catch(err => console.error('トークン削除エラー:', err));
                        }
                    }
                }
            });
        }
    }
    catch (error) {
        console.error('[sendChatNotification] 通知送信全体エラー:', error);
    }
    return null;
});
/**
 * 24時間経過した一時ファイルを削除するスケジュール関数
 * 実行頻度: 1時間に1回
 */
exports.cleanupTempFiles = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 hours', // 1時間ごとに実行
    timeZone: 'Asia/Tokyo', // 日本時間
}, async (event) => {
    const db = admin.firestore();
    const storage = admin.storage();
    const now = admin.firestore.Timestamp.now();
    console.log('🧹 一時ファイルの掃除を開始します...');
    // "expiresAt"（削除予定時刻）が現在時刻より「過去」のものを検索
    const expiredDocs = await db.collection('tempFiles')
        .where('expiresAt', '<', now)
        .get();
    if (expiredDocs.empty) {
        console.log('✨ 削除対象のファイルはありませんでした。');
        return;
    }
    // 該当ファイルを削除していく
    const promises = expiredDocs.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        const storagePath = data.storagePath; // Storage内のパス（例: temp/image.jpg）
        try {
            // 1. Storageの実体を削除
            if (storagePath) {
                try {
                    await storage.bucket().file(storagePath).delete();
                    console.log(`[削除成功] Storage: ${storagePath}`);
                }
                catch (error) {
                    // ファイルが既に存在しない場合はスキップ
                    if (error.code === 404) {
                        console.log(`[削除スキップ] Storageにファイルが見つかりません: ${storagePath}`);
                    }
                    else {
                        throw error;
                    }
                }
            }
        }
        catch (error) {
            console.error(`[削除エラー] Storage: ${storagePath}`, error);
        }
        // 2. Firestoreのデータを削除
        try {
            await docSnapshot.ref.delete();
            console.log(`[削除成功] Firestore: ${docSnapshot.id}`);
        }
        catch (error) {
            console.error(`[削除エラー] Firestore: ${docSnapshot.id}`, error);
        }
    });
    await Promise.all(promises);
    console.log(`🗑️ 合計 ${expiredDocs.size} 件のファイルを削除しました。`);
});
/**
 * 共有リンクのダウンロード計測ガード（shareDownloadMarks / shareDownloadDaily）の掃除。
 *
 * /api/share/download は「同じコード・同じ送信元・同じ1時間」で二重に計上しないための
 * マーカーと、1コードあたりの日次カウンタを書き込む。放置すると溜まり続けるので、
 * expiresAt を過ぎたものを定期的に消す。
 */
exports.cleanupShareDownloadGuards = (0, scheduler_1.onSchedule)({
    schedule: 'every 6 hours',
    timeZone: 'Asia/Tokyo',
}, async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    let removed = 0;
    for (const name of ['shareDownloadMarks', 'shareDownloadDaily']) {
        // 1回の実行で消しすぎないよう上限を付ける（次の実行で続きを消す）
        const expired = await db.collection(name)
            .where('expiresAt', '<', now)
            .limit(2000)
            .get();
        if (expired.empty)
            continue;
        // Firestore のバッチ上限は500件
        for (let i = 0; i < expired.docs.length; i += 450) {
            const batch = db.batch();
            expired.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }
        removed += expired.size;
    }
    console.log(`🗑️ ダウンロード計測ガードを ${removed} 件削除しました。`);
});
// サイト内の通知（担当者への通知・締切リマインド）
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "notifyTaskAssignee", { enumerable: true, get: function () { return notifications_1.notifyTaskAssignee; } });
Object.defineProperty(exports, "sendDeadlineReminders", { enumerable: true, get: function () { return notifications_1.sendDeadlineReminders; } });
//# sourceMappingURL=index.js.map