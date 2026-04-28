'use client';

import React, { useState } from 'react';

interface ExteriorOtherContentProps {
  subcategory: string;
}

const ExteriorOtherContent: React.FC<ExteriorOtherContentProps> = ({ subcategory }) => {
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
    const target = e.target as HTMLImageElement;
    target.src = "/image/掲載募集中a.png";
  };

  const handleCommercialImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = "/image/掲載募集中a.png";
  };

  const renderContent = () => {
    switch (subcategory) {
      case '笠木水切':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">笠木・水切</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【笠木（かさぎ）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">雨漏り多発地帯としての「パラペット」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  陸屋根やバルコニーの手すり壁（パラペット）の天端（てんば）を覆う部材。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  リスク: 屋根以上に過酷な環境（紫外線・雨・熱）に晒されるため、最も雨漏りが起きやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  「脳天打ち（上から釘やビスを打つこと）」は厳禁。必ず側面や裏側で固定する工法であることを確認する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">シーリングに頼らない「オープンジョイント工法」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  笠木の継ぎ目（ジョイント）をシーリングで埋めてしまうと、劣化して切れた瞬間に漏水する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  推奨: 継ぎ目に隙間を空け、下に「捨て板（樋）」を入れて排水する<strong>「オープンジョイント工法」</strong>を採用しているメーカー製品を選ぶのが、長期的な安心につながる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「アルミ形材（かたざい）」と「板金曲げ」の差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>アルミ形材</strong>: 金型から押し出して作る。複雑な防水形状を作れるため、水密性が高く、歪みも出にくい。ビルの標準。</li>
                  <li><span className="mr-1">・</span><strong>板金曲げ</strong>: ガルバリウム鋼板などを曲げて作る。安価だが、単純な形状しか作れないため防水性は劣る。住宅レベルでも、予算が許せばアルミ形材が推奨される。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">壁を腐らせない「通気（つうき）」機能</h4>
                
                <p className="mb-1 text-xs ml-3">
                  笠木で蓋をしてしまうと、壁の中の湿気が逃げ場を失い、構造材（木や鉄骨）を腐らせる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  壁体内の空気を外部に逃がす<strong>「通気ライナー（通気層）」</strong>などの部材がセットになっている製品選定が必須。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【水切り（みずきり）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「雨垂れ（あまだれ）」汚染を防ぐ形状</h4>
                
                <p className="mb-1 text-xs ml-3">
                  窓下や基礎の上に取り付け、雨水を壁から離して落とす部材。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 先端が鋭角に折り返されている<strong>「水返し（みずがえし）」</strong>が付いていないと、表面張力で水が裏側に回り込み、壁に真っ黒な雨筋汚れを作る。ただのL字型の板金では意味がない。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「土台水切り」とシロアリ・通気</h4>
                
                <p className="mb-1 text-xs ml-3">
                  基礎と外壁の間に設置する水切り。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  単に水を切るだけでなく、床下の換気を確保しつつ、ネズミや虫の侵入を防ぐ「防鼠（ぼうそ）機能」と、外壁の通気層へ空気を送り込む「吸気口」の役割も兼ねている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「アルミ」か「ガルバ」か</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>アルミ製</strong>: 質感が高く、絶対に赤錆が出ない。コーナーパーツ（役物）が充実しており、角の納まりが美しい。</li>
                  <li><span className="mr-1">・</span><strong>ガルバ製</strong>: 安価で現場加工しやすいが、切断面から錆びやすい。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  外壁の下端（地面に近い部分）は泥はね等で汚れやすいため、耐久性の高いアルミ製を選ぶメリットは大きい。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">サッシ下の「伝い水防止水切り」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  窓の両端から垂れる黒い汚れ（シリコンオイル汚染や埃）を防ぐための後付け部材。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  塗り壁や白いサイディングの場合、これの有無で5年後の建物の美観（汚れ方）に雲泥の差が出る。
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
              <span className="w-[180px]">・エスビック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.s-bic.co.jp/product_category/block_accessory/', '商品ページ')}｜
                {renderLink('https://www.catalabo.org/catalog/search/keyword?kw=%E3%82%A8%E3%82%B9%E3%83%93%E3%83%83%E3%82%AF', 'カタログ')}｜
                {renderLink('https://www.s-bic.co.jp/office-factory/', '営業所')}｜
                {renderLink('https://www.s-bic.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ABC商会</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.abc-t.co.jp/products/material/fitting/kasagi/', '商品ページ')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/catalog_list', 'カタログ')}｜
                {renderLink('https://www.abc-t.co.jp/company/establishments.html', '営業所')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/select', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・理研軽金属工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.rikenkeikinzoku.co.jp/building/aluminum-coping/index.html', '商品ページ')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/catalog/index.html', 'カタログ')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/company/info/', '営業所')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/company/inquiry/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・城東テクノ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.joto.com/product/gaiso/flashing/', '商品ページ')}｜
                {renderLink('https://www.joto.com/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.joto.com/company/office_locations/', '営業所')}｜
                {renderLink('https://www.joto.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・久米工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kume-ind.co.jp/products', '商品ページ')}｜
                {renderLink('https://www.kume-ind.co.jp/products-search/catalog', 'カタログ')}｜
                {renderLink('https://www.kume-ind.co.jp/branches', '営業所')}｜
                {renderLink('https://www.kume-ind.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三洋工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sanyo-industries.co.jp/products/aluminum/topline/', '商品ページ')}｜
                {renderLink('https://www.catalabo.org/catalog/search/maker/off/17489940000', 'カタログ')}｜
                {renderLink('https://www.sanyo-industries.co.jp/company/location.html', '営業所')}｜
                {renderLink('https://www.sanyo-industries.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アーキヤマデ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.a-yamade.co.jp/products/paratop/', '商品ページ')}｜
                {renderLink('https://www.a-yamade.co.jp/data/catalog/catalog_stand/', 'カタログ')}｜
                {renderLink('https://www.a-yamade.co.jp/company/group/', '営業所')}｜
                {renderLink('https://www.a-yamade.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・井上商事</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.inoue-s.co.jp/products/cat/al_kiri/', '商品ページ')}｜
                {renderLink('https://www.inoue-s.co.jp/cad/catalog/', 'カタログ')}｜
                {renderLink('https://www.inoue-s.co.jp/contents/company/office.html', '営業所')}｜
                {renderLink('https://www.inoue-s.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ツヅキ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://tuzuki.co.jp/products/', '商品ページ')}｜
                {renderLink('https://tuzuki.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://tuzuki.co.jp/company/branch/', '営業所')}｜
                {renderLink('https://tuzuki.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・白水興産</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://hakusui-k.co.jp/products/', '商品ページ')}｜
                {renderLink('https://hakusui-k.co.jp/download/#catalog', 'カタログ')}｜
                {renderLink('https://hakusui-k.co.jp/company/about/', '営業所')}｜
                {renderLink('https://hakusui-k.co.jp/contact-us/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・サンレール</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sunrail.co.jp/product_category/alumikasagi/kasagi', '商品ページ')}｜
                {renderLink('https://www.sunrail.co.jp/catalogs', 'カタログ')}｜
                {renderLink('https://www.sunrail.co.jp/office', '営業所')}｜
                {renderLink('https://www.sunrail.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三昌</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sunsyo.co.jp/product/sun-edge/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.sunsyo.co.jp/profile/', '営業所')}｜
                {renderLink('https://www.sunsyo.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・スワン商事</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.swan-group.co.jp/product/line.php', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.swan-group.co.jp/company/', '営業所')}｜
                {renderLink('https://www.swan-group.co.jp/company/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ビニフレーム工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.vinyframe.co.jp/aim/building/lightcoping.html', '商品ページ')}｜
                {renderLink('https://www.vinyframe.co.jp/dl_catalog/index.html', 'カタログ')}｜
                {renderLink('https://www.vinyframe.co.jp/company/net.html', '営業所')}｜
                {renderLink('https://www.vinyframe.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・タイセイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.expantay.co.jp/product/alumiangle/', '商品ページ')}｜
                {renderLink('https://www.expantay.co.jp/download/#dl01', 'カタログ')}｜
                {renderLink('https://www.expantay.co.jp/company/access/', '営業所')}｜
                {renderLink('https://www.expantay.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );
      case '庇オーニング':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">庇・オーニング</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【庇（ひさし）・キャノピー】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「先付け（さきづけ）」と「後付け（あとづけ）」の防水差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>先付け</strong>: 外壁を仕上げる前に躯体に取り付ける。防水シートを庇の立ち上がりに被せるため、雨漏りリスクが極めて低い。新築の標準。</li>
                  <li><span className="mr-1">・</span><strong>後付け</strong>: 外壁が仕上がった後にビスとシーリングで取り付ける。施工は簡単だが、シーリングが切れると壁内に水が入るリスクがある。リフォーム用。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">アルミ庇の「熱橋（ヒートブリッジ）」結露</h4>
                
                <p className="mb-1 text-xs ml-3">
                  アルミは熱を伝えやすいため、冬場に外の冷気をそのまま室内の構造体（鉄骨やボルト）に伝えてしまい、壁の中で結露を起こすことがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 庇の付け根部分に断熱材を挟み込んだ<strong>「断熱ブラケット」</strong>等の熱橋対策製品を採用することが、高断熱住宅では必須。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「出幅（ではば）」と日射遮蔽の計算</h4>
                
                <p className="mb-1 text-xs ml-3">
                  庇の役割は雨よけだけでなく、夏の日差しを遮り、冬の日差しを取り込むこと（パッシブデザイン）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  目安: 一般的に、窓の高さの約0.3倍〜0.4倍の出幅があると、南面の夏の日差しを効果的にカットできる。デザインだけで小さくしすぎると、省エネ効果が得られない。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">静音性と「制振材（せいしんざい）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  薄い金属板の庇は、雨が当たると「バラバラ」という大きな音がして、室内で不快に感じることがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  内部にウレタンが充填されていたり、裏面に制振シートが貼られた<strong>「静音タイプ」</strong>を選定しないと、寝室の上などでクレームになりやすい。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ガラス庇の「汚れ」と「割れ」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  スタイリッシュなガラス庇は人気だが、上面に埃や鳥の糞が溜まると下から丸見えになるため、こまめな清掃が必要。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  積雪や落下物に耐えられるよう、必ず<strong>「合わせガラス（割れても落ちない）」</strong>仕様であることを確認する。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【オーニング（可動式テント）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">カーテンの10倍の「遮熱（しゃねつ）」効果</h4>
                
                <p className="mb-1 text-xs ml-3">
                  部屋の中でカーテンを閉めるより、窓の外（オーニング）で日差しを遮る方が、熱の侵入を約10倍防げる（日射侵入率が劇的に下がる）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  エアコン効率を上げるための「機能性建材」としての提案が有効。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">最大の弱点「耐風速」とセンサー</h4>
                
                <p className="mb-1 text-xs ml-3">
                  オーニングは風に弱く、強風時に広げたままだとアームが折れたり、壁ごと壊れたりする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  推奨: 電動タイプを選び、風で揺れると自動的に収納される<strong>「風力センサー（振動センサー）」</strong>を付けるのが、破損事故を防ぐための標準的なリスク管理。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">キャンバス（生地）の素材選び</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ポリエステル（PVCコート）</strong>: ツルッとしていて汚れが付きにくく、完全防水。店舗などで多いが、少しビニールっぽい質感。</li>
                  <li><span className="mr-1">・</span><strong>アクリル（再生繊維）</strong>: 布のような織り目の風合いがあり、高級感がある。通気性があるため熱がこもりにくいが、撥水性（防水ではない）となる。住宅ではこちらが人気。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「下地（したじ）」の強度確認</h4>
                
                <p className="mb-1 text-xs ml-3">
                  オーニングのアームには強力なバネが入っており、常に壁を引っ張る力がかかっている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  サイディングなどの外壁材にビスを打つだけでは持たない。必ず柱や梁、専用の補強下地がある場所に固定しないと、強風時に脱落する危険がある。
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

            <div className="flex items-center mt-1 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">庇（アルミ）</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/business/ext/search/?t=housing&c=13', '商品ページ')}｜
                {renderLink('https://webcatalog.ykkap.co.jp/iportal/CatalogSearch.do?method=catalogSearchByAnyCategories&volumeID=YKKAPDC1&categoryID=4146550000&sortKey=CatalogMain2210000&sortOrder=ASC&designID=pro', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/business/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/business/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ダイケン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiken.ne.jp/products/exterior.html/#products01', '商品ページ')}｜
                {renderLink('https://pro.daiken.ne.jp/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=DAI00011&designID=DAID01', 'カタログ')}｜
                {renderLink('https://www.daiken.ne.jp/profile/officelist.html', '営業所')}｜
                {renderLink('https://www.daiken.ne.jp/question', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・理研軽金属工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.rikenkeikinzoku.co.jp/building/aluminum-eaves/', '商品ページ')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/catalog/index.html', 'カタログ')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/company/info/', '営業所')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/company/inquiry/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・井上商事</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.inoue-s.co.jp/products/cat/al_hisasi/', '商品ページ')}｜
                {renderLink('https://www.inoue-s.co.jp/cad/catalog/', 'カタログ')}｜
                {renderLink('https://www.inoue-s.co.jp/contents/company/office.html', '営業所')}｜
                {renderLink('https://www.inoue-s.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アルフィン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.alfin.co.jp/products/index_series.html', '商品ページ')}｜
                {renderLink('https://www.alfin.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.alfin.co.jp/about/', '営業所')}｜
                {renderLink('https://www.alfin.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ツヅキ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://tuzuki.co.jp/products/#gd', '商品ページ')}｜
                {renderLink('https://tuzuki.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://tuzuki.co.jp/company/branch/', '営業所')}｜
                {renderLink('https://tuzuki.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ヒガノ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://higano.co.jp/products/eaves/', '商品ページ')}｜
                {renderLink('https://higano.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://higano.co.jp/company/', '営業所')}｜
                {renderLink('https://higano.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・有限会社岩井工業所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.iwaikougyousyo.com/', '商品ページ')}｜
                {renderLink('https://www.iwaikougyousyo.com/pages/82/', 'カタログ')}｜
                {renderLink('https://www.iwaikougyousyo.com/pages/81/', '営業所')}｜
                {renderLink('https://www.iwaikougyousyo.com/pages/3/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ダイケン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiken.ne.jp/products/exterior.html', '商品ページ')}｜
                {renderLink('https://pro.daiken.ne.jp/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=DAI00011&designID=DAID01', 'カタログ')}｜
                {renderLink('https://www.daiken.ne.jp/profile/officelist.html', '営業所')}｜
                {renderLink('https://www.daiken.ne.jp/question', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・フジカケ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fjp-ahp.jp/products/', '商品ページ')}｜
                {renderLink('https://www.fjp-ahp.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.fjp-ahp.jp/company/', '営業所')}｜
                {renderLink('https://www.fjp-ahp.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸豊建硝</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.maruhou-k.com/product06.html', '商品ページ')}｜
                {renderLink('http://www.maruhou-k.com/catalog.html', 'カタログ')}｜
                {renderLink('http://www.maruhou-k.com/company.html', '営業所')}｜
                {renderLink('http://www.maruhou-k.com/inquiry.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ユニエース</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://yuniace.com/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://yuniace.com/company/', '営業所')}｜
                {renderLink('https://yuniace.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アート技研工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.artgiken.co.jp/index.php', '商品ページ')}｜
                {renderLink('https://www.artgiken.co.jp/download/index.php', 'カタログ')}｜
                {renderLink('https://www.artgiken.co.jp/company/index.php', '営業所')}｜
                {renderLink('https://www.artgiken.co.jp/contact/index.php', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日軽エンジニアリング</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://sne.co.jp/products/sst37.html', '商品ページ')}｜
                {renderLink('https://sne.co.jp/cataloglist.html', 'カタログ')}｜
                {renderLink('https://sne.co.jp/company/map.html', '営業所')}｜
                {renderLink('https://sne.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・田中金属</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tanakametal.co.jp/products/visorrail/', '商品ページ')}｜
                {renderLink('https://www.tanakametal.co.jp/catalog/visorrail/', 'カタログ')}｜
                {renderLink('https://www.tanakametal.co.jp/about/overview/', '営業所')}｜
                {renderLink('https://www.tanakametal.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">庇（ガラス）</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アルフィン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.alfin.co.jp/products/index_series.html', '商品ページ')}｜
                {renderLink('https://www.alfin.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.alfin.co.jp/about/', '営業所')}｜
                {renderLink('https://www.alfin.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・デバイス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.device-inc.com/about/product/kitorra/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.device-inc.com/information/', '営業所')}｜
                {renderLink('https://www.device-inc.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・白水興産</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://hakusui-k.co.jp/products/', '商品ページ')}｜
                {renderLink('https://hakusui-k.co.jp/download/#catalog', 'カタログ')}｜
                {renderLink('https://hakusui-k.co.jp/company/about/', '営業所')}｜
                {renderLink('https://hakusui-k.co.jp/contact-us/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸豊建硝</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.maruhou-k.com/product06.html', '商品ページ')}｜
                {renderLink('http://www.maruhou-k.com/catalog.html', 'カタログ')}｜
                {renderLink('http://www.maruhou-k.com/company.html', '営業所')}｜
                {renderLink('http://www.maruhou-k.com/inquiry.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アート技研工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.artgiken.co.jp/index.php', '商品ページ')}｜
                {renderLink('https://www.artgiken.co.jp/download/index.php', 'カタログ')}｜
                {renderLink('https://www.artgiken.co.jp/company/index.php', '営業所')}｜
                {renderLink('https://www.artgiken.co.jp/contact/index.php', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アートホクストン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://arthawkstone.com/products_category/wia_eaves/', '商品ページ')}｜
                {renderLink('https://arthawkstone.com/web_catalog/top.html', 'カタログ')}｜
                {renderLink('https://arthawkstone.com/office/', '営業所')}｜
                {renderLink('https://arthawkstone.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">オーニング</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・タカノ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.takano-net.co.jp/portal/field/exterior/', '商品ページ')}｜
                {renderLink('https://www.takano-net.co.jp/exterior/support/download_catalog/', 'カタログ')}｜
                {renderLink('https://www.takano-net.co.jp/exterior/exhibit/', '営業所')}｜
                {renderLink('https://www.takano-net.co.jp/exterior/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/consumer/products/exterior/parasorea', '商品ページ')}｜
                {renderLink('https://webcatalog.ykkap.co.jp/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=YKKAPDC1&catalogId=12357820000&pageGroupId=218&designID=pro&catalogCategoryId=', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/business/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/business/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・協和興業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.kyowa-kkk.co.jp/product/awning/index.htm', '商品ページ')}｜
                {renderLink('http://www.kyowa-kkk.co.jp/support/index.htm', 'カタログ')}｜
                {renderLink('http://www.kyowa-kkk.co.jp/company/com_200.htm', '営業所')}｜
                {renderLink('http://www.kyowa-kkk.co.jp/inq/index.htm', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ナビオ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.e-navio.com/awning.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.e-navio.com/company.html', '営業所')}｜
                {renderLink('https://www.e-navio.com/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・有限会社小沢テント</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.ozawatent.co.jp/product.html#awning', '商品ページ')}｜
                {renderLink('http://www.ozawatent.co.jp/company.html', 'カタログ')}｜
                {renderLink('http://www.ozawatent.co.jp/company.html', '営業所')}｜
                {renderLink('#', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・サラシナ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://sarashina.co.jp/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://sarashina.co.jp/company/', '営業所')}｜
                {renderLink('https://sarashina.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・笑和</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.awningkyushu.co.jp/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('http://www.awningkyushu.co.jp/message_company.html', '営業所')}｜
                {renderLink('http://www.awningkyushu.co.jp/message_company.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大一帆布</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.dihp.co.jp/products/tent', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.dihp.co.jp/company/message.html', '営業所')}｜
                {renderLink('https://www.dihp.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸八テント商会</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://08tent.co.jp/products/hiyoke/awning/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://08tent.co.jp/company/#profile', '営業所')}｜
                {renderLink('https://08tent.co.jp/contact_us/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

             <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・BXテンパル</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tenpal.co.jp/awning.html', '商品ページ')}｜
                {renderLink('https://tenpal-catalogs-leaflets.actibookone.com/', 'カタログ')}｜
                {renderLink('https://www.tenpal.co.jp/company/access.html', '営業所')}｜
                {renderLink('https://www.tenpal.co.jp/inquiry_v2.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );
      case '雨どい':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">雨どい</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【雨どい（軒樋・竪樋）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「塩ビ」と「アイアン（芯材入り）」の決定的な差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>一般塩ビ</strong>: 安価だが、紫外線で劣化しやすく、雪の重みや熱伸縮で「たわみ・割れ」が発生しやすい。</li>
                  <li><span className="mr-1">・</span><strong>高耐久（芯材入り）</strong>: 塩ビの中に<strong>「スチール芯（鉄板）」</strong>を埋め込んだ製品（パナソニック「アイアン」等）。強度と耐久性が段違いに高く、現在の長期優良住宅などの標準スペック。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「半月（はんげつ）」から「角樋（かくどい）」へのシフト</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔ながらの「半月型（丸い樋）」は、水量がキャパオーバーしやすく、見た目も古臭くなりやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  主流: 現代住宅では、貯水量が大きく、軒先（破風板）のラインと一体化してスタイリッシュに見える<strong>「角型（箱型）」</strong>が主流になっている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">最強の意匠性「アルミ・ガルバリウム雨どい」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  既製品の継ぎ目が気になる場合、現場でコイル材を成形して作る<strong>「シームレス（継ぎ目なし）雨どい」</strong>を採用する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 継ぎ目がないため漏水リスクがなく、金属の質感が非常に高い。建築家住宅などで好まれる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">雪国・台風地域の「支持金具ピッチ」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  雨どいの強度は、本体だけでなく、それを支える金具の間隔（ピッチ）で決まる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  一般地域では900mm〜1000mm間隔だが、積雪地や強風地域では<strong>600mm以下（または300mm）</strong>に狭めて強度を確保する設計が必須。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  樹脂製の吊り具（ポリカ）より、ステンレス等の金属製金具の方が長期的信頼性は高い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">熱伸縮を逃がす「エキスパンションジョイント」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  雨どい（特に金属製や濃い色の樹脂製）は、夏と冬の温度差で数センチ伸縮する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  軒の長さが長い場合、伸縮を吸収する継手<strong>「伸縮ジョイント」</strong>を入れないと、突っ張って変形したり、破損したり、「バキッ」という異音の原因になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">落ち葉詰まりを防ぐ「防葉（ぼうよう）ネット」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  近くに高い木がある場合、落ち葉で樋が詰まり、雨水がオーバーフローして外壁を汚したり腐らせたりする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  新築時に<strong>「落ち葉よけネット」</strong>を設置しておくことで、高所作業となる掃除のリスクとコストを回避できる。
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

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・パナソニック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www2.panasonic.biz/sumai/exterior/gutters/', '商品ページ')}｜
                {renderLink('https://www2.panasonic.biz/sumai/exterior/gutters/catalog.html', 'カタログ')}｜
                {renderLink('https://www2.panasonic.biz/sumai/exterior/gutters/showroom.html', '営業所')}｜
                {renderLink('https://www2.panasonic.biz/sumai/exterior/gutters/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・積水化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sekisui.co.jp/products/exterior/gutters/', '商品ページ')}｜
                {renderLink('https://www.sekisui.co.jp/products/exterior/gutters/catalog/', 'カタログ')}｜
                {renderLink('https://www.sekisui.co.jp/company/offices/', '営業所')}｜
                {renderLink('https://www.sekisui.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・タキロンシーアイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.takiron-ci.co.jp/product/suidou/amadoi/', '商品ページ')}｜
                {renderLink('https://www.takiron-ci.co.jp/product/suidou/amadoi/catalog/', 'カタログ')}｜
                {renderLink('https://www.takiron-ci.co.jp/company/network/', '営業所')}｜
                {renderLink('https://www.takiron-ci.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・新日軽</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.shin-nikkei.co.jp/products/amadoi/', '商品ページ')}｜
                {renderLink('https://www.shin-nikkei.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.shin-nikkei.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.shin-nikkei.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・竹中製作所</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.takenaka-ss.co.jp/product/amadoi/', '商品ページ')}｜
                {renderLink('https://www.takenaka-ss.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.takenaka-ss.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.takenaka-ss.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・シクロケム</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.cyclochem.co.jp/product/amadoi/', '商品ページ')}｜
                {renderLink('https://www.cyclochem.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.cyclochem.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.cyclochem.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ファンケル</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fancl.co.jp/exterior/amadoi/', '商品ページ')}｜
                {renderLink('https://www.fancl.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.fancl.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.fancl.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本雨どい工業協会</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.amadoi.or.jp/', '商品ページ')}｜
                {renderLink('https://www.amadoi.or.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.amadoi.or.jp/members/', '営業所')}｜
                {renderLink('https://www.amadoi.or.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・プラスワン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.plusone-gutter.co.jp/', '商品ページ')}｜
                {renderLink('https://www.plusone-gutter.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.plusone-gutter.co.jp/company/', '営業所')}｜
                {renderLink('https://www.plusone-gutter.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸一鋼管</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.maruichi-kokan.co.jp/amadoi/', '商品ページ')}｜
                {renderLink('https://www.maruichi-kokan.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.maruichi-kokan.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.maruichi-kokan.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );
      case 'ハト小屋':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">ハト小屋</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【ハト小屋（鳩小屋）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「雨仕舞（あまじまい）」の最終防衛ライン</h4>
                
                <p className="mb-1 text-xs ml-3">
                  屋上防水層に直接パイプを通してシーリング処理するだけでは、経年劣化で必ず雨漏りする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  機能: 配管の立ち上がり部分をコンクリートの箱（ハト小屋）で覆い、防水の立ち上がりを確保することで、最もリスクの高い<strong>「配管貫通部の雨漏り」</strong>を物理的に防ぐための必須設備。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「横抜き」の原則</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ハト小屋を設置しても、天端（上）から配管を出すと、そこから雨が入るリスクが残る。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  鉄則: 配管はハト小屋の<strong>「側面（壁）」</strong>から出し、雨水が入りにくいように下向きに曲げるか、シーリング処理を徹底するのが標準的な納まり。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">防水巻き上げ高さの確保</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ハト小屋の足元は、屋上の防水層を巻き上げて施工する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  この立ち上がり高さ（あご）が低いと、集中豪雨で屋上がプール状になった際に水没して漏水する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  基準: 最低でも床面から250mm〜300mm以上の高さを確保して防水を巻き上げるのが設計の基本。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「既製品（プレキャスト）」の採用メリット</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔は現場で型枠を組んでコンクリートを打っていたが、手間がかかり、品質（ジャンカ等）のばらつきもあった。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現在: 工場生産された<strong>「PCハト小屋（プレキャストコンクリート）」や、軽量な「成形板ハト小屋（ケイカル板ベース等）」</strong>を設置するだけの工法が主流。工期短縮と品質安定に貢献する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">点検口の設置</h4>
                
                <p className="mb-1 text-xs ml-3">
                  将来の配管メンテナンスや、内部の漏水確認のため、ハト小屋には必ず<strong>「点検口（ステンレス製ドア等）」</strong>を設ける必要がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  これを忘れると、配管トラブルの際にハト小屋を破壊しなければならなくなる。
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

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/business/ext/search/?t=building&c=30', '商品ページ')}｜
                {renderLink('https://webcatalog.ykkap.co.jp/iportal/CatalogSearch.do?method=catalogSearchByAnyCategories&volumeID=YKKAPDC1&categoryID=4146550000&sortKey=CatalogMain2210000&sortOrder=ASC&designID=pro', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/business/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/business/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アトリエテクニカ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ateliertekhnika.com/products/pigeon-house/', '商品ページ')}｜
                {renderLink('https://www.ateliertekhnika.com/catalog/', 'カタログ')}｜
                {renderLink('https://www.ateliertekhnika.com/company/', '営業所')}｜
                {renderLink('https://www.ateliertekhnika.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・フジタ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fujita.co.jp/products/pigeon-house/', '商品ページ')}｜
                {renderLink('https://www.fujita.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.fujita.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.fujita.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・マルトク</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.marutoku.co.jp/pigeon-house/', '商品ページ')}｜
                {renderLink('https://www.marutoku.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.marutoku.co.jp/company/', '営業所')}｜
                {renderLink('https://www.marutoku.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・建築資材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kenchiku-shizai.co.jp/pigeon/', '商品ページ')}｜
                {renderLink('https://www.kenchiku-shizai.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.kenchiku-shizai.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.kenchiku-shizai.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );
      case '太陽光パネル':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">太陽光パネル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【太陽光パネルの設置と屋根】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">雨漏りリスクゼロの「キャッチ工法（掴み金物）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  従来は屋根にドリルで穴を開けて架台を固定していたため、施工不良による雨漏りリスクが常につきまとっていた。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現在の主流: 金属屋根（立平葺きや折板）のハゼ（突起）を金物で挟み込んで固定する<strong>「キャッチ工法」</strong>なら、屋根に一切穴を開けずに設置できるため、漏水リスクが物理的にゼロになる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「屋根一体型」のメリット・デメリット</h4>
                
                <p className="mb-1 text-xs ml-3">
                  屋根材そのものが発電する、または屋根材の代わりにパネルを敷き詰めるタイプ。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>メリット</strong>: 屋根材のコストが浮き、見た目がスマートでデザイン性が高い。</li>
                  <li><span className="mr-1">・</span><strong>デメリット</strong>: パネルの裏側に熱がこもりやすく発電効率が落ちる。また、将来パネルを交換・撤去する際に、屋根ごとの工事（雨仕舞のやり直し）が必要になり、メンテナンスコストが跳ね上がる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「単結晶（たんけっしょう）」と「多結晶」の見た目</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>単結晶</strong>: 現在の主流。色は黒に近く、均一で見た目が良い。発電効率が高い。</li>
                  <li><span className="mr-1">・</span><strong>多結晶</strong>: 青っぽく、キラキラした結晶模様が見える。コストは安いが効率は劣る。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  意匠性を重視する住宅では、屋根に馴染む「単結晶（ブラック）」を選ぶのが基本。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「パワコン」の寿命と交換コスト</h4>
                
                <p className="mb-1 text-xs ml-3">
                  パネル自体は20〜30年持つが、電気を変換する<strong>「パワーコンディショナー（パワコン）」</strong>は精密機械であり、寿命は10〜15年。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 導入時に「パネルは一生モノ」と誤解しがちだが、必ずパワコンの交換費用（十数万円〜）を将来の修繕計画に入れておく必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">影の影響と「CIS（化合物系）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  通常の結晶シリコン系パネルは、電柱や落ち葉の影が一部に落ちただけで、回路全体の発電量がガクンと落ちる特性がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  CIS（ソーラーフロンティア等）: 影に強く、影の部分以外は発電を続ける特性がある。影がかかりやすい立地ではこちらが有利な場合がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「耐震性」への影響</h4>
                
                <p className="mb-1 text-xs ml-3">
                  パネルと架台で数百キロの重量が屋根に乗る。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重い瓦屋根に載せると耐震性が下がるが、軽い金属屋根であれば、パネルを載せてもトータル重量は瓦より軽いため、<strong>「金属屋根＋太陽光」</strong>は耐震リフォームの黄金セットと呼ばれる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">塩害地域の「設置不可」エリア</h4>
                
                <p className="mb-1 text-xs ml-3">
                  海岸から500m以内などの重塩害地域では、フレームや架台が錆びるため、メーカー保証が出ず設置できない（または塩害対応専用品が必要）ケースが多い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  計画地が保証対象エリア内かどうかの事前確認が必須。
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

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・シャープ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://jp.sharp/sunvista/lineup/', '商品ページ')}｜
                {renderLink('https://jp.sharp/sunvista/catalog/', 'カタログ')}｜
                {renderLink('https://jp.sharp/corporate/info/offices/', '営業所')}｜
                {renderLink('https://jp.sharp/sunvista/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・パナソニック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www2.panasonic.biz/jp/solar/lineup/', '商品ページ')}｜
                {renderLink('https://www2.panasonic.biz/jp/solar/catalog/', 'カタログ')}｜
                {renderLink('https://www2.panasonic.biz/jp/solar/showroom/', '営業所')}｜
                {renderLink('https://www2.panasonic.biz/jp/solar/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・京セラ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kyocera.co.jp/solar/lineup/', '商品ページ')}｜
                {renderLink('https://www.kyocera.co.jp/solar/catalog/', 'カタログ')}｜
                {renderLink('https://www.kyocera.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.kyocera.co.jp/solar/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三菱電機</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.mitsubishielectric.co.jp/service/taiyo/lineup/', '商品ページ')}｜
                {renderLink('https://www.mitsubishielectric.co.jp/service/taiyo/catalog/', 'カタログ')}｜
                {renderLink('https://www.mitsubishielectric.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.mitsubishielectric.co.jp/service/taiyo/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東芝エネルギーシステムズ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toshiba-energy.com/renewable-energy/solar-pv/lineup.htm', '商品ページ')}｜
                {renderLink('https://www.toshiba-energy.com/renewable-energy/solar-pv/catalog.htm', 'カタログ')}｜
                {renderLink('https://www.toshiba-energy.com/company/office.htm', '営業所')}｜
                {renderLink('https://www.toshiba-energy.com/renewable-energy/solar-pv/contact.htm', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ソーラーフロンティア</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.solar-frontier.com/jpn/residential/lineup/', '商品ページ')}｜
                {renderLink('https://www.solar-frontier.com/jpn/residential/catalog/', 'カタログ')}｜
                {renderLink('https://www.solar-frontier.com/jpn/company/office/', '営業所')}｜
                {renderLink('https://www.solar-frontier.com/jpn/residential/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );
      case '手摺':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">手摺</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【手摺（ハンドレール・ガードレール）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「足掛かり（あしがかり）」と転落防止</h4>
                
                <p className="mb-1 text-xs ml-3">
                  小さな子供がいる住宅やマンションでは、手摺のデザインが命に関わる。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  鉄則: 横桟（よこざん）のデザインは、子供がハシゴのように登ってしまう「足掛かり」になるため、ベランダ等では原則NG。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  推奨: 足を掛けられない<strong>「縦格子（たてごうし）」</strong>にするか、登れない高さ（床から1.1m以上）までガラスやパネルで塞ぐ仕様が安全基準の基本。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「合わせガラス」の義務化トレンド</h4>
                
                <p className="mb-1 text-xs ml-3">
                  眺望を重視したガラス手摺が増えているが、単なる強化ガラスは割れると粉々になって脱落し、転落事故につながる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現在の標準: 割れても中間膜が粘って落ちない<strong>「合わせガラス」</strong>の使用が、公共建築だけでなく民間マンションでも標準化しつつある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">アルミとスチール（鉄）の使い分け</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>アルミ形材</strong>: 錆びない、軽い、製品精度が高い。現在の主流。</li>
                  <li><span className="mr-1">・</span><strong>スチール（フラットバー等）</strong>: 非常に細くシャープなデザインが可能で、建築家住宅で人気。ただし、溶融亜鉛メッキやフッ素塗装を施しても、長期的には錆びのリスクが避けられないため、定期的な塗装が必要。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">防水の弱点「笠木（かさぎ）固定」のリスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ベランダの手すり壁（パラペット）の天端（上）に手摺の支柱を固定する工法は、ビス穴から雨水が侵入し、下の階への雨漏り原因No.1となっている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 天端ではなく、壁の内側や外側に固定する<strong>「側面付け」</strong>を選ぶか、笠木と手摺が一体化して防水性能が担保されたメーカー製品を選ぶことが重要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「BL認定品」の安心感</h4>
                
                <p className="mb-1 text-xs ml-3">
                  公共住宅やマンションで採用される、ベターリビング財団の認定を受けた製品。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 強度テストや耐久性試験をクリアしており、瑕疵保証も手厚い。「優良住宅部品」としての信頼性が高いため、長期的な安全性を重視するならBL認定品から選ぶのが近道。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「電食（でんしょく）」絶縁の徹底</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コンクリートの手すり壁にアルミ手摺を取り付ける際、アンカーボルト（鉄やステンレス）とアルミが直接触れると腐食する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  施工時に樹脂製のパッキンや絶縁ワッシャーを挟んでいるかどうかが、数十年後の腐食倒壊を防ぐ鍵となる。
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

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/business/ext/search/?t=housing&c=14', '商品ページ')}｜
                {renderLink('https://webcatalog.ykkap.co.jp/iportal/CatalogSearch.do?method=catalogSearchByAnyCategories&volumeID=YKKAPDC1&categoryID=4146550000&sortKey=CatalogMain2210000&sortOrder=ASC&designID=pro', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/business/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/business/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・サンレール</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sunrail.co.jp/product_category/handrail/', '商品ページ')}｜
                {renderLink('https://www.sunrail.co.jp/catalogs', 'カタログ')}｜
                {renderLink('https://www.sunrail.co.jp/office', '営業所')}｜
                {renderLink('https://www.sunrail.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三協アルミ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://alumi.st-grp.co.jp/products/handrail/', '商品ページ')}｜
                {renderLink('https://alumi.st-grp.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://alumi.st-grp.co.jp/support/showroom/', '営業所')}｜
                {renderLink('https://alumi.st-grp.co.jp/support/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・田中金属</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tanakametal.co.jp/products/handrail/', '商品ページ')}｜
                {renderLink('https://www.tanakametal.co.jp/catalog/handrail/', 'カタログ')}｜
                {renderLink('https://www.tanakametal.co.jp/about/overview/', '営業所')}｜
                {renderLink('https://www.tanakametal.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・新日軽</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.shin-nikkei.co.jp/products/handrail/', '商品ページ')}｜
                {renderLink('https://www.shin-nikkei.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.shin-nikkei.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.shin-nikkei.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・川口技研</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kawaguchi-giken.co.jp/products/handrail/', '商品ページ')}｜
                {renderLink('https://www.kawaguchi-giken.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.kawaguchi-giken.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.kawaguchi-giken.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ケイミュー</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kmew.co.jp/products/handrail/', '商品ページ')}｜
                {renderLink('https://www.kmew.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.kmew.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.kmew.co.jp/contact/', 'お問い合わせ')}｜
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
    <div className="content-container">
      {renderContent()}
    </div>
  );
};

export default ExteriorOtherContent; 