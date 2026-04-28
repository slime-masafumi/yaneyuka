import React, { useState } from 'react';

interface WaterproofContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const WaterproofContent: React.FC<WaterproofContentProps> = ({ subcategory, onNavigateToRegistration }) => {
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  const handleImageError = (imageName: string) => {
    setImageError(prev => ({ ...prev, [imageName]: true }));
  };

  // URLの有効性をチェックする関数
  const isValidUrl = (url: string) => url && url !== '#' && url.trim() !== '';

  // リンクを条件付きでレンダリングする関数
  const renderLink = (url: string, label: string) => {
    if (isValidUrl(url)) {
      return <a href={url} target="_blank" className="text-blue-800 hover:text-blue-900 underline cursor-pointer">{label}</a>;
    } else {
      return <span className="text-gray-600 no-underline cursor-not-allowed">{label}</span>;
    }
  };

  const renderRecrutmentCard = () => (
    <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
      <img 
        src={imageError['recruitment'] ? "/image/掲載募集中a.png" : "/image/掲載募集中a.png"} 
        alt="掲載企業様募集中" 
        className="w-30 mb-1 w-[clamp(300x,5vw,120px)]"
        onError={() => handleImageError('recruitment')}
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
        {/* CTAは見出し右に配置するため、カード内ボタンは表示しない */}
      <img 
        src={imageError['commercial'] ? "/image/ChatGPT Image 2025年5月1日 16_25_41.webp" : "/image/ChatGPT Image 2025年5月1日 16_25_41.webp"} 
        alt="Manufacturer Commercial" 
        className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
        onError={() => handleImageError('commercial')}
      />
    </div>
  );

