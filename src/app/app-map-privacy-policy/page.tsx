import BilingualLegal from '@/components/BilingualLegal';

// Server Component. BilingualLegal がクライアント側でトグルUIを提供し、
// 本文は両言語とも SSR で DOM に書き出されるため、SEO・App Storeクローラ両方で検出可能。
export default function AppMapPrivacyPolicyPage() {
  return (
    <BilingualLegal
      titleEn="LayerMap Privacy Policy"
      titleJa="情報分解地図 プライバシーポリシー"
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
        <strong>最終更新日:</strong> 2026年9月28日
      </p>
      <p>
        合同会社slime（以下「当社」といいます）は、当社が提供する iOS アプリ「情報分解地図」（英語名 LayerMap、以下「本アプリ」といいます）におけるユーザー情報の取扱いについて、以下のとおり定めます。
      </p>

      <div>
        <h3 className="font-semibold mb-1">1. 位置情報</h3>
        <p>本アプリは、端末の現在地を地図の表示と移動のためにのみ、<strong>端末の中だけで</strong>使用します。現在地を当社のサーバーへ送信することはありません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">2. 地点分解</h3>
        <p>ユーザーが地図上で選んだ地点について情報を表示するため、その地点の緯度経度を当社の API サーバー（Cloudflare Workers）へ送信し、国土交通省 不動産情報ライブラリ、国土地理院などの公的データを照会します。</p>
        <p className="mt-2">照会結果は、地点ごとではなく地図のタイル単位で一定期間キャッシュします。キャッシュした情報を個人と結び付けることはありません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">3. 地図の読み込み</h3>
        <p>地図の画像は、端末から各提供元（国土地理院、ハザードマップポータルサイト、今昔マップ on the web、Apple、AWS、各国の地図機関など）へ直接取得します。その際、各提供元には通常の通信と同じく、IP アドレスなどの情報が伝わります。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">4. 住所の表示</h3>
        <p>座標から住所を求めるために、Apple の地図サービス（MapKit）を使用します。</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>Apple のプライバシーポリシー: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.apple.com/legal/privacy/</a></li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">5. 購入</h3>
        <p>本アプリ内の購入は App Store（Apple）で行われます。当社は支払い情報を受け取りません。購入状態の確認は、端末と Apple の間で行われます。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">6. 不正利用の防止</h3>
        <p>本アプリが正規のものであることを確かめるため、Apple の App Attest の仕組みで生成された鍵の識別子を当社のサーバーへ送信することがあります。この識別子には、個人を特定する情報は含まれません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">7. 収集しない情報</h3>
        <p>本アプリは、以下の情報を収集しません。</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>氏名</li>
          <li>メールアドレス</li>
          <li>連絡先</li>
          <li>広告識別子</li>
        </ul>
        <p className="mt-2">本アプリは、広告・行動解析・トラッキングのためのツールを使用していません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">8. 第三者提供</h3>
        <p>当社は、法令に基づく場合を除き、ユーザーの情報を第三者へ提供しません。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">9. 改定</h3>
        <p>当社は、必要に応じて本ポリシーを改定します。重要な変更がある場合は、アプリ内または当社 Web サイトで通知します。</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">10. お問い合わせ</h3>
        <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li><strong>事業者:</strong> 合同会社slime</li>
          <li><strong>メール:</strong> <a href="mailto:info@yaneyuka.com" className="text-blue-600 hover:text-blue-800 underline">info@yaneyuka.com</a></li>
        </ul>
      </div>

      <p className="text-[12px] text-gray-500 pt-2">
        制定日: 2026年9月28日
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
        <strong>Last updated:</strong> September 28, 2026
      </p>
      <p>
        slime LLC (&ldquo;we&rdquo;, &ldquo;us&rdquo;) sets out below how user information is handled in the iOS app &ldquo;LayerMap&rdquo; (Japanese name: 情報分解地図; the &ldquo;App&rdquo;).
      </p>

      <div>
        <h3 className="font-semibold mb-1">1. Location</h3>
        <p>The App uses your device&rsquo;s current location <strong>only on your device</strong>, solely to display and move the map. Your current location is never sent to our servers.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">2. Place breakdown</h3>
        <p>To show information about a place you select on the map, the App sends the latitude and longitude of that place to our API server (Cloudflare Workers), which queries public data such as the Real Estate Information Library of the Ministry of Land, Infrastructure, Transport and Tourism and the Geospatial Information Authority of Japan.</p>
        <p className="mt-2">Query results are cached for a limited period per map tile, not per place. Cached information is never linked to any individual.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">3. Loading map imagery</h3>
        <p>Map images are fetched directly from your device from each provider (such as the Geospatial Information Authority of Japan, the Hazard Map Portal Site, Konjaku Map on the web, Apple, AWS, and national mapping agencies of various countries). As with any ordinary network request, information such as your IP address is disclosed to each provider when this happens.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">4. Address lookup</h3>
        <p>The App uses Apple&rsquo;s map service (MapKit) to find an address from coordinates.</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>Apple privacy policy: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://www.apple.com/legal/privacy/</a></li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-1">5. Purchases</h3>
        <p>Purchases are made through the App Store (Apple). We do not receive your payment information. Purchase status is verified between your device and Apple.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">6. Fraud prevention</h3>
        <p>To confirm that the App is genuine, the App may send our servers the identifier of a key generated through Apple&rsquo;s App Attest mechanism. This identifier contains no information that identifies you personally.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">7. Information we do not collect</h3>
        <p>The App does not collect:</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li>Your name</li>
          <li>Email addresses</li>
          <li>Contacts</li>
          <li>Advertising identifiers</li>
        </ul>
        <p className="mt-2">The App does not use any advertising, behavioral analytics or tracking tools.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">8. Disclosure to third parties</h3>
        <p>We do not provide user information to third parties, except where required by law.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">9. Changes</h3>
        <p>We may revise this policy as needed. If a material change is made, we will give notice in the App or on our website.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-1">10. Contact</h3>
        <p>For questions about this policy, please contact:</p>
        <ul className="list-disc pl-5 space-y-0.5 mt-1">
          <li><strong>Business:</strong> slime LLC (合同会社slime)</li>
          <li><strong>Email:</strong> <a href="mailto:info@yaneyuka.com" className="text-blue-600 hover:text-blue-800 underline">info@yaneyuka.com</a></li>
        </ul>
      </div>

      <p className="text-[12px] text-gray-500 pt-2">
        Effective date: September 28, 2026
      </p>

      <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-200 mt-4">
        © 2026 slime LLC. All rights reserved.
      </p>
    </div>
  );
}
