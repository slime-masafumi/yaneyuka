# Firebase App ID と Messaging Sender ID の設定手順

## 問題
ブラウザのコンソールに `FirebaseError: Missing App configuration value: "appId"` というエラーが表示されています。

## 原因
`.env.local`ファイルに`NEXT_PUBLIC_FIREBASE_APP_ID`と`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`が設定されていません。

## 解決手順

### 1. Firebaseコンソールで値を確認

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクト「testsite-7f2a6」を選択
3. 左上の⚙️（設定）アイコン → **「プロジェクトの設定」**をクリック
4. **「全般」**タブを開く
5. 下にスクロールして**「マイアプリ」**セクションを確認
6. Webアプリ（`</>`アイコン）を探す
   - もしWebアプリが登録されていない場合は、**「アプリを追加」** → **「Web」**を選択して追加

### 2. 必要な値をコピー

Webアプリの設定から、以下の値をコピーしてください：

- **アプリID（appId）**: `1:xxxxx:web:xxxxx` という形式の値
- **送信者ID（messagingSenderId）**: 数字のみの値（例: `123456789012`）

### 3. `.env.local`ファイルに追加

プロジェクトのルートディレクトリにある`.env.local`ファイルを開き、以下の2行を追加してください：

```env
NEXT_PUBLIC_FIREBASE_APP_ID=1:xxxxx:web:xxxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
```

**注意**: `xxxxx`の部分は、Firebaseコンソールで確認した実際の値に置き換えてください。

### 4. 開発サーバーを再起動

`.env.local`ファイルを変更した後は、Next.jsの開発サーバーを再起動する必要があります：

```bash
# 開発サーバーを停止（Ctrl+C）
# その後、再度起動
npm run dev
```

### 5. 確認

ブラウザのコンソールを確認し、`Missing App configuration value: "appId"`エラーが消えていることを確認してください。

## 現在の`.env.local`ファイルの状態

現在、以下の値が設定されています：
- ✅ `NEXT_PUBLIC_FIREBASE_API_KEY`
- ✅ `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- ✅ `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- ✅ `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- ✅ `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- ❌ `NEXT_PUBLIC_FIREBASE_APP_ID` ← **追加が必要**
- ❌ `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` ← **追加が必要**

## 補足

もしFirebaseコンソールでWebアプリが見つからない場合は、新規に追加する必要があります：

1. Firebase Console → プロジェクト設定 → 全般
2. 「マイアプリ」セクションで「アプリを追加」をクリック
3. 「Web」アイコン（`</>`）を選択
4. アプリのニックネームを入力（例: "yaneyuka-web"）
5. 「アプリを登録」をクリック
6. 表示された設定値（`appId`と`messagingSenderId`）をコピーして`.env.local`に追加

