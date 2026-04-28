import BilingualLegal from '@/components/BilingualLegal';

// Server Component. デフォルトは日本語。EN/JA トグルで切替可能。
export default function RulesAppPrivacyPolicyPage() {
  return (
    <BilingualLegal
      titleEn="Rules Privacy Policy"
      titleJa="Rules プライバシーポリシー"
      en={<EnglishContent />}
      ja={<JapaneseContent />}
      defaultLang="ja"
    />
  );
}

function JapaneseContent() {
  return (
    <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
      <p>本ポリシーは、合同会社slime（以下「当社」）が提供するアプリ「Rules」（以下「本アプリ」）における個人情報の取扱いを定めるものです。本アプリは社内規則・マニュアルの管理および閲覧確認を目的とし、iOS（App Store）および Web（rules-yaneyuka.web.app）で提供されます（Bundle ID: com.yaneyuka.rules）。</p>
      <div>
        <h3 className="font-semibold mb-1">1. 取得する情報</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>アカウント情報（メールアドレス、Supabase Auth による認証情報）</li>
          <li>氏名（プロフィール表示用）</li>
          <li>所属組織名（マルチテナント識別のため）</li>
          <li>デバイス識別子・IPアドレス（セッション管理・不正防止のため）</li>
          <li>サブスクリプション情報（購入履歴、サブスクリプション状態、プラン種別）</li>
          <li>決済情報（iOS: Apple ID 経由、Web: Stripe 経由。当社では決済情報そのものを保持しません）</li>
          <li>ユーザー生成コンテンツ（マニュアル本文、添付ファイル、コメント等）</li>
          <li>AIアシスタント機能への入力テキストおよび生成されたコンテンツ</li>
          <li>広告識別子（Freeプラン：iOS は IDFA、Web は広告用クッキー）※App Tracking Transparency により許可を求めます</li>
          <li>デバイス情報（プラットフォーム、OS バージョン、アプリ識別子）</li>
          <li>サービス利用に伴い発生する操作履歴・アクセスログ</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">2. 利用目的</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>サービスの提供・本人確認・アカウント管理</li>
          <li>組織単位でのマニュアル管理・閲覧確認の実現</li>
          <li>PC・スマートフォン間のデータ同期</li>
          <li>AIアシスタント機能の提供（ユーザーの入力に基づく回答生成）</li>
          <li>サブスクリプションサービスの提供・管理・課金処理</li>
          <li>Freeプランにおける広告の表示・効果測定</li>
          <li>品質向上・不正防止・統計データの作成</li>
          <li>お問い合わせへの対応、必要なお知らせの配信</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">3. 第三者提供・外部サービスの利用</h3>
        <p>法令に基づく場合や人命・財産保護の必要がある場合等を除き、本人の同意なく第三者に提供しません。ただし、本アプリの提供にあたり、以下の外部サービスと連携しています。</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Supabase（米国） — データベース・認証・ストレージ</li>
          <li>Firebase Hosting / Cloud Run Functions（Google LLC、米国） — Web配信・サーバー処理</li>
          <li>Stripe（アイルランド） — Web決済処理</li>
          <li>RevenueCat（<a href="https://www.revenuecat.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.revenuecat.com/</a>、米国） — iOSサブスクリプション管理</li>
          <li>Apple IAP（Apple Inc.） — iOS決済処理</li>
          <li>Anthropic Claude API（Anthropic, PBC、米国） — AIアシスタント機能の提供</li>
          <li>Google AdMob（Google LLC、米国） — Freeプランにおける広告配信・効果測定</li>
        </ul>
        <p className="mt-1">これらのサービス提供者は、それぞれのプライバシーポリシーに従って情報を処理します。上記サービスの一部は日本国外（米国・アイルランド等）に所在し、個人情報が国外に移転される場合があります。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">4. 広告と追跡</h3>
        <p>Freeプランでは Google AdMob を使用して広告を表示します。iOS では App Tracking Transparency（ATT）に基づき、広告識別子（IDFA）の利用についてユーザーの許可を求めます。Web ではパーソナライズ広告のために広告用クッキーを利用することがあります。パーソナライズ広告のオプトアウトは、iOS の場合は「設定＞プライバシーとセキュリティ＞Apple広告／トラッキング」から、Web の場合は <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Google 広告設定</a> から行うことができます。許可しない場合でもアプリの基本機能はご利用いただけます。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">5. ユーザー生成コンテンツの取扱い</h3>
        <p>ユーザーが作成したマニュアル本文・添付ファイル等は Supabase Storage に暗号化して保存されます。ファイルの公開範囲は所属組織単位で管理され、Row Level Security（行単位のアクセス制御）により、権限のないユーザーからのアクセスを防止します。AIアシスタント機能に入力されたテキストは、回答生成のため Anthropic Claude API に送信されますが、当社および Anthropic において当該データをモデル学習目的で利用することはありません。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">6. データの保存期間・削除</h3>
        <p>アカウントおよびユーザー生成コンテンツは、ユーザーがアプリ内「設定」からアカウント削除機能を実行した時点で削除手続きを開始し、原則として30日以内に完全削除します。削除要求をメール等でいただいた場合も同様に対応します。法令により保存が義務付けられている情報については、所定の期間保持することがあります。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">7. 子どもの個人情報</h3>
        <p>本アプリは13歳未満の方を対象として提供しておりません。13歳未満の方の個人情報は意図的に取得しません。万一取得したことが判明した場合は、速やかに削除します。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">8. 委託</h3>
        <p>業務委託先に取り扱いを委託する場合は、十分な管理体制を有する委託先を選定し、適切な監督を行います。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">9. 安全管理</h3>
        <p>不正アクセス・漏えい・改ざん・滅失の防止のため、通信の暗号化（TLS）、保存データの暗号化、アクセス権限の制御等、適切な技術的・組織的安全管理措置を実施します。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">10. 個人情報の開示・削除等の請求</h3>
        <p>ご本人からの開示・訂正・利用停止・削除のご請求に対して、法令に基づき速やかに対応します。アカウントの削除はアプリ内「設定」画面からいつでも実行できます。その他のご請求は下記お問い合わせ窓口までご連絡ください。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">11. 準拠法および国際的な取扱い</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>本ポリシーは日本法に準拠し、個人情報の保護に関する法律（APPI）を遵守します。</li>
          <li>EU および英国にお住まいのユーザーに対しては、一般データ保護規則（GDPR）および UK GDPR に基づく権利（アクセス権・訂正権・消去権・処理制限権・データポータビリティ権・異議申立権）を保障します。</li>
          <li>米国カリフォルニア州にお住まいのユーザーに対しては、カリフォルニア州消費者プライバシー法（CCPA）に基づく権利（情報の開示・削除・販売のオプトアウト）を保障します。</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">12. 改定</h3>
        <p>法令やサービス内容の変更に伴い、本ポリシーを改定することがあります。重要な変更は本アプリ内または公式サイト上で告知します。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">13. お問い合わせ</h3>
        <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。<br />メール: info@yaneyuka.com<br />運営会社：合同会社slime</p>
      </div>
      <div>
        <p className="text-right text-gray-500">制定日: 2026年4月18日</p>
      </div>
    </div>
  );
}

