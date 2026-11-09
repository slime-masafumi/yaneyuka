export default function NewsFilterTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-baseline mb-3">
        <h1 className="text-lg font-semibold">News Filter 利用規約</h1>
      </div>
      <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
        <p className="text-[12px] text-gray-500"><strong>最終更新日:</strong> 2026年5月13日</p>
        <p>
          本利用規約（以下「本規約」）は、合同会社slime（以下「当社」）が提供する iOS アプリ「News Filter」（バンドル ID: <code>com.newsfilter.app</code>、以下「本アプリ」）の利用条件を定めるものです。ユーザーは、本アプリをダウンロードまたは利用することにより、本規約に同意したものとみなされます。
        </p>

        <div>
          <h3 className="font-semibold mb-1">第 1 条（サービスの内容）</h3>
          <p>本アプリは、Google News および複数の日本語ニュースサイトが公開する RSS フィードを集約し、ユーザーが設定したキーワードに基づいてニュース記事をフィルタリング・表示するニュースアグリゲーションサービスです。</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>本アプリは、50 以上の日本語ニュースサイトの RSS フィードから記事のタイトル・概要・リンクを取得し表示します。</li>
            <li>記事の全文は本アプリ内に保存されず、元のニュースサイトへのリンクを通じて閲覧いただきます。</li>
            <li>表示される記事の内容は、各ニュースサイトの配信元に帰属します。</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 2 条（著作権および知的財産権）</h3>
          <p>本アプリを通じて表示されるニュース記事のタイトル、概要、画像等のコンテンツに関する著作権およびその他の知的財産権は、各配信元のニュースサイトまたはその権利者に帰属します。</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>ユーザーは、表示されたコンテンツを私的利用の範囲を超えて複製、転載、配布することはできません。</li>
            <li>本アプリの UI、デザイン、ソースコードに関する知的財産権は当社に帰属します。</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 3 条（アカウント）</h3>
          <p>本アプリでは、Firebase Anonymous Authentication による匿名認証が自動的に行われます。また、任意で Apple Sign In によるアカウント連携が可能です。</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>匿名アカウントのデータは、デバイスの変更や本アプリの再インストール時に引き継がれない場合があります。</li>
            <li>Apple Sign In によるアカウント連携を行うことで、デバイス間のデータ同期が可能になります。</li>
            <li>ユーザーは、自己の責任においてアカウントを管理するものとします。</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 4 条（サブスクリプション）</h3>
          <p>本アプリでは、一部の機能を有料サブスクリプション（自動更新型定期購読）として提供します。</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>サブスクリプションの料金、期間、および提供される機能は、App Store 上の購入画面に表示されるとおりとします。</li>
            <li>サブスクリプションは、現在の購読期間の終了日の 24 時間前までに解約されない限り、同期間で自動的に更新され、同額が App Store アカウントに請求されます。</li>
            <li>サブスクリプションの解約は、iOS の「設定」アプリ内のサブスクリプション管理画面、または本アプリ内の「サブスクリプション管理」リンクから行うことができます。</li>
            <li>サブスクリプションの管理には RevenueCat を使用しています。</li>
            <li>購入に関する返金については、Apple のポリシーに準じます。</li>
          </ul>
          <blockquote className="border-l-4 border-yellow-400 bg-yellow-50 pl-3 py-2 mt-2 text-[12px]">
            <strong>注意:</strong> サブスクリプションの解約後も、購読期間の終了までは有料機能をご利用いただけます。
          </blockquote>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 5 条（禁止事項）</h3>
          <p>ユーザーは、本アプリの利用にあたり、以下の行為を行ってはなりません。</p>
          <ol className="list-decimal pl-5 space-y-1 mt-1">
            <li>本アプリの逆コンパイル、リバースエンジニアリング、逆アセンブルその他の方法でソースコードを解読する行為</li>
            <li>本アプリのサーバーまたはネットワークに過度の負荷をかける行為</li>
            <li>自動化されたスクリプト、bot 等を使用して本アプリにアクセスする行為</li>
            <li>本アプリを通じて取得した情報を商業目的で無断利用する行為</li>
            <li>他のユーザーまたは第三者の権利を侵害する行為</li>
            <li>法令または公序良俗に反する行為</li>
            <li>本アプリの運営を妨害する行為</li>
            <li>その他、当社が不適切と判断する行為</li>
          </ol>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 6 条（サービスの変更・中断・終了）</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>当社は、ユーザーへの事前の通知なく、本アプリの内容を変更、または本アプリの提供を中断・終了することができるものとします。</li>
            <li>RSS フィードの配信元が配信を停止した場合、該当するニュースソースの記事は表示されなくなります。</li>
            <li>当社は、本アプリの中断・終了によってユーザーに生じた損害について、一切の責任を負いません。</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 7 条（免責事項）</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>本アプリは「現状有姿」で提供されるものであり、当社は本アプリの完全性、正確性、有用性、特定目的への適合性について一切保証しません。</li>
            <li>表示されるニュース記事の内容の正確性については、各配信元が責任を負うものとし、当社は一切の責任を負いません。</li>
            <li>本アプリの利用によってユーザーに生じた直接的・間接的な損害について、当社の故意または重大な過失による場合を除き、当社は一切の責任を負いません。</li>
            <li>当社が損害賠償責任を負う場合であっても、その額は、当該ユーザーが本アプリに対して支払った直近 12 ヶ月分のサブスクリプション料金の合計額を上限とします。</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 8 条（広告の表示）</h3>
          <p>本アプリでは、無料プランにおいて広告が表示される場合があります。広告の表示に伴い、第三者サービスがデバイス情報等を取得する場合があります。詳細はプライバシーポリシーをご確認ください。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 9 条（利用規約の変更）</h3>
          <p>当社は、必要に応じて本規約を変更できるものとします。変更後の利用規約は、本アプリ内または Web サイトに掲示した時点で効力を生じるものとします。重要な変更がある場合は、アプリ内通知等の方法でお知らせいたします。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 10 条（準拠法および管轄裁判所）</h3>
          <p>本規約の解釈および適用は、日本法に準拠するものとします。</p>
          <p className="mt-1">本規約に関して紛争が生じた場合には、当社の所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">第 11 条（分離可能性）</h3>
          <p>本規約のいずれかの条項が無効または執行不能とされた場合であっても、その他の条項の有効性には影響を与えないものとします。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">お問い合わせ</h3>
          <ul className="list-disc pl-5 space-y-0.5 mt-1">
            <li><strong>運営:</strong> 合同会社slime</li>
            <li><strong>アプリ名:</strong> News Filter</li>
            <li><strong>バンドル ID:</strong> <code>com.newsfilter.app</code></li>
            <li>
              <strong>メール:</strong>{' '}
              <a href="mailto:info@yaneyuka.com" className="text-blue-600 hover:text-blue-800 underline">
                info@yaneyuka.com
              </a>
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-200 mt-4">
          © 2026 合同会社slime. All rights reserved.
        </p>
      </div>
    </div>
  );
}
