import BilingualLegal from '@/components/BilingualLegal';

// Server Component. BilingualLegal がクライアント側でトグルUIを提供し、
// 本文は両言語とも SSR で DOM に書き出されるため、SEO・App Storeクローラ両方で検出可能。
export default function AccoriaPrivacyPolicyPage() {
  return (
    <BilingualLegal
      titleEn="Accoria Privacy Policy"
      titleJa="Accoria プライバシーポリシー"
      en={<EnglishContent />}
      ja={<JapaneseContent />}
      defaultLang="ja"
    />
  );
}

function JapaneseContent() {
  return (
    <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
      <p className="text-[12px] text-gray-500">
        <strong>最終更新日:</strong> 2026年10月12日
      </p>
      <p>
        合同会社slime（以下「当社」といいます）は、当社が提供する iOS アプリ「Accoria」（以下「本アプリ」といいます）におけるユーザー情報の取扱いについて、以下のとおり定めます。
      </p>

      <div>
        <h3 className="font-semibold mb-1">1. 基本方針</h3>
        <p>本アプリは、ユーザーが記録した帳簿データを<strong>端末内にのみ保存</strong>します。当社は、ユーザーが記録した収支、予定、税金、取引先、メモ、証憑画像を取得せず、当社のサーバーへ送信することもありません。</p>
        <p className="mt-2">本アプリは、アカウント登録を必要とせず、広告を表示せず、広告目的の追跡（トラッキング）も行いません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">2. 端末内に保存される情報</h3>
        <p>以下の情報は、ユーザーの端末内にのみ保存されます。</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>帳簿、収支の記録、支払い・入金予定、固定費、税金の記録</li>
          <li>取引先、勘定科目、税区分、支払方法、メモ</li>
          <li>レシートや証憑として添付した画像および PDF</li>
          <li>表示言語、対応国、テーマ、プランの判定結果などのアプリ設定</li>
        </ul>
        <p className="mt-2">これらは、ユーザーが本アプリを端末から削除した時点で、端末内のアプリデータとともに削除されます。なお、端末の iCloud バックアップ設定によっては、これらのデータが Apple の管理する端末バックアップに含まれる場合があります。その取扱いは Apple のプライバシーポリシーに従います。</p>
        <p className="mt-2">税負担の推計機能で入力する働き方・収入・年齢・控除・消費・保有資産などの前提条件も、端末内にのみ保存されます。当社はこれらを取得しません。</p>
        <p className="mt-2">証憑の文字認識（OCR）は端末内で行い、画像および認識したテキストを当社や第三者のサーバーへ送信することはありません。</p>
        <p className="mt-2">経理整理機能でユーザーが保存先フォルダ（iCloud Drive、Dropbox、Google Drive など、ユーザー自身が利用するクラウドストレージ上のフォルダ）を選んだ場合、証憑の画像と読み取り結果は、ユーザーの操作に基づいてそのフォルダに書き出されます。書き出されたデータの取扱いは、ユーザーが選んだ各サービスのプライバシーポリシーに従います。当社はそのフォルダにアクセスせず、当社のサーバーへも送信されません。</p>
        <p className="mt-2">保存先フォルダを選んだ場合、本アプリとブラウザで動く PC 版（Accoria の PC 画面）は、そのフォルダ内の同期用ファイルを介して、帳簿データ（帳簿・取引・予定・固定費・税金・口座・証憑の記録・前提条件など）を互いに読み書きします。同期はユーザーの端末とユーザーが選んだフォルダの間だけで行われ、当社のサーバーを経由しません。PC 版も本ポリシーと同じ方針で動作し、データを当社や第三者へ送信しません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">3. カメラおよび写真へのアクセス</h3>
        <p>レシート・証憑を取引に添付する機能でのみ、カメラおよび写真へのアクセスを使用します。</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>アクセスは、ユーザーが証憑の添付を行おうとしたときにのみ発生します</li>
          <li>本アプリが取得するのは、ユーザーが撮影または選択した画像・PDF のみです</li>
          <li>取得した画像は端末内に保存され、当社および第三者へ送信されません</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">4. サブスクリプションに関する情報</h3>
        <p>本アプリの有料プランは、Apple の自動更新サブスクリプションを利用し、購入状態の管理に RevenueCat, Inc.（米国）が提供する RevenueCat を使用します。</p>
        <p className="mt-2">購入手続きおよび購入状態の確認のため、以下の情報が Apple および RevenueCat によって処理されます。</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>購入履歴および商品識別子</li>
          <li>RevenueCat が生成する匿名のアプリユーザー識別子</li>
          <li>購入処理に関連する端末・アプリの診断情報</li>
        </ul>
        <p className="mt-2">これらは、有料機能の利用資格を判定する目的でのみ使用され、広告目的の追跡には使用されません。本アプリは、ユーザーの氏名、メールアドレス、電話番号を RevenueCat へ送信しません。</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>RevenueCat のプライバシーポリシー: <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.revenuecat.com/privacy</a></li>
          <li>Apple のプライバシーポリシー: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.apple.com/legal/privacy/</a></li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">5. バックアップファイル</h3>
        <p>本アプリは、ユーザーが設定画面で明示的に操作した場合にのみ、JSON または Excel 形式のバックアップファイルを生成します。生成したファイルの保存先・共有先は、iOS の共有画面でユーザーが選択します。当社は、これらのファイルの内容を取得しません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">6. 第三者提供</h3>
        <p>当社は、法令に基づく場合を除き、ユーザーの情報を第三者へ提供しません。</p>
        <p className="mt-2">本アプリが情報を送信する第三者は、前記第 4 項に記載した Apple および RevenueCat に限られます。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">7. 本アプリが行わないこと</h3>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>帳簿データ、証憑画像の当社サーバーへの送信</li>
          <li>広告の表示および広告目的のトラッキング</li>
          <li>位置情報、連絡先、健康情報の取得</li>
          <li>第三者への個人情報の販売</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">8. 子どものプライバシー</h3>
        <p>本アプリは、児童を対象としたアプリではありません。当社は、児童から意図的に個人情報を収集することはありません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">9. ユーザーによる管理</h3>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>記録したデータは、設定画面のバックアップ機能から書き出し、復元できます</li>
          <li>端末から本アプリを削除すると、端末内のアプリデータも削除されます</li>
          <li>サブスクリプションの確認・解約は、iOS の「設定」＞「サブスクリプション」、または本アプリの設定画面内「サブスク管理」から行えます</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">10. お問い合わせ</h3>
        <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li><strong>事業者:</strong> 合同会社slime</li>
          <li><strong>メール:</strong> <a href="mailto:info@yaneyuka.com" className="text-blue-600 hover:text-blue-800 underline">info@yaneyuka.com</a></li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">11. 改定</h3>
        <p>当社は、必要に応じて本ポリシーを改定します。重要な変更がある場合は、アプリ内または当社 Web サイトで通知します。</p>
      </div>

      <p className="text-[12px] text-gray-500 pt-2">
        制定日: 2026年6月14日<br />
        最終改定日: 2026年10月12日
      </p>

      <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-200 mt-4">
        © 2026 合同会社slime. All rights reserved.
      </p>
    </div>
  );
}