function EnglishContent() {
  return (
    <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
      <p>This Privacy Policy (&ldquo;Policy&rdquo;) sets out how slime design, LLC (&ldquo;we&rdquo;) handles personal information in the application &ldquo;Rules&rdquo; (the &ldquo;App&rdquo;). The App is provided to manage and review internal company rules and manuals, and is offered on iOS (App Store) and Web (rules-yaneyuka.web.app) (Bundle ID: com.yaneyuka.rules).</p>
      <div>
        <h3 className="font-semibold mb-1">1. Information We Collect</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account information (email address, authentication credentials via Supabase Auth)</li>
          <li>Name (for profile display)</li>
          <li>Organization name (for multi-tenant identification)</li>
          <li>Device identifier and IP address (for session management and abuse prevention)</li>
          <li>Subscription information (purchase history, subscription status, plan type)</li>
          <li>Payment information (iOS: via Apple ID; Web: via Stripe; we do not retain payment information itself)</li>
          <li>User-generated content (manual content, attachments, comments, etc.)</li>
          <li>Input text and generated content for the AI Assistant feature</li>
          <li>Advertising identifiers (Free plan: IDFA on iOS, advertising cookies on Web). Permission is requested via App Tracking Transparency.</li>
          <li>Device information (platform, OS version, app identifier)</li>
          <li>Operation history and access logs incidental to service use</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">2. Purposes of Use</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Service provision, identity verification, and account management</li>
          <li>Realization of organization-level manual management and reading confirmation</li>
          <li>Data synchronization between PC and smartphone</li>
          <li>Provision of AI Assistant feature (response generation based on user input)</li>
          <li>Provision, management, and billing of subscription services</li>
          <li>Display and effectiveness measurement of advertisements on the Free plan</li>
          <li>Quality improvement, fraud prevention, and statistical data creation</li>
          <li>Response to inquiries and delivery of necessary notices</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">3. Third-Party Provision and External Services</h3>
        <p>We do not provide your information to third parties without consent except where required by law or necessary to protect life, body, or property. The App integrates with the following external services:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Supabase (USA) — Database, authentication, storage</li>
          <li>Firebase Hosting / Cloud Run Functions (Google LLC, USA) — Web delivery, server processing</li>
          <li>Stripe (Ireland) — Web payment processing</li>
          <li>RevenueCat (<a href="https://www.revenuecat.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.revenuecat.com/</a>, USA) — iOS subscription management</li>
          <li>Apple IAP (Apple Inc.) — iOS payment processing</li>
          <li>Anthropic Claude API (Anthropic, PBC, USA) — AI Assistant feature</li>
          <li>Google AdMob (Google LLC, USA) — Free plan ad delivery and effectiveness measurement</li>
        </ul>
        <p className="mt-1">These service providers process information in accordance with their respective privacy policies. Some of the above services are located outside Japan (USA, Ireland, etc.), which may involve cross-border transfer of personal information.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">4. Advertising and Tracking</h3>
        <p>On the Free plan, we use Google AdMob to display advertisements. On iOS, in accordance with App Tracking Transparency (ATT), we request user permission for the use of advertising identifiers (IDFA). On Web, advertising cookies may be used for personalized advertising. You can opt out of personalized ads via &ldquo;Settings &gt; Privacy &amp; Security &gt; Apple Advertising / Tracking&rdquo; on iOS, or via <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Google Ads Settings</a> on Web. Even if you do not grant permission, you can still use the basic features of the App.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">5. Handling of User-Generated Content</h3>
        <p>Manual content, attachments, etc. created by users are encrypted and stored on Supabase Storage. The visibility scope of files is managed at the organization level, and Row Level Security (row-level access control) prevents access by unauthorized users. Text input to the AI Assistant feature is sent to the Anthropic Claude API for response generation; however, neither we nor Anthropic uses such data for model training purposes.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">6. Data Retention and Deletion</h3>
        <p>Account and user-generated content will be deleted upon execution of the account deletion function in the in-app &ldquo;Settings&rdquo;. Deletion procedures begin at that time, and complete deletion is performed as a rule within 30 days. The same applies to deletion requests received via email or other means. Information for which retention is required by law may be retained for the prescribed period.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">7. Children&rsquo;s Privacy</h3>
        <p>The App is not intended for users under the age of 13. We do not intentionally collect personal information from users under 13. If we discover such collection, we will promptly delete it.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">8. Outsourcing</h3>
        <p>When we outsource handling of information, we select outsourcees with sufficient management systems and provide appropriate supervision.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">9. Security</h3>
        <p>To prevent unauthorized access, leakage, alteration, or loss, we implement appropriate technical and organizational safety management measures, including communication encryption (TLS), encryption of stored data, and access permission control.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">10. Disclosure and Deletion Requests</h3>
        <p>We will promptly respond to requests from individuals for disclosure, correction, suspension of use, or deletion in accordance with applicable law. Account deletion can be performed at any time from the in-app &ldquo;Settings&rdquo; screen. For other requests, please contact us via the contact information below.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">11. Governing Law and International Handling</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>This Policy is governed by the laws of Japan and complies with the Act on the Protection of Personal Information (APPI).</li>
          <li>For users residing in the EU and UK, we guarantee rights under the General Data Protection Regulation (GDPR) and UK GDPR (right of access, right to rectification, right to erasure, right to restrict processing, right to data portability, and right to object).</li>
          <li>For users residing in California, USA, we guarantee rights under the California Consumer Privacy Act (CCPA) (right to know, right to delete, right to opt out of sale).</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">12. Amendments</h3>
        <p>We may amend this Policy in response to changes in law or service content. Important changes will be announced in the App or on the official website.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">13. Contact</h3>
        <p>For inquiries regarding this Policy, please contact us at:<br />Email: info@yaneyuka.com<br />Operator: slime design, LLC</p>
      </div>
      <div>
        <p className="text-right text-gray-500">Established: April 18, 2026</p>
      </div>
    </div>
  );
}
