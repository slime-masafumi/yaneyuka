'use client';

import React, { useState } from 'react';

interface OpeningContentProps {
  subcategory: string;
}

const OpeningContent: React.FC<OpeningContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  // リンクのレンダリングヘルパー関数
  const renderLink = (url: string, label: string) => {
    const isValidUrl = url && url !== '#' && url.trim() !== '';
    if (isValidUrl) {
      return <a href={url} target="_blank" className="text-blue-800 hover:text-blue-900 underline cursor-pointer">{label}</a>;
    } else {
      return <span className="text-gray-600 no-underline cursor-not-allowed">{label}</span>;
    }
  };

  const renderSubcategoryContent = () => {
    switch (subcategory) {
      case 'aluminum-sash':
        return (
          <div className="opening-subcategory">
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">アルミサッシ</h2>
              <button
                onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
                className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
              >
                <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
              </button>
              <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
            </div>
            
            {/* 基本知識トグル */}
            {showBasicKnowledge && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <h3 className="font-bold text-[13px] mb-1.5">【アルミ樹脂複合サッシ】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">現在の「標準」は純アルミではない</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔ながらの「オールアルミサッシ」は、断熱性が低く結露しやすいため、現在の新築住宅（居室）ではほとんど使われない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  主流: 室外側は耐久性のある「アルミ」、室内側は断熱性の高い「樹脂」を使った<strong>「アルミ樹脂複合サッシ」</strong>が現在のスタンダード。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">結露（けつろ）発生のメカニズム</h4>
                
                <p className="mb-1 text-xs ml-3">
                  アルミの熱伝導率は、樹脂の約1000倍。オールアルミだと外の冷気がダイレクトに室内に伝わる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  複合サッシでも、アルミ部分（枠の室外側やレール部分）は冷えるため、環境によっては結露する。<strong>「完全結露フリー」</strong>を求めるならオール樹脂サッシが必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「Low-E（ロウイー）複層ガラス」とのセット運用</h4>
                
                <p className="mb-1 text-xs ml-3">
                  サッシ枠の性能だけでなく、ガラスの性能が断熱を左右する。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  現在は、特殊な金属膜をコーティングした<strong>「Low-E複層ガラス」</strong>が標準。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  使い分け: <strong>「遮熱タイプ（日射を遮る／夏重視）」</strong>と<strong>「断熱タイプ（日射を取り込む／冬重視）」</strong>を、窓の方角によって使い分ける提案ができるかが設計の質に関わる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【リフォーム・改修】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">壁を壊さない「カバー工法」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔はサッシ交換には外壁の解体が必要だったが、現在は既存のサッシ枠を残し、その上から新しい枠を被せる<strong>「カバー工法」</strong>が主流。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>メリット</strong>: 1窓あたり半日〜1日で工事が完了し、住みながらの交換が可能。雨漏りのリスクも少ない。</li>
                  <li><span className="mr-1">・</span><strong>デメリット</strong>: 既存枠の中に新枠を入れるため、開口面積（ガラス面）が一回り小さくなる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">マンション用と木造用の違い</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ビル用サッシ（マンション）</strong>: コンクリート躯体に溶接やアンカーで固定する。耐風圧性能や水密性能が非常に高い。</li>
                  <li><span className="mr-1">・</span><strong>住宅用サッシ（木造）</strong>: 柱や間柱に釘やビスで固定する。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  ※リフォームの際、RC造の建物に木造用のサッシを無理やり付けると、強度不足や漏水の原因になるため、適合する種類の選定が必須。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【防火設備・性能】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「網入りガラス」の法的制限</h4>
                
                <p className="mb-1 text-xs ml-3">
                  都市部の「防火地域・準防火地域」では、延焼のおそれのある部分（隣地境界線に近い窓など）に<strong>「防火設備」</strong>の認定を受けたサッシを使わなければならない。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>網（ワイヤー）</strong>: 一般的に防火ガラスには金網が入るが、視界が遮られるため嫌がられることが多い。</li>
                  <li><span className="mr-1">・</span><strong>耐熱強化ガラス</strong>: 網のない透明な防火ガラス（マイボーカ、パイロクリア等）も選べるが、価格は高くなる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">防音性能を示す「T等級」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  幹線道路や線路沿いでは、気密性が高く音を通しにくいサッシ選定が必要。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  T-1 &lt; T-2 &lt; T-3 &lt; T-4: 数字が大きいほど防音性能が高い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  一般的なペアガラスは「低音域の共鳴透過」により、意外と音が抜けることがある。本格的な防音には<strong>「異厚ペアガラス（厚さの違うガラスの組み合わせ）」</strong>や二重窓（インナーサッシ）が有効。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">台風対策と「耐風圧性（S等級）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  高層階や沿岸部、台風の通り道では、ガラスが割れなくても強風でサッシ枠自体が弓なりに変形し、隙間から雨が噴き込むことがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  建設地に応じた<strong>「耐風圧等級（S-1〜S-7）」と「水密性能（W-1〜W-5）」</strong>を満たすグレードの選定が、台風被害を防ぐ鍵となる。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {/* カード1：掲載募集カード */}
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" />
              </div>
            </div>

            {/* 通常企業（テキストリンク形式） */}
            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・LIXIL</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lixil.co.jp/lineup/window/', '商品ページ')}｜
                {renderLink('https://ctlgsearch.lixil.co.jp/public/index.php?target=builder&category=CTGMC_4168793', 'カタログ')}｜
                {renderLink('https://www.lixil.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.lixil.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/consumer/search/products/window', '商品ページ')}｜
                {renderLink('https://webcatalog.ykkap.co.jp/', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/business/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/business/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三協立山</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://alumi.st-grp.co.jp/products/window/index.html', '商品ページ')}｜
                {renderLink('https://appsp.st-grp.co.jp/', 'カタログ')}｜
                {renderLink('https://alumi.st-grp.co.jp/shr/', '営業所')}｜
                {renderLink('https://alumi.st-grp.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・不二サッシ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fujisash.co.jp/hp/product/', '商品ページ')}｜
                {renderLink('https://www.fujisash.co.jp/cgi-bin/fujisash_show.cgi?Section=catalog_all', 'カタログ')}｜
                {renderLink('https://www.fujisash.co.jp/hp/company/place/', '営業所')}｜
                {renderLink('https://www.fujisash.co.jp/hp/support/faq/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・昭和フロント</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sfn.co.jp/product/series.html', '商品ページ')}｜
                {renderLink('https://www.sfn.co.jp/web_catalog.html', 'カタログ')}｜
                {renderLink('https://www.sfn.co.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.sfn.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・豊和工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.howa.co.jp/products/fittings/product02/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.howa.co.jp/corporate/about.html#office', '営業所')}｜
                {renderLink('https://www.howa.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・森田アルミ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://moritaalumi.co.jp/product/detail.php?id=45', '商品ページ')}｜
                {renderLink('https://moritaalumi.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://moritaalumi.co.jp/company/accessmap.php', '営業所')}｜
                {renderLink('https://moritaalumi.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'resin-sash':
        return (
          <div className="opening-subcategory">
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">樹脂サッシ</h2>
              <button
                onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
                className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
              >
                <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
              </button>
              <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
            </div>
            
            {/* 基本知識トグル */}
            {showBasicKnowledge && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <h3 className="font-bold text-[13px] mb-1.5">【樹脂サッシ（オール樹脂窓）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">熱を伝えない「断熱性」の決定版</h4>
                
                <p className="mb-1 text-xs ml-3">
                  樹脂（塩化ビニル）の熱伝導率は、アルミの約1/1000。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  外の寒さ・暑さを室内に伝えないため、結露がほぼ発生しない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  世界基準: 欧米や北海道では樹脂サッシが当たり前（アルミサッシは使われない）。近年の<strong>「高気密高断熱住宅（HEAT20 G2・G3グレード）」</strong>では必須の建材となっている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「紫外線劣化」への対策と誤解</h4>
                
                <p className="mb-1 text-xs ml-3">
                  「プラスチックだから太陽光でボロボロになるのでは？」という懸念があるが、建材用の樹脂には劣化防止剤が含まれており、さらに表面に高耐候のアクリル層をコーティングしている製品が多いため、30年以上の耐久性がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  塩害に最強: 金属ではないため、絶対に錆びない。海沿いの家ではアルミサッシよりも長持ちする。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「防火地域」でのコストアップ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  樹脂は燃えるため、都市部の「防火・準防火地域」で使うには、特殊な補強を入れた<strong>「防火認定品」</strong>である必要がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 防火仕様の樹脂サッシは、非防火仕様に比べて価格が跳ね上がる上、選べる窓の種類が制限されることが多い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「トリプルガラス」との相性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  樹脂サッシは枠が太く強度があるため、重い<strong>「トリプルガラス（3層ガラス）」</strong>を組み込むのに適している。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ペアガラス（2層）からトリプルガラスにグレードアップすることで、壁と同等レベルの断熱性能を発揮する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">枠の「太さ」と「重さ」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  アルミに比べて強度が低いため、同じ強度を出すためにフレーム（枠）が太く作られている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  デメリット: ガラス面積が少し狭くなる。また、ガラスが分厚くなるため窓自体が非常に重く、掃き出し窓などの開閉には力が必要になる（サポートハンドル付き推奨）。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">溶着（ようちゃく）による完全防水</h4>
                
                <p className="mb-1 text-xs ml-3">
                  アルミサッシは枠をビスで組み立てるが、樹脂サッシは四隅を熱で溶かしてくっつける<strong>「溶着」</strong>で組み立てる製品が多い（YKK APのAPWシリーズなど）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  隙間が完全に塞がるため、気密性と水密性が極めて高い。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {/* カード1：掲載募集カード */}
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" />
              </div>
            </div>

            {/* 通常企業（テキストリンク形式） */}
            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・LIXIL</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lixil.co.jp/lineup/window/ew/', '商品ページ')}｜
                {renderLink('https://webcatalog.lixil.co.jp/iportal/CatalogDetail.do?method=initial_screen&catalogID=16908270000&volumeID=LXL13001&designID=newinter', 'カタログ')}｜
                {renderLink('https://www.lixil.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.lixil.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/consumer/search/products/window/pvc', '商品ページ')}｜
                {renderLink('https://webcatalog.ykkap.co.jp/iportal/CatalogSearch.do?method=catalogSearchByAnyCategories&volumeID=YKKAPDC1&categoryID=4146490000&sortKey=CatalogMain2210000&sortOrder=ASC&designID=pro', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/business/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/business/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三協立山</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://alumi.st-grp.co.jp/products/window/smarju/', '商品ページ')}｜
                {renderLink('https://appsp.st-grp.co.jp/iportal/CatalogDetail.do?method=initial_screen&volumeID=STAWC001&parentCategoryID=581170000&categoryID=581170000&catalogID=19900180000&labelID=&type=c&position=19&sortKey=CatalogMajor12530000&sortOrder=ASC&designID=WCAT001', 'カタログ')}｜
                {renderLink('https://alumi.st-grp.co.jp/shr/', '営業所')}｜
                {renderLink('https://alumi.st-grp.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・エクセルシャノン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.excelshanon.co.jp/product/', '商品ページ')}｜
                {renderLink('https://www.excelshanon.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.excelshanon.co.jp/company/outline.html', '営業所')}｜
                {renderLink('https://www.excelshanon.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・フクビ化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fukuvi.co.jp/product/5/01?place=house', '商品ページ')}｜
                {renderLink('https://www.fukuvi.co.jp/data/cat/454', 'カタログ')}｜
                {renderLink('https://www.fukuvi.co.jp/company/office', '営業所')}｜
                {renderLink('https://www.fukuvi.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ハウディー</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.howdy-inc.com/lineup/window', '商品ページ')}｜
                {renderLink('https://www.howdy-inc.com/catalog#shouhin', 'カタログ')}｜
                {renderLink('https://www.howdy-inc.com/room', '営業所')}｜
                {renderLink('https://www.howdy-inc.com/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ナガイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagai.co.jp/main/product_cat/window/', '商品ページ')}｜
                {renderLink('https://www.nagai.co.jp/support/catalog.html', 'カタログ')}｜
                {renderLink('https://www.nagai.co.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.nagai.co.jp/first/formail/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・昭和フロント</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sfn.co.jp/product.html', '商品ページ')}｜
                {renderLink('https://www.sfn.co.jp/web_catalog.html', 'カタログ')}｜
                {renderLink('https://www.sfn.co.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.sfn.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セイキ販売</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.seiki.gr.jp/products/screen/rakumado/', '商品ページ')}｜
                {renderLink('https://www.seiki.gr.jp/catalog/web/', 'カタログ')}｜
                {renderLink('https://www.seiki.gr.jp/showroom.html', '営業所')}｜
                {renderLink('https://www.seiki.gr.jp/form/trade/form.php', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'wood-sash':
        return (
          <div className="opening-subcategory">
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">木製サッシ</h2>
              <button
                onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
                className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
              >
                <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
              </button>
              <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
            </div>
            
            {/* 基本知識トグル */}
            {showBasicKnowledge && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <h3 className="font-bold text-[13px] mb-1.5">【木製サッシ】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">断熱性能は「最強」クラス</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木材の熱伝導率は、アルミの約1/1200、樹脂の約1/4（樹種による）。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  枠そのものが断熱材のようなものなので、結露は物理的にほぼ発生しない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  欧州の<strong>「パッシブハウス（超高断熱住宅）」</strong>など、性能を極限まで追求する建築では木製サッシが標準となる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">メンテナンスの覚悟が必要</h4>
                
                <p className="mb-1 text-xs ml-3">
                  紫外線と雨による劣化（腐朽・変色）が避けられない。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  必須作業: 3〜5年ごとの<strong>「再塗装（保護塗料）」</strong>が必要。これを怠ると、枠が腐ってガラスが落ちるなどの事故につながる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  施主自身でメンテナンスを楽しむDIY精神があるか、メンテナンス契約を結ぶ予算がある場合以外は推奨しにくい。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">最強のハイブリッド「アルミクラッド」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木製サッシの弱点（外部の劣化）を克服するため、室外側をアルミで覆い、室内側は木そのものという<strong>「アルミクラッド（被覆）構法」</strong>の製品がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 外部の再塗装が不要になり、耐久性が格段に上がる。日本の気候ではこのタイプが最も現実的で安心。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">都市部での「防火認定」の壁</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木は燃えるため、都市部の「防火・準防火地域」で使うには、厳しい試験をクリアした<strong>「防火認定品」</strong>でなければならない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 防火設備の認定を取っている木製サッシメーカーは限られる上、網入りガラス限定だったり、価格が通常の木製サッシの1.5〜2倍になったりするため、予算管理がシビアになる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「ドレーキップ（内倒し・内開き）」という開き方</h4>
                
                <p className="mb-1 text-xs ml-3">
                  日本製サッシは「引き違い（スライド）」が主だが、木製サッシ（特に欧州製やその技術を入れたもの）は、ハンドル操作で「内倒し（換気）」と「内開き（掃除）」の2通りの開き方ができる<strong>「ドレーキップ窓」</strong>が主流。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  気密性: 引き違い窓よりも圧倒的に気密性が高いため、高断熱住宅の性能をフルに発揮できる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「スライディング」の重さ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木製の掃き出し窓（スライディング）は、ガラスと木枠の重さで数百キロになることもある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  国産アルミサッシのような「指一本で開く軽さ」とは別物。重厚感はあるが、高齢者には開閉が重すぎる場合があるため、<strong>「ヘーベシーベ（持ち上げスライド）」</strong>等の金物機構の確認が必要。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {/* カード1：掲載募集カード */}
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" />
              </div>
            </div>

            {/* 通常企業（テキストリンク形式） */}
            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/consumer/search/products/window/wood', '商品ページ')}｜
                {renderLink('https://webcatalog.ykkap.co.jp/iportal/CatalogSearch.do?method=catalogSearchByAnyCategories&volumeID=YKKAPDC1&categoryID=4146490000&sortKey=CatalogMain2210000&sortOrder=ASC&designID=pro', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/business/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/business/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・NORD</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ric-nord.co.jp/lineup/index.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.ric-nord.co.jp/about/index.html', '営業所')}｜
                {renderLink('https://www.ric-nord.co.jp/contact/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・文化シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://bunka-s-pro.jp/product_category/shutter/w-shutter/', '商品ページ')}｜
                {renderLink('https://bunka-s.actibookone.com/category/list?param=eyJjYXRlZ29yeV9udW0iOjQ5NDgyfQ==', 'カタログ')}｜
                {renderLink('https://www.bunka-s.co.jp/corporate/group/', '営業所')}｜
                {renderLink('https://faq-bunka-s.dga.jp/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ハウディー</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.howdy-inc.com/lineup/window', '商品ページ')}｜
                {renderLink('https://www.howdy-inc.com/catalog#shouhin', 'カタログ')}｜
                {renderLink('https://www.howdy-inc.com/room', '営業所')}｜
                {renderLink('https://www.howdy-inc.com/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・上野住宅建材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://uenojyuken.co.jp/products/brand/', '商品ページ')}｜
                {renderLink('https://uenojyuken.co.jp/wp/wp-content/uploads/2024/07/Ueno_catalog_24-25_full_xs.pdf', 'カタログ')}｜
                {renderLink('https://uenojyuken.co.jp/about/access/', '営業所')}｜
                {renderLink('https://uenojyuken.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・プレイリーホームズ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.prairie.co.jp/product/wooden_sash.html', '商品ページ')}｜
                {renderLink('https://www.prairie.co.jp/catalog', 'カタログ')}｜
                {renderLink('https://www.prairie.co.jp/showroom', '営業所')}｜
                {renderLink('https://www.prairie.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ナガイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagai.co.jp/main/product_cat/window/', '商品ページ')}｜
                {renderLink('https://www.nagai.co.jp/support/catalog.html', 'カタログ')}｜
                {renderLink('https://www.nagai.co.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.nagai.co.jp/first/formail/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アルス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://yumemado.com/yumemado/', '商品ページ')}｜
                {renderLink('https://yumemado.com/column/5/', 'カタログ')}｜
                {renderLink('https://yumemado.com/company-info/', '営業所')}｜
                {renderLink('https://yumemado.com/contact/input/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本の窓</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://nipponnomado.jp/wp/woodsash-item01.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://nipponnomado.jp/wp/showroom.html', '営業所')}｜
                {renderLink('https://nipponnomado.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ニュースト</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.newxt.co.jp/products/wwf.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.newxt.co.jp/corp/', '営業所')}｜
                {renderLink('#', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'light-shutter':
        return (
          <div className="opening-subcategory">
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">軽量シャッター</h2>
              <button
                onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
                className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
              >
                <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
              </button>
              <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
            </div>
            
            {/* 基本知識トグル */}
            {showBasicKnowledge && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <h3 className="font-bold text-[13px] mb-1.5">【軽量シャッター】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「重量シャッター」との法的な違い</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>軽量シャッター</strong>: 板厚が1.6mm未満（通常0.5mm〜0.8mm程度）。主に防犯・雨風よけの用途。防火設備（防火シャッター）としては使えない場合がほとんど。</li>
                  <li><span className="mr-1">・</span><strong>重量シャッター</strong>: 板厚が1.6mm以上。ビルや大規模施設に使われ、防火・防煙区画を形成できる。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  ※<strong>「防火設備」</strong>が必要な開口部に、安易に軽量シャッターを選定しないよう法規制の確認が最優先。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">手動式の命綱「スプリング（バネ）」の寿命</h4>
                
                <p className="mb-1 text-xs ml-3">
                  手動シャッターが軽く上がるのは、上の巻き取り軸にある「バランススプリング」がアシストしているため。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: スプリングは金属疲労で必ずヘタる。10年〜15年で「重くて上がらない」状態になるのは故障ではなく寿命。スプリングの交換や巻き直し調整が必要になる消耗品と認識しておくべき。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">台風対策と「耐風圧強度」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  軽量シャッターは薄いため、強風でガイドレールから外れたり、スラット（面材）がめくれ上がったりしやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  補強: 台風対策として、<strong>「耐風フック付き」</strong>の製品を選ぶか、間口が広い場合は<strong>「中柱（なかばしら）」</strong>を立てて補強する仕様が推奨される。近年の大型台風では標準仕様だと破損するケースが増えている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「スチール」と「アルミ」の決定的な差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>スチール（鉄）</strong>: 標準的で安価だが、傷から錆びやすい。開閉音（ガラガラ音）が大きい。</li>
                  <li><span className="mr-1">・</span><strong>アルミ</strong>: 高価（スチールの2〜3倍）だが、錆びにくく、開閉音が非常に静か。早朝・深夜に開閉する住宅ガレージでは、近所迷惑防止のためアルミまたは「静音タイプ」が必須級。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">挟まれ事故を防ぐ「障害物検知装置」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  電動シャッターを選ぶ際、下降中に人や物に当たると自動で止まる（または反転上昇する）<strong>「障害物検知センサー（座板スイッチや光電管）」</strong>が付いているかは安全上の最重要チェックポイント。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  古い電動シャッターには付いていないことが多く、事故につながりやすいため、最新の安全基準適合品を選ぶべき。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「電動化リフォーム」の可否</h4>
                
                <p className="mb-1 text-xs ml-3">
                  現在手動のシャッターを、後付けで電動にしたいという需要は多い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  シャッターボックス（巻き取り部）ごっそり交換しなくても、軸（シャフト）部分にモーターを組み込むだけで電動化できる<strong>「後付けキット」</strong>や工法が存在する。メーカー選定の際、リフォーム対応力の有無もポイントになる。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {/* カード1：掲載募集カード */}
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" />
              </div>
            </div>

            {/* 通常企業（テキストリンク形式） */}
            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三和シヤッター工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sanwa-ss.co.jp/professional/products/?product[]=light_garage', '商品ページ')}｜
                {renderLink('https://dcs4.icata.net/iportal/CatalogSearch.do?method=catalogSearchByCategory&volumeID=SSY00001&categoryID=246670000&designID=SSYD001&searchObject=carrentCategory', 'カタログ')}｜
                {renderLink('https://www.sanwa-ss.co.jp/company/list/', '営業所')}｜
                {renderLink('https://www.sanwa-ss.co.jp/ask/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・文化シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://bunka-s-pro.jp/product_category/shutter/k-shutter/', '商品ページ')}｜
                {renderLink('https://bunka-s.actibookone.com/category/list?param=eyJjYXRlZ29yeV9udW0iOjQ1NDMyfQ==', 'カタログ')}｜
                {renderLink('https://www.bunka-s.co.jp/corporate/group/', '営業所')}｜
                {renderLink('https://faq-bunka-s.dga.jp/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東洋シヤッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toyo-shutter.co.jp/product/cat-s/keiryou/', '商品ページ')}｜
                {renderLink('https://toyo-shutter-catalog.jp/library/public/book/list?search%5Bhigh_category%5D=2', 'カタログ')}｜
                {renderLink('https://www.toyo-shutter.co.jp/profile/office.html', '営業所')}｜
                {renderLink('https://www.toyo-shutter.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・小俣シャッター工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.omata-s.co.jp/products/#p3', '商品ページ')}｜
                {renderLink('https://www.omata-s.co.jp/documents/', 'カタログ')}｜
                {renderLink('https://www.omata-s.co.jp/company/', '営業所')}｜
                {renderLink('https://www.omata-s.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大和シヤッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiwa-sh.co.jp/products.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.daiwa-sh.co.jp/company.html', '営業所')}｜
                {renderLink('https://www.daiwa-sh.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・鈴木シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://suzuki-sh.co.jp/shutter/keiryou-shop/#', '商品ページ')}｜
                {renderLink('https://suzuki-sh.co.jp/catalogue/', 'カタログ')}｜
                {renderLink('https://suzuki-sh.co.jp/corporate/base/', '営業所')}｜
                {renderLink('https://suzuki-sh.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・安中製作所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.annaka-ss.co.jp/noiless-shutter/light_weight/index.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.annaka-ss.co.jp/noiless-shutter/office/index.html', '営業所')}｜
                {renderLink('https://www.annaka-ss.co.jp/policy.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'heavy-shutter':
        return (
          <div className="opening-subcategory">
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">重量シャッター</h2>
              <button
                onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
                className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
              >
                <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
              </button>
              <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
            </div>
            
            {/* 基本知識トグル */}
            {showBasicKnowledge && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <h3 className="font-bold text-[13px] mb-1.5">【重量シャッター（防火シャッター等）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「厚み」による明確な定義</h4>
                
                <p className="mb-1 text-xs ml-3">
                  スラット（カーテン部分）の鉄板の厚みが1.6mm以上のものを重量シャッターと呼ぶ（軽量は0.5〜0.8mm）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  用途: 防犯目的の「管理用シャッター」と、火災時に延焼を防ぐ<strong>「防火シャッター（防火設備）」</strong>に大別されるが、多くは防火性能を求められる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「危害防止装置（きがいぼうしそうち）」の設置義務</h4>
                
                <p className="mb-1 text-xs ml-3">
                  降下中に人や物が挟まると、感知して自動的に停止（座板スイッチ式）、または反転上昇する安全装置。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 過去に挟まれ事故が多発したため、現在は防火シャッターへの設置が義務化されている。古い建物で未設置の場合は、改修時に設置が強く推奨される。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">火災感知器との「連動」システム</h4>
                
                <p className="mb-1 text-xs ml-3">
                  防火シャッターは、火災報知器（煙感知器・熱感知器）が火災を感知すると、電動で自動的に閉鎖する仕組みになっている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  <strong>自動閉鎖装置（危害防止連動中継器）</strong>: 予期せぬタイミングで閉まることがあるため、シャッター下には絶対に物を置いてはいけない（「荷物挟まり」は最大の故障原因）。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「遮煙（しゃえん）性能」を持つ防煙シャッター</h4>
                
                <p className="mb-1 text-xs ml-3">
                  通常の防火シャッターは「炎」は防ぐが「煙」は通してしまう。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  エレベーターホールや地下街など、煙の拡散を防ぐ必要がある場所では、気密性が高く煙を通さない<strong>「遮煙性能を有する防火設備（防煙シャッター）」</strong>の選定が法的に必須となる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「くぐり戸」の有無と避難計画</h4>
                
                <p className="mb-1 text-xs ml-3">
                  シャッターが降りた後の避難経路として、シャッターの一部が開く「くぐり戸」付きのタイプがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  トレンド: くぐり戸は段差があり、パニック時に転倒して逃げ遅れるリスクがあるため、現在はくぐり戸を設けず、脇に別途<strong>「避難用扉（防火戸）」</strong>を設置する設計が推奨されている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">法定点検（定期報告制度）の対象</h4>
                
                <p className="mb-1 text-xs ml-3">
                  防火シャッターは、建築基準法により<strong>「定期報告制度」</strong>の対象となる特定建築設備。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  専門資格者による年1回の点検と、特定行政庁への報告が所有者に義務付けられている。維持管理コストとして必ず説明が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">意匠性と「パイプシャッター（グリルシャッター）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  鉄パイプで構成された、向こう側が透けて見えるシャッター。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  用途: 店舗のショーウィンドウや地下駐車場など、閉店後も商品の展示を見せたい場合や、換気（排ガス対策）・防犯（中の様子が見える）を両立したい場合に採用される。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {/* カード1：掲載募集カード */}
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" />
              </div>
            </div>

            {/* 通常企業（テキストリンク形式） */}
            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">重量シャッター</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三和シャッター工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sanwa-ss.co.jp/professional/products/?product[]=weight_shutter', '商品ページ')}｜
                {renderLink('https://dcs4.icata.net/iportal/CatalogSearch.do?method=catalogSearchByCategory&volumeID=SSY00001&categoryID=246650000&designID=SSYD001&searchObject=carrentCategory', 'カタログ')}｜
                {renderLink('https://www.sanwa-ss.co.jp/company/list/', '営業所')}｜
                {renderLink('https://www.sanwa-ss.co.jp/ask/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・文化シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://bunka-s-pro.jp/product_category/shutter/z-shutter/', '商品ページ')}｜
                {renderLink('https://bunka-s.actibookone.com/category/list?param=eyJjYXRlZ29yeV9udW0iOjQ5NDcwfQ==', 'カタログ')}｜
                {renderLink('https://www.bunka-s.co.jp/corporate/group/', '営業所')}｜
                {renderLink('https://faq-bunka-s.dga.jp/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東洋シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toyo-shutter.co.jp/product/cat-s/zyuuryou/', '商品ページ')}｜
                {renderLink('https://toyo-shutter-catalog.jp/library/public/book/list?search%5Bhigh_category%5D=2', 'カタログ')}｜
                {renderLink('https://www.toyo-shutter.co.jp/profile/office.html', '営業所')}｜
                {renderLink('https://www.toyo-shutter.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・小俣シャッター工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.omata-s.co.jp/products/#p2', '商品ページ')}｜
                {renderLink('https://www.omata-s.co.jp/documents/', 'カタログ')}｜
                {renderLink('https://www.omata-s.co.jp/company/', '営業所')}｜
                {renderLink('https://www.omata-s.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大和シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiwa-sh.co.jp/products/index/1', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.daiwa-sh.co.jp/company.html', '営業所')}｜
                {renderLink('https://www.daiwa-sh.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・鈴木シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://suzuki-sh.co.jp/shutter/jyuryo/#', '商品ページ')}｜
                {renderLink('https://suzuki-sh.co.jp/catalogue/', 'カタログ')}｜
                {renderLink('https://suzuki-sh.co.jp/corporate/base/', '営業所')}｜
                {renderLink('https://suzuki-sh.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・安中製作所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.annaka-ss.co.jp/noiless-shutter/heavy_weight/index.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.annaka-ss.co.jp/noiless-shutter/office/index.html', '営業所')}｜
                {renderLink('https://www.annaka-ss.co.jp/policy.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">その他シャッター</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・文化シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://bunka-s-pro.jp/product_category/shutter/', '商品ページ')}｜
                {renderLink('https://bunka-s.actibookone.com/category/list?param=eyJjYXRlZ29yeV9udW0iOjQ1NDMxfQ==', 'カタログ')}｜
                {renderLink('https://www.bunka-s.co.jp/network/hokkaido/', '営業所')}｜
                {renderLink('https://faq-bunka-s.dga.jp/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東洋シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toyo-shutter.co.jp/product/', '商品ページ')}｜
                {renderLink('https://toyo-shutter-catalog.jp/library/public/book/list?search%5Bhigh_category%5D=2', 'カタログ')}｜
                {renderLink('https://www.toyo-shutter.co.jp/profile/office.html', '営業所')}｜
                {renderLink('https://www.toyo-shutter.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・LIXIL</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lixil.co.jp/lineup/window/shutter/', '商品ページ')}｜
                {renderLink('https://ctlgsearch.lixil.co.jp/public/index.php?target=builder&category=CTGMC_4168793', 'カタログ')}｜
                {renderLink('https://www.lixil.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.lixil.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・横引シャッター</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.yokobiki.com/products', '商品ページ')}｜
                {renderLink('https://www.yokobiki.com/products', 'カタログ')}｜
                {renderLink('https://www.yokobiki.com/companyoutline', '営業所')}｜
                {renderLink('https://www.yokobiki.com/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・横引SR</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.yokobiki-sr.co.jp/product.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.yokobiki-sr.co.jp/company.html', '営業所')}｜
                {renderLink('https://www.yokobiki-sr.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・石黒製作所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.pla-part.com/service/%e3%83%97%e3%83%a9%e3%82%b7%e3%83%a3%e3%83%83%e3%82%bf%e3%83%bc%e3%81%a8%e3%81%af/', '商品ページ')}｜
                {renderLink('https://www.pla-part.com/%e3%82%ab%e3%82%bf%e3%83%ad%e3%82%b0', 'カタログ')}｜
                {renderLink('https://www.pla-part.com/company/%e4%bc%9a%e7%a4%be%e6%a6%82%e8%a6%81/', '営業所')}｜
                {renderLink('https://www.pla-part.com/%e3%81%8a%e5%95%8f%e3%81%84%e5%90%88%e3%82%8f%e3%81%9b/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本ドアコーポレーション</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nidoco.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.nidoco.co.jp/contact/contact/', 'カタログ')}｜
                {renderLink('https://www.nidoco.co.jp/outline/', '営業所')}｜
                {renderLink('https://www.nidoco.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ユニテック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://unitek.jp/product/shutter', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://unitek.jp/company/access', '営業所')}｜
                {renderLink('https://unitek.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アルラックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.alracs.co.jp/index.html', '商品ページ')}｜
                {renderLink('https://fc.canonet.ne.jp/www.alracs.co.jp/secure/info/', 'カタログ')}｜
                {renderLink('http://www.alracs.co.jp/company/index.html', '営業所')}｜
                {renderLink('https://fc.canonet.ne.jp/www.alracs.co.jp/secure/info/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本シャッター製作所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://nihon-shutter.co.jp/service/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://nihon-shutter.co.jp/company/', '営業所')}｜
                {renderLink('https://nihon-shutter.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="opening-content">
      {renderSubcategoryContent()}
    </div>
  );
};

export default OpeningContent; 