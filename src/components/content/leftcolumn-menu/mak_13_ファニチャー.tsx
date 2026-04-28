import React, { useState } from 'react';

interface FurnitureContentProps {
  subcategory: string;
}

const FurnitureContent: React.FC<FurnitureContentProps> = ({ subcategory }) => {
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);

  const handleImageError = (imageKey: string) => {
    setImageErrors(prev => ({ ...prev, [imageKey]: true }));
  };

  const isValidUrl = (url: string | undefined) => url && url !== '#' && url.trim() !== '';
  const renderLink = (url: string | undefined, label: string) => {
    if (isValidUrl(url)) {
      return <a href={url} target="_blank" className="text-blue-800 hover:text-blue-900 underline cursor-pointer">{label}</a>;
    } else {
      return <span className="text-gray-600 no-underline cursor-not-allowed">{label}</span>;
    }
  };

  const renderRecruitmentCard = () => (
    <div className="border rounded p-3 bg-white text-sm w-[240px] h-[365px] card">
      <img
        src={imageErrors['recruitment'] ? '/image/掲載募集中a.png' : 'image/掲載募集中a.png'}
        alt="掲載企業様募集中"
        className="w-30 mb-1 w-[clamp(300px,5vw,120px)]"
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
      <img
        src={imageErrors['commercial'] ? '/image/ChatGPT Image 2025年5月1日 16_25_41.webp' : 'image/ChatGPT Image 2025年5月1日 16_25_41.webp'}
        alt="Manufacturer Commercial"
        className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
        onError={() => handleImageError('commercial')}
      />
    </div>
  );

  const renderCompanyRow = (companyName: string, links: { [key: string]: string }) => {
    return (
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・{companyName}</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink(links.products, '商品ページ')}｜
          {renderLink(links.catalog, 'カタログ')}｜
          {renderLink(links.office, '営業所')}｜
          {renderLink(links.contact, 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    );
  };

  const renderFurnitureCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">家具</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【ダイニングセット（テーブル・椅子）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">快適さを決める数値「差尺（さしゃく）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            テーブルの高さと、椅子の座面高さの差。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            黄金比: 一般的に<strong>「27cm〜30cm」</strong>が最適とされる。これより狭いと足が組めず、広いと食事がしにくい（肩が凝る）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 海外製（IKEA等）のテーブルは高さ720mm〜750mmと高めだが、日本製の椅子は座面400mm〜420mmと低めなことが多い。この組み合わせだと差尺が広すぎて使いにくくなるため、セット購入以外では必ず数値を計測する必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「無垢（むく）」と「突板（つきいた）」の天板</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>無垢天板</strong>: 傷や輪染みはつくが、削り直して再生できる一生モノ。反り止め金具が必要。</li>
            <li><span className="mr-1">・</span><strong>突板天板</strong>: 芯材に薄い木を貼ったもの。軽くて安価で反らないが、深い傷がつくと下地が出てしまい、補修が難しい。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「2本脚」と「4本脚」の出入りしやすさ</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>4本脚</strong>: 安定感があるが、ベンチシートやコーナー席では、出入りする際に脚が邪魔になる。</li>
            <li><span className="mr-1">・</span><strong>2本脚（T字脚）</strong>： テーブルの四隅に脚がないため、椅子を引かずに体を回転させるだけで出入りできる。ソファダイニングやベンチには2本脚が必須。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ソファ】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">寿命を決める「ウレタン密度」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ソファの座り心地と耐久性は、中のスポンジ（ウレタンフォーム）の密度（kg/m3）で決まる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            目安: 安価なものは20kg/m3程度で数年でヘタる。30kg/m3以上、高級品なら40kg/m3以上の高密度ウレタンを使っているものを選べば、10年以上弾力を維持できる。カタログのスペック確認が重要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「Sバネ」と「ウェービングテープ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            座面の下の構造体。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>Sバネ</strong>: 金属製のバネ。硬めの座り心地で耐久性が高い。</li>
            <li><span className="mr-1">・</span><strong>ウェービングテープ</strong>: 布製のゴムベルト。底付き感が出にくく軽量だが、安物は伸びてヘタるのが早い。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">搬入経路の「最小寸法」</h4>
          
          <p className="mb-1 text-xs ml-3">
            どんなに良いソファも、部屋に入らなければ意味がない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: 玄関ドアの幅だけでなく、<strong>「廊下の曲がり角」「エレベーターの高さ」「階段の天井高」</strong>がクリアできるか。特に3人掛け以上のソファは、背もたれが外れる「ノックダウン式」でないと搬入不可のケースが多い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【造作家具（オーダー家具）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">壁に隙間を作らない「巾木（はばき）よけ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            壁には巾木（床と壁の境目の部材）が出っ張っている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            既製家具を置くと壁との間に隙間ができるが、造作家具は背面の脚元をL字に欠き取る<strong>「巾木よけ加工」</strong>をすることで、壁にピタリと隙間なく設置できる。埃がたまらないプロのディテール。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「面材（めんざい）」の合わせ技</h4>
          
          <p className="mb-1 text-xs ml-3">
            キッチンの扉、部屋のドア、そして造作家具の扉の「面材（色柄）」を同じメーカー（アイカ工業のメラミン等）で統一することで、空間に圧倒的な統一感と広がりを持たせることができる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            既製家具では不可能な、建築と一体化したインテリアを作る手法。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【収納家具の機能性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">地震対策の「耐震ラッチ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            背の高い家具（食器棚や本棚）には、地震の揺れを感知して扉をロックする「耐震ラッチ」が必須。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            開き戸だけでなく、引き出しが飛び出さないようにするロック機構も重要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">引き出しの「フルスライドレール」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>コロレール</strong>: 安価だが、引き出しが途中までしか開かず、奥の物が取れない。</li>
            <li><span className="mr-1">・</span><strong>フルスライド（3段引き）</strong>： 引き出し全体が手前に出てくる。収納量を100%活かせるため、キッチンや衣類収納ではこちらを指定すべき。</li>
          </ul>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="flex items-center mt-0 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">家具（屋内）</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="mt-2">
        {renderCompanyRow('カリモク家具', {
          products: 'https://products.karimoku.co.jp/?_gl=1*rzlvzc*_gcl_au*NTg1MzI3NTAyLjE3NDY1OTYxMTc.*_ga*MjkzMjE4OTQ4LjE3NDY1OTYxMTc.*_ga_ZHPP6VSVW8*czE3NDY1OTYxMTckbzEkZzAkdDE3NDY1OTYxMTckajYwJGwwJGgw',
          catalog: 'https://www.karimoku.co.jp/documentrequest/',
          office: 'https://www.karimoku.co.jp/corporateinfo/',
          contact: 'https://www.karimoku.co.jp/contactus.html'
        })}
        {renderCompanyRow('オカムラ', {
          products: 'https://www.okamura.co.jp/product//office/',
          catalog: 'https://www.okamura.co.jp/catalog/office/',
          office: 'https://www.okamura.co.jp/corporate/network/index.html',
          contact: 'https://www.okamura.co.jp/inquiry/'
        })}
        {renderCompanyRow('イトーキ', {
          products: 'https://www.itoki.jp/product/',
          catalog: 'https://www.itoki.jp/product/catalog/',
          office: 'https://www.itoki.jp/showroom/',
          contact: 'https://www.itoki.jp/cs/'
        })}
        {renderCompanyRow('天童木工', {
          products: 'https://www.tendo-mokko.co.jp/',
          catalog: 'https://www.tendo-mokko.co.jp/catalog/',
          office: 'https://www.tendo-mokko.co.jp/office/',
          contact: 'https://www.tendo-mokko.co.jp/contact/inquiry/'
        })}
        {renderCompanyRow('飛騨産業', {
          products: 'https://hidasangyo.com/products/',
          catalog: 'https://hidasangyo.com/support/webcatalog/',
          office: 'https://hidasangyo.com/company/outline/',
          contact: 'https://hidasangyo.com/contact/?cat=contract'
        })}
        {renderCompanyRow('柏木工', {
          products: 'https://www.kashiwa.gr.jp/furniture/',
          catalog: 'https://www.kashiwa.gr.jp/catalog/',
          office: 'https://www.kashiwa.gr.jp/showroom/',
          contact: 'https://www.kashiwa.gr.jp/corporation-contact/'
        })}
        {renderCompanyRow('マルニ木工', {
          products: 'https://www.maruni.com/jp/products',
          catalog: 'https://www.maruni.com/jp/catalogue',
          office: 'https://www.maruni.com/jp/products/storelist_menu',
          contact: 'https://www.maruni.com/jp/contact'
        })}
        {renderCompanyRow('上手工作所', {
          products: 'https://www.jo-zu-works.com/view/category/ct3',
          catalog: '#',
          office: 'https://www.jo-zu-works.com/view/page/company',
          contact: 'https://www.jo-zu-works.com/ssl/contact/'
        })}
        <div className="flex items-center mt-4 mb-1">
          <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">家具（屋外）</span>
          <div className="flex-1 h-px bg-gray-300 ml-2"></div>
        </div>
        {renderCompanyRow('松尾貿易商会', {
          products: 'https://www.matsuo-e-pot.com/',
          catalog: 'https://www.matsuo-e-pot.com/information/web_catalog',
          office: 'https://www.matsuo-e-pot.com/corporate/profile?a2#profile',
          contact: 'https://www.matsuo-e-pot.com/corporate/contact'
        })}
        {renderCompanyRow('マチダコーポレーション', {
          products: 'http://www.machidacorp.co.jp/product_i/c09/',
          catalog: 'http://www.machidacorp.co.jp/catalogue_s/',
          office: 'http://www.machidacorp.co.jp/profile/branch/',
          contact: 'https://www.machidacorp.co.jp/contact/total_support/'
        })}
        {renderCompanyRow('ニチエス', {
          products: 'https://www.nichiesu.com/brand/',
          catalog: 'https://www.nichiesu.com/catalog/',
          office: 'https://www.nichiesu.com/company/',
          contact: 'https://www.nichiesu.com/contact/'
        })}
      </div>
    </div>
  );

  const renderCurtainCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">カーテン</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【カーテン（ドレープ・レース）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">高級感を決める「ヒダ倍率（2倍・1.5倍）」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>2倍ヒダ（3つ山）</strong>: 窓幅の2倍の生地を使う。ドレープ（波）が深く美しく、保温性も高い。オーダーカーテンやホテルの標準。</li>
            <li><span className="mr-1">・</span><strong>1.5倍ヒダ（2つ山）</strong>: 窓幅の1.5倍の生地。波が浅く、少しカジュアルな印象。既製品やコスト重視の場合に採用される。</li>
            <li><span className="mr-1">・</span><strong>フラット（ヒダなし）</strong>: あえてヒダを作らない仕様。大柄のテキスタイルを見せたい場合に有効だが、生地が薄いと安っぽく見えるため、センスが問われる。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「遮光（しゃこう）等級」と隙間漏れ</h4>
          
          <p className="mb-1 text-xs ml-3">
            寝室などで真っ暗にしたい場合、「遮光1級」の生地を選んでも、カーテンの<strong>「上・下・横」の隙間</strong>から光が漏れて部屋が明るくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: カーテンの両端を壁側に折り込む<strong>「リターン仕様」や、レールの上を塞ぐ「カバートップ」</strong>を採用しないと、完全遮光は実現できない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ミラーレース」の夜間の見え方</h4>
          
          <p className="mb-1 text-xs ml-3">
            外から見えにくいミラーレースや遮像レース。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            重要: ほとんどの製品は「太陽光を反射」して目隠しするため、「夜、部屋の電気を点ける」と外から丸見えになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            夜も透けにくい「ウェーブロン」等の特殊繊維を使った製品を選ばないと、プライバシーが守れない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「たまり（たたみ代）」のスペース確保</h4>
          
          <p className="mb-1 text-xs ml-3">
            カーテンを開けた際、束になった生地（たまり）が窓ガラスにかかると、開口部が狭くなり、部屋が暗く見える。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            プロの技: 窓枠よりも左右にレールを長く伸ばし、「たまり」を壁面に逃がすことで、窓を全開にした時の開放感を最大化できる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【メカ物（ロールスクリーン・ブラインド）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">バーチカル（縦型）ブラインドの「裾（すそ）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            スタイリッシュで掃き出し窓に人気だが、裾（ボトムコード）が繋がっていると、子供やペットが絡まって遊ぶため危険＆故障の原因になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            家庭用では、裾のコードがない<strong>「コードレス仕様」</strong>を選ぶのが安全とメンテナンス（洗濯のしやすさ）の観点から推奨される。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">横型ブラインドの「掃除」と「断熱性」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>アルミブラインド</strong>: スラット（羽）に埃が溜まりやすく、一枚一枚拭くのが非常に手間。また、アルミは熱を伝えるため、冬場の窓辺は強烈に寒くなる（コールドドラフト）。</li>
            <li><span className="mr-1">・</span><strong>ウッドブラインド</strong>: 木製なので断熱性が高く、静電気が起きにくいため埃も払うだけで落ちやすい。住宅のリビングにはウッドが適している。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">ロールスクリーンの「操作チェーン」事故</h4>
          
          <p className="mb-1 text-xs ml-3">
            昇降用のループ状のチェーンや紐が、子供の首に巻き付く窒息事故が起きている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 一定の荷重がかかると外れる「セーフティジョイント」付きを選ぶか、紐がない「プルコード式」や「電動式」にする配慮が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【プリーツスクリーン（和室用）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ペアタイプ」の上下配置</h4>
          
          <p className="mb-1 text-xs ml-3">
            蛇腹状の生地。厚手生地とレース生地を上下に配置できる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            選び方: 「上がレース（光を入れる）＋下が厚手（視線を遮る）」にするか、その逆にするかは、<strong>「外からの視線がどこにあるか（道路か、隣家の2階か）」</strong>によって決めないと、使い勝手が悪くなる。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('サンゲツ', {
          products: 'https://www.sangetsu.co.jp/product/?wall_type_wall#search02',
          catalog: 'https://www.sangetsu.co.jp/digital_book/curtain.html',
          office: 'https://www.sangetsu.co.jp/showroom/',
          contact: 'https://qa.sangetsu.co.jp/public/?_gl=1*1064n3w*_ga*MTkzMTUxODg4Ny4xNzMwMTAyOTY3*_ga_84EXXWDYNY*MTc0Mjk3NTAwOC4xNS4xLjE3NDI5NzUxMTMuNDQuMC4w&_ga=2.177791526.262530188.1742899184-1931518887.1730102967'
        })}
        {renderCompanyRow('東リ', {
          products: 'https://www.toli.co.jp/product/search/curtain_result?list=1',
          catalog: 'https://www.toli.co.jp/digital_catalog/digital_index.html',
          office: 'https://www.toli.co.jp/showroom/',
          contact: 'https://www.toli.co.jp/member/faq'
        })}
        {renderCompanyRow('リリカラ', {
          products: 'https://www.lilycolor.co.jp/interior/search/?cat=wall',
          catalog: 'https://www.lilycolor.co.jp/interior/catalog/curtain.html',
          office: 'https://www.lilycolor.co.jp/company/about/office.html',
          contact: 'https://www.lilycolor.co.jp/company/ir/faq/'
        })}
        {renderCompanyRow('シンコール', {
          products: 'https://www.sincol.co.jp/products/curtain.html',
          catalog: 'https://www.sincol.co.jp/digicata/index.html',
          office: 'https://www.sincol.co.jp/showroom.html',
          contact: 'https://www.sincol.co.jp/contact.html'
        })}
      </div>
    </div>
  );

  const renderBlindCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ブラインド</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【横型ブラインド（ベネシャンブラインド）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「アルミ」と「木製」の断熱格差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>アルミブラインド</strong>: 熱伝導率が高いため、夏は熱せられたスラットがラジエーターのように熱を放ち、冬は冷気を部屋に落とす（コールドドラフト）。省エネ性能は低い。</li>
            <li><span className="mr-1">・</span><strong>木製（ウッド）ブラインド</strong>: 木は熱を伝えにくいため、アルミに比べて断熱性が格段に高い。見た目だけでなく、室温環境を改善する機能建材として優秀。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">スラット幅で変わる「高級感」と「視界」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>15mm・25mm幅</strong>: 標準的なアルミブラインド。オフィス的で繊細な印象だが、羽の枚数が多いため掃除が大変で、外の景色も見えにくい。</li>
            <li><span className="mr-1">・</span><strong>35mm・50mm幅</strong>: 羽の枚数が減り、隙間が大きくなるため、掃除が楽で眺望も良くなる。欧米では50mmが標準であり、住宅のリビングにはこちらの方が高級感が出る。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「浴室」での錆びトラブル</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴室に普通のアルミブラインドをつけると、スラットは錆びなくても、ヘッドボックス（上の機械部分）の中の鉄部品が錆びて動かなくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 必ずステンレス部品や耐食アルミを使った<strong>「浴室仕様（耐水タイプ）」</strong>を選定し、ビスを打たない「突っ張り式（テンションタイプ）」にするなどの配慮が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【縦型ブラインド（バーチカルブラインド）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">エアコン風による「バタつき音」</h4>
          
          <p className="mb-1 text-xs ml-3">
            掃き出し窓に人気のバーチカルブラインドだが、エアコンの風が直撃する位置に設置すると、羽同士がぶつかって「パタパタ」と音が鳴り続ける。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            吹き抜けやリビングでは、エアコンの気流とブラインドの位置関係を計算しておかないと、不快音で使わなくなる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「センターレース」のプライバシー機能</h4>
          
          <p className="mb-1 text-xs ml-3">
            通常の縦型ブラインドは、羽の角度を変えると外から丸見えになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 厚手生地とレース生地を交互に配置した<strong>「センターレース仕様」</strong>や、L字型ルーバーを選ぶことで、光を取り込みつつプライバシーを守ることができる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ハニカムスクリーン（断熱ブラインド）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">最強の断熱装置「空気層」</h4>
          
          <p className="mb-1 text-xs ml-3">
            蜂の巣（ハニカム）状の六角形の断面を持つスクリーン。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            内部の空気層が断熱材の役割を果たすため、窓周りの断熱性能としては、カーテンや他のブラインドを凌駕して最強クラス。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            冬の寒さが厳しい寒冷地や、大開口の窓での採用率が急増している。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ダブル（ツイン）」の操作性</h4>
          
          <p className="mb-1 text-xs ml-3">
            上部をレース、下部を断熱生地にするなどの使い分けが可能だが、操作コードが複雑になりがち。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            高齢者が使う場合は、直感的に操作できるかサンプルの確認が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工：枠内（わくうち）と正面（しょうめん）付け】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「スッキリ」か「遮光」か</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>枠内付け（天井付け）</strong>： 窓枠の中に収める。壁から出っ張らず部屋が広く見えるが、周囲に隙間ができるため<strong>「光漏れ」</strong>が発生する。</li>
            <li><span className="mr-1">・</span><strong>正面付け</strong>: 窓枠より大きく作って壁に付ける。存在感は出るが、窓を完全に覆うため遮光性と断熱性が高い。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            寝室で「枠内付け」にすると、朝日が漏れて眩しいというクレームになるため、用途に応じた使い分けが必須。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('アスワン', {
          products: 'https://www.aswan.co.jp/productinformation/seriesintroduction/brandseries/',
          catalog: '#',
          office: 'https://www.aswan.co.jp/companyinformation/listofoffices.html',
          contact: '#'
        })}
        {renderCompanyRow('ニチベイ', {
          products: 'https://www.nichi-bei.co.jp/jsp/category/',
          catalog: 'https://www.nichi-bei.co.jp/jsp/dbook/',
          office: 'https://www.nichi-bei.co.jp/jsp/showroom/',
          contact: 'https://www.nichi-bei.co.jp/jsp/support/'
        })}
        {renderCompanyRow('立川ﾌﾞﾗｲﾝﾄﾞ工業', {
          products: 'https://www.blind.co.jp/products/',
          catalog: 'https://www.blind.co.jp/products/digital/',
          office: 'https://www.blind.co.jp/company/office/',
          contact: 'https://www.blind.co.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderFabricCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">生地</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【合成皮革（ビニルレザー）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「PVC（塩ビ）」と「PU（ポリウレタン）」の寿命差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>PVCレザー</strong>: 耐久性が高く、次亜塩素酸（消毒液）にも強い。安価でメンテナンスが楽だが、触り心地はビニールっぽい。飲食店や病院の標準。</li>
            <li><span className="mr-1">・</span><strong>PUレザー</strong>: 本革に近いしっとりした触感があるが、湿気で分解する<strong>「加水分解（かすいぶんかい）」</strong>を起こしやすく、3〜5年で表面がボロボロに剥がれるリスクが高い。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 長く使うならPVCを選ぶか、PUでも加水分解しにくい<strong>「高耐久（ポリカーボネート系）PU」</strong>を指定するのが鉄則。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">アルコール消毒による「硬化・割れ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            コロナ禍以降、アルコール消毒が日常化したが、耐アルコール加工がされていない古いタイプの合皮を拭き続けると、油分が抜けてカチカチになり、ひび割れが発生する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            公共施設や店舗では<strong>「耐アルコール・耐次亜塩素酸」</strong>マークのある製品選定が必須。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ファブリック（布地）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「張り込み」と「カバーリング」の意匠差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>張り込み</strong>: 生地をタッカー（針）で椅子本体に固定する。シワがなく美しいフォルムが出るが、汚れたら業者による張り替えが必要。</li>
            <li><span className="mr-1">・</span><strong>カバーリング</strong>: マジックテープやファスナーで着脱できる。洗濯可能だが、どうしても「カバーの厚み」や「ヨレ」が出てしまい、張り込みほどのシャープさは出ない。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">魔法の生地「アクアクリーン（水洗い可能生地）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            繊維の一本一本が分子レベルでコーティングされた特殊生地。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            機能: 醤油、ワイン、油性ペンなどの汚れが、<strong>「水をかけて擦るだけ」</strong>で驚くほど綺麗に落ちる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            張り込み仕様でも汚れを落とせるため、メンテナンスを気にするが布の風合いも欲しいという施主への最強の提案材料となる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ペット対策の「スナッキング（引きつれ）」強度</h4>
          
          <p className="mb-1 text-xs ml-3">
            ざっくりした織り目の生地は、猫や犬の爪が引っかかり、糸が飛び出す「スナッキング」が起きやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 爪が入り込まない<strong>「モールスキン（超高密度織り）」や、表面が起毛している「スエード・モケット調」</strong>の生地（ラムース等）を選ぶと、ペットがいてもボロボロになりにくい。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【本革（天然皮革）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「顔料（塗装）」と「染料（素仕上げ）」の使い分け</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>顔料仕上げ（ピグメント）</strong>： 革の表面を塗料でコーティングしたもの。傷や水に強く、メンテナンスが楽。車のシートや応接セットの標準。</li>
            <li><span className="mr-1">・</span><strong>染料仕上げ（アニリン）</strong>: 革本来の風合いを生かしたもの。最高に手触りが良いが、水滴一粒で<strong>「シミ」</strong>になり、日焼けもしやすい。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            「本革だから丈夫」なのではなく、「塗装されているから丈夫」なだけ。生活スタイルに合わせて選ばないと、高級な革ほどすぐに汚れてしまう。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">革の伸びと「ギャザー」</h4>
          
          <p className="mb-1 text-xs ml-3">
            本革は座っていると伸びてくる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            最初からピンと張って仕上げると、伸びた時にだらしなく波打ってしまうため、あらかじめシワを寄せる<strong>「ギャザー仕上げ」</strong>や、ステッチを入れて伸びを分散させるデザインにするのが、長く美しく使うための工夫。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【耐久スペックの読み方】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">摩耗強度「マーチンデール値」</h4>
          
          <p className="mb-1 text-xs ml-3">
            生地のカタログに載っている数値。機械で何万回擦って破れるかをテストしたもの。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            目安: 住宅なら2万回以上、店舗やオフィスなら4万〜5万回以上の数値がある生地を選べば、すぐに擦り切れることはない。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('サンゲツ', {
          products: 'https://www.sangetsu.co.jp/product/?wall_type_wall#search02',
          catalog: 'https://www.sangetsu.co.jp/digital_book/chair.html',
          office: 'https://www.sangetsu.co.jp/showroom/',
          contact: 'https://qa.sangetsu.co.jp/public/?_gl=1*1064n3w*_ga*MTkzMTUxODg4Ny4xNzMwMTAyOTY3*_ga_84EXXWDYNY*MTc0Mjk3NTAwOC4xNS4xLjE3NDI5NzUxMTMuNDQuMC4w&_ga=2.177791526.262530188.1742899184-1931518887.1730102967'
        })}
        {renderCompanyRow('シンコール', {
          products: 'https://www.sincol.co.jp/products/fabric.html',
          catalog: 'https://www.sincol.co.jp/digicata/index.html',
          office: 'https://www.sincol.co.jp/showroom.html',
          contact: 'https://www.sincol.co.jp/contact.html'
        })}
      </div>
    </div>
  );

  const renderOtherFurnitureCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ファニチャーその他</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【ラグ・絨毯（置き敷き）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">ウール特有の「遊び毛（あそびげ）」クレーム</h4>
          
          <p className="mb-1 text-xs ml-3">
            高級なウールのハンドタフテッド（手織り風）ラグは、使い始めから半年程度、綿埃のような<strong>「遊び毛」</strong>が大量に出る。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            重要: これは不良品ではなく、短い毛が抜けて新しい毛が出てくる仕様。「掃除機をかけてもゴミが減らない」というクレームを防ぐため、必ず事前の説明が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「床暖房」対応の裏地（バックコーティング）</h4>
          
          <p className="mb-1 text-xs ml-3">
            海外製のラグや安価なラグは、裏面の接着剤（ラテックス）が熱に弱く、床暖房の上で使うと溶けて床に張り付いたり、粉状に崩れたりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            採用時は必ず<strong>「耐熱ラテックス」</strong>を使用しているか、床暖房対応の表記があるかを確認する。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">サイズ選びの「家具との関係」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ラグのサイズは部屋の大きさではなく、<strong>「ソファとの関係」</strong>で決める。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            プロのセオリー:
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>全乗せ</strong>: ソファの脚も全てラグに乗せる（広い部屋向け・高級感）。</li>
            <li><span className="mr-1">・</span><strong>前脚だけ</strong>: ソファの前脚だけ乗せる（今の主流・ズレ防止になる）。</li>
            <li><span className="mr-1">・</span><strong>テーブルだけ</strong>: ソファの前に独立して置く（カジュアル・部屋が広く見える）。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            中途半端にソファの脚が外れると、ガタつきの原因になる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【マットレス（ベッド）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ボンネルコイル」と「ポケットコイル」の振動</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ボンネル（連結）</strong>： バネが繋がっている。硬めで耐久性が高く、ホテルで多用されるが、横の人が動くと振動が伝わる。</li>
            <li><span className="mr-1">・</span><strong>ポケット（独立）</strong>: バネが袋に入って独立している。体圧分散に優れ、振動が伝わりにくい。二人で寝るならポケット一択。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">立ち上がりを支える「エッジサポート」</h4>
          
          <p className="mb-1 text-xs ml-3">
            マットレスの端（エッジ）に硬いバネやウレタンを入れて補強する機能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            重要: これがないと、ベッドの端に腰掛けた時にグニャリと沈み込んでしまい、立ち上がりにくい上、転落しそうになる。高齢者や腰痛持ちには必須の機能。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ベッドパッド」は汗取りの必須アイテム</h4>
          
          <p className="mb-1 text-xs ml-3">
            シーツの下に敷く「ベッドパッド」を省略する人がいるが、これはNG。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            人は寝ている間にコップ1杯の汗をかく。パッドがないと湿気がマットレス内部（ウレタンやバネ）に蓄積し、カビや錆びの原因になる。マットレスを洗うことはできないため、パッドで汗を受け止めるのが鉄則。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【クッション（中材・ヌードクッション）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ポリエステル」と「フェザー（羽根）」の意匠差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ポリエステル綿</strong>: パンパンに膨らむ。安価で反発力が強いが、形が単調で「安っぽく」見えがち。</li>
            <li><span className="mr-1">・</span><strong>フェザー（羽根）</strong>： 重みがあり、沈み込む。</li>
          </ul>
          
          <p className="mb-1 text-xs ml-3">
            プロの演出: フェザーのクッションは、真ん中をチョップして凹ませる<strong>「カラテチョップ」</strong>の形を作れるため、モデルルームのような「こなれ感」が出る。インテリアに拘るならフェザー（またはフェザー混）が推奨される。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">へたりにくい「フェザー＋ウレタンチップ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            フェザー100%は高級だが、使うとぺしゃんこになり、毎回形を整える必要がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            芯にウレタンチップを入れたり、ポリエステル綿を混ぜたりした<strong>「混合タイプ」</strong>を選ぶと、フェザーの風合いと復元力（メンテナンス性）を両立できる。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>

      {renderCompanyRow('サンゲツ', {
        products: 'https://www.sangetsu.co.jp/product/',
        catalog: 'https://www.sangetsu.co.jp/catalog/',
        office: 'https://www.sangetsu.co.jp/company/base/',
        contact: 'https://www.sangetsu.co.jp/contact/'
      })}
      {renderCompanyRow('リリカラ', {
        products: 'https://www.lilycolor.co.jp/interior/',
        catalog: 'https://www.lilycolor.co.jp/catalog/',
        office: 'https://www.lilycolor.co.jp/company/base/',
        contact: 'https://www.lilycolor.co.jp/contact/'
      })}
      {renderCompanyRow('川島織物セルコン', {
        products: 'https://www.kawashimaselkon.co.jp/curtain/',
        catalog: '#',
        office: 'https://www.kawashimaselkon.co.jp/company/base/',
        contact: 'https://www.kawashimaselkon.co.jp/contact/'
      })}
      {renderCompanyRow('タチカワブラインド', {
        products: 'https://www.blind.co.jp/products/',
        catalog: 'https://www.blind.co.jp/catalog/',
        office: 'https://www.blind.co.jp/company/base/',
        contact: 'https://www.blind.co.jp/contact/'
      })}
      {renderCompanyRow('ニチベイ', {
        products: 'https://www.nichi-bei.co.jp/products/',
        catalog: 'https://www.nichi-bei.co.jp/catalog/',
        office: 'https://www.nichi-bei.co.jp/company/base/',
        contact: 'https://www.nichi-bei.co.jp/contact/'
      })}
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">{title}</h2>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('サンゲツ', {
          products: 'https://www.sangetsu.co.jp/product/',
          catalog: 'https://www.sangetsu.co.jp/catalog/',
          office: 'https://www.sangetsu.co.jp/company/base/',
          contact: 'https://www.sangetsu.co.jp/contact/'
        })}
        {renderCompanyRow('リリカラ', {
          products: 'https://www.lilycolor.co.jp/interior/',
          catalog: 'https://www.lilycolor.co.jp/catalog/',
          office: 'https://www.lilycolor.co.jp/company/base/',
          contact: 'https://www.lilycolor.co.jp/contact/'
        })}
        {renderCompanyRow('川島織物セルコン', {
          products: 'https://www.kawashimaselkon.co.jp/curtain/',
          catalog: '#',
          office: 'https://www.kawashimaselkon.co.jp/company/base/',
          contact: 'https://www.kawashimaselkon.co.jp/contact/'
        })}
        {renderCompanyRow('タチカワブラインド', {
          products: 'https://www.blind.co.jp/products/',
          catalog: 'https://www.blind.co.jp/catalog/',
          office: 'https://www.blind.co.jp/company/base/',
          contact: 'https://www.blind.co.jp/contact/'
        })}
        {renderCompanyRow('ニチベイ', {
          products: 'https://www.nichi-bei.co.jp/products/',
          catalog: 'https://www.nichi-bei.co.jp/catalog/',
          office: 'https://www.nichi-bei.co.jp/company/base/',
          contact: 'https://www.nichi-bei.co.jp/contact/'
        })}
      </div>
    </div>
  );

  switch (subcategory) {
    case '家具':
      return renderFurnitureCategory();
    case 'カーテン':
      return renderCurtainCategory();
    case 'ブラインド':
      return renderBlindCategory();
    case '生地':
      return renderFabricCategory();
    case 'ファニチャーその他':
      return renderOtherFurnitureCategory();
    default:
      return null;
  }
};

export default FurnitureContent; 