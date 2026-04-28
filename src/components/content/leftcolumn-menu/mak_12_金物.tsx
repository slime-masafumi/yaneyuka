import React, { useState } from 'react';

interface HardwareContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const HardwareContent: React.FC<HardwareContentProps> = ({ subcategory, onNavigateToRegistration }) => {
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
        {/* CTAは見出し右に配置するためカード内には表示しない */}
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
          className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px]"
        >
          掲載希望はコチラ
        </a>
      ) : (
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      )}
    </div>
  );

  const renderHandleCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ハンドル</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【レバーハンドル vs ドアノブ】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「握る」から「下げる」への進化</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ドアノブ（握り玉）</strong>: 握って回す動作が必要。手が濡れていたり、荷物を持っていたり、握力の弱い高齢者には開けにくい。</li>
            <li><span className="mr-1">・</span><strong>レバーハンドル</strong>: 下げるだけで開く。指一本や肘（ひじ）でも開けられるため、現在の住宅の標準仕様は<strong>「ユニバーサルデザイン」</strong>の観点からレバー一択となっている。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">究極のUD「プッシュプルハンドル」</h4>
          
          <p className="mb-1 text-xs ml-3">
            レバーよりもさらに進化した、押す・引くの動作だけで開閉できるハンドル。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            玄関ドアだけでなく、リビングドア等に採用すると、トレーを持ったままでも体当たりで開けられるため非常に便利。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【リフォーム・交換時の「バックセット」】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">最大の失敗ポイント「バックセット寸法」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ハンドルを交換したい場合、デザインだけで選ぶと取り付けられない。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            必須確認: ドアの端から、ハンドルの回転軸中心までの距離である<strong>「バックセット（BS）」</strong>（通常51mmか60mmが多い）が合っていないと、絶対に付かない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            併せて「扉厚（ドアの厚み）」と「フロントプレート（側面の金属板）サイズ」の3点確認が交換の鉄則。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【錠前（じょうまえ）の種類と用途】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「空錠（そらじょう）」と「表示錠」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>空錠</strong>: 鍵がないタイプ。リビングや子供部屋など。</li>
            <li><span className="mr-1">・</span><strong>表示錠</strong>: トイレや脱衣所用。使用中に赤色などの表示が出て、外からコインで解錠できる非常開錠付き。</li>
            <li><span className="mr-1">・</span><strong>間仕切錠</strong>: 寝室など。内側からツマミ（サムターン）で鍵をかけられるが、表示窓はないタイプ。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            ※トイレに間違って間仕切錠をつけると「入っているかわからない」ストレスになるため、用途に合わせた選定が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【品質を見極める「ガタつき」と「垂れ」】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「戻りバネ」の有無</h4>
          
          <p className="mb-1 text-xs ml-3">
            安価なレバーハンドルは、長年使うとバネがヘタって、レバーが水平に戻らず<strong>「ダラっと垂れ下がる」</strong>現象が起きる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            良品: ハンドル内部、またはケースロック（錠ケース）側に強力な<strong>「戻りバネ」</strong>が内蔵されている製品を選ぶと、操作感がカチッとしており、何年経っても水平を保てる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【引き戸の取っ手（引手・バー）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「掘り込み引手」と「バーハンドル」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>掘り込み</strong>: 昔ながらのカップ状の窪み。指先だけで力を入れる必要があり、高齢者には重い扉が開けにくい。</li>
            <li><span className="mr-1">・</span><strong>バーハンドル</strong>: 縦長の棒状ハンドル。握って体重をかけて開けられるため、バリアフリー住宅では引き戸をバーハンドル仕様にするのが推奨される。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            ただし、引き込んだ際にバーが枠に当たるため、<strong>「有効開口寸法」</strong>が少し狭くなる点に注意。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naka-kogyo.co.jp/products/dho-34.html', '商品ページ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/download/catalog.html', 'カタログ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/company/office.html', '営業所')}｜
          {renderLink('https://mailform.naka-kogyo.co.jp/support/script/mailform/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スガツネ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://search.sugatsune.co.jp/product/arch/c/c2001/', '商品ページ')}｜
          {renderLink('https://digital-book.sugatsune.com/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=SGT00001&designID=ARCH', 'カタログ')}｜
          {renderLink('https://www.sugatsune.co.jp/showroom/', '営業所')}｜
          {renderLink('https://search.sugatsune.co.jp/product/contact/contact.aspx?_gl=1*11ybeoi*_ga*MTY2MzYwODE0OC4xNzQwMzc3NDQw*_ga_VNZXBLMNKC*MTc0MzEyMTk0Mi42LjEuMTc0MzEyMjAyMS41MS4wLjA.', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・川口技研</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawaguchigiken.co.jp/products/lever-handle', '商品ページ')}｜
          {renderLink('https://www.kawaguchigiken.co.jp/catalog', 'カタログ')}｜
          {renderLink('https://www.kawaguchigiken.co.jp/corporate/base', '営業所')}｜
          {renderLink('https://www.kawaguchigiken.co.jp/contact', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ユニオン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.artunion.co.jp/products/search.php?cid=5', '商品ページ')}｜
          {renderLink('https://www.artunion.co.jp/products/webcatalog/', 'カタログ')}｜
          {renderLink('https://www.artunion.co.jp/about_us/showroom/', '営業所')}｜
          {renderLink('https://www.artunion.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ベスト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www3.best-x.co.jp/products/case232/index.html', '商品ページ')}｜
          {renderLink('https://www3.best-x.co.jp/webcatalog.html', 'カタログ')}｜
          {renderLink('https://www3.best-x.co.jp/company/index.html#work', '営業所')}｜
          {renderLink('https://www3.best-x.co.jp/form.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・長沢製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nagasawa-mfg.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.nagasawa-mfg.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.nagasawa-mfg.co.jp/company/info/', '営業所')}｜
          {renderLink('https://www.nagasawa-mfg.co.jp/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・久力製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kuriki-ss.co.jp/search/ctg01000.html', '商品ページ')}｜
          {renderLink('https://www.kuriki-ss.co.jp/datasheet/index.html', 'カタログ')}｜
          {renderLink('https://www.kuriki-ss.co.jp/company/index.html', '営業所')}｜
          {renderLink('https://www.kuriki-ss.co.jp/form/index.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・カワジュン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawajun.jp/hw/product_cat/leverhandle', '商品ページ')}｜
          {renderLink('https://hw.kawajun.jp/catalog/', 'カタログ')}｜
          {renderLink('https://hw.kawajun.jp/showroom/', '営業所')}｜
          {renderLink('https://hw.kawajun.jp/faq/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・上手工作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.jo-zu-works.com/view/category/ct6', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.jo-zu-works.com/view/page/company', '営業所')}｜
          {renderLink('https://www.jo-zu-works.com/ssl/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナガイ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nagai.co.jp/main/product_cat/handle_door/', '商品ページ')}｜
          {renderLink('https://www.nagai.co.jp/support/catalog.html', 'カタログ')}｜
          {renderLink('https://www.nagai.co.jp/company/office.html', '営業所')}｜
          {renderLink('https://www.nagai.co.jp/first/formail/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・神栄ﾎｰﾑｸﾘｴｲﾄ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shinyei-shc.co.jp/product/doorhandle/doorhandle.html', '商品ページ')}｜
          {renderLink('https://www.shinyei-shc.co.jp/product/catalog/catalog.html', 'カタログ')}｜
          {renderLink('https://www.shinyei-shc.co.jp/office.html', '営業所')}｜
          {renderLink('https://www.shinyei-shc.co.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シブタニ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shibutani.co.jp/product/#prod06', '商品ページ')}｜
          {renderLink('https://www.shibutani.co.jp/catalogue/', 'カタログ')}｜
          {renderLink('https://www.shibutani.co.jp/about/company/', '営業所')}｜
          {renderLink('https://www.shibutani.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・川喜金物</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawaki-sowa.co.jp/product_search/category03', '商品ページ')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/catalogform.html', 'カタログ')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/company.html', '営業所')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シロクマ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shirokuma.co.jp/', '商品ページ')}｜
          {renderLink('https://www.shirokuma.co.jp/product/', 'カタログ')}｜
          {renderLink('https://www.shirokuma.co.jp/company/', '営業所')}｜
          {renderLink('https://www.shirokuma.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・大洋金物</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.tform.ne.jp/home/top.php?c=3', '商品ページ')}｜
          {renderLink('https://www.tform.ne.jp/catalogue/online_list.php?c=3', 'カタログ')}｜
          {renderLink('https://www.tform.ne.jp/showroom/tokyo.php?', '営業所')}｜
          {renderLink('https://www.tform.ne.jp/contact/list.php?c=3', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ジュケン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://apro1965.jp/search-doorhandle/', '商品ページ')}｜
          {renderLink('https://my.ebook5.net/apro1965/general/', 'カタログ')}｜
          {renderLink('https://apro1965.jp/about/', '営業所')}｜
          {renderLink('https://apro1965.jp/form-contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・すがたかたち</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sugatakatachi.com/', '商品ページ')}｜
          {renderLink('https://www.sugatakatachi.com/index.html#catalog', 'カタログ')}｜
          {renderLink('https://www.sugatakatachi.com/form-and-shape.html', '営業所')}｜
          {renderLink('https://www.sugatakatachi.com/order-flow.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・オプナス</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.opnus.co.jp/business/', '商品ページ')}｜
          {renderLink('https://www.opnus.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.opnus.co.jp/access/', '営業所')}｜
          {renderLink('https://www.opnus.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・クマモト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('http://k-kumamoto.ticcata.jp/products/category/list/code/38190000/', '商品ページ')}｜
          {renderLink('http://k-kumamoto.ticcata.jp/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=KMT00001&catalogId=339980000&designID=KMTD02&catalogCategoryId=&designConfirmFlg=&keyword=', 'カタログ')}｜
          {renderLink('http://www.k-kumamoto.com/corporate/office.html', '営業所')}｜
          {renderLink('http://www.k-kumamoto.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ｼﾞｬﾊﾟﾝﾓﾄﾞﾘｯｸ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.modric.co.jp/main/product/p-00.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('#', '営業所')}｜
          {renderLink('https://www.modric.co.jp/main/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderPullBarCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">引棒</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【有効開口（ゆうこうかいこう）の減少リスク】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">引き戸における最大のデメリット</h4>
          
          <p className="mb-1 text-xs ml-3">
            引き戸にバーハンドル（引棒）を採用すると、戸を全開にした時に、ハンドルが枠に当たって止まってしまう。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            結果: 一般的な掘り込み引手（カップ状の取っ手）に比べて、人が通れる幅（有効開口）が約10cm前後狭くなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            車椅子や大型家具の搬入を想定している場所では、バーハンドルを採用してはいけない（または、その分ドアを大きく設計する必要がある）。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【素材と「温度・静電気」のストレス】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">ステンレス・真鍮の「冷たさ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            金属製のバーハンドルはシャープで美しいが、熱伝導率が高いため、冬場は氷のように冷たく、夏場（直射日光下）は火傷するほど熱くなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            住宅向け: 毎日触れる玄関には、握り部分が<strong>「木製」や「本革巻き」、あるいは「樹脂コーティング」</strong>された製品を選ぶのが、ストレスを減らすためのプロの配慮。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">冬場の「バチッ」対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            金属ハンドルは静電気が逃げにくく、乾燥する時期は不快な放電が起きる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            特殊な塗装や素材で電気を逃がす<strong>「静電気防止タイプ」</strong>や、木製ハンドルを選ぶことで回避できる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ユニバーサルデザイン（UD）としての価値】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「握らなくていい」操作性</h4>
          
          <p className="mb-1 text-xs ml-3">
            縦に長い引棒は、子供から大人まで身長に関係なく、どこでも持てる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            また、握力がなくても「腕や肘を引っ掛けて」開け閉めができるため、荷物を持っている時や高齢者にとっては、小さなノブや引手よりも圧倒的に使いやすい。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工と安全性のディテール】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">ガラスドアの「破損」リスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            ガラスドアに引棒を取り付ける場合、ガラスに穴を開けて金物で挟み込む。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            重要: 金属とガラスが直接触れると割れるため、必ず<strong>「パッキン（樹脂）」</strong>を挟む必要がある。経年でパッキンが痩せるとガタつき、最悪の場合ガラスが割れるため、定期的な増し締め点検が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">指詰め防止の「クリアランス」</h4>
          
          <p className="mb-1 text-xs ml-3">
            開きドアの場合、ハンドルの位置が枠に近すぎると、ドアを開けた瞬間に枠とハンドルの間に<strong>「指を挟む」</strong>事故が起きる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            意匠的に端に寄せたい場合でも、最低限の手の厚み分（バックセット）を確保する設計が必要。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ユニオン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.artunion.co.jp/products/search.php?cid=4', '商品ページ')}｜
          {renderLink('https://www.artunion.co.jp/products/webcatalog/', 'カタログ')}｜
          {renderLink('https://www.artunion.co.jp/about_us/showroom/', '営業所')}｜
          {renderLink('https://www.artunion.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・カワジュン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawajun.jp/hw/product_cat/doorhandle', '商品ページ')}｜
          {renderLink('https://hw.kawajun.jp/catalog/', 'カタログ')}｜
          {renderLink('https://hw.kawajun.jp/showroom/', '営業所')}｜
          {renderLink('https://hw.kawajun.jp/faq/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・上手工作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.jo-zu-works.com/view/category/ct6', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.jo-zu-works.com/view/page/company', '営業所')}｜
          {renderLink('https://www.jo-zu-works.com/ssl/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・川喜金物</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawaki-sowa.co.jp/product_search/category03', '商品ページ')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/catalogform.html', 'カタログ')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/company.html', '営業所')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シロクマ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shirokuma.co.jp/', '商品ページ')}｜
          {renderLink('https://www.shirokuma.co.jp/product/', 'カタログ')}｜
          {renderLink('https://www.shirokuma.co.jp/company/', '営業所')}｜
          {renderLink('https://www.shirokuma.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ｱﾄﾑﾘﾋﾞﾝﾃｯｸ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.atomlt.com/product/knobs/', '商品ページ')}｜
          {renderLink('https://www.atomlt.com/catalog/', 'カタログ')}｜
          {renderLink('https://www.atomlt.com/company/about/about/', '営業所')}｜
          {renderLink('https://www.atomlt.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ｼﾞｬﾊﾟﾝﾓﾄﾞﾘｯｸ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.modric.co.jp/main/product/p-00.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('#', '営業所')}｜
          {renderLink('https://www.modric.co.jp/main/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderJoguHardwareCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">建具金物</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【丁番（ヒンジ）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「儀星（ぎぼし）」と「旗（はた）」の使い分け</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>儀星丁番</strong>: 羽根が噛み合っているタイプ。軸が抜けにくく、強度が高い。玄関ドアや重量ドアの標準。</li>
            <li><span className="mr-1">・</span><strong>旗丁番</strong>: 上下に分かれるタイプ。扉を上に持ち上げるだけで外せるため、施工やメンテナンス（吊り込み）が楽だが、強度は儀星に劣る。軽量な室内ドア向け。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">リフォームの救世主「3次元調整丁番」</h4>
          
          <p className="mb-1 text-xs ml-3">
            建物の歪みでドアが枠に当たったり、床を擦ったりする場合、丁番のネジを回すだけで「上下・左右・前後」に扉位置を微調整できる機能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これがないと、建具屋を呼んでドアを削る大工事になるため、近年は標準採用が必須化している。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ドアクローザー】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「パラレル型」と「スタンダード型」の絶対区分</h4>
          
          <p className="mb-1 text-xs ml-3">
            ドアを開く方向に取り付けるか、反対側に付けるかで型番が違う。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>パラレル型</strong>: 室内側（ドアが開かない側）に付ける。アームがドアと平行に畳まれるため、日本の玄関ドアの9割はこれ。</li>
            <li><span className="mr-1">・</span><strong>スタンダード型</strong>: 室外側（ドアが開く側）に付ける。アームが出っ張るため、壁に当たることがある。店舗や欧米ドア向け。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            ※間違えて発注すると取り付けられないため、現調時の確認最重要項目。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">強風対策の「バックチェック機能」</h4>
          
          <p className="mb-1 text-xs ml-3">
            風でドアが勢いよく開いて壁に激突したり、人が煽られたりするのを防ぐため、開く角度が一定を超えるとブレーキがかかる機能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ビルの屋上や風の強いエントランスでは、この機能がないとドアが破損する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【戸当たり（ドアストッパー）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">掃除が楽な「フラット（マグネット）タイプ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            昔の戸当たりは床から棒が生えており、掃除機の邪魔だったり、足の指をぶつけたりした。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            現在: 床側は数ミリの薄いプレートのみで、ドアが来ると磁石でフックが立ち上がる<strong>「フラット戸当たり」</strong>が標準。バリアフリーと清掃性を両立している。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「上枠（うわわく）付き」のメリット</h4>
          
          <p className="mb-1 text-xs ml-3">
            床に何も付けたくない場合、ドアの上枠に取り付けるタイプを採用する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            床暖房が入っていて床にビスが打てない場合や、店舗などで床をフラットに保ちたい場合の必須アイテム。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【引き戸金物（レール・戸車）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「Vレール」と「Yレール」の溝掃除</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>Vレール</strong>: 溝がV字。車輪が安定するが、ゴミが底に溜まりやすく、掃除しにくい。</li>
            <li><span className="mr-1">・</span><strong>Yレール（フラットレール）</strong>： 溝が浅く緩やか。掃除機でゴミを吸い出しやすいため、メンテナンス性で優れる。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">跳ね返りを防ぐ「デュアルソフトクローズ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            引き戸を勢いよく閉めると「バンッ」と跳ね返って少し開いてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 閉まる時だけでなく、開ける時もブレーキがかかる<strong>「双方向（デュアル）ソフトクローズ」</strong>にしておかないと、指詰め事故や、枠への衝突音を防げない。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スガツネ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://search.sugatsune.co.jp/product/arch/c/c2005/', '商品ページ')}｜
          {renderLink('https://digital-book.sugatsune.com/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=SGT00001&designID=ARCH', 'カタログ')}｜
          {renderLink('https://www.sugatsune.co.jp/showroom/', '営業所')}｜
          {renderLink('https://search.sugatsune.co.jp/product/contact/contact.aspx?_gl=1*11ybeoi*_ga*MTY2MzYwODE0OC4xNzQwMzc3NDQw*_ga_VNZXBLMNKC*MTc0MzEyMTk0Mi42LjEuMTc0MzEyMjAyMS41MS4wLjA.', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アトムリビンテック</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.atomlt.com/products/', '商品ページ')}｜
          {renderLink('https://www.atomlt.com/catalog/', 'カタログ')}｜
          {renderLink('https://www.atomlt.com/showroom/', '営業所')}｜
          {renderLink('https://www.atomlt.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・久力製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kuriki-ss.co.jp/products/index.html', '商品ページ')}｜
          {renderLink('https://www.kuriki-ss.co.jp/datasheet/index.html', 'カタログ')}｜
          {renderLink('https://www.kuriki-ss.co.jp/company/index.html', '営業所')}｜
          {renderLink('https://www.kuriki-ss.co.jp/form/index.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ハウディー</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.howdy-inc.com/lineup/door_hardware', '商品ページ')}｜
          {renderLink('https://www.howdy-inc.com/catalog#shouhin', 'カタログ')}｜
          {renderLink('https://www.howdy-inc.com/room', '営業所')}｜
          {renderLink('https://www.howdy-inc.com/contact', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderShelfHookCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">棚・フック他</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【可動棚レール（棚柱・ガチャ柱）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">業界標準「ロイヤル」の互換性</h4>
          
          <p className="mb-1 text-xs ml-3">
            壁に埋め込むスリット（棚柱）は、トップシェアメーカー<strong>「ロイヤル」</strong>の製品が事実上の標準。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: ホームセンターの安価な製品や他社製品とは、爪のピッチ（間隔）や厚みが微妙に異なり、互換性がないことが多い。「棚板を買い足したら入らなかった」というトラブルを防ぐため、ロイヤル製で統一するのが無難。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「石膏ボードアンカー」は禁止</h4>
          
          <p className="mb-1 text-xs ml-3">
            本棚や食器棚として使う場合、総重量は数十キロになる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            石膏ボード用アンカーは「引き抜き」にはある程度耐えるが、棚のような「せん断荷重（下方向へのズレ）」には弱く、ボードごと崩れ落ちる危険がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 必ず<strong>「間柱（まばしら）」を狙ってビスを打つか、壁全面に「合板（コンパネ）12mm以上」</strong>の下地を入れておくことがプロの施工条件。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ハンガーパイプ（クローゼット）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「1000mm」の限界</h4>
          
          <p className="mb-1 text-xs ml-3">
            服を掛けたハンガーパイプは、幅が広すぎると中央が弓なりにたわんでしまう。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            鉄則: パイプの直径にもよるが、支えなしで飛ばせる幅（スパン）は最大1000mm〜1200mmが限界。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これを超える幅のクローゼットを作る場合は、必ず中間に<strong>「センターブラケット（吊り金具）」</strong>を入れて補強しないと、パイプが曲がって外れてしまう。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「楕円（だえん）」と「丸」の強度差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>丸パイプ</strong>: 一般的だが、下方向への荷重に弱い。</li>
            <li><span className="mr-1">・</span><strong>楕円パイプ</strong>: 縦に長い形状のため、下方向への荷重に強く、たわみにくい。ハンガーの収まりも良いため、クローゼットでは楕円が推奨される。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【フック・コート掛け】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">使わない時は隠す「収納式フック」</h4>
          
          <p className="mb-1 text-xs ml-3">
            玄関や廊下にフックが出っ張っていると、服や体が引っかかり危険。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 使用時だけフックを引き出し、普段はフラットになる<strong>「収納式（可動式）フック」</strong>（カワジュン製などが有名）を選ぶと、デザイン性と安全性を両立できる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「バッグ」の重さを侮らない</h4>
          
          <p className="mb-1 text-xs ml-3">
            「帽子掛け」程度のつもりで設置しても、ユーザーは重い通勤バッグや濡れたコートを掛けることがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            フック一つであっても、石膏ボードアンカー施工は避け、必ず下地がある場所に設置するのがクレーム回避の基本。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【棚受けダボ（棚ピン）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">地震で棚板が飛ばない「耐震ダボ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            通常のダボは棚板を乗せているだけなので、地震の縦揺れで棚板が飛び出し、上の物が落下する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            安全対策: 棚板をクリップで挟み込んだり、溝に引っ掛けたりしてロックする<strong>「耐震ダボ」</strong>を採用することで、棚板の脱落を防ぎ、避難経路を確保できる。造作家具では標準仕様にすべき部品。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ロイヤル</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.royal-co.net/products/', '商品ページ')}｜
          {renderLink('https://www.royal-co.net/catalog/', 'カタログ')}｜
          {renderLink('https://www.royal-co.net/company/', '営業所')}｜
          {renderLink('https://www.royal-co.net/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スガツネ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sugatsune.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.sugatsune.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.sugatsune.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.sugatsune.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・カワジュン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawajun.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.kawajun.jp/company/', '営業所')}｜
          {renderLink('https://www.kawajun.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderSanitaryCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">サニタリー金物</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【ペーパーホルダー（紙巻器）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">現代の必須機能「スマホ棚」</h4>
          
          <p className="mb-1 text-xs ml-3">
            一昔前はペーパーを切る機能だけだったが、現在は<strong>「棚付き（シェルフ付き）」</strong>が標準になりつつある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            理由: トイレにスマホを持ち込む習慣が定着したため、一時置き場がないと、ポケットから落ちて水没する事故が多発する。実用面で最も感謝される機能。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「2連（ダブル）」による管理コスト削減</h4>
          
          <p className="mb-1 text-xs ml-3">
            予備のペーパーをホルダーにセットできる2連タイプ。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            メリット: 使用中に紙切れになる恐怖をなくすだけでなく、ストックを別の棚から出す手間が省けるため、家事（補充頻度）を減らす効果がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ワンハンドカット」の有無</h4>
          
          <p className="mb-1 text-xs ml-3">
            片手でペーパーを押さえなくても、ミシン目でスパッと切れる機能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            バネのついた紙押さえ板の精度で決まる。デザイン重視の輸入金物（アイアン製など）にはこの機能がないことが多く、毎回両手を使わなければならないストレスが発生する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【タオル掛け（タオルリング・レール）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「手摺（てすり）」代わりの使用厳禁</h4>
          
          <p className="mb-1 text-xs ml-3">
            高齢者や子供は、立ち上がる際についタオル掛けを掴んで体重をかけてしまう。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: 通常のタオル掛けは耐荷重数kg程度。石膏ボードアンカーで留まっているだけの場合、体重をかけると壁ごと毟り取れて転倒する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 掴まる可能性がある場所には、最初から「手摺兼用のタオル掛け（高耐荷重タイプ）」を選ぶか、強固な下地を入れておく必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「リング」と「バー」の乾きやすさ</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>タオルリング</strong>: 省スペースだが、タオルが重なって乾きにくく、壁紙が濡れてカビやすい。</li>
            <li><span className="mr-1">・</span><strong>タオルバー</strong>: 壁から離して広げて干せるため、乾燥が早く衛生的。スペースが許すならバータイプ、特に壁から5cm以上離れる製品が推奨される。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【素材と仕上げ（メッキ・塗装）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「クローム」と「ヘアライン」の掃除頻度</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>クロームメッキ（鏡面）</strong>： ピカピカで高級感があるが、水滴の跡（カルキ汚れ）や指紋が非常に目立つ。こまめな拭き掃除が必要。</li>
            <li><span className="mr-1">・</span><strong>ヘアライン・サテン（梨地）</strong>: つや消し仕上げ。水垢や小傷が目立ちにくいため、ズボラな運用でも美観を保ちやすい。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">浴室用金物の「材質指定」</h4>
          
          <p className="mb-1 text-xs ml-3">
            洗面所用（屋内用）の金物を浴室につけると、湿気と洗剤で数ヶ月で錆びる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 浴室には必ず、ステンレス（SUS304）か、厚い樹脂コーティングが施された<strong>「浴室対応品」</strong>を選定しなければならない。真鍮（しんちゅう）や鉄製品は基本的にNG。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ランドリーパイプ（浴室物干し）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">濡れた洗濯物の「重さ」と下地</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴室換気乾燥機を使う場合、ランドリーパイプには濡れたジーンズやバスタオルなど、10kg近い荷重がかかる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ユニットバスの壁パネルは薄いため、専用の補強裏板が入っていない場所に後付けすると、パイプが脱落する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必ずユニットバス発注時にオプションでつけるか、リフォーム時は柱の位置を正確に狙う必要がある。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・TOTO</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.toto.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.toto.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.toto.co.jp/showroom/', '営業所')}｜
          {renderLink('https://www.toto.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・LIXIL</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.lixil.co.jp/lineup/toiletroom/', '商品ページ')}｜
          {renderLink('https://www.lixil.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.lixil.co.jp/showroom/', '営業所')}｜
          {renderLink('https://www.lixil.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・カワジュン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawajun.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.kawajun.jp/company/', '営業所')}｜
          {renderLink('https://www.kawajun.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderFurnitureHardwareCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">家具金物</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【スライド丁番（隠し丁番）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「かぶせ量」の3タイプ（全・半・インセット）</h4>
          
          <p className="mb-1 text-xs ml-3">
            家具の側板（側面の板）に対して、扉がどう被さるかで金具が全く異なる。ここを間違えると扉が付かない。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>全かぶせ（18mmかぶせ）</strong>: 側板を完全に隠す。1枚扉の家具用。</li>
            <li><span className="mr-1">・</span><strong>半かぶせ（5〜9mmかぶせ）</strong>: 側板の半分に乗る。連続する扉（ロッカー等）の真ん中の仕切り用。</li>
            <li><span className="mr-1">・</span><strong>インセット（かぶせなし）</strong>: 側板の内側に扉が収まる。デザイン性が高いが、隙間調整がシビア。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「ダンパー内蔵」が現在の標準</h4>
          
          <p className="mb-1 text-xs ml-3">
            以前は「パタン！」と閉まるのが普通だったが、現在は閉まる直前にブレーキがかかり、ゆっくり静かに閉まる<strong>「ソフトクローズ（ダンパー付）」</strong>が標準仕様。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            後付け: 古い丁番でも、ダンパーパーツだけを後付けできる製品（ブルム社やスガツネ製）があるため、リフォーム時の提案として喜ばれる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「35φ」と「40φ」のカップ径</h4>
          
          <p className="mb-1 text-xs ml-3">
            扉側に掘り込む穴の直径。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            一般的な家具は<strong>35mm（35φ）だが、大型で重い扉や、厚い扉には40mm（40φ）</strong>を使う。交換時はこの穴径の計測が第一歩。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【スライドレール（引き出しレール）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「3段引き（フルオープン）」と「2段引き」の差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>2段引き（3/4スライド）</strong>： レールが途中までしか出ない。奥の物が取り出しにくい。安価。</li>
            <li><span className="mr-1">・</span><strong>3段引き（完全スライド）</strong>: 引き出しが筐体から完全に外に出るまで引き出せる。収納力が100%活かせるため、キッチンの引き出しなどは必ずこちらを指定する。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「底付け」と「横付け」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>横付け</strong>: 引き出しの側面に付ける。動きがスムーズで耐荷重が高い。現在の主流。</li>
            <li><span className="mr-1">・</span><strong>底付け</strong>: 引き出しの底の角に付けるローラー式。安価だが、重いと動きが渋くなり、ガタつきやすい。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「プッシュオープン」の利便性</h4>
          
          <p className="mb-1 text-xs ml-3">
            取っ手を付けず、前板を押すと飛び出してくるレール。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デザインをシンプルにできる（ノイズレス）ほか、手が濡れている時や汚れている時に、膝や腰で押して開けられるため、キッチンや洗面所で重宝される。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【耐震ラッチ（感知式ロック）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「揺れ」を感知してロック</h4>
          
          <p className="mb-1 text-xs ml-3">
            地震の際、吊り戸棚から食器が飛び出してくるのを防ぐ金具。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            必須: 特にキッチンの吊り戸棚や、寝室の頭上にある収納には、標準で装備すべき安全装置。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            解除: 揺れが収まると自動でロックが解除されるタイプと、扉を押し込んで解除するタイプがある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ステー（扉の開閉補助）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">指挟み防止の「ソフトダウンステー」</h4>
          
          <p className="mb-1 text-xs ml-3">
            おもちゃ箱やベンチ収納など、上向きに開く蓋（上蓋）に使う。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            手を離してもバタンと閉まらず、ゆっくり降りてくるため、子供の<strong>「指挟み事故」</strong>を防ぐために必須の金物。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">開けたまま止まる「フリーストップ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            吊り戸棚などで、扉を跳ね上げた際、任意の角度でピタッと止まる機能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これがないと、扉を押さえながら物を出し入れしなければならず、非常に使い勝手が悪い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【取っ手（ツマミ・ハンドル）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">交換時の「ピッチ（穴間隔）」確認</h4>
          
          <p className="mb-1 text-xs ml-3">
            2点で留めるハンドルの場合、ネジ穴の間隔（ピッチ）が規格（96mm, 128mmなど32mm倍数が多い）で決まっている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 海外製や古い家具は特殊なピッチの場合がある。交換時は、既存の穴を隠せる座金付きを選ぶか、1点留めの「ツマミ」に変更するなどの工夫が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「出っ張り」による衝突</h4>
          
          <p className="mb-1 text-xs ml-3">
            狭い通路やキッチンで、取っ手が服やエプロンに引っかかり、怪我をしたり取っ手が折れたりする事故がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            通行の邪魔になる場所では、扉に埋め込む<strong>「掘り込み引手」や、出っ張りのない「J型手掛け（扉の上端を加工）」</strong>にするのがセオリー。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スガツネ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sugatsune.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.sugatsune.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.sugatsune.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.sugatsune.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ハーフェレジャパン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.hafele.co.jp/ja/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.hafele.co.jp/ja/company/', '営業所')}｜
          {renderLink('https://www.hafele.co.jp/ja/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・カワジュン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawajun.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.kawajun.jp/company/', '営業所')}｜
          {renderLink('https://www.kawajun.jp/contact/', 'お問い合わせ')}｜
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

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スガツネ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sugatsune.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.sugatsune.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.sugatsune.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.sugatsune.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シブタニ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shibutani.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.shibutani.co.jp/company/', '営業所')}｜
          {renderLink('https://www.shibutani.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ベスト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.bestlock.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.bestlock.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.bestlock.co.jp/company/', '営業所')}｜
          {renderLink('https://www.bestlock.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ロイヤル</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.royal-co.net/products/', '商品ページ')}｜
          {renderLink('https://www.royal-co.net/catalog/', 'カタログ')}｜
          {renderLink('https://www.royal-co.net/company/', '営業所')}｜
          {renderLink('https://www.royal-co.net/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・カワジュン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawajun.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.kawajun.jp/company/', '営業所')}｜
          {renderLink('https://www.kawajun.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderLockCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">鍵関係</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【シリンダー（鍵穴）と防犯性能】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「CP認定錠」の5分ルール</h4>
          
          <p className="mb-1 text-xs ml-3">
            警察庁などが定めた「防犯建物部品」の認定を受けた錠前。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            基準: ピッキング、ドリル破壊、バールこじ開けなどの侵入行為に対して、<strong>「5分以上耐えられる」</strong>ことが認定条件。泥棒の約7割は5分かかると侵入を諦めるというデータに基づいている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            玄関錠を選ぶ際は、カタログの「CPマーク」確認が最低条件。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「サムターン回し」対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            鍵穴（シリンダー）が頑丈でも、ドアの隙間やポストから器具を入れ、内側のツマミ（サムターン）を回されたら開いてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須機能: ツマミにスイッチが付いている<strong>「防犯サムターン」</strong>や、偏心した力がかかると空転する「空転サムターン」が標準装備されているか確認が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【キーシステム（マスターキー等）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「MK（マスターキー）」と「GMK（グランドマスターキー）」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>MK</strong>: アパート等で、各部屋の鍵は違うが、大家さんの鍵1本ですべて開けられるシステム。</li>
            <li><span className="mr-1">・</span><strong>GMK</strong>: 大規模ビル等で、複数のMKグループ（フロアごと等）をさらに1本で開けられる上位キー。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            リスク: マスターキーを1本紛失すると、セキュリティ担保のために<strong>「全戸のシリンダー交換」</strong>が必要になり、損害額が数百万円になることもある。管理体制の厳格化がセット。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">引き渡しで無効化される「コンストラクションキー（コンスキー）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            工事中に業者が使う鍵（コンスキー）は、引き渡し時に施主用の「本キー」を差し込むと、シリンダー内の構造が変化し、二度と使えなくなる仕組み。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これにより、工事後にシリンダー交換をする必要がなく、セキュリティが保たれる。現代の新築工事では標準仕様。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【電気錠・電子錠（スマートロック）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「電気錠（配線）」と「電子錠（電池）」の決定的な差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>電気錠</strong>: 扉の中に配線を通し、電源で動く。インターホン連動やオートロックシステムと連携できる。新築・大規模改修向け。信頼性が高い。</li>
            <li><span className="mr-1">・</span><strong>電子錠</strong>: 電池で動く。後付けが容易だが、電池切れリスクや、システム連携の限界がある。リフォーム向け。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            ※新築計画で「後でスマートロックにしたい」と言われた場合、扉内配線（通線ワイヤー）だけ仕込んでおかないと、後から電気錠にするのは困難。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">締め出しリスク（オートロック）</h4>
          
          <p className="mb-1 text-xs ml-3">
            自動施錠機能は便利だが、ゴミ出しなどで鍵を持たずに外に出ると締め出される。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 暗証番号や指紋、顔認証など、<strong>「物理キーがなくても開けられる」</strong>解錠方法を併用するのが、締め出し事故を防ぐセオリー。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【メンテナンスの絶対禁止事項】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「KURE 5-56（潤滑油）」はとどめを刺す</h4>
          
          <p className="mb-1 text-xs ml-3">
            鍵の回りが悪い時、市販の潤滑油（油性）をスプレーするのは絶対にNG。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            理由: 油に埃が付着して内部でヘドロ状に固まり、シリンダーが完全に動かなくなる（故障する）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            正解: 鍵穴専用の「パウダー（粉末）スプレー」を使うか、鉛筆の芯（黒鉛）を鍵に塗って抜き差しするのが正しいメンテナンス。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【トイレ・浴室錠の安全対策】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「非常解錠（ひじょうかいじょう）」機能</h4>
          
          <p className="mb-1 text-xs ml-3">
            トイレや浴室で人が倒れた際、外から開けられないと救助できない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            内鍵（表示錠）には、外側からコインやマイナスドライバーで回すと開けられる<strong>「非常解錠溝」</strong>がついている製品を選ぶのが建築基準法以前の常識。デザイン重視でこれがない輸入金物を使うと、ドアを破壊して救助することになる。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スガツネ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://search.sugatsune.co.jp/product/arch/c/c2011/', '商品ページ')}｜
          {renderLink('https://digital-book.sugatsune.com/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=SGT00001&designID=ARCH', 'カタログ')}｜
          {renderLink('https://www.sugatsune.co.jp/showroom/', '営業所')}｜
          {renderLink('https://search.sugatsune.co.jp/product/contact/contact.aspx?_gl=1*11ybeoi*_ga*MTY2MzYwODE0OC4xNzQwMzc3NDQw*_ga_VNZXBLMNKC*MTc0MzEyMTk0Mi42LjEuMTc0MzEyMjAyMS41MS4wLjA.', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ｱﾄﾑﾘﾋﾞﾝﾃｯｸ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.atomlt.com/products/', '商品ページ')}｜
          {renderLink('https://www.atomlt.com/catalog/', 'カタログ')}｜
          {renderLink('https://www.atomlt.com/showroom/', '営業所')}｜
          {renderLink('https://www.atomlt.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アルファ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kk-alpha.com/lock/', '商品ページ')}｜
          {renderLink('https://www.kk-alpha.com/lock/catalog/', 'カタログ')}｜
          {renderLink('https://www.kk-alpha.com/cp/about/', '営業所')}｜
          {renderLink('https://www.kk-alpha.com/cp/form/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・美和ロック</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.miwa-lock.co.jp/tec/products/', '商品ページ')}｜
          {renderLink('https://www.miwa-lock.co.jp/tec/products/webcatalog.html', 'カタログ')}｜
          {renderLink('https://www.miwa-lock.co.jp/corp/about.html#sct-network', '営業所')}｜
          {renderLink('https://www.miwa-lock.co.jp/tec/support/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ゴール</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.goal-lock.com/product/info/index.html', '商品ページ')}｜
          {renderLink('https://www.goal-lock.com/product/index.html', 'カタログ')}｜
          {renderLink('https://www.goal-lock.com/company/office.html', '営業所')}｜
          {renderLink('https://www.goal-lock.com/support/faq.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ヒナカ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.hinaka.co.jp/new_hp/item/list.php#%E3%83%AD%E3%83%83%E3%82%AF_%E6%8A%97%E8%8F%8C%E3%83%BB%E6%8A%97%E3%82%A6%E3%82%A3%E3%83%AB%E3%82%B9%E5%8A%A0%E5%B7%A5%E5%95%86%E5%93%81', '商品ページ')}｜
          {renderLink('https://www.hinaka.co.jp/item_catalog/', 'カタログ')}｜
          {renderLink('https://www.hinaka.co.jp/company/#list', '営業所')}｜
          {renderLink('https://www.hinaka.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・川喜金物</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kawaki-sowa.co.jp/product_search/category05', '商品ページ')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/catalogform.html', 'カタログ')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/company.html', '営業所')}｜
          {renderLink('https://www.kawaki-sowa.co.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderExpJCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">EXP.J</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【可動量（クリアランス）の計算】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「X・Y・Z軸」の動きへの追従</h4>
          
          <p className="mb-1 text-xs ml-3">
            地震時、別々の建物（A棟とB棟）は全く違う揺れ方をする。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            EXP.Jは、単に隙間を塞ぐだけでなく、「伸び縮み（クリアランス）」、「ズレ（せん断）」、<strong>「段差（上下動）」</strong>の全ての動きに追従し、壊れずに変形しなければならない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            重要: 構造計算に基づいた「相対変位量（どれだけ動くか）」をカバーできる製品を選定しないと、地震のたびにカバーがひしゃげたり、外れて落下したりする。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【屋根・外壁の「止水（しすい）」構造】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">カバーは防水ではない</h4>
          
          <p className="mb-1 text-xs ml-3">
            表面に見えている金属カバーは、あくまで雨除けや意匠であり、完全防水ではない。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            真の防水: カバーの下にある<strong>「二次止水材（止水シート・ゴム）」</strong>が命綱。ここが劣化したり、施工不良で破れたりすると、即座に室内に雨漏りする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            メンテナンス時にカバーを外して、中の止水材を点検・交換できる構造かどうかが、長期維持管理のポイント。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【床用EXP.Jの選定基準】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「歩行用」と「車路用」の耐荷重</h4>
          
          <p className="mb-1 text-xs ml-3">
            廊下なら歩行用で良いが、台車が通るバックヤードや、車が通る駐車場では、耐荷重不足による変形やガタつきが起きやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            音鳴り対策: ビスが緩むと、踏むたびに「ガチャン」と大きな金属音が鳴る。定期的な増し締めが必要だが、最初から緩み止め機構がついた製品や、ゴムクッション入りの静音タイプを選ぶとトラブルが少ない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">意匠を損なわない「同面（どうづら）納まり」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ステンレスのプレートが床を横断するのはデザイン的に嫌われる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            埋め込みタイプ: 蓋（プレート）の凹みに、床と同じタイルや石、カーペットを充填できる製品。ラインを目立たせず、空間の連続性を保てるため、ホテルやエントランスホールの標準仕様。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【免震（めんしん）EXP.Jの特殊性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「数十センチ」動く床</h4>
          
          <p className="mb-1 text-xs ml-3">
            免震建物は、地震時に地面と建物が激しくズレる（スライドする）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            そのため、免震EXP.J（可動床）は、50cm〜1m近く動いても人が落ちないような、巨大なスライドプレート構造になっている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            通常のEXP.Jとは設計思想が全く異なるため、専門メーカーとの綿密な打ち合わせが必須。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【防火区画と「耐火帯（たいかたい）」】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">火災の通り道を防ぐ</h4>
          
          <p className="mb-1 text-xs ml-3">
            EXP.Jの隙間は、火災時に煙や炎が上の階や隣の棟へ広がる煙突になってしまう。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            法的義務: 防火区画にあるEXP.Jには、隙間を塞ぐ耐火材<strong>「耐火帯（ロックウール等）」</strong>を内部に充填し、国交省の認定を受けた構造にしなければならない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            見積もり時にこの耐火帯が抜けていると、消防検査に通らず、後から莫大な追加工事費が発生する。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">免震用</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・新建材開発</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('http://www.shinkenzai.com/html/product.htm', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('http://www.shinkenzai.com/html/office.htm', '営業所')}｜
          {renderLink('http://www.shinkenzai.com/html/form.htm', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・新高製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.niitaka-ss.jp/expansion-joint/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.niitaka-ss.jp/access/', '営業所')}｜
          {renderLink('https://www.niitaka-ss.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naka-kogyo.co.jp/products/category-products/metal-products', '商品ページ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/download/catalog.html', 'カタログ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/company/office.html', '営業所')}｜
          {renderLink('https://mailform.naka-kogyo.co.jp/support/script/mailform/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・井上商事</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.inoue-s.co.jp/products/cat/al_sus_expjc02/', '商品ページ')}｜
          {renderLink('https://www.inoue-s.co.jp/cad/catalog/', 'カタログ')}｜
          {renderLink('https://www.inoue-s.co.jp/contents/company/office.html', '営業所')}｜
          {renderLink('https://www.inoue-s.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ カネソウ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kaneso.co.jp/seihin/product_03-1_mx.htm', '商品ページ')}｜
          {renderLink('https://www.kaneso.co.jp/webbook/index.htm', 'カタログ')}｜
          {renderLink('https://www.kaneso.co.jp/company/index.htm', '営業所')}｜
          {renderLink('https://www.kaneso.co.jp/contact/index.htm', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・和田装備</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.wadasoubi.com/cont6/15.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.wadasoubi.com/cont5/11.html', '営業所')}｜
          {renderLink('https://www.wadasoubi.com/form.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・平野</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('http://www.e-hirano.co.jp/expansion-joint.php', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('http://www.e-hirano.co.jp/about.php', '営業所')}｜
          {renderLink('https://docs.google.com/forms/d/e/1FAIpQLSd45TSkuAEEei79SyjdJz-LDiX4wXL3OFymhYCTW_YeMg3BtQ/viewform', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ 第一機材</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.dkc.jp/product/search?category=18', '商品ページ')}｜
          {renderLink('https://www.dkc.jp/catalog/index.html#page=1', 'カタログ')}｜
          {renderLink('https://www.dkc.jp/company.html', '営業所')}｜
          {renderLink('https://www.dkc.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">耐震用</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・井上商事</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.inoue-s.co.jp/products/cat/al_sus_expjc/', '商品ページ')}｜
          {renderLink('https://www.inoue-s.co.jp/cad/catalog/', 'カタログ')}｜
          {renderLink('https://www.inoue-s.co.jp/contents/company/office.html', '営業所')}｜
          {renderLink('https://www.inoue-s.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・理研軽金属工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.rikenkeikinzoku.co.jp/building/expjc/index.html', '商品ページ')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/catalog/index.html', 'カタログ')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/company/info/', '営業所')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/company/inquiry/index.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">非免震用</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ツヅキ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://tuzuki.co.jp/products/#jt', '商品ページ')}｜
          {renderLink('https://tuzuki.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://tuzuki.co.jp/company/branch/', '営業所')}｜
          {renderLink('https://tuzuki.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・パラキャップ社</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.palacap.co.jp/search/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.palacap.co.jp/company/', '営業所')}｜
          {renderLink('https://www.palacap.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・UACJ金属加工</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://umc.uacj-group.com/products/building_exp/', '商品ページ')}｜
          {renderLink('https://umc.uacj-group.com/download/catalog/', 'カタログ')}｜
          {renderLink('https://umc.uacj-group.com/company/network/index.html#office', '営業所')}｜
          {renderLink('https://umc.uacj-group.com/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderOtherHardwareCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">金物 その他</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【換気金物（ガラリ・レジスター）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">命を守る「FD（防火ダンパー）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            マンションやビルで、防火区画を貫通する換気口には、火災時に熱を感知して自動的に閉鎖する<strong>「FD（Fire Damper）付き」</strong>のガラリを選定する法的義務がある。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            温度ヒューズ: 一般的には「72℃」で溶けて閉まるが、厨房など火気を使う場所では誤作動を防ぐため「120℃」ヒューズを選ぶなど、場所に応じた使い分けが必須。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「防音（ぼうおん）スリーブ」の有無</h4>
          
          <p className="mb-1 text-xs ml-3">
            幹線道路沿いのマンションなどでは、換気口（レジスター）から騒音がそのまま入ってくる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 単なる筒（スリーブ）ではなく、内側に吸音材が貼られた<strong>「防音スリーブ」</strong>や、屋外フードを深型にして音を減衰させる「防音フード」をセットで採用しないと、入居後の騒音クレームになる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">24時間換気の「フィルター」メンテナンス</h4>
          
          <p className="mb-1 text-xs ml-3">
            現代の住宅は24時間換気が義務だが、給気口のフィルターが詰まると換気不足になり、結露やカビの原因になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            高い位置に設置しすぎると掃除ができないため、<strong>「手が届く高さ」</strong>に設置するか、簡単に脱着できるマグネット式フィルター等の選定が推奨される。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【カーテンレール】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「カーテンボックス」の断熱・遮光効果</h4>
          
          <p className="mb-1 text-xs ml-3">
            レールを天井や壁に直付けすると、上部に隙間ができ、そこから光が漏れたり、冷気（コールドドラフト）が降りてきたりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 天井を掘り込むか、木枠で<strong>「カーテンボックス」</strong>を作ってレールを隠すことで、遮光性と断熱性が劇的に向上し、ホテルのような高級感も出る。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">電動レールの「先行配線」</h4>
          
          <p className="mb-1 text-xs ml-3">
            吹き抜けの高い窓や、重いドレープカーテンには電動レールが便利。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 近くにコンセントがあっても、モーターの位置まで配線が届かないことが多い。設計段階で<strong>「モーター直結用の電源」</strong>をカーテンボックス内に仕込んでおく計画が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ウィンドウオペレーター（排煙・換気）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">手の届かない窓を開ける</h4>
          
          <p className="mb-1 text-xs ml-3">
            体育館や工場の高所にある窓（高窓）を、手元のハンドルやチェーンで開閉させる装置。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>排煙（はいえん）</strong>: 火災時に煙を逃がす法的義務がある窓（排煙窓）には、ワンタッチで全開になる<strong>「排煙オペレーター」</strong>が必要。</li>
            <li><span className="mr-1">・</span><strong>換気</strong>: 日常的な換気用には、任意の角度で止められる<strong>「換気オペレーター」</strong>を選ぶ。用途を混同すると、排煙窓を開けるたびに「ガチャン！」と全開になり閉めるのが大変になる。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【フロアヒンジ】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">店舗ドアの「埋め込み」クローザー</h4>
          
          <p className="mb-1 text-xs ml-3">
            コンビニやデパートの入口など、重いガラスドアやスチールドアに使われる、床に埋め込まれた開閉装置。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            特徴: ドアクローザー（上部に付く箱）が見えないため意匠性が高く、非常に重いドア（数百キロ）もスムーズに動かせる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            防水: 外部に使う場合は、内部に水が入って錆びないよう、ゴムパッキン等で密閉された<strong>「防水型」</strong>を選ばないと、数年で腐食してドアが外れる事故につながる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【構造金物（木造住宅用）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">基礎と柱をつなぐ「ホールダウン金物」</h4>
          
          <p className="mb-1 text-xs ml-3">
            地震時、柱が土台から「引き抜かれる」のを防ぐ最重要金物。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            阪神淡路大震災以降、設置基準が厳格化された。リフォーム時に壁をめくってこの金物が入っていない場合は、耐震補強の最優先ポイントとなる。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スガツネ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sugatsune.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.sugatsune.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.sugatsune.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.sugatsune.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シブタニ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shibutani.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.shibutani.co.jp/company/', '営業所')}｜
          {renderLink('https://www.shibutani.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ベスト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.bestlock.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.bestlock.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.bestlock.co.jp/company/', '営業所')}｜
          {renderLink('https://www.bestlock.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'ハンドル':
        return renderHandleCategory();
      case '引棒':
        return renderPullBarCategory();
      case '建具金物':
        return renderJoguHardwareCategory();
      case '棚フック':
        return renderShelfHookCategory();
      case 'サニタリー':
        return renderSanitaryCategory();
      case '家具金物':
        return renderFurnitureHardwareCategory();
      case '鍵関係':
        return renderLockCategory();
      case 'EXP,J':
        return renderExpJCategory();
      case '金物その他':
        return renderOtherHardwareCategory();
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

export default HardwareContent; 