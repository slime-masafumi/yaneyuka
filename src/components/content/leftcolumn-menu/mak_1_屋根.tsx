'use client';

import React, { useState } from 'react';

interface RoofContentProps {
  subcategory: string;
}

const RoofContent: React.FC<RoofContentProps> = ({ subcategory }) => {
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

  // 画像フォールバック処理
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    // SVGプレースホルダーに置き換え（UTF-8を含むためbase64ではなくutf8エンコードを利用）
    const svg = `
      <svg width="120" height="80" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="40%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">掲載企業様</text>
        <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">募集中</text>
      </svg>`;
    target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const handleCommercialImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    // 商業用画像のSVGプレースホルダー（UTF-8対応）
    const svg = `
      <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">商品画像</text>
      </svg>`;
    target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const renderContent = () => {
    switch (subcategory) {
      case '折板':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">折板</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">大スパンへの対応力</h3>
                
                <p className="mb-1.5 text-xs ml-3">
                  金属板を台形波状に成形することで断面性能を高めた屋根材。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  軽量かつ高強度であり、梁間隔を大きく飛ばせるため、工場・倉庫・体育館などの大型建築物に最適。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">梁ピッチ（許容スパン）と製品選定</h4>
                
                <p className="mb-1 text-xs ml-3">
                  製品の「山高（やまだか）」と「板厚」により、対応可能な梁間隔（母屋ピッチ）が決まる。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>山高</strong>: 高いほど断面二次モーメントが大きく、長スパンに対応可能（例：H88、H150など）。</li>
                  <li><span className="mr-1">・</span><strong>板厚</strong>: 一般的に0.6mm～1.2mm。厚いほど強度が向上する。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">3つの固定工法と特徴</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ハゼ締めタイプ（ボルトレス）</strong>: タイトフレームに屋根材を固定し、ハゼ（継ぎ目）を電動工具で巻き締めする工法。ボルトが露出しないため防水性・防錆性が最も高い。現在の主流。</li>
                  <li><span className="mr-1">・</span><strong>重ねタイプ</strong>: 屋根材を重ね合わせ、ボルトで貫通固定する工法。安価で施工が容易だが、ボルト周りの漏水・錆リスクがある。小規模建物や改修向け。</li>
                  <li><span className="mr-1">・</span><strong>嵌合（かんごう）タイプ</strong>: キャップを嵌め込んで固定する工法。ハゼ締めが不要で施工が早く、強風にも強い。意匠性に優れる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">結露対策の重要性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  金属屋根は外気温の影響を受けやすく、冬季や梅雨時は裏面結露のリスクが高い。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ペフ（結露防止材）付き</strong>: 裏面にポリエチレンフォームを貼り付けた製品。簡易的な断熱・結露防止に有効。</li>
                  <li><span className="mr-1">・</span><strong>二重折板（ダブルパック）</strong>: 上下2枚の折板の間に断熱材（グラスウール等）を挟む工法。高い断熱性・遮音性を確保でき、空調効率を重視する施設に適する。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">素材による耐久性の違い</h4>
                
                <ul className="space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ガルバリウム鋼板</strong>: アルミニウム・亜鉛合金めっき。防食性に優れ、現在の標準仕様。</li>
                  <li><span className="mr-1">・</span><strong>エスジーエル（SGL）</strong>: ガルバリウムにマグネシウムを添加し、耐食性をさらに向上させた次世代鋼板。沿岸部でも採用が増加。</li>
                  <li><span className="mr-1">・</span><strong>ステンレス</strong>: 初期コストは高いが、最強の耐食性を誇る。重塩害地域やメンテナンス困難な場所で採用。</li>
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {/* カード1：掲載募集カード */}
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img 
                  src="/image/掲載募集中a.png" 
                  alt="掲載企業様募集中" 
                  className="w-30 mb-1 w-[clamp(300x,5vw,120px)]"
                  onError={handleImageError}
                />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img 
                  src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" 
                  alt="Manufacturer Commercial" 
                  className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
                  onError={handleCommercialImageError}
                />
              </div>
            </div>

            {/* 通常企業（テキストリンク形式） */}
            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三晃金属工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sankometal.co.jp/products/list/', '商品ページ')}｜
                {renderLink('https://www.sankometal.co.jp/webcatalog01/#target/page_no=1', 'カタログ')}｜
                {renderLink('https://www.sankometal.co.jp/corporate/list/', '営業所')}｜
                {renderLink('https://www.sankometal.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・元旦ビューティ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.gantan.co.jp/products/buildings/folded-plate-roof/', '商品ページ')}｜
                {renderLink('https://www.gantan.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.gantan.co.jp/company/organization.html', '営業所')}｜
                {renderLink('https://www.gantan.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日鉄鋼板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.niscs.nipponsteel.com/products/', '商品ページ')}｜
                {renderLink('https://www.niscs.nipponsteel.com/data/catalog.html', 'カタログ')}｜
                {renderLink('https://www.niscs.nipponsteel.com/company/access.html', '営業所')}｜
                {renderLink('https://www.niscs.nipponsteel.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ハイデッキ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.high-deck.co.jp/index.php?id=11', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('http://www.high-deck.co.jp/index.php?id=2', '営業所')}｜
                {renderLink('http://www.high-deck.co.jp/index.php?id=3', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・月星商事</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tsukiboshi-shoji.co.jp/building_material/roof/', '商品ページ')}｜
                {renderLink('https://www.tsukiboshi-shoji.co.jp/document/', 'カタログ')}｜
                {renderLink('https://www.tsukiboshi-shoji.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.tsukiboshi-shoji.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・協和</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kyowa-kb.co.jp/products/seppan/', '商品ページ')}｜
                {renderLink('https://www.kyowa-kb.co.jp/search/?query_word=&query_cat%5B%5D=seppan#search_result', 'カタログ')}｜
                {renderLink('https://www.kyowa-kb.co.jp/branch/', '営業所')}｜
                {renderLink('https://www.kyowa-kb.co.jp/form/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・淀川製鋼所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.yodoko.co.jp/product/ken/product.html', '商品ページ')}｜
                {renderLink('https://www.yodoko.co.jp/app/Catalog/builder/', 'カタログ')}｜
                {renderLink('https://www.yodoko.co.jp/company/branch/', '営業所')}｜
                {renderLink('https://www.yodoko.co.jp/app/Enquete/contacts/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・JFE日建板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.jfe-nikkenban.com/product/index.html', '商品ページ')}｜
                {renderLink('https://www.jfe-nikkenban.com/product/download.html', 'カタログ')}｜
                {renderLink('https://www.jfe-nikkenban.com/company/office-locations.html', '営業所')}｜
                {renderLink('#', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・稲垣商事</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.inagakishoji.jp/yane-hizyutaku', '商品ページ')}｜
                {renderLink('https://www.inagakishoji.jp/dw', 'カタログ')}｜
                {renderLink('https://www.inagakishoji.jp/jigyousyoitirann', '営業所')}｜
                {renderLink('https://web.gogo.jp/inagakishoji/form/otoiawase-mailform', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大島応用</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.oshima-ohyo.co.jp/products.html', '商品ページ')}｜
                {renderLink('http://www.oshima-ohyo.co.jp/catalog.html', 'カタログ')}｜
                {renderLink('http://www.oshima-ohyo.co.jp/access.html', '営業所')}｜
                {renderLink('http://www.oshima-ohyo.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・NST奥平</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.nsos.co.jp/info/#cad-haze', '商品ページ')}｜
                {renderLink('http://www.nsos.co.jp/catalogue/#cat-all', 'カタログ')}｜
                {renderLink('http://www.nsos.co.jp/about/', '営業所')}｜
                {renderLink('http://www.nsos.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ｵﾘｴﾝﾀﾙﾒﾀﾙ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.orimeta.co.jp/product.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('http://www.orimeta.co.jp/company.html', '営業所')}｜
                {renderLink('http://www.orimeta.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・サカタ製作所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sakata-s.co.jp/products/kenzai/', '商品ページ')}｜
                {renderLink('https://www.sakata-s.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.sakata-s.co.jp/campany/access/', '営業所')}｜
                {renderLink('https://www.sakata-s.co.jp/contact_menu/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・佐渡島</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://sadoshima.com/products/?e-filter-e0d4cad-products_cat=sadoshima-original', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://sadoshima.com/services/#seihin', '営業所')}｜
                {renderLink('https://sadoshima.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・銅市金属工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.douichi.co.jp/products/#anchor01', '商品ページ')}｜
                {renderLink('https://www.douichi.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.douichi.co.jp/company/overview/', '営業所')}｜
                {renderLink('https://www.douichi.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・住友ベークライト</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sumibe.co.jp/product/plate/polycarbonate/policanami-seppan/index.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.sumibe.co.jp/company/offices/', '営業所')}｜
                {renderLink('https://www.sumibe.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '金属屋根':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">金属屋根</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">長尺屋根における「熱伸縮」対策</h3>
                
                <p className="mb-1.5 text-xs ml-3">
                  金属は温度変化による伸縮が激しい（例：鉄は10mで約10mm程度の伸縮差が生じる）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  桁行（屋根の長さ）が長い場合、固定箇所を一点にし、他は<strong>「スライド吊子（つりこ）」</strong>を使用して屋根材の伸縮を逃がす必要がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策を怠ると、ボルトの破断や屋根材の座屈、異音（ボコンという音）の原因となる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「電食（でんしょく）」リスクの回避</h4>
                
                <p className="mb-1 text-xs ml-3">
                  異種金属が接触し、水分が介在すると腐食が加速する現象（ガルバニック腐食）。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span>組み合わせNG例: ガルバリウム鋼板 × 銅、ガルバリウム鋼板 × ステンレス（条件による）。</li>
                  <li><span className="mr-1">・</span>銅製の避雷針や雨樋からの雨水がガルバリウム屋根に流れるだけでも穴が開くため、流路の絶縁処理が必須。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">緩勾配における「毛細管現象」対策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  縦ハゼの嵌合部や重なり部分は、勾配が緩いと毛細管現象で雨水を吸い上げるリスクがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  止水材: 嵌合部（キャップやハゼの中）に工場でブチルゴム等のシーリング材が注入されている製品を選定することが、漏水事故防止の鍵。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「あおり止め」と耐風圧性能</h4>
                
                <p className="mb-1 text-xs ml-3">
                  近年の台風巨大化に伴い、軒先やケラバ部分の耐風性能が重要視されている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  軒先部分は風の巻き上げ力が最も強いため、通常の固定に加えて<strong>「あおり止めタイトフレーム」</strong>や補強ビスの使用が推奨されるケースが増えている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">意匠性と「ベコ付き（オイルキャニング）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  平滑な金属板は、施工時の歪みや熱膨張により表面が波打つ「ベコ付き」が発生しやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 板厚を上げる（0.4mm以上）、または<strong>「さざなみ加工」「リブ加工」</strong>が入った製品を選ぶことで、波打ちを目立たなくし、剛性も高めることができる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">太陽光パネル設置の優位性（立平葺き）</h4>
                
                <p className="mb-1 text-xs ml-3">
                  キャッチ工法: 立平葺き（縦ハゼ）は、ハゼ部分を金具で掴んでパネルを固定できる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  屋根に穴を開けずに設置できるため、漏水リスクがなく、将来のパネル撤去時も屋根へのダメージがない。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">裏面断熱材の種類の違い</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ポリエチレンフォーム（ペフ）</strong>: 一般的だが、経年劣化で縮んだり剥がれたりする場合がある。また、防火地域では使用制限がある場合も。</li>
                  <li><span className="mr-1">・</span><strong>ガラス繊維シート（不燃）</strong>: 防火認定を取得するために使用される裏打ち材。断熱性はペフに劣るため、別途下地断熱が必要なケースが多い。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">ステンレス鋼板の種類（SUS304 vs SUS430）</h4>
                
                <ul className="space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>SUS304（オーステナイト系）</strong>: 耐食性が非常に高く、磁石につかない。沿岸部に最適。</li>
                  <li><span className="mr-1">・</span><strong>SUS430（フェライト系）</strong>: 304より安価だが耐食性は劣る。磁石につく。塗装ステンレスとして使われることが多い。</li>
                  <li><span className="mr-1">・</span>「ステンレス屋根」と指定するだけでなく、鋼種（304か445/430か）まで確認が必要。</li>
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {/* カード1：掲載募集カード */}
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img 
                  src="/image/掲載募集中a.png" 
                  alt="掲載企業様募集中" 
                  className="w-30 mb-1 w-[clamp(300x,5vw,120px)]"
                  onError={handleImageError}
                />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img 
                  src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" 
                  alt="Manufacturer Commercial" 
                  className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
                  onError={handleCommercialImageError}
                />
              </div>
            </div>

            {/* 通常企業（テキストリンク形式） */}
            <div className="flex items-center mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">立平葺</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・元旦ビューティ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.gantan.co.jp/products/buildings/pitched-roof/', '商品ページ')}｜
                {renderLink('https://www.gantan.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.gantan.co.jp/company/organization.html', '営業所')}｜
                {renderLink('https://www.gantan.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三晃金属工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sankometal.co.jp/products/list/', '商品ページ')}｜
                {renderLink('https://www.sankometal.co.jp/webcatalog01/#target/page_no=1', 'カタログ')}｜
                {renderLink('https://www.sankometal.co.jp/corporate/list/', '営業所')}｜
                {renderLink('https://www.sankometal.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">横葺</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・元旦ビューティ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.gantan.co.jp/products/buildings/shingled-roof/', '商品ページ')}｜
                {renderLink('https://www.gantan.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.gantan.co.jp/company/organization.html', '営業所')}｜
                {renderLink('https://www.gantan.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三晃金属工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sankometal.co.jp/products/list/', '商品ページ')}｜
                {renderLink('https://www.sankometal.co.jp/webcatalog01/#target/page_no=1', 'カタログ')}｜
                {renderLink('https://www.sankometal.co.jp/corporate/list/', '営業所')}｜
                {renderLink('https://www.sankometal.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アイジー工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.igkogyo.co.jp/syohin/roof/lineup/', '商品ページ')}｜
                {renderLink('https://www.igkogyo.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.igkogyo.co.jp/company/kyoten.html', '営業所')}｜
                {renderLink('https://www.igkogyo.co.jp/igkogyo-cgi/form/CI01', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セキノ興産</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sekino.co.jp/product/', '商品ページ')}｜
                {renderLink('https://www.sekino.co.jp/support/inquiry-catalog/', 'カタログ')}｜
                {renderLink('https://www.sekino.co.jp/company/network/', '営業所')}｜
                {renderLink('https://www.sekino.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・JFE日建板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.jfe-nikkenban.com/product/index.html', '商品ページ')}｜
                {renderLink('https://www.jfe-nikkenban.com/product/download.html', 'カタログ')}｜
                {renderLink('https://www.jfe-nikkenban.com/company/office-locations.html', '営業所')}｜
                {renderLink('#', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・月星商事</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tsukiboshi-shoji.co.jp/building_material/roof/', '商品ページ')}｜
                {renderLink('https://www.tsukiboshi-shoji.co.jp/document/', 'カタログ')}｜
                {renderLink('https://www.tsukiboshi-shoji.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.tsukiboshi-shoji.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ケイミュー</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kmew.co.jp/shouhin/roof/colorbest/', '商品ページ')}｜
                {renderLink('https://www.kmew.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.kmew.co.jp/company/location.html', '営業所')}｜
                {renderLink('https://www.kmew.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・NST奥平</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.nsos.co.jp/info/#cad-yoko', '商品ページ')}｜
                {renderLink('http://www.nsos.co.jp/catalogue/#cat-all', 'カタログ')}｜
                {renderLink('http://www.nsos.co.jp/about/', '営業所')}｜
                {renderLink('http://www.nsos.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・カナメ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.caname-roof.jp/products/', '商品ページ')}｜
                {renderLink('https://www.caname-roof.jp/contact/pdf/pmf_products.pdf?v=4162eb7c1b8414cc1afd3dffeb742441', 'カタログ')}｜
                {renderLink('https://www.caname.net/company/outline.html', '営業所')}｜
                {renderLink('https://www.caname.net/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・オリエンタルメタル</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.orimeta.co.jp/product.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('http://www.orimeta.co.jp/company.html', '営業所')}｜
                {renderLink('http://www.orimeta.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・サカタ製作所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sakata-s.co.jp/products/kenzai/', '商品ページ')}｜
                {renderLink('https://www.sakata-s.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.sakata-s.co.jp/campany/access/', '営業所')}｜
                {renderLink('https://www.sakata-s.co.jp/contact_menu/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・佐渡島</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://sadoshima.com/products/?e-filter-e0d4cad-products_cat=sadoshima-original', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://sadoshima.com/services/#seihin', '営業所')}｜
                {renderLink('https://sadoshima.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・銅市金属工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.douichi.co.jp/products/#anchor01', '商品ページ')}｜
                {renderLink('https://www.douichi.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.douichi.co.jp/company/overview/', '営業所')}｜
                {renderLink('https://www.douichi.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・住友ベークライト</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sumibe.co.jp/product/plate/polycarbonate/policanami-seppan/index.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.sumibe.co.jp/company/offices/', '営業所')}｜
                {renderLink('https://www.sumibe.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'スレート':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">スレート</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【化粧スレート（住宅用平板スレート）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「縁切り（えんきり）」とタスペーサーの必須性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塗装メンテナンス時、屋根材同士の重なり目が塗料で塞がると、毛細管現象で雨水を吸い上げ、雨漏りの原因になる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 塗装後にカッターで塗膜を切る「縁切り」作業、または隙間を確保する部材<strong>「タスペーサー」</strong>の挿入が必須。これを行わない業者は避けるべき。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ノンアスベスト移行期の「割れ・剥離」問題</h4>
                
                <p className="mb-1 text-xs ml-3">
                  2000年前後〜2008年頃に製造された初期のノンアスベスト製品は、経年劣化で層間剥離やひび割れが起きやすいものがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: これらの製品は<strong>「塗装しても基材自体が崩れるため意味がない」</strong>ケースが多い。塗装ではなく、カバー工法か葺き替えを提案する必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">対応勾配と防水の仕組み</h4>
                
                <p className="mb-1 text-xs ml-3">
                  スレート自体には完全な防水性はなく、一次防水（スレート）で雨を受け流し、侵入した水を二次防水（ルーフィング／防水シート）で防ぐ構造。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必要勾配: 一般的に3寸（30/100）以上。これより緩い勾配だと雨水が逆流しやすくなるため、対応製品か、下地防水の強化が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">カバー工法（重ね葺き）の適性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  スレートは平滑であるため、既存屋根を撤去せずに新しい屋根材（主に金属屋根やアスファルトシングル）を被せる「カバー工法」に最も適している。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>メリット</strong>: アスベスト含有屋根材の処分費をカットでき、断熱性・遮音性も向上する。</li>
                  <li><span className="mr-1">・</span><strong>デメリット</strong>: 屋根重量が増すため、耐震性への影響を考慮する必要がある（金属屋根なら軽量なので影響は少ない）。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【波形スレート（工場・倉庫用）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">大波（おおなみ）と小波（こなみ）の用途違い</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>大波スレート</strong>: 主に工場・倉庫の「屋根」に使用される。強度が強く、踏み抜き防止の補強が入っているものもある。</li>
                  <li><span className="mr-1">・</span><strong>小波スレート</strong>: 主に「外壁」に使用される。屋根に使うと強度が不足する場合があるため注意が必要。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">フックボルトのメンテナンス</h4>
                
                <p className="mb-1 text-xs ml-3">
                  スレート本体よりも先に、固定している「フックボルト」が錆びて劣化する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ボルト穴からの漏水や、強風時の屋根材飛散の原因となるため、定期的なボルト交換やキャップの取り付け（サビヤーズ等）が重要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">アスベスト含有の有無と処理</h4>
                
                <p className="mb-1 text-xs ml-3">
                  2004年以前の波形スレートはアスベストを含んでいる可能性が高い。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>改修</strong>: 撤去・処分費が高額になるため、既存スレートの上に金属屋根を被せる「カバールーフ工法」が一般的。</li>
                  <li><span className="mr-1">・</span><strong>解体</strong>: 解体時は法律に基づいた厳格な飛散防止措置が必要となる。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【共通・その他】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">天然スレート（玄昌石など）との違い</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ヨーロッパの城郭や日本の洋館で見られる天然石の屋根材。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 塗装不要で数百年持つ耐久性があるが、非常に高価で重量があり、施工できる職人も限られる。一般的な「スレート（コロニアル）」とは別物として区別が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ルーフィング（下葺き材）の寿命が屋根の寿命</h4>
                
                <p className="mb-1 text-xs ml-3">
                  スレート屋根の防水性能の要は、下にある防水シート（ルーフィング）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  スレートが割れていなくても、ルーフィングの寿命（約20年前後）が来ると雨漏りする。屋根材のグレードだけでなく、ルーフィングのグレード（改質アスファルトルーフィング等）にも注目すべき。
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
              <span className="w-[180px]">・富士スレート</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fujislate.com/airroof/', '商品ページ')}｜
                {renderLink('https://www.fujislate.com/download/', 'カタログ')}｜
                {renderLink('https://www.fujislate.com/company/', '営業所')}｜
                {renderLink('https://www.fujislate.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大和スレート</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.yamatoslate.co.jp/products/p_namiita/', '商品ページ')}｜
                {renderLink('https://www.yamatoslate.co.jp/book/namigataslate/', 'カタログ')}｜
                {renderLink('https://www.yamatoslate.co.jp/service-support/', '営業所')}｜
                {renderLink('https://www.yamatoslate.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東京スレート</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.mtk.co.jp/kikaku/namiita.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('http://www.mtk.co.jp/company/aisatsu.html', '営業所')}｜
                {renderLink('https://mtk-co-jp.secure-web.jp/other/toiawase.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸鹿セラミックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.marushika.com/material/detail.html?item_rno=65&main_no=1&sub_no=8&list2=1&list1=1', '商品ページ')}｜
                {renderLink('http://www.marushika.com/digitalcatalog/?pNo=1', 'カタログ')}｜
                {renderLink('http://www.marushika.com/about/index.html#branch', '営業所')}｜
                {renderLink('http://www.marushika.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本セラミックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://japacera.com/pages/64?detail=1&b_id=310&r_id=28#block310-28', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://japacera.com/pages/2/', '営業所')}｜
                {renderLink('https://japacera.com/pages/4/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・井桁スレート</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.igetaslate.com/', '商品ページ')}｜
                {renderLink('https://www.igetaslate.com/download.htm', 'カタログ')}｜
                {renderLink('https://www.igetaslate.com/m_04_gaiyou/m_04_gaiyou.htm', '営業所')}｜
                {renderLink('https://www.igetaslate.com/toiawase.htm', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '瓦':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">瓦</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【粘土瓦（陶器瓦・いぶし瓦）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「防災瓦（ぼうさいがわら）」の標準化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔の瓦屋根は地震や台風でズレたり落下したりしやすかったが、近年の製品は瓦同士をツメで噛み合わせ、全て釘で固定する<strong>「防災瓦（ロック構造）」</strong>が標準。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  耐震・耐風性: 従来の瓦屋根とは比較にならないほど向上している。震度7クラスの実験でも落下しない製品が多い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「塗装不要」という最大のメリット</h4>
                
                <p className="mb-1 text-xs ml-3">
                  粘土瓦（特に釉薬瓦／陶器瓦）は、茶碗と同じで色褪せせず、塗装メンテナンスが永久に不要。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ※漆喰（しっくい）などの副資材のメンテナンスは必要だが、ランニングコストは全屋根材の中で最も安い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">漆喰（しっくい）の代わりに「南蛮（なんばん）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  棟（屋根の頂上）の土台や隙間埋めに使われる漆喰は、10〜15年で崩れる弱点があった。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現在は、シリコンや防水材を配合して強度・防水性を高めた<strong>「南蛮漆喰（シルガード等）」</strong>を使用するのが主流。従来の白漆喰の上塗りメンテナンスよりも長持ちする。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【セメント瓦・モニエル瓦】の注意点</h3>
                
                <h4 className="font-bold text-[12px] mb-1">粘土瓦との決定的な違いは「塗装が必要」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  見た目は粘土瓦に似ているが、セメントが主成分のため防水性がなく、塗装が切れると水を吸って割れる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  見分け方: 小口（断面）が凸凹していて、表面がザラついている場合はモニエル瓦（乾式コンクリート瓦）の可能性が高い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">モニエル瓦の「スラリー層」問題</h4>
                
                <p className="mb-1 text-xs ml-3">
                  モニエル瓦の表面には着色スラリー層（脆い層）があり、知らずに普通の塗料を塗ると、早期に塗膜がペロリと剥がれる事故が多発する。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  徹底的な高圧洗浄でスラリー層を除去するか、専用の下塗り材を使用する知識が必要。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ※既に多くのメーカーが撤退しているため、割れた際の交換用瓦が入手困難。葺き替え推奨のケースが多い。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【金属瓦（金属成型瓦）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「金属瓦」とは何か</h4>
                
                <p className="mb-1 text-xs ml-3">
                  素材は「ガルバリウム鋼板」や「エスジーエル鋼板」だが、プレス加工で日本瓦や洋瓦の形状に成型したもの。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  最大のメリット: 粘土瓦の約1/10の軽さ。見た目は重厚感があるが、建物への負担は最小限で耐震リフォームに最適。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「石粒付き金属屋根（ストーンチップ）」の優位性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ガルバリウム鋼板の表面に天然石の粒をコーティングしたタイプ（ディプロマット、デクラ等）。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>塗装不要</strong>: 天然石の色なので塗り替えが不要（30年以上の耐久実績あり）。</li>
                  <li><span className="mr-1">・</span><strong>遮音・断熱</strong>: 石粒が雨音を拡散・吸収するため、平滑な金属屋根より静かで、断熱性も高い。</li>
                  <li><span className="mr-1">・</span><strong>雪止め効果</strong>: 表面がザラザラしているため、雪が滑り落ちにくく、雪止め金具を省略できる場合がある（地域による）。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「カバー工法」における金属瓦の役割</h4>
                
                <p className="mb-1 text-xs ml-3">
                  スレート屋根やアスファルトシングル屋根の上から被せるカバー工法において、意匠性（高級感）を出したい場合に採用される。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  純和風の家で瓦から葺き替える際、普通の板金屋根（立平葺き等）にすると「安っぽく見える」のを防ぐために選ばれることが多い。
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
            <div className="flex items-center mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">瓦</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ケイミュー</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kmew.co.jp/biz/shouhin/roof/', '商品ページ')}｜
                {renderLink('https://www.kmew.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.kmew.co.jp/company/location.html', '営業所')}｜
                {renderLink('https://www.kmew.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・鶴弥</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.try110.com/product/', '商品ページ')}｜
                {renderLink('https://www.try110.com/technical/catalog/', 'カタログ')}｜
                {renderLink('https://www.try110.com/company/', '営業所')}｜
                {renderLink('https://www.try110.com/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・マルスギ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.marusugi.co.jp/index.html', '商品ページ')}｜
                {renderLink('https://www.marusugi.co.jp/info/cata.shtml', 'カタログ')}｜
                {renderLink('https://www.marusugi.co.jp/info/info.shtml', '営業所')}｜
                {renderLink('https://www.marusugi.co.jp/info/toiawase.shtml', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・岩福セラミックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.iwafuku.co.jp/crestuu40.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.iwafuku.co.jp/company-profile.html', '営業所')}｜
                {renderLink('#', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸鹿セラミックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.marushika.com/material/roof.html', '商品ページ')}｜
                {renderLink('http://www.marushika.com/digitalcatalog/?pNo=1', 'カタログ')}｜
                {renderLink('http://www.marushika.com/about/index.html#branch', '営業所')}｜
                {renderLink('http://www.marushika.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・野安</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.noyasu.co.jp/', '商品ページ')}｜
                {renderLink('https://www.noyasu.co.jp/catalog.html', 'カタログ')}｜
                {renderLink('https://www.noyasu.co.jp/aboutus.html#access-title', '営業所')}｜
                {renderLink('https://www.noyasu.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・木村窯業所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://kimura-kawara.co.jp/products', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('http://kimura-kawara.co.jp/about', '営業所')}｜
                {renderLink('http://kimura-kawara.co.jp/inquiry', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">金属瓦</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セキノ興産</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sekino.co.jp/product/', '商品ページ')}｜
                {renderLink('https://www.sekino.co.jp/support/inquiry-catalog/', 'カタログ')}｜
                {renderLink('https://www.sekino.co.jp/company/network/', '営業所')}｜
                {renderLink('https://www.sekino.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・カナメ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.caname-roof.jp/products/', '商品ページ')}｜
                {renderLink('https://www.caname-roof.jp/contact/pdf/pmf_products.pdf?v=4162eb7c1b8414cc1afd3dffeb742441', 'カタログ')}｜
                {renderLink('https://www.caname.net/company/outline.html', '営業所')}｜
                {renderLink('https://www.caname.net/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸鹿セラミックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.marushika.com/material/roof.html?sub_no=34&list2=0&list1=1', '商品ページ')}｜
                {renderLink('http://www.marushika.com/digitalcatalog/?pNo=1', 'カタログ')}｜
                {renderLink('http://www.marushika.com/about/index.html#branch', '営業所')}｜
                {renderLink('http://www.marushika.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・JFE鋼板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.jfe-kouhan.co.jp/products/metal_roof/pregel.html', '商品ページ')}｜
                {renderLink('https://www.jfe-kouhan.co.jp/products/catalog/', 'カタログ')}｜
                {renderLink('https://www.jfe-kouhan.co.jp/company/base.html', '営業所')}｜
                {renderLink('https://cpjb.f.msgs.jp/webapp/form/24052_cpjb_1/index.do', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三ツ星貿易</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://superroof.jp/', '商品ページ')}｜
                {renderLink('https://superroof.jp/wp-content/uploads/2021/09/roofcatalog9.3.pdf', 'カタログ')}｜
                {renderLink('https://superroof.jp/company/', '営業所')}｜
                {renderLink('https://superroof.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・メタル建材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.metalkenzai.co.jp/index.html', '商品ページ')}｜
                {renderLink('https://www.metalkenzai.co.jp/catalog/index.html', 'カタログ')}｜
                {renderLink('https://www.metalkenzai.co.jp/k_gaiyo/index.html#office', '営業所')}｜
                {renderLink('https://www.metalkenzai.co.jp/request/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・千代田鋼鉄工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.chiyoda-steel.co.jp/product/#molded-article', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.chiyoda-steel.co.jp/company/access.php', '営業所')}｜
                {renderLink('https://www.chiyoda-steel.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日鉄鋼板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.niscs.nipponsteel.com/products/yane/kinzokugawara/', '商品ページ')}｜
                {renderLink('https://www.niscs.nipponsteel.com/data/catalog.html', 'カタログ')}｜
                {renderLink('https://www.niscs.nipponsteel.com/company/access.html', '営業所')}｜
                {renderLink('https://www.niscs.nipponsteel.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・中山化成</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.nakayama-kasei.co.jp/p_roof.htm', '商品ページ')}｜
                {renderLink('http://www.nakayama-kasei.co.jp/pdf/newroofix.pdf', 'カタログ')}｜
                {renderLink('http://www.nakayama-kasei.co.jp/kaisya.htm', '営業所')}｜
                {renderLink('http://www.nakayama-kasei.co.jp/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・川上板金工業所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kawakamibankin.co.jp/lineup/lineup.html', '商品ページ')}｜
                {renderLink('https://www.kawakamibankin.co.jp/catarog_select/catalog_03/catalog03.html', 'カタログ')}｜
                {renderLink('https://www.kawakamibankin.co.jp/infomation/company.html', '営業所')}｜
                {renderLink('https://www.kawakamibankin.co.jp/contact/mail.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・住友ベークライト</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sumibe.co.jp/product/plate/polycarbonate/policanami-seppan/index.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.sumibe.co.jp/company/offices/', '営業所')}｜
                {renderLink('https://www.sumibe.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '屋根その他':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">屋根その他</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【アスファルトシングル】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「曲面・ドーム」への追従性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  柔らかいシート状のため、ドーム型や複雑なＲ形状の屋根に施工できる数少ない屋根材。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  意匠性が高く、輸入住宅や洋風建築での採用が多いが、施工できる職人が瓦や板金に比べて少ないため、業者の施工実績確認が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「石粒（グラニュール）」の脱落と雨樋詰まり</h4>
                
                <p className="mb-1 text-xs ml-3">
                  表面の石粒が経年でポロポロと落ちる特性がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 落ちた石粒が雨樋の底に堆積して詰まりの原因になることが多い。定期的な雨樋清掃の必要性を施主に伝える必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">強風地域の「セメント（接着剤）」施工</h4>
                
                <p className="mb-1 text-xs ml-3">
                  軽量でめくれやすいため、強風地域や軒先部分では、釘打ちだけでなく専用のシングルセメントによる圧着が施工品質を左右する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  接着が不十分だと、台風時に広範囲で剥がれ飛ぶリスクがある。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ポリカーボネート・波板（カーポート・テラス）】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">アクリルとポリカの「強度」の違い</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ひと昔前のアクリル板は劣化して割れやすかったが、現在のポリカーボネートはガラスの約200倍の強度があり、ハンマーでも割れない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  交換提案: 古いカーポートがバリバリに割れている場合はアクリルの可能性が高く、ポリカへの張り替えを推奨する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「熱線遮断（ねっせんしゃだん）」仕様の選定</h4>
                
                <p className="mb-1 text-xs ml-3">
                  通常のポリカは紫外線（UV）はカットするが、熱（赤外線）を通すため夏場は暑い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  推奨: 車内温度抑制や室内の冷房効率アップのため、青みがかかった<strong>「熱線吸収（遮断）ポリカ」</strong>を選ぶのが基本。価格差は小さいが効果は大きい。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">施工時の「あそび（クリアランス）」</h4>
                
                <p className="mb-2 text-xs ml-3">
                  ポリカは熱による伸縮が大きいため、ビス穴を少し大きめに開けて<strong>「あそび」</strong>を持たせないと、膨張時にパキパキと音が鳴ったり、変形したりする。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【膜屋根（テント倉庫・ドーム）】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「不燃（ふねん）」と「防炎（ぼうえん）」の法的制限</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>不燃膜（F種）</strong>: ガラス繊維ベース。燃えないため、防火地域や大規模建築で使用可能。</li>
                  <li><span className="mr-1">・</span><strong>防炎膜</strong>: 燃え広がらない加工をしたもの。安価だが、延焼のおそれがあるため建設地や規模に厳しい制限がある。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  計画地の法規制（防火地域・準防火地域）によって、使える膜材（メーカー）が自動的に決まることが多い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">照明コストを下げる「透光性（とうこうせい）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  膜屋根は光を通すため、昼間は照明なしでも作業できる明るさを確保できる（省エネ効果）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ただし、遮熱性能が低い製品だと夏場は温室のように暑くなるため、<strong>「酸化チタン光触媒」</strong>などの遮熱コーティング付き製品が推奨される。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【トップライト（天窓）】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「網入りガラス」の熱割れリスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  防火地域・準防火地域では、法的に<strong>「網入りガラス」</strong>の使用が義務付けられるケースが多い。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  リスク: 網入りガラスは、内部のワイヤーが熱で膨張してガラスを割る「熱割れ」が起きやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策として、強化ガラスと網入りガラスのペアガラスや、熱割れしにくい耐熱強化ガラスを採用する等の検討が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">固定式（フィックス）と可動式の選択</h4>
                
                <p className="mb-1 text-xs ml-3">
                  可動式: 通風・排熱効果が高いが、可動部（パッキンやギア）の劣化により、将来的な雨漏りリスクが固定式より高い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メンテナンスが困難な高所の場合は、リスクの低い固定式を選ぶのが無難。
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
            <div className="flex items-center mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">アスファルトシングル</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・田島ルーフィング</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://tajima.jp/koubai_yane/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://tajima.jp/corporate/about/office/', '営業所')}｜
                {renderLink('https://find.tajima.jp/inquiry/company/contactus/?_gl=1*tpwa7t*_gcl_au*MTI2MzcyMTM3OC4xNzQyOTc2NzU5', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ニチハ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nichiha.co.jp/products/loof/armor/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.nichiha.co.jp/company/network_2/', '営業所')}｜
                {renderLink('https://www.nichiha.co.jp/about/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ｵｰｳｪﾝｽｺｰﾆﾝｸﾞｼﾞｬﾊﾟﾝ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.owenscorning.jp/product/roofing/index.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.owenscorning.jp/company/profile.html', '営業所')}｜
                {renderLink('https://www.owenscorning.jp/contact/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ガルバリウム鋼板</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ﾀﾆﾀﾊｳｼﾞﾝｸﾞｳｪｱ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tanita-hw.co.jp/productcategory/pc03_01/', '商品ページ')}｜
                {renderLink('https://www.tanita-hw.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.tanita-hw.co.jp/access', '営業所')}｜
                {renderLink('https://www.tanita-hw.co.jp/q-a', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・LIXIL</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lixil.co.jp/lineup/solar_roof_outerwall/t-roof/', '商品ページ')}｜
                {renderLink('https://webcatalog.lixil.co.jp/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=LXL13001&catalogId=16091660000&pageGroupId=1&designID=newinter&catalogCategoryId=&designConfirmFlg=&pagePosition=R', 'カタログ')}｜
                {renderLink('https://www.lixil.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.lixil.co.jp/support/?_gl=1*vbpak9*_gcl_au*NjI4NTkzNjY2LjE3NDMzOTY5MzI.*_ga*MTYwNjUxMDY5NC4xNzQzMzk2OTMx*_ga_L1RLBQ788C*MTc0MzM5NjkzMS4xLjEuMTc0MzM5NzA5OC40My4wLjA.*_ga_81CGHJ6TE8*MTc0MzM5Njg5My4zLjEuMTc0MzM5NzA5OC4yLjAuMA..', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・JFE鋼板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.jfe-kouhan.co.jp/products/option.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.jfe-kouhan.co.jp/company/base.html', '営業所')}｜
                {renderLink('https://cpjb.f.msgs.jp/webapp/form/24052_cpjb_1/index.do', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ナガイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagai.co.jp/main/product/woodpiece/', '商品ページ')}｜
                {renderLink('https://www.nagai.co.jp/support/catalog.html', 'カタログ')}｜
                {renderLink('https://www.nagai.co.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.nagai.co.jp/first/formail/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・メタル建材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.metalkenzai.co.jp/index.html', '商品ページ')}｜
                {renderLink('https://www.metalkenzai.co.jp/catalog/index.html', 'カタログ')}｜
                {renderLink('https://www.metalkenzai.co.jp/k_gaiyo/index.html#office', '営業所')}｜
                {renderLink('https://www.metalkenzai.co.jp/request/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・太平産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.taiheisangyo.jp/caresse/', '商品ページ')}｜
                {renderLink('https://www.taiheisangyo.jp/download/', 'カタログ')}｜
                {renderLink('https://www.taiheisangyo.jp/company/', '営業所')}｜
                {renderLink('https://www.taiheisangyo.jp/contact/', 'お問い合わせ')}｜
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
    <div>
      {renderContent()}
    </div>
  );
};

export default RoofContent; 