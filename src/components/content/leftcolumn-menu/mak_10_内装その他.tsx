import React, { useState } from 'react';

interface InternalOtherContentProps {
  subcategory: string;
}

const InternalOtherContent: React.FC<InternalOtherContentProps> = ({ subcategory }) => {
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
      <img 
        src={imageError['commercial'] ? "/image/ChatGPT Image 2025年5月1日 16_25_41.webp" : "/image/ChatGPT Image 2025年5月1日 16_25_41.webp"} 
        alt="Manufacturer Commercial" 
        className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
        onError={() => handleImageError('commercial')}
      />
    </div>
  );

  const renderToiletBooth = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">トイレブース</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【パネル素材（芯材）の決定的な差】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">標準仕様「パーチクルボード＋メラミン」</h4>
          
          <p className="mb-1 text-xs ml-3">
            木質チップを固めたボードにメラミン化粧板を貼ったもの。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            弱点: 表面は水に強いが、「芯材（木）」は水を吸う。小口（エッジ）の隙間から水が入ると、膨張して腐る。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            用途: オフィスや店舗のドライ運用（水を撒かない掃除）のトイレ向け。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">最強の耐久性「ソリッドフェノール（無垢材）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            紙に樹脂を含浸させて高圧で固めた、中までカチカチの板（厚さ13mm程度）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            特徴: <strong>「完全防水」かつ、ハンマーで叩いても割れないほどの「耐衝撃性」</strong>がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            用途: 水洗いする学校のトイレ、シャワーブース、高速道路のPAなど、過酷な環境では必須のスペック。価格は高い。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「鋼板（スチール・ステンレス）」の剛性</h4>
          
          <p className="mb-1 text-xs ml-3">
            金属板でハニカム材を挟んだパネル。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            非常に丈夫で不燃材料。マグネットがつく。塗装仕上げのため、傷がつくとそこから錆びるリスクがある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【エッジ（小口）処理の違い】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">耐久性の「アルミエッジ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            パネルの周囲をアルミの枠で囲う仕様。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 角が金属でガードされるため、鞄がぶつかっても欠けない。水も入りにくい。学校や駅などの公共施設で標準。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デメリット: 縦のアルミラインが目立つため、デザイン性はやや劣る。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">意匠性の「エッジテープ（共貼り）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            パネルと同じ柄のテープを側面に貼る仕様。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 一枚の板のように見え、高級感がある。ホテルやオフィス向け。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デメリット: 角に物がぶつかるとテープが欠けたり剥がれたりしやすい。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【足元の納まり（支持方法）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">標準「床支持（ゆかしじ）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            床にステンレスの脚（サポート）を立ててパネルを支える。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            デメリット: 脚の周りに汚れが溜まりやすく、モップ掛けの邪魔になる。また、水洗いをすると脚の根元が腐食しやすい。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">清掃性抜群の「吊り式（ハンギング）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            天井（または上部の梁）からパネルを吊るす工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: <strong>「足元に何もない」</strong>ため、床掃除が劇的に楽になり、見た目も浮遊感があり美しい。高級物件や清掃頻度の高い施設で採用される。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 天井に強固な下地鉄骨が必要になるため、建築工事段階からの調整が必須。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【金具と安全対策】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「指詰め防止」の隙間</h4>
          
          <p className="mb-1 text-xs ml-3">
            ドアの吊元（丁番側）に指を挟む事故を防ぐため、あらかじめゴムクッションを付けたり、隙間を大きく開けておく設計が推奨される。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">非常時の「外開き」救出機能</h4>
          
          <p className="mb-1 text-xs ml-3">
            トイレ内で人が倒れた際、内開きドアだと体が邪魔をして開けなくなる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            必須機能: コインなどで鍵を解錠できるだけでなく、いざという時にドアごと外すか、逆方向に開けられる<strong>「非常解錠（救出）グレビティヒンジ」</strong>の採用が、公共トイレの安全基準。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「使用中」表示の視認性</h4>
          
          <p className="mb-1 text-xs ml-3">
            鍵（スライドラッチ）の表示窓（赤・青）は、デザイン重視で小さすぎると視認性が悪い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ユニバーサルデザインの観点から、遠くからでも分かる大型の表示錠や、ＬＥＤで光るサインの設置が増えている。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・木村技研</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://aqua-k.jp/goods/goods_top.html', '商品ページ')}｜
          {renderLink('https://docs.google.com/forms/d/e/1FAIpQLSd_uFs8iAaT6ktSR4Go6ypOHs_pbvc-bRlzWS5DVNpj3CZy1w/viewform', 'カタログ')}｜
          {renderLink('https://aqua-k.jp/company/info02.html', '営業所')}｜
          {renderLink('https://docs.google.com/forms/d/e/1FAIpQLSdzcvpSYnCxarjvDP7dlpexrdfbs6clJqLm7DLbafRaTXa-Qg/viewform?pli=1', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・コマニー</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.comany.co.jp/products/toilet/', '商品ページ')}｜
          {renderLink('https://www.comany.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.comany.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.comany.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アイカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.aica.co.jp/products/veneer/toilet/', '商品ページ')}｜
          {renderLink('https://www.aica.co.jp/products/dl/', 'カタログ')}｜
          {renderLink('https://www.aica.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.aica.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・オカムラ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.okamura.co.jp/product/toilet/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.okamura.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.okamura.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ニッコー</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nikko-company.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nikko-company.co.jp/company/', '営業所')}｜
          {renderLink('https://www.nikko-company.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderInteriorSash = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装サッシ</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【インナーサッシ（二重窓）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「樹脂製」でないと意味がない</h4>
          
          <p className="mb-1 text-xs ml-3">
            既存の窓の内側にもう一つ窓をつけて断熱する製品（LIXIL「インプラス」、YKK AP「プラマードU」等）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: 枠の素材は必ず<strong>「樹脂製」</strong>を選ぶこと。アルミ製のインナーサッシでは、枠自体が結露してしまい、二重窓にした意味が半減する。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">防音の鍵は「異厚（いあつ）ガラス」</h4>
          
          <p className="mb-1 text-xs ml-3">
            防音目的で二重窓にする場合、既存の窓ガラスと同じ厚さのガラス（例：3mmと3mm）を入れると、<strong>「共鳴現象（コインシデンス効果）」</strong>が起きて、特定の周波数の音が逆に通り抜けてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 既存が3mmなら、内窓は5mmにするなど、あえて<strong>「厚みを変える」</strong>ことで、防音性能が劇的に向上する。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ふかし枠」の追加コスト</h4>
          
          <p className="mb-1 text-xs ml-3">
            インナーサッシを取り付けるには、既存の窓枠に7cm程度の奥行き（有効寸法）が必要。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            奥行きが足りない場合は、枠を継ぎ足す<strong>「ふかし枠」</strong>というオプション部材が必要になり、材料費と施工費が上がるため、事前の現地調査が不可欠。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【室内窓（デコマド等）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「強化ガラス」の安全指定</h4>
          
          <p className="mb-1 text-xs ml-3">
            リビングと書斎、寝室と廊下の間などに設置する黒縁の窓。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: 万が一、子供がぶつかったり地震で割れたりした場合、普通のガラス（フロートガラス）は鋭利な刃物のように割れて大怪我をする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 人が触れる高さに設置する場合は、粉々に砕ける<strong>「強化ガラス」や、飛び散らない「合わせガラス」</strong>を指定するのがプロの安全管理。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「突き出し（押し出し）」と「引き違い」の風通し</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>突き出し窓</strong>: 下が開くため、風を捕まえやすく（ウインドキャッチ）、通風効果が高い。ただし、開けた時に廊下を通る人の邪魔になることがある。</li>
            <li><span className="mr-1">・</span><strong>引き違い窓</strong>: 開閉スペースを取らないが、気密性が低く、音漏れしやすい。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【可動間仕切り（スライディングドア）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「上吊り（うわづり）」と「下レール」の選択</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>上吊り</strong>: 床にレールがないため、フロアがフラットに繋がり、掃除が楽。ただし、床に固定されていないため、風や開閉時に<strong>「振れ（バタつき）」</strong>が生じやすい。気密・遮音性は低い。</li>
            <li><span className="mr-1">・</span><strong>下レール</strong>: 床にレールを埋め込む。扉が安定し、気密性が高まるため、寝室などの個室化には向いているが、レールにゴミが溜まる。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「ソフトクローズ」は必須機能</h4>
          
          <p className="mb-1 text-xs ml-3">
            天井まであるハイドアや、ガラス入りの框（かまち）ドアは重量がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            指詰め事故や、閉めた時の「バーン！」という衝撃音を防ぐため、閉まる直前にブレーキがかかってゆっくり引き込む<strong>「ソフトクローズ（ダブルクローズ）」</strong>機能は、コストを削ってでも付けるべき。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">アルミとスチール（鉄）の質感差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>アルミ</strong>: 軽量で操作が軽く、錆びない。既製品が多く安価。</li>
            <li><span className="mr-1">・</span><strong>スチール（アイアン）</strong>: 枠を極限まで細くできるためデザイン性が高い（ブルックリンスタイル等）。しかし非常に重く、特注対応になるため高価で納期がかかる。</li>
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・LIXIL</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.lixil.co.jp/lineup/window/', '商品ページ')}｜
          {renderLink('https://www.lixil.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.lixil.co.jp/showroom/', '営業所')}｜
          {renderLink('https://www.lixil.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・YKK AP</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.ykkap.co.jp/consumer/products/window/', '商品ページ')}｜
          {renderLink('https://www.ykkap.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.ykkap.co.jp/showroom/', '営業所')}｜
          {renderLink('https://www.ykkap.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・大建工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.ne.jp/product/door/', '商品ページ')}｜
          {renderLink('https://www.daiken.ne.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.daiken.ne.jp/company/office/', '営業所')}｜
          {renderLink('https://www.daiken.ne.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・三協立山</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://alumi.st-grp.co.jp/products/interior/', '商品ページ')}｜
          {renderLink('https://alumi.st-grp.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://alumi.st-grp.co.jp/company/base/', '営業所')}｜
          {renderLink('https://alumi.st-grp.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・不二サッシ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.fujisash.co.jp/hp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.fujisash.co.jp/hp/company/office/', '営業所')}｜
          {renderLink('https://www.fujisash.co.jp/hp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderNonSlip = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ノンスリップ</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【ノンスリップ（階段滑り止め）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「タイヤ（樹脂ゴム）」の交換メンテナンス</h4>
          
          <p className="mb-1 text-xs ml-3">
            一般的なノンスリップは、金属の台座（ベース）と、滑り止めのゴム（タイヤ）で構成されている。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            重要: タイヤは消耗品であり、数年で擦り減ってツルツルになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            学校や商業施設など通行量が多い場所では、台座ごと交換しなくて済むように、<strong>「タイヤのみ交換可能」</strong>な製品を選定しておくのがLCC（ライフサイクルコスト）削減の鉄則。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">意匠性と安全性の「コントラスト」</h4>
          
          <p className="mb-1 text-xs ml-3">
            デザインを優先して床材と同色のノンスリップを選ぶと、段差の境界が見えづらく、踏み外し事故の原因になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            UD（ユニバーサルデザイン）: 高齢者や弱視の方に配慮し、床材とはあえて違う色を選んで<strong>「段差を視覚的に強調（コントラスト確保）」</strong>するのが、公共施設やバリアフリー住宅の標準設計。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「蓄光（ちっこう）」機能の標準化</h4>
          
          <p className="mb-1 text-xs ml-3">
            太陽光や照明の光を蓄え、暗くなると発光する機能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            火災や停電時に真っ暗になっても階段の位置がわかるため、避難安全性を高める目的で、タイヤの一部に蓄光ラインが入った製品を採用するケースが増えている。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ステンレス」と「アルミ」の使い分け</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>アルミ製</strong>: 軽量で加工しやすく、カラーバリエーションが豊富。屋内階段の標準。</li>
            <li><span className="mr-1">・</span><strong>ステンレス製</strong>: 非常に硬く、錆びにくい。屋外階段や、濡れた靴で歩くエントランス周り、高級感を演出したい場所に使われる。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">リフォーム時の「面付け（めんつけ）」段差</h4>
          
          <p className="mb-1 text-xs ml-3">
            新築時は床に埋め込んでフラットに納める「先付け」ができるが、リフォーム（後付け）の場合は、階段の上から被せる「面付け」になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            リスク: 数ミリの厚みが出るため、すり足で歩く高齢者が<strong>「ノンスリップそのものにつまずく」</strong>リスクがある。リフォーム時は、端部が極力薄くスロープ状になっている「薄型製品」を選ぶ配慮が必要。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日中製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.hinaka.co.jp/new_hp/item/list.php#BIM_%E9%9A%8E%E6%AE%B5%E3%83%8E%E3%83%B3%E3%82%B9%E3%83%AA%E3%83%83%E3%83%97', '商品ページ')}｜
          {renderLink('https://www.hinaka.co.jp/item_catalog/', 'カタログ')}｜
          {renderLink('https://www.hinaka.co.jp/company/#list', '営業所')}｜
          {renderLink('https://www.hinaka.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アシスト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.assipie.jp/solution/genre/non-slip/', '商品ページ')}｜
          {renderLink('https://www.assipie.jp/solution/request/', 'カタログ')}｜
          {renderLink('https://www.assipie.jp/solution/company/office/', '営業所')}｜
          {renderLink('https://www.assipie.jp/solution/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ヒナカ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.hinaka.co.jp/new_hp/item/list.php#BIM_%E9%9A%8E%E6%AE%B5%E3%83%8E%E3%83%B3%E3%82%B9%E3%83%AA%E3%83%83%E3%83%97', '商品ページ')}｜
          {renderLink('https://www.hinaka.co.jp/item_catalog/', 'カタログ')}｜
          {renderLink('https://www.hinaka.co.jp/company/#list', '営業所')}｜
          {renderLink('https://www.hinaka.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シンドウ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shindo-kogyo.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.shindo-kogyo.co.jp/total-catalog/#target/page_no=1', 'カタログ')}｜
          {renderLink('https://www.shindo-kogyo.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.shindo-kogyo.co.jp/quote/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naka-kogyo.co.jp/products/category-products/non-slip-and-braille-rivet', '商品ページ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/download/catalog.html', 'カタログ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/company/office.html', '営業所')}｜
          {renderLink('https://mailform.naka-kogyo.co.jp/support/script/mailform/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderInteriorShutter = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装シャッター</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【防火・防煙（ぼうえん）シャッター】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「火」だけでなく「煙」も防ぐ</h4>
          
          <p className="mb-1 text-xs ml-3">
            大規模な商業施設や病院の屋内シャッターは、単なる仕切りではなく、火災時に閉鎖してエリアを区切る「防火区画」の役割を持つ。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            防煙シャッター: 特にエレベーターホールや階段室前には、煙を通さない気密性の高い<strong>「遮煙（しゃえん）性能」</strong>を持つシャッターの設置が義務付けられる場所がある。通常の防火シャッターとは仕様が異なるため厳格な確認が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「危害防止機構（きがいぼうし）」の絶対義務</h4>
          
          <p className="mb-1 text-xs ml-3">
            火災信号で自動降下するシャッターには、下に人がいた場合に接触してストップする（または戻る）安全装置の設置が義務化されている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            既存不適格（古い建物）の改修工事では、この安全装置の後付けが必須となるケースが多い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【パイプシャッター（グリルシャッター）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「防犯」と「視認性」の両立</h4>
          
          <p className="mb-1 text-xs ml-3">
            金属パイプをリンク状に組んだシャッター。ショッピングモール内の店舗などで、閉店後もディスプレイを見せたい場合に採用される。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            空調ロス: 隙間だらけなので、店内と通路の空気が混ざり合う。空調効率を考えるなら、透明な<strong>「ポリカーボネートパネル」</strong>を嵌め込んだタイプ（パネルシャッター）を選ぶべき。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ステンレスとアルミの質感</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ステンレス</strong>: ギラつきが少なく、高級感と強度がある。ブランド店向け。</li>
            <li><span className="mr-1">・</span><strong>アルミ</strong>: 軽量で開閉が楽だが、質感は少し軽い。コスト重視向け。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【カウンターシャッター（軽量）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「施錠（鍵）」の向きに注意</h4>
          
          <p className="mb-1 text-xs ml-3">
            給食室の配膳口や、受付カウンターに使われる小型シャッター。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            落とし穴: 「部屋の内側から鍵をかける」のか「外側（廊下側）からかける」のか、運用に合わせて鍵の位置を指定し忘れると、使い物にならなくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            両面シリンダー（両側から鍵がかかる）仕様にするのが最もトラブルが少ない。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【天井納まり（ボックス）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「天井隠蔽（いんぺい）」と点検口</h4>
          
          <p className="mb-1 text-xs ml-3">
            意匠性を高めるため、シャッターボックスを天井裏に隠す納まりが一般的。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須条件: メンテナンスや故障時の修理のため、ボックスの真下に必ず<strong>「点検口」</strong>を設けなければならない。これを忘れると、シャッターが壊れた時に天井を破壊することになる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">座板（ざいた）の収納</h4>
          
          <p className="mb-1 text-xs ml-3">
            シャッターを上げた時、一番下の座板（取っ手がある部分）だけが天井面に残る納まりにするか、座板まで完全に隠れるようにするかで、天井懐（ふところ）の必要寸法が変わる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            完全に隠す場合は、天井内にスリット（隙間）を設ける詳細設計が必要。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アシスト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.assist777.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.assist777.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.assist777.co.jp/company/', '営業所')}｜
          {renderLink('https://www.assist777.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naka-kogyo.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.naka-kogyo.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・アルミス</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('#', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('#', '営業所')}｜
          {renderLink('#', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・タキステップ(タキロン)</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.takiron-ci.co.jp/product/product_03/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.takiron-ci.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.takiron-ci.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・菊川工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kikukawa.com/product/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.kikukawa.com/company/', '営業所')}｜
          {renderLink('https://www.kikukawa.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderInteriorHandrail = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装手摺</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【安全設計のディテール】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「袖口（そでぐち）」を引っ掛けない納まり</h4>
          
          <p className="mb-1 text-xs ml-3">
            階段で転倒する原因の一つに、手摺の端部（切れ目）に服の袖や荷物が引っかかってバランスを崩す事故がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須仕様: 手摺の端は切りっぱなしにせず、壁側に曲げ込む<strong>「エンドブラケット（R形状）」や、縦につなげるなどして、「服が引っかからない形状」</strong>にするのがバリアフリー設計の鉄則。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「35mm」がユニバーサルデザインの標準</h4>
          
          <p className="mb-1 text-xs ml-3">
            手摺の太さは、太すぎても細すぎても握りにくい。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            日本人の手に最も馴染み、強く握れる標準サイズは<strong>「直径35mm」</strong>。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ※トイレや浴室のI型手摺（立ち上がり用）は、少し細めの32mmや、滑りにくいディンプル（凹凸）加工付きが推奨される場合がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「連続手摺」の重要性</h4>
          
          <p className="mb-1 text-xs ml-3">
            階段の曲がり角（踊り場）で手摺が途切れていると、視覚障害者や高齢者はそこで手が離れ、不安や転倒のリスクが生じる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            自在継手（じざいつぎて）： 角度が変わる部分を専用のジョイント金具で繋ぎ、<strong>「一度も手を離さずに登りきれる」</strong>連続手摺にするのが基本。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【施工と下地（したじ）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">石膏ボードには効かない</h4>
          
          <p className="mb-1 text-xs ml-3">
            手摺には体重がかかるため、石膏ボードの壁にビスを打ってもすぐに抜けてしまい、大事故になる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            新築: 設計段階で、手摺を取り付ける高さに<strong>「下地補強（木材や合板）」</strong>を入れておく必要がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            リフォーム: 下地がない場所に後付けする場合、壁の上に<strong>「補強板（ベースプレート）」</strong>という木の板を柱間に渡し、その板の上に手摺を取り付ける工法が一般的。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【素材と質感の選び方】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">スチール（アイアン）手摺の「冷たさ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            黒いアイアン手摺はスケルトン階段などで大人気だが、金属は熱を奪うため、冬場は非常に冷たくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 手で触れる笠木（トップレール）部分だけを「木製」にする仕様や、冷たさを覚悟の上で採用するかの確認が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">樹脂手摺の「衛生・視認性」</h4>
          
          <p className="mb-1 text-xs ml-3">
            病院や施設で使われる樹脂被覆手摺。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            特徴: 木材より汚れに強く、抗菌・抗ウイルス仕様が多い。また、壁の色とコントラストをつけて（白い壁に濃い手摺など）視認性を高めることができるため、高齢者施設では木製より樹脂製が選ばれる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【吹き抜け・スケルトン階段の手摺】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">子供の「すり抜け」事故防止</h4>
          
          <p className="mb-1 text-xs ml-3">
            開放的なスケルトン階段の手摺（横桟やパネルなし）は、小さな子供が隙間から転落するリスクがある。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            基準: 手摺子（てすりこ：縦の棒）の間隔は、子供の頭が通らない<strong>「110mm以下」</strong>にするのが安全基準の目安。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デザイン重視で隙間を大きくする場合は、子供が小さいうちは転落防止ネットを張るなどの対策が必須。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・永大産業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.eidai.com/product/stairs/', '商品ページ')}｜
          {renderLink('https://prosite.eidai-sangyo.co.jp/iportal/CatalogSearch.do?method=catalogSearchByCategory&volumeID=GAZOU&categoryID=290110000&sortKey=CatalogMain270000&sortOrder=ASC', 'カタログ')}｜
          {renderLink('https://www.eidai.com/profile/corporate/network.html', '営業所')}｜
          {renderLink('https://www.eidai.com/contact/#contact_anchor', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・南海プライウッド</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nankaiplywood.co.jp/product/lumist/', '商品ページ')}｜
          {renderLink('https://www.nankaiplywood.co.jp/catalog/#sougou', 'カタログ')}｜
          {renderLink('https://www.nankaiplywood.co.jp/company/info/overview.html', '営業所')}｜
          {renderLink('https://www.nankaiplywood.co.jp/support/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・マツ六</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.mazroc.co.jp/products_1/corridor', '商品ページ')}｜
          {renderLink('https://www.mazroc.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.mazroc.co.jp/company/eigyossho.html', '営業所')}｜
          {renderLink('https://www.mazroc.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・セブン工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.seven-gr.co.jp/interior/list.php?id=2', '商品ページ')}｜
          {renderLink('https://www.catalabo.org/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=CATALABO&catalogId=73090960000&pageGroupId=&designID=link&catalogCategoryId=&designConfirmFlg=', 'カタログ')}｜
          {renderLink('https://www.seven-gr.co.jp/corporate/location.php', '営業所')}｜
          {renderLink('https://www.seven-gr.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ウッドワン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.woodone.co.jp/product/item/housing_cat/kaidan-tesuri/', '商品ページ')}｜
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
          {renderLink('https://www.noda-co.jp/products/stairs/', '商品ページ')}｜
          {renderLink('https://www.noda-co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.noda-co.jp/corporate/info/office.html', '営業所')}｜
          {renderLink('https://www.noda-co.jp/contacts/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・シンドウ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.shindo-kogyo.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.shindo-kogyo.co.jp/total-catalog/#target/page_no=1', 'カタログ')}｜
          {renderLink('https://www.shindo-kogyo.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.shindo-kogyo.co.jp/quote/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naka-kogyo.co.jp/products/category-products/handrail', '商品ページ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/download/catalog.html', 'カタログ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/company/office.html', '営業所')}｜
          {renderLink('https://mailform.naka-kogyo.co.jp/support/script/mailform/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・久力製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kuriki-ss.co.jp/search/ctg09000.html', '商品ページ')}｜
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
          {renderLink('https://www.kawajun.jp/hw/product_cat/grabbar', '商品ページ')}｜
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
          {renderLink('https://www.jo-zu-works.com/view/category/ct13', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.jo-zu-works.com/view/page/company', '営業所')}｜
          {renderLink('https://www.jo-zu-works.com/ssl/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・朝日ウッドテック</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.woodtec.co.jp/products/lineup/stairs/', '商品ページ')}｜
          {renderLink('https://www.woodtec.co.jp/products/digital_catalog/', 'カタログ')}｜
          {renderLink('https://www.woodtec.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.woodtec.co.jp/customer/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderGrating = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">グレーチング</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【浴室・プールサイド用グレーチング】の深掘り</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「軟質塩ビ」と「硬質樹脂」の使い分け</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>軟質塩ビ</strong>: 非常に柔らかく、素足で踏んだ時の感触が良い。プールサイドや大浴場の洗い場など、裸足利用がメインの場所に最適。</li>
            <li><span className="mr-1">・</span><strong>硬質樹脂（ポリプロピレン等）</strong>: 強度が高く、車椅子やストレッチャーが通る場所でも割れにくい。介護施設の浴室や、土足と素足が混在するエリアに適している。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">カビ・ヌメリ対策の「抗菌・防カビ剤」</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴室用グレーチングは、石鹸カスや皮脂汚れで裏側がヌルヌルになりやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            選定: 素材自体に「抗菌・防カビ剤」が練り込まれている製品を選ぶことが重要。表面だけのコーティングだと、清掃時の摩擦で効果が薄れてしまう。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">清掃性を左右する「持ち上げやすさ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            溝（排水溝）の掃除をする際、グレーチングが重かったり、ハマりがきつすぎると、清掃スタッフの負担になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ロールアップ式: くるくると丸めて取り外せるタイプは、長い距離でも一人で簡単に撤去でき、掃除が劇的に楽になるため、大型施設での採用率が高い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【厨房用グレーチング】の深掘り</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ノンスリップ」のグレード</h4>
          
          <p className="mb-1 text-xs ml-3">
            油で滑る厨房では、ステンレス製グレーチングの表面加工が命綱となる。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ローレット加工（ギザギザ）</strong>: 一般的だが、油汚れが溝に詰まりやすく、掃除しにくい。</li>
            <li><span className="mr-1">・</span><strong>突起加工（イボイボ）</strong>: 点で支えるため滑りにくく、汚れが詰まりにくい。清掃性を重視するならこちらが推奨される。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">害虫を防ぐ「防虫網（ぼうちゅうあみ）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            排水溝はゴキブリなどの侵入経路になりやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            グレーチングの下に、ステンレス製の細かいメッシュ（防虫網）をセットできる製品を選ぶことで、衛生管理レベルを上げることができる。ただし、ゴミも詰まりやすくなるため、こまめな清掃が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【エントランス・テラス用グレーチング】の深掘り</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「細目（さいめ）」と「普通目（なみめ）」の境界線</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>普通目</strong>: 格子の隙間が30mm程度。安価で排水性が良いが、ハイヒールや杖の先がハマる。車路やバックヤード向け。</li>
            <li><span className="mr-1">・</span><strong>細目</strong>: 隙間が10mm程度。ヒールがハマりにくく、ベビーカーもスムーズに通れる。人が通るメインエントランスは必ず細目にするのが設計のマナー。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">意匠性を高める「化粧蓋（けしょうぶた）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            グレーチングの金属感（格子）を見せたくない場合、ステンレスの枠の中に石やタイルを充填できる<strong>「充填用グレーチング（化粧蓋）」</strong>を採用する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            床仕上げと一体化できるため、ホテルのエントランスなどで多用されるが、重量が非常に重くなるため、開閉用の専用ハンドルが必要になる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ガタつき音を消す「騒音防止ゴム」</h4>
          
          <p className="mb-1 text-xs ml-3">
            金属同士がぶつかる「カチャン」という音は、高級感を損なうだけでなく、近隣騒音のトラブルになる（特にマンションの駐車場入り口など）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 受枠（レール）と本体の接触部分に<strong>「軟質樹脂」や「ゴムパッキン」</strong>が装着されている製品を選ぶことで、金属音をほぼ無音にできる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ボルト固定」による盗難・跳ね上がり防止</h4>
          
          <p className="mb-1 text-xs ml-3">
            公共スペースや風の強い場所では、グレーチングが盗まれたり、強風や車の通過で跳ね上がったりするリスクがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ボルト固定式: 本体と受枠をボルトで固定するタイプ。メンテナンス（取り外し）の手間は増えるが、安全性と防犯性は確実。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ダイケン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.ne.jp/products/interior.html#products07', '商品ページ')}｜
          {renderLink('https://pro.daiken.ne.jp/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=DAI00011&designID=DAID01', 'カタログ')}｜
          {renderLink('https://www.daiken.ne.jp/profile/officelist.html', '営業所')}｜
          {renderLink('https://www.daiken.ne.jp/question', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ダイクレ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daikure.co.jp/grating/', '商品ページ')}｜
          {renderLink('https://www.daikure.co.jp/grating/catalog/', 'カタログ')}｜
          {renderLink('https://www.daikure.co.jp/about/office-information/', '営業所')}｜
          {renderLink('https://www.daikure.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・マキテック</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.makitech.co.jp/construction/grating.html', '商品ページ')}｜
          {renderLink('https://www.makitech.co.jp/support/catalog.html', 'カタログ')}｜
          {renderLink('https://www.makitech.co.jp/company/kyoten.html#s1', '営業所')}｜
          {renderLink('https://www.makitech.co.jp/support/form01.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・カワグレ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://kawagure.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://kawagure.co.jp/company/', '営業所')}｜
          {renderLink('https://kawagure.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・中部ｺｰﾎﾟﾚｰｼｮﾝ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.chubu-net.co.jp/kenzai/Product/category/7', '商品ページ')}｜
          {renderLink('https://www.catalabo.org/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=CATALABO&catalogId=81187640000&pageGroupId=101&designID=link&catalogCategoryId=&designConfirmFlg=&pagePosition=R', 'カタログ')}｜
          {renderLink('https://www.chubu-net.co.jp/base.html', '営業所')}｜
          {renderLink('https://www.chubu-net.co.jp/kenzai/Form/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・宝機材</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.takara-kizai.com/', '商品ページ')}｜
          {renderLink('https://www.takara-kizai.com/download/catalog/', 'カタログ')}｜
          {renderLink('https://www.takara-kizai.com/company/outline/', '営業所')}｜
          {renderLink('https://www.takara-kizai.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・すがたかたち</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sugatakatachi.com/handrail.html', '商品ページ')}｜
          {renderLink('https://www.sugatakatachi.com/index.html#catalog', 'カタログ')}｜
          {renderLink('https://www.sugatakatachi.com/form-and-shape.html', '営業所')}｜
          {renderLink('https://www.sugatakatachi.com/order-flow.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderInspectionPort = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">点検口</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【気密・断熱（きみつ・だんねつ）点検口】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「外気」とつながる場所の必須スペック</h4>
          
          <p className="mb-1 text-xs ml-3">
            最上階の天井（屋根裏）や、1階の床下は、温熱環境的には「外」と同じ扱いになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: ここに安価なアルミ枠だけの点検口をつけると、そこから猛烈な隙間風が入り、枠が結露してカビだらけになる。必ず<strong>「気密・断熱型（断熱材の蓋付き）」</strong>を選定しなければならない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「内蓋（うちぶた）」の有無</h4>
          
          <p className="mb-1 text-xs ml-3">
            高性能な断熱点検口は、化粧蓋（見える部分）とは別に、断熱材がセットされた分厚い「内蓋（断熱蓋）」が付属している。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これがないと、次世代省エネ基準などをクリアできない場合があるため、型番選定には細心の注意が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【天井点検口の意匠性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">枠を目立たせない「目地（めじ）タイプ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            標準的な「額縁（がくぶち）タイプ」は、太いアルミ枠が目立ってしまい、天井のデザインを損なう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 枠の幅を極限まで細くし、クロスやボードの継ぎ目（目地）のように見せる<strong>「目地タイプ」</strong>を選ぶことで、存在感を消すことができる。リビングや廊下など目立つ場所では必須の配慮。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">クロスが剥がれない「コインロック」</h4>
          
          <p className="mb-1 text-xs ml-3">
            点検口を開ける際、マイナスドライバーやコインで回して開けるタイプが標準。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            頻繁に開けない場所なら良いが、取っ手がないためスッキリ見える。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【床下点検口（床下収納）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">踏んだ時の「キシミ音」対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            床点検口は人が上を歩くため、枠の強度が弱いと「ギシギシ」と音が鳴ったり、たわんだりして不安感を与える。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            補強: 蓋の裏側にしっかりとした<strong>「補強桟（ほきょうざん）」</strong>が入っている製品を選ぶか、15mm厚の床材を指定できる高強度タイプを選ぶのがクレーム回避のポイント。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「収納庫」と「点検口」はセット</h4>
          
          <p className="mb-1 text-xs ml-3">
            床下点検口の穴に、プラスチックの箱をはめ込めば「床下収納庫」になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            プロの技: メンテナンス時には、この箱をガバっと持ち上げて外すことで、床下の点検が可能になる。収納場所を確保しつつ点検口も兼ねる合理的な手法。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【壁点検口（シャフト）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">マンション等の「防火設備」</h4>
          
          <p className="mb-1 text-xs ml-3">
            マンションのパイプスペース（PS）などに設置する壁点検口は、火災時の延焼を防ぐため、鉄製の<strong>「防火設備認定品」</strong>でなければならないケースが多い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            アルミ製や樹脂製を勝手につけると消防検査に通らないため、法的な防火区画の確認が最優先。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・フクビ化学工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.fukuvi.co.jp/product/10', '商品ページ')}｜
          {renderLink('https://www.fukuvi.co.jp/data/cat/426', 'カタログ')}｜
          {renderLink('https://www.fukuvi.co.jp/company/office', '営業所')}｜
          {renderLink('https://www.fukuvi.co.jp/contact', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ダイケン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.ne.jp/products/interior.html#products01', '商品ページ')}｜
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
          {renderLink('https://www.rikenkeikinzoku.co.jp/building/interior-material/', '商品ページ')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/catalog/index.html', 'カタログ')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/company/info/', '営業所')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/company/inquiry/index.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naka-kogyo.co.jp/products/category-products/inspection-port-and-storage', '商品ページ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/download/catalog.html', 'カタログ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/company/office.html', '営業所')}｜
          {renderLink('https://mailform.naka-kogyo.co.jp/support/script/mailform/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・城東テクノ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.joto.com/product/naisou/', '商品ページ')}｜
          {renderLink('https://www.joto.com/support/catalog/', 'カタログ')}｜
          {renderLink('https://www.joto.com/company/office_locations/', '営業所')}｜
          {renderLink('https://www.joto.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・サヌキ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sanuki-spg.com/products/', '商品ページ')}｜
          {renderLink('https://www.sanuki-spg.com/catalog/', 'カタログ')}｜
          {renderLink('https://www.sanuki-spg.com/corporate/', '営業所')}｜
          {renderLink('https://www.sanuki-spg.com/inquiry/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日大工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('http://nichidai.net/product-cat/building/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('http://nichidai.net/nichidaikougyou_gaiyou/', '営業所')}｜
          {renderLink('http://nichidai.net/toiawase/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・バクマ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.bakuma.co.jp/ShohinCatalog/shohin-catalog.php?knskkbn=2', '商品ページ')}｜
          {renderLink('https://www.bakuma.co.jp/catalog/catalog.php', 'カタログ')}｜
          {renderLink('https://www.bakuma.co.jp/company/eigyo.php?nm=eigyo', '営業所')}｜
          {renderLink('https://www.bakuma.co.jp/contact/contact.php?nm=contact', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・スリータック</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://threetack.com/product/inspection-door', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://threetack.com/outline', '営業所')}｜
          {renderLink('https://www.threetack.co.jp/contact-us', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・クマモト</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('http://k-kumamoto.ticcata.jp/products/category/list/code/38980000/', '商品ページ')}｜
          {renderLink('http://k-kumamoto.ticcata.jp/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=KMT00001&catalogId=339980000&designID=KMTD02&catalogCategoryId=&designConfirmFlg=&keyword=', 'カタログ')}｜
          {renderLink('http://www.k-kumamoto.com/corporate/office.html', '営業所')}｜
          {renderLink('http://www.k-kumamoto.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・オクジュー</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('http://okuju.co.jp/business-cat/ceiling-access-hole_alts-hatch/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('http://okuju.co.jp/company/', '営業所')}｜
          {renderLink('http://okuju.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderBraille = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">点字</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【点字ブロック（視覚障害者誘導用ブロック）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「埋め込み」と「貼り付け」の寿命差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>貼り付けタイプ（シート・タイルカーペット上）</strong>: 既存の床の上に両面テープや接着剤で貼る。安価でリフォーム向きだが、台車が通ると角からめくれて剥がれるリスクが高く、つまずきの原因になる。</li>
            <li><span className="mr-1">・</span><strong>埋め込みタイプ（タイル・石）</strong>: 床材と同じ厚みのブロックを埋め込む。段差ができず、剥がれることもないため、新築や大規模改修ではこちらが絶対条件。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">デザイナーが好む「ステンレス鋲（びょう）」の落とし穴</h4>
          
          <p className="mb-1 text-xs ml-3">
            黄色いブロックを嫌う建築家が採用する、ステンレスの点字鋲（スタッド）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク1（滑り）: 雨の日、濡れた靴で踏むと金属は非常に滑りやすく、健常者が転倒する事故が多い。表面にノンスリップ加工があるものを選ぶべき。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            リスク2（視認性）: 弱視（ロービジョン）の方にとって、グレーの床に銀色の鋲は同化して見えない。<strong>「輝度比（きどひ）」</strong>が確保できないため、ユニバーサルデザインの観点からは推奨されない場合がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「輝度比（きどひ）2.0以上」のルール</h4>
          
          <p className="mb-1 text-xs ml-3">
            全盲の方だけでなく、弱視の方が「色の差」で道を認識できるようにするため、床の色とブロックの色には明度差（コントラスト）が必要。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            JIS規格: 原則は「黄色」。デザイン重視で床に合わせて「黒」や「グレー」のブロックを使う場合は、床を白くするなどして、明確なコントラストを確保しないと検査で指摘される。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「警告（点状）」と「誘導（線状）」の厳格な配置</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>警告ブロック（点状）</strong>: 「止まれ・注意」。階段前、エレベーター前、分岐点に設置。</li>
            <li><span className="mr-1">・</span><strong>誘導ブロック（線状）</strong>: 「進め」。通路に沿って設置。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            30cmの法則: 階段や危険箇所からは、30cm離して警告ブロックを敷くのが鉄則。これより近いと、気づいた時には足を踏み外している。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【点字案内板・手摺サイン】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">手摺の「点字シール」の向きと耐久性</h4>
          
          <p className="mb-1 text-xs ml-3">
            階段の手摺には、「上り／下り」「階数」を示す点字シールを貼る。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            貼る位置: 手摺の<strong>「裏側（壁側）」や真上ではなく、指が触れる「内側（手前側）」</strong>に貼らないと読まれない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            素材: 紙シールはすぐに剥がれるため、ポリカーボネート製やアルミ製の、爪で擦っても点字が潰れない硬質プレートタイプを選ぶのが基本。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">トイレ触知図（しょくちず）の標準化</h4>
          
          <p className="mb-1 text-xs ml-3">
            トイレの入口には、中のレイアウト（便器や洗面の位置）を示す触知図（浮き出し文字や点字の案内板）が必要。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            設置高さ: 車椅子使用者や目の見えない人が触りやすいよう、床から1.2m〜1.5m程度の範囲に設置するのが一般的。高すぎても低すぎても機能しない。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【カーペットへの施工】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「点字タイルカーペット」の採用</h4>
          
          <p className="mb-1 text-xs ml-3">
            オフィスのカーペット床に点字ブロックを後付けすると、粘着テープではすぐに剥がれる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            解決策: 通常のタイルカーペットと同じ50cm角で、点字突起がついた<strong>「点字タイルカーペット」</strong>に差し替えるのが最も美しく、耐久性が高い納まり。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・錦城護謨</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kinjogomu.jp/welfare/index.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.kinjogomu.jp/base.html', '営業所')}｜
          {renderLink('https://www.kinjogomu.jp/welfare/inq.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・大光ルート産業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.t-route.com/business/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.t-route.com/company/access/', '営業所')}｜
          {renderLink('https://www.t-route.com/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naka-kogyo.co.jp/products/category-products/non-slip-and-braille-rivet', '商品ページ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/download/catalog.html', 'カタログ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/company/office.html', '営業所')}｜
          {renderLink('https://www.naka-kogyo.co.jp/support/qr_ad/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・奥岡製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.okuoka.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.okuoka.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.okuoka.co.jp/company/', '営業所')}｜
          {renderLink('https://www.okuoka.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ダイクレ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daikure.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.daikure.co.jp/network/', '営業所')}｜
          {renderLink('https://www.daikure.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderDisplay = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ディスプレイ</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【ガラスショーケース】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「高透過（こうとうか）ガラス」の採用</h4>
          
          <p className="mb-1 text-xs ml-3">
            普通のガラス（フロートガラス）は、厚みが増すと成分中の鉄分により<strong>「緑色」</strong>に見える。これがショーケースの中の商品（特に白い物や宝石）の色味を変えてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            プロの常識: 美術館や高級ブランド店では、鉄分を抜いて限りなく無色透明にした<strong>「高透過ガラス」</strong>を指定するのが鉄則。小口（断面）を見れば一目瞭然で、白く輝いて見える。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">照明の「演色性（えんしょくせい）」と「熱」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ケース内照明は、ただ明るければ良いわけではない。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            演色性（Ra）： 太陽光を100とした時の色の見え方。食品や化粧品、服飾の場合、<strong>「Ra90以上」</strong>の高演色LEDを使わないと、色がくすんで見え、売上に直結する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            熱対策: 以前のハロゲンランプは熱で商品を傷めたが、LEDでも基盤は発熱する。放熱設計が悪いとケース内温度が上がり、チョコレートや化粧品が溶ける事故が起きる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「引き違い」と「ケンドン式」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>引き違い戸</strong>: 開閉が楽だが、中央にガラスが重なるラインができ、隙間から埃が入る。</li>
            <li><span className="mr-1">・</span><strong>ケンドン式（はめ殺し）</strong>: 上下に溝を掘り、ガラスを持ち上げてはめ込む。正面に金物やラインが出ないため一番美しいが、頻繁な出し入れには向かない。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【アクリルディスプレイ】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「押し出し板」と「キャスト板」の決定的な違い</h4>
          
          <p className="mb-1 text-xs ml-3">
            見た目は同じアクリル板でも、製法によって性質が全く異なる。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>押し出し板</strong>: 安価だが、溶剤（接着剤やアルコール）に弱く、拭くとヒビが入る（クラック）ことがある。熱で溶けやすいため、切断加工向き。</li>
            <li><span className="mr-1">・</span><strong>キャスト板</strong>: 高価だが、硬くて溶剤に強い。磨くと美しくなるため、高級な什器や、レーザー加工（彫刻）をする場合はこちらを選ぶ必要がある。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            消毒用アルコールで拭いたらバキバキに割れた、というのは押し出し板を使った失敗例。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【棚柱（ガチャ柱・ダボレール）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ロイヤル」の互換性</h4>
          
          <p className="mb-1 text-xs ml-3">
            壁に埋め込む金属の棚受けレール（スリット）。業界ではトップシェアメーカーの<strong>「ロイヤル」</strong>が代名詞。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: ホームセンターの安価な製品や他メーカー品とは、爪のピッチや厚みが微妙に違い、互換性がないことが多い。「棚板を増やしたいが入らない」というトラブルを防ぐため、有名メーカー品で統一するのが無難。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">石膏ボードには効かない</h4>
          
          <p className="mb-1 text-xs ml-3">
            棚柱は一点に数キロ〜数十キロの荷重がかかる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            石膏ボードアンカー程度では持たないため、新築・改装時に必ず<strong>「コンパネ（合板）12mm以上」</strong>の下地を壁全面に入れておくか、軽量鉄骨（LGS）に直接ビス止めできる位置に設置計画を立てる必要がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【サイン・切り文字】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「カッティングシート」と「インクジェット」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>カッティングシート</strong>: 色のついた塩ビフィルムを文字の形に切ったもの。単色だが発色が良く、耐候性が高い。ガラス面の営業時間案内などに最適。</li>
            <li><span className="mr-1">・</span><strong>インクジェット</strong>: 白いシートに印刷したもの。写真やグラデーションが表現できるが、近くで見るとドットが見えることがあり、紫外線で退色しやすい（UVラミネート必須）。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「チャンネル文字」のLED内蔵</h4>
          
          <p className="mb-1 text-xs ml-3">
            お店の看板などで使われる立体文字（箱文字）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            昔はネオン管だったが、現在は中にLEDモジュールを仕込むのが標準。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>正面発光</strong>: 文字そのものが光る。目立つ。</li>
            <li><span className="mr-1">・</span><strong>バックライト（背面発光）</strong>： 文字の裏から壁を照らし、文字をシルエットで浮かび上がらせる。高級感があり、間接照明的な演出になる。</li>
          </ul>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・丹青社</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.tanseisha.co.jp/works/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.tanseisha.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.tanseisha.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・乃村工藝社</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nomurakougei.co.jp/works/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nomurakougei.co.jp/company/', '営業所')}｜
          {renderLink('https://www.nomurakougei.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderOtherInterior = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装その他製品</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【鏡（ミラー）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">水回りの黒ずみ「シケ（腐食）」対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴室や洗面所に普通の鏡を設置すると、湿気や洗剤で裏面の銀膜が酸化し、縁から黒く変色する「シケ」が発生する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須スペック: 水回りには、裏面と切断面（小口）を特殊樹脂でコーティングした<strong>「防湿鏡（ぼうしつきょう）」</strong>を指定しないと、1〜2年で黒ずみだらけになる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「映像調整」と「連貼り」の歪み</h4>
          
          <p className="mb-1 text-xs ml-3">
            ダンススタジオやジムなどで鏡を並べて貼る場合（連貼り）、壁のわずかな不陸（凸凹）で映像が歪み、隣の鏡と線がズレて見える。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            プロの技: 鏡の裏に調整マットを入れるなどして、映像を真っ直ぐにする<strong>「映像調整（通り直し）」</strong>ができる施工業者を選ばないと、見ていて酔うような鏡面になってしまう。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【集合ポスト・宅配ボックス】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「屋内用」を外に使ってはいけない</h4>
          
          <p className="mb-1 text-xs ml-3">
            集合住宅のポストには「屋内用」と「防滴（ぼうてき）型」がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            リスク: 屋根があるからと、半屋外（エントランスポーチ等）に安価な「屋内用」を設置すると、横殴りの雨で中身がずぶ濡れになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            外部に面する場所では、雨返しがついた<strong>「防滴仕様」</strong>が絶対条件。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「静音（せいおん）ダイヤル錠」の配慮</h4>
          
          <p className="mb-1 text-xs ml-3">
            ポストの蓋がバタンと閉まる音や、ダイヤルを回す「カチカチ音」は、1階の住戸や近隣への騒音トラブルになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            蓋にダンパー（ゆっくり閉まる機能）が付いた「静音タイプ」や、ラッチ音がしない錠前を選ぶのが、集合住宅の設計マナー。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【室内物干し金物】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「天井下地」への固定が命</h4>
          
          <p className="mb-1 text-xs ml-3">
            濡れた洗濯物は想像以上に重い（10kgを超えることもザラにある）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: 石膏ボードアンカーでは絶対に持たない。必ず天井裏の<strong>「野縁（のぶち）」や「軽量鉄骨下地」</strong>を狙ってビスを打つか、設計段階で補強を入れておかないと、使用中に天井ごと落下する事故が起きる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「昇降式」と「着脱式」の使い勝手</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>昇降式</strong>: 竿を天井に収納できる。便利だが、紐（操作コード）が垂れ下がるため見た目が少しうるさい。</li>
            <li><span className="mr-1">・</span><strong>着脱式</strong>: ポールごと外して片付ける（ホスクリーン等）。見た目はスッキリするが、外したポールの置き場所に困り、結局付けっぱなしになることが多い。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ブラインド・ロールスクリーン】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">浴室の「耐水（たいすい）仕様」</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴室の窓に普通のブラインドをつけると、スラット（羽）が錆びて動かなくなる上、カビの温床になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            アルミやステンレス部品を多用し、スラット同士がくっつきにくい<strong>「耐水（浴室）仕様」</strong>を選ぶ必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「遮光（しゃこう）」等級と隙間漏れ</h4>
          
          <p className="mb-1 text-xs ml-3">
            寝室やシアタールームで「遮光1級」のロールスクリーンを選んでも、製品と窓枠の<strong>「隙間」</strong>から光が漏れてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 完全に暗くしたい場合は、両サイドに<strong>「ガイドレール」</strong>が付いた遮光フレームタイプを選ぶか、窓枠よりも大きく覆う「正面付け」にするなどの納まりの工夫が必要。
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ダイケン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.ne.jp/product/', '商品ページ')}｜
          {renderLink('https://www.daiken.ne.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.daiken.ne.jp/company/office/', '営業所')}｜
          {renderLink('https://www.daiken.ne.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・フクビ化学</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.fukuvi.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.fukuvi.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.fukuvi.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.fukuvi.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderGreen化 = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装 緑化</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【生木（なまき）・本物の植物】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「照度（しょうど）」不足による枯死リスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            多くの植物は、最低でも1000ルクス程度の明るさ（読書ができる明るさ）が必要。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            失敗例: おしゃれな間接照明だけの薄暗いラウンジなどに植物を置くと、光量不足で徐々に弱り、数ヶ月で枯れてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 植物育成用LED（グローライト）をスポットライトとして当てるか、窓際の明るい場所に配置計画を限定する必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「底面給水（ていめんきゅうすい）」システムの採用</h4>
          
          <p className="mb-1 text-xs ml-3">
            鉢の底に水を貯めるタンクが付いたシステム（レチューザ等）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 水やりの頻度が劇的に減り（2週間〜1ヶ月に1回程度）、水のやり過ぎによる根腐れも防げるため、オフィス緑化の標準仕様となっている。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">レンタルグリーンの活用</h4>
          
          <p className="mb-1 text-xs ml-3">
            植物を購入するのではなく、専門業者とメンテナンス契約を結ぶ方式。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            月額費用はかかるが、水やり、剪定、枯れた場合の交換を全てプロが行うため、常に美しい状態を維持できる。企業の総務負担を減らすために推奨される。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【フェイクグリーン（人工植物）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「光触媒」加工の機能性</h4>
          
          <p className="mb-1 text-xs ml-3">
            本物に見えるだけでなく、葉の表面に酸化チタン等をコーティングした製品。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            機能: 室内光（蛍光灯やLED）に反応して、空気中の有害物質や臭い、ウイルスを分解・除去する空気清浄効果がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            水やり不要で虫も湧かないため、衛生管理が厳しい病院や飲食店で採用率が高い。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「近くで見るとバレる」距離感</h4>
          
          <p className="mb-1 text-xs ml-3">
            最近のフェイクグリーンは精巧だが、至近距離で見ると樹脂の質感や継ぎ目が分かる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            配置のコツ: 人の目線より高い位置（壁面緑化や天井吊り下げ）や、間接照明で陰影をつける場所に配置すると、本物との区別がつきにくく、効果的に空間を演出できる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">屋外使用の注意点</h4>
          
          <p className="mb-1 text-xs ml-3">
            室内用のフェイクグリーンをバルコニー等の屋外に置くと、紫外線で数ヶ月で変色・劣化（葉がポロポロ落ちる）する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            屋外で使う場合は、必ず耐候性のある<strong>「屋外対応グレード」</strong>を選定しなければならない。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・エスケー化研</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.sk-kaken.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.sk-kaken.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.sk-kaken.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・コンドーテック</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kondotec.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.kondotec.co.jp/company/', '営業所')}｜
          {renderLink('https://www.kondotec.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日本ハートビル工業</span>
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

  const renderPartition = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">隔壁</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【隔て板（バルコニー仕切り）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「避難ハッチ」がない家の命綱</h4>
          
          <p className="mb-1 text-xs ml-3">
            避難はしご（ハッチ）がない住戸は、火災時にこの板を蹴破って隣へ逃げるのが唯一の避難ルートになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: 「避難の妨げになる物（物置やタイヤ）」を板の前に置くことは、消防法違反であり、自分の命を危険に晒す行為。入居者への周知が不可欠。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「フレキシブル板」と「ケイカル板」の硬さ</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>フレキシブルボード</strong>: セメント質で非常に硬く、台風でも割れにくいが、子供や高齢者の力では蹴破るのが難しい場合がある。</li>
            <li><span className="mr-1">・</span><strong>ケイカル板（ケイ酸カルシウム）</strong>: 比較的柔らかく、割りやすいが、強風で破損しやすいリスクがある。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            選定: 高層階（風が強い）はフレキシブル、低層階はケイカルなど、安全性と耐久性のバランスを考慮した選定が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">塗装時の「ステッカー」隠蔽（いんぺい）事故</h4>
          
          <p className="mb-1 text-xs ml-3">
            大規模修繕でベランダを塗装する際、職人が誤って<strong>「非常の際はここを破って…」という避難ステッカー</strong>の上から塗装してしまう事故が後を絶たない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これを隠すと消防検査に通らないため、塗装前にマスキング養生をするか、新しいステッカーに張り替える手配が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「隙間（すきま）」の意味とハイパーティション</h4>
          
          <p className="mb-1 text-xs ml-3">
            通常の隔て板は、下や横に隙間が空いている。これは「雨水を流す（排水）」と「風を逃がす」ための機能的な隙間。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            ハイパーティション: 近年はプライバシー重視で、床から天井まで隙間なく塞ぐ「ハイパーティション（フルハイト）」が人気だが、風圧をまともに受けるため、支柱の強度が数倍必要になる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">災害時の「補修」対応</h4>
          
          <p className="mb-1 text-xs ml-3">
            台風の翌日には「隔て板が飛んだ」という問い合わせが殺到する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            既製品のサイズ（910mm×1820mm等）であれば即納できるが、特注サイズや特殊な色（焼付塗装）の場合は納期がかかるため、管理組合は予備のボードを保管しておくと復旧が早い。
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・コマニー</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.comany.co.jp/products/partition/', '商品ページ')}｜
          {renderLink('https://www.comany.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.comany.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.comany.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・イトーキ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.itoki.jp/products/partition/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.itoki.jp/company/base/', '営業所')}｜
          {renderLink('https://www.itoki.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・オカムラ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.okamura.co.jp/product/partition/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.okamura.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.okamura.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderProtectionMaterial = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">保護材</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【コーナーガード（角の保護）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「面付け（めんつけ）」と「埋め込み」の美観差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>面付け</strong>: クロスの上からL字型のガードを両面テープやビスで貼る。施工は簡単だが、段差ができて「取って付けた感」が出る。</li>
            <li><span className="mr-1">・</span><strong>埋め込み（先付け）</strong>: 石膏ボードを貼る段階で、専用の<strong>「コーナービード（埋め込み見切り）」</strong>を仕込んでおき、ガードの表面と壁面をフラットにする工法。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            見た目が非常にスッキリし、埃もたまらないため、設計段階で指定すべきディテール。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ステンレスと樹脂の使い分け</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ステンレス</strong>: 最強の強度。台車がガンガン当たる工場の搬入口や、シャープなデザインのオフィスに最適。ただし、ぶつかった人や物が痛む。</li>
            <li><span className="mr-1">・</span><strong>軟質樹脂</strong>: 衝撃を吸収するクッション性がある。幼稚園や老人ホームなど、人がぶつかった時の怪我を防ぐ目的ではこちらが必須。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「蓄光（ちっこう）」タイプの採用</h4>
          
          <p className="mb-1 text-xs ml-3">
            停電時に角が光るタイプ。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            避難経路となる廊下の角に設置することで、衝突防止と誘導灯の補助的な役割を果たす。BCP（事業継続計画）対策としてオフィスでの採用が増えている。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ウォールガード（ストレッチャー擦り）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">病院・施設の「高さ設定」</h4>
          
          <p className="mb-1 text-xs ml-3">
            廊下の壁を守る帯状のガード（バンパー）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            重要: 「何がぶつかるか」のシミュレーションが命。ストレッチャー、車椅子、配膳カートなど、施設で使用する機材の<strong>「一番出っ張っている高さ」</strong>に合わせて設置高さを決めないと、ガードの上や下を傷つけられて無意味になる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ハンドレール（手摺）との一体化</h4>
          
          <p className="mb-1 text-xs ml-3">
            手摺とガードを別々に付けると壁がうるさくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ダブル機能: 握る部分は手摺、その下が幅広のガードになっている<strong>「バンパー付き手摺」</strong>を採用することで、スッキリとしたデザインと機能性を両立できる。病院の標準仕様。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【キックプレート（ドアの足元）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「押し側」だけで良い理由</h4>
          
          <p className="mb-1 text-xs ml-3">
            ドアの下に貼るステンレス等の板。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            本来は、荷物で手が塞がっている時に「足で押して開ける」ための保護材。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            コストダウン: 引く側（手前）には足は当たらないため、予算を削るなら<strong>「押す側のみ設置」</strong>で機能的には十分足りる。意匠を揃えるなら両面。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ガラスフィルム（飛散防止・目隠し）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「熱割れ（ねつわれ）」の計算</h4>
          
          <p className="mb-1 text-xs ml-3">
            透明ガラスに「遮熱フィルム」や「黒っぽい目隠しフィルム」を貼ると、ガラスの温度が急上昇し、サッシ枠との温度差でパリンと割れる（熱割れ）ことがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            特に網入りガラスは危険。 フィルムメーカーに「熱割れ計算」を依頼し、施工可能か判定してもらうプロセスが必須。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「貫通防止」と「飛散防止」の違い</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>飛散防止</strong>: 割れても破片が落ちないだけ。防犯性能はない。</li>
            <li><span className="mr-1">・</span><strong>防犯（貫通防止）</strong>: 厚みが300ミクロン以上あり、バールで叩いても突き破れない。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            「防犯フィルムを貼りたい」と言われた場合、ホームセンターにある薄い飛散防止フィルムを貼っても防犯の意味がないことを説明する必要がある。
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・フクビ化学工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.fukuvi.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.fukuvi.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.fukuvi.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.fukuvi.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・大建工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.ne.jp/product/', '商品ページ')}｜
          {renderLink('https://www.daiken.ne.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.daiken.ne.jp/company/office/', '営業所')}｜
          {renderLink('https://www.daiken.ne.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ナカ工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naka-kogyo.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.naka-kogyo.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.naka-kogyo.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      <div className="content-title-wrapper mb-2">
        <h2 className="text-xl font-semibold inline">{title}</h2>
        <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ダイケン</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.ne.jp/product/', '商品ページ')}｜
          {renderLink('https://www.daiken.ne.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.daiken.ne.jp/company/office/', '営業所')}｜
          {renderLink('https://www.daiken.ne.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・フクビ化学</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.fukuvi.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.fukuvi.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.fukuvi.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.fukuvi.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case 'トイレブース':
        return renderToiletBooth();
      case '内装サッシ':
        return renderInteriorSash();
      case '内装シャッター':
        return renderInteriorShutter();
      case 'ノンスリップ':
        return renderNonSlip();
      case '内装手摺':
        return renderInteriorHandrail();
      case 'グレーチング':
        return renderGrating();
      case '点検口':
        return renderInspectionPort();
      case '内装緑化':
        return renderGreen化();
      case '隔壁':
        return renderPartition();
      case '保護材':
        return renderProtectionMaterial();
      case '点字':
        return renderBraille();
      case 'ディスプレイ':
        return renderDisplay();
      case '内装その他製品':
        return renderOtherInterior();
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

export default InternalOtherContent; 