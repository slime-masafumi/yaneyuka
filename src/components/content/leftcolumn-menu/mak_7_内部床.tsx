'use client';

import React, { useState } from 'react';

interface InternalFloorContentProps {
  subcategory: string;
}

const InternalFloorContent: React.FC<InternalFloorContentProps> = ({ subcategory }) => {
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

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    if (img.src.includes('掲載募集中.png')) {
      return;
    }
    img.src = '/image/掲載募集中a.png';
    img.alt = '掲載企業様募集中';
    
    const cardDiv = img.closest('.card');
    if (cardDiv) {
      const titleDiv = cardDiv.querySelector('.font-bold');
      if (titleDiv) {
        titleDiv.textContent = '□□□';
      }
    }
  };

  const handleCommercialImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
  };

  const renderContent = () => {
    switch (subcategory) {
      case 'フローリング':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">フローリング</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【無垢（むく）と複合（ふくごう）の決定的な差】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「調湿（ちょうしつ）」と「隙間」のトレードオフ</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>無垢フローリング</strong>: 100%天然木。調湿作用があり、足触りが温かい。</li>
                  <li><span className="mr-1">・</span><strong>リスク</strong>: 季節によって木が伸縮するため、冬場は目地に<strong>「隙間」が空き、梅雨時は膨張して「突き上げ」</strong>が起きる可能性がある。これを「木の呼吸」として許容できる施主でないとクレームになる。</li>
                  <li><span className="mr-1">・</span><strong>複合フローリング</strong>: 合板の基材に化粧材を貼ったもの。寸法安定性が高く、隙間や反りがほとんど出ない。現在の主流。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【複合フローリングの「表面材」グレード】</h3>
                
                <p className="mb-1 text-xs ml-3">
                  複合フローリングは、表面に貼っている素材の厚みと種類で、見た目の質感と価格が劇的に変わります。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>挽き板（ひきいた）</strong>: 2mm〜3mm厚の天然木を貼ったもの。見た目は無垢と変わらない高級感があるが、価格も高い。</li>
                  <li><span className="mr-1">・</span><strong>突き板（つきいた）</strong>: 0.3mm程度の薄い天然木を貼ったもの。木の風合いはあるが、傷がつくと下の合板が見えてしまうリスクがある。標準グレード。</li>
                  <li><span className="mr-1">・</span><strong>シート（オレフィン）</strong>: 木目を印刷した樹脂シートを貼ったもの。品質が均一で、変色や傷に強く、ワックス不要。近年のプリント技術向上により、プロでも本物と見間違えるレベルに進化しており、採用率が急増している。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【マンション用「遮音（しゃおん）フローリング」】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「フワフワする」のは仕様</h4>
                
                <p className="mb-1 text-xs ml-3">
                  マンションでは、階下への足音（軽量床衝撃音）を防ぐため、管理規約で<strong>「遮音等級（LL-45等）」</strong>が定められていることが多い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 遮音性能を出すために、裏側に<strong>「クッション材（不織布やゴム）」が貼られている。そのため、歩くと「フワフワ沈み込む感触」</strong>がある。これを「施工不良」と勘違いされることが多いため、事前の説明が必須。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">リノベーション時の「二重床（にじゅうゆか）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  直貼り（コンクリートに直接貼る）ではなく、支持脚を立てて床を上げる「二重床工法」にする場合は、フローリング自体に遮音性能は不要（下地で遮音するため）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  無垢材を使いたい場合は、この二重床工法にする必要がある（直貼り用無垢材は種類が極めて少ない）。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【床暖房対応の必須性】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「熱によるひび割れ」リスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  床暖房の上に通常のフローリングを貼ると、熱で乾燥して過収縮を起こし、表面がバリバリに割れたり隙間が空いたりする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必ず<strong>「床暖房対応品」</strong>を選ばなければならない。特に無垢材で床暖房対応品は、特殊な熱処理や乾燥処理がされているため高価になる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【メンテナンス（ワックス・塗装）】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ワックスフリー」への移行</h4>
                
                <p className="mb-1 text-xs ml-3">
                  現在のシートフローリングや高機能塗装の突き板フローリングは、<strong>「ワックスがけ不要（ワックスフリー）」</strong>が標準。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 逆にワックスを塗ると、密着せずに白く剥がれたり、汚れを巻き込んで黒ずんだりする原因になる。「昔ながらのワックスがけ」は現代の建材ではNG行為となる場合が多い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">無垢材の「オイル」と「ウレタン」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>オイル仕上げ</strong>: 木に染み込ませる。質感は最高だが、水ジミができやすく、定期的なオイルの塗り直しが必要。</li>
                  <li><span className="mr-1">・</span><strong>ウレタン塗装</strong>: 表面を樹脂でコーティングする。水に強くメンテナンスが楽だが、テカテカして木の質感が損なわれる。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  生活スタイル（マメに手入れできるか、子供が水をこぼすか）に合わせて選択する必要がある。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大建工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiken.jp/buildingmaterials/public/flooring/', '商品ページ')}｜
                {renderLink('https://www.daiken.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.daiken.jp/showroom/', '営業所')}｜
                {renderLink('https://faq.daiken.jp/faq/show/948?site_domain=user', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・永大産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.eidai.com/product/flooring/', '商品ページ')}｜
                {renderLink('https://prosite.eidai-sangyo.co.jp/iportal/CatalogSearch.do?method=catalogSearchByCategory&volumeID=GAZOU&categoryID=64200000&sortKey=CatalogMain270000&sortOrder=ASC', 'カタログ')}｜
                {renderLink('https://www.eidai.com/showroom/', '営業所')}｜
                {renderLink('https://www.eidai.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・朝日ウッドテック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.woodtec.co.jp/products/public/', '商品ページ')}｜
                {renderLink('https://www.woodtec.co.jp/products/digital_catalog/', 'カタログ')}｜
                {renderLink('https://www.woodtec.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.woodtec.co.jp/customer/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ウッドワン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.woodone.co.jp/product/item/housing_cat/floor/', '商品ページ')}｜
                {renderLink('https://www.woodone.co.jp/static/business/shoplistcat/floormaterial', 'カタログ')}｜
                {renderLink('https://www.woodone.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.woodone.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・イクタ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://ikuta.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.catalabo.org/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=CATALABO&catalogId=78253310000&pageGroupId=1&catalogCategoryId=&keyword=', 'カタログ')}｜
                {renderLink('https://ikuta.co.jp/about/', '営業所')}｜
                {renderLink('https://ikuta.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ノダ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.noda-co.jp/products/flooring/', '商品ページ')}｜
                {renderLink('https://www.noda-co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.noda-co.jp/corporate/info/office.html', '営業所')}｜
                {renderLink('https://www.noda-co.jp/contacts/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ハウディー</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.howdy-inc.com/lineup/floor/howdy-floor', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.howdy-inc.com/catalog#shouhin', '営業所')}｜
                {renderLink('https://www.howdy-inc.com/room', 'お問い合わせ')}｜
                {renderLink('https://www.howdy-inc.com/contact', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・プレイリーホームズ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.prairie.co.jp/archives/product_cat/cat01', '商品ページ')}｜
                {renderLink('https://www.prairie.co.jp/catalog', 'カタログ')}｜
                {renderLink('https://www.prairie.co.jp/showroom', '営業所')}｜
                {renderLink('https://www.prairie.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ボード</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.board.co.jp/product/thin-flooring', '商品ページ')}｜
                {renderLink('https://www.board.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.board.co.jp/company/branch/', '営業所')}｜
                {renderLink('https://www.board.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・イシカワ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://parador.jp/products', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://parador.jp/showroom', '営業所')}｜
                {renderLink('https://parador.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・リリカラ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lilycolor.co.jp/interior/search/search.php?cmd=search&db_select=floorcoverings&srch_floor_item_id%5B%5D=4', '商品ページ')}｜
                {renderLink('https://www.lilycolor.co.jp/interior/catalog/floor.html', 'カタログ')}｜
                {renderLink('https://www.lilycolor.co.jp/company/about/office.html', '営業所')}｜
                {renderLink('https://www.lilycolor.co.jp/company/ir/faq/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ナガイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagai.co.jp/main/product_cat/flooring/', '商品ページ')}｜
                {renderLink('https://www.nagai.co.jp/support/catalog.html', 'カタログ')}｜
                {renderLink('https://www.nagai.co.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.nagai.co.jp/first/formail/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・木曽アルテック社</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kiso-artech.co.jp/products/floor/flooring.html', '商品ページ')}｜
                {renderLink('https://www.kiso-artech.co.jp/catalog.html', 'カタログ')}｜
                {renderLink('https://www.kiso-artech.co.jp/showroom.html', '営業所')}｜
                {renderLink('https://www.kiso-artech.co.jp/Inquiry.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ie-mon</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ie-mon-asia.net/flooring/', '商品ページ')}｜
                {renderLink('https://www.ie-mon-asia.net/catalog/', 'カタログ')}｜
                {renderLink('https://www.ie-mon-asia.net/company/', '営業所')}｜
                {renderLink('https://www.ie-mon-asia.net/request/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'ビニールタイル':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">ビニールタイル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【「Pタイル」と「フロアタイル」の明確な区別】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">Pタイル（コンポジションビニル床タイル）</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塩化ビニルに炭酸カルシウム（石の粉）を多く混ぜた、硬くて脆いタイル。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 金太郎飴のように裏まで同じ色・模様（単層）なので、摩耗しても色が消えない。学校や病院、スーパーなどの「重歩行エリア」で使われるが、デザイン性は低い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">フロアタイル（複層ビニル床タイル・LVT）</h4>
                
                <p className="mb-1 text-xs ml-3">
                  表面に木目や石目のプリントフィルムを貼り、透明な保護層で覆ったもの。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 本物の木や石と見分けがつかないほどリアル。住宅や店舗のデザイン貼りにはこちらが使われる。一般的にカタログで「塩ビタイル」といえばこちらを指すことが多い。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工の命運を握る「下地（したじ）」処理】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「3mm」の薄さが仇となる</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ビニル床タイルの厚みは、わずか2.5mm〜3mmしかない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要リスク: 下地（コンクリートや合板）にわずかでも段差や凸凹、釘の頭が出ていると、施工後に表面にそのまま浮き出てくる（下地を拾う）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  リフォームで採用する場合、既存床の上から貼れるか、あるいは<strong>「パテ処理」や「セルフレベリング（流動化コンクリート）」</strong>で平滑にする費用が必要か、事前のプロによる診断が不可欠。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【クッションフロア（CF）との違い】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「硬さ」と「傷つきにくさ」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>クッションフロア（シート）</strong>: 柔らかく、裸足で歩くと温かいが、家具の跡がつきやすく、破れやすい。安価。</li>
                  <li><span className="mr-1">・</span><strong>フロアタイル</strong>: 硬く、土足でも歩けるほど傷に強い。家具の跡もつきにくいが、冬場は冷たく感じる。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  部分補修: クッションフロアは破れると全面張り替えになるが、タイルは<strong>「傷ついた1枚だけを剥がして交換」</strong>できるため、ランニングコスト（修繕費）に優れる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【水回りでの採用メリット】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">フローリング代わりの最適解</h4>
                
                <p className="mb-1 text-xs ml-3">
                  洗面所やトイレに木質フローリングを使うと、水ハネやアンモニアで黒ずみ・腐食が発生する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  推奨: 「木目調のフロアタイル」を採用することで、リビングからの見た目の統一感を保ちつつ、完全防水の床を実現できる。近年人気の仕様。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【「目地棒（めじぼう）」によるリアル感の追求】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">本物の石に見せるテクニック</h4>
                
                <p className="mb-1 text-xs ml-3">
                  石目調のタイルをただ並べるだけでなく、タイルの間に数ミリの<strong>「目地棒（樹脂製のライン）」</strong>を挟んで施工する手法がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  これにより、本物の石やタイルをモルタル目地で施工したかのようなリアルな高級感を演出できる。店舗設計では常套手段。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ロンシール工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lonseal.co.jp/products/floor/', '商品ページ')}｜
                {renderLink('https://www.lonseal.co.jp/downloads/catalog/', 'カタログ')}｜
                {renderLink('https://www.lonseal.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.lonseal.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・スミノエ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://suminoe.jp/pages/series', '商品ページ')}｜
                {renderLink('https://suminoe.jp/pages/download-vinyl', 'カタログ')}｜
                {renderLink('https://suminoe.jp/pages/showroom', '営業所')}｜
                {renderLink('https://suminoe.jp/pages/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・リリカラ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lilycolor.co.jp/interior/search/search.php?cmd=search&db_select=floorcoverings&srch_floor_item_id%5B%5D=2', '商品ページ')}｜
                {renderLink('https://www.lilycolor.co.jp/interior/catalog/floor.html', 'カタログ')}｜
                {renderLink('https://www.lilycolor.co.jp/company/about/office.html', '営業所')}｜
                {renderLink('https://www.lilycolor.co.jp/company/ir/faq/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・田島ルーフィング</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://tajima.jp/flooring/search/?category=1&subcategory=1_2_3_4', '商品ページ')}｜
                {renderLink('https://tajima.jp/digitalcatalog2/#tile', 'カタログ')}｜
                {renderLink('https://tajima.jp/corporate/about/office/', '営業所')}｜
                {renderLink('https://find.tajima.jp/inquiry/company/contactus/?_gl=1*1vq7oii*_gcl_au*MTI2MzcyMTM3OC4xNzQyOTc2NzU5', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東リ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toli.co.jp/product/search/floor_result', '商品ページ')}｜
                {renderLink('https://www.toli.co.jp/digital_catalog/digital_index.html', 'カタログ')}｜
                {renderLink('https://www.toli.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.toli.co.jp/member/faq', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・サンゲツ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toli.co.jp/product/search/floor_result', '商品ページ')}｜
                {renderLink('https://www.sangetsu.co.jp/digital_book/carpet.html', 'カタログ')}｜
                {renderLink('https://www.sangetsu.co.jp/showroom/', '営業所')}｜
                {renderLink('https://qa.sangetsu.co.jp/public/?_gl=1*1064n3w*_ga*MTkzMTUxODg4Ny4xNzMwMTAyOTY3*_ga_84EXXWDYNY*MTc0Mjk3NTAwOC4xNS4xLjE3NDI5NzUxMTMuNDQuMC4w&_ga=2.177791526.262530188.1742899184-1931518887.1730102967', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・NAGATA</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagata-eco.co.jp/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.nagata-eco.co.jp/aboutus', '営業所')}｜
                {renderLink('https://www.nagata-eco.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'ビニールシート':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">ビニールシート</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【ビニル床シート（長尺シート）】プロ向け深掘り知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">最大のトラブル「膨れ（ふくれ）」と湿気</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塩ビは湿気を通さないため、１階の土間コンクリートなど湿気が上がってくる場所に貼ると、逃げ場を失った湿気でシートが餅のように膨れ上がる事故が多発する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須対策: 土間コンクリート直仕上げの場合は、<strong>「耐湿（たいしつ）工法用の接着剤」を指定するか、そもそもシート自体を「透湿（とうしつ）性のある製品」</strong>にする必要がある。これは見積もり段階で見落としがちな重要ポイント。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">コストを左右する「ノンディレクション（方向性なし）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木目やストライプ柄のシートは、貼る向きが決まっているため、部屋の形状によっては切り落とす端材（ロス）が多くなり、材料費が嵩む。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  コストダウン: 雲柄やチップ柄などの<strong>「方向性のない（ノンディレクション）デザイン」</strong>を選ぶと、継ぎ目の向きを気にせずパズルのように使えるため、材料ロスが減り、コストを圧縮できる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「SL（セルフレベリング）」下地処理の要否</h4>
                
                <p className="mb-1 text-xs ml-3">
                  長尺シートは薄く（2.0mmなど）、下地の凸凹をそのまま表面に拾ってしまう（テレグラフ現象）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  コンクリートの仕上がりが悪い場合、流動性のあるモルタル<strong>「SL（セルフレベリング）材」</strong>を流して床を平滑にする工程が必要になる。リフォーム時にこの費用を見込んでおかないと予算オーバーの原因になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「キャスター適性」と「耐動荷重」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  病院やオフィスで重いワゴンや椅子を使う場合、柔らかい発泡層のあるシートを選ぶと、キャスターが沈み込んで動かしにくくなる上、早期に破損する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  選定: クッション性よりも硬さを重視した<strong>「耐動荷重性（たいどうかじゅうせい）」</strong>の高いグレードを選ぶ必要がある。歩き心地とはトレードオフの関係。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">溶接棒の「色合わせ」と「デザイン溶接」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  通常の熱溶接は、シートと同色の溶接棒を使うが、どうしても継ぎ目の線は見えてしまう。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  意匠: 意匠性を高めるため、継ぎ目を目立たせない<strong>「柄合わせ溶接棒」</strong>を用意しているメーカーもある。逆に、あえて違う色の溶接棒を使ってデザインのアクセントにする手法もある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「臭気（しゅうき）」の問題</h4>
                
                <p className="mb-1 text-xs ml-3">
                  改修工事（居ながら施工）の場合、溶剤系接着剤のシンナー臭が強烈で、入居者からクレームになることがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  換気が難しい場所では、価格は上がるが<strong>「水性接着剤」や「低臭タイプ」</strong>の指定が必須となる。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大日本印刷 </span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://livingspace.dnp.co.jp/product/brand/brand05/', '商品ページ')}｜
                {renderLink('https://sc.livingspace.dnp.co.jp/category/102_EBF/', 'カタログ')}｜
                {renderLink('https://livingspace.dnp.co.jp/showroom/', '営業所')}｜
                {renderLink('https://livingspace.dnp.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・TOPPAN</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://forest.toppan.com/products/residential/101reprea/', '商品ページ')}｜
                {renderLink('https://forest.toppan.com/catalog/', 'カタログ')}｜
                {renderLink('https://forest.toppan.com/divison/office-list/', '営業所')}｜
                {renderLink('https://forest.toppan.com/form/contact_jp_privacy.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・サンゲツ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sangetsu.co.jp/product/?wall_type_wall', '商品ページ')}｜
                {renderLink('https://www.sangetsu.co.jp/digital_book/wall.html', 'カタログ')}｜
                {renderLink('https://www.sangetsu.co.jp/showroom/', '営業所')}｜
                {renderLink('https://qa.sangetsu.co.jp/public/?_gl=1*1064n3w*_ga*MTkzMTUxODg4Ny4xNzMwMTAyOTY3*_ga_84EXXWDYNY*MTc0Mjk3NTAwOC4xNS4xLjE3NDI5NzUxMTMuNDQuMC4w&_ga=2.177791526.262530188.1742899184-1931518887.1730102967', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・田島ルーフィング</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://tajima.jp/flooring/search/', '商品ページ')}｜
                {renderLink('https://tajima.jp/digitalcatalog2/', 'カタログ')}｜
                {renderLink('https://tajima.jp/corporate/about/office/', '営業所')}｜
                {renderLink('https://find.tajima.jp/inquiry/company/contactus/?_gl=1*1vq7oii*_gcl_au*MTI2MzcyMTM3OC4xNzQyOTc2NzU5', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・川島織物セルコン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kawashimaselkon.co.jp/search/', '商品ページ')}｜
                {renderLink('https://www.kawashimaselkon.co.jp/search/catalog/floor/', 'カタログ')}｜
                {renderLink('https://www.kawashimaselkon.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.kawashimaselkon.co.jp/support/business/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ロンシール工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lonseal.co.jp/products/floor/', '商品ページ')}｜
                {renderLink('https://www.lonseal.co.jp/downloads/catalog/', 'カタログ')}｜
                {renderLink('https://www.lonseal.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.lonseal.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アドヴァン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.advan.co.jp/eshop/category/K00004/', '商品ページ')}｜
                {renderLink('https://www.advan.co.jp/eshop/catalog/', 'カタログ')}｜
                {renderLink('https://www.advan.co.jp/company/satellite/', '営業所')}｜
                {renderLink('https://www.advan.co.jp/eshop/question/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東リ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toli.co.jp/product/search/floor_result?list=1', '商品ページ')}｜
                {renderLink('https://www.toli.co.jp/sample/#pageLink07', 'カタログ')}｜
                {renderLink('https://www.toli.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.toli.co.jp/member/faq', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・リリカラ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lilycolor.co.jp/interior/search/?cat=floorcoverings', '商品ページ')}｜
                {renderLink('https://www.lilycolor.co.jp/interior/catalog/', 'カタログ')}｜
                {renderLink('https://www.lilycolor.co.jp/company/about/office.html', '営業所')}｜
                {renderLink('https://www.lilycolor.co.jp/company/ir/faq/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'カーペット':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">カーペット</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【素材（パイル）の決定的な性能差】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">最強の素材「BCFナイロン」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  オフィスや商業施設でカーペットを選ぶ際、<strong>「ナイロン（特にBCFナイロン）」</strong>製を選ぶのが耐久性の鉄則。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  理由: 繊維の弾力回復性が極めて高く、重い家具を置いたり、多くの人が歩いても「ヘタリ」が起きにくい。摩耗にも最強。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ポリプロピレン（PP）: 安価だが、弾力性が低く、一度潰れると元に戻りにくい。賃貸住宅や短期イベント用と割り切る必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">高級感の代償「ウールの遊び毛」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ウール（羊毛）は調湿性があり、独特の風合いと高級感があるためホテル等で人気。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 施工後しばらくの間、綿ボコリのような<strong>「遊び毛（あそびげ）」</strong>が大量に出る。これは不良品ではなく仕様だが、知らない施主からクレームになりやすいため事前説明が必須。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【形状：タイルカーペットとロールカーペット】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">オフィス標準「タイルカーペット」の進化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  50cm角のパネル状カーペット。汚れた部分だけ交換できるため、メンテナンス性が抜群。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  デザイン: 昔は事務的な市松貼りが主だったが、現在は長方形（25cm×100cm）や六角形、グラデーション貼りなど、デザイン貼りによる意匠性が劇的に向上している。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ホテルライクな「ロールカーペット」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  継ぎ目のない一枚もの。踏み心地の良さと高級感はタイルカーペットでは再現できない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  フェルトグリッパー工法: 壁際の木枠（グリッパー）の釘に引っ掛けて、下にフェルト（クッション材）を敷き込んで施工する工法。踏み心地が最高になるが、施工難易度が高く、職人が減っている。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【パイル形状と「シェーディング」現象】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ループ」と「カット」の使い分け</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ループパイル</strong>: 毛先が輪になっている。弾力があり、ヘタリに強く、掃除しやすい。土足歩行のオフィスや廊下に最適。</li>
                  <li><span className="mr-1">・</span><strong>カットパイル</strong>: 毛先をカットしている。柔らかく高級感があるが、ヘタリやすく、汚れが奥に入りやすい。応接室や寝室向け。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">カットパイルの宿命「シェーディング（くも現象）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  カットパイルは、毛の向きが変わると光の反射が変わって、水に濡れたようなシミに見える現象（シェーディング）が必ず起きる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: これを「汚れ・色ムラ」と勘違いされることがあるが、カットパイル特有の性質であり、クレーム対象外であることを理解しておく必要がある。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工：OAフロアと「ピールアップボンド」】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">接着剤の選定ミスは致命的</h4>
                
                <p className="mb-1 text-xs ml-3">
                  オフィスの床（OAフロア）の上にタイルカーペットを貼る場合、<strong>「ピールアップボンド（粘着剥離形接着剤）」</strong>を使用する。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  特徴: 完全に固まらず、付箋の糊のように「貼ったり剥がしたり」ができる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  事故例: 間違ってゴム系やウレタン系の「強力な接着剤」を使ってしまうと、配線変更などで床を開ける際にカーペットが剥がれなくなり、OAフロアごと破壊することになる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【機能性：静電と防ダニ】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">冬場のバチッを防ぐ「制電（せいでん）機能」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  摩擦による静電気が発生しやすい。特にOA機器が多いオフィスや、冬場のホテル廊下では、人体帯電圧を抑える<strong>「制電カーペット（導電性繊維入り）」</strong>を選ばないと、ドアノブに触るたびに不快な思いをする。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「カーペットはダニの温床」という誤解</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昨今のカーペットは防ダニ加工が標準。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  むしろ、フローリングはハウスダストが空中に舞い上がりやすいのに対し、カーペットは埃をパイル内に吸着して<strong>「舞い上がりを抑える（ダストポケット効果）」</strong>があるため、適切な掃除機がけを行えば、喘息などのアレルギー対策に有効な床材として再評価されている。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">タイルカーペット</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ロンシール工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lonseal.co.jp/products/floor/', '商品ページ')}｜
                {renderLink('https://www.lonseal.co.jp/downloads/catalog/', 'カタログ')}｜
                {renderLink('https://www.lonseal.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.lonseal.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・スミノエ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://suminoe.jp/pages/series', '商品ページ')}｜
                {renderLink('https://suminoe.jp/pages/download-carpet', 'カタログ')}｜
                {renderLink('https://suminoe.jp/pages/showroom', '営業所')}｜
                {renderLink('https://suminoe.jp/pages/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・睦屋</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.mutsumi-ya.com/brand/cat3.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.mutsumi-ya.com/showroom/', '営業所')}｜
                {renderLink('https://www.mutsumi-ya.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・田島ルーフィング</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://tajima.jp/flooring/search/?category=3&subcategory=10_11_12_13', '商品ページ')}｜
                {renderLink('https://tajima.jp/digitalcatalog2/#carpettile', 'カタログ')}｜
                {renderLink('https://tajima.jp/corporate/about/office/', '営業所')}｜
                {renderLink('https://find.tajima.jp/inquiry/company/contactus/?_gl=1*gyzyx3*_gcl_au*MTI2MzcyMTM3OC4xNzQyOTc2NzU5', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・TUNTEX</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tuntex-carpet.com/ja/product', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.tuntex-carpet.com/ja/contact', '営業所')}｜
                {renderLink('https://www.tuntex-carpet.com/ja/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・サンゲツ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sangetsu.co.jp/product/list/search_common', '商品ページ')}｜
                {renderLink('https://www.sangetsu.co.jp/digital_book/carpet.html', 'カタログ')}｜
                {renderLink('https://www.sangetsu.co.jp/showroom/', '営業所')}｜
                {renderLink('https://qa.sangetsu.co.jp/public/?_gl=1*1064n3w*_ga*MTkzMTUxODg4Ny4xNzMwMTAyOTY3*_ga_84EXXWDYNY*MTc0Mjk3NTAwOC4xNS4xLjE3NDI5NzUxMTMuNDQuMC4w&_ga=2.177791526.262530188.1742899184-1931518887.1730102967', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・リリカラ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lilycolor.co.jp/interior/search/search.php?cmd=search&db_select=floorcoverings&srch_floor_item_id%5B%5D=5', '商品ページ')}｜
                {renderLink('https://www.lilycolor.co.jp/interior/catalog/floor.html', 'カタログ')}｜
                {renderLink('https://www.lilycolor.co.jp/company/about/office.html', '営業所')}｜
                {renderLink('https://www.lilycolor.co.jp/company/ir/faq/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東リ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toli.co.jp/product/search/carpet_result', '商品ページ')}｜
                {renderLink('https://www.toli.co.jp/digital_catalog/digital_index.html', 'カタログ')}｜
                {renderLink('https://www.toli.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.toli.co.jp/member/faq', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ロールカーペット</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東リ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toli.co.jp/product/search/carpet_result', '商品ページ')}｜
                {renderLink('https://www.toli.co.jp/digital_catalog/digital_index.html', 'カタログ')}｜
                {renderLink('https://www.toli.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.toli.co.jp/member/faq', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・スミノエ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://suminoe.jp/pages/series', '商品ページ')}｜
                {renderLink('https://suminoe.jp/pages/download-carpet', 'カタログ')}｜
                {renderLink('https://suminoe.jp/pages/showroom', '営業所')}｜
                {renderLink('https://suminoe.jp/pages/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アスワン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.aswan.co.jp/productinformation/seriesintroduction/carpetseries/', '商品ページ')}｜
                {renderLink('https://www.aswan.co.jp/digitalcatalog/carpet.html', 'カタログ')}｜
                {renderLink('https://www.aswan.co.jp/companyinformation/listofoffices.html', '営業所')}｜
                {renderLink('#', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・シンコール</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sincol.co.jp/products/carpet.html', '商品ページ')}｜
                {renderLink('https://www.sincol.co.jp/digicata/index.html', 'カタログ')}｜
                {renderLink('https://www.sincol.co.jp/showroom.html', '営業所')}｜
                {renderLink('https://www.sincol.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装タイル':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">内装床タイル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【内装タイルの機能とリスク】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ヒヤッと感」の解決策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  タイルは熱伝導率が高いため、冬場は非常に冷たくなる。リビングに採用する場合の最大のネック。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: <strong>「床暖房」</strong>との併用が必須級のセットとなる。タイルは熱を蓄える（蓄熱性がある）ため、一度温まると冷めにくく、床暖房との相性は実は抜群に良い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「目地（めじ）」の汚れと防カビ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  タイル自体は汚れないが、セメント目地は吸水し、醤油や油でシミになり、カビも生える。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須スペック: キッチンや洗面所に使う場合、吸水率を極限まで下げた<strong>「スーパークリーン目地（防汚・防カビ目地）」</strong>を採用しないと、数年で目地だけが真っ黒になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ペットと「滑り」の関係</h4>
                
                <p className="mb-1 text-xs ml-3">
                  犬や猫にとって、ツルツルのタイルは関節を痛める原因になる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  室内用でも、ペットがいる家庭では表面に微細な凹凸がある<strong>「ペット対応（防滑）タイル」</strong>を選ぶか、コーティング処理が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【デザインと施工のトレンド】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「600角（ろっぴゃくかく）」以上の大判化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  以前は300mm角が主流だったが、現在は600mm角、さらには1000mmを超える大判タイルがトレンド。目地が減り、空間が豪華に見える。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  施工リスク: 大判タイルは下地の不陸（凹凸）を拾いやすく、端部が数ミリ浮く「段差（目違い）」が出やすい。高度な職人技術（クリップ工法など）が必要になるため、施工費が割高になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「セラミックタイル」の薄型化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  厚さ3mm〜5mm程度の極薄大判セラミックタイルが登場している。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 既存の床（フローリング等）の上から重ね貼りができるため、リフォームでの導入ハードルが下がっている。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【用途別の適正】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">玄関土間（内側）の選び方</h4>
                
                <p className="mb-1 text-xs ml-3">
                  靴を脱ぐ「上がり框（あがりかまち）」の手前までは、外部と同じ扱いになる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  雨の日に濡れた靴で入るため、内装用タイルではなく、外部用と同じ<strong>「防滑（ノンスリップ）仕様」</strong>にしないと、家の中で転倒事故が起きる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">キッチン床の油汚れ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  フローリングだと油跳ねで黒ずむが、タイル（特に磁器質）なら油を吸い込まないため、ゴシゴシ拭き掃除ができる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ただし、食器を落とすと<strong>「確実に割れる」</strong>（フローリングなら割れないこともある）ため、キッチンマットとの併用が現実的。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・淡陶社</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://danto.jp/products/list?productplus_4=6', '商品ページ')}｜
                {renderLink('https://danto.jp/catalog_request/', 'カタログ')}｜
                {renderLink('https://danto.jp/companyinfo/showroom/', '営業所')}｜
                {renderLink('https://danto.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・名古屋モザイク工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagoya-mosaic.com/products/search?cat=140', '商品ページ')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/catalogue/2024.html', 'カタログ')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/companyguide/branch.html', '営業所')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/secure/contact/contactfrm2?nonlogin', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ニッタイ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nittai-kogyo.co.jp/products/search.html?p_series=&l_lineup_number=&category_name=&usecase%5B%5D=%E5%B1%8B%E5%86%85%E5%BA%8A&p_image=&price1=3000&price2=20000&width1=&width2=&height1=&height2=&depth1=&depth2=', '商品ページ')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/catalog.html', 'カタログ')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/company/showroom/', '営業所')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/inquiry/other/index.php', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アドヴァン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.advan.co.jp/eshop/category/K00001/indoortile/', '商品ページ')}｜
                {renderLink('https://www.advan.co.jp/eshop/catalog/', 'カタログ')}｜
                {renderLink('https://www.advan.co.jp/company/satellite/', '営業所')}｜
                {renderLink('https://www.advan.co.jp/eshop/question/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸鹿セラミックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.marushika.com/material/tile.html', '商品ページ')}｜
                {renderLink('http://www.marushika.com/digitalcatalog/?pNo=1', 'カタログ')}｜
                {renderLink('http://www.marushika.com/about/index.html#branch', '営業所')}｜
                {renderLink('http://www.marushika.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ミラタップ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.miratap.co.jp/shop/c/C007_14/', '商品ページ')}｜
                {renderLink('https://www.miratap.co.jp/shop/app/pages/catalog/', 'カタログ')}｜
                {renderLink('#https://www.miratap.co.jp/shop/showroom/', '営業所')}｜
                {renderLink('https://www.miratap.co.jp/shop/app/customer/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・オオムラ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ohmura-trading.co.jp/products/list?category_id=1', '商品ページ')}｜
                {renderLink('https://www.ohmura-trading.co.jp/catalog/#page=2', 'カタログ')}｜
                {renderLink('https://www.ohmura-trading.co.jp/help/company', '営業所')}｜
                {renderLink('https://www.ohmura-trading.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セラコア</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ceracore.net/view/category/ct69', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.ceracore.net/view/company', '営業所')}｜
                {renderLink('https://www.ceracore.net/ssl/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・LIXIL</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.biz-lixil.com/product/tile/c1002/', '商品ページ')}｜
                {renderLink('https://www.biz-lixil.com/catalog/', 'カタログ')}｜
                {renderLink('https://www.lixil.co.jp/showroom/', '営業所')}｜
                {renderLink('#', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・田島ルーフィング</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://tajima.jp/flooring/search/?category=1&subcategory=1_2_3_4', '商品ページ')}｜
                {renderLink('https://tajima.jp/digitalcatalog2/#tile', 'カタログ')}｜
                {renderLink('https://tajima.jp/corporate/about/office/', '営業所')}｜
                {renderLink('https://find.tajima.jp/inquiry/company/contactus/?_gl=1*gyzyx3*_gcl_au*MTI2MzcyMTM3OC4xNzQyOTc2NzU5', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装床石レンガ':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">内装床 石・レンガ</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【天然石（大理石・御影石・ライムストーン）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">大理石の天敵「酸（さん）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  大理石は高級感の代名詞だが、炭酸カルシウムが主成分のため、酸に極端に弱い。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  生活リスク: キッチンやダイニングで、レモン汁、酢、ワインをこぼすと、瞬時に表面が白く溶けて艶が消える（エッチング）。これは拭いても直らない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  水回りに使う場合は、酸に強い御影石にするか、強力なコーティングが必須となる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「本磨き（鏡面）」の転倒リスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ピカピカの「本磨き仕上げ」は美しいが、濡れると非常に滑りやすくなる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ゾーニング: ペットや高齢者がいる家庭、または雨の日に濡れた靴で入る玄関ホールでは、マットな質感の<strong>「水磨き（みずみがき）」</strong>や「ホン仕上げ」を選定して、グリップ力を確保するのが安全設計の基本。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「裏面処理（裏バテ）」の必要性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  天然石によっては、施工時のモルタルの水分やアクを吸い上げて、表面にシミができることがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  これを防ぐため、石の裏側に樹脂を塗る<strong>「裏面処理（裏バテ）」</strong>が施されている製品か、施工時にシーラー処理を行うかを確認する必要がある。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【レンガ（古レンガ・レンガタイル）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「スライス」か「敷き込み」か</h4>
                
                <p className="mb-1 text-xs ml-3">
                  室内の床にレンガを使う場合、厚みのあるレンガをそのまま敷くと床高が上がりすぎ、重量も過大になる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  主流: 通常はレンガを厚さ15mm〜20mm程度にカットした<strong>「スライスレンガ（レンガタイル）」</strong>を、タイルと同じ要領で貼る工法が一般的。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">表面の「粉落ち」と掃除の難易度</h4>
                
                <p className="mb-1 text-xs ml-3">
                  アンティークレンガは表面がザラザラしており、経年で粉が落ちたり、目地に埃が溜まりやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: モップが引っかかって掃除がしにくいため、表面を固める<strong>「浸透性強化剤」</strong>を塗布するか、土足エリア（土間）限定で採用するなど、清掃性を考慮したゾーニングが必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">目地（めじ）の幅と歩行感</h4>
                
                <p className="mb-1 text-xs ml-3">
                  レンガ床は、意匠的に10mm〜20mmの「太い目地」を取ることが多い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  この目地の凹凸が、家具（椅子の脚やキャスター）のガタつきの原因になるため、ダイニングテーブルの下などには不向きな場合がある。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【共通：温熱環境と硬さ】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「床暖房」との相性は最強</h4>
                
                <p className="mb-1 text-xs ml-3">
                  石やレンガは熱伝導率が高いため、冬場は氷のように冷たいが、一度温まると熱を逃さない<strong>「蓄熱性（ちくねつせい）」</strong>が高い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  床暖房と組み合わせることで、エアコンを切っても長時間暖かさが続く、最高の暖房環境を作れる（欧州の石造り建築と同じ原理）。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「硬さ」による食器破損リスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  フローリングやクッションフロアと違い、ガラスや陶器の食器を落とすと<strong>「100%粉々に割れる」</strong>。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  キッチン床に採用する場合は、キッチンマットを敷くなどの運用対策をあらかじめ伝えておく必要がある。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・関ケ原石材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sekistone.com/products/catalog/', '商品ページ')}｜
                {renderLink('https://www.sekistone.com/wp/docs/webcatalog2025/#page=1', 'カタログ')}｜
                {renderLink('https://www.sekistone.com/company/access/', '営業所')}｜
                {renderLink('https://www.sekistone.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ABC商会</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.abc-t.co.jp/products/material/floor/ceramicTile/', '商品ページ')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/catalog_list', 'カタログ')}｜
                {renderLink('https://www.abc-t.co.jp/company/establishments.html', '営業所')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/select', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・オオムラ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ohmura-trading.co.jp/products/list?category_id=2', '商品ページ')}｜
                {renderLink('https://www.ohmura-trading.co.jp/catalog/#page=2', 'カタログ')}｜
                {renderLink('https://www.ohmura-trading.co.jp/help/company', '営業所')}｜
                {renderLink('https://www.ohmura-trading.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セラコア</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ceracore.net/view/category/ct70', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.ceracore.net/view/company', '営業所')}｜
                {renderLink('https://www.ceracore.net/ssl/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アドヴァン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.advan.co.jp/product/', '商品ページ')}｜
                {renderLink('https://www.advan.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.advan.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.advan.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '畳':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">畳</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【表（おもて）素材：「イ草」と「和紙・樹脂」】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「イ草」の香り・調湿 vs 「和紙」の耐久性</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>天然イ草</strong>: 香りが良く、調湿効果や空気浄化作用があるが、紫外線で黄色く変色し、擦り切れ（ささくれ）が発生する。ダニ・カビのリスクがある。</li>
                  <li><span className="mr-1">・</span><strong>和紙・樹脂（化学表）</strong>: 和紙をこより状にして樹脂コーティングしたもの（ダイケン「健やかおもて」等）。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 変色しない、カビ・ダニが発生しにくい、撥水性がある、摩耗に強い。現代の住宅では、メンテナンス性を重視して和紙畳が主流になりつつある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「日焼け」による変色リスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  天然イ草は新しい時は青々としているが、数年で飴色（黄色）に変色する。家具を置いていた場所とそうでない場所でくっきりと色が変わるため、模様替え時に目立つ。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  和紙畳はほぼ変色しないため、初期の色合いを長期間維持できる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【デザイン：「縁（へり）」の有無】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「琉球畳（りゅうきゅうだたみ）」と「縁なし畳」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  本来の琉球畳は「七島イ（しちとうい）」という丈夫な草を使ったものだが、現在は半畳サイズで縁（へり）がない畳全般を<strong>「琉球風畳（縁なし畳）」</strong>と呼ぶことが多い。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  市松敷き: 同じ色の畳でも、目の向きを縦・横と交互に変えて敷くことで、光の反射により<strong>「市松模様（チェック柄）」</strong>に見せる敷き方がモダン和室の定番。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">コストの差</h4>
                
                <p className="mb-2 text-xs ml-3">
                  「縁なし畳」は、イ草を折り曲げて加工するのに手間と技術が必要なため、通常の「縁あり畳」よりも価格が割高になる。見積もり時の増額ポイント。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【メンテナンスのサイクル】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">畳の寿命と「3つの更新方法」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>裏返し（うらがえし）</strong>: 3〜5年後。畳表を剥がして裏返し、再利用する。コスト安。</li>
                  <li><span className="mr-1">・</span><strong>表替え（おもてがえ）</strong>: 7〜10年後。畳床（芯材）はそのままで、表面のゴザと縁だけを新品にする。</li>
                  <li><span className="mr-1">・</span><strong>新調（しんちょう）</strong>: 15〜20年後。芯材がヘタったら、畳全体を新品に交換する。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  ※和紙畳や樹脂畳は耐久性が高いため、裏返しを行わず、汚れたら表替えや交換をするサイクルが一般的。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【構造とリフォーム知識】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「畳床（たたみどこ）」の進化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔の畳床は「稲わら」を圧縮したもので、重く、ダニの温床になりやすかった。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現在: ポリスチレンフォーム（断熱材）をインシュレーションボードで挟んだ<strong>「建材床（ケンザイ床）」</strong>が標準。軽量で断熱性が高く、ダニも湧きにくい。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">リフォーム時の「厚み」問題</h4>
                
                <p className="mb-1 text-xs ml-3">
                  本畳の厚さは通常55mm〜60mm。対してフローリングは12mm。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  和室を洋室にする、あるいは洋室を和室にする際、この<strong>「約45mmの段差」</strong>をどう処理するか（下地上げや薄畳の採用）が設計の最重要ポイントとなる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  薄畳（うすだたみ）: フローリングの厚みに合わせた15mm厚の畳もあるが、クッション性は本畳に劣る。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「置き畳（ユニット畳）」の手軽さ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  フローリングの上に置くだけの薄い畳。裏面に滑り止めがついている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  リフォーム工事なしでキッズスペースやゴロ寝スペースを作れるため、賃貸やマンションでの需要が高い。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大建工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiken.jp/buildingmaterials/tatami/', '商品ページ')}｜
                {renderLink('https://www.daiken.jp/buildingmaterials/tatami/#CATALOG', 'カタログ')}｜
                {renderLink('https://www.daiken.jp/showroom/', '営業所')}｜
                {renderLink('https://faq.daiken.jp/faq/show/948?site_domain=user', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・光洋産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.koyoweb.com/products/build-tatami/pd_build-tatami-6/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.koyoweb.com/about/bases/', '営業所')}｜
                {renderLink('https://www.koyoweb.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ダイヤロン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.diaron.co.jp/ja/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.diaron.co.jp/ja/company/', '営業所')}｜
                {renderLink('https://www.diaron.co.jp/ja/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ライフネット難波</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lifenet-namba.co.jp/tatami/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.lifenet-namba.co.jp/company/about.html', '営業所')}｜
                {renderLink('https://www.lifenet-namba.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・グッドグラス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.tatamo.jp/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('http://www.tatamo.jp/aboutus/company/', '営業所')}｜
                {renderLink('http://www.tatamo.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・山中産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.yamanaka-jp.com/catalog/?cat_filter=%25e7%2595%25b3%25e8%25b3%2587%25e6%259d%2590', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.yamanaka-jp.com/about/location/', '営業所')}｜
                {renderLink('https://www.yamanaka-jp.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・積水成型工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sekisuimigusa.jp/products.html', '商品ページ')}｜
                {renderLink('https://www.sekisuimigusa.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.sekisuimigusa.jp/showroom.html', '営業所')}｜
                {renderLink('https://www.sekisuimigusa.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・イケヒコ・ｺｰﾎﾟﾚｰｼｮﾝ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://ikehiko.net/product_category/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://ikehiko.net/company/aboutus/', '営業所')}｜
                {renderLink('https://ikehiko.net/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・村上産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.murakami-t.co.jp/product/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.murakami-t.co.jp/company/', '営業所')}｜
                {renderLink('https://www.murakami-t.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '巾木床見切':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">巾木・床見切</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【巾木（幅木）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「掃除機の衝突」から壁を守る</h4>
                
                <p className="mb-1 text-xs ml-3">
                  巾木の本来の役割は、掃除機や足が壁に当たってクロス（壁紙）が汚れたり破れたりするのを防ぐこと。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  トレンド: 存在感を消すために「極薄・極小」の巾木が流行っているが、小さすぎると保護機能が低下し、壁の下端がすぐに汚れるリスクがある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「ソフト巾木」と「木製巾木」の使い分け</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ソフト巾木（塩ビ）</strong>: 柔らかいシート状。安価で施工が早いため、オフィスや店舗、賃貸住宅で主流。壁の不陸（凸凹）に追従しやすい。高さ60mmが標準。</li>
                  <li><span className="mr-1">・</span><strong>木製巾木（MDF等）</strong>: 硬い木質系。高級感があり、戸建て住宅の標準。出隅（角）の納まりが綺麗だが、施工に手間がかかる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">デザインの流行「入り巾木」と「アルミ巾木」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>入り巾木（いりはばき）</strong>: 壁面よりも巾木を凹ませる納まり。壁が浮いているように見え、非常にスタイリッシュだが、施工費が高い。</li>
                  <li><span className="mr-1">・</span><strong>アルミ巾木</strong>: 金属のシャープなラインで見切る。モダンな空間で人気だが、傷がつくと補修が難しい。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【床見切り（ゆかみきり）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「への字」と「T型」の使い分け</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>への字（スロープ）</strong>: フローリングとクッションフロアなど、床材に<strong>「段差がある」</strong>場合に使用。つまずき防止のスロープ形状になっている。</li>
                  <li><span className="mr-1">・</span><strong>T型（フラット）</strong>: フローリング同士の貼り分けなど、床材の<strong>「高さが同じ」</strong>場合に使用。上から被せて目地を隠す。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「金属」か「樹脂」か「木質」か</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>金属（アルミ・ステンレス）</strong>: 耐久性が高く、薄いためバリアフリー性に優れる。モダンで目立たない。</li>
                  <li><span className="mr-1">・</span><strong>樹脂・木質</strong>: フローリングに近い色柄を選べるため、床に馴染むが、厚みがあるため若干の段差感が出る。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">異種素材の「縁切り（えんきり）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  タイルとフローリングが接する場所など、伸縮率が違う素材を突きつけると、隙間が空いたり突き上げたりする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  見切り材を入れることで、素材の動きを吸収する<strong>「縁切り」</strong>の役割を果たし、床鳴りや破損を防ぐ。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">リフォーム時の「リフォーム框（かまち）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  既存の玄関框（かまち）の上から、新しいフローリングを重ね張りする場合、段差の側面を隠すためのL字型部材<strong>「リフォーム框」</strong>が必須となる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  これを使わないと、古い框が見えてしまい、リフォームの仕上がりが台無しになる。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">巾木</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大建工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiken.jp/buildingmaterials/interior/baseboard/', '商品ページ')}｜
                {renderLink('https://www.daiken.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.daiken.jp/showroom/', '営業所')}｜
                {renderLink('https://faq.daiken.jp/faq/show/948?site_domain=user', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・永大産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.eidai.com/product/flooring/baseboard/', '商品ページ')}｜
                {renderLink('https://prosite.eidai-sangyo.co.jp/iportal/CatalogSearch.do?method=catalogSearchByCategory&volumeID=GAZOU&categoryID=64300000&sortKey=CatalogMain270000&sortOrder=ASC', 'カタログ')}｜
                {renderLink('https://www.eidai.com/showroom/', '営業所')}｜
                {renderLink('https://www.eidai.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・朝日ウッドテック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.woodtec.co.jp/products/public/baseboard/', '商品ページ')}｜
                {renderLink('https://www.woodtec.co.jp/products/digital_catalog/', 'カタログ')}｜
                {renderLink('https://www.woodtec.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.woodtec.co.jp/customer/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ウッドワン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.woodone.co.jp/product/item/housing_cat/baseboard/', '商品ページ')}｜
                {renderLink('https://www.woodone.co.jp/static/business/shoplistcat/floormaterial', 'カタログ')}｜
                {renderLink('https://www.woodone.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.woodone.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ノダ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.noda-co.jp/products/baseboard/', '商品ページ')}｜
                {renderLink('https://www.noda-co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.noda-co.jp/corporate/info/office.html', '営業所')}｜
                {renderLink('https://www.noda-co.jp/contacts/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・南海プライウッド</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nankaiplywood.co.jp/products/flooring/baseboard/', '商品ページ')}｜
                {renderLink('https://www.nankaiplywood.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.nankaiplywood.co.jp/company/showroom/', '営業所')}｜
                {renderLink('https://www.nankaiplywood.co.jp/support/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ハウテック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.hautec.co.jp/products/interior/baseboard/', '商品ページ')}｜
                {renderLink('https://www.hautec.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.hautec.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.hautec.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・マツ六</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.mazroc.co.jp/products/interior/baseboard/', '商品ページ')}｜
                {renderLink('https://www.mazroc.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.mazroc.co.jp/company/showroom/', '営業所')}｜
                {renderLink('https://www.mazroc.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">床見切</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・フクビ化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fukuvi.co.jp/product/category/floor-trim/', '商品ページ')}｜
                {renderLink('https://www.fukuvi.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.fukuvi.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.fukuvi.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・タマリ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tamari.co.jp/products/floor-trim/', '商品ページ')}｜
                {renderLink('https://www.tamari.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.tamari.co.jp/company/', '営業所')}｜
                {renderLink('https://www.tamari.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・日本システムアート</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.system-art.co.jp/products/trim/', '商品ページ')}｜
                {renderLink('https://www.system-art.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.system-art.co.jp/company/', '営業所')}｜
                {renderLink('https://www.system-art.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・城東テクノ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.joto.com/product/floor-trim/', '商品ページ')}｜
                {renderLink('https://www.joto.com/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.joto.com/company/office/', '営業所')}｜
                {renderLink('https://www.joto.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装床機能性':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">機能性</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【OAフロア（フリーアクセスフロア）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「樹脂製」と「コンクリート充填鋼板」の歩行感</h4>
                
                <p className="mb-1 text-xs ml-3">
                  オフィスの配線を床下に隠すための二重床。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>樹脂製（置敷きタイプ）</strong>: 軽量で安価。小規模オフィスで主流だが、歩くと「ポコポコ」という空洞音がしやすく、重量物を置くとたわむことがある。</li>
                  <li><span className="mr-1">・</span><strong>コンクリート充填鋼板</strong>: 重く高価だが、歩行感がコンクリート床と変わらず、非常に堅牢。大規模ビルやサーバールームの標準。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「H=50mm」が天井高を圧迫する</h4>
                
                <p className="mb-1 text-xs ml-3">
                  OAフロアを入れると、床が最低でも40mm〜50mm上がる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 天井高が低い古いビルで採用すると、圧迫感が出たり、ドアが開かなくなったりする。スロープの設置スペースも必要なため、導入には空間設計の再考が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">タイルカーペットとの「ズラし施工」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  OAフロアの継ぎ目と、上に敷くタイルカーペットの継ぎ目を揃えてしまうと、目地が開きやすくなる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必ず位置をズラして施工（流し貼り等）するのが鉄則。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【遮音下地（防音マット・乾式二重床）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">好きな床材を使える「遮音マット」工法</h4>
                
                <p className="mb-1 text-xs ml-3">
                  マンションで「遮音フローリング（フワフワする床）」を使いたくない場合や、タイル・石を貼りたい場合に採用する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  工法: コンクリートの上にゴム製の<strong>「遮音マット（アンダーレイ）」</strong>を敷き、その上に仕上げ材を貼ることで、硬い床材でも遮音等級（LL-45等）をクリアできる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">リノベの定番「乾式二重床（かんしきにじゅうゆか）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  防振ゴムが付いたボルト（支持脚）で床パネルを浮かす工法。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 遮音性が高く、床下に配管を通せるため、水回りの位置変更（レイアウト変更）が可能になる。マンションリノベーションの必須技術。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【体育館・スポーツフロア】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">膝を守る「弾力性」の正体</h4>
                
                <p className="mb-1 text-xs ml-3">
                  体育館の床が硬すぎると怪我をする。適度な弾力が必要。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  構造: 表面のフローリングが柔らかいわけではなく、床下の<strong>「ゴムクッション付きの束（つか）」</strong>や、根太の構造によって、床全体がトランポリンのようにわずかに沈み込むことで衝撃を吸収している。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【厨房塗床（ぬりゆか）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">コンクリートを酸や油から守る</h4>
                
                <p className="mb-1 text-xs ml-3">
                  飲食店の厨房床は、水・油・熱湯・洗剤によりコンクリートが侵食される。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須スペック: 一般的な塗装ではなく、分厚い膜を作る<strong>「硬質ウレタン」や、耐熱・耐薬品に優れた「水性硬質ウレタン（タフクリート等）」</strong>で保護しないと、数年で床がボロボロになり、衛生検査に通らなくなる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「R巾木（アールはばき）」の一体仕上げ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塗床材を壁面まで立ち上げて、入隅を曲線（R）にする施工。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  汚れが溜まる「隅」を物理的になくすことで、デッキブラシでの水洗いが容易になり、HACCP（衛生管理）対応の標準仕様となっている。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="flex items-center mt-2 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">制振・遮音材</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・大建工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiken.jp/buildingmaterials/underlay/', '商品ページ')}｜
                {renderLink('https://www.daiken.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.daiken.jp/showroom/', '営業所')}｜
                {renderLink('https://faq.daiken.jp/faq/show/948?site_domain=user', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・フクビ化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fukuvi.co.jp/product/category/sound-insulation/', '商品ページ')}｜
                {renderLink('https://www.fukuvi.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.fukuvi.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.fukuvi.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・積水化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sekisui.co.jp/products/housing/sound-insulation/', '商品ページ')}｜
                {renderLink('https://www.sekisui.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.sekisui.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.sekisui.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">床暖房</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・パナソニック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://panasonic.jp/sumai/floor_heating/', '商品ページ')}｜
                {renderLink('https://panasonic.jp/sumai/catalog/', 'カタログ')}｜
                {renderLink('https://panasonic.jp/showroom/', '営業所')}｜
                {renderLink('https://panasonic.jp/support/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・リンナイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://rinnai.jp/products/floor_heating/', '商品ページ')}｜
                {renderLink('https://rinnai.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://rinnai.jp/company/office/', '営業所')}｜
                {renderLink('https://rinnai.jp/support/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・ノーリツ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.noritz.co.jp/product/floor_heating/', '商品ページ')}｜
                {renderLink('https://www.noritz.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.noritz.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.noritz.co.jp/support/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装床その他':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">その他</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【コルクタイル（コルク床）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">圧倒的な「温かさ」と「弾力」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コルク樫の樹皮を圧縮した素材。内部に無数の気泡を持つため、断熱性が非常に高く、冬でもスリッパなしで歩けるほど温かい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  用途: 弾力があり、転んでも痛くないため、子供部屋、寝室、高齢者の部屋、そして立ち仕事の多いキッチンの床に最適。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">表面仕上げによる「耐久性」の差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ウレタン塗装</strong>: 表面を樹脂で固めたもの。水や汚れに強く、掃除が楽だが、コルク本来の肌触りは少し損なわれる。水回りは必須。</li>
                  <li><span className="mr-1">・</span><strong>ワックス・オイル仕上げ</strong>: コルクの感触が生きるが、汚れが染み込みやすく、定期的なメンテナンスが必要。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「紫外線退色」の宿命</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コルクは紫外線に弱く、日が当たる場所は数年で<strong>「白っぽく退色（黄変）」</strong>する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  これを防ぐのは難しいため、窓際にラグを敷くか、退色を味として受け入れる説明が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【リノリウム（天然素材シート）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">ビニル床（塩ビ）とは別物</h4>
                
                <p className="mb-1 text-xs ml-3">
                  見た目は長尺シートに似ているが、亜麻仁油（あまにゆ）、松脂、コルク粉、ジュートなど100%天然素材で作られた床材（マーモリウム等）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 塩ビ特有の臭いがなく、燃やしても有毒ガスが出ない。静電気が起きにくく、ハウスダストを寄せ付けない。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">天然の「抗菌・抗ウイルス」効果</h4>
                
                <p className="mb-1 text-xs ml-3">
                  原料の亜麻仁油には強力な抗菌作用があるため、床にある菌やウイルスの増殖を抑える効果が永続する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  この機能性から、病院、保育園、介護施設での採用率が高い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">独特の「匂い」と施工性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  施工直後は、亜麻仁油由来の独特な匂い（油絵の具のような匂い）がする。人体に無害だが、好みが分かれるため事前のサンプル確認が必要。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  施工時は硬く、冬場は割れやすいため、施工には熟練の技術（暖めながら貼る等）が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【籐（とう）・ココヤシ・サイザル（天然繊維床）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「脱衣所（水回り）」の王様</h4>
                
                <p className="mb-1 text-xs ml-3">
                  銭湯の脱衣所でよく見る、籐（ラタン）を編んだ床材（籐むしろ・籐タイル）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  機能: 表面に凹凸があるため、濡れた足で歩いてもベタつかず、足触りがサラッとしている。吸湿・放湿性に優れ、風呂上がりの快適さは他の床材では代えがたい。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「本物」か「塩ビ製」か</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>天然籐</strong>: 風合いは最高だが、経年でささくれが出たり、黒ずんだりする。こまめな換気が必要。</li>
                  <li><span className="mr-1">・</span><strong>塩ビ製（ボロン等）</strong>: 籐やサイザル麻のように編み込んだビニル床材。水に強く腐らないため、メンテナンス重視のホテルやスパではこちらが主流。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">サイザル麻・ココヤシの「ざっくり感」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  麻やヤシの繊維を織った床材。カーペットより硬く、チクチクした感触があるが、土足でも使えるほど頑丈。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  通気性が良く、モダンなインテリアや店舗の床として根強い人気がある。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【土間（どま）・モルタル仕上げ】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">室内土間の「蓄熱（ちくねつ）」効果</h4>
                
                <p className="mb-1 text-xs ml-3">
                  玄関だけでなく、リビングの一部をモルタル仕上げにする「通り土間」スタイルが人気。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  機能: コンクリートは熱を蓄えるため、冬場に直射日光を当てると夜まで暖かく（ダイレクトゲイン）、夏場はひんやりする。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">必ず起きる「クラック」と「防塵塗装」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  モルタル床は乾燥収縮で必ずヘアクラックが入る。これを許容できない場合は採用してはいけない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  そのままではコンクリートの粉（塵）が出るため、表面に<strong>「防塵クリア塗装（浸透性強化剤）」</strong>を塗布して、粉立ちを防ぐ処理が必須。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
                <img src="/image/掲載募集中a.png" alt="掲載企業様募集中" className="w-30 mb-1 w-[clamp(300x,5vw,120px)]" onError={handleImageError} />
                <div className="font-bold text-sm mb-2">□□□</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="#" target="_blank" className="bg-gray-200 text-black text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">商品ページ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">カタログ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">営業所</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">お問い合わせ</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded hover:bg-gray-700 hover:text-white transition">サンプル</a>
                  <a href="#" className="bg-gray-200 text-center py-1 rounded text-[10px] hover:bg-gray-700 hover:text-white transition">CADDOWNLOAD</a>
                </div>
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="flex items-center mt-2 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">床下地材</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・城東テクノ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.joto.com/product/floor-insulation/', '商品ページ')}｜
                {renderLink('https://www.joto.com/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.joto.com/company/office/', '営業所')}｜
                {renderLink('https://www.joto.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・ジャパン建材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.japan-kenzai.co.jp/product/floor/', '商品ページ')}｜
                {renderLink('https://www.japan-kenzai.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.japan-kenzai.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.japan-kenzai.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">接着剤</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アイカ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.aica.co.jp/products/chemical/adhesive/floor/', '商品ページ')}｜
                {renderLink('https://www.aica.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.aica.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.aica.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東リ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toli.co.jp/product/adhesive/', '商品ページ')}｜
                {renderLink('https://www.toli.co.jp/digital_catalog/adhesive_index.html', 'カタログ')}｜
                {renderLink('https://www.toli.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.toli.co.jp/member/faq', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セメダイン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.cemedine.co.jp/product/category/floor-adhesive/', '商品ページ')}｜
                {renderLink('https://www.cemedine.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.cemedine.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.cemedine.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">フロアコーティング</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本プロテクト</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nihon-protect.co.jp/service/floor-coating/', '商品ページ')}｜
                {renderLink('https://www.nihon-protect.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.nihon-protect.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.nihon-protect.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ウレタン工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.urethane-kogyo.co.jp/products/floor-coating/', '商品ページ')}｜
                {renderLink('https://www.urethane-kogyo.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.urethane-kogyo.co.jp/company/', '営業所')}｜
                {renderLink('https://www.urethane-kogyo.co.jp/contact/', 'お問い合わせ')}｜
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

export default InternalFloorContent; 