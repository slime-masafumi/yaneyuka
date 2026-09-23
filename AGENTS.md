# yaneyuka.com — 開発ルール

Codex が起動時に自動で読む。**自律的に進め、◆Project管理 への共有は確認せずに行う。**

## このアプリ

- **表示名**: yaneyuka.com
- **slug**: `web-yaneyuka.com`(リポジトリ名から ☆/★ を除いたもの)
- **Bundle ID**: 該当なし(Web サイト)
- **技術スタック**: Next.js(App Router)/ `src/app/` 配下がページ、`src/components/` が共通部品。ホスティングは `firebase.json` あり(デプロイ手段は `package.json` の scripts を見る)
- **設計書**:
- **変更厳禁の ID(既存ユーザー影響)**: **公開済みページの URL は変更厳禁**(ASC 登録済み / アプリ内リンク先)
- **特殊事情・ハマりどころ**: **GitHub 上で PUBLIC なリポジトリ**(`slime-masafumi/yaneyuka`)。秘密を絶対にコミットしない。`.env.local`(Git 管理外)に `SMTP_PASS` と `FIREBASE_SERVICE_ACCOUNT_JSON`。全アプリの法的文書と配信設定を担う裏方(下の「このリポジトリの位置づけ」)

<!-- slime-kit:begin — 共通部。正本は ◆Project管理\共有\new-project-base-file\CLAUDE.md。ここを直接編集せず、正本を直して配り直す -->
## 共通ルール(全リポジトリ同一)

