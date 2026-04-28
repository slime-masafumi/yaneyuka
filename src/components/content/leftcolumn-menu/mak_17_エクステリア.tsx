import React, { useState } from 'react';

interface ExteriorContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const ExteriorContent: React.FC<ExteriorContentProps> = ({ subcategory, onNavigateToRegistration }) => {
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
        src={imageErrors['recruitment'] ? '/image/掲載募集中a.png' : '/image/掲載募集中a.png'}
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
        src={imageErrors['commercial'] ? '/image/ChatGPT Image 2025年5月1日 16_25_41.webp' : '/image/ChatGPT Image 2025年5月1日 16_25_41.webp'}
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

  const renderDeliveryBoxCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">宅配ボックス</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【機械式（メカ式）と電気式の違い】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">戸建住宅の標準「機械式（ダイヤル・プッシュボタン）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            仕組み: 電源を使わず、配達員が暗証番号を設定してロックする、または自動ロックされる仕組み。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: <strong>「電気代ゼロ・配線工事不要」</strong>で、雨に強く壊れにくい。メンテナンスフリーなため、戸建て住宅では機械式が圧倒的シェアを持つ。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デメリット: 鍵（暗証番号）を忘れると開かない。配達員が番号を書き間違えると開けられない（マスターキーが必要）。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">マンション・高機能「電気式」</h4>
          
          <p className="mb-1 text-xs ml-3">
            仕組み: タッチパネル操作や、ICカード、顔認証で開く。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 操作履歴（ログ）が残るため盗難トラブルに強い。インターホンと連動して「荷物が届いています」と室内で知らせてくれる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デメリット: 100V電源工事が必要で、機器代が高額。基盤の故障リスクがある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【サイズ選びの「水・米」基準】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「スリム型」の落とし穴</h4>
          
          <p className="mb-1 text-xs ml-3">
            デザイン重視で奥行きや幅が狭いスリムタイプを選ぶと、最も通販で購入される<strong>「2Lペットボトル×6本入りケース」や「10kgのお米」</strong>が入らないことがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: これらが入らないと宅配ボックスの価値が半減するため、設置スペースが許す限り<strong>「100サイズ〜120サイズ（3辺合計）」</strong>が入る容量を確保するのが、後悔しない選び方。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【安全性と「閉じ込め防止」】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">子供がかくれんぼで入るリスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            大型ボックスには、子供がすっぽり入れてしまう。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            中に入った状態で外から鍵がかかると、窒息や熱中症で命に関わる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須機能: 万が一閉じ込められても、中からレバーやボタンを押すだけで鍵が開く<strong>「非常脱出機構（閉じ込め防止レバー）」</strong>が付いている製品を選ぶのが、ファミリー世帯の絶対条件。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【受領印（ハンコ）の仕組み】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「紐で吊るす」のはNG</h4>
          
          <p className="mb-1 text-xs ml-3">
            配達員は受領印を押す必要がある。シャチハタを紐で縛って箱の中に入れておくだけだと、インクが乾いたり、盗まれたり、紛失したりする。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            推奨: ボックス本体に印鑑をセットでき、配達員が伝票を差し込んでボタンを押すだけで捺印できる<strong>「捺印システム内蔵型」</strong>でないと、実用的ではない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ※イタズラ防止のため、捺印システムは「1回の配達につき1回しか押せない」ロック機能付きが望ましい。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【設置環境と中身の保護】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「冷蔵庫」ではない</h4>
          
          <p className="mb-1 text-xs ml-3">
            夏場の金属製ボックス内は、直射日光下で<strong>50℃〜60℃</strong>を超える。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            クール便はもちろん、化粧品、チョコレート、医薬品などは変質するため、「生鮮食品は入れないでください」というステッカー表示や、施主への注意喚起が必須。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「完全防水」ではない</h4>
          
