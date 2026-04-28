'use client';

import React, { useState } from 'react';

interface ExteriorWallContentProps {
  subcategory: string;
}

const ExteriorWallContent: React.FC<ExteriorWallContentProps> = ({ subcategory }) => {
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
    // SVGプレースホルダー（UTF-8を安全に埋め込む）
    const svg = `
      <svg width="120" height="80" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="40%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">Company</text>
        <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">Wanted</text>
      </svg>`;
    target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const handleCommercialImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    // 商業用画像のSVGプレースホルダー（UTF-8対応）
    const svg = `
      <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">Product Image</text>
      </svg>`;
    target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const renderContent = () => {
    switch (subcategory) {
      case 'alc':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">ALC</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【ALCパネル（軽量気泡コンクリート）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「塗装」が防水の命綱</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ALCは内部に気泡を含むため、素材そのものは吸水性が非常に高い（スポンジのような性質）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 表面の塗装（塗膜）が劣化すると、即座に雨水を吸い込み、内部鉄筋の錆びや、寒冷地での<strong>「凍害（凍って割れる現象）」</strong>に直結する。サイディング以上に塗装メンテナンスの遅れが致命傷になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">シーリング（コーキング）の「2面接着」と「ワーキングジョイント」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ALCはパネルの継ぎ目（目地）が多いため、目地の防水が極めて重要。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  構造: ALCの目地は、地震時の建物の揺れに追従して動く<strong>「ワーキングジョイント」</strong>となるため、シーリング材は<strong>「2面接着（底には接着させない）」</strong>で施工し、伸縮の遊びを持たせるのが鉄則。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ※3面接着してしまうと、動きに耐えられずシーリングが早期に破断する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">厚型（鉄骨造）と薄型（木造）の明確な区分</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>厚型ALC（100mm厚以上）</strong>: 主にS造（鉄骨造）の外壁に使用。耐火被覆の役割も兼ねる。</li>
                  <li><span className="mr-1">・</span><strong>薄型ALC（35mm～50mm厚）</strong>: 主に木造住宅に使用（旭化成の「パワーボード」などが代表的）。デザイン性が高いものが多いが、厚型とは施工方法が全く異なる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">地震力を逃がす「ロッキング工法」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  鉄骨造で厚型ALCを採用する場合、地震で鉄骨が変形してもALCパネルが割れないよう、パネルを回転（ロッキング）させて力を逃がす特別な取り付け金物を使用する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  選定: 大地震後の補修費を抑えるため、追従性能の高い（層間変形角が大きい）ロッキング構法を持つメーカーや製品を選ぶことが重要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">圧倒的な「耐火性」と「遮音性」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>耐火</strong>: 無機質（コンクリート）なので燃えない。隣家が火事になっても延焼を防ぐ能力が非常に高く、都市部の防火地域で重宝される。</li>
                  <li><span className="mr-1">・</span><strong>遮音</strong>: 気泡が音を吸収・遮断するため、幹線道路沿いの建物や、駅・線路近くのマンション等で採用メリットが大きい。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">断熱性と通気性の確保</h4>
                
                <p className="mb-1 text-xs ml-3">
                  通常のコンクリートの約10倍の断熱性があるが、あくまで「コンクリートにしては高い」レベル。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現代の省エネ基準（ZEH等）を満たすには、ALC単体では不十分であり、内壁側に適切な断熱材施工が必要。また、湿気を逃がす通気層の確保も耐久性に影響する。
                </p>
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

              {/* クリオンカードは非表示（削除要望に基づく） */}
            </div>

            {/* 通常企業（テキストリンク形式） */}
            <div className="mt-4 text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・旭化成建材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.asahikasei-kenzai.com/akk/alc/', '商品ページ')}｜
                {renderLink('https://www.asahikasei-kenzai.com/akk/alc/dl/', 'カタログ')}｜
                {renderLink('https://www.asahikasei-kenzai.com/company/#ACCESS', '営業所')}｜
                {renderLink('https://www.asahikasei-kenzai.com/akk/alc/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・クリオン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.clion.co.jp/alc/', '商品ページ')}｜
                {renderLink('https://www.clion.co.jp/catalog-seikyu/', 'カタログ')}｜
                {renderLink('https://www.clion.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.clion.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ケイミューシポレックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kmew-siporex.jp/product/', '商品ページ')}｜
                {renderLink('https://www.kmew-siporex.jp/download/catalogue.html', 'カタログ')}｜
                {renderLink('https://www.kmew-siporex.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.kmew-siporex.jp/inquiry/index', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・旭トステム外装</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.asahitostem.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.asahitostem.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.asahitostem.co.jp/company/base/', '営業所')}｜
                {renderLink('https://www.asahitostem.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/consumer/products/wall/', '商品ページ')}｜
                {renderLink('https://www.ykkap.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'ecp':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">ECP</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【ECP（押出成形セメント板）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「中空（ちゅうくう）」構造による強度と軽量化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  セメント・ケイ酸・繊維などを練り込み、ところてんのように押し出して成形し、高温高圧で蒸気養生したパネル。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  内部に穴が空いた<strong>「中空構造」</strong>になっているのが最大の特徴。これにより、コンクリートの強さを持ちながら重量を抑えている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「アスロック」や「メース」は商品名</h4>
                
                <p className="mb-1 text-xs ml-3">
                  業界では<strong>「アスロック（ノザワ）」</strong>や<strong>「メース（アイカテック建材）」</strong>という商品名が、ECPの代名詞として使われることが多い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メーカーによって対応できる最大寸法やデザインバリエーションが異なるため、設計スペックに合うか確認が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ALCとの決定的な違いは「硬さ」と「デザイン」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ALC</strong>: 気泡が入って柔らかく、断熱性が高いが、表面は塗装仕上げが基本。</li>
                  <li><span className="mr-1">・</span><strong>ECP</strong>: 緻密で非常に硬く、物理的衝撃に強い。エッジの効いたシャープなデザイン（リブ形状やエンボス）が可能で、意匠性が高い。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: ECP自体にはALCほどの断熱性はないため、内壁側に断熱材（発泡ウレタン吹付など）の施工が必須。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">タイル剥落を防ぐ「タイル先付け工法」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  現場でタイルを貼るのではなく、工場の製造段階でタイルを一体化させる製品が充実している。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 接着剤貼りではないため、地震時などのタイルの剥落事故リスクを劇的に低減できる。高層ビルでタイル張りにしたい場合の標準的な選択肢。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">高層建築に対応する「層間変位追従性（ロッキング）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  鉄骨造の超高層ビルなど、地震時に大きく揺れる建物での使用が前提。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  パネルを完全固定せず、揺れに合わせて回転・スライドさせる<strong>「縦張りロッキング工法」</strong>などの高度な取り付け技術が確立されている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「素地（そじ）」仕上げの可否</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コンクリート打ちっ放しのような、素材そのものの風合い（素地）を活かした仕上げが可能（クリア塗装などで保護）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  塗装で塗りつぶすALCとは異なり、セメントの素材感をデザインとして取り入れたい場合に採用される。
                </p>
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
              <span className="w-[180px]">・ノザワ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.asloc.co.jp/pd/index.html', '商品ページ')}｜
                {renderLink('https://www.asloc.co.jp/download/document.php?c=document1', 'カタログ')}｜
                {renderLink('https://www.nozawa-kobe.co.jp/corporate/corporate_06.html', '営業所')}｜
                {renderLink('https://www.nozawa-kobe.co.jp/other/inquiry.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アイカテック建材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.aica-tech.co.jp/products/mace_index.html', '商品ページ')}｜
                {renderLink('https://www.aica-tech.co.jp/products/data_catalog.html', 'カタログ')}｜
                {renderLink('https://www.aica-tech.co.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.aica-tech.co.jp/inquiry/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・神島化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.konoshima.co.jp/lambda/index.html', '商品ページ')}｜
                {renderLink('https://www.konoshima.co.jp/web_catalog/index.html', 'カタログ')}｜
                {renderLink('https://www.konoshima.co.jp/corporate/base.html', '営業所')}｜
                {renderLink('https://www.konoshima.co.jp/contact/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・旭トステム外装</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.asahitostem.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.asahitostem.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.asahitostem.co.jp/company/base/', '営業所')}｜
                {renderLink('https://www.asahitostem.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/consumer/products/wall/', '商品ページ')}｜
                {renderLink('https://www.ykkap.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'metal-panel':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁仕上げ 金属パネル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【アルミ樹脂複合板（ACM）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「アルポリック」は商品名だが代名詞</h4>
                
                <p className="mb-1 text-xs ml-3">
                  薄いアルミで樹脂を挟んだ3層構造のパネル。三菱ケミカルの<strong>「アルポリック」</strong>が圧倒的に有名で、業界ではACMのことを指して「アルポリ」と呼ぶことが多い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 非常に軽量で平滑性が高く、加工しやすい。看板の下地や店舗のファサード、ガソリンスタンドの屋根などで最も使われている。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「カットパネル」と「曲げパネル（箱曲げ）」の使い分け</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>カットパネル</strong>: 板をそのままビスや接着剤で貼る工法。小口（断面）の樹脂層が見えるため、近くで見ると安っぽく見える場合がある。</li>
                  <li><span className="mr-1">・</span><strong>曲げパネル</strong>: 四方を箱型に折り曲げて施工する工法。小口が見えず、厚みと重厚感が出るため、ビルの外装として使うならこちらが標準。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">不燃認定の確認</h4>
                
                <p className="mb-1 text-xs ml-3">
                  通常のACMは芯材が樹脂（ポリエチレン）のため燃えやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  外壁に使う場合は、難燃性の芯材を使用した<strong>「不燃認定品」</strong>を選定する必要がある。コストが変わるため要確認。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【表面仕上げ（テクスチャ）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「塗装」と「陽極酸化被膜（アルマイト）」の違い</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>塗装（フッ素等）</strong>: 顔料で塗りつぶすため、色が均一で耐久性が高い。メンテナンスもしやすい。</li>
                  <li><span className="mr-1">・</span><strong>アルマイト</strong>: アルミの表面を化学的に変化させて保護膜を作る。金属特有のキラキラした質感（メタリック感）が残るため高級感があるが、<strong>「ロットによる色ブレ」</strong>が起きやすく、補修（タッチアップ）ができないのが難点。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">ステンレスの「ヘアライン」と「バイブレーション」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ステンレスパネルを採用する場合、仕上げで表情が変わる。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ヘアライン</strong>: 髪の毛のような一方向の研磨目。シャープだが、指紋や傷が目立ちやすい。</li>
                  <li><span className="mr-1">・</span><strong>バイブレーション</strong>: ランダムな螺旋状の研磨目。傷が目立ちにくく、落ち着いたマットな高級感が出るため、人が触れる場所や高級ブランドの外装で好まれる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「コールテン鋼（耐候性鋼）」の錆び</h4>
                
                <p className="mb-1 text-xs ml-3">
                  表面にあえて緻密な錆（保護性錆）を発生させ、内部の腐食を防ぐ鉄。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  時間とともに赤錆色からこげ茶色へと変化する<strong>「育てる素材」</strong>として人気。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 初期段階では錆汁（さびじる）が垂れて土間コンクリートなどを汚すため、雨仕舞いの設計や、初期錆安定化処理の有無が重要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【有孔パネル（パンチング・エキスパンド）】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「目隠し」と「通風・採光」の両立</h4>
                
                <p className="mb-1 text-xs ml-3">
                  金属板に多数の穴を開けたパネル。設備機器の目隠しスクリーンや、ダブルスキン（ガラスの外側に設置）として使われる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  <strong>開口率（かいこうりつ）</strong>: 穴の面積割合。この数値で「透け感」と「風の通り抜け（風荷重）」が決まるため、構造計算とデザインのバランス調整が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【キャスト（鋳物）パネル】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">唯一無二の「凹凸感」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  溶かしたアルミを型に流し込んで作るパネル。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  圧延された板材では不可能な、深く複雑な凹凸模様（テクスチャ）や立体的な造形が可能。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重厚感は圧倒的だが、型代（金型コスト）がかかるため、非常に高価。エントランス周りなど<strong>「建物の顔」</strong>となる部分に限定して使われることが多い。
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

            <div className="mb-6">
              <div className="flex items-center mb-2">
                <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ガルバリウム鋼板</span>
                <div className="flex-1 h-px bg-gray-300 ml-2"></div>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・YKK AP</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.ykkap.co.jp/products/ex/galvarium/kantan-sidei-s/', '商品ページ')}｜
                  {renderLink('https://www.ykkap.co.jp/support/catalog/exterior/', 'カタログ')}｜
                  {renderLink('https://www.ykkap.co.jp/about/network/', '営業所')}｜
                  {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・旭トステム外装</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.ats-v.co.jp/product/category/103.html', '商品ページ')}｜
                  {renderLink('https://www.ats-v.co.jp/catalog/view.html', 'カタログ')}｜
                  {renderLink('https://www.ats-v.co.jp/sales/index.html', '営業所')}｜
                  {renderLink('https://www.ats-v.co.jp/contact/index.html', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・LIXIL</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.lixil.co.jp/lineup/construction/exterior_wall/metal_siding/dannetsu_metal/', '商品ページ')}｜
                  {renderLink('https://iportal.lixil.co.jp/JSCATALOGVOL1/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=JSCATALOGVOL1', 'カタログ')}｜
                  {renderLink('https://www.lixil.co.jp/corporate/network/', '営業所')}｜
                  {renderLink('https://biz.lixil.com/inquiry/products/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・ニチハ</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.nichiha.co.jp/wall/metal/lineup/', '商品ページ')}｜
                  {renderLink('https://www.nichiha.co.jp/document/detail/metal.html', 'カタログ')}｜
                  {renderLink('https://www.nichiha.co.jp/company/branch/', '営業所')}｜
                  {renderLink('https://www.nichiha.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・アイジー工業</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.ig-kogyou.co.jp/products/galvarium/', '商品ページ')}｜
                  {renderLink('https://www.ig-kogyou.co.jp/info_material/document/cat_list/', 'カタログ')}｜
                  {renderLink('https://www.ig-kogyou.co.jp/company/locations/', '営業所')}｜
                  {renderLink('https://www.ig-kogyou.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・JFE建材</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.jfe-kenzai.co.jp/products/galvalume/galvalume_external_wall/', '商品ページ')}｜
                  {renderLink('https://www.jfe-kenzai.co.jp/download/catalog_list/', 'カタログ')}｜
                  {renderLink('https://www.jfe-kenzai.co.jp/company/group.html', '営業所')}｜
                  {renderLink('https://www.jfe-kenzai.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・月星商事</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.gsi.co.jp/products/galvalume.html', '商品ページ')}｜
                  {renderLink('https://www.gsi.co.jp/service/catalog.html', 'カタログ')}｜
                  {renderLink('https://www.gsi.co.jp/company/branch.html', '営業所')}｜
                  {renderLink('https://www.gsi.co.jp/inquiry/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・カンペハピオ</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.kanpe.co.jp/products/search_product.php?c=12', '商品ページ')}｜
                  {renderLink('https://www.kanpe.co.jp/downloads/', 'カタログ')}｜
                  {renderLink('https://www.kanpe.co.jp/company/outline.php', '営業所')}｜
                  {renderLink('https://www.kanpe.co.jp/support/inquiry.php', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・フクビ化学工業</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.fukuvi.co.jp/products/wall_materials/', '商品ページ')}｜
                  {renderLink('https://www.fukuvi.co.jp/support/catalog/', 'カタログ')}｜
                  {renderLink('https://www.fukuvi.co.jp/company/branch/', '営業所')}｜
                  {renderLink('https://www.fukuvi.co.jp/support/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・三協立山</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://st.sankyo-tateyama.co.jp/products/business/exterior/wall/', '商品ページ')}｜
                  {renderLink('https://st.sankyo-tateyama.co.jp/service/catalog/', 'カタログ')}｜
                  {renderLink('https://www.st-grp.co.jp/company/group/', '営業所')}｜
                  {renderLink('https://st.sankyo-tateyama.co.jp/inquiry/business/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・淀川製鋼所</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.yodoko.co.jp/products/exterior_wall/', '商品ページ')}｜
                  {renderLink('https://www.yodoko.co.jp/info/catalog/', 'カタログ')}｜
                  {renderLink('https://www.yodoko.co.jp/company/network/', '営業所')}｜
                  {renderLink('https://www.yodoko.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center mb-2">
                <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">アルミ</span>
                <div className="flex-1 h-px bg-gray-300 ml-2"></div>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・ケイテックス</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.k-tex.co.jp/products/aluminum/', '商品ページ')}｜
                  {renderLink('https://www.k-tex.co.jp/download/', 'カタログ')}｜
                  {renderLink('https://www.k-tex.co.jp/company/access/', '営業所')}｜
                  {renderLink('https://www.k-tex.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・三晃金属工業</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.sanko-k.co.jp/products/aluminum/', '商品ページ')}｜
                  {renderLink('https://www.sanko-k.co.jp/support/catalog/', 'カタログ')}｜
                  {renderLink('https://www.sanko-k.co.jp/company/office/', '営業所')}｜
                  {renderLink('https://www.sanko-k.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・アルミック</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.almic.co.jp/products/exterior/', '商品ページ')}｜
                  {renderLink('https://www.almic.co.jp/catalog/', 'カタログ')}｜
                  {renderLink('https://www.almic.co.jp/company/office/', '営業所')}｜
                  {renderLink('https://www.almic.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・タケムラ金属工業</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.takemura-kinzoku.co.jp/products/wall/', '商品ページ')}｜
                  {renderLink('https://www.takemura-kinzoku.co.jp/catalog/', 'カタログ')}｜
                  {renderLink('https://www.takemura-kinzoku.co.jp/company/access/', '営業所')}｜
                  {renderLink('https://www.takemura-kinzoku.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
            </div>
          </div>
        );

      case 'wood-board':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁仕上げ 木板材</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【木板仕上げの塗料選定】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「造膜（ぞうまく）」と「浸透（しんとう）」の決定的な差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>造膜塗料（ペンキ・ニスなど）</strong>: 表面に膜を作る。水は弾くが、木の呼吸を止めるため、内部の水分で塗膜が膨れ、バリバリに剥がれる。塗り替えには旧塗膜の剥離（ケレン）が必要で、メンテナンスコストが莫大になる。</li>
                  <li><span className="mr-1">・</span><strong>浸透性塗料（オイルステインなど）</strong>: 木の内部に染み込む。木目が活き、呼吸を妨げないため剥がれが起きない。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  結論: 外壁の木部仕上げには、メンテナンスが容易な（上から塗り重ねるだけの）<strong>「浸透性保護塗料（キシラデコール、ノンロット等）」</strong>を選定するのが鉄則。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「クリア（透明）塗装」のリスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木の色をそのまま残したい要望は多いが、透明な塗料は紫外線を素通しするため、木材自体の劣化（変色・毛羽立ち）が早い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  推奨: 完全に透明なクリアよりも、少し顔料が入った<strong>「着色クリア（やすらぎ等）」</strong>を選ぶ方が、見た目を損なわずに紫外線カット効果を得られる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【焼杉（やきすぎ）仕上げ】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">炭化層（たんかそう）による最強の保護</h4>
                
                <p className="mb-1 text-xs ml-3">
                  表面をバーナー等で焦がして炭化させた伝統的な仕上げ。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  炭化した層は腐朽菌が繁殖できず、水も弾くため、無塗装の木材に比べて耐久性が飛躍的に向上する（耐用年数30年以上とも言われる）。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「素焼き」と「塗装品」の違い</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>素焼き</strong>: 炭がそのまま残っている状態。触ると黒くなるが、炭の厚みがある分、耐久性は高い。</li>
                  <li><span className="mr-1">・</span><strong>塗装品（磨き）</strong>: 炭をブラシで落としてから塗装したもの。触っても汚れにくいが、炭化層の保護効果は薄れるため、定期的な塗装メンテナンスが必要になる。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工・ディテール】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ステンレス釘」以外の使用禁止</h4>
                
                <p className="mb-1 text-xs ml-3">
                  鉄釘を使うと、雨水で錆びるだけでなく、木材に含まれる成分（タンニンなど）と鉄が反応して、釘穴から真っ黒なシミが垂れる<strong>「鉄汚染」</strong>が発生する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  美観を損なわないため、必ず<strong>「ステンレス製のスクリュー釘（またはビス）」</strong>を指定する必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「縦張り（たてばり）」と「横張り」の水切れ</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>縦張り</strong>: 木の繊維方向と雨の流れが一致するため、水切れが良く、小口（切断面）に水が溜まりにくい。耐久性重視なら縦張りが有利。</li>
                  <li><span className="mr-1">・</span><strong>横張り</strong>: 一般的だが、板の継ぎ目や下端に水が滞留しやすい。<strong>「下見板張り（鎧張り）」</strong>のように物理的に重なりをつけて水を切る形状にするか、実（さね）の形状に配慮が必要。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「赤身（心材）」と「白太（辺材）」の指定</h4>
                
                <p className="mb-1 text-xs ml-3">
                  同じ杉板でも、中心に近い<strong>「赤身（あかみ）」</strong>は油分が多く腐りにくいが、外側の「白太（しろた）」は水分が多くすぐに腐る。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 外壁に使用する場合は、コストが上がっても<strong>「赤身勝ち（赤身の割合が多い）」</strong>のグレードを指定することで、将来の腐朽リスクを大幅に減らせる。
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
              <span className="w-[200px]">・竹村工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.takemura-k.co.jp/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.takemura-k.co.jp/company/', '営業所')}｜
                {renderLink('https://www.takemura-k.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'decorative':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁仕上げ 装飾材</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【EPSモールディング（装飾縁）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「発泡スチロール」の進化系</h4>
                
                <p className="mb-1 text-xs ml-3">
                  窓枠や軒下の装飾に使われる、欧米住宅の定番部材。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  基材は軽量なEPS（発泡ポリスチレン）だが、表面に特殊な樹脂とメッシュをコーティングして強度を出している。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 非常に軽く、接着剤で施工できるため、建物への負担が少なく、万が一落下しても人的被害が出にくい。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">宿敵「雨垂れ（あまだれ）」の防止策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  装飾材は壁から出っ張るため、上部に埃がたまり、雨が降るとそれが黒い筋となって壁を汚す。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須ディテール: 上面に雨水を切る<strong>「勾配」</strong>をつけたり、下端に水をポタっと落とす<strong>「水切り溝（ドリップ）」</strong>加工がされている製品を選ばないと、せっかくの白い壁が数年で黒ずみだらけになる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【化粧ルーバー（格子）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ラッピング」か「木粉入り樹脂」か</h4>
                
                <p className="mb-1 text-xs ml-3">
                  縦格子（ルーバー）は、アルミ形材に木目シートを貼った<strong>「ラッピング材」</strong>と、樹脂に木粉を混ぜた<strong>「再生木材」</strong>が主流。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ラッピング</strong>: 本物の木に近いリアルな質感だが、傷がつくとシートが剥がれるリスクがある。</li>
                  <li><span className="mr-1">・</span><strong>再生木材</strong>: 中まで同じ色なので傷に強いが、質感はややマット（人工的）になる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「熱伸縮」による変形と施工</h4>
                
                <p className="mb-1 text-xs ml-3">
                  樹脂系やアルミの長尺ルーバーは、夏場の熱で数ミリ〜1センチ近く伸び縮みする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  固定ビス穴をルーズ（長穴）にして<strong>「逃げ」</strong>を作らないと、膨張して部材が波打ったり、破損したりするトラブルが起きる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【GRC・FRP（擬石・装飾パネル）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">本物の石より「GRC（ガラス繊維強化セメント）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ヨーロッパの石造り建築のような柱やレリーフを再現する場合、本物の石は重すぎて木造住宅には負担が大きい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  <strong>GRC</strong>: コンクリート製だが薄くて強いため、石の質感を持ちながら重量を抑えられる。ただし、ビスが効く下地補強は必須。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">軽さを極めるなら「FRP（強化プラスチック）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ディズニーランドの岩山などに使われる素材。塗装で石や木に見せかける技術。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 圧倒的に軽いため、耐震性を気にするリフォームや、荷重制限のある庇（ひさし）の上などにも設置可能。腐食しないためメンテナンス性も高い。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【妻飾り（つまかざり）・アイアン装飾】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ロートアイアン（鉄）」と「アルミ鋳物」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  屋根の妻側（三角部分）につける装飾。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>本物の鉄（ロートアイアン）</strong>: 重厚感があるが、メンテナンスを怠ると赤錆が発生し、外壁に茶色い涙跡（もらい錆）をつけるリスクが高い。</li>
                  <li><span className="mr-1">・</span><strong>アルミ鋳物</strong>: 現在の主流。見た目はアイアン風だが、アルミなので絶対に赤錆が出ない。外壁の高い位置（メンテ困難な場所）につけるならアルミ一択。</li>
                </ul>
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
              <span className="w-[180px]">・ニチハ（破風/幕板）</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nichiha.co.jp/component/parts/hafu-makuita/', '商品ページ')}｜
                {renderLink('https://www.nichiha.co.jp/document/detail/parts.html', 'カタログ')}｜
                {renderLink('https://www.nichiha.co.jp/company/branch/', '営業所')}｜
                {renderLink('https://www.nichiha.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・神島化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kamishima.co.jp/products/decorative/', '商品ページ')}｜
                {renderLink('https://www.kamishima.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.kamishima.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.kamishima.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・フクビ化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fukuvi.co.jp/products/exterior_parts/', '商品ページ')}｜
                {renderLink('https://www.fukuvi.co.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.fukuvi.co.jp/company/branch/', '営業所')}｜
                {renderLink('https://www.fukuvi.co.jp/support/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・LIXIL</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.lixil.co.jp/lineup/construction/exterior_wall/accessories/', '商品ページ')}｜
                {renderLink('https://iportal.lixil.co.jp/JSCATALOGVOL1/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=JSCATALOGVOL1', 'カタログ')}｜
                {renderLink('https://www.lixil.co.jp/corporate/network/', '営業所')}｜
                {renderLink('https://biz.lixil.com/inquiry/products/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/products/ex/accessories/', '商品ページ')}｜
                {renderLink('https://www.ykkap.co.jp/support/catalog/exterior/', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/about/network/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三協立山</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://st.sankyo-tateyama.co.jp/products/business/exterior/accessories/', '商品ページ')}｜
                {renderLink('https://st.sankyo-tateyama.co.jp/service/catalog/', 'カタログ')}｜
                {renderLink('https://www.st-grp.co.jp/company/group/', '営業所')}｜
                {renderLink('https://st.sankyo-tateyama.co.jp/inquiry/business/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ダイケン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiken.jp/products/kenzai/exterior/parts/', '商品ページ')}｜
                {renderLink('https://www.daiken.jp/support/catalog/', 'カタログ')}｜
                {renderLink('https://www.daiken.jp/company/network/', '営業所')}｜
                {renderLink('https://www.daiken.jp/support/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アルミック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.almic.co.jp/products/decorative/', '商品ページ')}｜
                {renderLink('https://www.almic.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.almic.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.almic.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'other-finish':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁仕上げ その他</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【コンクリート打ちっ放し（RC仕上げ）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「完全メンテナンスフリー」は都市伝説</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コンクリートは強固だが、表面はスポンジのように水を吸う。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  何もしないと数年で雨水が浸透し、中の鉄筋が錆びて<strong>「爆裂（ばくれつ）」</strong>を起こしたり、カビや苔で黒ずんだりする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須対策: 新築時に透明な<strong>「撥水剤（はっすいざい）」</strong>を塗布し、5〜7年ごとに塗り直すメンテナンスが美観維持の条件となる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">失敗を隠す化粧技術「ファンデーション（描画）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コンクリートの打設は一発勝負であり、色ムラやジャンカ（豆板）といった失敗がつきもの。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  補修技術: 補修跡を目立たなくするため、専用の塗料とスポンジを使って、本物のコンクリートの風合いを上から描く<strong>「打ちっ放し描画工法（ファンデーション）」</strong>という特殊技術がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ※あまりに綺麗な打ちっ放しは、実はこの技術で化粧されていることが多い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">Pコン（セパレーター）の処理</h4>
                
                <p className="mb-1 text-xs ml-3">
                  表面に見える丸い窪み（Pコン穴）は、型枠を固定した跡。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  この穴を埋める「モルタル詰め」が甘いと、そこから雨水が侵入する。専用の止水栓や、意匠キャップを使用するなどの防水処理精度が寿命を左右する。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ガラスカーテンウォール（ガラス張り）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「スパンドレル（隠蔽部）」の処理</h4>
                
                <p className="mb-1 text-xs ml-3">
                  全面ガラス張りに見えても、床や天井裏、柱などの構造体が見えてはまずい部分は、裏側を塗装したガラスやパネルで隠している。これを<strong>「スパンドレル」</strong>と呼ぶ。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ここの断熱処理が甘いと、内部結露の温床になるため注意が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「Low-E」と「ダブルスキン」による熱負荷低減</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ガラス建築の最大の弱点は「暑さと寒さ」。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 遮熱断熱のLow-E複層ガラスは必須。さらに、ガラスの外側にもう一枚ガラスやルーバーを設ける<strong>「ダブルスキン構造」</strong>にして、間の空気を循環させることで空調負荷を下げる手法が、近年の省エネ建築の標準。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">メンテナンス（清掃）コストの視点</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ガラスは汚れが目立つため、定期的な清掃が不可欠。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  設計段階で<strong>「ゴンドラ」</strong>や<strong>「キャットウォーク（点検通路）」</strong>などの清掃用設備を計画しておかないと、後の清掃コストが跳ね上がる（高所作業車やロープ作業が必要になる）。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【壁面緑化（グリーンウォール）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">植物よりも「灌水（かんすい）システム」が命</h4>
                
                <p className="mb-1 text-xs ml-3">
                  壁面は地面と違って保水力がないため、植物はすぐに枯れる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 自動で水を供給する<strong>「自動灌水システム」</strong>の設置と、その配管メンテナンスが維持管理の9割を占める。水やりを人力に頼る計画はほぼ失敗する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">根が建物を壊す「防根（ぼうこん）」対策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  植物の根はコンクリートの微細なひび割れに入り込み、成長して躯体を破壊する力がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  壁面に直接植えるのではなく、プランターユニット式にするか、強力な<strong>「防根シート」</strong>を施工しないと、漏水や構造クラックの原因になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「落葉」か「常緑」か</h4>
                
                <p className="mb-1 text-xs ml-3">
                  見た目の変化を楽しむなら落葉植物だが、冬場は枯れ枝だけになり、落ち葉の掃除も大変になる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  商業施設などでは、一年中緑を保ち、掃除の手間が少ない<strong>「常緑植物（アイビーやパキラなど）」</strong>または、メンテナンスフリーの<strong>「フェイクグリーン（造花）」</strong>を選択するケースが増えている。
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
              <span className="w-[180px]">・旭トステム外装</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.asahitostem.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.asahitostem.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.asahitostem.co.jp/company/base/', '営業所')}｜
                {renderLink('https://www.asahitostem.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'paint':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁仕上げ 塗装</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【外壁塗装】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">塗料グレード（樹脂）による「耐用年数」の差</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塗料の主成分である樹脂の種類で寿命と価格が決まる。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>シリコン</strong>: 現在の標準グレード。コスパが良い（耐用年数10〜12年）。</li>
                  <li><span className="mr-1">・</span><strong>ラジカル制御</strong>: シリコンと価格が変わらず、性能が少し高い。近年の新定番（耐用年数12〜15年）。</li>
                  <li><span className="mr-1">・</span><strong>フッ素・無機</strong>: 高価だが長持ちする。塗り替えサイクルを減らしたい場合に推奨（耐用年数15〜20年以上）。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  ※アクリルやウレタンは耐久性が低いため、現在の戸建て住宅塗り替えではほとんど提案されない。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">手抜きを防ぐ「3度塗り」の原則</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塗装は<strong>「下塗り（シーラー・フィラー）」＋「中塗り」＋「上塗り」</strong>の計3回塗るのがメーカー規定の標準仕様。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 特に「下塗り」は、壁と塗料を密着させる接着剤の役割を果たす最重要工程。ここを省いたり、乾燥時間を守らないと、数年で塗膜が剥がれる原因になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「シーリング（コーキング）」の打ち替え</h4>
                
                <p className="mb-1 text-xs ml-3">
                  サイディング壁の場合、塗装よりも先に目地のシーリングが劣化する。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  塗装工事の際は、既存のシーリングの上から塗る「増し打ち」ではなく、古いものを撤去して新しくする<strong>「打ち替え」</strong>を行うのが鉄則（窓サッシ周り等は除く）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ※シーリングの上から塗装すると、塗膜が割れやすくなるため、あえて<strong>「後打ち（塗装後にシーリング）」</strong>にする工法もある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「水性」と「油性（溶剤）」の使い分け</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>水性塗料</strong>: 臭いが少なく、引火性がない。環境に優しいため、現在の住宅塗装の主流。</li>
                  <li><span className="mr-1">・</span><strong>油性塗料（弱溶剤）</strong>: シンナーで希釈するため臭うが、密着力が強く、金属部や劣化が激しい壁に適している。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  近隣への配慮なら水性、冬場の施工や耐久重視なら油性など、状況による判断が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">色選びの落とし穴「面積効果（めんせきこうか）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  小さい色見本帳で見た色と、実際に広い壁に塗った色では見え方が異なる。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  法則: 明るい色はより明るく（白っぽく）、暗い色はより暗く（黒っぽく）見える。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  「思っていたより派手になった」という失敗を防ぐため、必ずA4サイズ以上の大きな見本板を屋外で確認するべき。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">付加価値としての「遮熱（しゃねつ）」と「低汚染」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ただ色を塗るだけでなく、機能を持たせた塗料がある。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>遮熱塗料</strong>: 太陽光を反射し、室温上昇を抑える。屋根や金属サイディングで効果が高い。</li>
                  <li><span className="mr-1">・</span><strong>低汚染塗料</strong>: 親水性（水になじむ性質）を持たせ、雨水で汚れを洗い流す機能。白っぽい壁にするなら必須の機能。</li>
                </ul>
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
              <span className="w-[180px]">・日本ペイント</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nipponpaint.co.jp/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.nipponpaint.co.jp/company/network/', '営業所')}｜
                {renderLink('https://www.nipponpaint.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・関西ペイント</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kansai.co.jp/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.kansai.co.jp/company/base/', '営業所')}｜
                {renderLink('https://www.kansai.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '金属サイディング':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">金属サイディング</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【金属サイディング】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">リフォームの切り札「カバー工法（重ね張り）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  金属サイディングは、一般的な窯業系サイディングの約1/4と非常に軽量。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  最大のメリット: 古い壁を撤去せずに上から張る<strong>「カバー工法」</strong>を行っても、建物への重量負担が少なく、耐震性を損なわないため、リフォーム市場での採用率が圧倒的に高い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「断熱材一体型」のサンドイッチ構造</h4>
                
                <p className="mb-1 text-xs ml-3">
                  単なる鉄板ではなく、表面材・断熱材（硬質プラスチックフォーム）・裏面材の3層構造になっている製品が標準。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  性能: 薄くても断熱性が高く、遮音性にも優れる。寒冷地でも<strong>「凍害（水分が凍って壁が割れる現象）」</strong>が起きないため、北国で特に普及している。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「ガルバリウム」と「アルミ」の使い分け</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ガルバリウム（SGL）</strong>: 鉄ベース。現在の主流。錆びにくく安価だが、海岸の目の前などでは錆びるリスクがある。</li>
                  <li><span className="mr-1">・</span><strong>アルミサイディング</strong>: アルミニウムベース。鉄より高価だが、絶対に赤錆が出ない。重塩害地域（海沿い）ではアルミ一択となる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">デザインのトレンド「スパン系」と「インクジェット」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>スパンサイディング</strong>: 金属の質感を活かした、縦ライン（ストライプ）のシンプルモダンなデザイン。黒やシルバーが人気。</li>
                  <li><span className="mr-1">・</span><strong>高機能プリント</strong>: インクジェット技術の進化により、本物の木や石と見分けがつかないレベルの製品が登場している。安っぽさは過去の話。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「錆（サビ）」のリスク管理</h4>
                
                <p className="mb-1 text-xs ml-3">
                  表面はメッキと塗装で守られているが、現場でカットした<strong>「切断面（小口）」</strong>や、自転車などをぶつけた<strong>「ひっかき傷」</strong>から錆が発生する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  施工時に切断面の防錆処理（タッチアップ）を丁寧に行う業者を選ぶことや、傷がついた際の早めの補修が寿命を左右する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「電波障害」の可能性（稀なケース）</h4>
                
                <p className="mb-1 text-xs ml-3">
                  金属で家全体を覆うため、室内で携帯電話やWi-Fiの電波が入りにくくなるケースが稀にある（窓があればほぼ問題ない）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  電波状況が不安なエリアでは、一部に窯業系や木材を組み合わせるなどの配慮が必要な場合がある。
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
              <span className="w-[180px]">・日鉄鋼板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nisc-s.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.nisc-s.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.nisc-s.co.jp/company/base/', '営業所')}｜
                {renderLink('https://www.nisc-s.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・JFE鋼板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.jfe-kouhan.co.jp/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.jfe-kouhan.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.jfe-kouhan.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '窯業サイディング':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">窯業サイディング</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【窯業系サイディング】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「14mm」と「15mm以上」の決定的な差</h4>
                
                <p className="mb-1 text-xs ml-3">
                  カタログを見る際、最も重要なスペックは「板の厚み」。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>14mm厚</strong>: 主に<strong>「釘打ち（くぎうち）」</strong>で固定する。安価だが、釘頭が見える、釘穴からひび割れ（クラック）が発生しやすい等のデメリットがある。</li>
                  <li><span className="mr-1">・</span><strong>15・16mm厚以上</strong>: 主に<strong>「金具留め（かなぐどめ）」</strong>で固定する。表面に釘が出ず美観に優れ、地震時の追従性も高いためひび割れにくい。現在は16mm以上が推奨される傾向にある。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">最大の弱点は「シーリング（コーキング）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  サイディング板自体は丈夫でも、板の継ぎ目を埋める「シーリング材」は紫外線で劣化し、7〜10年程度で切れや痩せが発生する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: <strong>「高耐候シーリング（寿命15年以上）」を採用するか、そもそも目地をなくした「シーリングレス工法（四方合いじゃくり）」</strong>の製品を選ぶことで、将来のメンテナンス費を大幅に削減できる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「セルフクリーニング機能」の標準化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  近年の製品は、雨水で汚れを浮かして洗い流す<strong>「親水（しんすい）コート」</strong>等の機能が標準的になっている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  <strong>光触媒（ひかりしょくばい）</strong>: 太陽光で汚れを分解し、雨で洗い流す最上位グレード（ケイミュー「光セラ」等）。色あせ防止効果も極めて高い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">塗装メンテナンスの要否</h4>
                
                <p className="mb-1 text-xs ml-3">
                  「メンテナンスフリー」と誤解されがちだが、工場塗装のグレード（アクリル・シリコン・フッ素・無機）によって耐用年数が10年〜30年と大きく異なる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  将来の塗り替え費用を抑えたい場合は、初期費用が高くても<strong>「無機塗装」</strong>や<strong>「フッ素塗装」</strong>の高耐久製品を選ぶべき。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">直張り（じかばり）と通気構法の違い</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>通気構法</strong>: 壁の中に空気の通り道を作る標準的な工法。湿気を逃がし、結露を防ぐ。</li>
                  <li><span className="mr-1">・</span><strong>直張り</strong>: 昔の工法。柱や防水紙に直接サイディングを張るため、湿気が逃げず、裏面からの結露や凍害でボロボロになりやすい。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  ※リフォームや建売住宅のチェックでは、通気層が確保されているか（通気金具が使われているか）の確認が重要。
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
              <span className="w-[180px]">・旭トステム外装</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.asahitostem.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.asahitostem.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.asahitostem.co.jp/company/base/', '営業所')}｜
                {renderLink('https://www.asahitostem.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/consumer/products/wall/', '商品ページ')}｜
                {renderLink('https://www.ykkap.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'siding':
        return (
          <div>
            <div className="content-title-wrapper">
              <h2 className="text-xl font-semibold inline">サイディング</h2>
              <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
            </div>
            {/* カテゴリー: 金属サイディング */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">金属サイディング</span>
                <div className="flex-1 h-px bg-gray-300 ml-2"></div>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・日鉄鋼板</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.nisc-s.co.jp/products/', '商品ページ')}｜
                  {renderLink('https://www.nisc-s.co.jp/catalog/', 'カタログ')}｜
                  {renderLink('https://www.nisc-s.co.jp/company/base/', '営業所')}｜
                  {renderLink('https://www.nisc-s.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・JFE鋼板</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.jfe-kouhan.co.jp/products/', '商品ページ')}｜
                  {renderLink('#', 'カタログ')}｜
                  {renderLink('https://www.jfe-kouhan.co.jp/company/office/', '営業所')}｜
                  {renderLink('https://www.jfe-kouhan.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
            </div>

            {/* カテゴリー: 窯業系サイディング */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">窯業系サイディング</span>
                <div className="flex-1 h-px bg-gray-300 ml-2"></div>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・旭トステム外装</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.asahitostem.co.jp/products/', '商品ページ')}｜
                  {renderLink('https://www.asahitostem.co.jp/catalog/', 'カタログ')}｜
                  {renderLink('https://www.asahitostem.co.jp/company/base/', '営業所')}｜
                  {renderLink('https://www.asahitostem.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・YKK AP</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.ykkap.co.jp/consumer/products/wall/', '商品ページ')}｜
                  {renderLink('https://www.ykkap.co.jp/catalog/', 'カタログ')}｜
                  {renderLink('https://www.ykkap.co.jp/showroom/', '営業所')}｜
                  {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
            </div>

            {/* カテゴリー: その他サイディング */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">その他サイディング</span>
                <div className="flex-1 h-px bg-gray-300 ml-2"></div>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・旭トステム外装</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.asahitostem.co.jp/products/', '商品ページ')}｜
                  {renderLink('https://www.asahitostem.co.jp/catalog/', 'カタログ')}｜
                  {renderLink('https://www.asahitostem.co.jp/company/base/', '営業所')}｜
                  {renderLink('https://www.asahitostem.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
              <div className="text-[13px] flex items-start gap-2">
                <span className="w-[180px]">・YKK AP</span>
                <span className="flex gap-1 flex-wrap">
                  {renderLink('https://www.ykkap.co.jp/consumer/products/wall/', '商品ページ')}｜
                  {renderLink('https://www.ykkap.co.jp/catalog/', 'カタログ')}｜
                  {renderLink('https://www.ykkap.co.jp/showroom/', '営業所')}｜
                  {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
                  {renderLink('#', 'サンプル')}｜
                  {renderLink('#', 'CADDOWNLOAD')}
                </span>
              </div>
            </div>
          </div>
        );

      case 'metalpanel':
      case '金属パネル':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">金属パネル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【金属パネル（ビル・店舗・工場用）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「サンドイッチパネル」の断熱・耐火性能</h4>
                
                <p className="mb-1 text-xs ml-3">
                  2枚の鋼板の間に断熱材（ウレタンフォームやロックウール）を注入・発泡させたパネル。工場・倉庫・冷凍庫などで主流。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  芯材（コア）の違い:
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ウレタン</strong>: 断熱性が非常に高い。</li>
                  <li><span className="mr-1">・</span><strong>ロックウール</strong>: <strong>「不燃材料」</strong>の認定が取れるため、防火規制の厳しい建築物ではこちらが必須となる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">意匠パネルにおける「平滑性（フラットネス）」の確保</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ビルのファサード（正面）に使われる金属パネルは、波打ち（歪み）のない鏡のような平滑さが求められる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  薄い金属板では歪みが出やすいため、<strong>「アルミハニカムパネル（蜂の巣状の芯材を入れたもの）」</strong>や、3mm以上の厚みがあるアルミ板を採用することで、高い剛性と平滑性を実現する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">汚れを防ぐ「オープンジョイント工法」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  パネル同士の隙間をシーリング（コーキング）で埋めず、ガスケット等を用いて雨水を裏側へ排出する工法。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: シーリングの劣化による打ち替えメンテナンスが不要。また、シーリングの汚れが雨で垂れて壁を汚す<strong>「雨垂れ汚染」</strong>が発生せず、美観が長持ちする。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「オーダーメイド（割り付け）」か「既製品」か</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>既製品（定尺）</strong>: サンドイッチパネルに多い。安価で早いが、窓の位置や建物の寸法をパネルに合わせる必要がある。</li>
                  <li><span className="mr-1">・</span><strong>オーダーメイド</strong>: アルミパネルに多い。建物の形状に合わせて一枚一枚工場で製作する。自由度は高いが、製作図面の作成（作図）から納期がかかるため、工程管理が重要。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「フッ素樹脂焼付塗装」の耐候性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  高層ビルやメンテナンスが困難な場所では、紫外線に極めて強い<strong>「フッ素樹脂焼付塗装」</strong>が標準スペックとなる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  期待耐用年数は20年以上。安価なアクリルやウレタン塗装を選ぶと、足場代のかかる塗り替え頻度が増え、LCC（ライフサイクルコスト）が悪化する。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">異種金属との「絶縁（ぜつえん）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  アルミパネルを鉄骨下地に固定する場合など、異なる金属が接すると腐食（電食）が起きる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  施工時にパッキンや絶縁ワッシャーを挟み、電気的に絶縁されているかの管理が品質を左右する。
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
              <span className="w-[180px]">・日鉄鋼板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nisc-s.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.nisc-s.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.nisc-s.co.jp/company/base/', '営業所')}｜
                {renderLink('https://www.nisc-s.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・JFE鋼板</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.jfe-kouhan.co.jp/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.jfe-kouhan.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.jfe-kouhan.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'exterior-wall-other':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁 その他</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【天然木張り（木質サイディング）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「シルバーグレー」への経年変化（エイジング）</h4>
                
                <p className="mb-1 text-xs ml-3">
                  天然木は紫外線により、数年で茶褐色から<strong>「シルバーグレー（銀白色）」</strong>へと色が変化する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  事前説明: これを「劣化・汚れ」と捉えるか、「味わい」と捉えるかで施主の満足度が変わる。色が抜けることを前提とした提案が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">防火地域での使用制限と「準不燃」認定</h4>
                
                <p className="mb-1 text-xs ml-3">
                  天然木は燃えるため、都市部の防火・準防火地域ではそのままでは使えない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 薬剤を注入して<strong>「準不燃材料」</strong>の認定を取得した製品を使用するか、下地に石膏ボード等の不燃材を張って「防火構造」の大臣認定を取る工法が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「浸透性（しんとうせい）」塗料のメンテナンス</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木の呼吸を止めないよう、表面に膜を作るペンキ（造膜塗料）ではなく、木材内部に染み込む<strong>「浸透性保護塗料（キシラデコール等）」</strong>を使うのが基本。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  3〜5年ごとのこまめな塗り直しが必要だが、重ね塗ることで防腐性能が維持される。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【樹脂サイディング（塩ビサイディング）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「コーキング（シーリング）不要」の衝撃</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塩化ビニル樹脂製で、部材同士を重ね合わせて施工する<strong>「オープンジョイント構造」</strong>のため、メンテナンスの最大の元凶であるシーリング材を使わない（窓周り等を除く）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 塗装不要（素材そのものの色）かつシーリング不要のため、メンテナンスコストは外壁材の中で最強クラスに安い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">凍害・塩害への無敵性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  水を吸わない樹脂製なので、寒冷地での<strong>「凍害（凍って割れる）」</strong>や、海沿いでの<strong>「塩害（錆び）」</strong>が物理的に発生しない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  採用エリア: 北米や北海道・東北ではメジャーだが、関東以南では施工業者が少ないのが現状。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【PCカーテンウォール（プレキャストコンクリート）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「工場生産」による高品質コンクリート</h4>
                
                <p className="mb-1 text-xs ml-3">
                  現場で型枠に流し込むコンクリート（RC）とは異なり、工場で徹底管理して製造されたコンクリートパネル。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 現場打ちよりも緻密で高強度。表面の仕上がり（タイル貼りや石目調など）も工場で完成させるため、品質が均一で工期も短縮できる。高層ビルやタワーマンションの主流。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">地震時の「層間変位（そうかんへんい）」追従</h4>
                
                <p className="mb-1 text-xs ml-3">
                  巨大なコンクリートの板に見えるが、構造体（柱・梁）には完全固定されず、地震の揺れに合わせて動く（スライド・回転する）ように取り付けられている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  これにより、大地震でもパネルが脱落したり割れたりしない構造になっている。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【GRC（ガラス繊維強化セメント）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「薄さ」と「造形力」のデザイン建材</h4>
                
                <p className="mb-1 text-xs ml-3">
                  セメントに耐アルカリガラス繊維を混ぜて補強した素材。鉄筋が入っていないため、通常のコンクリートでは不可能な<strong>「薄さ（10mm程度〜）」と「複雑な形状」</strong>が可能。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  用途: ヨーロッパ調の装飾柱、レリーフ、曲面の外壁など、デザイン性を重視する部分に使われることが多い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ひび割れ（クラック）の抑制</h4>
                
                <p className="mb-1 text-xs ml-3">
                  内部に分散したガラス繊維が、コンクリート特有の乾燥収縮によるひび割れを防ぐ。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  軽量であるため、建物のリニューアル（ファサード改修）などで、既存の建物に負担をかけずにデザインを一新する際にも採用される。
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
              <span className="w-[180px]">・旭トステム外装</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.asahitostem.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.asahitostem.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.asahitostem.co.jp/company/base/', '営業所')}｜
                {renderLink('https://www.asahitostem.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・YKK AP</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ykkap.co.jp/consumer/products/wall/', '商品ページ')}｜
                {renderLink('https://www.ykkap.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.ykkap.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'plaster':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁仕上げ 塗り壁</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【塗り壁（モルタル・左官仕上げ）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">宿命的な課題「クラック（ひび割れ）」対策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塗り壁は、材料の乾燥収縮や建物の揺れにより、表面にひび割れ（ヘアクラック）が発生しやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須対策: 下地に<strong>「ガラス繊維ネット（ファイバーメッシュ）」を全面に伏せ込んで補強する工法や、ひび割れに追従して伸びる「弾性（だんせい）機能」</strong>を持った仕上げ材を選ぶことが、美観維持の絶対条件となる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「通気構法（つうきこうほう）」の確保が最重要</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔のモルタル壁は、防水紙の上に直接塗る「直張り」が多く、壁内結露で柱を腐らせる原因となっていた。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現代の標準: サイディングと同様に、壁の中に空気の通り道を設ける<strong>「通気ラス工法」</strong>などが標準化されている。これを行わず、直張りで施工しようとする業者は避けるべき。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「シームレス」な意匠性と汚れ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  サイディングのような「目地（継ぎ目）」がないため、建物が一体化した美しい仕上がりになる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 表面に凹凸（パターン）をつける仕上げが多いため、埃や排気ガスの汚れが溜まりやすい。また、窓枠の下などに黒い筋がつく<strong>「雨垂れ汚染」</strong>が目立つため、雨筋防止の水切り部材（伝い水防止材）の設置が推奨される。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">職人の腕に左右される「テクスチャ（模様）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コテ仕上げ、櫛引き、吹き付けなど、仕上げ方は無限大だが、最終的な仕上がりは<strong>「左官職人の腕とセンス」</strong>に依存する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  見本板だけでなく、実際にその業者が施工した建物を見せてもらうか、現場で「試し塗り」をしてパターンを確認しないと、イメージ違いのトラブルになりやすい。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「湿式工法（しっしき）」による工期への影響</h4>
                
                <p className="mb-1 text-xs ml-3">
                  現場で水を使って材料を練り、塗って乾かす工程が必要なため、天候に左右されやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  雨や氷点下の日は作業ができず、<strong>乾燥養生期間（ようじょうきかん）</strong>も必要なため、サイディング工事に比べて工期が長くなる傾向がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">部分補修の難易度（タッチアップ跡）</h4>
                
                <p className="mb-1 text-xs ml-3">
                  何かがぶつかって欠けた場合、その部分だけ補修することは可能だが、周囲と全く同じ色・模様に馴染ませるのは至難の業。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  補修跡（タッチアップ跡）が目立ってしまうことが多いため、全体を塗り直すか、補修跡を「味」として許容する理解が必要。
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
              <span className="w-[180px]">・山本窯業化工</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.y-y-k.co.jp/products_use/', '商品ページ')}｜
                {renderLink('https://www.y-y-k.co.jp/support/db_catalog/', 'カタログ')}｜
                {renderLink('https://www.y-y-k.co.jp/about/branch/', '営業所')}｜
                {renderLink('https://www.y-y-k.co.jp/support/inquiry_step1/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・吉野石膏</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://yoshino-gypsum.com/prdt/result?category=%E5%A1%97%E3%82%8A%E5%A3%81%E6%9D%90/%E3%82%BB%E3%83%AB%E3%83%95%E3%83%AC%E3%81%B9%E3%83%AA%E3%83%B3%E3%82%B0%E5%BA%8A%E6%9D%90', '商品ページ')}｜
                {renderLink('https://yoshino-gypsum.com/support/list_catalog#c5', 'カタログ')}｜
                {renderLink('https://yoshino-gypsum.com/cprt/office', '営業所')}｜
                {renderLink('https://yoshino-gypsum.com/support/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ブライトン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.brigh-ton.co.jp/huntington-wall', '商品ページ')}｜
                {renderLink('https://form.k3r.jp/brighton/huntington-wall-catalog', 'カタログ')}｜
                {renderLink('https://www.brigh-ton.co.jp/company', '営業所')}｜
                {renderLink('https://form.k3r.jp/brighton/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・四国化成建材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://kenzai-search.jp/makers/shikoku/products/categories/193', '商品ページ')}｜
                {renderLink('https://download.shikoku.co.jp/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=CATALOG', 'カタログ')}｜
                {renderLink('https://www.shikoku.co.jp/company/group/shikoku-kenzai/', '営業所')}｜
                {renderLink('https://kenzai.shikoku.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アイカ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.aica.co.jp/products/wall-material/climateria/', '商品ページ')}｜
                {renderLink('https://www.aica.co.jp/order/catalog/list', 'カタログ')}｜
                {renderLink('https://www.aica.co.jp/company/profile/hub/sales_office/', '営業所')}｜
                {renderLink('https://www.aica.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・フッコー</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fukko-japan.com/products/#content01', '商品ページ')}｜
                {renderLink('https://www.fukko-japan.com/tech-doc/#content03', 'カタログ')}｜
                {renderLink('https://www.fukko-japan.com/company/', '営業所')}｜
                {renderLink('https://www.fukko-japan.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本化成</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nihonkasei.co.jp/products/finish', '商品ページ')}｜
                {renderLink('https://www.nihonkasei.co.jp/download/finish', 'カタログ')}｜
                {renderLink('https://www.nihonkasei.co.jp/company/access', '営業所')}｜
                {renderLink('https://www.nihonkasei.co.jp/inquiry', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'tile':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁仕上げ タイル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【外壁タイル】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">イニシャルコスト高、LCC（生涯費用）安</h4>
                
                <p className="mb-1 text-xs ml-3">
                  初期費用（材料・施工費）はサイディングの倍以上かかることが多いが、無機質（石・土）を高温で焼成しているため、紫外線で劣化せず、塗り替えが原則不要。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  視点: <strong>「30年間のトータルコスト」</strong>で比較すると、塗装メンテナンス費がかからない分、サイディングと逆転する場合がある。長く住む家ほど有利。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">剥落を防ぐ「乾式（かんしき）工法」の主流化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔のタイル（湿式工法）は、地震や経年劣化で剥がれ落ちるリスクがあった。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現在の標準: ベースとなるサイディング等の下地に、接着剤で貼るか、金具に引っ掛けて固定する<strong>「乾式工法（引っ掛け工法など）」</strong>が主流。建物が揺れてもタイルが追従するため、剥落リスクが極めて低い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">仕上がりを左右する「役物（やくもの）」タイル</h4>
                
                <p className="mb-1 text-xs ml-3">
                  平面だけでなく、建物の角（コーナー）専用のＬ字型タイル<strong>「役物」</strong>が用意されているかが高級感の分かれ目。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 役物は製造コストが高く、安価なタイルシリーズでは用意されていない（平らなタイルを突き合わせるだけ）場合がある。角の納まりが美しいかどうかで、タイルのグレード感が大きく変わる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「焼き物」特有の色幅と寸法誤差</h4>
                
                <p className="mb-1 text-xs ml-3">
                  工業製品（サイディング）とは違い、窯で焼くため、同じ品番でも微妙な色の濃淡（色幅）や、数ミリの寸法誤差が生じる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  事前説明: これを「製品のバラつき・不良」と捉えるか、<strong>「焼き物の味わい・深み」</strong>と捉えるか、施主への事前の説明と共有が不可欠。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">メンテナンスが必要なのは「目地（めじ）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  タイルそのものは半永久的だが、タイルとタイルの間を埋める「目地材（モルタルやシーリング）」は劣化する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  深目地・突きつけ: 最近は目地材を入れない、あるいは奥まった位置にする仕様が増えているが、防水性や意匠性との兼ね合いで確認が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「親水（しんすい）機能」による防汚</h4>
                
                <p className="mb-1 text-xs ml-3">
                  多くの外壁タイルには、表面に水膜を作って汚れを雨で洗い流す<strong>「親水機能」</strong>が備わっている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  光触媒などの特別なコーティングがなくても、タイル本来の性質として汚れにくいのが特徴。
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
              <span className="w-[180px]">・LIXIL</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.biz-lixil.com/product/tile/c1005/', '商品ページ')}｜
                {renderLink('https://www.biz-lixil.com/catalog/', 'カタログ')}｜
                {renderLink('https://www.lixil.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.lixil.co.jp/support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ミラタップ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.miratap.co.jp/shop/c/C007_11/', '商品ページ')}｜
                {renderLink('https://www.miratap.co.jp/shop/app/pages/catalog/', 'カタログ')}｜
                {renderLink('https://www.miratap.co.jp/shop/showroom/', '営業所')}｜
                {renderLink('https://www.miratap.co.jp/shop/app/customer/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・淡陶社</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://danto.jp/products/list?productplus_4=5', '商品ページ')}｜
                {renderLink('https://danto.jp/catalog_request/', 'カタログ')}｜
                {renderLink('https://danto.jp/companyinfo/showroom/', '営業所')}｜
                {renderLink('https://danto.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・名古屋モザイク工業(株)</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagoya-mosaic.com/products/search?cat=150', '商品ページ')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/catalogue/2025.html', 'カタログ')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/companyguide/branch.html', '営業所')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/secure/contact/contactfrm2?nonlogin', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ニッタイ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nittai-kogyo.co.jp/products/search.html?p_series=&l_lineup_number=&category_name=&usecase%5B%5D=%E5%B1%8B%E5%A4%96%E5%A3%81&p_image=&price1=3000&price2=20000&width1=&width2=&height1=&height2=&depth1=&depth2=', '商品ページ')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/catalog.html', 'カタログ')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/company/showroom/', '営業所')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/inquiry/other/index.php', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ｱｲｺｯﾄﾘｮｰﾜ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ic-ryowa.com/products/', '商品ページ')}｜
                {renderLink('https://www.ic-ryowa.com/catalog/', 'カタログ')}｜
                {renderLink('https://www.ic-ryowa.com/office/', '営業所')}｜
                {renderLink('https://www.icot-ryowa.net/contactform/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ラミナムジャパン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.laminam.jp/product/', '商品ページ')}｜
                {renderLink('https://www.laminam.jp/download/', 'カタログ')}｜
                {renderLink('https://www.laminam.jp/company/', '営業所')}｜
                {renderLink('https://www.laminam.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・マラッツィ・ジャパン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.marazzi.jp/', '商品ページ')}｜
                {renderLink('https://www.marazzi.jp/download/', 'カタログ')}｜
                {renderLink('https://www.marazzi.jp/showroom/', '営業所')}｜
                {renderLink('https://www.marazzi.jp/contacts/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ダイナワン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.dinaone.co.jp/products/', '商品ページ')}｜
                {renderLink('https://www.catalabo.org/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=CATALABO&catalogId=84026110000&pageGroupId=&designID=link&catalogCategoryId=&designConfirmFlg=', 'カタログ')}｜
                {renderLink('https://www.dinaone.co.jp/company/access/', '営業所')}｜
                {renderLink('https://www.dinaone.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case 'stone-brick':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外壁仕上げ 石・レンガ</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【天然石（石張り）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「湿式（しっしき）」から「乾式（かんしき）」への移行</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔はモルタルで貼る「湿式工法」が多かったが、地震時の剥落リスクが高いため、現在は高層ビルや公共建築を中心に、アンカーやファスナー等の金物で固定する<strong>「乾式工法」</strong>が標準となっている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  コスト: 乾式は金物代と手間がかかるため高額になるが、安全性を担保するには不可欠。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「御影石（みかげいし）」と「大理石」の使い分け</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>御影石（花崗岩）</strong>: 非常に硬く、酸性雨にも強いため、外壁・外構に最適。</li>
                  <li><span className="mr-1">・</span><strong>大理石</strong>: 酸に弱く、雨に当たると艶が消えて溶けてしまうため、原則として屋内専用。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  ※ライムストーン（石灰岩）や砂岩も吸水性が高く汚れやすいため、外壁に使う場合は撥水処理などの対策が必須。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">寒冷地における「凍害（とうがい）」リスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  吸水率の高い石（砂岩や凝灰岩など）を寒冷地で使うと、内部で水分が凍結・膨張して石が割れる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  採用する石種の吸水率データを確認し、寒冷地仕様に耐えうるか確認が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【レンガ（積みレンガ）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「スライス（タイル）」か「積み（ブロック）」か</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>レンガタイル</strong>: レンガを薄くスライスして壁に貼ったもの。構造はタイルと同じ。軽量。</li>
                  <li><span className="mr-1">・</span><strong>積みレンガ</strong>: レンガそのものを地面（基礎）から積み上げたもの。<strong>「外壁そのものが自立している」</strong>状態。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  本物の重厚感は「積み」に軍配が上がるが、基礎工事が必要になりコストは跳ね上がる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">地震大国日本の「鉄筋補強」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  「三匹の子豚」のイメージとは異なり、ただ積んだだけのレンガは地震で崩壊する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須構造: 日本で施工する場合、レンガの中に縦横の<strong>「ステンレス鉄筋」</strong>を通し、さらに建物の躯体と金物で連結して倒壊を防ぐ構法が必須。この構造計算と施工精度が命。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「メンテナンスフリー」の真実</h4>
                
                <p className="mb-1 text-xs ml-3">
                  レンガ自体は紫外線で劣化せず、古くなるほど味が出るため、塗装は永久に不要。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: ただし、レンガ同士をつなぐ「モルタル目地」は吸水する。ここから白い粉が吹く<strong>「白華現象（エフロレッセンス）」</strong>が起きやすい（強度的には問題ないが、見た目が白くなる）。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">100年建築と「通気層」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  積みレンガは、建物本体（木造やRC）との間に空気層を設けて施工される。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  外装材（レンガ）が建物から独立しているため、建物本体の通気が極めて良く、構造体の寿命を延ばす効果がある。
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
              <span className="w-[180px]">・(株)マチダコーポレーション</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.machidacorp.co.jp/product_i/c02/', '商品ページ')}｜
                {renderLink('http://www.machidacorp.co.jp/catalogue_s/', 'カタログ')}｜
                {renderLink('http://www.machidacorp.co.jp/profile/branch/', '営業所')}｜
                {renderLink('https://www.machidacorp.co.jp/contact/total_support/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ユニソン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.unison-net.com/gardenexterior/product/?s=&cate=131', '商品ページ')}｜
                {renderLink('https://www.unison-net.com/webcatalog/', 'カタログ')}｜
                {renderLink('https://www.unison-net.com/company/location/', '営業所')}｜
                {renderLink('https://www.unison-net.com/contact_top/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・安城資材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://episodebrick.com/#sec02', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://episodebrick.com/about.php', '営業所')}｜
                {renderLink('https://episodebrick.com/contact.php', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ヤブ原産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://yabuhara-ind.co.jp/araidashi_yabuhara/products/bwa/', '商品ページ')}｜
                {renderLink('https://www.yabuhara-ind.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.yabuhara-ind.co.jp/profile/access/', '営業所')}｜
                {renderLink('https://yabuhara-ind.co.jp/araidashi_yabuhara/welcome/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・竹村工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.takemura-k.co.jp/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.takemura-k.co.jp/company/', '営業所')}｜
                {renderLink('https://www.takemura-k.co.jp/contact/', 'お問い合わせ')}｜
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

export default ExteriorWallContent; 