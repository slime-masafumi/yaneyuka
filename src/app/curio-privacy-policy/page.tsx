const th = 'border border-gray-300 px-2 py-1 text-left whitespace-nowrap';
const td = 'border border-gray-300 px-2 py-1 align-top';

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full min-w-[560px] border-collapse text-[12px]">
        <thead>
          <tr className="bg-gray-100">
            {head.map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className={td}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CurioPrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-baseline mb-3">
        <h2 className="text-lg font-semibold">Curio プライバシーポリシー</h2>
      </div>
      <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
        <p>
          <strong>事業者名</strong>: 合同会社slime (以下「当社」)<br />
          <strong>サービス名</strong>: Curio (以下「本アプリ」)<br />
          <strong>最終更新日</strong>: 2026年10月11日
        </p>

        <div>
          <h3 className="font-semibold mb-1">1. はじめに</h3>
          <p>当社は本アプリの利用者 (以下「ユーザー」) のプライバシーを最大限尊重し、本ポリシーに従って個人情報・利用情報を取り扱います。</p>
          <p>本アプリは、ユーザーが撮影した写真と自分で決めた項目を記録し、自分だけの図鑑を作るためのアプリです。<strong>記録されたデータは、原則としてユーザーのiPhone端末内にのみ保存され、当社のサーバーへ送信されることはありません。</strong></p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">2. 取得する情報</h3>
          <p>本アプリは以下の情報を <strong>iPhone端末内で処理・保存</strong> し、当社サーバーに送信しません。</p>
          <Table
            head={['情報の種類', '利用機能', '取得手段']}
            rows={[
              ['写真', '記録への画像添付、図鑑の表紙', '端末カメラ / 写真ライブラリ'],
              ['ユーザーが入力したテキスト', '図鑑名、テーマ、項目名、項目の値、メモ', 'アプリ内の入力欄'],
              ['記録の作成日時・更新日時', '並べ替え、期間での絞り込み、年間まとめ', 'アプリが自動生成'],
              ['表示設定', '表示モード、一覧の表示形式、並び順', 'アプリ内の設定'],
            ]}
          />
          <p className="mt-2"><strong>当社はこれらの内容を閲覧できません。</strong> ユーザーアカウントの登録機能はなく、氏名・メールアドレス・電話番号・生年月日等の個人を識別する情報を当社が取得することはありません。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">3. 端末の権限</h3>
          <Table
            head={['権限', '用途', '拒否した場合']}
            rows={[
              ['カメラ', '記録に添付する写真をその場で撮影するため', '撮影機能のみ使えません。写真ライブラリからの追加は可能です'],
              ['写真ライブラリ', '保存済みの写真を記録に添付するため', 'ライブラリからの追加のみ使えません。撮影は可能です'],
            ]}
          />
          <p className="mt-2">いずれの権限も、ユーザーが該当の操作を行ったときにのみ使用します。バックグラウンドで撮影したり、写真ライブラリ全体を読み取って送信したりすることはありません。本アプリは位置情報・マイク・連絡先・カレンダー・ヘルスケアの権限を要求しません。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">4. 写真の保存場所</h3>
          <p>記録に添付された写真は、端末内の本アプリ専用の保存領域にコピーされ、そこに保管されます。当社のサーバーやクラウドストレージへアップロードされることはありません。</p>
          <p>iCloudバックアップを有効にしている場合、Appleのサービスに従って端末のバックアップに含まれる場合があります。この場合の取り扱いはAppleのプライバシーポリシーに従います。本アプリ独自の端末間同期機能はありません。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">5. アプリ内購入と第三者提供</h3>
          <p>本アプリの有料機能は買い切りのアプリ内課金として提供されます。自動更新のサブスクリプションではありません。</p>
          <p>決済はAppleが処理し、<strong>当社はクレジットカード番号等の決済情報を取得しません。</strong></p>
          <p>購入状態の管理のため、RevenueCat, Inc.(米国)が提供する課金管理サービスを利用します。同サービスには以下の情報が送信されます。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>本アプリが自動生成する匿名の識別子(氏名やメールアドレスとは結び付きません)</li>
            <li>Appleが発行する購入レシート、購入した商品の識別子、購入日時</li>
            <li>端末の機種名、OSバージョン、アプリのバージョン、国・地域</li>
          </ul>
          <p className="mt-2">
            <strong>ユーザーが記録した写真・テキストが同サービスへ送信されることはありません。</strong> RevenueCatにおける取り扱いは同社のプライバシーポリシー (
            <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.revenuecat.com/privacy</a>
            ) に従います。
          </p>

          <h4 className="font-semibold mt-3 mb-1">処理委託先の一覧</h4>
          <Table
            head={['委託先', '所在国', '目的', '送信される情報', '記録した写真・テキスト']}
            rows={[
              ['Apple Inc.', '米国', 'アプリ内課金の決済処理、アプリの配信', '購入に関する情報(決済情報はAppleが直接処理)', '送信しません'],
              ['RevenueCat, Inc.', '米国', '購入状態の管理', '匿名の識別子、購入レシート、商品識別子、購入日時、端末の機種名・OSバージョン・アプリのバージョン・国・地域', '送信しません'],
            ]}
          />
          <p className="mt-2">上記を除き、当社がユーザーの情報を第三者へ提供することはありません。</p>

          <h4 className="font-semibold mt-3 mb-1">更新の確認</h4>
          <p>新しいバージョンを案内するため、起動時とアプリを開き直したときに(15分以上あけて)、App Store(Apple)と当社のWebサイト(yaneyuka.com)へ本アプリの識別子を問い合わせ、最新のバージョン番号を受け取ります。この通信で送るのは本アプリの識別子だけで、<strong>記録した写真・テキストや個人を識別する情報は送信しません。</strong> 通信の性質上、接続元のIPアドレスは各サーバーに届きますが、当社はこれを利用者の識別に用いません。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">6. 広告・解析・トラッキング</h3>
          <p><strong>本アプリは広告SDK、アクセス解析SDK、クラッシュ解析SDK、トラッキング技術を一切使用しません。</strong></p>
          <p>App Tracking Transparency(ATT)の許可を求めることはなく、他社のアプリやWebサイトを横断してユーザーを追跡することもありません。</p>
          <p>なお、App Store経由での配信に伴いAppleが取得する統計情報(ダウンロード数等)については、Appleのプライバシーポリシーに従います。当社は個々のユーザーを識別できない集計値としてのみこれを参照します。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">7. データの書き出しと共有</h3>
          <p>本アプリには、記録を書き出す機能があります。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>記録を1枚のカード画像として書き出す</li>
            <li>図鑑を本(PDF)として書き出す</li>
            <li>写真を原寸で書き出す</li>
            <li>記録データをJSONファイルとして書き出す</li>
          </ul>
          <p className="mt-2">これらはいずれも<strong>ユーザー自身の操作によってのみ実行され</strong>、書き出し先(他のアプリ、メッセージ、ファイル保存等)はユーザーが選択します。当社が書き出された内容を受け取ることはありません。書き出し後のデータの取り扱いは、ユーザーが選択した送信先サービスの規約に従います。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">8. データの保存期間と削除</h3>
          <p>記録データはユーザーが削除するまで端末内に保存されます。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>個別の記録・図鑑の削除: アプリ内の削除操作により、まずゴミ箱へ移動します</li>
            <li>ゴミ箱: 削除から30日が経過すると、写真の実ファイルを含めて自動的に完全に削除されます。それ以前に手動で完全削除することもできます</li>
            <li><strong>すべてのデータの削除: 本アプリを端末からアンインストールすると、記録・写真を含むすべてのデータが削除されます</strong></li>
          </ul>
          <p className="mt-2">当社のサーバーにデータを保持していないため、当社への削除依頼は不要です。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">9. セキュリティ</h3>
          <p>記録データは端末のOSが提供する保護機構(パスコード・Face ID等による端末のロック、アプリごとのサンドボックス)によって保護されます。端末のパスコードを設定し、OSを最新に保つことを推奨します。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">10. 18歳未満の利用者</h3>
          <p>本アプリは特に低年齢層を対象としていません。13歳未満の利用者の情報を意図的に収集することはありません。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">11. 本ポリシーの変更</h3>
          <p>法令の変更・サービス内容の変更に応じて、本ポリシーを改定する場合があります。重大な変更がある場合はアプリ内またはウェブサイトでお知らせします。</p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">12. お問い合わせ</h3>
          <p>本ポリシーに関するお問い合わせは下記までお願いいたします。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>メール: info@yaneyuka.com</li>
            <li>事業者: 合同会社slime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
