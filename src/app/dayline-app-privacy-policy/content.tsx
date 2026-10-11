// DayLine プライバシーポリシー本文。/dayline-app-privacy-policy/(既定 JA)と /dayline-app-privacy-policy-en/(既定 EN)で共有する。

export function JapaneseContent() {
  return (
    <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
      <p>本ポリシーは、合同会社slime（以下「当社」）が提供するアプリ「DayLine」（以下「本アプリ」）における個人情報の取扱いを定めるものです。</p>
      <div>
        <h3 className="font-semibold mb-1">1. 取得する情報</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>アカウント情報（メールアドレス、Google・Apple Sign-In による認証情報）</li>
          <li>サブスクリプション情報（購入履歴、サブスクリプション状態、プラン種別）</li>
          <li>ユーザー作成データ（予定、ToDo、メモ、日課 等）※ローカル保存。Premiumプラン利用時はクラウド同期</li>
          <li>カレンダー情報（端末のカレンダーに登録された予定。詳しくは下の「カレンダー情報」）</li>
          <li>写真アクセス（その日に撮った写真を端末内で表示し、作成したロック画面用の壁紙を端末の写真アプリの「DayLine」アルバムに保存します。外部へのアップロードは行いません）</li>
          <li>地域設定（天気予報表示のための地域情報）</li>
          <li>広告識別子（IDFA / 広告ID）※App Tracking Transparency により許可を求めます</li>
          <li>デバイス情報（プラットフォーム、OS バージョン、アプリ識別子）</li>
          <li>サービス利用に伴い発生する操作履歴・アクセスログ</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">カレンダー情報</h3>
        <p>当社アプリ「DayLine」は、ユーザーが iOS の「カレンダーへのアクセス」を許可した場合に、端末のカレンダーアプリに登録されている予定（件名、開始・終了日時、場所、所属カレンダー名、カレンダーの色）を読み取り、アプリ内のタイムラインに表示します。Google、Outlook、iCloud 等の各サービスへ当社が直接ログインすることはなく、それらのパスワードを当社が取得・保存することもありません。</p>
        <p className="mt-1">ユーザーが DayLine アカウントにログインしている場合、上記の予定のうち当日の 7 日前から 60 日後までの範囲のコピーを、当該ユーザー専用の領域として Google Firebase（Firestore、米国等のリージョン）に保存し、同じアカウントでログインした PC 版 DayLine に表示するために利用します。この情報は本人以外のユーザーから閲覧できず、広告や第三者への提供には利用しません。</p>
        <p className="mt-1">保存されたコピーは、アプリの「カレンダー連携」で端末カレンダーとの接続を解除した時点、またはアカウントを削除した時点で削除されます。iOS の「設定 &gt; プライバシーとセキュリティ &gt; カレンダー」から DayLine の権限を取り消すことで、読み取り自体を停止できます。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">2. 利用目的</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>サービスの提供・本人確認・アカウント管理</li>
          <li>PC・スマートフォン間のデータ同期（Premiumプラン）</li>
          <li>サブスクリプションサービスの提供・管理・課金処理</li>
          <li>広告の表示・効果測定</li>
          <li>品質向上・不正防止・統計データの作成</li>
          <li>お問い合わせへの対応、必要なお知らせの配信</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">3. 第三者提供</h3>
        <p>法令に基づく場合や人命・財産保護の必要がある場合等を除き、本人の同意なく第三者に提供しません。ただし、以下のサービスと連携しています。</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Firebase（Google LLC） — 認証・データ同期・分析</li>
          <li>RevenueCat（<a href="https://www.revenuecat.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.revenuecat.com/</a>） — サブスクリプション管理</li>
          <li>AdMob（Google LLC） — 広告配信・効果測定</li>
          <li>App Store（Apple Inc.）またはGoogle Play（Google LLC） — 課金処理</li>
        </ul>
        <p className="mt-1">これらのサービス提供者は、それぞれのプライバシーポリシーに従って情報を処理します。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">4. 広告と追跡</h3>
        <p>本アプリでは AdMob を使用して広告を表示します。iOS では App Tracking Transparency（ATT）に基づき、広告識別子（IDFA）の利用についてユーザーの許可を求めます。許可しない場合でもアプリの基本機能はご利用いただけます。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">5. データの保存</h3>
        <p>ユーザー作成データ（予定、ToDo、メモ、日課）は原則として端末内に保存されます。Premiumプランご利用時は、Firebase Firestore を通じてクラウドに同期されます。写真データは端末内でのみ表示され、外部サーバーへのアップロードは行いません。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">6. 委託</h3>
        <p>業務委託先に取り扱いを委託する場合は、十分な管理体制を有する委託先を選定し、適切な監督を行います。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">7. 安全管理</h3>
        <p>不正アクセス・漏えい・改ざん・滅失の防止のため、適切な技術的/組織的安全管理措置を実施します。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">8. 個人情報の開示等の請求</h3>
        <p>ご本人からの開示・訂正・利用停止・削除のご請求に対して、法令に基づき速やかに対応します。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">9. 改定</h3>
        <p>法令やサービス内容の変更に伴い、本ポリシーを改定することがあります。重要な変更は本アプリ内または公式サイト上で告知します。</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">10. お問い合わせ</h3>
        <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。<br />メール: info@yaneyuka.com<br />運営会社：合同会社slime</p>
      </div>
    </div>
  );
}

