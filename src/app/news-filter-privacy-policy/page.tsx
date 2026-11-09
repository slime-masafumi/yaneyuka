export default function NewsFilterPrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-baseline mb-3">
        <h1 className="text-lg font-semibold">News Filter プライバシーポリシー</h1>
      </div>
      <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
        <p className="text-[12px] text-gray-500"><strong>最終更新日:</strong> 2026年5月13日</p>
        <p>
          合同会社slime（以下「当社」）は、iOSアプリ「News Filter」（バンドルID: <code>com.newsfilter.app</code>、以下「本アプリ」）におけるユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
        </p>

        <div>
          <h3 className="font-semibold mb-1">1. 収集する情報</h3>
          <p>本アプリでは、サービスの提供・改善のために以下の情報を収集します。</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 text-left">情報の種類</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">収集方法</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">利用目的</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">匿名認証 ID</td>
                  <td className="border border-gray-300 px-2 py-1">Firebase Anonymous Auth による自動生成</td>
                  <td className="border border-gray-300 px-2 py-1">ユーザーデータの紐付け・同期</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">Apple ID 情報（メールアドレス等）</td>
                  <td className="border border-gray-300 px-2 py-1">Apple Sign In（任意）</td>
                  <td className="border border-gray-300 px-2 py-1">アカウント連携・データ復元</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">キーワード設定</td>
                  <td className="border border-gray-300 px-2 py-1">ユーザーによる入力</td>
                  <td className="border border-gray-300 px-2 py-1">ニュースのフィルタリング</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">閲覧履歴（既読フラグ）</td>
                  <td className="border border-gray-300 px-2 py-1">アプリ内での操作記録</td>
                  <td className="border border-gray-300 px-2 py-1">既読管理・ユーザー体験の向上</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">デバイス識別子</td>
                  <td className="border border-gray-300 px-2 py-1">広告 SDK による自動取得（将来導入予定）</td>
                  <td className="border border-gray-300 px-2 py-1">広告の配信・効果測定</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">サブスクリプション情報</td>
                  <td className="border border-gray-300 px-2 py-1">RevenueCat 経由</td>
                  <td className="border border-gray-300 px-2 py-1">購入状態の管理・復元</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            本アプリは、RSS フィードから取得したニュース記事のタイトル・概要・リンクのみを扱い、記事の全文を保存することはありません。
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">2. 第三者サービスの利用</h3>
          <p>本アプリでは、以下の第三者サービスを利用しています。各サービスのプライバシーポリシーも併せてご確認ください。</p>

          <h4 className="font-semibold mt-2 mb-1 text-[12px]">Firebase（Google LLC）</h4>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Firebase Authentication（匿名認証・Apple Sign In 連携）</li>
            <li>Cloud Firestore（データ保存、us-central1 リージョン）</li>
            <li>Cloud Functions（記事取得・配信処理）</li>
            <li>
              プライバシーポリシー:{' '}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                https://firebase.google.com/support/privacy
              </a>
            </li>
          </ul>

          <h4 className="font-semibold mt-2 mb-1 text-[12px]">RevenueCat, Inc.</h4>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>アプリ内サブスクリプションの管理・購入の復元に使用します。</li>
            <li>
              プライバシーポリシー:{' '}
              <a
                href="https://www.revenuecat.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                https://www.revenuecat.com/privacy
              </a>
            </li>
          </ul>

          <h4 className="font-semibold mt-2 mb-1 text-[12px]">Google AdMob（Google LLC、※将来導入予定）</h4>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>無料プランで広告配信を行う際に、デバイス識別子等の情報が収集される場合があります。</li>
            <li>
              プライバシーポリシー:{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                https://policies.google.com/privacy
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-1">3. データの保存場所と保護</h3>
          <p>ユーザーデータは、Google Cloud Platform（us-central1 リージョン）上の Firebase Cloud Firestore に保存されます。通信はすべて TLS/SSL により暗号化されています。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">4. データの保持期間</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>アカウントデータ:</strong> ユーザーがアカウントを削除するまで保持します。</li>
            <li><strong>記事マッチ情報:</strong> 最大 14 日間保持した後、自動的に削除されます。</li>
            <li><strong>匿名アカウント:</strong> 最終利用日から 12 ヶ月間操作がない場合、自動的に削除される場合があります。</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-1">5. ユーザーの権利</h3>
          <p>ユーザーは、以下の権利を有します。</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>データへのアクセス:</strong> ご自身のデータの開示を請求することができます。</li>
            <li><strong>データの訂正:</strong> キーワード設定等のデータはアプリ内で直接変更できます。</li>
            <li><strong>データの削除:</strong> 下記のお問い合わせ先までご連絡いただくことで、すべてのデータの削除を請求できます。</li>
            <li><strong>広告トラッキングの拒否:</strong> iOS 設定の「トラッキング」からアプリによるトラッキングを制限できます。</li>
          </ul>
          <p className="mt-1">データ削除のリクエストは、原則として 30 日以内に対応いたします。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">6. 子供のプライバシー</h3>
          <p>本アプリは、13 歳未満の児童を対象としたサービスではありません。13 歳未満の児童から意図的に個人情報を収集することはありません。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">7. プライバシーポリシーの変更</h3>
          <p>本ポリシーの内容は、法令の改正やサービス内容の変更に伴い、予告なく変更される場合があります。重要な変更がある場合は、アプリ内通知または Web サイトにてお知らせいたします。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">8. お問い合わせ</h3>
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