          <p className="mb-1 text-xs ml-3">
            多くの製品は「防滴（ぼうてき）」構造であり、台風のような横殴りの雨では、扉の隙間から水が入る。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            庇（ひさし）の下に設置するか、濡れて困るものはビニールに入れてもらう等の配慮が必要。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('パナソニック', {
          products: 'https://panasonic.jp/door/takuhai/',
          catalog: 'https://panasonic.jp/door/catalog/',
          office: 'https://panasonic.jp/showroom/',
          contact: 'https://panasonic.jp/support/contact/'
        })}
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/postbox/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('ナスタ', {
          products: 'https://www.nasta.co.jp/products/apartment/',
          catalog: 'https://www.nasta.co.jp/catalog/',
          office: 'https://www.nasta.co.jp/company/',
          contact: 'https://www.nasta.co.jp/contact/'
        })}
      </div>
    </div>
  );

  const renderMailboxCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">郵便受け</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【埋め込み（口金・貫通）ポスト】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">高気密住宅の天敵「熱橋（ヒートブリッジ）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            壁を貫通して「外から入れて、家の中で取る」タイプは便利だが、ポスト自体が断熱材のないアルミや鉄の箱であるため、強烈な<strong>「熱の通り道」</strong>になる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: 冬場はポストの内側が結露して玄関が濡れたり、冷気が吹き込んでくる（コールドドラフト）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 高気密高断熱住宅では、壁貫通は避け、断熱ドアの気密ポスト口を使うか、あえて<strong>「壁付け（外付け）」や「独立ポール建て」</strong>にするのが性能を守る鉄則。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「前入れ・後ろ出し」の動線と防犯</h4>
          
          <p className="mb-1 text-xs ml-3">
            門柱（ブロック塀）に埋め込むタイプ。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 敷地内に入らずに郵便物が取れるため、プライバシーが守られ、パジャマ姿でも取りに行ける。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 裏蓋（取り出し口）が割れたり壊れたりすると、誰でも手を突っ込んで開けられるようになるため、樹脂製ではなく耐久性の高いアルミキャスト製等の裏蓋を選ぶべき。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【サイズと「メール便」対応】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「厚さ3cm」の壁</h4>
          
          <p className="mb-1 text-xs ml-3">
            昔のポストはハガキや封筒サイズだったが、現在はAmazonやメルカリ等の「メール便（クリックポスト等）」が多用される。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須スペック: 投函口が<strong>「幅340mm以上・厚さ35mm以上」</strong>に対応していないと、メール便が入らず、不在票対応（再配達）になってしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            盗難防止のフラップ（ナカノぞき防止）が付いていても、大型郵便がスムーズに入る構造かどうかの確認が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【設置場所と雨仕舞（あまじまい）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「完全防水」ではない現実</h4>
          
          <p className="mb-1 text-xs ml-3">
            多くのポストは「防滴（ぼうてき）仕様」であり、台風のような横殴りの雨では水が入ることがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            設計配慮: 可能な限り<strong>「軒下（のきした）」や「庇（ひさし）」</strong>のある場所に設置し、雨が直撃しないようにするのが、郵便物を守るための基本設計。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">蓋の「バタン音」騒音</h4>
          
          <p className="mb-1 text-xs ml-3">
            投函口の蓋（フラップ）にダンパー機能がないと、新聞配達のたびに「ガチャン！」と金属音が響き、早朝の騒音トラブルや、犬が吠える原因になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必ず<strong>「静音（ダンパー付き）フラップ」</strong>を選定すること。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【素材とメンテナンス】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">潮風に強い「ステンレス」と「樹脂」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>スチール（鉄）製</strong>: デザイン性が高く安価なものが多いが、塗装が剥げると錆びて赤茶色の汁が出る。沿岸部ではNG。</li>
            <li><span className="mr-1">・</span><strong>ステンレス・アルミ</strong>: 錆に強いが、もらい錆は付くので定期的な拭き掃除は必要。</li>
            <li><span className="mr-1">・</span><strong>FRP（繊維強化プラスチック）</strong>: ディズニーランドの岩のような造形が可能で、腐食しない。南欧風デザインなどで人気。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">ダイヤル錠の「番号忘れ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            鍵を持ち歩かなくて良い「ダイヤル錠」が主流だが、入居者が番号を忘れたり、設定方法がわからず開けっ放しにすることが多い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            管理会社や施工店は、必ず「開錠番号の控え」を保管し、リセット方法を把握しておく必要がある。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('ナスタ', {
          products: 'https://www.nasta.co.jp/products/mailbox/',
          catalog: 'https://www.nasta.co.jp/catalog/',
          office: 'https://www.nasta.co.jp/company/',
          contact: 'https://www.nasta.co.jp/contact/'
        })}
        {renderCompanyRow('パナソニック', {
          products: 'https://panasonic.jp/door/postbox/',
          catalog: 'https://panasonic.jp/door/catalog/',
          office: 'https://panasonic.jp/showroom/',
          contact: 'https://panasonic.jp/support/contact/'
        })}
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/postbox/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderNameplateCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">表札</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【素材と耐久性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">ステンレス（ヘアライン・鏡面）</h4>
          
          <p className="mb-1 text-xs ml-3">
            最もポピュラーで錆びに強い素材。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            注意点: 海沿いの地域では、ステンレスでも「もらい錆」が発生することがあるため、こまめなメンテナンスが必要。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ヘアライン仕上げ</strong>: 傷が目立ちにくく、落ち着いた印象。</li>
            <li><span className="mr-1">・</span><strong>鏡面仕上げ</strong>: 高級感があるが、傷や指紋が目立ちやすい。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">天然石（御影石・大理石）</h4>
          
          <p className="mb-1 text-xs ml-3">
            重厚感があり、和風・洋風どちらにも合う。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 大理石は酸に弱く、雨で変色や艶引けが起こる可能性があるため、屋外使用には御影石の方が適している。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ガラス・アクリル</h4>
          
          <p className="mb-1 text-xs ml-3">
            透明感があり、モダンな印象。LED照明と組み合わせると幻想的な演出が可能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 汚れが目立ちやすいため、定期的な清掃が必要。アクリルは紫外線で黄変や劣化が起こる可能性があるため、耐候性の高い素材を選ぶ必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">陶器・タイル</h4>
          
          <p className="mb-1 text-xs ml-3">
            温かみがあり、個性を出しやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 衝撃に弱いため、物がぶつかると割れる可能性がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">木製（銘木）</h4>
          
          <p className="mb-1 text-xs ml-3">
            和風住宅に合う伝統的な素材。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 雨や紫外線で劣化しやすいため、軒下など雨が当たらない場所に設置するか、定期的な防腐塗装が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【文字加工と視認性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">エッチング（彫り込み）</h4>
          
          <p className="mb-1 text-xs ml-3">
            薬品で金属や石を溶かして文字を彫る加工。耐久性が高く、文字が消えにくい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            色を入れることも可能で、視認性を高められる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">切り文字（アイアン・ステンレス）</h4>
          
          <p className="mb-1 text-xs ml-3">
            金属板を文字の形に切り抜いたもの。立体的で影が落ち、おしゃれな印象。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 細い文字は強度が低く、曲がりやすいため注意が必要。また、壁から浮かせて取り付ける場合は、裏側の掃除がしにくい。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">プリント（焼付け・シルクスクリーン）</h4>
          
          <p className="mb-1 text-xs ml-3">
            表面にインクで文字を印刷したもの。安価でデザインの自由度が高い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 紫外線で退色したり、剥がれたりする可能性があるため、耐久性は他の加工方法に劣る。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【取り付け方法と下地】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">ボルト固定</h4>
          
          <p className="mb-1 text-xs ml-3">
            壁に穴を開けてボルトで固定する方法。最も強固で脱落のリスクが低い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 壁に穴を開けるため、防水処理が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">接着剤固定</h4>
          
          <p className="mb-1 text-xs ml-3">
            専用の強力接着剤で貼り付ける方法。壁に穴を開けたくない場合に有効。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 凹凸のある壁や、塗装面には接着できない場合がある。経年劣化で剥がれるリスクがある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">マグネット固定</h4>
          
          <p className="mb-1 text-xs ml-3">
            スチール製の門柱やドアに磁石で取り付ける方法。賃貸住宅などで便利。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            注意点: 磁力が弱いとずり落ちたり、風で飛んだりする可能性がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【その他】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">風水と表札</h4>
          
          <p className="mb-1 text-xs ml-3">
            風水では、表札は「家の顔」であり、運気を呼び込む重要なアイテムとされる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            素材は「木製」や「天然石」が良いとされ、プラスチックやガラスは「火の気」を持つため避けたほうが良いという説もある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            文字は「浮き彫り（盛り上がっている）」が良いとされ、「彫り込み（凹んでいる）」は「墓石と同じ」として嫌われることもある（ただし、現代ではエッチングが一般的であり、そこまで気にされないことも多い）。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">インターホンカバーとの一体化</h4>
          
          <p className="mb-2 text-xs ml-3">
            インターホンと表札を一体化させたカバーや機能門柱を選ぶことで、玄関周りをスッキリと見せることができる。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('パナソニック', {
          products: 'https://panasonic.jp/door/nameplate/',
          catalog: 'https://panasonic.jp/door/catalog/',
          office: 'https://panasonic.jp/showroom/',
          contact: 'https://panasonic.jp/support/contact/'
        })}
        {renderCompanyRow('福彫', {
          products: 'https://www.fukuchou.jp/products/',
          catalog: 'https://www.fukuchou.jp/catalog/',
          office: 'https://www.fukuchou.jp/company/',
          contact: 'https://www.fukuchou.jp/contact/'
        })}
      </div>
    </div>
  );

  const renderGateCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">門扉</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【有効開口（ゆうこうかいこう）の落とし穴】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「扉幅」＝「通れる幅」ではない</h4>
          
          <p className="mb-1 text-xs ml-3">
            カタログに「幅800mm」とあっても、実際に人が通れる幅（有効開口）は、扉の厚みや丁番の出っ張りで70mm〜100mm程度狭くなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: 車椅子や自転車を通す予定があるなら、扉幅は最低でも<strong>「900mm以上」</strong>、または親子扉を選ばないと、ハンドルやタイヤが引っかかって通れない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「親子（おやこ）扉」の実用性</h4>
          
          <p className="mb-1 text-xs ml-3">
            大小2枚の扉の組み合わせ。普段は親扉（大）だけ使い、大きな荷物を搬入する時だけ子扉（小）を開ける。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            スペースが限られる場所でも、いざという時の最大開口を確保できるため、両開きよりも採用率が高い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【開き勝手と道路境界】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「外開き」の道路越境リスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            日本の門扉は、敷地側に開く<strong>「内開き」</strong>が標準。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            注意点: アプローチが狭いからといって安易に「外開き」にすると、開けた瞬間に扉が道路にはみ出し、通行人にぶつかったり、道路交通法に抵触したりするリスクがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            外開きにする場合は、敷地境界線からセットバック（後退）させて設置する設計が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【電気錠（スマートキー）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「配線式」と「電池式」の選択</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>配線式（AC100V）</strong>： 門柱の中に電気配線を通す。インターホンと連動して室内から解錠できるシステムが組める。電池切れの心配がない。新築・大規模リフォーム推奨。</li>
            <li><span className="mr-1">・</span><strong>電池式</strong>： 配線不要で後付け可能。ただしインターホン連動はできないことが多く、数年ごとの電池交換が必要。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            ※「後で電気錠にしたい」は配線がないと不可能なため、迷ったら空配管だけでも埋設しておくべき。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「自動施錠」の締め出し対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            門扉を閉めると勝手に鍵がかかるオートロック機能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鍵を持たずにゴミ出しに出ると締め出されるため、<strong>「解錠したままにするモード（ラッチホールド）」</strong>への切り替え操作が簡単かどうかが、使い勝手を左右する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【素材とデザインの特性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「アルミ形材」と「アルミ鋳物」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>形材（かたざい）</strong>： 直線的でシャープ。モダン住宅の標準。軽量で目隠しタイプが多い。</li>
            <li><span className="mr-1">・</span><strong>鋳物（いもの）</strong>： 溶かしたアルミを型に流したもの。ロートアイアン風の曲線や装飾が可能。重厚感があり、洋風・欧風住宅に合うが、隙間が多いため目隠しにはならない。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">防犯性のパラドックス</h4>
          
          <p className="mb-1 text-xs ml-3">
            完全な「目隠し門扉」は、中が見えないためプライバシーは守れるが、一度侵入されると<strong>「泥棒が隠れやすい（外から見えない）」</strong>死角になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 防犯を重視するなら、適度に中が見える「半目隠し（スリット）」や「鋳物タイプ」を選び、敷地内の気配を感じさせる方が侵入抑止効果は高い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【スライド門扉（引き戸）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">アプローチが狭い場合の救世主</h4>
          
          <p className="mb-1 text-xs ml-3">
            前後に開くスペースがない狭小地や、階段手前の門扉として採用される。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            レール: バリアフリーを考慮し、床にレールのない<strong>「ノンレール（上吊りまたはキャスター）」</strong>タイプを選ぶと、ベビーカーの通行がスムーズで、レールの泥詰まりも起きない。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/gate/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('三協アルミ', {
          products: 'https://alumi.st-grp.co.jp/products/gate/',
          catalog: 'https://alumi.st-grp.co.jp/catalog/',
          office: 'https://alumi.st-grp.co.jp/showroom/',
          contact: 'https://alumi.st-grp.co.jp/contact/'
        })}
        {renderCompanyRow('YKK AP', {
          products: 'https://www.ykkap.co.jp/products/exterior/',
          catalog: 'https://www.ykkap.co.jp/info/catalog/',
          office: 'https://www.ykkap.co.jp/company/',
          contact: 'https://www.ykkap.co.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderFenceCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">フェンス</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【アルミ形材フェンス】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「縦格子」と「横格子」の視覚効果</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>縦格子</strong>: 斜めからの視線が通り抜けるため、正面に立たない限り中が見えにくい。和風やモダンな住宅に合う。埃が積もりにくく、雨で汚れが流れ落ちやすい。</li>
            <li><span className="mr-1">・</span><strong>横格子</strong>: 正面からは見えにくいが、斜めからは見えやすい場合がある。洋風住宅に合う。埃が溜まりやすく、雨だれ汚れが目立ちやすい。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「目隠し率」と風の影響</h4>
          
          <p className="mb-1 text-xs ml-3">
            完全に視線を遮るフェンスは、風の影響を強く受ける。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ルーバータイプ</strong>: 羽根板を斜めに配置し、風を通しながら視線を遮るタイプ。通気性を確保しつつプライバシーを守れるため、目隠しフェンスの主流。</li>
            <li><span className="mr-1">・</span><strong>採光タイプ</strong>: 半透明のポリカーボネート板を使用したタイプ。光を通すため、敷地内が暗くならず、閉塞感を軽減できる。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【鋳物フェンス】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">重厚感と曲線美</h4>
          
          <p className="mb-1 text-xs ml-3">
            溶かしたアルミを型に流し込んで作るため、複雑な曲線や装飾が可能。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            洋風住宅や門扉とコーディネートすることで、高級感のある外構を演出できる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            隙間が多いため目隠し効果は低いが、敷地内の植栽を見せたい場合や、開放感を重視する場合に適している。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【木粉入り樹脂フェンス（人工木フェンス）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「腐らない木」のメリット</h4>
          
          <p className="mb-1 text-xs ml-3">
            木粉とプラスチックを混ぜて成形した素材。天然木のような風合いを持ちながら、腐食やシロアリの心配がない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            塗装メンテナンスが不要で、色あせも少ない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">熱伸縮への配慮</h4>
          
          <p className="mb-1 text-xs ml-3">
            樹脂を含むため、温度変化による伸縮が大きい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            施工時には、板材同士に適度な隙間（クリアランス）を設け、伸縮による突き上げや変形を防ぐ必要がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【スチールメッシュフェンス】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">コストパフォーマンスと開放感</h4>
          
          <p className="mb-1 text-xs ml-3">
            鉄線を網目状に溶接したフェンス。安価で施工しやすく、敷地境界の仕切りとして最も多く使われる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            視線を遮らないため開放感があるが、プライバシー保護には不向き。植栽と組み合わせて目隠し効果を持たせる使い方が一般的。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            表面は樹脂コーティングや溶融亜鉛メッキで保護されているが、傷がつくとそこから錆びる可能性がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ブロック塀との組み合わせ】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">高さ制限と控え壁</h4>
          
          <p className="mb-1 text-xs ml-3">
            ブロック塀の上にフェンスを設置する場合、ブロック塀の高さや構造に制限がある（建築基準法）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            高さが1.2mを超えるブロック塀には、一定間隔で<strong>「控え壁（ひかえかべ）」</strong>を設ける必要がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            フェンスの高さや種類によっては、ブロック塀の強度不足になる可能性があるため、専門家による構造検討が必要。
          </p>
          
          <p className="mb-2 text-xs ml-3 text-gray-600 italic">
            これらの知識を踏まえてフェンスを選ぶことで、機能性、デザイン性、耐久性を兼ね備えた、満足度の高い外構を実現できます。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/fence/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('三協アルミ', {
          products: 'https://alumi.st-grp.co.jp/products/fence/',
          catalog: 'https://alumi.st-grp.co.jp/catalog/',
          office: 'https://alumi.st-grp.co.jp/showroom/',
          contact: 'https://alumi.st-grp.co.jp/contact/'
        })}
        {renderCompanyRow('YKK AP', {
          products: 'https://www.ykkap.co.jp/products/fence/',
          catalog: 'https://www.ykkap.co.jp/info/catalog/',
          office: 'https://www.ykkap.co.jp/company/',
          contact: 'https://www.ykkap.co.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderCarportCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">カーポート</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【強度の選定基準】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「38m/s」と「42m/s」の境界線</h4>
          
          <p className="mb-1 text-xs ml-3">
            カーポートには「耐風圧強度」のランクがある。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>38m/s（一般地域用）</strong>： 標準的な強度だが、近年の大型台風では屋根パネルが飛ぶ被害が多発している。</li>
            <li><span className="mr-1">・</span><strong>42m/s（耐風圧仕様）</strong>: 柱が太く、屋根の固定が強固。沿岸部や、周りに風を遮る建物がない「風の通り道」になる場所では、迷わずこちら（またはそれ以上）を選ぶのが、愛車と近隣への被害を防ぐ鉄則。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">片側支持（片持ち）の「サポート柱」</h4>
          
          <p className="mb-1 text-xs ml-3">
            柱が片側にしかないタイプは、駐車しやすいが、風や雪で屋根が大きく揺れる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須オプション: 強風時や積雪時にセットする<strong>「着脱式サポート柱」</strong>を購入しておかないと、屋根が垂れ下がったり、最悪の場合は根元から折れたりする。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【屋根材の素材と機能】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ポリカ」と「スチール（折板）」の寿命差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ポリカーボネート</strong>: 採光性があり明るいが、強度はそこそこ。台風でパネルだけ抜けて飛ぶことがある（本体を守るための仕様でもある）。</li>
            <li><span className="mr-1">・</span><strong>スチール折板（セッパン）</strong>： ガルバリウム鋼板の屋根。最強の強度を誇り、台風でも雪でもびくともしない。完全に日差しを遮るため、車の塗装劣化や車内温度上昇を最も防げるが、下が暗くなる。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">熱線遮断ポリカの「実力」</h4>
          
          <p className="mb-1 text-xs ml-3">
            通常のポリカは明るいが、夏場は車内が灼熱になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 価格差はわずかなので、青みがかった<strong>「熱線遮断（吸収）ポリカ」</strong>を選ぶべき。真夏のハンドルが握れないほどの熱さを劇的に軽減できる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【寸法（高さ・奥行き）の失敗学】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「有効高さ」とルーフボックス</h4>
          
          <p className="mb-1 text-xs ml-3">
            柱の高さではなく、梁（はり）の下端である<strong>「有効高さ」</strong>を確認する。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            落とし穴: 「今の車（セダン等）」に合わせて標準高（H2000mm程度）を選ぶと、将来SUVやミニバンに乗り換えた時や、ルーフキャリアを付けた時に入らなくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            将来を見越して「ハイルーフ（H2300mm〜2500mm）」を選んでおくのが、長く使うための正解。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">トランクが開くか</h4>
          
          <p className="mb-1 text-xs ml-3">
            奥行きがギリギリだと、雨の日にトランク（リアハッチ）を開けた瞬間、ハッチが雨ざらしになったり、柱にぶつかったりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            車長プラスアルファの余裕を持った奥行き設定が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【法的リスク（建ぺい率）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">カーポートは「建築物」</h4>
          
          <p className="mb-1 text-xs ml-3">
            カーポートは、柱と屋根があるため、建築基準法上の「建築物」として扱われる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: 家の<strong>「建ぺい率」ギリギリで家を建てている場合、カーポートを後付けすると「違法建築」</strong>になる可能性がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ※「壁のないカーポート」には建ぺい率の緩和措置（特定行政庁による）がある場合も多いが、確認申請が必要な工作物であることを認識しておく必要がある。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/carport/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('三協アルミ', {
          products: 'https://alumi.st-grp.co.jp/products/carport/',
          catalog: 'https://alumi.st-grp.co.jp/catalog/',
          office: 'https://alumi.st-grp.co.jp/showroom/',
          contact: 'https://alumi.st-grp.co.jp/contact/'
        })}
        {renderCompanyRow('YKK AP', {
          products: 'https://www.ykkap.co.jp/products/carport/',
          catalog: 'https://www.ykkap.co.jp/info/catalog/',
          office: 'https://www.ykkap.co.jp/company/',
          contact: 'https://www.ykkap.co.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderWoodDeckCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ウッドデッキ</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【天然木（ハードウッド）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「シルバーグレー」への変化は劣化ではない</h4>
          
          <p className="mb-1 text-xs ml-3">
            ウリンやイペなどの高耐久ハードウッドも、紫外線に当たると半年〜1年で茶褐色から<strong>「銀白色（シルバーグレー）」</strong>へと退色する。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            重要: これは表面の繊維が保護層を作る正常な変化であり、腐っているわけではない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            施工時の「茶色」を維持したい場合は、半年ごとのオイル塗装（着色）が必須となるため、メンテナンスの覚悟か、色の変化を楽しむ余裕が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ウリンの「赤水（ポリフェノール）」対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            最強の耐久性を誇る「ウリン（アイアンウッド）」だが、雨に濡れると数ヶ月間、ワインのような<strong>真っ赤な樹液（アク）</strong>が染み出し続ける。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            下が土間コンクリートやタイルの場合、赤く染まって取れなくなるため、洗い流せる場所か、アクが出にくい「イペ」や「セランガンバツ」を選ぶ配慮が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ささくれ」と素足リスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            天然木である以上、経年で必ず表面が毛羽立ち、トゲ（ささくれ）が出る。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            子供やペットが走り回る場合は、定期的なサンディング（やすり掛け）が必要。ノーメンテで安全なのは人工木。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【人工木（樹脂デッキ）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">真夏の「火傷（やけど）」レベルの熱さ</h4>
          
          <p className="mb-1 text-xs ml-3">
            樹脂は熱を蓄える性質があるため、直射日光下の表面温度は<strong>60℃〜70℃</strong>に達する。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            素足で歩くと火傷するため、夏場はサンダル履きが必須。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 表面に溝を掘って接触面積を減らしたタイプや、温度上昇を抑える「遮熱顔料」を練り込んだ製品を選ぶのが、最新のトレンド。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「中空（ちゅうくう）」と「無垢（むく）」の構造差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>中空タイプ</strong>: 中が空洞（ちくわ状）。安価で軽いため、デッキ上が熱くなりにくいが、小口（切断面）にキャップが必要で、自由な曲線カットができない。</li>
            <li><span className="mr-1">・</span><strong>無垢タイプ</strong>： 中まで詰まっている。重量があり高価だが、質感が高く、天然木と同じように自由な形にカットできる。ビスの保持力も高い。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">熱伸縮による「反り・突き上げ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            樹脂は温度変化で伸び縮みする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            施工時に板同士の隙間（目地）を適切に空けておかないと、夏場に膨張して板が突き上げられ、波打って変形してしまうトラブルが多い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【床下（デッキ下）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「防草シート」より「土間コン」</h4>
          
          <p className="mb-1 text-xs ml-3">
            デッキの隙間から光が入るため、下を土のままにしておくと雑草が生い茂り、虫の住処になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            防草シート＋砂利でも良いが、完璧を期すなら<strong>「土間コンクリート」</strong>を打設するのが、湿気対策・雑草対策・掃除のしやすさ（物が落ちた時に拾いやすい）の全ての面で最強。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">野良猫の「住処（すみか）」対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            床下が暖かく雨風をしのげるため、野良猫が入り込んで住み着いたり、糞尿をされたりする被害が多い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 側面を<strong>「床下囲い（メッシュフェンスや幕板）」</strong>で塞ぎ、小動物が入れないようにしておくのが、衛生管理上の鉄則。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/garden/deck/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('三協アルミ', {
          products: 'https://alumi.st-grp.co.jp/products/terrace/',
          catalog: 'https://alumi.st-grp.co.jp/catalog/',
          office: 'https://alumi.st-grp.co.jp/showroom/',
          contact: 'https://alumi.st-grp.co.jp/contact/'
        })}
        {renderCompanyRow('YKK AP', {
          products: 'https://www.ykkap.co.jp/products/garden/',
          catalog: 'https://www.ykkap.co.jp/info/catalog/',
          office: 'https://www.ykkap.co.jp/company/',
          contact: 'https://www.ykkap.co.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderLargeSlidingDoorCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">大型引戸</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【レールあり vs ノンレール（浮遊タイプ）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「レール」の泥詰まりと騒音</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>レール式</strong>: 地面にレールを埋め込む標準タイプ。安価で強度が出しやすい。</li>
            <li><span className="mr-1">・</span><strong>弱点</strong>: レールの溝に小石や泥が詰まると、巨大な扉が脱輪したり、動かなくなったりする。また、車が通過するたびに「ガタン」と振動と音が発生する。</li>
            <li><span className="mr-1">・</span><strong>ノンレール（カンテレバー）</strong>： 扉を吊り上げるか、片持ちで浮かせて、<strong>「床にレールがない」</strong>状態でスライドさせる工法。</li>
            <li><span className="mr-1">・</span><strong>メリット</strong>: スムーズで静か。砂利敷きの駐車場でも設置可能。ただし、扉を支えるために巨大な基礎コンクリートが必要になる。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【電動式の安全装置（セーフティ）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「光電管（こうでんかん）」と「負荷検知」の二重ロック</h4>
          
          <p className="mb-1 text-xs ml-3">
            大型引戸は重量が数百キロあるため、挟まれると死亡事故につながる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: センサーの光を遮ると止まる<strong>「光電管センサー」と、何かに当たって負荷がかかると反転する「負荷検知機能」</strong>の2つが装備されていない製品は、安全管理上採用してはいけない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">停電時の「手動切り替え」動線</h4>
          
          <p className="mb-1 text-xs ml-3">
            電動ゲートは停電すると動かなくなる（ロックされる）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            重要: 外部から鍵を使ってクラッチを切り、手動で開けられる<strong>「停電時解錠装置」</strong>の位置を確認すること。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これが敷地内側にしかないと、停電時に車で帰宅した際、中に入れず締め出されてしまう。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【戸車（車輪）のメンテナンス】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「キーキー音」は交換のサイン</h4>
          
          <p className="mb-1 text-xs ml-3">
            引戸の全重量は、数個の戸車（タイヤ）にかかっている。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            ベアリングが磨耗して異音がし始めたら即交換しないと、やがて車輪がロックし、無理に動かすことで<strong>「レール側」を削って破壊</strong>してしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            レール交換は土間コンクリートをハツる大工事になるため、戸車の早期交換がLCC（維持費）を抑える鍵。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【デザインと風圧】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「目隠し」にするほど風に弱くなる</h4>
          
          <p className="mb-1 text-xs ml-3">
            敷地の中を見せたくない要望は多いが、パネルで隙間なく塞ぐと、扉が巨大な「帆」になり、強風で倒壊したり脱輪したりするリスクが激増する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 風が抜ける<strong>「パンチングメタル（穴あき）」や「ルーバー形状」</strong>を選定し、目隠し率と通気性のバランスを取る設計が必須。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        <p className="text-gray-600">準備中...</p>
      </div>
    </div>
  );

  const renderBicycleParkingCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">駐輪場</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【屋根（サイクルポート）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「片流れ（かたながれ）」と「合掌（がっしょう）」の強度</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>片流れ</strong>: 柱が片側だけにあるタイプ。出し入れしやすいが、強風や積雪に弱い。サポート柱が必須。</li>
            <li><span className="mr-1">・</span><strong>合掌</strong>: 両側に柱があり、屋根が山型になっているタイプ。強度が高く、多雪地域や風の強い場所に適している。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「サイドパネル」の有無</h4>
          
          <p className="mb-1 text-xs ml-3">
            横からの雨や風を防ぐパネル。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>メリット</strong>: 自転車が濡れにくく、錆びにくい。目隠し効果もある。</li>
            <li><span className="mr-1">・</span><strong>デメリット</strong>: 風圧を受けやすくなるため、強度の高い柱や基礎が必要になる場合がある。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【駐輪ラック（スタンド）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「前輪式」と「前後輪式」の安定感</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>前輪式</strong>: 前輪だけを固定するタイプ。省スペースだが、風で自転車が回転して倒れやすい。</li>
            <li><span className="mr-1">・</span><strong>前後輪式</strong>： 前後のタイヤを固定するタイプ。安定感が高く、倒れにくい。ただし、設置スペースが必要。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「平置き」と「2段式」の収納力</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>平置き</strong>: 出し入れが楽だが、台数制限がある。</li>
            <li><span className="mr-1">・</span><strong>2段式</strong>： 上下に自転車を収納できるため、同じスペースで倍の台数を置ける。ただし、上段の出し入れには力が必要で、子供や高齢者には不向き。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【盗難防止対策】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「サイクルバー」の設置</h4>
          
          <p className="mb-1 text-xs ml-3">
            駐輪場の柱や地面に固定された金属製のバー。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            自転車のフレームとバーをチェーンロックで繋ぐことで、持ち去りを防ぐことができる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「防犯カメラ」と「照明」</h4>
          
          <p className="mb-2 text-xs ml-3">
            駐輪場は死角になりやすいため、センサーライトや防犯カメラを設置することで、盗難やいたずらの抑止力になる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【床面の舗装】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「土間コンクリート」がベスト</h4>
          
          <p className="mb-1 text-xs ml-3">
            砂利や土のままだと、スタンドが沈んで自転車が倒れたり、雨の日に泥だらけになったりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            コンクリートで舗装することで、安定して駐輪でき、掃除もしやすくなる。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        <p className="text-gray-600">準備中...</p>
      </div>
    </div>
  );

  const renderGarbageStorageCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">ゴミストッカー</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【容量選定の「実効容量」】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">カタログ値の「2割減」で計算する</h4>
          
          <p className="mb-1 text-xs ml-3">
            カタログに「45L袋×20個収納」とあっても、実際に家庭から出るゴミ袋は空気が入って膨らんでおり、隙間なく詰め込むことは不可能。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            鉄則: カタログ数値の<strong>「約70%〜80%」</strong>しか入らない想定でサイズを選ばないと、収集日の朝に扉が閉まらず、カラスに荒らされる原因になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            目安: 「入居世帯数 × 45L袋 × 0.8〜1袋」程度の余裕を持った容量確保が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【メッシュ（網）か、パネル（目隠し）か】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">不法投棄を防ぐ「メッシュ」の視認性</h4>
          
          <p className="mb-1 text-xs ml-3">
            メッシュタイプ: 中が丸見えになる。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 誰がどんな捨て方をしたか外から見えるため、心理的に<strong>「分別ルール違反」や「不法投棄」が減る</strong>傾向にある。また、通気性が良く臭いがこもらないため、水洗いも容易で最も推奨される。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デメリット: 見た目が生活感丸出しになる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">高級感と臭いの「パネルタイプ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            アルミや木調のパネルで囲ったタイプ。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: ゴミが見えないため、マンションのエントランス付近にあっても美観を損なわない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            リスク: 夏場は内部が蒸し風呂状態になり、強烈な腐敗臭が発生する。必ず<strong>「通気口（パンチング加工）」</strong>が十分にある製品を選ぶ必要がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【底板（床）の清掃性と排水】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「パンチング（穴あき）」と「脱着式」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ゴミステーションの底は、生ゴミの汁（汚水）で最も汚れ、腐食する場所。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            必須機能: 底板を取り外して丸洗いできる<strong>「脱着式底板」か、最初から水が下に抜ける「パンチング（穴あき）床」</strong>を選ばないと、底に汚水が溜まってヘドロ化し、悪臭クレームの原因になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            設置場所の土間コンクリートには、水勾配と排水溝を設けておくことが前提。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【扉の開閉方式と安全性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「引き戸」と「跳ね上げ」のスペース</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>引き戸（スライド）</strong>： 開口部が広く、軽い力で開けられる。高齢者や子供でも使いやすいが、レールの掃除が必要。</li>
            <li><span className="mr-1">・</span><strong>跳ね上げ（上開き）</strong>: 間口いっぱいに開くためゴミ収集車が作業しやすい。</li>
          </ul>
          
          <p className="mb-1 text-xs ml-3">
            注意点: 大型の上開き扉は重いため、<strong>「ガスダンパー（開閉補助）」</strong>が付いていないと、指詰め事故や、重くて開けられないという事態になる。ダンパーの交換寿命（数年）も考慮が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【カラス・猫対策のディテール】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「隙間（すきま）」の完全封鎖</h4>
          
          <p className="mb-1 text-xs ml-3">
            扉の下や、本体と地面の間に数センチでも隙間があると、そこから猫やネズミが侵入する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            アジャスターで高さを調整して地面と密着させるか、オプションの<strong>「隙間隠しカバー」</strong>を取り付けて、物理的に侵入経路を塞ぐ必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">南京錠と「ダイヤル錠」</h4>
          
          <p className="mb-1 text-xs ml-3">
            部外者の持ち込みゴミを防ぐため、施錠管理は必須。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            運用: 南京錠は鍵の管理（紛失・共有）が大変なため、入居者共有の暗証番号で開けられる<strong>「ダイヤル錠」</strong>や「プッシュボタン錠」を標準装備にしておくのが、管理会社の手間を減らす正解。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        <p className="text-gray-600">準備中...</p>
      </div>
    </div>
  );

  const renderGreeningCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">エクステリア緑化</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【シンボルツリー（高木）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「シマトネリコ」の成長スピード</h4>
          
          <p className="mb-1 text-xs ml-3">
            洋風住宅に合う涼しげな見た目で大人気だが、成長速度が凄まじく早い。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: 放置すると数年で2階の屋根を超える巨木になり、剪定コストが嵩む。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: メンテナンスを楽にしたいなら、成長が遅い<strong>「アオダモ」や「ソヨゴ」、「ハイノキ」</strong>などを選ぶのが、長い目で見て賢い選択（初期費用は高い）。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「落葉樹」のパッシブ効果</h4>
          
          <p className="mb-1 text-xs ml-3">
            落ち葉掃除が大変と敬遠されがちだが、南側の窓前に植えるなら落葉樹が最強。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            機能: 夏は葉が生い茂って日差しを遮り（天然のシェード）、冬は葉が落ちて暖かい陽射しを室内に取り込む。省エネと快適性を両立する機能的な役割がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">オリーブの「アナアキゾウムシ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            おしゃれなオリーブだが、日本の気候では<strong>「オリーブアナアキゾウムシ」</strong>という天敵が発生しやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            幹の内部を食い荒らして突然枯らすため、定期的な薬剤散布やチェックが必須であることを伝える必要がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【人工芝（じんこうしば）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">真夏の「火傷（やけど）」リスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            樹脂製のため、真夏の直射日光下では表面温度が<strong>60℃〜70℃</strong>近くになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            子供やペットが裸足で遊ぶと火傷する危険があるため、夏場は散水して冷やすか、遮熱タイプの製品を選ぶ必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「V字パイル」の復元力</h4>
          
          <p className="mb-1 text-xs ml-3">
            安価な人工芝は、踏まれると芝（パイル）が寝てしまい、ペチャンコになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            良品: パイルの断面が<strong>「V字」や「C字」</strong>に加工されているものは、踏まれても起き上がる復元力が高く、長期間リアルな見た目を維持できる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「防草シート」とのセット施工</h4>
          
          <p className="mb-1 text-xs ml-3">
            人工芝には水抜きの穴が空いているため、下地が土のままだと、穴から雑草が生えてくる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必ず下に高性能な<strong>「防草シート」</strong>を敷き込んでから施工しないと、数年で草だらけの人工芝になる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【防草シート（雑草対策）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「織物（クロス）」と「不織布（ふしょくふ）」の差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>織物タイプ</strong>: 安価だが、編み目の隙間からスギナやチガヤなどの強害雑草が突き抜けてくる。</li>
            <li><span className="mr-1">・</span><strong>不織布タイプ</strong>： 繊維が絡み合っているため隙間がなく、突き抜けに強い（デュポン社「ザバーン240」などが業界標準）。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            砂利下に敷く場合、一度敷くと交換が大変なため、多少高くても不織布タイプを選ぶのが鉄則。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【根の被害（バンブーバリア）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">配管を破壊する「根」</h4>
          
          <p className="mb-1 text-xs ml-3">
            樹木や竹の根は、水分を求めて地中の排水管の継ぎ目に入り込み、配管を詰まらせたり破壊したりすることがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 配管の近くに植栽する場合や、竹（地下茎で増える植物）を植える場合は、地中に<strong>「防根（ぼうこん）シート」</strong>を埋設して、根の侵入エリアを物理的に制限する必要がある。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        <p className="text-gray-600">準備中...</p>
      </div>
    </div>
  );

  const renderExteriorOtherCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">その他</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【舗装材（アプローチ・テラス床）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「乱形石（らんけいせき）」の職人技</h4>
          
          <p className="mb-1 text-xs ml-3">
            自然石をパズルのように組み合わせる石張り。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            注意点: 職人の腕によって仕上がりに雲泥の差が出る。「目地（石と石の隙間）」が均一で細いほど美しく、広すぎるとモルタルばかり目立って安っぽくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            雨に濡れると滑りやすくなる石種（大理石など）は避け、表面がザラザラした<strong>「滑り止め加工（バーナー仕上げ等）」</strong>がされた石を選ぶのが鉄則。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「インターロッキング」の透水性</h4>
          
          <p className="mb-1 text-xs ml-3">
            コンクリートブロックを敷き詰める舗装。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            機能: 雨水を地面に逃がす<strong>「透水性タイプ」</strong>を選べば、水たまりができにくく、ゲリラ豪雨対策にもなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            下地が砂決め（砂の上に置くだけ）の場合、経年で波打ったり、目地から雑草が生えたりするリスクがあるため、防草シートや固まる砂の併用が推奨される。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「洗い出し（あらいだし）」の意匠</h4>
          
          <p className="mb-2 text-xs ml-3">
            コンクリートが固まる前に表面を洗い流し、中の砂利を見せる技法。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            和風・洋風どちらにも合い、滑り止め効果も高いが、施工直後の雨に弱く、職人の技術が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ガーデンルーム・テラス囲い】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「固定資産税」の対象になるか</h4>
          
          <p className="mb-1 text-xs ml-3">
            サンルームやガーデンルームは、3方向が壁やガラスで囲まれ、屋根があると「建物（増築）」とみなされ、固定資産税の課税対象になる場合がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            また、建ぺい率・容積率の制限を受けるため、敷地いっぱいに建てると違法建築になるリスクがある。事前の法規チェックが必須。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">夏場の「温室化」対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            ガラスで囲まれた空間は、夏場は猛烈に暑くなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: <strong>「内部日除け（シェード）」や、屋根材に「熱線遮断ポリカ」</strong>を採用しないと、夏の間は灼熱地獄で使えないデッドスペースになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            換気のための窓（網戸付き）も重要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【外構照明（ライティング）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「12V（ローボルト）」の安全性</h4>
          
          <p className="mb-1 text-xs ml-3">
            以前は100Vの照明が主流だったが、漏電リスクや資格が必要なため、現在はトランスで電圧を下げた<strong>「12Vシステム」</strong>が主流。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            メリット: 資格不要でDIYでも設置可能。万が一配線を切っても感電せず、配置換えも容易。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">植栽を魅せる「アップライト」</h4>
          
          <p className="mb-1 text-xs ml-3">
            シンボルツリーを下から照らす照明。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            配置: 樹木の真下ではなく、少し離して幹や葉の裏側を照らすと、ドラマチックな影ができる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            光害: 角度を間違えると、隣家の窓や通行人の目を直撃してトラブルになるため、フード付きや角度調整可能な器具を選ぶ。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【水栓柱（立水栓）・ガーデンパン】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「凍結防止」機能</h4>
          
          <p className="mb-1 text-xs ml-3">
            寒冷地では、冬場に水道管が凍結・破裂する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 内部の水を抜くことができる<strong>「不凍水栓柱（ふとうすいせんちゅう）」</strong>を選ばないと、ひと冬で壊れることがある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">使い勝手を決める「高さ」と「パン（受け皿）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            高さ: 散水用なら低くても良いが、手洗いや洗い物をするなら腰高（80cm程度）がないと使いにくい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            パン: 水跳ねを防ぐため、深さのあるパンを選ぶか、砂利を敷いて水流を和らげる工夫が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【土留め（どどめ）・擁壁（ようへき）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ブロック塀」は土留めではない</h4>
          
          <p className="mb-1 text-xs ml-3">
            普通のコンクリートブロック（CB）は、土の圧力に耐えられる構造ではない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            土を留める場合は、必ず強度の高い<strong>「型枠ブロック（CP）」や「擁壁（RC）」</strong>にする必要がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            高さ2mを超える擁壁は確認申請が必要になるなど、法規制が厳しいため、安易なDIYは危険。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【雑草対策】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「防草シート」のグレード</h4>
          
          <p className="mb-1 text-xs ml-3">
            砂利の下に敷くシート。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            安価な織物（クロス）タイプは、隙間からスギナなどの強害雑草が突き抜けてくる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 不織布タイプで厚みがあり、遮光性が高い<strong>「高耐久防草シート（ザバーン240等）」</strong>を選ばないと、数年で敷き直しになる。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        <p className="text-gray-600">準備中...</p>
      </div>
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        <p className="text-gray-600">準備中...</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case '宅配ボックス':
        return renderDeliveryBoxCategory();
      case '郵便受け':
        return renderMailboxCategory();
      case '表札':
        return renderNameplateCategory();
      case '門扉':
        return renderGateCategory();
      case 'フェンス':
        return renderFenceCategory();
      case 'カーポート':
        return renderCarportCategory();
      case 'ウッドデッキ':
        return renderWoodDeckCategory();
      case '大型引戸':
        return renderLargeSlidingDoorCategory();
      case '駐輪場':
        return renderBicycleParkingCategory();
      case 'ゴミストッカー':
        return renderGarbageStorageCategory();
      case 'エクステリア緑化':
        return renderGreeningCategory();
      case 'エクステリアその他':
        return renderExteriorOtherCategory();
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

export default ExteriorContent; 