  const renderHeader = (title: string) => (
    <div className="mb-2">
      <h2 className="text-xl font-semibold inline">{title}</h2>
      {onNavigateToRegistration ? (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigateToRegistration();
          }}
          className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
        >
          掲載希望はコチラ
        </a>
      ) : (
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      )}
    </div>
  );

  const renderUrethaneWaterproof = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ウレタン防水</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <h3 className="font-bold text-[13px] mb-1.5">【密着工法と通気緩衝工法の決定的な違い】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">安価だが膨れやすい「密着工法」</h4>
          
          <p className="mb-1 text-xs ml-3">
            下地に直接ウレタンを塗る工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: コンクリートに含まれる水分が蒸発した際、逃げ場がないため防水層を押し上げ、<strong>「膨れ（ふくれ）」</strong>が発生しやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            適所: 新築（コンクリートが乾いている）や、狭いベランダには向いているが、雨漏りしている屋上の改修には不向き。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">改修の標準「通気緩衝（つうきかんしょう）工法」</h4>
          
          <p className="mb-1 text-xs ml-3">
            穴の空いたシート（通気シート）を貼ってからウレタンを塗る工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            仕組み: 下地からの湿気をシートの裏側を通して逃がし、<strong>「脱気筒（だっきとう）」</strong>という煙突から排出する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            重要: 雨漏りしている建物や、面積の広い屋上では、コストが上がってもこちらを選ばないと、すぐに膨れて破裂する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【メンテナンス（トップコート）の真実】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「トップコート」は防水ではない</h4>
          
          <p className="mb-1 text-xs ml-3">
            表面のグレー（または緑）の塗装は、紫外線に弱いウレタン層を守るための「保護塗料」であり、これ自体に防水性能はほぼない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 雨漏りしているのに「トップコートを塗り替えれば直ります」と言う業者は知識不足か悪徳。雨漏りには防水層のやり直しが必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「5年」ごとの塗り替えが寿命を延ばす</h4>
          
          <p className="mb-1 text-xs ml-3">
            ウレタン防水本体は10〜15年持つが、トップコートは5年程度で粉を吹いたりひび割れたりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            本体が傷む前にトップコートだけ塗り替えれば、防水層を延命でき、LCC（ライフサイクルコスト）を安く抑えられる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工品質（厚み）の管理】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">見抜けない「膜厚（まくあつ）不足」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ウレタンは液体なので、薄く伸ばして材料費をケチっても、完成してしまえば見た目では分からない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 契約通りの厚み（通常2mm〜3mm）がついているか確認するために、<strong>「使用缶数（材料が何缶空いたか）」</strong>の写真を提出させたり、切り取って厚みを測る検査を行うのが、品質管理の鉄則。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【形状への対応力】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">複雑な場所が得意</h4>
          
          <p className="mb-1 text-xs ml-3">
            シート防水やアスファルト防水は、室外機の架台周りや、複雑な配管周りの施工が苦手（継ぎ目ができるため）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ウレタンは液体なので、どんな複雑な形状でも継ぎ目のない（シームレスな）防水膜を作ることができる。リフォームで選ばれる最大の理由。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・AGCポリマー建材</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.agc-polymer.com/products/index.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.agc-polymer.com/company/company.html', '営業所')}｜
          {renderLink('https://www.agc-polymer.com/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・エスケー化研</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sk-kaken.co.jp/product/roof-waterproof-materials/', '商品ページ')}｜
          {renderLink('https://www.sk-kaken.co.jp/product/catalog/', 'カタログ')}｜
          {renderLink('https://www.sk-kaken.co.jp/business-bases/', '営業所')}｜
          {renderLink('https://www.sk-kaken.co.jp/contact/products/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・大関化学工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.ozeki-chemical.co.jp/products/index.php', '商品ページ')}｜
          {renderLink('https://www.ozeki-chemical.co.jp/member/pdf_catalog/PARATEX.pdf', 'カタログ')}｜
          {renderLink('https://www.ozeki-chemical.co.jp/company/branch.php', '営業所')}｜
          {renderLink('https://www.ozeki-chemical.co.jp/contact/index.php', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ボース</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('http://www.both.co.jp/product_3.html', '商品ページ')}｜
          {renderLink('http://www.both.co.jp/form78both23698.html', 'カタログ')}｜
          {renderLink('http://www.both.co.jp/office.html', '営業所')}｜
          {renderLink('#', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シーカ・ジャパン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.dyflex.co.jp/bousui/ctlg/tag-ctlg/%E3%82%A6%E3%83%AC%E3%82%BF%E3%83%B3%E9%98%B2%E6%B0%B4/', '商品ページ')}｜
          {renderLink('https://www.dyflex.co.jp/bousui/ctlg/', 'カタログ')}｜
          {renderLink('https://www.dyflex.co.jp/bousui/inquiry/', '営業所')}｜
          {renderLink('https://www.dyflex.co.jp/bousui/request/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アイカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.aica.co.jp/products/flooring-material/urethane/', '商品ページ')}｜
          {renderLink('https://www.aica.co.jp/order/catalog/list', 'カタログ')}｜
          {renderLink('https://www.aica.co.jp/show-room/', '営業所')}｜
          {renderLink('https://www.aica.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・エフワンエヌ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://fonen.co.jp/business/axsp/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://fonen.co.jp/about/', '営業所')}｜
          {renderLink('https://fonen.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ロンシール工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.lonseal.co.jp/products/waterproof/', '商品ページ')}｜
          {renderLink('https://www.lonseal.co.jp/downloads/catalog/', 'カタログ')}｜
          {renderLink('https://www.lonseal.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.lonseal.co.jp/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アーキヤマデ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.a-yamade.co.jp/products/axis/', '商品ページ')}｜
          {renderLink('https://www.a-yamade.co.jp/data/catalog/catalog_stand/', 'カタログ')}｜
          {renderLink('https://www.a-yamade.co.jp/company/group/', '営業所')}｜
          {renderLink('https://www.a-yamade.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日本特殊塗料</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www2.nttoryo.co.jp/products/index.php/search?cell003=%E9%98%B2%E6%B0%B4%E6%9D%90&label=1', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www2.nttoryo.co.jp/company.html', '営業所')}｜
          {renderLink('https://www2.nttoryo.co.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderAsphaltWaterproof = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">アスファルト防水</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <h3 className="font-bold text-[13px] mb-1.5">【3つの工法と「臭気（しゅうき）」対策】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">最強だが臭い「熱工法（ねつこうほう）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            固形のアスファルトを現場の釜で200℃以上に溶かし、シートを貼り重ねる伝統工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            特徴: 溶けたアスファルトが隙間なく一体化するため、防水信頼性は全工法の中で最強。公共建築や新築マンションの標準。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            弱点: 施工中に強烈な<strong>「アスファルト臭と煙」</strong>が出る。住宅密集地でのリフォームで採用すると、近隣クレームが必至となるため、採用には環境確認が必須。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">火を使う「トーチ工法」</h4>
          
          <p className="mb-1 text-xs ml-3">
            アスファルトシートの裏面をバーナーで炙りながら貼る工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            釜を使わないため煙や臭いが少ない。改修工事での主力。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 職人がバーナーで炙る加減によって接着力が変わるため、熱工法に比べると職人の腕（ヒューマンエラー）に左右されやすい。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">安全な「常温（冷）工法」</h4>
          
          <p className="mb-1 text-xs ml-3">
            裏面が粘着質になっているシートを貼る、または常温の液状アスファルトで貼る工法。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            火も煙も出ないため、病院や学校など、臭いを出せない現場で選ばれる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【保護コンクリート（押さえ）の重要性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「露出（ろしゅつ）」か「保護（ほご）」か</h4>
          
          <p className="mb-1 text-xs ml-3">
            アスファルト防水層は紫外線に弱く、人が歩くと傷つく。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            保護防水: 防水層の上に<strong>「シンダーコンクリート（押さえコンクリート）」</strong>を打設して、物理的に守る仕様。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: コンクリートで守られるため、防水層自体は30年〜50年近く持つこともある。屋上広場や駐車場として利用できる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デメリット: 非常に重くなるため、木造や軽量鉄骨造には採用できない（RC造専用）。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">漏水原因が見つからない「調査の壁」</h4>
          
          <p className="mb-1 text-xs ml-3">
            保護コンクリート仕様の最大のリスクは、<strong>「雨漏りした時に場所が特定できない」</strong>こと。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            水はコンクリートの下（防水層の上）を走り回るため、室内で漏れている場所の真上が原因とは限らない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            修理するにはコンクリートをハツる（壊す）大掛かりな工事になることが多い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【改修時の「重ね張り（オーバーレイ）」】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「撤去」は最終手段</h4>
          
          <p className="mb-1 text-xs ml-3">
            アスファルト防水（特に保護コンクリートあり）を撤去しようとすると、騒音・振動・廃棄物費用が莫大になる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            基本戦略: 既存の防水層を残したまま、上から新しいアスファルト防水（またはウレタンやシート）を被せる<strong>「かぶせ工法（オーバーレイ）」</strong>が経済的かつ一般的。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ただし、すでに雨漏りしていて断熱材が水を吸っている場合は、部分的に撤去して乾燥させる必要がある。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日新工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nisshinkogyo.co.jp/product/building-waterproof/asphalt-waterproof/', '商品ページ')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/contact/product/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・田島ルーフィング</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://tajima.jp/waterproof/', '商品ページ')}｜
          {renderLink('https://tajima.actibookone.com/category/list?param=eyJjYXRlZ29yeV9udW0iOjUxODEzfQ==', 'カタログ')}｜
          {renderLink('https://tajima.jp/corporate/about/office/', '営業所')}｜
          {renderLink('https://find.tajima.jp/inquiry/company/contactus/?_gl=1*1u4b081*_gcl_au*MTI2MzcyMTM3OC4xNzQyOTc2NzU5', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日本特殊塗料</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nittoku.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nittoku.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.nittoku.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ニッタ化工品</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nitta.co.jp/product/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nitta.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nitta.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シーカ・ジャパン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://jpn.sika.com/ja/construction/roofing.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://jpn.sika.com/ja/about-us/sika-japan/offices.html', '営業所')}｜
          {renderLink('https://jpn.sika.com/ja/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderSheetWaterproof = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">シート防水</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <h3 className="font-bold text-[13px] mb-1.5">【ゴムシート防水】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「安さ」と引き換えの短寿命</h4>
          
          <p className="mb-1 text-xs ml-3">
            合成ゴム系のシートを接着剤で貼る工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            特徴: 伸縮性が高く、地震に強い。防水工法の中で最も安価だが、紫外線に弱いため、表面の保護塗料（トップコート）が劣化すると、シート自体が硬化して割れてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            耐用年数: 10年〜12年程度。こまめなトップコートの塗り替え（3〜5年ごと）が必須。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「鳥害（ちょうがい）」リスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            カラスがゴムの弾力や、シートの浮きを面白がって嘴でつつき、穴を開ける被害が報告されている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            繁殖期や遊び場になっている屋上では、ゴムシートは避けるか、保護層を設ける対策が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">継ぎ目の「接着剤」劣化</h4>
          
          <p className="mb-1 text-xs ml-3">
            シート同士の重ね目を接着剤やテープで貼り合わせるため、経年劣化で<strong>「口が開く（剥がれる）」</strong>リスクが、塩ビシートに比べて高い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【塩ビシート防水（ポリ塩化ビニル）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">メンテナンスフリーに近い「耐久性」</h4>
          
          <p className="mb-1 text-xs ml-3">
            耐候性・耐紫外線性に優れた塩ビ樹脂のシート。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: ゴムシートと違って<strong>「トップコートが不要」</strong>（素材自体が耐久性を持つ）。初期費用はゴムより高いが、ランニングコストは圧倒的に安い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            耐用年数: 15年〜20年。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">一体化する「溶着（ようちゃく）」ジョイント</h4>
          
          <p className="mb-1 text-xs ml-3">
            シート同士の継ぎ目を、熱風や溶剤で溶かして一体化させる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            接着剤のように剥がれることが物理的にないため、接合部の防水信頼性が極めて高い。プールサイドなど水が溜まる場所でも安心。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">意匠性（木目・石目）の選択肢</h4>
          
          <p className="mb-1 text-xs ml-3">
            マンションの廊下やバルコニーに使われる「長尺シート」も塩ビシートの一種。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            屋上用でも、無地だけでなく、砂利柄や幾何学模様がプリントされた製品があり、殺風景な屋上の景観を良くすることができる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【機械的固定工法（絶縁工法）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">雨漏り改修の「切り札」</h4>
          
          <p className="mb-1 text-xs ml-3">
            シートを床にベタッと貼らず、円盤状のディスク（固定金具）を使って、点々と固定して浮かせる工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 下地（コンクリート）が水分を含んでいても、湿気を逃がす空気層ができるため、「膨れ」が起きない。既存の防水層を撤去せずに上から被せられるため、改修工事の標準工法となっている。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">台風時の「バタつき音」</h4>
          
          <p className="mb-1 text-xs ml-3">
            シートが浮いているため、強風時にバタバタと波打ち、その音が室内に響くことがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            高層階や風の強い地域では、固定ディスクの間隔を狭める（増やす）などの耐風対策設計が必要。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日新工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nisshinkogyo.co.jp/product/building-waterproof/synthetic-polymer-roofing-sheet-waterproof/', '商品ページ')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/contact/product/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アーキヤマデ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.a-yamade.co.jp/products/rivet/', '商品ページ')}｜
          {renderLink('https://www.a-yamade.co.jp/data/catalog/catalog_stand/', 'カタログ')}｜
          {renderLink('https://www.a-yamade.co.jp/company/group/', '営業所')}｜
          {renderLink('https://www.a-yamade.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シーカ・ジャパン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.dyflex.co.jp/bousui/ctlg/tag-ctlg/%E5%A1%A9%E3%83%93%E3%82%B7%E3%83%BC%E3%83%88%E9%98%B2%E6%B0%B4/', '商品ページ')}｜
          {renderLink('https://www.dyflex.co.jp/bousui/ctlg/', 'カタログ')}｜
          {renderLink('https://www.dyflex.co.jp/bousui/inquiry/', '営業所')}｜
          {renderLink('https://www.dyflex.co.jp/bousui/request/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ニッタ化工品</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nitta-roofing.com/catalog/index.html', '商品ページ')}｜
          {renderLink('https://www.nitta-roofing.com/catalog/index.html', 'カタログ')}｜
          {renderLink('https://www.nitta-ci.co.jp/company/network/', '営業所')}｜
          {renderLink('https://www.nitta-ci.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・早川ゴム</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.hrc.co.jp/product/waterproof/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.hrc.co.jp/profile/place/', '営業所')}｜
          {renderLink('https://www.hrc.co.jp/contactus/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・三ツ星ベルト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://mbl-waterproofing.com/products/index.html?__hstc=197682672.a28656ae8f5831cdfd703c84c6d203e7.1750819379951.1750819379951.1750819379951.1&__hssc=197682672.3.1750819379951&__hsfp=191911065&_fsi=fdfZ8yy6', '商品ページ')}｜
          {renderLink('https://mbl-waterproofing.com/catalog/index.html', 'カタログ')}｜
          {renderLink('#', '営業所')}｜
          {renderLink('https://mbl-waterproofing.com/inquiry/index.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シバタ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sbt.co.jp/product/kenchiku/waterproofing/s-sheet.html', '商品ページ')}｜
          {renderLink('https://www.sbt.co.jp/asset/pdf/catalog/kenchiku/s-sheet_catalog_202206M.pdf', 'カタログ')}｜
          {renderLink('https://www.sbt.co.jp/company/jigyosyo/', '営業所')}｜
          {renderLink('https://www.sbt.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・田島ルーフィング</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://tajima.jp/waterproof/', '商品ページ')}｜
          {renderLink('https://tajima.actibookone.com/category/list?param=eyJjYXRlZ29yeV9udW0iOjUxODEzfQ==', 'カタログ')}｜
          {renderLink('https://tajima.jp/corporate/about/office/', '営業所')}｜
          {renderLink('https://find.tajima.jp/inquiry/company/contactus/?_gl=1*1u4b081*_gcl_au*MTI2MzcyMTM3OC4xNzQyOTc2NzU5', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ロンシール工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.lonseal.co.jp/products/waterproof/', '商品ページ')}｜
          {renderLink('https://www.lonseal.co.jp/downloads/catalog/', 'カタログ')}｜
          {renderLink('https://www.lonseal.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.lonseal.co.jp/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・住べシート防水</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sunloid-dn.jp/index.html', '商品ページ')}｜
          {renderLink('https://www.sunloid-dn.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.sunloid-dn.jp/company/office/office.html', '営業所')}｜
          {renderLink('https://www.sunloid-dn.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderFRPWaterproof = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">FRP防水</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <h3 className="font-bold text-[13px] mb-1.5">【FRP防水（繊維強化プラスチック）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「硬い」ため揺れに弱い</h4>
          
          <p className="mb-1 text-xs ml-3">
            ガラス繊維のマットをポリエステル樹脂で固めたもの。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            弱点: プラスチックのようにカチカチに固まるため、地震や木造住宅の乾燥収縮で下地が動くと、追従できずに<strong>「ひび割れ（クラック）」</strong>が入る。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            木造住宅の広いベランダ（10㎡以上など）には不向きで、広い場合は金属板金やシート防水の方が安全な場合がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「トップコート」の塗り替えサイクル</h4>
          
          <p className="mb-1 text-xs ml-3">
            表面の保護塗装（トップコート）は、紫外線で劣化して5年〜7年でヒビが入る。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            重要: ここで塗り替えれば安く済むが、放置してFRP層（ガラス繊維）が露出してしまうと、雨水が浸入して木下地を腐らせるため、メンテナンスの頻度が他の防水より高い。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">再施工（リトップ）の容易さ</h4>
          
          <p className="mb-1 text-xs ml-3">
            FRPは重ね塗りの密着性が良いため、メンテナンス時は表面を研磨して、新しい樹脂を塗り重ねるだけで新品同様の防水層が復活する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            既存防水を撤去する必要がないため、ランニングコストは比較的安く抑えられる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「防火地域」での飛び火認定</h4>
          
          <p className="mb-1 text-xs ml-3">
            樹脂（プラスチック）なので燃えやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            防火地域・準防火地域のバルコニーで使う場合は、必ず<strong>「飛び火認定（DR認定等）」</strong>を受けた不燃仕様のFRP防水を選定しないと、建築確認申請が通らない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">施工中の「スチレン臭」</h4>
          
          <p className="mb-1 text-xs ml-3">
            樹脂が硬化する際に、独特のきつい溶剤臭（シンナー臭に近いスチレン臭）が発生する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            リフォーム工事の場合、近隣から「臭い」というクレームが最も来やすい工法なので、事前の挨拶や、臭気の少ない環境配慮型樹脂の選定が必要。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アイカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.aica.co.jp/products/flooring-material/frp/', '商品ページ')}｜
          {renderLink('https://www.aica.co.jp/order/catalog/list', 'カタログ')}｜
          {renderLink('https://www.aica.co.jp/show-room/', '営業所')}｜
          {renderLink('https://www.aica.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・エフワンエヌ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://fonen.co.jp/business/mutep/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://fonen.co.jp/about/', '営業所')}｜
          {renderLink('https://fonen.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・双和化学産業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sowa-chem.co.jp/products/bousui/index.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.sowa-chem.co.jp/company/office.html', '営業所')}｜
          {renderLink('https://www.sowa-chem.co.jp/contact/index.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・大泰化工</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://daitai.co.jp/products/conpack/index.html', '商品ページ')}｜
          {renderLink('https://daitai.co.jp/products/conpack/docs/conpack_catalogue.pdf', 'カタログ')}｜
          {renderLink('https://daitai.co.jp/company/outline.html', '営業所')}｜
          {renderLink('https://daitai.co.jp/products/inquiryfaq/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・前田工繊産資</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://maedakosensanshi.jp/system/system_2fr01.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://maedakosensanshi.jp/company/company_office.html', '営業所')}｜
          {renderLink('https://maedakosensanshi.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日豊化学産業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://nippow.com/design-construction/soft-frp-method/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://nippow.com/company/#profile', '営業所')}｜
          {renderLink('https://nippow.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日本特殊塗料</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www2.nttoryo.co.jp/products/index.php/search?cell003=%E9%98%B2%E6%B0%B4%E6%9D%90&label=1', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www2.nttoryo.co.jp/company.html', '営業所')}｜
          {renderLink('https://www2.nttoryo.co.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ボース</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('http://www.both.co.jp/product_3.html', '商品ページ')}｜
          {renderLink('http://www.both.co.jp/form78both23698.html', 'カタログ')}｜
          {renderLink('http://www.both.co.jp/office.html', '営業所')}｜
          {renderLink('#', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderOtherWaterproof = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">防水 その他</h2>
        <button
          onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
        >
          <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
        </button>
        {onNavigateToRegistration ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToRegistration();
            }}
            className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]"
          >
            掲載希望はコチラ
          </a>
        ) : (
          <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
        )}
      </div>
      
      {/* 基本知識トグル */}
      {showBasicKnowledge && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <h3 className="font-bold text-[13px] mb-1.5">【ケイ酸質系（浸透性）防水】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">コンクリートを「緻密化」する技術</h4>
          
          <p className="mb-1 text-xs ml-3">
            塗膜（膜）を作るのではなく、コンクリートの内部に薬剤を浸透させ、化学反応でガラス質の結晶を作って水路を埋める工法。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            最強のメリット: コンクリートと一体化するため、「剥がれ」や「膨れ」が物理的に起きない。半永久的な防水効果が期待できる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「湿潤（しつじゅん）面」でも施工可能</h4>
          
          <p className="mb-1 text-xs ml-3">
            ウレタンやシート防水は、下地が濡れていると施工できないが、この工法は逆に<strong>「水」がないと反応しない</strong>。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            雨上がりの現場や、湧水がある地下ピット、エレベーターシャフトの防水において、唯一無二の選択肢となる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「背面水圧（はいめんすいあつ）」への対抗</h4>
          
          <p className="mb-1 text-xs ml-3">
            通常の防水は「水が入ってくる側（外）」から施工しないと水圧で剥がれる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            浸透性防水は、<strong>「水が出てくる側（内側）」</strong>から施工しても水を止めることができる数少ない工法。地下室の漏水修理の切り札。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ポリマーセメント系塗膜防水】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「水系」だから臭わない</h4>
          
          <p className="mb-1 text-xs ml-3">
            セメントと樹脂（エマルジョン）を混ぜて塗る工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            特徴: シンナーを使わないため、無臭で火気も厳禁の現場（厨房の改修や、居住中のマンション通路など）で重宝される。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            また、湿気を含んだコンクリートにも強く、タイルの上から直接塗れる製品もあるため、トイレや厨房の改修工事で多用される。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【金属防水（スカイプロムナード等）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「燃えない」バルコニー防水</h4>
          
          <p className="mb-1 text-xs ml-3">
            木造住宅のバルコニーで、FRP防水の代わりに使用される鋼板製の防水。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            最大の武器: 金属（不燃材）であるため、都市部の<strong>「防火地域」</strong>でも、特別な下地処理なしでそのまま採用できる。FRPで防火認定を取るよりもコストが安い場合が多い。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">地震で「割れない」絶縁構造</h4>
          
          <p className="mb-1 text-xs ml-3">
            防水層（金属板）を建物に密着させず、浮かせて設置する「絶縁工法」が基本。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            メリット: 地震で家が歪んでも、防水層は影響を受けないため、FRPのような<strong>「ひび割れ（クラック）」が絶対に起きない</strong>。メンテナンスフリー期間が長い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【アクリルゴム系防水（外壁防水）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">ALC外壁の標準仕様</h4>
          
          <p className="mb-1 text-xs ml-3">
            主にALCパネルの外壁塗装に使われる、非常に厚みのある弾性塗料。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            透湿性（とうしつせい）： 雨水は通さないが、壁の中の湿気（水蒸気）は外に逃がす機能がある。これにより、ALC内部の結露や、塗膜の膨れを防ぐ。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            一般的なペンキ（薄い塗膜）とは別物として扱う必要がある。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シーカ・ジャパン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://jpn.sika.com/ja/construction/roofing.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://jpn.sika.com/ja/about-us/sika-japan/offices.html', '営業所')}｜
          {renderLink('https://jpn.sika.com/ja/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日新工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nisshinkogyo.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日本特殊塗料</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nittoku.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nittoku.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.nittoku.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ニッタ化工品</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nitta.co.jp/product/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nitta.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nitta.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シーカ・ジャパン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://jpn.sika.com/ja/construction/roofing.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://jpn.sika.com/ja/about-us/sika-japan/offices.html', '営業所')}｜
          {renderLink('https://jpn.sika.com/ja/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日新工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nisshinkogyo.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nisshinkogyo.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日本特殊塗料</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nittoku.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nittoku.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.nittoku.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ニッタ化工品</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nitta.co.jp/product/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nitta.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nitta.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'ウレタン防水':
        return renderUrethaneWaterproof();
      case 'アスファルト防水':
        return renderAsphaltWaterproof();
      case 'シート防水':
        return renderSheetWaterproof();
      case 'FRP防水':
        return renderFRPWaterproof();
      case '防水その他':
        return renderOtherWaterproof();
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

export default WaterproofContent; 