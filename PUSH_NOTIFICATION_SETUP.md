# Push通知と既読機能の実装ガイド

## 実装完了した機能

### ✅ 既読機能
- メッセージを表示した時に自動的に既読マークを付ける
- 自分のメッセージに「既読」「未読」を表示
- 未読カウントの自動更新

### ✅ Push通知機能（基本実装）
- Service Workerの登録
- 通知許可のリクエスト
- FCMトークンの取得と保存
- フォアグラウンド通知の表示

## 必要な設定

### 1. Firebase Consoleでの設定

#### A. Cloud Messaging APIの有効化
1. Firebase Console → プロジェクト設定 → Cloud Messaging
2. Cloud Messaging API (V1) を有効化

#### B. VAPIDキーの生成
1. Firebase Console → プロジェクト設定 → Cloud Messaging
2. 「Web設定」タブを開く
3. 「キーペアを生成」をクリック
4. 生成されたキーをコピー

### 2. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# Firebase設定（既存の設定に追加）
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key-here
```

**注意**: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`は、Firebase Consoleのプロジェクト設定 → 全般 → マイアプリ → Webアプリの設定から確認できます。

### 3. Cloud Functionsの実装（通知送信）

メッセージ送信時に通知を送信するには、Cloud Functionsの実装が必要です。

#### 必要なファイル構造
```
functions/
  index.ts
  package.json
```

#### functions/index.ts の例
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

admin.initializeApp();

export const sendChatNotification = functions.firestore
  .document('chatRooms/{roomId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const messageData = snap.data();
    const roomId = context.params.roomId;
    
    // 送信者以外の参加者を取得
    const roomDoc = await admin.firestore().doc(`chatRooms/${roomId}`).get();
    const roomData = roomDoc.data();
    const recipients = roomData?.participants.filter(
      (uid: string) => uid !== messageData.senderId
    ) || [];
    
    // 各受信者のFCMトークンを取得して通知を送信
    for (const recipientId of recipients) {
      const userDoc = await admin.firestore().doc(`users/${recipientId}`).get();
      const fcmToken = userDoc.data()?.fcmToken;
      
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: messageData.senderUsername || '新しいメッセージ',
            body: messageData.content,
          },
          data: {
            roomId: roomId,
            senderId: messageData.senderId,
            type: 'chat',
          },
        });
      }
    }
  });
```

#### functions/package.json の例
```json
{
  "name": "functions",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "private": true
}
```

## 動作確認

### 既読機能の確認
1. 2つのブラウザで異なるユーザーでログイン
2. 一方からメッセージを送信
3. もう一方でメッセージを表示
4. 送信側で「既読」が表示されることを確認

### Push通知の確認
1. 通知許可をリクエスト（「🔔 通知ON」ボタンをクリック）
2. ブラウザの通知許可を許可
3. 別のユーザーからメッセージを受信
4. 通知が表示されることを確認

## トラブルシューティング

### Service Workerが登録されない
- HTTPSでアクセスしているか確認（localhostは可）
- ブラウザの開発者ツール → Application → Service Workers で確認

### 通知が表示されない
- ブラウザの通知設定を確認
- FCMトークンがFirestoreに保存されているか確認
- Cloud Functionsがデプロイされているか確認

### VAPIDキーエラー
- `.env.local`に正しく設定されているか確認
- 環境変数は`NEXT_PUBLIC_`で始まる必要がある

## 注意事項

- iOS SafariはPWAとしてインストールする必要がある場合があります
- ブラウザを完全に閉じた場合、一部のブラウザでは通知が届かない場合があります
- Cloud Functionsの実装は別途必要です（上記の例を参考にしてください）