function EnglishContent() {
  return (
    <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
      <p className="text-[12px] text-gray-500">
        <strong>Last updated:</strong> 12 October 2026
      </p>
      <p>
        slime LLC (&ldquo;we&rdquo;, &ldquo;us&rdquo;) sets out below how user information is handled in the iOS app &ldquo;Accoria&rdquo; (the &ldquo;App&rdquo;).
      </p>

      <div>
        <h3 className="font-semibold mb-1">1. Our approach</h3>
        <p>The App stores the ledger data you record <strong>only on your device</strong>. We do not collect the income, expenses, planned payments, taxes, counterparties, notes or voucher images you record, and we do not transmit them to our servers.</p>
        <p className="mt-2">The App requires no account registration, shows no advertising, and performs no tracking for advertising purposes.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">2. Information stored on your device</h3>
        <p>The following is stored only on your device:</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>Ledgers, income and expense records, planned payments and receipts, recurring costs, and tax records</li>
          <li>Counterparties, account titles, tax treatments, payment methods and notes</li>
          <li>Images and PDFs attached as receipts or vouchers</li>
          <li>App settings such as display language, country profile, theme, and your current plan status</li>
        </ul>
        <p className="mt-2">This data is removed together with the App&rsquo;s data when you delete the App from your device. Depending on your device&rsquo;s iCloud backup settings, this data may be included in the device backup managed by Apple; that backup is handled in accordance with Apple&rsquo;s privacy policy.</p>
        <p className="mt-2">The assumptions you enter for the tax burden estimate (how you earn, income, age, deductions, spending and assets) are likewise stored only on your device. We do not collect them.</p>
        <p className="mt-2">Text recognition (OCR) of vouchers runs on the device. Neither the image nor the recognised text is sent to our servers or to any third party.</p>
        <p className="mt-2">If you choose a destination folder in the bookkeeping prep feature (a folder in cloud storage you already use, such as iCloud Drive, Dropbox or Google Drive), voucher images and their recognised data are written to that folder at your request. Data written there is handled under the privacy policy of the service you chose. We have no access to that folder, and nothing is sent to our servers.</p>
        <p className="mt-2">If you choose a destination folder, the App and the browser-based PC version of Accoria read and write your ledger data (ledgers, transactions, planned items, recurring costs, taxes, accounts, voucher records and assumptions) through a sync file in that folder. Syncing happens only between your devices and the folder you chose; it does not pass through our servers. The PC version follows this same policy and does not send your data to us or to any third party.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">3. Camera and photo access</h3>
        <p>Camera and photo access is used solely to attach receipts and vouchers to a transaction.</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>Access occurs only when you choose to attach a voucher</li>
          <li>The App receives only the image or PDF you capture or select</li>
          <li>The file is stored on your device and is not sent to us or to any third party</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">4. Subscription information</h3>
        <p>Paid plans use Apple auto-renewable subscriptions, with subscription status managed through RevenueCat, provided by RevenueCat, Inc. (United States).</p>
        <p className="mt-2">To process a purchase and determine your entitlement, the following is processed by Apple and RevenueCat:</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>Purchase history and product identifiers</li>
          <li>An anonymous app user identifier generated by RevenueCat</li>
          <li>Device and app diagnostic information related to purchase processing</li>
        </ul>
        <p className="mt-2">This information is used only to determine access to paid features and is not used for advertising or tracking. The App does not send your name, email address or phone number to RevenueCat.</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>RevenueCat privacy policy: <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.revenuecat.com/privacy</a></li>
          <li>Apple privacy policy: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.apple.com/legal/privacy/</a></li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">5. Backup files</h3>
        <p>The App creates a JSON or Excel backup file only when you explicitly request one from the Settings screen. You choose where the file is saved or shared using the iOS share sheet. We do not receive the contents of these files.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">6. Disclosure to third parties</h3>
        <p>We do not provide user information to third parties, except where required by law.</p>
        <p className="mt-2">The only third parties the App transmits information to are Apple and RevenueCat, as described in section 4.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">7. What the App does not do</h3>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>Send ledger data or voucher images to our servers</li>
          <li>Display advertising or perform tracking for advertising purposes</li>
          <li>Collect location, contacts or health information</li>
          <li>Sell personal information to third parties</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">8. Children&rsquo;s privacy</h3>
        <p>The App is not directed at children. We do not knowingly collect personal information from children.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">9. Your controls</h3>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>You can export and restore your data using the backup features in Settings</li>
          <li>Deleting the App from your device removes the App&rsquo;s data from that device</li>
          <li>You can review or cancel a subscription from iOS Settings &gt; Subscriptions, or via &ldquo;Manage subscription&rdquo; in the App&rsquo;s settings screen</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">10. Contact</h3>
        <p>For questions about this policy, please contact:</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li><strong>Business:</strong> slime LLC (合同会社slime)</li>
          <li><strong>Email:</strong> <a href="mailto:info@yaneyuka.com" className="text-blue-600 hover:text-blue-800 underline">info@yaneyuka.com</a></li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">11. Changes</h3>
        <p>We may revise this policy as needed. If a material change is made, we will give notice in the App or on our website.</p>
      </div>

      <p className="text-[12px] text-gray-500 pt-2">
        Effective date: 14 June 2026<br />
        Last updated: 12 October 2026
      </p>

      <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-200 mt-4">
        © 2026 slime LLC. All rights reserved.
      </p>
    </div>
  );
}
