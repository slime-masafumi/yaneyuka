# Firebase デプロイ手順

## 前提条件
- Firebase プロジェクトが作成済みであること
- Firebase CLI がインストール済みであること

## 手順

### 1. Firebase にログイン
```bash
firebase login
```

### 2. Firebase プロジェクトを作成または選択
```bash
# 新しいプロジェクトを作成する場合
firebase projects:create your-project-id

# 既存のプロジェクトを使用する場合
firebase use your-project-id
```

### 3. .firebaserc ファイルのプロジェクトIDを更新
`.firebaserc` ファイルの `your-project-id` を実際のプロジェクトIDに変更してください。

### 4. ビルドとデプロイ
```bash
npm run deploy
```

または個別に実行：
```bash
npm run export
firebase deploy
```

## 注意事項

### データベース関連
- このアプリはPrismaとSQLiteを使用しています
- 本番環境では以下のいずれかを検討してください：
  1. Firebase Firestore への移行
  2. PostgreSQL や MySQL などのクラウドデータベースの使用
  3. Vercel や Railway などのフルスタックホスティングサービスの使用

### 認証機能
- NextAuth.js を使用している場合、環境変数の設定が必要です
- Firebase Hosting では環境変数は使用できないため、Firebase Functions の併用を検討してください

### API Routes
- Next.js の API Routes は静的エクスポートでは動作しません
- API機能が必要な場合は、Firebase Functions への移行を検討してください

## 代替案

データベースやAPI機能を使用している場合は、以下のサービスを検討してください：

1. **Vercel** (推奨)
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**
   ```bash
   npm install -g netlify-cli
   netlify deploy
   ```

3. **Railway**
   - GitHub連携で自動デプロイ可能

これらのサービスはNext.jsのフル機能をサポートしています。 