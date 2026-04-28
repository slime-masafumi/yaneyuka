'use client';

import React, { useState } from 'react';

interface InternalWallContentProps {
  subcategory: string;
}

const InternalWallContent: React.FC<InternalWallContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  
  // 画像エラーハンドリング関数
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/image/掲載募集中a.png';
  };

  const handleCommercialImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/image/ChatGPT Image 2025年5月1日 16_25_41.webp';
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

  const renderContent = () => {
    switch (subcategory) {
      case '内装壁壁紙':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">壁紙</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【グレードと選定基準】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「量産品（りょうさんひん）」と「1000番台（一般品）」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>量産品</strong>: 白やベージュの無地が中心。厚みがあり、下地の凹凸を隠しやすい。施工性が高く、安価。賃貸や天井によく使われる。</li>
                  <li><span className="mr-1">・</span><strong>1000番台（AA級など）</strong>: デザイン、色、機能性が豊富。薄いものが多く、下地処理に手間がかかるため、材料費だけでなく施工費も少し高くなる。リビングやアクセントクロス向け。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「リフォーム推奨品」の本当の意味</h4>
                
                <p className="mb-1 text-xs ml-3">
                  カタログにある「リフォーム推奨」マークは、<strong>「厚みがあり、下地の凹凸が目立ちにくい」</strong>という意味。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  リフォームでは、古い壁紙を剥がした跡（裏紙の段差）が残りやすいため、薄いクロスや光沢のあるクロスを選ぶと、照明の当たり方で下地のボコボコが丸見えになり、クレームになりやすい。リフォーム時は「厚手のマットなクロス」を選ぶのが鉄則。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【機能性壁紙の寿命と効果】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「消臭」「抗菌」等の効果は永久ではない</h4>
                
                <p className="mb-1 text-xs ml-3">
                  表面に薬剤をコーティングしているタイプの機能性壁紙（消臭、抗アレルゲンなど）は、約5年〜10年で効果が薄れると言われている（環境による）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  永久的な効果を期待するなら、素材そのものの性質を利用した「珪藻土クロス」や「調湿タイル（エコカラット等）」を検討すべき。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「表面強化（ハードタイプ）」の耐久性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ペットや子供がいる家庭では、爪や擦れに強い「表面強化」クロスが必須。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  一般的なビニルクロスに比べて表面硬度が高く、傷がつきにくいが、硬いために施工時の「ジョイント（継ぎ目）」が目立ちやすい傾向がある。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【特殊素材クロス】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「織物（布）クロス」の高級感と施工難易度</h4>
                
                <p className="mb-1 text-xs ml-3">
                  自然素材の布を使ったクロス。通気性があり、独特の温かみと高級感がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 施工が非常に難しく（ジョイントが目立つ、糊が染み出す）、施工できる職人が限られる。また、水拭きができないためメンテナンスには注意が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「珪藻土・紙クロス」の自然素材感</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ビニルクロス特有のテカリがなく、マットで落ち着いた風合い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  デメリット: 施工時に糊の水分で伸び縮みしやすく、ジョイントが開きやすい。また、表面が柔らかいため傷がつきやすく、汚れを拭き取りにくい。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【アクセントクロスの失敗回避】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「濃い色」のジョイント処理</h4>
                
                <p className="mb-1 text-xs ml-3">
                  紺や黒などの濃い色のクロスは、継ぎ目（ジョイント）の断面の「白い線」が見えてしまうことがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 施工時に、ジョイント部分に色付きのコークボンドを入れるか、職人に断面をタッチアップしてもらうなどの配慮が必要。
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
              <span className="w-[180px]">・サンゲツ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sangetsu.co.jp/product/?wall_type_wall#search02', '商品ページ')}｜
                {renderLink('https://www.sangetsu.co.jp/digital_book/wall.html', 'カタログ')}｜
                {renderLink('https://www.sangetsu.co.jp/showroom/', '営業所')}｜
                {renderLink('https://qa.sangetsu.co.jp/public/?_gl=1*1064n3w*_ga*MTkzMTUxODg4Ny4xNzMwMTAyOTY3*_ga_84EXXWDYNY*MTc0Mjk3NTAwOC4xNS4xLjE3NDI5NzUxMTMuNDQuMC4w&_ga=2.177791526.262530188.1742899184-1931518887.1730102967', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東リ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toli.co.jp/product/search/wall_result?list=1', '商品ページ')}｜
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
                {renderLink('https://www.lilycolor.co.jp/interior/search/?cat=wall', '商品ページ')}｜
                {renderLink('https://www.lilycolor.co.jp/interior/catalog/', 'カタログ')}｜
                {renderLink('https://www.lilycolor.co.jp/company/about/office.html', '営業所')}｜
                {renderLink('https://www.lilycolor.co.jp/company/ir/faq/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・トキワ産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tokiwa.net/', '商品ページ')}｜
                {renderLink('https://www.tokiwa.net/digicatalog/wallpaper.php', 'カタログ')}｜
                {renderLink('#', '営業所')}｜
                {renderLink('https://www.tokiwa.net/contactlist/contact/?id=2', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・シンコール</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sincol.co.jp/products/wallcvr.html', '商品ページ')}｜
                {renderLink('https://www.sincol.co.jp/digicata/index.html', 'カタログ')}｜
                {renderLink('https://www.sincol.co.jp/showroom.html', '営業所')}｜
                {renderLink('https://www.sincol.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ルノン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://ssl.runon.co.jp/product/', '商品ページ')}｜
                {renderLink('https://ssl.runon.co.jp/samplebook/wallcoverings.php', 'カタログ')}｜
                {renderLink('https://ssl.runon.co.jp/company/04.php', '営業所')}｜
                {renderLink('https://ssl.runon.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ニップコーポレーション</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nip-co.co.jp/catalog/crea3/', '商品ページ')}｜
                {renderLink('https://www.nip-co.co.jp/catalog/crea3/', 'カタログ')}｜
                {renderLink('https://www.nip-co.co.jp/corporate/network/', '営業所')}｜
                {renderLink('https://www.nip-co.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ナガイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagai.co.jp/main/product_cat/kabe_naisou/', '商品ページ')}｜
                {renderLink('https://www.nagai.co.jp/support/catalog.html', 'カタログ')}｜
                {renderLink('https://www.nagai.co.jp/company/office.html', '営業所')}｜
                {renderLink('https://www.nagai.co.jp/first/formail/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・睦屋</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.mutsumi-ya.com/brand/cat4.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.mutsumi-ya.com/showroom/', '営業所')}｜
                {renderLink('https://www.mutsumi-ya.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・SAIN</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.sain-int.co.jp/brand/vescom/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('http://www.sain-int.co.jp/showroom/tokyo.html', '営業所')}｜
                {renderLink('http://www.sain-int.co.jp/que/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・GSタカハシ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.gs-takahashi.co.jp/airwash.html', '商品ページ')}｜
                {renderLink('https://www.gs-takahashi.co.jp/original.html', 'カタログ')}｜
                {renderLink('https://www.gs-takahashi.co.jp/outline.html', '営業所')}｜
                {renderLink('https://www.gs-takahashi.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・野原グループ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://whohw.jp/about/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://whohw.jp/company/', '営業所')}｜
                {renderLink('https://whohw.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装壁化粧板':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">化粧板</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【メラミン化粧板とポリ合板の決定的な違い】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">最強の強度「高圧メラミン化粧板」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  樹脂を含浸させた紙を何層も重ねて高温高圧でプレスした板。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  特徴: 表面硬度が非常に高く、硬貨で擦っても傷がつかない。耐熱性・耐水性も最強クラス。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  用途: テーブルの天板や、台車がぶつかる店舗の腰壁、トイレブースなど、ハードな環境に使われる。価格は高い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  施工難易度: 非常に硬いため、現場でのカットが難しく、専用のチップソーがないと切り口が欠ける（チップする）リスクがある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">コストパフォーマンスの「ポリエステル化粧合板（ポリ合板）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  合板の表面に化粧紙とポリエステル樹脂を塗布したもの。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  特徴: メラミンに見た目は似ているが、表面強度は劣る（傷つきやすい）。しかし、安価で加工がしやすいため、収納の扉や棚板、あまり手が触れない壁面などで主力として使われる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  見分け方: 断面を見ると、メラミンは表面に黒や茶色の硬い層（フェノール層）があるが、ポリは薄い層しかない。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【キッチンパネル（不燃化粧板）】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「タイル」から「パネル」への移行</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔のキッチン壁はタイルが主流だったが、目地の油汚れ掃除が大変なため、現在は大判の<strong>「キッチンパネル」</strong>が標準。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  素材: メラミン不燃板、ホーロー（金属ベース）、ステンレスなどがある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「マグネット」がつくか否か</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ホーローパネル（タカラスタンダード等）</strong>: 鉄がベースなので磁石がくっつく。収納の自由度が高いため人気。</li>
                  <li><span className="mr-1">・</span><strong>メラミン不燃板（アイカ等）</strong>: 通常は磁石がつかない。ただし、最近は鉄箔を挟み込んで磁石対応にした製品も出ているため、事前のスペック確認が重要。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「ジョイナー」か「コーキング」か</h4>
                
                <p className="mb-1 text-xs ml-3">
                  パネル同士の継ぎ目の処理方法。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>ジョイナー</strong>: プラスチックやアルミの細い棒（見切り材）を入れる。施工は早いが、ラインが目立つ。</li>
                  <li><span className="mr-1">・</span><strong>コーキング</strong>: 目地材を充填する。フラットで綺麗だが、職人の腕が必要で、経年で汚れやすい。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【プリント合板（プリント紙）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「テープ剥がれ」のリスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木目を印刷した薄い紙を貼っただけの安価な合板。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 表面強度が弱く、セロハンテープや養生テープを貼って剥がすと、表面の柄ごと剥がれてしまうことがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  賃貸や押し入れの中などで使われるが、リフォーム時の養生には細心の注意が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【規格サイズと「木目方向」】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「サブロク（3×6）」と「シハチ（4×8）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  化粧板には定尺（決まったサイズ）がある。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>3×6（サブロク）</strong>: 910mm × 1820mm。畳1畳分。基本サイズ。</li>
                  <li><span className="mr-1">・</span><strong>4×8（シハチ）</strong>: 1210mm × 2420mm。天井が高い場所や、幅広の壁面で継ぎ目を減らしたい時に使う。サイズが大きくなると搬入経路の確保が必要になる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">木目の向き（タテ・ヨコ）</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木目柄の場合、長手方向に木目が流れるのが基本だが、製品によっては<strong>「横木目（ヨコ目）」</strong>の商品もある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  発注時に品番を間違えると、木目の向きが合わずに施工不可となるため、品番の末尾記号などで確認が必須。
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
                {renderLink('https://www.daiken.jp/buildingmaterials/wall/', '商品ページ')}｜
                {renderLink('https://www.daiken.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.daiken.jp/showroom/', '営業所')}｜
                {renderLink('https://faq.daiken.jp/faq/show/948?site_domain=user', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アイカ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.aica.co.jp/products/veneer/melamine/', '商品ページ')}｜
                {renderLink('https://www.aica.co.jp/order/catalog/list', 'カタログ')}｜
                {renderLink('https://www.aica.co.jp/company/profile/hub/sales_office/', '営業所')}｜
                {renderLink('https://www.aica.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・イビケン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ibiboard.jp/product/#plates', '商品ページ')}｜
                {renderLink('https://www.ibiboard.jp/pattern/catalog_list.php?mode=search_refine&search_mode=search_book', 'カタログ')}｜
                {renderLink('https://www.ibiken.co.jp/company/profile.html', '営業所')}｜
                {renderLink('https://www.ibiboard.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・イクタ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://ikuta.co.jp/products/wallseries/', '商品ページ')}｜
                {renderLink('https://www.catalabo.org/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=CATALABO&catalogId=78253310000&pageGroupId=1&catalogCategoryId=&keyword=', 'カタログ')}｜
                {renderLink('https://ikuta.co.jp/about/', '営業所')}｜
                {renderLink('https://ikuta.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本デコラックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.decoluxe.co.jp/product/product_category/plates-1/', '商品ページ')}｜
                {renderLink('https://www.decoluxe.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.decoluxe.co.jp/company/', '営業所')}｜
                {renderLink('https://www.decoluxe.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・恩加島木材工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.okajimawood.co.jp/products/kdpanel/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.okajimawood.co.jp/corporate_info/', '営業所')}｜
                {renderLink('https://www.okajimawood.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大日本印刷 </span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://livingspace.dnp.co.jp/product/brand/brand06/', '商品ページ')}｜
                {renderLink('https://sc.livingspace.dnp.co.jp/category/901_CATALOG/', 'カタログ')}｜
                {renderLink('https://livingspace.dnp.co.jp/showroom/', '営業所')}｜
                {renderLink('https://livingspace.dnp.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装壁化粧シート':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">化粧シート</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【化粧シート（塩ビフィルム）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ダイノック」は商品名だが代名詞</h4>
                
                <p className="mb-1 text-xs ml-3">
                  正式には「粘着剤付き化粧フィルム」。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  3M社の「ダイノック」、サンゲツの「リアテック」、シーアイ化成の「ベルビアン」などが有名だが、現場ではこれらを総称して<strong>「ダイノック」</strong>と呼ぶことが多い（バンドエイドと同じ現象）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  特徴: 本物の木や石、金属の質感をリアルに再現しており、壁紙（クロス）よりも圧倒的に強度・耐水性・耐摩耗性が高い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">命運を握る「プライマー（下地処理剤）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  裏に糊がついているシール状の素材だが、そのまま貼ると後で剥がれてくる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  鉄則: 端部や角、重ね合わせ部分には、必ず接着力を高める<strong>「プライマー」</strong>を塗布しなければならない。この工程を省く（手抜きする）と、数ヶ月で端からめくれてくる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">クロス職人ではなく「フィルム職人」の領域</h4>
                
                <p className="mb-1 text-xs ml-3">
                  壁紙（クロス）と似ているが、施工技術は全く別物。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  一度貼ると貼り直しが効かない（クロスは糊が乾く前なら動かせる）ため、専門の<strong>「ダイノック職人（フィルム屋）」</strong>に依頼しないと、気泡だらけになったり、角の処理が汚くなったりする。施工費はクロスより遥かに高い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ドライヤーで伸ばす「三次曲面（さんじきょくめん）」施工</h4>
                
                <p className="mb-1 text-xs ml-3">
                  化粧板（メラミン等）との最大の違いは、<strong>「熱で伸びる」</strong>こと。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ヒートガン（強力なドライヤー）で温めることで柔らかくなり、曲面や複雑な形状の枠にもシワなく追従して貼ることができる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">リフォームの切り札「上貼り（うわばり）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  古くなったドア、穴の空いた枠、色が気に入らないキッチン扉などを、交換せずに新品同様に蘇らせることができる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 下地の凹凸を極端に拾うため、傷がある場合はパテ処理でツルツルにする下地調整費が別途かかる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「浴室」や「屋外」も対応可能</h4>
                
                <p className="mb-1 text-xs ml-3">
                  水に強いため、ユニットバスの壁や天井のリフォームにも使われる（浴室用フィルム）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  また、耐候性の高い「屋外用グレード」を選べば、ビルの外装や玄関ドアの表面リフォームにも使用可能。用途に合わせた品番選定が必須。
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
              <span className="w-[180px]">・サンゲツ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sangetsu.co.jp/product/?wall', '商品ページ')}｜
                {renderLink('https://www.sangetsu.co.jp/digital_book/wall.html', 'カタログ')}｜
                {renderLink('https://www.sangetsu.co.jp/showroom/', '営業所')}｜
                {renderLink('https://qa.sangetsu.co.jp/public/?_gl=1*1064n3w*_ga*MTkzMTUxODg4Ny4xNzMwMTAyOTY3*_ga_84EXXWDYNY*MTc0Mjk3NTAwOC4xNS4xLjE3NDI5NzUxMTMuNDQuMC4w&_ga=2.177791526.262530188.1742899184-1931518887.1730102967', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・東リ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toli.co.jp/product/search/wall_result?list=1', '商品ページ')}｜
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
                {renderLink('https://www.lilycolor.co.jp/interior/search/?cat=wall', '商品ページ')}｜
                {renderLink('https://www.lilycolor.co.jp/interior/catalog/', 'カタログ')}｜
                {renderLink('https://www.lilycolor.co.jp/company/about/office.html', '営業所')}｜
                {renderLink('https://www.lilycolor.co.jp/company/ir/faq/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・トキワ産業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.tokiwa.net/', '商品ページ')}｜
                {renderLink('https://www.tokiwa.net/digicatalog/decorativefilm.php', 'カタログ')}｜
                {renderLink('#', '営業所')}｜
                {renderLink('https://www.tokiwa.net/contactlist/contact/?id=2', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アイカ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.aica.co.jp/products/film/altyno/', '商品ページ')}｜
                {renderLink('https://www.aica.co.jp/order/catalog/list', 'カタログ')}｜
                {renderLink('https://www.aica.co.jp/company/profile/hub/sales_office/', '営業所')}｜
                {renderLink('https://www.aica.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・３Ｍジャパン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.3mcompany.jp/3M/ja_JP/architectural-design-jp/', '商品ページ')}｜
                {renderLink('https://3m.icata.net/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=TMJ00001&catalogId=2519580000&pageGroupId=1&designID=JAJP&catalogCategoryId=&designConfirmFlg=&pagePosition=R', 'カタログ')}｜
                {renderLink('https://www.3mcompany.jp/3M/ja_JP/company-jp/about-3m/resources/', '営業所')}｜
                {renderLink('https://www.3mcompany.jp/3M/ja_JP/architectural-design-jp/support/contact-us/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・野原グループ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://whohw.jp/series/interior_sheet/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://whohw.jp/company/', '営業所')}｜
                {renderLink('https://whohw.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・タキロンシーアイ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.belbien.net/about/index.html', '商品ページ')}｜
                {renderLink('https://www.belbien.net/catalog/index.html', 'カタログ')}｜
                {renderLink('https://www.takiron-ci.co.jp/corporate/office/', '営業所')}｜
                {renderLink('https://www.belbien.net/inquiry/input.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大日本印刷 </span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://livingspace.dnp.co.jp/product/brand/brand01/', '商品ページ')}｜
                {renderLink('https://sc.livingspace.dnp.co.jp/category/101_WS/', 'カタログ')}｜
                {renderLink('https://livingspace.dnp.co.jp/showroom/', '営業所')}｜
                {renderLink('https://livingspace.dnp.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・リンテックサインシステム</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sign-japan.com/html/product.html', '商品ページ')}｜
                {renderLink('https://www.paroi.jp/html/paroi/catalog.html', 'カタログ')}｜
                {renderLink('https://www.sign-japan.com/html/list.html', '営業所')}｜
                {renderLink('https://www.sign-japan.com/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装壁化粧パネル':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">化粧パネル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【化粧石膏ボード（点付きボード）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「クロス工事不要」の最強時短建材</h4>
                
                <p className="mb-1 text-xs ml-3">
                  石膏ボードの表面に、あらかじめ化粧紙（柄のついた紙）が貼られている製品（吉野石膏「タイガービニル化粧板」など）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 壁を立ててビスで留めるだけで仕上がるため、パテ処理やクロス貼りの工程が不要。バックヤード、倉庫、貸事務所の給湯室などで圧倒的なシェアを持つ。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">避けられない「目地（めじ）」のライン</h4>
                
                <p className="mb-1 text-xs ml-3">
                  突きつけ施工となるため、パネル同士の継ぎ目に必ず<strong>「Ｖ目地（面取り）」</strong>のラインが入る。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  フラットな壁にはならないため、高級感を求める場所には不向き。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  補修困難: 傷がついたり汚れたりした場合、部分的な補修ができない（パネルごとの交換になる）ため、住宅の居室にはあまり使われない。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【セメント系デザインパネル（SOLIDOなど）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「白華（はっか）」を許容できるか</h4>
                
                <p className="mb-1 text-xs ml-3">
                  セメントや再生資源を原料とした素材感のあるパネル（ケイミュー「SOLIDO」など）がカフェやモダン住宅で大人気。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: セメント由来のため、経年で表面に白い粉が浮き出る<strong>「白華現象（エフロレッセンス）」</strong>が起こりやすい。これを「劣化」ではなく「素材の味（経年変化）」として楽しめる施主でないと採用は危険。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「多孔質（たこうしつ）」による汚れ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  表面に微細な穴が空いているため、手垢や油汚れ、コーヒーのシミなどが染み込みやすく、一度染み込むと取れない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  人が頻繁に触れる場所や、飲食店の厨房周りには不向き、または撥水コーティング等の対策が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【吸音（きゅうおん）パネル】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「遮音（しゃおん）」との違い</h4>
                
                <p className="mb-1 text-xs ml-3">
                  会議室やオーディオルームで使われる、フェルトや有孔ボードで仕上げられたパネル。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  機能: 音を外に漏らさない「遮音」ではなく、室内の<strong>「反響（ワンワンという響き）」を抑える</strong>ためのもの。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  「これを貼れば隣の部屋に音が漏れない」と勘違いされがちだが、防音効果は限定的なので説明に注意が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【マグネットパネル（掲示板クロス下地）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「磁力」の強さ確認</h4>
                
                <p className="mb-1 text-xs ml-3">
                  壁に磁石がつくようにするパネルやシート。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  落とし穴: 製品によって磁力が全く違う。鉄粉を練り込んだシートタイプは磁力が弱く、厚紙などは留まらないことがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  しっかり留めたい場合は、<strong>「鋼板（鉄板）」</strong>が入っている建材（シンコール「マグマジック」の鋼板タイプや、タカラスタンダードの「エマウォール」等）を選ばないと、後で「磁石がずり落ちる」というクレームになる。
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

            <div className="flex items-center mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">金属パネル</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ダイト工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daito-kogyo.co.jp/design-coat/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.daito-kogyo.co.jp/company/', '営業所')}｜
                {renderLink('https://www.daito-kogyo.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日創プロニティ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kakou-nisso.co.jp/product/timber-wall', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.kakou-nisso.co.jp/company/c_info', '営業所')}｜
                {renderLink('https://www.kakou-nisso.co.jp/sp_contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・フロント</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://nagomi-artsteel.com/art-panel/cazl-artpanel/', '商品ページ')}｜
                {renderLink('https://nagomi-artsteel.com/color/', 'カタログ')}｜
                {renderLink('https://nagomi-artsteel.com/frontline-roppongi/', '営業所')}｜
                {renderLink('https://nagomi-artsteel.com/contact-nagomi/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・トップライズ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.toprise.co.jp/products/01panel.html', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.toprise.co.jp/company/01index.html', '営業所')}｜
                {renderLink('https://www.toprise.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・菊川工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.kikukawa.com/citytexture-top/', '商品ページ')}｜
                {renderLink('https://www.kikukawa.com/studio-k/sample-list/', 'カタログ')}｜
                {renderLink('https://www.kikukawa.com/about/company/', '営業所')}｜
                {renderLink('https://www.kikukawa.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・長田通商</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://lb.d-nagata.co.jp/bandoxaldecor/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://lb.d-nagata.co.jp/about_us.html', '営業所')}｜
                {renderLink('https://lb.d-nagata.co.jp/contact.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ｴﾇ・ｴｽ・ｹｰ ﾆｼﾀﾞ工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nsk24.com/product', '商品ページ')}｜
                {renderLink('https://www.nsk24.com/catalog', 'カタログ')}｜
                {renderLink('https://www.nsk24.com/company/company_overview', '営業所')}｜
                {renderLink('https://www.nsk24.com/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日鉄ステンレスアート</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ms-art.co.jp/products/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.ms-art.co.jp/about-us/company-profile/', '営業所')}｜
                {renderLink('https://www.ms-art.co.jp/contact-us/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">木質パネル</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・朝日ウッドテック</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.woodtec.co.jp/thewall/', '商品ページ')}｜
                {renderLink('https://www.woodtec.co.jp/products/digital_catalog/', 'カタログ')}｜
                {renderLink('https://www.woodtec.co.jp/company/office/', '営業所')}｜
                {renderLink('https://www.woodtec.co.jp/customer/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・プレイリーホームズ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.prairie.co.jp/archives/product_cat/cat05', '商品ページ')}｜
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
                {renderLink('https://www.board.co.jp/product/wall-ceiling', '商品ページ')}｜
                {renderLink('https://www.board.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.board.co.jp/company/branch/', '営業所')}｜
                {renderLink('https://www.board.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装壁塗り壁':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">内装 塗り壁</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【珪藻土（けいそうど）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">性能を決めるのは「つなぎ（固化材）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  珪藻土そのものには固まる性質がないため、必ず「つなぎ（接着剤）」を混ぜて施工する。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>合成樹脂（ボンド）</strong>: 施工しやすく剥がれにくいが、樹脂が珪藻土の穴を塞いでしまうため、調湿効果が激減する。「なんちゃって珪藻土」と呼ばれることも。</li>
                  <li><span className="mr-1">・</span><strong>自然素材（粘土・石灰）</strong>: 穴を塞がないため調湿効果が高いが、施工が難しく、表面が柔らかくなりやすい。</li>
                </ul>
                
                <p className="mb-2 text-xs ml-3">
                  「珪藻土の含有率」だけでなく、「何で固めているか」の確認が性能確保の鍵。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「粉落ち（こなオチ）」のリスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  自然素材系の珪藻土は、表面が画用紙のようにザラザラしており、服が擦れると白くなったり、経年で粉がパラパラ落ちたりすることがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ゾーニング: 摩擦が多い「廊下」や「クローゼット内部」には、表面が硬く固まるタイプを選ぶか、漆喰にする方が衣服を汚さない。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【漆喰（しっくい）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">強アルカリ性による「殺菌・防カビ」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  主成分の消石灰は強アルカリ性のため、カビやウイルスが生息できない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  昔の蔵が漆喰なのはこのため。湿気対策だけでなく、アレルギー対策やペットの臭い対策としても機能性が高い。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">ツルツルの「押さえ仕上げ」と「パターン仕上げ」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>押さえ仕上げ</strong>: 鏡のようにツルツルに磨き上げる伝統技法。埃がたまらず掃除が楽だが、高度な左官技術が必要で高価。</li>
                  <li><span className="mr-1">・</span><strong>パターン（模様）仕上げ</strong>: コテ跡を残す仕上げ。多少の傷や汚れが目立ちにくいが、埃はたまりやすい。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">メンテナンスは「消しゴム」と「サンドペーパー」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ビニルクロスのように水拭きはできない（シミになる）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  手垢などの表面汚れは消しゴムで消し、コーヒーなどの染み込み汚れは、サンドペーパーで<strong>「表面を削り落とす」</strong>ことでリセットできるのが塗り壁の強み。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工とデザインの知識】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「入り隅（いりずみ）」のクラック対策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塗り壁は建物の揺れで必ず角（コーナー）にひび割れが入る。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  チリ切れ: 柱や枠と壁が接する部分に、あらかじめカッターで切り込みを入れて縁を切っておく（チリ切れ処理）ことで、不規則な割れを防ぐ職人技がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">照明による「陰影（いんえい）」の演出</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塗り壁の凹凸は、部屋の照明を消して、壁際の間接照明（コーブ照明やブラケットライト）だけを点けた時に、劇的な陰影を浮かび上がらせる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: 逆に、壁の真上から強いダウンライトを当てると、施工のアラ（不陸）が目立ちすぎてしまうため、照明計画とセットで考える必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「出隅（でずみ）」のガード</h4>
                
                <p className="mb-1 text-xs ml-3">
                  塗り壁の角（出っ張った角）は、掃除機などが当たると簡単に欠ける。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  補修は難しいため、角を丸く仕上げる（Rコーナー）か、木製や樹脂製の<strong>「コーナーガード」</strong>を埋め込んで保護する仕様にしておくことが、美観維持のポイント。
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
              <span className="w-[180px]">・エービーシー商会</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.abc-t.co.jp/products/material/insideWall/nurikabe/', '商品ページ')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/catalog_list', 'カタログ')}｜
                {renderLink('https://www.abc-t.co.jp/company/establishments.html', '営業所')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/select', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・フッコー</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fukko-japan.com/products/#content02', '商品ページ')}｜
                {renderLink('https://www.fukko-japan.com/tech-doc/#content03', 'カタログ')}｜
                {renderLink('https://www.fukko-japan.com/company/', '営業所')}｜
                {renderLink('https://www.fukko-japan.com/contact/', 'お問い合わせ')}｜
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

      case '内装壁タイル':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">内装タイル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【調湿（ちょうしつ）機能タイルの常識】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「エコカラット」に代表される多孔質セラミックス</h4>
                
                <p className="mb-1 text-xs ml-3">
                  現在の内装タイルの主役は、微細な孔（あな）で湿気や臭いを吸着する<strong>「調湿・消臭タイル」</strong>。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  機能: 霧吹きで水をかけると一瞬で吸い込むほどの吸水力がある。結露防止や、トイレ・ペットの臭い対策としてリビングや寝室の一面に貼るのが定番。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 水を吸いすぎるため、水回り（直接水がかかる風呂場やキッチンのコンロ周り）には使えない製品が多い。採用場所の湿度環境と製品スペックの適合確認が必須。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【キッチン・洗面所の「釉薬（ゆうやく）」選び】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「施釉（せゆう）」と「無釉（むゆう）」の掃除差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>施釉（グレーズ）</strong>: 表面がガラス質でコーティングされている。ツルツルしており、油汚れや水垢が染み込まず、拭き取りやすい。キッチンはこれが鉄則。</li>
                  <li><span className="mr-1">・</span><strong>無釉（マット）</strong>: 土の質感を残した素焼き調。雰囲気は良いが、油や醤油が染み込むと取れない。水回りには不向きか、防汚コーティングが必須。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">目地（めじ）が汚れる問題の解決</h4>
                
                <p className="mb-1 text-xs ml-3">
                  タイル自体は汚れないが、セメント目地は油を吸って黄ばんだり、カビが生えたりする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: キッチンには、油汚れに強い<strong>「耐油目地（キッチン用目地）」、浴室には「防カビ目地」</strong>を選定すること。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  デザイン重視で「カラー目地（グレーや黒）」を使うと、汚れが目立たなくなるため実用的。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【デザインと割り付け（わりつけ）】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「シート貼り」と「バラ貼り」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>モザイクタイル</strong>: 小さなタイル（50角以下など）は、30cm角程度のシート状にまとめられている（裏ネット張り・表紙張り）ため、施工が早い。</li>
                  <li><span className="mr-1">・</span><strong>バラ</strong>: 形が複雑なものや大判タイルは1枚ずつ貼るため、手間賃（施工費）が高くなる。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">端っこの「半端（はんぱ）」処理</h4>
                
                <p className="mb-1 text-xs ml-3">
                  タイル割付（わりつけ）の計画が甘いと、壁の端に数ミリの細長いタイルが入る「半端」が生じ、見た目が非常に悪くなる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  プロの技: あらかじめタイルの寸法に合わせて壁の幅を調整するか、中心から割り付けて両端の幅を均等にするなど、設計段階での調整が仕上がりの美しさを決める。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【接着剤の安全性】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「有機系接着剤」の採用</h4>
                
                <p className="mb-1 text-xs ml-3">
                  外壁はモルタルで貼るが、内装は振動や下地の動きに追従するため、弾力のある<strong>「樹脂系接着剤（弾性接着剤）」</strong>で貼るのが標準。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  室内で使うため、ホルムアルデヒド放散等級が<strong>「F☆☆☆☆（フォースター）」</strong>であることは大前提。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  リフォームで既存のクロス（壁紙）の上から貼れる接着剤もあるが、重いタイルの場合はクロスごと剥がれるリスクがあるため、クロスを剥がして下地に貼るのが原則。
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
                {renderLink('https://danto.jp/products/list?productplus_4=81', '商品ページ')}｜
                {renderLink('https://danto.jp/catalog_request/', 'カタログ')}｜
                {renderLink('https://danto.jp/companyinfo/showroom/', '営業所')}｜
                {renderLink('https://danto.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・アドヴァン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.advan.co.jp/eshop/category/K00001/interiorwall/', '商品ページ')}｜
                {renderLink('https://www.advan.co.jp/eshop/catalog/', 'カタログ')}｜
                {renderLink('https://www.advan.co.jp/company/satellite/', '営業所')}｜
                {renderLink('https://www.advan.co.jp/eshop/question/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・名古屋モザイク工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagoya-mosaic.com/products/search?cat=130', '商品ページ')}｜
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
                {renderLink('https://www.nittai-kogyo.co.jp/products/search.html?p_series=&l_lineup_number=&category_name=&usecase%5B%5D=%E5%B1%8B%E5%86%85%E5%A3%81&p_image=&price1=3000&price2=20000&width1=&width2=&height1=&height2=&depth1=&depth2=', '商品ページ')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/catalog.html', 'カタログ')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/company/showroom/', '営業所')}｜
                {renderLink('https://www.nittai-kogyo.co.jp/inquiry/other/index.php', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ｷｬﾝｴﾝﾀｰﾌﾟﾗｲｾﾞｽﾞ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.can-net.co.jp/product/tiles', '商品ページ')}｜
                {renderLink('https://www.can-net.co.jp/sample-order', 'カタログ')}｜
                {renderLink('https://www.can-net.co.jp/company', '営業所')}｜
                {renderLink('https://www.can-net.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セラコア</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ceracore.net/view/category/ct112', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.ceracore.net/view/company', '営業所')}｜
                {renderLink('https://www.ceracore.net/ssl/contact/', 'お問い合わせ')}｜
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
              <span className="w-[180px]">・プレイリーホームズ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.prairie.co.jp/product/tile.html', '商品ページ')}｜
                {renderLink('https://www.prairie.co.jp/catalog', 'カタログ')}｜
                {renderLink('https://www.prairie.co.jp/showroom', '営業所')}｜
                {renderLink('https://www.prairie.co.jp/contact', 'お問い合わせ')}｜
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

      case '内装壁石レンガ':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">内装 石・レンガ</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【天然石（大理石・ライムストーン等）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">酸に弱い「大理石」の弱点</h4>
                
                <p className="mb-1 text-xs ml-3">
                  大理石やライムストーンは、酸性の液体（レモン汁、ワイン、炭酸飲料、酸性洗剤など）がかかると、化学反応で表面が白く溶けて艶がなくなる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: キッチンやダイニングの壁に使う場合は、リスクを理解した上で採用するか、予め<strong>「浸透性保護剤（ストーンシーラー）」</strong>を塗布してガードする必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「多孔質（たこうしつ）」による油汚れの染み込み</h4>
                
                <p className="mb-1 text-xs ml-3">
                  砂岩（サンドストーン）や大谷石などの凝灰岩は、スポンジのように無数の穴が空いている。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  手垢や油煙（キッチンの油）を吸い込みやすく、一度染み込むと二度と取れない。人が頻繁に触れる廊下やスイッチ周りには不向き。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">石の「重量」と下地補強</h4>
                
                <p className="mb-1 text-xs ml-3">
                  天然石は非常に重い（数十kg/㎡）。一般的な石膏ボード下地では重さに耐えられず、ボードごと剥がれ落ちる危険がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須施工: 必ず<strong>「コンパネ（合板）12mm以上」</strong>の下地を入れるか、重量に耐えられる専用の接着剤・金具を使用する設計が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【レンガ・ブリックタイル】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">室内では「スライス」が標準</h4>
                
                <p className="mb-1 text-xs ml-3">
                  本物のレンガを積むと部屋が狭くなり、床の耐荷重もオーバーする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  室内では、レンガを厚さ10mm〜20mm程度にスライスした<strong>「ブリックタイル（軽量レンガ）」</strong>を貼るのが一般的。見た目は本物と変わらない。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">アンティークレンガの「粉落ち」対策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  古レンガの風合いは人気だが、表面から砂や粉がポロポロと落ちてくる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ベッドヘッド（枕元）や食卓の横に使うと、粉が落ちて不衛生になることがあるため、表面を固める<strong>「防塵（ぼうじん）クリア塗装」</strong>を施す配慮が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「目地（めじ）」の深さで変わる陰影</h4>
                
                <p className="mb-1 text-xs ml-3">
                  レンガ壁のリアルさは、レンガそのものより「目地の入れ方」で決まる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  深目地: 目地を奥まった位置で仕上げると、レンガの厚みが強調され、照明を当てた時にドラマチックな陰影が出る。意匠性を高める重要ポイント。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【人造石（擬石・セメント系）】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">本物を超える「施工性」と「軽さ」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  セメントを主成分とし、石や岩の型を取って作られた建材。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  メリット: 天然石より圧倒的に軽く、角（コーナー）専用の部材（役物）が充実しているため、柱型などを綺麗に納めやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  天然石の色幅（バラつき）を嫌う施主には、色が均一な人造石の方が満足度が高い場合がある。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【照明計画（ライティング）とのセット提案】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ウォールウォッシャー」の効果</h4>
                
                <p className="mb-1 text-xs ml-3">
                  石やレンガの最大の魅力は「凹凸」にある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  部屋の真ん中から照らすのではなく、壁のすぐ近くから光を擦るように当てる<strong>「コーニス照明」や「スポットライト」</strong>を設置しないと、凹凸の陰影が出ず、ただの壁紙のように見えてしまう（素材殺しになる）。
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

            <div className="flex items-center mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">石</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・エービーシー商会</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.abc-t.co.jp/products/material/insideWall/ceramicTile/', '商品ページ')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/catalog_list', 'カタログ')}｜
                {renderLink('https://www.abc-t.co.jp/company/establishments.html', '営業所')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/select', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ｷｬﾝｴﾝﾀｰﾌﾟﾗｲｾﾞｽﾞ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.can-net.co.jp/product/canstone', '商品ページ')}｜
                {renderLink('https://www.can-net.co.jp/sample-order', 'カタログ')}｜
                {renderLink('https://www.can-net.co.jp/company', '営業所')}｜
                {renderLink('https://www.can-net.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
            
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セラコア</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ceracore.net/view/category/ct114', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.ceracore.net/view/company', '営業所')}｜
                {renderLink('https://www.ceracore.net/ssl/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・丸鹿セラミックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('http://www.marushika.com/material/besame.html', '商品ページ')}｜
                {renderLink('http://www.marushika.com/digitalcatalog/?pNo=1', 'カタログ')}｜
                {renderLink('http://www.marushika.com/about/index.html#branch', '営業所')}｜
                {renderLink('http://www.marushika.com/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・プレイリーホームズ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.prairie.co.jp/archives/product_cat/cat17', '商品ページ')}｜
                {renderLink('https://www.prairie.co.jp/catalog', 'カタログ')}｜
                {renderLink('https://www.prairie.co.jp/showroom', '営業所')}｜
                {renderLink('https://www.prairie.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">レンガ</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ｷｬﾝｴﾝﾀｰﾌﾟﾗｲｾﾞｽﾞ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.can-net.co.jp/product/canbrick', '商品ページ')}｜
                {renderLink('https://www.can-net.co.jp/sample-order', 'カタログ')}｜
                {renderLink('https://www.can-net.co.jp/company', '営業所')}｜
                {renderLink('https://www.can-net.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・セラコア</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ceracore.net/view/category/ct113', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.ceracore.net/view/company', '営業所')}｜
                {renderLink('https://www.ceracore.net/ssl/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">人工大理石</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・デュポン・MCC</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://dupont-mcc.co.jp/about/', '商品ページ')}｜
                {renderLink('https://dupont-mcc.co.jp/_assets/pdf/2025_corian_mc_s.pdf', 'カタログ')}｜
                {renderLink('https://dupont-mcc.co.jp/company/', '営業所')}｜
                {renderLink('https://dupont-mcc.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ﾛｯﾃｹﾐｶﾙｼﾞｬﾊﾟﾝ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://staron.jp/', '商品ページ')}｜
                {renderLink('https://staron.jp/catalog', 'カタログ')}｜
                {renderLink('https://staron.jp/company', '営業所')}｜
                {renderLink('https://staron.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ダイワ建材</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://daiwakenzai.co.jp/lineup/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://daiwakenzai.co.jp/company/#base', '営業所')}｜
                {renderLink('https://daiwakenzai.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・日本デコラックス</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.decoluxe.co.jp/product/product_category/marble/', '商品ページ')}｜
                {renderLink('https://www.decoluxe.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.decoluxe.co.jp/company/', '営業所')}｜
                {renderLink('https://www.decoluxe.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ブロック</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ｷｬﾝｴﾝﾀｰﾌﾟﾗｲｾﾞｽﾞ</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.can-net.co.jp/products/canstyle/block-face', '商品ページ')}｜
                {renderLink('https://www.can-net.co.jp/sample-order', 'カタログ')}｜
                {renderLink('https://www.can-net.co.jp/company', '営業所')}｜
                {renderLink('https://www.can-net.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装壁装飾材':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">内装装飾材</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【モールディング（装飾縁）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「木製」と「ポリウレタン」の使い分け</h4>
                
                <p className="mb-1 text-xs ml-3">
                  天井と壁の境目（廻り縁）や、腰見切りに使われる部材。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>木製</strong>: 硬くて丈夫。ぶつかっても凹みにくいため、椅子の背が当たる「チェアレール」や巾木に適している。反りが出やすいため、留め（角）の隙間対策が必要。</li>
                  <li><span className="mr-1">・</span><strong>ポリウレタン（高密度発泡）</strong>: 非常に軽く、カッターで切れる。接着剤と隠し釘で留められるため、天井の装飾（メダリオン等）や高い位置のモールディングに適している。水に強く、浴室に使える製品もある。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">曲面壁に対応する「フレキシブル（軟質）モール」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  通常のモールディングは硬くて曲がらない。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  アーチ開口やR壁（曲面壁）に装飾を施す場合は、ゴムのようにぐにゃりと曲がる<strong>「フレキシブル（軟質）タイプ」</strong>の指定が必須。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ※硬質タイプと同じデザインで用意されているメーカー（サンメント等）を選ぶと、直線部と曲線部を違和感なく繋げられる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「塗装」前提か「シート仕上げ」か</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>塗装用</strong>: 表面が下地処理のみで、現場で好きな色に塗装して仕上げるタイプ。輸入住宅や本格的なクラシックインテリア向け。</li>
                  <li><span className="mr-1">・</span><strong>シート仕上げ</strong>: 木目や白のシートが貼ってある完成品。塗装不要で施工が早いが、カットした小口（断面）の処理や、釘頭の補修跡が目立ちやすい。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【3Dウォールパネル（立体壁面）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「石膏（せっこう）」と「FRP・植物繊維」の継ぎ目処理</h4>
                
                <p className="mb-1 text-xs ml-3">
                  壁面に凹凸のパターンを作るパネル。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>石膏製</strong>: 重く割れやすいが、継ぎ目をパテで埋めて塗装すれば、<strong>「完全シームレス（継ぎ目なし）」</strong>の壁が作れる。不燃材料なので内装制限のある店舗やホテルで有利。</li>
                  <li><span className="mr-1">・</span><strong>FRP・植物繊維</strong>: 軽くてDIYでも貼れるが、パネル同士の<strong>「継ぎ目（ライン）」</strong>がどうしても見える。割り付け計画が重要。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">ライティング（照明）が命</h4>
                
                <p className="mb-1 text-xs ml-3">
                  3Dパネルは「影」でデザインを見せる建材。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  壁のすぐ近くから光を当てる<strong>「ウォールウォッシャー（演出照明）」</strong>を設置しないと、ただの白いデコボコした壁になり、魅力が半減する。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【腰壁（こしかべ）・パネリング】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">傷・汚れ防止の「機能性」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  壁の下半分（床から90cm程度）に板を貼る仕上げ。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  デザインだけでなく、ペットの爪研ぎ防止、子供の落書き対策、車椅子や台車の衝突ガードとしての機能性が高い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  見切り材: 上端の「笠木（かさぎ）」や「見切り縁」の出っ張りに埃がたまりやすいため、掃除のしやすさを考慮した形状選びが必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【組子（くみこ）・欄間（らんま）装飾】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">埃（ほこり）問題と「ガラス挟み込み」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  和モダンで人気の繊細な木工細工。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  リスク: 細かい隙間に埃がたまると、掃除機も雑巾も入らず掃除が不可能に近い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: メンテナンスを考慮する場合、組子を2枚のガラス（またはアクリル）で挟み込んだ<strong>「層間（そうかん）ユニット」</strong>を選ぶと、表面がフラットになり拭き掃除が可能になる。
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

            <div className="flex items-center mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ルーバー</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・大建工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.daiken.jp/buildingmaterials/wall/lineup/hunenwallforpublic.html', '商品ページ')}｜
                {renderLink('https://www.daiken.jp/img/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=DKK00001&catalogId=74478830000&pageGroupId=1&designID=PUBLIC&catalogCategoryId=', 'カタログ')}｜
                {renderLink('https://www.daiken.jp/showroom/', '営業所')}｜
                {renderLink('https://faq.daiken.jp/faq/show/948?site_domain=user', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・エービーシー商会</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.abc-t.co.jp/products/material/fitting/louverPanel/', '商品ページ')}｜
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
                {renderLink('https://www.rikenkeikinzoku.co.jp/building/louver/index.html', '商品ページ')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/catalog/index.html', 'カタログ')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/company/info/', '営業所')}｜
                {renderLink('https://www.rikenkeikinzoku.co.jp/company/inquiry/index.html', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・恩加島木材工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.okajimawood.co.jp/products/ribpanel-louver/', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('https://www.okajimawood.co.jp/corporate_info/', '営業所')}｜
                {renderLink('https://www.okajimawood.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・ウッドワン</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.woodone.co.jp/product/wall/', '商品ページ')}｜
                {renderLink('https://www.woodone.co.jp/catalog/', 'カタログ')}｜
                {renderLink('https://www.woodone.co.jp/showroom/', '営業所')}｜
                {renderLink('https://www.woodone.co.jp/contact/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装壁機能性':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">内装 機能性壁材</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【吸音（きゅうおん）パネル・ボード】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「遮音（しゃおん）」との決定的な違い</h4>
                
                <p className="mb-1 text-xs ml-3">
                  多くの人が「防音したい」と言って吸音パネルを選ぶが、これは間違い。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>吸音</strong>: 室内の<strong>「反響（ワンワンという響き）」</strong>を抑えるもの。WEB会議の声を聞き取りやすくしたり、話し声をクリアにする効果がある。</li>
                  <li><span className="mr-1">・</span><strong>遮音</strong>: 音を<strong>「外に漏らさない」</strong>もの。隣の部屋への音漏れを防ぐなら、吸音パネルではなく、壁の中に遮音シートや鉛ボードを入れる必要がある。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「マグネット施工」の利便性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  接着剤で貼ると現状復旧ができないため、賃貸オフィスやマンションでは採用しにくい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  トレンド: スチールパーティションに磁石で貼れるタイプや、虫ピンで固定できるタイプなど、<strong>「後付け・取り外し可能」</strong>な製品を選ぶことで、レイアウト変更に柔軟に対応できる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ホワイトボード・プロジェクター壁】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「書く」と「映す」の相克（ホットスポット現象）</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ホワイトボードとして「書き消し」しやすい壁は、表面がツルツル（鏡面）である必要がある。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  しかし、そこにプロジェクターを映すと、光源が反射して白く光る<strong>「ホットスポット」</strong>が発生し、映像が見えなくなる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 両立させたい場合は、<strong>「映写対応（マット仕上げ）」</strong>のホワイトボード建材を選ぶ必要があるが、通常のツルツルタイプより文字の消えやすさは少し劣る。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">壁紙タイプとホーロータイプの耐久差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>壁紙（シート）</strong>: 安価で曲面にも施工できるが、ペン先で傷がつきやすく、数年で消えにくくなる。</li>
                  <li><span className="mr-1">・</span><strong>ホーロー・スチール</strong>: 鉄板ベース。非常に硬く傷つかないため、半永久的に書き消しできる。マグネットもつく。ハードユースならこちら一択。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【マグネット下地（石膏ボード・シート）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「クロス（壁紙）」の下に仕込む場合のリスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  仕上げ材の下に鉄粉シートや鉄板を仕込んで、普通の壁紙を貼ってマグネット壁にする手法。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  落とし穴: 間に壁紙（約1mm）が挟まるため、「磁力が劇的に落ちる」。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  強力なネオジム磁石ならつくが、普通の磁石では紙1枚留めるのがやっと、というケースが多い。しっかり留めたいなら、表面仕上げが鉄板そのものである「化粧パネル」系を選ぶべき。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【抗ウイルス・抗菌建材】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「SIAAマーク」の確認</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コロナ禍以降、抗菌・抗ウイルス建材が増えたが、性能の根拠が曖昧なものもある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  抗菌製品技術協議会が制定した<strong>「SIAAマーク」</strong>を取得している製品を選ぶことが、客観的な性能証明（エビデンス）として重要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「光触媒（ひかりしょくばい）」の条件</h4>
                
                <p className="mb-1 text-xs ml-3">
                  光（紫外線）が当たることでウイルスや菌を分解する機能。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  注意点: 窓のないトイレや、ＬＥＤ照明だけの廊下など、<strong>「光量が足りない場所」</strong>では効果を発揮しない製品がある。「可視光応答型（室内光でも反応する）」かどうかの確認が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【表面強化（耐衝撃）石膏ボード】の知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">学校・病院の「穴空き」対策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  普通の石膏ボードは、台車や掃除機の柄が強く当たると簡単に穴が空く。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  硬質石膏ボード（スーパーハード等）： 密度を高めて硬くしたボード。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  廊下の腰壁（高さ1mくらいまで）にこれを採用するだけで、メンテナンス費用（壁の穴埋め補修）が激減する。見た目は変わらないため、コスト対効果の高い「隠れた機能建材」。
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

            <div className="flex items-center mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">GW吸音板</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・エービーシー商会</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.abc-t.co.jp/products/material/insideWall/kyuon/', '商品ページ')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/catalog_list', 'カタログ')}｜
                {renderLink('https://www.abc-t.co.jp/company/establishments.html', '営業所')}｜
                {renderLink('https://www.abc-t.co.jp/apps/contact/select', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[180px]">・三洋工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.sanyo-industries.co.jp/products/floorsystem/kabex.html', '商品ページ')}｜
                {renderLink('https://www.catalabo.org/catalog/search/maker/off/17489940000', 'カタログ')}｜
                {renderLink('https://www.sanyo-industries.co.jp/company/location.html#office', '営業所')}｜
                {renderLink('https://www.sanyo-industries.co.jp/inquiry/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装壁壁見切':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">内装 壁見切</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【廻り縁（まわりぶち）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「底目地（そこめじ）」によるモダンな納まり</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔ながらの木の廻り縁は、古臭い印象になりがち。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  トレンド: 天井と壁の間にあえて数ミリの隙間（溝）を作り、影で見切る<strong>「底目地（目透かし）仕上げ」</strong>がモダン住宅の主流。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  専用の樹脂製・アルミ製部材を使うことで、スッキリした天井ラインを作れる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">クロス（壁紙）の「剥がれ防止」機能</h4>
                
                <p className="mb-1 text-xs ml-3">
                  廻り縁の本来の役割は、天井クロスの端部を押さえて剥がれを防ぐこと。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  リスク: デザイン重視で廻り縁をなくす（突きつけ施工）と、数年で天井の隅からクロスがめくれたり、隙間が空いて黒い線が見えたりするリスクが高まる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【見切り縁（壁の見切り）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">異素材をつなぐ「緩衝材」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  腰壁とクロス、塗り壁とタイルなど、厚みや伸縮率が違う素材がぶつかる場所には、必ず見切り材を入れる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  重要: これを省略して突きつけると、乾燥収縮で必ず隙間が空き、見た目が悪くなるだけでなく、そこからクロスが剥がれる原因になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「アルミ」か「樹脂」か「木」か</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>アルミ</strong>: 最も薄く、目立たない。モダンでシャープな印象。水回りに強い。</li>
                  <li><span className="mr-1">・</span><strong>樹脂</strong>: 安価で施工しやすいが、経年で黄ばんだり、安っぽく見える場合がある。</li>
                  <li><span className="mr-1">・</span><strong>木</strong>: 塗装で色を合わせられるため、温かみのある空間や、クラシックな腰壁には必須。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">コーナー（出隅）の保護機能</h4>
                
                <p className="mb-1 text-xs ml-3">
                  壁の出っ張った角（出隅）は、物がぶつかってクロスが破れやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  ここにあらかじめL字型の<strong>「コーナー見切り（コーナーガード）」</strong>を入れておくことで、角の破損を防ぎ、長期間美観を保てる。特にペットがいる家庭や、車椅子を使う施設では必須。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ピクチャーレール】の活用知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「埋め込み」によるノイズレス化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  絵画や時計を吊るすためのピクチャーレール。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  プロの技: 後付けするとレールが出っ張って目立つが、新築時に天井や壁に<strong>「埋め込み施工（先付け）」</strong>しておくことで、レールが見えなくなり、スッキリとした空間になる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  耐荷重: 石膏ボードにビスを打つだけでは重い絵画は吊るせない。必ず下地（木や軽量鉄骨）に固定できる製品と施工計画が必要。
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

            <div className="flex items-center mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">出入隅</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・名古屋モザイク工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.nagoya-mosaic.com/products/series/s1074', '商品ページ')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/catalogue/2024.html', 'カタログ')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/companyguide/branch.html', '営業所')}｜
                {renderLink('https://www.nagoya-mosaic.co.jp/secure/contact/contactfrm2?nonlogin', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・フクビ化学工業</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.fukuvi.co.jp/product/12/07?place=house', '商品ページ')}｜
                {renderLink('https://www.catalabo.org/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=CATALABO&catalogId=83000510000&pageGroupId=&designID=link&catalogCategoryId=&designConfirmFlg=', 'カタログ')}｜
                {renderLink('https://www.fukuvi.co.jp/company/office', '営業所')}｜
                {renderLink('https://www.fukuvi.co.jp/contact', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>

            <div className="flex items-center mt-4 mb-1">
              <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">笠木</span>
              <div className="flex-1 h-px bg-gray-300 ml-2"></div>
            </div>
            <div className="text-[13px] flex items-start gap-2">
              <span className="w-[200px]">・ie-mon</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('https://www.ie-mon-asia.net/online-shop_category/kasagi/', '商品ページ')}｜
                {renderLink('https://www.ie-mon-asia.net/catalog/', 'カタログ')}｜
                {renderLink('https://www.ie-mon-asia.net/company/', '営業所')}｜
                {renderLink('https://www.ie-mon-asia.net/request/', 'お問い合わせ')}｜
                {renderLink('#', 'サンプル')}｜
                {renderLink('#', 'CADDOWNLOAD')}
              </span>
            </div>
          </div>
        );

      case '内装壁金属板':
      case '内装壁その他':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">{subcategory === '内装壁金属板' ? '内装 金属板' : '内装壁 その他'}</h2>
              {(subcategory === '内装壁金属板' || subcategory === '内装壁その他') && (
                <button
                  onClick={() => setShowBasicKnowledge(!showBasicKnowledge)}
                  className="ml-2 align-baseline text-blue-600 hover:text-blue-800 text-[11px] underline"
                >
                  <span className={`inline-block transition-transform ${showBasicKnowledge ? 'rotate-90' : ''}`}>&gt;</span> 基本知識
                </button>
              )}
              <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
            </div>
            
            {/* 基本知識トグル */}
            {subcategory === '内装壁金属板' && showBasicKnowledge && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <h3 className="font-bold text-[13px] mb-1.5">【スチール・ガルバリウム鋼板】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">最大のメリット「マグネット対応」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  鉄をベースにしているため、壁一面をマグネット掲示板として使えるのが最大の特徴。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: あくまで「鉄板」なので、水回り（洗面・脱衣所）や結露しやすい場所で使うと、端部から錆びるリスクがある。水回りには不向き。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「薄さ」による「波打ち（ベコつき）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  内装用の鉄板は0.3mm〜0.5mm程度と非常に薄い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  下地（石膏ボード）にビス留めする際、締めすぎると歪んで表面が波打つ「ベコつき」が出やすい。施工難易度が意外と高い素材。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ホーローパネル（琺瑯）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ガラス」と「鉄」のハイブリッド</h4>
                
                <p className="mb-1 text-xs ml-3">
                  鉄板の表面にガラス質を高温で焼き付けたもの（タカラスタンダード「エマウォール」など）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  最強の性能: 表面はガラスなので油汚れが染み込まず、火に強く、傷もつかない。ベースは鉄なのでマグネットもつく。キッチンや子供の落書きスペースに最適。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「現場カット」が困難</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ガラス質であるため、現場で丸ノコで切ろうとすると表面がバリバリに割れて（欠けて）しまう。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  コンセント穴などは工場でのプレカットが必要になることが多く、割り付け（寸法計画）の精度が厳しく求められる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ステンレス（SUS）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「指紋（手垢）」の目立ちやすさ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  厨房などで使われる「ヘアライン仕上げ」はシャープで美しいが、手の油分（指紋）が黒く目立ち、拭き取りにくいのが難点。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 人が触れる場所に使う場合は、指紋が目立たない<strong>「バイブレーション仕上げ」にするか、表面に「耐指紋クリア塗装」</strong>が施された製品を選ぶのが鉄則。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">磁石が「つかない」ステンレス</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ステンレスには磁石がつく種類（SUS430）と、つかない種類（SUS304）がある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  「金属だから磁石がつくはず」と思い込んで高級なSUS304（錆に強い方）を貼ると、磁石がつかずトラブルになることがある。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【アルミスパンドレル】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">ビスが見えない「嵌合（かんごう）式」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  商業施設やオフィスの天井・壁で使われる、細長いアルミの化粧材。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  ビスを打った部分を次の部材で隠す構造になっているため、仕上がり面にビス頭が一切出ない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  デザイン: 金属特有のシャープなラインが出せるため、モダンな空間の天井から壁へと連続させるデザインなどで多用される。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工上の安全管理】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「小口（こぐち）」は凶器</h4>
                
                <p className="mb-1 text-xs ml-3">
                  金属板の切断面（小口）はカッターナイフのように鋭利。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  クロスのように切りっぱなしにはできないため、端部には必ず<strong>「見切り材（ジョイナー）」</strong>を入れるか、板を折り曲げて小口を隠す加工（曲げ加工）が必要。これを怠ると、接触時に指を切る事故につながる。
                </p>
              </div>
            )}
            
            {/* 内装壁その他の基本知識トグル */}
            {subcategory === '内装壁その他' && showBasicKnowledge && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <h3 className="font-bold text-[13px] mb-1.5">【無垢羽目板（むくはめいた）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「本実（ほんざね）」と伸縮の許容</h4>
                
                <p className="mb-1 text-xs ml-3">
                  無垢材は湿度によって呼吸し、数ミリ単位で伸び縮みする。
                </p>
                
                <p className="mb-1 text-xs ml-3">
                  施工の鉄則: 釘が見えないように板同士を凹凸で組み合わせる<strong>「本実加工（ほんざねかこう）」</strong>が基本だが、冬場の収縮を見越して、あえて少し緩く組むか、サネ（継ぎ目）が深めの製品を選ばないと、隙間から下地が見えてしまうことがある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「死に節（しにぶし）」の処理確認</h4>
                
                <p className="mb-1 text-xs ml-3">
                  節（ふし）があるグレードは安価で味わいがあるが、乾燥して節が抜け落ちて穴が空く「死に節」が含まれることがある。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: メーカー出荷時にパテ埋め処理がされているか、あるいは現場で埋める手間賃を見込んでおく必要がある。これを怠ると、壁に黒い穴が空いたままになる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「縦張り」と「横張り」の視覚効果と掃除</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>縦張り</strong>: 天井が高く見え、和風やモダンな印象。埃が溝に溜まりにくく掃除が楽。</li>
                  <li><span className="mr-1">・</span><strong>横張り</strong>: 部屋が広く見え、ログハウスやカントリーな印象。溝に埃が溜まりやすいため、掃除の手間は増える。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ガラスブロック・室内窓】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">ただのガラスではない「断熱・防音」性能</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ガラスブロックは中空（真空に近い状態）になっているため、普通のガラス窓よりも断熱性と防音性が格段に高い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  用途: 外壁面だけでなく、寝室と廊下の間仕切りなどに使うと、光を通しつつプライバシーと静粛性を守れる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「構造体」にはならない</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ブロックのように積み上げるが、耐力壁（建物を支える壁）にはならない。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  広い面積に施工する場合は、地震で倒壊しないよう、一定間隔で<strong>「補強金物（ラダー筋）」を入れたり、周囲に「緩衝材（エキスパンション）」</strong>を設けて揺れを逃がす専門的な設計が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">室内窓の「強化ガラス」指定</h4>
                
                <p className="mb-1 text-xs ml-3">
                  リビングと書斎の間などに設ける室内窓（デコマド等）が人気。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  安全対策: 万が一割れた時に鋭利な破片で大怪我をしないよう、子供がいる家庭では<strong>「強化ガラス」や、飛散防止の「合わせガラス」</strong>を指定するのがプロの配慮。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【コルク壁（コルクシート）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ピン跡」が消える掲示板機能</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コルクは弾力性が高いため、画鋲を抜いた後の穴が自然に塞がる（復元する）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  学校や保育園だけでなく、住宅のワークスペースや子供部屋の壁一面をコルクにすることで、壁を傷つけずにポスターやメモを貼れる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">断熱性と「吸音」効果</h4>
                
                <p className="mb-1 text-xs ml-3">
                  多孔質であるため、断熱性が高く、壁からの冷気を防ぐ。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  また、話し声やテレビの音を適度に吸収するため、オーディオルームや寝室の壁材としても機能性が高い。
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
              <span className="w-[200px]">・掲載準備中</span>
              <span className="flex gap-1 flex-wrap">
                {renderLink('#', '商品ページ')}｜
                {renderLink('#', 'カタログ')}｜
                {renderLink('#', '営業所')}｜
                {renderLink('#', 'お問い合わせ')}｜
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

export default InternalWallContent; 