export function EnglishContent() {
  return (
    <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
      <p>This Privacy Policy (&ldquo;Policy&rdquo;) sets out how slime design, LLC (&ldquo;we&rdquo;) handles personal information in the application &ldquo;DayLine&rdquo; (the &ldquo;App&rdquo;).</p>
      <div>
        <h3 className="font-semibold mb-1">1. Information We Collect</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account information (email address, authentication credentials via Google / Apple Sign-In)</li>
          <li>Subscription information (purchase history, subscription status, plan type)</li>
          <li>User-generated data (events, ToDos, memos, daily routines, etc.) — Stored locally. Synced to the cloud when using the Premium plan.</li>
          <li>Calendar information (events in the device calendars; see &ldquo;Calendar information&rdquo; below)</li>
          <li>Photo access (photos taken on the day are shown on the device, and the Lock Screen wallpaper you create is saved to a &ldquo;DayLine&rdquo; album in the Photos app; nothing is uploaded to external servers)</li>
          <li>Region settings (region information for weather forecast display)</li>
          <li>Advertising identifier (IDFA / Advertising ID). Permission is requested via App Tracking Transparency.</li>
          <li>Device information (platform, OS version, app identifier)</li>
          <li>Operation history and access logs incidental to service use</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">Calendar information</h3>
        <p>When you grant DayLine access to your device calendars on iOS, the app reads the events stored in the device Calendar app (title, start and end time, location, calendar name and colour) and shows them on its timeline. DayLine never signs in to Google, Outlook, iCloud or any other calendar service on your behalf, and never receives or stores your passwords for those services.</p>
        <p className="mt-1">If you are signed in to a DayLine account, a copy of those events from 7 days before to 60 days after the current date is stored in a space reserved for your account on Google Firebase (Firestore, hosted in the United States and other regions), solely so that the PC (web) version of DayLine signed in with the same account can display them. No other user can access this data, and it is never used for advertising or shared with third parties.</p>
        <p className="mt-1">The stored copy is deleted when you disconnect the device calendar under &ldquo;Calendar Integration&rdquo; in the app, or when you delete your account. You can stop the reading itself at any time by revoking DayLine&rsquo;s permission under iOS Settings &gt; Privacy &amp; Security &gt; Calendars.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">2. Purposes of Use</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Service provision, identity verification, and account management</li>
          <li>Data synchronization between PC and smartphone (Premium plan)</li>
          <li>Provision, management, and billing of subscription services</li>
          <li>Display and effectiveness measurement of advertisements</li>
          <li>Quality improvement, fraud prevention, and statistical data creation</li>
          <li>Response to inquiries and delivery of necessary notices</li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-1">3. Third-Party Provision</h3>
        <p>We do not provide your information to third parties without consent except where required by law or necessary to protect life, body, or property. The App integrates with the following services:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Firebase (Google LLC) — Authentication, data synchronization, analytics</li>
          <li>RevenueCat (<a href="https://www.revenuecat.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.revenuecat.com/</a>) — Subscription management</li>
          <li>AdMob (Google LLC) — Ad delivery and effectiveness measurement</li>
          <li>App Store (Apple Inc.) or Google Play (Google LLC) — Payment processing</li>
        </ul>
        <p className="mt-1">These service providers process information in accordance with their respective privacy policies.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">4. Advertising and Tracking</h3>
        <p>The App uses AdMob to display advertisements. On iOS, in accordance with App Tracking Transparency (ATT), we request user permission for the use of advertising identifiers (IDFA). Even if you do not grant permission, you can still use the basic features of the App.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">5. Data Storage</h3>
        <p>User-generated data (events, ToDos, memos, daily routines) is generally stored within the device. When using the Premium plan, data is synced to the cloud via Firebase Firestore. Photo data is displayed only within the device and is not uploaded to external servers.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">6. Outsourcing</h3>
        <p>When we outsource handling of information, we select outsourcees with sufficient management systems and provide appropriate supervision.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">7. Security</h3>
        <p>We implement appropriate technical and organizational safety management measures to prevent unauthorized access, leakage, alteration, or loss.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">8. Disclosure and Deletion Requests</h3>
        <p>We will promptly respond to requests from individuals for disclosure, correction, suspension of use, or deletion in accordance with applicable law.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">9. Amendments</h3>
        <p>We may amend this Policy in response to changes in law or service content. Important changes will be announced in the App or on the official website.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">10. Contact</h3>
        <p>For inquiries regarding this Policy, please contact us at:<br />Email: info@yaneyuka.com<br />Operator: slime design, LLC</p>
      </div>
    </div>
  );
}
