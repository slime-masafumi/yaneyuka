import React, { useState } from 'react';

interface MechanicalSystemsContentProps {
  subcategory: string;
}

const MechanicalSystemsContent: React.FC<MechanicalSystemsContentProps> = ({ subcategory }) => {
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

  const renderHeader = (title: string) => (
    <div className="mb-2">
      <h2 className="text-xl font-semibold inline">{title}</h2>
      <a href="/register" className="ml-2 align-baseline text-gray-600 hover:text-gray-800 text-[11px]">掲載希望はコチラ</a>
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

  const renderWaterFaucetCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">水栓</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【タッチレス（センサー）水栓】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「電源」の確保と停電時の挙動</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>AC100V式（コンセント）</strong>: 電池交換不要で感度が安定しているが、シンク下に電源工事が必要。停電時は水が出なくなる製品もあるため、<strong>「手動弁（停電対応ユニット）」</strong>の有無を確認する必要がある。</li>
            <li><span className="mr-1">・</span><strong>電池式</strong>: 電気工事不要でリフォーム向きだが、数年ごとの電池交換が必要。交換作業がシンクの奥で大変な場合がある。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「黒いスポンジ」に反応しない</h4>
          
          <p className="mb-1 text-xs ml-3">
            赤外線センサーの特性上、黒い物や透明なガラスには反応しにくい場合がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            また、猫がシンクに乗って水出しっぱなしになる事故もあるため、外出時は元栓を閉めるか、センサー機能をOFFにする機能がついているかが重要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【キッチン水栓の形状と機能】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「グースネック」の水ハネ問題</h4>
          
          <p className="mb-1 text-xs ml-3">
            ガチョウの首のように湾曲した高い吐水口のデザイン。おしゃれで大きな鍋も洗いやすい。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            デメリット: 吐水口が高い位置にあるため、水がシンクに落ちる落差が大きく、<strong>「水ハネ」</strong>が激しい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 水ハネを抑える「微細シャワー」機能付きを選ぶか、シンクの深さを確保する設計が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">浄水器の「内蔵型」と「ビルトイン型」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>スパウトイン（内蔵）</strong>： 水栓の首の中にカートリッジが入る。交換が楽で安価だが、浄水能力と寿命（約3〜4ヶ月）は低い。</li>
            <li><span className="mr-1">・</span><strong>アンダーシンク（ビルトイン）</strong>: シンク下に大きなタンクを置く。工事が必要で高価だが、浄水能力が高く、交換頻度も年1回程度。料理にこだわるならこちら。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【浴室・洗面水栓の機能】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「サーモスタット」の寿命</h4>
          
          <p className="mb-1 text-xs ml-3">
            温度調整ハンドルの内部にある「サーモエレメント（形状記憶合金バネ）」は消耗品。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            10年程度で温度調整が効かなくなり、急に熱湯や水が出るようになるため、カートリッジごとの交換が必要になる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「壁出し（かべだし）」と「台付き（だいつき）」の掃除</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>台付き</strong>: 洗面ボウルの平らな面（デッキ）に設置。根元に水が溜まり、赤カビやカルキ汚れ（ガリガリ）ができやすい。</li>
            <li><span className="mr-1">・</span><strong>壁出し</strong>: 壁（またはハイバックガード）から水栓が出ている。根元に水が溜まらないため、掃除が劇的に楽になる。近年の洗面化粧台のトレンド。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【海外製水栓（グローエ・ハンスグローエ等）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「水圧」不足によるストレス</h4>
          
          <p className="mb-1 text-xs ml-3">
            欧米の水圧は日本より高いため、海外製水栓は流水抵抗が高い設計になっていることが多い。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            日本の一般的な水圧（特にエコキュートや3階建て）で使うと、チョロチョロとしか水が出ず、使い物にならないことがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 事前に給水圧力を測定するか、日本向けに内部パーツが調整された正規輸入品を選ぶのが鉄則。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">メンテナンス部品の供給</h4>
          
          <p className="mb-1 text-xs ml-3">
            国産メーカー（TOTO、LIXIL、KVK）は、ホームセンターでもパッキンが手に入るが、海外製は部品取り寄せに数週間かかったり、数年で廃番になったりするリスクがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            デザインは素晴らしいが、メンテナンスコストと時間は国産の倍以上かかる覚悟が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【仕上げ（カラー）の維持管理】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「マットブラック」のカルキ汚れ</h4>
          
          <p className="mb-1 text-xs ml-3">
            流行の黒い水栓は、水滴が乾いた後に残る白いカルキ跡（スケール）が非常に目立つ。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            毎回拭き上げないとすぐに白く汚れてしまうため、ズボラな性格の施主には、汚れが目立ちにくい「クロームメッキ」か「ヘアラインステンレス」を推奨すべき。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">PVD（物理蒸着）コーティング</h4>
          
          <p className="mb-1 text-xs ml-3">
            ゴールドやブラックの着色において、塗装ではなく金属蒸着させた<strong>「PVD仕上げ」</strong>であれば、タワシで擦っても剥げないほどの硬度がある。高級水栓を選ぶ際のスペック基準。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('TOTO', {
          products: 'https://jp.toto.com/products/faucet/',
          catalog: 'https://jp.toto.com/support/catalog/',
          office: 'https://jp.toto.com/contacts/showroom/',
          contact: 'https://jp.toto.com/contacts/'
        })}
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/faucet/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('KVK', {
          products: 'https://www.kvk.co.jp/products/',
          catalog: 'https://www.kvk.co.jp/catalog/',
          office: 'https://www.kvk.co.jp/corporate/office/',
          contact: 'https://www.kvk.co.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderSanitaryCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">衛生機器</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【トイレ（便器・温水洗浄便座）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">タンクレストイレの「水圧」確認</h4>
          
          <p className="mb-1 text-xs ml-3">
            水を貯めずに水道直圧で流すタンクレスは、設置に<strong>「最低必要水圧」</strong>の条件がある。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: 2階以上のトイレや、高台の住宅、古い配管の家では水圧が足りず、汚物が流れきらない（詰まる）事故が起きる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            事前の水圧測定が必須だが、不安な場合は「タンク式」か、圧力を高める「ブースター付き」を選ぶのが鉄則。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">リフォーム専用「リモデル便器」の仕組み</h4>
          
          <p className="mb-1 text-xs ml-3">
            昔のトイレと今のトイレでは、排水管の位置（壁からの距離）が違う。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            排水芯（はいすいしん）: 現在の標準は壁から200mmだが、古いトイレは300mm〜500mmなどバラバラ。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            床を壊して配管を直すのは大工事になるため、アジャスター（蛇腹管）で位置を調整できる<strong>「リモデル（リフォーム）用便器」</strong>を選定するのがコストダウンの鍵。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「フチなし形状」と尿ハネ</h4>
          
          <p className="mb-1 text-xs ml-3">
            掃除が楽な「フチ裏なし」形状が主流だが、フチの返しがない分、男性が立って用を足すと<strong>「尿ハネ」</strong>が便器の外（床や壁）に飛び散りやすくなるという弊害がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            掃除のしやすさと、汚れの広がりやすさはトレードオフの関係にあるため、座ってすることを推奨するか、腰壁にパネルを貼る対策が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ユニットバス（システムバス）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「FRP」と「人造大理石」の清掃性格差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>FRP浴槽</strong>: 標準仕様。ガラス繊維強化プラ。丈夫だが、表面に微細な凹凸があり、経年で湯垢がこびりつきやすくなる。</li>
            <li><span className="mr-1">・</span><strong>人造大理石浴槽</strong>: オプション仕様。表面が極めて平滑で硬いため、スポンジで撫でるだけで汚れが落ちる。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            結論: 毎日の掃除時間を減らしたいなら、数万円アップしても人造大理石（特にアクリル系）にグレードアップする価値は絶対にある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「保温浴槽」と「断熱フタ」のセット運用</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴槽を発泡スチロール等で包んだ「高断熱浴槽（魔法びん浴槽等）」は、4時間で2.5℃しか下がらない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            落とし穴: いくら浴槽がすごくても、<strong>「風呂フタ」</strong>が薄いペラペラなものだと熱は上から逃げる。必ず分厚い「断熱フタ」とセットで採用しないと意味がない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ドアの「ガラリ（通気口）」の位置</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴室ドアの下にある通気口（ガラリ）は、埃とカビが溜まりやすく掃除が困難な場所No.1だった。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            最新トレンド: 通気口をドアの「上枠」に移動させた<strong>「上部換気ドア（パッキンレス）」</strong>が増えている。足元に穴がないため、汚れがたまらず見た目もスッキリする。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【洗面化粧台】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「陶器ボウル」と「樹脂ボウル」の破損リスク</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>陶器</strong>: 傷や熱に強く、ヘアカラー液も染み込まない。ただし、硬い化粧瓶を落とすと<strong>「割れる」</strong>リスクがある。</li>
            <li><span className="mr-1">・</span><strong>樹脂（人工大理石）</strong>： 割れにくいが、細かい傷がつきやすく、毛染め液などが長時間付着すると色素沈着するリスクがある。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            使い方（物を落としやすいか、毛染めをするか）で素材を選ぶ必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">水栓根元の「ハイバックガード」</h4>
          
          <p className="mb-1 text-xs ml-3">
            従来の水栓（デッキタイプ）は、根元に水が溜まって赤カビが生えやすかった。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            主流: 壁から水栓が出る、またはボウルの背が高い<strong>「ハイバックガード」</strong>タイプなら、根元に水が溜まらず、掃除の手間が劇的に減る。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「三面鏡」裏の収納力とコンセント</h4>
          
          <p className="mb-1 text-xs ml-3">
            鏡の裏が収納になっているタイプが標準だが、電動歯ブラシやシェーバーを「充電しながら収納」できるかどうかが重要。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            チェック: 収納内部に<strong>「コンセント」</strong>があるか、トレーの高さは変えられるか、ドライヤーは入るかなど、持っている家電に合わせた収納計画が必要。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('TOTO', {
          products: 'https://jp.toto.com/products/',
          catalog: 'https://jp.toto.com/support/catalog/',
          office: 'https://jp.toto.com/contacts/showroom/',
          contact: 'https://jp.toto.com/contacts/'
        })}
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/toilet/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('パナソニック', {
          products: 'https://panasonic.jp/sumai/toilet/',
          catalog: 'https://panasonic.jp/sumai/catalog/',
          office: 'https://panasonic.jp/sumai/showroom/',
          contact: 'https://panasonic.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderResidentialEquipmentCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">住宅設備</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【システムキッチン】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">人造大理石の「アクリル」と「ポリ」の決定的差</h4>
          
          <p className="mb-1 text-xs ml-3">
            白い天板（ワークトップ）は全て同じに見えるが、樹脂の種類で性能が天と地ほど違う。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>アクリル系</strong>: 汚れが染み込みにくく、熱に強い。変色もしにくい。現在の標準。</li>
            <li><span className="mr-1">・</span><strong>ポリエステル系</strong>: 安価だが、醤油やカレーの黄色いシミが染み込みやすく、紫外線で黄ばみやすい。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            見分け方: カタログの隅に小さく書いてある材質を必ず確認する。長く綺麗に使いたいなら「アクリル系」一択。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">キャビネット（骨組み）の「木」と「ステンレス」</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>木製キャビネット</strong>: 一般的なキッチン。湿気や調味料のこぼれで底板が腐ったり、カビや臭いの原因になる。ゴキブリが住み着きやすい。</li>
            <li><span className="mr-1">・</span><strong>ステンレスキャビネット</strong>: クリナップなどが採用。カビ・錆び・臭いに圧倒的に強く、虫も寄り付かない。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            設備機器（コンロや食洗機）は交換できるが、箱（キャビネット）は交換できないため、家を長持ちさせたいならステンレス製が最強の選択肢となる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">レンジフードの「整流板（せいりゅうばん）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            昔の深型フードは掃除が大変だったが、現在は<strong>「整流板（底面のパネル）」</strong>が付いたスリム型が標準。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            機能: 板で吸い込み口を狭めることで吸引力を上げると同時に、油汚れの8割をこの板に付着させる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            内部のファン掃除が「10年間不要」を謳う製品（オイルスマッシャー等）もあるが、整流板だけはこまめな拭き掃除が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">シンクと天板の「継ぎ目（シームレス）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            「人大天板＋ステンレスシンク」の組み合わせは、異素材の継ぎ目にコーキングが入るため、そこがカビて黒ずむリスクがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 天板とシンクを同素材（人大×人大、ステンレス×ステンレス）にして、継ぎ目を磨いて一体化させた<strong>「シームレス接合」</strong>を選ぶと、段差と汚れ溜まりが消滅する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ユニットバス（システムバス）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">ドアの「ガラリ（通気口）」の大移動</h4>
          
          <p className="mb-1 text-xs ml-3">
            従来の浴室ドア下にあるガラリ（通気口）は、埃とカビが詰まって掃除不能になる「不潔ゾーン」だった。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            現代の常識: 現在の上位モデルは、通気口をドアの<strong>「上枠（天井付近）」や「縦枠」に移動させた「パッキンレスドア」</strong>が主流。足元に穴もパッキンもないため、掃除が劇的に楽になる。リフォーム時の満足度が最も高い機能の一つ。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">壁パネルの「目地（コーキング）」削減</h4>
          
          <p className="mb-1 text-xs ml-3">
            ユニットバスの壁はパネルを繋いで作るため、目地にコーキング（シーリング）が入る。ここがカビの温床になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 目地を無くすことはできないが、パネルの継ぎ目にカビが生えにくい<strong>「乾式目地（パッキン）」</strong>を採用しているメーカーや、そもそも目地が少ない大判パネルを選ぶのがポイント。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">見えない「断熱パック」の有無</h4>
          
          <p className="mb-1 text-xs ml-3">
            「高断熱浴槽」を選んでも、浴室の壁や天井、床下の裏側に断熱材が入っていないと、お湯は冷めなくても「洗い場が寒い」。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 標準仕様では天井や壁の断熱材が抜かれていることがある。オプションや寒冷地仕様扱いになっている<strong>「浴室全体断熱（断熱パック）」</strong>を入れないと、冬場のヒートショック対策としては不完全。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">壁の「マグネット」対応</h4>
          
          <p className="mb-1 text-xs ml-3">
            タカラスタンダード（ホーロー）やTOTO、リクシルなどの壁パネルは、裏に鋼板が入っているため磁石がつく（※一部シリーズ除く）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            収納棚やタオル掛けを全てマグネット式にすることで、取り外して壁を丸洗いでき、ボトルの底のヌメリ汚れを防げる<strong>「浮かせ収納」</strong>が可能になる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【給湯機（エコキュート・ガス給湯器）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">エコキュートの弱点「シャワーの水圧」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ガス給湯器は水道直圧で勢いよくお湯が出るが、標準的なエコキュートはタンクに貯めるため減圧されており、水圧が低い（ガスの約1/3）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: 2階や3階に浴室がある場合、シャワーがチョロチョロとしか出ず、冬場は寒くて浴びていられない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 2階以上で給湯する場合や、多機能シャワーヘッドを使う場合は、必ず<strong>「高圧タイプ（パワフル高圧）」</strong>を選定するのが、現代の快適基準。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「マイクロバブル」機能の実装</h4>
          
          <p className="mb-1 text-xs ml-3">
            微細な泡でお湯を白濁させ、温浴効果を高めたり、配管洗浄を行ったりする機能。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            後付けができないため、新築・交換時に本体に機能がついているか、専用の循環アダプターが必要かを確認する必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ガス給湯器の「号数（ごうす）」ダウンの禁止</h4>
          
          <p className="mb-1 text-xs ml-3">
            「24号（冬でもシャワーとキッチン同時使用OK）」から、コストダウンで「20号」や「16号」に下げると、誰かが洗い物をした瞬間にシャワーが水になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            4人家族以上なら、絶対に24号を下回ってはいけない。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【浴室暖房乾燥機（カワック・暖房機）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「電気式100V」のパワー不足</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴室暖房には「ガス温水式」「電気200V」「電気100V」がある。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            注意点: 建売住宅などで標準の「電気100V」は、予備暖房としては使えるが、衣類乾燥には時間がかかりすぎて実用的ではない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            洗濯物を乾かしたいなら、パワーのある<strong>「ガス式」か「電気200V」</strong>に変更しないと、結局使わなくなる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【床暖房（ゆかだんぼう）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「温水式」と「電気式」のランニングコスト差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>温水式（ガス・ヒートポンプ）</strong>： 初期費用は高いが、ランニングコストが安く、部屋全体を暖めるパワーがある。LDKなどの広い部屋向き。</li>
            <li><span className="mr-1">・</span><strong>電気式（ヒーター）</strong>: 初期費用は安いが、電気代が高い。キッチンや脱衣所など、<strong>「短時間・局所的」</strong>に使う場所に限定して採用するのが賢い設計。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">フローリングの「床暖対応」確認</h4>
          
          <p className="mb-2 text-xs ml-3">
            床暖房の上に、非対応のフローリングやフロアタイルを貼ると、熱で収縮して隙間が空いたり、変色したりする。必ず仕上げ材側の対応確認が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【24時間換気システム】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">給気口（レジスター）の「コールドドラフト」</h4>
          
          <p className="mb-1 text-xs ml-3">
            第3種換気（排気のみ機械）の場合、壁の給気口から外気がそのまま入ってくる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            配置計画: 給気口をベッドの枕元やソファの真上に配置すると、冬場に冷たい外気が顔に直撃して不快になる。必ず<strong>「人が滞在しない場所（家具のない壁やエアコンの上）」</strong>に配置する図面チェックが必要。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('パナソニック', {
          products: 'https://panasonic.jp/sumai/',
          catalog: 'https://panasonic.jp/sumai/catalog/',
          office: 'https://panasonic.jp/sumai/showroom/',
          contact: 'https://panasonic.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderKitchenCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">キッチン</h2>
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
          <p className="text-xs text-gray-600">基本知識の内容を追加予定</p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/kitchen/',
          catalog: 'https://www.biz-lixil.com/catalog/',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/contact/'
        })}
        {renderCompanyRow('パナソニック', {
          products: 'https://panasonic.jp/sumai/kitchen/',
          catalog: 'https://panasonic.jp/sumai/catalog/',
          office: 'https://panasonic.jp/sumai/showroom/',
          contact: 'https://panasonic.jp/support/contact/'
        })}
        {renderCompanyRow('クリナップ', {
          products: 'https://cleanup.jp/kitchen/',
          catalog: 'https://cleanup.jp/catalog/',
          office: 'https://cleanup.jp/showroom/',
          contact: 'https://cleanup.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderAirConditioningCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">空調機</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【天井カセット型（天カセ）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「4方向」と「ラウンドフロー」の気流</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>4方向</strong>: 従来のオフィス標準。四角く風が出るため、四隅（角）に風が届かず、温度ムラができやすい。</li>
            <li><span className="mr-1">・</span><strong>ラウンドフロー（360度）</strong>： 円形に風が出る。温度ムラが少なく、直撃風（ドラフト）も和らげられるため、現在の店舗・オフィスの主流。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">スケルトン天井対応の「ブラックパネル」</h4>
          
          <p className="mb-1 text-xs ml-3">
            天井を貼らない「スケルトン天井」のカフェやオフィスが人気だが、白いエアコンだと目立って浮いてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            意匠: メーカー純正で<strong>「黒色（ブラック）」</strong>の化粧パネルや本体が用意されている機種を選ぶと、塗装の手間なく空間に溶け込ませることができる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">高天井の「自動昇降（しょうこう）パネル」</h4>
          
          <p className="mb-1 text-xs ml-3">
            吹き抜けやエントランスなど、脚立で届かない高い場所に設置する場合、フィルター掃除ができない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須機能: リモコン操作でグリル（吸込口）が手元まで降りてくる<strong>「昇降パネル」</strong>仕様にしておかないと、メンテナンスのたびに足場を組むコストがかかる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【天井埋込ダクト型（ビルトイン）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ホテルライク」な隠蔽デザイン</h4>
          
          <p className="mb-1 text-xs ml-3">
            本体を天井裏に隠し、吹出口（ブリーズライン等）だけを見せる手法。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>メリット</strong>: エアコンの存在感が消えるため、最高級のインテリアを実現できる。リビングやホテルで採用される。</li>
            <li><span className="mr-1">・</span><strong>デメリット</strong>: 導入コストが高く、天井裏のスペース（懐）も必要。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">嫌われる「点検口」の配置問題</h4>
          
          <p className="mb-1 text-xs ml-3">
            本体が天井裏にあるため、メンテナンスや故障時のために必ず<strong>「点検口（450角以上）」</strong>を機械の近くに設置しなければならない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            意匠を優先して点検口を省略したり、家具の上に配置してしまうと、修理不能になる。点検口を目立たない場所に配置する設計力が問われる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【マルチエアコン（ビルマル・住宅用マルチ）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「室外機1台」のスペースメリット</h4>
          
          <p className="mb-1 text-xs ml-3">
            1台の室外機で、複数台（3〜5台以上）の室内機を動かすシステム。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: バルコニーや外周が室外機だらけにならず、すっきりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            最大のリスク: 室外機が故障すると、繋がっている全ての部屋のエアコンが同時に止まる。真夏に全滅するリスクを説明した上で採用する必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">将来の「交換」難易度</h4>
          
          <p className="mb-1 text-xs ml-3">
            マルチエアコンは、室内機と室外機がセットで制御されているため、壊れた部屋だけ交換することができない（総取り替えになる）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            また、配管が現行機種と合わない場合、壁や天井を壊して配管をやり直す大工事になるリスクがある。これを避けるため、あえて「個別エアコン」を推奨するケースも多い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【寒冷地・塩害地のスペック選定】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">北海道・東北の「ズバ暖・メガ暖」</h4>
          
          <p className="mb-1 text-xs ml-3">
            通常のエアコンは外気温がマイナスになると暖房能力が激減し、止まってしまう（霜取り運転）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            寒冷地仕様: コンプレッサーの排熱を利用する等の技術で、氷点下15度や25度でもパワフルに温風が出る専用機種（三菱「ズバ暖」、ダイキン「スゴ暖」等）でないと、北国のメイン暖房としては使い物にならない。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">海沿いの「耐塩害（たいえんがい）仕様」</h4>
          
          <p className="mb-1 text-xs ml-3">
            海から近い地域（300m〜1km以内等）では、室外機のアルミフィンや基盤が塩分で腐食し、数年で故障する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: メーカーが定めた<strong>「耐塩害仕様」や「重塩害仕様」</strong>の防錆処理された室外機を選定しないと、メーカー保証の対象外となる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【配管とドレンの知識】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「隠蔽配管（いんぺいはいかん）」の覚悟</h4>
          
          <p className="mb-1 text-xs ml-3">
            壁の中に冷媒管を埋め込んでおく先行配管。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            外壁に配管カバーが出ないため美しいが、エアコン交換時に配管の再利用ができない（洗浄が必要、またはサイズが合わない）トラブルが多い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            漏水やガス漏れが起きても壁の中なので修理が難しく、リスクが高い工法であることを理解しておく必要がある。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('ダイキン工業', {
          products: 'https://www.daikin.co.jp/products/',
          catalog: 'https://www.daikin.co.jp/catalog/',
          office: 'https://www.daikin.co.jp/contact/office/',
          contact: 'https://www.daikin.co.jp/contact/'
        })}
        {renderCompanyRow('三菱電機', {
          products: 'https://www.mitsubishielectric.co.jp/home/kirigamine/',
          catalog: 'https://www.mitsubishielectric.co.jp/catalog/',
          office: 'https://www.mitsubishielectric.co.jp/contact/',
          contact: 'https://www.mitsubishielectric.co.jp/contact/'
        })}
        {renderCompanyRow('パナソニック', {
          products: 'https://panasonic.jp/aircon/',
          catalog: 'https://panasonic.jp/aircon/catalog/',
          office: 'https://panasonic.jp/showroom/',
          contact: 'https://panasonic.jp/support/contact/'
        })}
      </div>
    </div>
  );

  const renderOtherCategory = () => (
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
          <h3 className="font-bold text-[13px] mb-1.5">【給水ポンプ・排水ポンプ】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">地下室の命綱「自動交互運転（じどうこうごうんてん）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            地下室のトイレや手洗い場の排水は、ポンプで汲み上げる必要がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: ポンプは必ず<strong>「2台設置（デュアル）」</strong>にし、交互に動かす制御盤を組むこと。1台が故障しても、もう1台が動いて警報を鳴らすシステムにしておかないと、故障時に即座に汚水が溢れ出し（オーバーフロー）、地下室が水没する大惨事になる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">シャワー圧を安定させる「インバーター制御」</h4>
          
          <p className="mb-1 text-xs ml-3">
            受水槽方式のマンションやビルで、古いポンプを使っていると、誰かが水を使うたびに水圧が変動してシャワー温度が変わる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            現在の標準である<strong>「インバーターポンプ」</strong>は、使用水量に応じて回転数を制御し、常に一定の水圧（定圧給水）を保てるため、居住者の快適性が劇的に向上する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【浄化槽（合併処理浄化槽）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">心臓部「ブロワー」の寿命と音</h4>
          
          <p className="mb-1 text-xs ml-3">
            浄化槽はバクテリアに空気を送る「ブロワー（送風機）」が止まると、数日で悪臭が発生する。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            配置計画: ブロワーは24時間稼働で「ブーン」という低周波音を出す。寝室の窓の下などに設置すると騒音クレームになるため、家の裏手など配置に配慮が必要。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            寿命: 5年〜7年程度。消耗品と割り切って交換予算を見ておく必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「単独」から「合併」への完全移行</h4>
          
          <p className="mb-1 text-xs ml-3">
            昔の「単独処理浄化槽（トイレのみ処理）」は、現在は新設禁止。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リフォーム時も、原則として生活排水すべてを処理する<strong>「合併処理浄化槽」</strong>への入れ替えが義務付けられている（補助金が出る自治体が多い）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            サイズが大きくなるため、敷地内に埋設スペースがあるかの確認が最優先。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ホームエレベーター】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「維持費（メンテナンス契約）」の重さ</h4>
          
          <p className="mb-1 text-xs ml-3">
            設置費用（300万〜）だけでなく、法的に義務付けられた定期点検費用が年間5万〜10万円程度かかる（メーカーによる）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            導入時はランニングコストの説明を徹底しないと、「こんなにかかるとは思わなかった」と後悔される設備No.1。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">リフォームしやすい「ピットレス（浅型）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            通常のエレベーターは、最下階の床下に深い穴（ピット）を掘る必要があるが、基礎のコンクリートが邪魔で掘れないことが多い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: ピット深さが浅い（200mm程度）<strong>「ピットレスタイプ」</strong>などを選定すれば、大規模な基礎工事なしで設置できる可能性がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">停電時の「バッテリー着床装置」</h4>
          
          <p className="mb-1 text-xs ml-3">
            停電すると箱の中に閉じ込められるリスクがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            停電を感知して、自動的にバッテリーで最寄りの階まで移動して扉を開ける<strong>「自動着床装置」</strong>は、災害大国日本では必須のオプション。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【井戸ポンプ】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">砂を噛まない「砂こし器」</h4>
          
          <p className="mb-1 text-xs ml-3">
            井戸水には細かい砂が混じることがあり、ポンプが砂を吸い込むと内部が摩耗してすぐに故障する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ポンプの手前に必ず<strong>「砂こし器（サンドフィルター）」</strong>を設置し、定期的に掃除できる場所に配置するのが施工のセオリー。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「浅井戸」と「深井戸」の境界線</h4>
          
          <p className="mb-1 text-xs ml-3">
            水面までの深さが7〜8mを超えると、普通のポンプ（浅井戸用）では吸い上げられなくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            深い場合は、管の中にジェット部を投入する「深井戸用（ジェットポンプ）」や「水中ポンプ」が必要になり、機器代と工事費が跳ね上がる。
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
      case '水栓':
        return renderWaterFaucetCategory();
      case '衛生機器':
        return renderSanitaryCategory();
      case '住宅設備':
        return renderResidentialEquipmentCategory();
      case 'キッチン':
        return renderKitchenCategory();
      case '空調機':
        return renderAirConditioningCategory();
      case '機械設備その他':
        return renderOtherCategory();
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

export default MechanicalSystemsContent; 