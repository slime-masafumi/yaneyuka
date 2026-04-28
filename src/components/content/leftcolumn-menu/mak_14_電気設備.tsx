import React, { useState } from 'react';

interface ElectricalSystemsContentProps {
  subcategory: string;
  onNavigateToRegistration?: () => void;
}

const ElectricalSystemsContent: React.FC<ElectricalSystemsContentProps> = ({ subcategory, onNavigateToRegistration }) => {
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
        {/* カード内のCTAは削除（見出し右に配置） */}
      <img
        src={imageErrors['commercial'] ? '/image/ChatGPT Image 2025年5月1日 16_25_41.webp' : 'image/ChatGPT Image 2025年5月1日 16_25_41.webp'}
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

  const renderLightingCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">照明</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【光の質（スペック）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">料理が不味く見える「Ra（演色性）」の低さ</h4>
          
          <p className="mb-1 text-xs ml-3">
            光が当たった時の色の見え方を示す数値（Ra100が太陽光）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            基準: 一般的なオフィスや住宅はRa80程度だが、ダイニングや洗面所（メイク）でこれを採用すると、肌がくすんで見えたり、料理が不味そうに見えたりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 食卓や鏡の前では、<strong>「Ra90以上（高演色）」</strong>の照明器具を選ぶのが、豊かな生活を送るためのプロのセオリー。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「色温度（ケルビン）」のミックス禁止</h4>
          
          <p className="mb-1 text-xs ml-3">
            電球色（オレンジ）、温白色（中間）、昼白色（白）を同じ部屋で混ぜると、非常に落ち着かない空間になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            LDKがつながっている場合、エリアごとに色を変えるなら、調光調色機能を使って<strong>「シーンに合わせて色を統一」</strong>できるように回路設計する必要がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ダウンライト】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「交換型」と「一体型」の10年後の明暗</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>一体型</strong>: LEDチップが器具に内蔵されている。安価でデザインが薄くスッキリしているが、球切れした際は<strong>「電気工事士による器具ごとの交換工事」</strong>が必要になる。</li>
            <li><span className="mr-1">・</span><strong>交換型</strong>: 電球だけを変えられる。初期費用は高いが、球切れ時は自分で電球を買ってきて変えるだけ。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            吹き抜けや高天井など、足場がないと工事できない場所に「一体型」を採用すると、将来の交換コストが数十万円になるリスクがある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">眩しさを消す「グレアレス」</h4>
          
          <p className="mb-1 text-xs ml-3">
            通常のダウンライトは、光源が目に入りやすく眩しい（グレア）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 光源位置を奥深く設定した<strong>「グレアレス（深型）ダウンライト」</strong>を選ぶと、真下に行かないと光が見えないため、ホテルライクな高級感と落ち着きが出る。寝室やリビングに最適。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【間接照明（建築化照明）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">失敗あるある「LEDの粒々（ドット）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            建築の隙間にLEDテープを隠して光らせる手法（コーブ・コーニス照明）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            注意点: 安価なLEDテープを使うと、光が線にならず「粒々（ドット）」が壁に映り込んでしまい、安っぽくなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必ず<strong>「シームレス（継ぎ目なし）」</strong>タイプの器具を選ぶか、光源が見えないように「アゴ（幕板）」の寸法を緻密に計算する必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「壁の不陸（ふりく）」を照らし出すリスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            壁際から光を当てる間接照明（コーニス照明）は、壁紙の継ぎ目や、下地のわずかな凹凸を強烈な影として浮かび上がらせてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            この照明を採用する場合、壁の仕上げはクロスではなく、平滑性の高いパネルや塗装、あるいは凹凸が気にならないタイルなどを選定するのが鉄則。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【外部照明（エクステリア）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">近隣トラブルになる「光害（ひかりがい）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            防犯ライトやアプローチ灯が、隣家の寝室やリビングを照らしてしまうトラブルが多い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            遮光フード: 光の広がりをカットするフード付きの器具や、下方向のみを照らす足元灯を選び、敷地外に光を漏らさない配慮（スパイクライトの角度調整など）が不可欠。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">虫を寄せ付けない「波長」</h4>
          
          <p className="mb-1 text-xs ml-3">
            玄関ポーチに普通の蛍光灯や古いLEDをつけると、夏場は虫だらけになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            虫は紫外線に集まる習性があるため、紫外線領域をカットした<strong>「低誘虫（ていゆうちゅう）LED」</strong>を選ぶことで、掃除の手間を劇的に減らせる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【調光（ちょうこう）システムの相性】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「チラつき」の原因</h4>
          
          <p className="mb-1 text-xs ml-3">
            LEDを調光（明るさを絞る）する場合、調光器（スイッチ）と照明器具の相性が悪いと、低照度でチカチカ点滅したり、ブーンという異音がしたりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: 必ず照明メーカーが指定する<strong>「適合調光器」</strong>を使用すること。特に、ダウンライトとペンダントライトを同じスイッチで調光する場合、それぞれの電気特性（位相制御方式など）を合わせないと不具合が起きる。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('パナソニック', {
          products: 'https://panasonic.jp/light/products.html',
          catalog: 'https://esctlg.panasonic.biz/iportal/CatalogSearch.do?method=catalogSearchByAnyCategories&volumeID=PEWJ0001&categoryID=352920000&designID=',
          office: '#',
          contact: 'https://www2.panasonic.biz/jp/support/?_gl=1*smahuz*_gcl_au*MTc1NDU0NDE0NS4xNzQzMzg1MDkx#tabPurp'
        })}
        {renderCompanyRow('オーデリック', {
          products: 'https://www.odelic.co.jp/products/',
          catalog: 'https://www.odelic.co.jp/webcatalog/',
          office: 'https://www.odelic.co.jp/showroom/reserve.html#acs',
          contact: 'https://www.odelic.co.jp/search/DispContact.do'
        })}
        {renderCompanyRow('コイズミ照明', {
          products: 'https://www.koizumi-lt.co.jp/l-design/',
          catalog: 'https://webcatalog.koizumi-lt.co.jp/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=DIGICATA&catalogId=8642230000&pageGroupId=1&catalogCategoryId=',
          office: 'https://www.koizumi-lt.co.jp/company/office.html',
          contact: 'https://www.koizumi-lt.co.jp/support/'
        })}
        {renderCompanyRow('大光電機', {
          products: 'https://www2.lighting-daiko.co.jp/led_products/',
          catalog: 'https://src.lighting-daiko.co.jp/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=DIK00003&designID=DKDDPC01',
          office: 'https://www2.lighting-daiko.co.jp/showroom/',
          contact: 'https://www2.lighting-daiko.co.jp/support/repair/'
        })}
        {renderCompanyRow('ヤマギワ', {
          products: 'https://www.yamagiwa.co.jp/products/#categories-search',
          catalog: 'https://www.yamagiwa.co.jp/products/#catalog-download',
          office: 'https://www.yamagiwa.co.jp/access/#company_address',
          contact: 'https://www.yamagiwa.co.jp/contact/'
        })}
        {renderCompanyRow('DNライティング', {
          products: 'https://www.dnlighting.co.jp/product/indoor_lighting.html',
          catalog: 'https://www.dnlighting.co.jp/catalog.html',
          office: 'https://www.dnlighting.co.jp/company/access.html',
          contact: 'https://www.dnlighting.co.jp/contact.html'
        })}
        {renderCompanyRow('遠藤照明', {
          products: 'https://www.endo-lighting.co.jp/products/facility/',
          catalog: 'https://www.endo-lighting.co.jp/products/catalog/#catalog',
          office: 'https://www.endo-lighting.co.jp/showroom/',
          contact: 'https://www.endo-lighting.co.jp/support/'
        })}
        {renderCompanyRow('岩崎電気', {
          products: 'https://www.iwasaki.co.jp/lighting/',
          catalog: 'https://www.iwasaki.co.jp/contact/request/',
          office: 'https://www.iwasaki.co.jp/corporate/showroom/',
          contact: 'https://www.iwasaki.co.jp/contact/inquiry/'
        })}
        {renderCompanyRow('ｷｬﾝｴﾝﾀｰﾌﾟﾗｲｾﾞｽﾞ', {
          products: 'https://www.can-net.co.jp/product/lights',
          catalog: 'https://www.can-net.co.jp/sample-order',
          office: 'https://www.can-net.co.jp/company',
          contact: 'https://www.can-net.co.jp/contact'
        })}
        {renderCompanyRow('山田照明', {
          products: 'https://www.yamada-shomei.co.jp/products/',
          catalog: 'https://www.yamada-shomei.co.jp/catalog/',
          office: 'https://www.yamada-shomei.co.jp/company/office/',
          contact: 'https://www.yamada-shomei.co.jp/inquiry/'
        })}
        {renderCompanyRow('ルミナベッラ', {
          products: 'https://www.luminabella.jp/product/',
          catalog: 'https://www.luminabella.jp/catalogue/',
          office: 'https://www.luminabella.jp/showroom/',
          contact: 'https://www.luminabella.jp/contact/'
        })}
        {renderCompanyRow('ディクラッセ', {
          products: 'https://www.di-classe-onlineshop.com/view/category/all_items',
          catalog: '#',
          office: 'https://www.lux.di-classe.com/',
          contact: 'https://www.di-classe.com/contact.html'
        })}
        {renderCompanyRow('シバサキ', {
          products: 'https://led.shibasaki-inc.jp/product/interior/',
          catalog: 'https://led.shibasaki-inc.jp/catalog_dl/',
          office: 'https://led.shibasaki-inc.jp/access/',
          contact: 'https://led.shibasaki-inc.jp/contact/'
        })}
        {renderCompanyRow('上手工作所', {
          products: 'https://www.jo-zu-works.com/view/category/ct4',
          catalog: '#',
          office: 'https://www.jo-zu-works.com/view/page/company',
          contact: 'https://www.jo-zu-works.com/ssl/contact/'
        })}
        {renderCompanyRow('睦屋', {
          products: 'https://www.mutsumi-ya.com/brand/cat5.html',
          catalog: '#',
          office: 'https://www.mutsumi-ya.com/showroom/',
          contact: 'https://www.mutsumi-ya.com/contact/'
        })}
        {renderCompanyRow('ie-mon', {
          products: 'https://www.ie-mon-asia.net/online-shop_category/shop-light/',
          catalog: 'https://www.ie-mon-asia.net/catalog/',
          office: 'https://www.ie-mon-asia.net/company/',
          contact: 'https://www.ie-mon-asia.net/request/'
        })}
      </div>
    </div>
  );

  const renderExteriorLightingCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">外構照明</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【100Vと12V（ローボルト）の決定的な差】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「漏電（ろうでん）」リスクと資格</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>100V（通常電圧）</strong>: 明るいが、配線が地中で傷つくと漏電し、家のブレーカーが落ちる。施工には電気工事士の資格と、深い埋設配管が必要。</li>
            <li><span className="mr-1">・</span><strong>12V（ローボルト）</strong>: トランスで電圧を下げているため、万が一配線が切れても感電や漏電のリスクが極めて低い。</li>
          </ul>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 資格が不要なため造園職人が施工でき、植栽の成長に合わせてライトの位置を微調整できる「可動性」があるため、現在のガーデンライティングの主流。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「電圧降下」による照度不足</h4>
          
          <p className="mb-1 text-xs ml-3">
            12Vシステムは、電線を長く伸ばしすぎると末端で電圧が下がり、ライトが暗くなる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            設計時にケーブルの太さと距離、ライトの個数を計算し、適切なトランス容量を選定しないと失敗する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【光害（ひかりがい）・グレア対策】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「隣家の窓」を照らさないマナー</h4>
          
          <p className="mb-1 text-xs ml-3">
            樹木をライトアップ（アップライト）する際、光の角度を間違えると、隣家の2階の寝室やリビングを直撃し、深刻な近隣トラブルになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 光の広がりを抑える<strong>「フード（遮光カバー）」</strong>付きの器具を選ぶか、スパイク（地面に刺す）式で角度調整が容易なタイプを選び、設置後の微調整を行うことが不可欠。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">歩行者の目を眩ませない「グレアカット」</h4>
          
          <p className="mb-1 text-xs ml-3">
            アプローチ灯で、光源が直接目に入ると眩しくて足元が見えなくなる（グレア）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 光源が隠れている<strong>「グレアレス構造」</strong>のポールライトや、足元だけを照らすフットライトを選定し、安全な動線を確保する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【地中埋込ライト（グランドライト）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">水没による「故障」と排水処理</h4>
          
          <p className="mb-1 text-xs ml-3">
            地面に埋め込むライトは、大雨の時に水没しやすい。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            「防水仕様」であっても、常に水に浸かっていると内部結露でショートする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: 器具の下に必ず<strong>「砕石（さいせき）」</strong>を深く入れて浸透層を作り、水が器具の周りに溜まらないような排水処理を施すのが施工の絶対条件。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">表面温度と「火傷（やけど）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            ハロゲンや古いLEDの埋込ライトは、表面ガラスが高温になり、子供やペットが触れると火傷する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            樹脂製のガードが付いたものや、熱を持たない低出力LEDを選ぶ配慮が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【センサーとスイッチの計画】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「EEスイッチ（明暗センサー）」の設置位置</h4>
          
          <p className="mb-1 text-xs ml-3">
            暗くなると自動点灯するセンサー。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            失敗例: 自分の照明器具の光が当たる場所や、車のヘッドライトが当たる場所にセンサーを設置すると、「点いては消える」を繰り返す<strong>「点滅現象（ハンチング）」</strong>が起きる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            光の影響を受けない場所への設置計画が重要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「人感センサー」の検知範囲</h4>
          
          <p className="mb-1 text-xs ml-3">
            人が近づくと点灯するセンサー（防犯用など）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            道路を歩く人や、揺れる植栽に反応してしまうと、一晩中チカチカして近所迷惑になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            エリアマスク: 検知したくない方向を遮蔽できるカバー（エリアマスク）が付属している製品を選び、敷地内だけに反応するよう調整する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【素材の経年変化（エイジング）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「真鍮（しんちゅう）」の変色</h4>
          
          <p className="mb-1 text-xs ml-3">
            マリンランプなどで人気の真鍮製ライト。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            最初は金色だが、屋外の雨風に晒されると数ヶ月で渋い茶褐色（アンティーク色）に変色し、最終的には緑青（ろくしょう）が出る。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これを「劣化」と捉える施主には、変色しない塗装品やステンレス製を提案すべき。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('DNライティング', {
          products: 'https://www.dnlighting.co.jp/product/outdoor_lighting.html',
          catalog: 'https://www.dnlighting.co.jp/catalog.html',
          office: 'https://www.dnlighting.co.jp/company/access.html',
          contact: 'https://www.dnlighting.co.jp/contact.html'
        })}
        {renderCompanyRow('遠藤照明', {
          products: 'https://www.endo-lighting.co.jp/products/facility/outdoor/',
          catalog: 'https://www.endo-lighting.co.jp/products/catalog/#catalog',
          office: 'https://www.endo-lighting.co.jp/showroom/',
          contact: 'https://www.endo-lighting.co.jp/support/'
        })}
        {renderCompanyRow('岩崎電気', {
          products: 'https://www.iwasaki.co.jp/lighting/',
          catalog: 'https://www.iwasaki.co.jp/contact/request/',
          office: 'https://www.iwasaki.co.jp/corporate/showroom/',
          contact: 'https://www.iwasaki.co.jp/contact/inquiry/'
        })}
        {renderCompanyRow('タカショー', {
          products: 'https://takasho-digitec.jp/lighting/product/',
          catalog: 'https://takasho-digitec.jp/ctlg/',
          office: 'https://takasho-digitec.jp/about/info/',
          contact: 'https://takasho-digitec.jp/gems/contact/'
        })}
        {renderCompanyRow('山田照明', {
          products: 'https://www.yamada-shomei.co.jp/products/',
          catalog: 'https://www.yamada-shomei.co.jp/catalog/',
          office: 'https://www.yamada-shomei.co.jp/company/office/',
          contact: 'https://www.yamada-shomei.co.jp/inquiry/'
        })}
        {renderCompanyRow('LIXIL', {
          products: 'https://www.lixil.co.jp/lineup/gate_fence/exterior_light/',
          catalog: 'https://webcatalog.lixil.co.jp/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&catalogId=17010670000&pageGroupId=361&volumeID=LXL13001&designID=newinter&pagePosition=L',
          office: 'https://www.lixil.co.jp/showroom/',
          contact: 'https://www.lixil.co.jp/support/?_gl=1*vbpak9*_gcl_au*NjI4NTkzNjY2LjE3NDMzOTY5MzI.*_ga*MTYwNjUxMDY5NC4xNzQzMzk2OTMx*_ga_L1RLBQ788C*MTc0MzM5NjkzMS4xLjEuMTc0MzM5NzA5OC40My4wLjA.*_ga_81CGHJ6TE8*MTc0MzM5Njg5My4zLjEuMTc0MzM5NzA5OC4yLjAuMA..'
        })}
        {renderCompanyRow('パナソニック', {
          products: 'https://www2.panasonic.biz/jp/lighting/home/exterior/',
          catalog: 'https://esctlg.panasonic.biz/iportal/CatalogSearch.do?method=catalogSearchByAnyCategories&volumeID=PEWJ0001&categoryID=352950000&designID=',
          office: '#',
          contact: 'https://www2.panasonic.biz/jp/support/?_gl=1*smahuz*_gcl_au*MTc1NDU0NDE0NS4xNzQzMzg1MDkx#tabPurp'
        })}
        {renderCompanyRow('大光電機', {
          products: 'https://www2.lighting-daiko.co.jp/led_products/',
          catalog: 'https://src.lighting-daiko.co.jp/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=DIK00003&designID=DKDDPC01',
          office: 'https://www2.lighting-daiko.co.jp/showroom/',
          contact: 'https://www2.lighting-daiko.co.jp/support/repair/'
        })}
        {renderCompanyRow('シバサキ', {
          products: 'https://led.shibasaki-inc.jp/product/exterior/',
          catalog: 'https://led.shibasaki-inc.jp/catalog_dl/',
          office: 'https://led.shibasaki-inc.jp/access/',
          contact: 'https://led.shibasaki-inc.jp/contact/'
        })}
        {renderCompanyRow('上手工作所', {
          products: 'https://www.jo-zu-works.com/view/category/ct25',
          catalog: '#',
          office: 'https://www.jo-zu-works.com/view/page/company',
          contact: 'https://www.jo-zu-works.com/ssl/contact/'
        })}
        {renderCompanyRow('ﾄｰｼﾝｺｰﾎﾟﾚｰｼｮﾝ', {
          products: 'https://www.toshin-grc.co.jp/business/exterior/lineup/light/',
          catalog: 'https://www.toshin-grc.co.jp/catalog/web/',
          office: 'https://www.toshin-grc.co.jp/profile/branch/',
          contact: 'https://www.toshin-grc.co.jp/contact/'
        })}
        {renderCompanyRow('ﾏﾁﾀﾞｺｰﾎﾟﾚｰｼｮﾝ', {
          products: 'http://www.machidacorp.co.jp/product_i/c07/',
          catalog: 'http://www.machidacorp.co.jp/catalogue_s/',
          office: 'http://www.machidacorp.co.jp/profile/branch/',
          contact: 'https://www.machidacorp.co.jp/contact/total_support/'
        })}
        {renderCompanyRow('ユニソン', {
          products: 'https://www.unison-net.com/gardenexterior/product/?s=&cate=128',
          catalog: 'https://www.unison-net.com/webcatalog/',
          office: 'https://www.unison-net.com/company/location/',
          contact: 'https://www.unison-net.com/contact_top/'
        })}
        {renderCompanyRow('御田製作所', {
          products: 'https://ondairon.com/product/?se=category&mv=light',
          catalog: 'https://ondairon.com/stagedemo/wp-content/themes/original/pdf/results2019.pdf',
          office: 'https://ondairon.com/showroom/#AccessMap',
          contact: 'https://ondairon.com/contact/#id03'
        })}
        {renderCompanyRow('ie-mon', {
          products: 'https://www.ie-mon-asia.net/online-shop_category/outdoor-lighting/',
          catalog: 'https://www.ie-mon-asia.net/catalog/',
          office: 'https://www.ie-mon-asia.net/company/',
          contact: 'https://www.ie-mon-asia.net/request/'
        })}
      </div>
    </div>
  );

  const renderSwitchConsentCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">SW・コンセント</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【スイッチの機能と種類】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ホタル」と「パイロット」の決定的な違い</h4>
          
          <p className="mb-1 text-xs ml-3">
            スイッチにはランプが点くものがあるが、機能が逆なので混同厳禁。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ホタルスイッチ</strong>: OFFの時に光る。暗闇でスイッチの場所を知らせるため、トイレや玄関、寝室に採用する。</li>
            <li><span className="mr-1">・</span><strong>パイロットスイッチ</strong>: ONの時に赤く光る。換気扇や外部照明など、消し忘れ防止のために採用する。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            ※両方の機能を兼ねた「パイロット・ホタルスイッチ」もある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「3路（さんろ）」と「4路（よんろ）」の動線計画</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>3路スイッチ</strong>: 階段の上と下など、2箇所でON/OFFできる回路。</li>
            <li><span className="mr-1">・</span><strong>4路スイッチ</strong>: 3箇所以上でON/OFFできる回路。広いLDKや長い廊下で採用される。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            失敗例: 動線を考えずに単独スイッチにしてしまい、「暗い中を歩いて消しに行かなければならない」という事態は設計ミス。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【デザインスイッチのトレンド】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">建築家が愛する「JIMBO（神保電器）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            NKシリーズ: 角がピン角でマットな質感。無駄を削ぎ落としたミニマルなデザインで、建築家やデザイナーズ住宅での採用率が圧倒的に高い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            ただし、Panasonic製に比べて価格が高く、施工の手間も少しかかる（専用プレートが必要）ため、見積もり調整の対象になりやすい。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">Panasonicの対抗馬「SO-STYLE（ソー・スタイル）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            JIMBOの人気に対抗して開発された、マットで直角なシリーズ。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            従来のコスモシリーズ（ワイドスイッチ）と同じボックスで施工できるため、リフォームでの導入ハードルが低いのがメリット。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【スマートスイッチ（IoT）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">リフォーム時の「中性線（N線）」欠如問題</h4>
          
          <p className="mb-1 text-xs ml-3">
            スマホや音声で操作できるスマートスイッチを導入したいという要望が増えている。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            落とし穴: 一般的なスイッチ配線は「電源線」と「負荷線」の2本だけだが、スマートスイッチはスイッチ自体が電気を消費するため、もう一本<strong>「中性線（アース側電線）」</strong>が必要な製品が多い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            既存の壁内配線には中性線が来ていないことが多く、壁を壊して配線をやり直さないと設置できないケースが多発する。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【コンセントの機能と配置】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">高気密住宅の必須部材「気密（きみつ）カバー」</h4>
          
          <p className="mb-1 text-xs ml-3">
            コンセントボックスは壁に穴を開けて設置するため、そこから隙間風が入ったり、壁内結露の原因になったりする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 高気密高断熱住宅では、コンセントボックスを樹脂製の<strong>「気密カバー（バリアーボックス）」</strong>で覆い、気密テープで処理しないと、断熱性能が台無しになる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「アース付き」の標準化</h4>
          
          <p className="mb-1 text-xs ml-3">
            以前は洗濯機や冷蔵庫、トイレだけだったが、現在は電子レンジ、食洗機、PCなどアースが必要な家電が増えた。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            リフォームや新築時は、キッチンや書斎のコンセントを全て<strong>「3ピン対応（接地極付）」</strong>にしておくと、変換アダプタが不要になり見た目もスッキリする。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「USBコンセント」の定格出力</h4>
          
          <p className="mb-1 text-xs ml-3">
            壁に直接USBケーブルを挿せるコンセント。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            注意点: 「Type-A」か「Type-C」かだけでなく、<strong>「ワット数（W数）」</strong>が重要。古い設計のUSBコンセントは出力が低く（2A程度）、タブレットや最新スマホの充電が遅い、あるいは充電できないことがある。最新のPD（Power Delivery）対応品を選ぶべき。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【マルチメディアコンセント】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「LAN配線」のカテゴリー</h4>
          
          <p className="mb-1 text-xs ml-3">
            インターネット用のLANケーブルを壁内に通す場合、ケーブルの規格（CAT5e, CAT6, CAT6A）で通信速度の上限が決まる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            推奨: 後から交換するのは困難なため、新築・改修時は10Gbps対応の<strong>「CAT6A（カテゴリー6A）」</strong>以上を指定しておくのが、将来を見据えたプロの選択。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('ｺﾞｰﾘｷｱｲﾗﾝﾄﾞ', {
          products: 'https://www.brass.co.jp/item_list/04601/',
          catalog: 'https://www.gorikiisland.jp/download/',
          office: 'https://www.brass.co.jp/sub/company/',
          contact: 'https://www.brass.co.jp/inq/'
        })}
        {renderCompanyRow('パナソニック', {
          products: 'https://www2.panasonic.biz/jp/densetsu/',
          catalog: 'https://esctlg.panasonic.biz/iportal/CatalogSearch.do?method=catalogSearchByAnyCategories&volumeID=PEWJ0001&categoryID=352970000&designID=&_ga=2.127524749.1053640670.1746776720-2106627852.1743048702',
          office: '#',
          contact: 'https://www2.panasonic.biz/jp/support/call/'
        })}
        {renderCompanyRow('スガツネ工業', {
          products: 'https://search.sugatsune.co.jp/product/arch/c/c2016/',
          catalog: 'https://digital-book.sugatsune.com/iportal/CatalogSearch.do?method=catalogSearchByDefaultSettingCategories&volumeID=SGT00001&designID=ARCH',
          office: 'https://www.sugatsune.co.jp/corporate/office/',
          contact: 'https://search.sugatsune.co.jp/product/contact/contact.aspx'
        })}
        {renderCompanyRow('東芝ライテック', {
          products: 'https://www.tlt.co.jp/tlt/products/',
          catalog: '#',
          office: 'https://www.tlt.co.jp/tlt/company/base/',
          contact: 'https://www.tlt.co.jp/tlt/contact/'
        })}
        {renderCompanyRow('岩崎電気', {
          products: 'https://www.iwasaki.co.jp/lighting/products/',
          catalog: '#',
          office: 'https://www.iwasaki.co.jp/company/base/',
          contact: 'https://www.iwasaki.co.jp/contact/'
        })}
      </div>
    </div>
  );

  const renderGeneratorCategory = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">発電機</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【燃料種別と「備蓄」の課題】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">ディーゼル（軽油・重油）の「燃料劣化」</h4>
          
          <p className="mb-1 text-xs ml-3">
            最も一般的で馬力があるが、タンク内の軽油は経年で酸化し、ドロドロの<strong>「スラッジ（沈殿物）」</strong>が発生する。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            リスク: いざ動かそうとした時に、スラッジがフィルターを詰まらせてエンジンが停止する事故が多い。定期的な燃料交換や、バクテリア除去などのメンテナンスコストがかかる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">LPガス・都市ガスの「供給途絶」リスク</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>都市ガス</strong>: 燃料劣化がなく、配管供給なので補充の手間がない。しかし、大地震でガス管が遮断されると稼働できなくなる。</li>
            <li><span className="mr-1">・</span><strong>LPガス（プロパン）</strong>： ボンベがあれば動くため災害に強い（分散型エネルギー）。ただし、ボンベの保管場所と交換ルートの確保が必要。</li>
          </ul>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【容量選定の落とし穴】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「始動電流（突入電流）」の計算</h4>
          
          <p className="mb-1 text-xs ml-3">
            発電機で動かしたい機器に「モーター（ポンプ、エレベーター、業務用エアコン）」が含まれる場合、定格消費電力の合計だけで選ぶと失敗する。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            鉄則: モーターは動き出す瞬間に、定格の5倍〜8倍もの電流（始動電流）を必要とする。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            この瞬間の負荷に耐えられる容量を選定しないと、起動した瞬間にブレーカーが落ちてブラックアウトする。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【設置環境と「給排気」】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ショートサーキット」によるオーバーヒート</h4>
          
          <p className="mb-1 text-xs ml-3">
            発電機はエンジンの冷却と燃焼のために、猛烈な量の空気を吸い込み、熱風を吐き出す。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            狭い場所や、給気口と排気口が近い場所に設置すると、吐き出した熱風をまた吸い込んでしまう「ショートサーキット」が起き、数分でオーバーヒートして停止する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: 機械室のガラリ面積計算と、排気ダクトの向き（近隣への排ガス考慮）が設計の要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「騒音・振動」の近隣トラブル</h4>
          
          <p className="mb-1 text-xs ml-3">
            非常用とはいえ、夜間に稼働するとディーゼルエンジンの轟音と振動は凄まじい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            住宅地に近い場合は、防音ボックス付きの<strong>「超低騒音型」</strong>を指定し、架台には防振ゴムを噛ませる配慮が不可欠。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【メンテナンスの法定義務】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">最大の故障原因「始動用バッテリー」</h4>
          
          <p className="mb-1 text-xs ml-3">
            非常用発電機が動かない原因のNo.1は、エンジンを掛けるための<strong>「鉛バッテリーの寿命（バッテリー上がり）」</strong>。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            自動車と同じで、数年放置すると放電して死ぬ。自動充電器が正常か、バッテリー液が減っていないかの点検が命綱。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「負荷試験（ふかしけん）」の義務化</h4>
          
          <p className="mb-1 text-xs ml-3">
            消防法により、定期的に実際に負荷（電気）をかけて運転する試験が義務付けられている。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            内部カーボン: 無負荷（アイドリング）運転ばかりしていると、エンジン内部に煤（カーボン）が溜まり、故障の原因になる（ウエットスタッキング現象）。30%以上の負荷をかけて煤を焼き切るメンテナンスが必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【インバーター発電機（可搬・家庭用）】</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「正弦波（せいげんは）」でないとPCが壊れる</h4>
          
          <p className="mb-1 text-xs ml-3">
            工事現場用の安価な発電機は、電気の波形がカクカクしている（矩形波）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            必須: パソコンやスマホ、マイコン制御の家電（給湯器やファンヒーター）を動かす場合は、家庭用コンセントと同じ滑らかな波形を作る<strong>「インバーター搭載モデル（正弦波）」</strong>を使わないと、電子機器が故障する。
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>

      {renderCompanyRow('パナソニック', {
        products: 'https://www2.panasonic.biz/jp/lighting/',
        catalog: 'https://www2.panasonic.biz/jp/catalog/',
        office: 'https://www2.panasonic.biz/jp/company/',
        contact: 'https://www2.panasonic.biz/jp/contact/'
      })}
      {renderCompanyRow('コイズミ照明', {
        products: 'https://www.koizumi-lt.co.jp/product/',
        catalog: 'https://www.koizumi-lt.co.jp/catalog/',
        office: 'https://www.koizumi-lt.co.jp/company/',
        contact: 'https://www.koizumi-lt.co.jp/contact/'
      })}
      {renderCompanyRow('大光電機', {
        products: 'https://www.lighting-daiko.co.jp/product/',
        catalog: 'https://www.lighting-daiko.co.jp/catalog/',
        office: 'https://www.lighting-daiko.co.jp/company/base/',
        contact: 'https://www.lighting-daiko.co.jp/contact/'
      })}
      {renderCompanyRow('オーデリック', {
        products: 'https://www.odelic.co.jp/products/',
        catalog: 'https://www.odelic.co.jp/catalog/',
        office: 'https://www.odelic.co.jp/company/',
        contact: 'https://www.odelic.co.jp/contact/'
      })}
      {renderCompanyRow('遠藤照明', {
        products: 'https://www.endo-lighting.co.jp/products/',
        catalog: '#',
        office: 'https://www.endo-lighting.co.jp/company/base/',
        contact: 'https://www.endo-lighting.co.jp/contact/'
      })}
      {renderCompanyRow('東芝ライテック', {
        products: 'https://www.tlt.co.jp/tlt/products/',
        catalog: '#',
        office: 'https://www.tlt.co.jp/tlt/company/base/',
        contact: 'https://www.tlt.co.jp/tlt/contact/'
      })}
      {renderCompanyRow('岩崎電気', {
        products: 'https://www.iwasaki.co.jp/lighting/products/',
        catalog: '#',
        office: 'https://www.iwasaki.co.jp/company/base/',
        contact: 'https://www.iwasaki.co.jp/contact/'
      })}
    </div>
  );

  const renderGenericCategory = (title: string) => (
    <div>
      {renderHeader(title)}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecruitmentCard()}
      </div>
      <div className="mt-4">
        {renderCompanyRow('パナソニック', {
          products: 'https://www2.panasonic.biz/jp/lighting/',
          catalog: 'https://www2.panasonic.biz/jp/catalog/',
          office: 'https://www2.panasonic.biz/jp/company/',
          contact: 'https://www2.panasonic.biz/jp/contact/'
        })}
        {renderCompanyRow('コイズミ照明', {
          products: 'https://www.koizumi-lt.co.jp/product/',
          catalog: 'https://www.koizumi-lt.co.jp/catalog/',
          office: 'https://www.koizumi-lt.co.jp/company/',
          contact: 'https://www.koizumi-lt.co.jp/contact/'
        })}
        {renderCompanyRow('大光電機', {
          products: 'https://www.lighting-daiko.co.jp/product/',
          catalog: 'https://www.lighting-daiko.co.jp/catalog/',
          office: 'https://www.lighting-daiko.co.jp/company/base/',
          contact: 'https://www.lighting-daiko.co.jp/contact/'
        })}
        {renderCompanyRow('オーデリック', {
          products: 'https://www.odelic.co.jp/products/',
          catalog: 'https://www.odelic.co.jp/catalog/',
          office: 'https://www.odelic.co.jp/company/',
          contact: 'https://www.odelic.co.jp/contact/'
        })}
        {renderCompanyRow('遠藤照明', {
          products: 'https://www.endo-lighting.co.jp/products/',
          catalog: '#',
          office: 'https://www.endo-lighting.co.jp/company/base/',
          contact: 'https://www.endo-lighting.co.jp/contact/'
        })}
        {renderCompanyRow('東芝ライテック', {
          products: 'https://www.tlt.co.jp/tlt/products/',
          catalog: '#',
          office: 'https://www.tlt.co.jp/tlt/company/base/',
          contact: 'https://www.tlt.co.jp/tlt/contact/'
        })}
        {renderCompanyRow('岩崎電気', {
          products: 'https://www.iwasaki.co.jp/lighting/products/',
          catalog: '#',
          office: 'https://www.iwasaki.co.jp/company/base/',
          contact: 'https://www.iwasaki.co.jp/contact/'
        })}
      </div>
    </div>
  );

  switch (subcategory) {
    case '照明':
      return renderLightingCategory();
    case '外構照明':
      return renderExteriorLightingCategory();
    case 'スイッチコンセント':
      return renderSwitchConsentCategory();
    case '発電機':
      return renderGeneratorCategory();
    case '電気設備その他':
      return renderGenericCategory('電気設備 その他');
    default:
      return null;
  }
};

export default ElectricalSystemsContent; 