- **振る舞い**は `C:\Users\slime\.codex\AGENTS.md`(自動読込)。**手順**は `C:\Users\slime\.claude\skills\<name>\SKILL.md` を該当場面で読む
- **運用標準**は `C:\Users\slime\Documents\slime-app\◆Project管理\_アプリ開発ベースライン.md`(着手前に読む。食い違えばベースライン優先。違反は管理側 `00_改善点.md` に追加)
- **管理フォルダ**: `◆Project管理\Project-data\` 配下で ☆/★ を除いた名前が `web-yaneyuka.com` と一致するもの(固定パスを書かない)。MD が 5 本未満なら `project-survey` skill で**聞かずに作る**。更新は 5 トリガー(ベースライン §16)でセッション終了前に
- **提出 / 再提出 / TestFlight / 「Mac に送って」** → 先に `asc-submit` skill と `_提出前チェック手順書_iOS.md`。**iOS ビルド → Mac** → `ios-release` skill
- **更新ゲート**: 無ければ入れる、あれば正本(`◆Project管理\共有\sync\shared\update-gate\`)との差分を取り込む → `update-gate` skill。verify 全項目 PASS がリリース条件
- **セッション開始**: `git fetch origin && git status -sb`。origin に差分があれば `merge --ff-only` で取り込む(未 push の変更と差分が両方あるときだけ報告)
- **セッション終了**: `git status` で `.env` / `*.p8` / `*.jks` が混ざっていないことを確認 → commit → **push**。WIP でも push しないまま終えない(Asus は平日職場にあり、push 忘れで最長 1 週間止まる)
- 全リポジトリまとめてはデスクトップの「slime-app 同期ツール」(赤)。新規リポジトリは `◆Project管理\共有\sync\register-new.ps1` で登録しないと同期されない
- Web サイト・非アプリのリポジトリは、提出 / 更新ゲートの行は該当なし
<!-- slime-kit:end -->

## このアプリ固有のメモ

### このリポジトリの位置づけ

建築系の情報サイト(Next.js App Router / `src/app/`)。
同時に **slime app の全 iOS アプリを支える裏方**でもある。次の 2 つを配信している。

| 役割 | 置き場所 | 参照している相手 |
|---|---|---|
| 各アプリの法的文書 | `src/app/{app-slug}-privacy-policy/` 等 | App Store Connect に登録された URL / アプリ内の Paywall |
| 各アプリの配信設定 | `public/app-config/{識別子}.json` | 各アプリの更新ゲート(古い版を止める仕組み) |

**ここが落ちると、42 本のアプリの審査・強制更新が同時に止まる。**サイトの見た目より、
この 2 つを壊さないことを優先する。

- **GitHub 上で PUBLIC なリポジトリ**(`slime-masafumi/yaneyuka`)。秘密を絶対にコミットしない
- `.env.local` に `SMTP_PASS` と `FIREBASE_SERVICE_ACCOUNT_JSON` が入っている。**ここは Git 管理外**

### 役割 1:各アプリの法的文書

ベースライン §9 が方針。要点だけ再掲する。

| 文書 | 方針 |
|---|---|
| プライバシーポリシー | **アプリごとに個別ページ必須**。`/{app-slug}-privacy-policy/` |
| 利用規約 | **既定は Apple 標準 EULA**。独自ページは UGC ありか金融免責が要るアプリだけ |
| サポート | **全アプリ共通 1 枚**。`/support/`。アプリごとに作らない |

- 原稿は依頼元アプリの `docs/legal/` にある。**本文はそちらが SoT**。ここは掲載場所
- 既存ページ(`fx-signal-privacy-policy` 等)の体裁に合わせる。`BilingualLegal` と
  `RelatedPrivacyLinks` を使っているページがあるので、新規もそれに倣う
- 事業者表記は `合同会社slime`、連絡先は `info@yaneyuka.com`
- **公開したら 200 が返ることを実際に確認してから報告する。**ASC は URL が 404 だと審査に出せない

> 過去、アプリ側が「掲載待ち」のまま止まっていたことが複数ある。掲載したら依頼元アプリの
> `◆Project管理\Project-data\{該当}\02_アプリ情報.md` の URL 欄も「公開済」に直す。

### 役割 2:各アプリの配信設定(更新ゲート)

各アプリの更新ゲートが、起動時と前面復帰時にここを読む。**古い版を止める唯一の手段。**

```
public/app-config/{識別子}.json
```

```json
{
  "latest_version": "1.4.0",
  "force_update_below": "",
  "update_message": ""
}
```

| キー | 意味 |
|---|---|
| `latest_version` | 最新版。iOS はストアから自動で引けるので **主に Android 用** |
| `force_update_below` | これ未満は使わせない。**平常時は必ず空** |
| `update_message` | 画面に出す文言。空なら既定文 |

#### 必ず守ること

- **ファイル名はアプリの識別子そのまま。**推測しない。依頼元から受け取った値を使う
- **iOS の Bundle ID と Android の package 名が違うアプリは JSON が 2 本要る**
  (例: DayLine は `com.yaneyuka-dayline.app.json` と `com.dayline.app.json`)
- **`force_update_below` を入れっぱなしにしない。**壊れた版を止めたいときだけ入れ、
  直ったら空へ戻す。入れたままだと次の版を出すまで全ユーザーが止まる
- `Cache-Control: max-age=300` 程度。壊れた版を止めるのに数時間待てない
- JSON が無いアプリは 404 になるが、アプリ側は静かに諦める設計なので異常ではない

仕様の正本: `◆Project管理\共有\sync\shared\update-gate\README.md` の「配信設定」の節

### ✅ 確認不要 / ⚠️ 要許可(このサイト固有)

**確認不要**: ページの追加・修正、コンポーネント編集、`npm run build` / `npm run dev`、
`git add` / `git commit`(`git status` で機密混入なしを確認後)、管理 MD の更新。

**必ず明示許可**: **本番デプロイ**(`firebase deploy` / `vercel --prod`)、`git push --force`、
履歴書換え、`.env.local` の Git コミット、既存ページの削除・URL 変更
(**ASC に登録済みの URL を変えると審査が通らなくなる**)。

### このリポジトリ固有のメモ

- 技術スタック: Next.js (App Router) / `src/app/` 配下がページ、`src/components/` が共通部品
- ホスティング: `firebase.json` あり。デプロイ手段は `package.json` の scripts を見る
- 既存ユーザー影響: **公開済みページの URL は変更厳禁**(ASC 登録済み / アプリ内リンク先)
