import React, { useState } from 'react';

interface InternalCeilingContentProps {
  subcategory: string;
}

const InternalCeilingContent: React.FC<InternalCeilingContentProps> = ({ subcategory }) => {
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
        src="/image/掲載募集中a.png" 
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
        src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" 
        alt="Manufacturer Commercial" 
        className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]"
        onError={() => handleImageError('commercial')}
      />
    </div>
  );

  const renderBoard = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装天井 ボード</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【石膏（せっこう）ボード（プラスターボード）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「9.5mm」と「12.5mm」の使い分け</h4>
          
          <p className="mb-1 text-xs ml-3">
            天井用石膏ボードの厚さは9.5mmが一般的（壁は12.5mm）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            プロの視点: 9.5mmは軽量だが、下地の間隔が広いと自重で<strong>「波打ち（たわみ）」</strong>が発生しやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            高級住宅や、ペンダントライト等の荷重がかかる天井では、壁と同じ12.5mmを採用するか、9.5mmを2枚重ね張り（二重貼り）して強度と遮音性を高めるのが良心的な設計。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ジプトーン」は仕上げ材</h4>
          
          <p className="mb-1 text-xs ml-3">
            石膏ボードの表面に、虫食いのような穴（トラバーチン模様）の化粧加工をしたもの。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            特徴: クロス貼りが不要で、ビスで留めるだけで仕上がるため、学校、病院、スーパー、ローコストな事務所で圧倒的に使われる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            「安っぽい」と言われがちだが、コストパフォーマンスとメンテナンス性（張り替えの容易さ）は最強。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">水回りの「耐水（たいすい）ボード」</h4>
          
          <p className="mb-1 text-xs ml-3">
            普通の石膏ボードは湿気を含むと強度が落ち、カビの温床になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            脱衣所や厨房の天井下地には、防水加工された<strong>「シージングボード（両面防水ボード）」</strong>を使用しないと、数年で天井が落ちてくるリスクがある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ロックウール吸音板（岩綿吸音板）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ソーラトン」は代名詞</h4>
          
          <p className="mb-1 text-xs ml-3">
            ロックウール（岩石繊維）を圧縮成形したボード。吉野石膏の「ソーラトン」や大建工業の「ダイロートン」が有名。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            特徴: 石膏ボード（ジプトーン）よりも<strong>「吸音性」と「断熱性」</strong>が高く、見た目もマットで高級感があるため、一般的なオフィスビルや会議室の標準仕上げとなっている。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「捨て貼り」か「直貼り」か</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>捨て貼り工法</strong>: 石膏ボードを下地に貼り、その上からロックウール吸音板を貼る。遮音性が高く、防火性能も上がるため、丁寧な仕事とされる。</li>
            <li><span className="mr-1">・</span><strong>直貼り工法</strong>: 軽量鉄骨下地に直接ロックウール吸音板を貼る。コストは下がるが、遮音性は劣る。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">塗装メンテナンスの注意点</h4>
          
          <p className="mb-1 text-xs ml-3">
            汚れた時にペンキで塗りつぶすと、表面の微細な穴が塞がり、吸音性能が失われる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            メンテナンス時は、吸音性を損なわない「吹付け塗装（アコースティック塗装）」を行うか、張り替えを選択する必要がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【システム天井（グリッド天井）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「点検口」が不要な天井</h4>
          
          <p className="mb-1 text-xs ml-3">
            Tバーと呼ばれる格子状のレールを組み、そこに天井パネル（ロックウール板等）を落とし込んでいくだけの工法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            最大のメリット: ビス留めしていないため、どこでもパネルを外して天井裏を点検できる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            配線変更が頻繁なオフィスビルでは、在来工法ではなくシステム天井にすることが、ビル運用コストを下げるための必須条件。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「ライン照明」との一体化</h4>
          
          <p className="mb-1 text-xs ml-3">
            システム天井のグリッドに合わせて、照明器具や空調吹出口がモジュール化されている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            天井面がフラットになり、設備機器が整然と並ぶため、機能美を追求するモダンなオフィスデザインに適している。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ケイカル板（ケイ酸カルシウム板）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「半屋外」の標準材</h4>
          
          <p className="mb-1 text-xs ml-3">
            石膏ボードより硬く、水に強い不燃材。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            用途: 雨のかからない<strong>「軒天（のきてん）」</strong>や、湿気が多い「地下室」、公共トイレの天井などに使われる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            表面が硬く塗装の乗りが良いため、塗装仕上げの天井下地としても優秀。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* 化粧石膏ボード */}
      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">化粧石膏ボード</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・吉野石膏</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://yoshino-gypsum.com/prdt/result?category=%E3%81%9B%E3%81%A3%E3%81%93%E3%81%86%E3%83%9C%E3%83%BC%E3%83%89%E8%A3%BD%E5%93%81/JIS%E8%A6%8F%E6%A0%BC&purpose=%E5%A4%A9%E4%BA%95&function=', '商品ページ')}｜
          {renderLink('https://yoshino-gypsum.com/support/list_catalog#c4', 'カタログ')}｜
          {renderLink('https://yoshino-gypsum.com/cprt/office', '営業所')}｜
          {renderLink('https://yoshino-gypsum.com/support/contact', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・チヨダウーテ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.chiyoda-ute.co.jp/product/circular/gb.html', '商品ページ')}｜
          {renderLink('https://www.chiyoda-ute.co.jp/form_download/', 'カタログ')}｜
          {renderLink('https://www.chiyoda-ute.co.jp/corporate/branch.html', '営業所')}｜
          {renderLink('https://www.chiyoda-ute.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ｴｰｱﾝﾄﾞｴｰﾏﾃﾘｱﾙ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.aa-material.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.catalabo.org/catalog/search/maker/off/3143150000', 'カタログ')}｜
          {renderLink('https://www.aa-material.co.jp/company/branch.html', '営業所')}｜
          {renderLink('https://www.aa-material.co.jp/contact/index.php', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・理研軽金属工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.rfriken.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.rfriken.co.jp/company/', '営業所')}｜
          {renderLink('https://www.rfriken.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・桐井製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kirii.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.kirii.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.kirii.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.kirii.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      {/* 吸音石膏ボード */}
      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">吸音石膏ボード</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・吉野石膏</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://yoshino-gypsum.com/prdt/result?category=%E3%83%AD%E3%83%83%E3%82%AF%E3%82%A6%E3%83%BC%E3%83%AB%E5%8C%96%E7%B2%A7%E5%90%B8%E9%9F%B3%E6%9D%BF', '商品ページ')}｜
          {renderLink('https://yoshino-gypsum.com/support/list_catalog#c4', 'カタログ')}｜
          {renderLink('https://yoshino-gypsum.com/cprt/office', '営業所')}｜
          {renderLink('https://yoshino-gypsum.com/support/contact', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・大建工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.jp/buildingmaterials/ceiling/lineup/dailotone.html', '商品ページ')}｜
          {renderLink('https://www.daiken.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.daiken.jp/about/base/japan.html', '営業所')}｜
          {renderLink('https://faq.daiken.jp/faq/show/948?site_domain=user', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      {/* ロックウール吸音板 */}
      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ロックウール吸音板</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・吉野石膏</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://yoshino-gypsum.com/prdt/result?category=%E3%83%AD%E3%83%83%E3%82%AF%E3%82%A6%E3%83%BC%E3%83%AB%E5%8C%96%E7%B2%A7%E5%90%B8%E9%9F%B3%E6%9D%BF&purpose=%E5%A4%A9%E4%BA%95&function=', '商品ページ')}｜
          {renderLink('https://yoshino-gypsum.com/support/list_catalog#c4', 'カタログ')}｜
          {renderLink('https://yoshino-gypsum.com/cprt/office', '営業所')}｜
          {renderLink('https://yoshino-gypsum.com/support/contact', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・チヨダウーテ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.chiyoda-ute.co.jp/product/cement/#sec-02', '商品ページ')}｜
          {renderLink('https://www.chiyoda-ute.co.jp/form_download/', 'カタログ')}｜
          {renderLink('https://www.chiyoda-ute.co.jp/corporate/branch.html', '営業所')}｜
          {renderLink('https://www.chiyoda-ute.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・大建工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.daiken.jp/buildingmaterials/ceiling/lineup/dailotone.html', '商品ページ')}｜
          {renderLink('https://www.daiken.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.daiken.jp/about/base/japan.html', '営業所')}｜
          {renderLink('https://faq.daiken.jp/faq/show/948?site_domain=user', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderDecorative = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装天井 化粧材</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【木質天井材（羽目板・突き板パネル）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">空間を広く見せる「長手張り（ながてばり）」</h4>
          
          <p className="mb-1 text-xs ml-3">
            木目のラインには、視線を誘導する効果がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            鉄則: 部屋の長手方向（長い方）に合わせて板を張ることで、奥行きが強調され、部屋が広く見える。逆に短手に張ると圧迫感が出る。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「不燃認定」のハードル</h4>
          
          <p className="mb-1 text-xs ml-3">
            内装制限のある建物（特殊建築物や高層マンション）では、天井に燃える木材を使えない場合が多い。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 天然木を薄くスライスして不燃基材（ダイライト等）に貼った<strong>「不燃突き板パネル」</strong>や、不燃薬剤を注入した認定品を選ぶ必要がある。無垢材を使いたい場合は、法規チェックが最優先。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">ダウンライトの「配置計画」</h4>
          
          <p className="mb-1 text-xs ml-3">
            木質天井にダウンライトの穴をボコボコ開けると、せっかくの木目が台無しになる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            照明をライン状にまとめたり、コーブ照明（間接照明）にして天井面を照らしたりと、<strong>「天井を汚さない（穴を開けない）」</strong>照明計画とセットで考えるのがセオリー。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【網代（アジロ）・葦簀（ヨシズ）天井】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「本物」と「クロス（壁紙）」の圧倒的差</h4>
          
          <p className="mb-1 text-xs ml-3">
            和室や茶室に使われる、竹や木を編んだ天井。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>本物</strong>: 職人が手で編んだものは、立体感と陰影が美しく、経年変化で飴色になる。ただし高価で、施工には熟練の技が必要。</li>
            <li><span className="mr-1">・</span><strong>クロス</strong>: 網代柄の壁紙は、遠目にはそれっぽく見えるが、照明を当てると凹凸がないため平面的に見え、安っぽさが露呈する。本物志向の空間では避けるべき。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「竿縁（さおぶち）」のピッチと向き</h4>
          
          <p className="mb-1 text-xs ml-3">
            板や網代を押さえるために流す細い木（竿縁）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            作法: 竿縁は「床の間と平行」に流すのが正式な作法。逆向き（床刺し）にすると、不吉とされる場合があるため、和室の設計ではマナーとして押さえておく必要がある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【スパンドレル（金属天井）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「目地（めじ）」のライン効果</h4>
          
          <p className="mb-1 text-xs ml-3">
            アルミやスチールの細長い板を嵌め込んでいく天井材。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            金属特有のシャープなラインが連続するため、エントランスホールや軒下（外部から連続する天井）で、モダンで洗練された印象を作るのに最適。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">耐湿性と「浴室・プール」</h4>
          
          <p className="mb-1 text-xs ml-3">
            アルミ製のスパンドレルは錆びにくく、湿気に強いため、ホテルの大浴場やプールの天井の定番材料となっている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            湿気でカビやすい塗装やクロス天井の改修として、スパンドレルを上貼りする工法も有効。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【ルーバー天井（格子天井）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「設備隠し」と「開放感」の両立</h4>
          
          <p className="mb-1 text-xs ml-3">
            天井裏の配管やダクトを完全には隠さず、格子の隙間から少し見せる手法（スケルトン天井との中間）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: 完全に塞ぐボード天井よりも圧迫感がなく、天井が高く感じる。また、スプリンクラーや感知器の機能を阻害せずに、無機質な設備を目隠しできる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">メンテナンス性（着脱）</h4>
          
          <p className="mb-1 text-xs ml-3">
            ルーバーは、ワンタッチで取り外しできるタイプを選ぶのが基本。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            これにより、天井裏の空調機や配管のメンテナンスが必要になった際、点検口がなくてもどこからでもアクセス可能になる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【膜天井（まくてんじょう）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">落下しても安全な「軽さ」</h4>
          
          <p className="mb-1 text-xs ml-3">
            東日本大震災以降、体育館やホールの天井落下事故対策として普及した、シート状の天井。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            重さはガラスの数十分の一。万が一地震で落ちてきても、布のような素材なので人命に関わる怪我をしない。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            柔らかい光を拡散する照明カバーとしての効果も高い。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* スパンドレル */}
      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">スパンドレル</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・フクビ化学工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.fukuvi.co.jp/product/8/01?place=facility', '商品ページ')}｜
          {renderLink('https://www.catalabo.org/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&volumeID=CATALABO&catalogId=83000510000&pageGroupId=&designID=link&catalogCategoryId=&designConfirmFlg=', 'カタログ')}｜
          {renderLink('https://www.fukuvi.co.jp/company/office', '営業所')}｜
          {renderLink('https://www.fukuvi.co.jp/contact', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・理研軽金属工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.rikenkeikinzoku.co.jp/building/spandrel/', '商品ページ')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/catalog/index.html', 'カタログ')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/company/info/', '営業所')}｜
          {renderLink('https://www.rikenkeikinzoku.co.jp/company/inquiry/index.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・難波金属</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naniwa-kinzoku.co.jp/pro1.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.naniwa-kinzoku.co.jp/cp.html', '営業所')}｜
          {renderLink('https://www.naniwa-kinzoku.co.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・理研軽金属工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.rfriken.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.rfriken.co.jp/company/', '営業所')}｜
          {renderLink('https://www.rfriken.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・桐井製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kirii.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.kirii.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.kirii.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.kirii.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      {/* 木質パネル */}
      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">木質パネル</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・南海プライウッド</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nankaiplywood.co.jp/product/cieloceiling/', '商品ページ')}｜
          {renderLink('https://www.nankaiplywood.co.jp/catalog/#ceiling', 'カタログ')}｜
          {renderLink('https://www.nankaiplywood.co.jp/company/info/overview.html', '営業所')}｜
          {renderLink('https://www.nankaiplywood.co.jp/support/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
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

  const renderDecorativeMaterial = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装天井 装飾材</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【シーリングメダリオン（天井装飾座）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「ポリウレタン」と「石膏」の重量差</h4>
          
          <p className="mb-1 text-xs ml-3">
            シャンデリアの根元を飾る円形の装飾材。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>ポリウレタン製</strong>: 発泡スチロールのように軽く、接着剤とビスで簡単に取り付けられる。現在の主流。</li>
            <li><span className="mr-1">・</span><strong>石膏製</strong>: 本物の重厚感があるが、非常に重い。天井下地の強力な補強と、落下防止のワイヤー固定などが必要で、施工難易度が高い。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">照明器具との「サイズバランス」</h4>
          
          <p className="mb-1 text-xs ml-3">
            メダリオンが大きすぎると照明が貧相に見え、小さすぎると隠れてしまう。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            黄金比: 照明器具の直径よりも<strong>「ひと回り大きい（または同等）」</strong>サイズを選ぶのが、見上げのバランスを良くするセオリー。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【化粧梁（フェイクビーム・見せ梁）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「中空（ちゅうくう）」構造の利便性</h4>
          
          <p className="mb-1 text-xs ml-3">
            構造体としての梁ではなく、装飾として後付けする梁。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            メリット: コの字型に組んだ木材や、中が空洞のウレタン製を使うことで、<strong>「配線ルート」</strong>として利用できる。ダウンライトを埋め込んだり、配線を見せずにペンダントライトを吊るすのに最適。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">リフォームでの「既存梁隠し」</h4>
          
          <p className="mb-1 text-xs ml-3">
            マンションリフォームなどで、どうしても動かせないコンクリートの梁（邪魔な出っ張り）がある場合、あえて木目のシートや板を貼って「化粧梁」に見せることで、ネガティブな要素をデザインのアクセントに変えることができる。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">発泡ウレタン製の「超軽量ビーム」</h4>
          
          <p className="mb-1 text-xs ml-3">
            見た目は古木だが、実は発泡スチロール並みに軽い製品（擬木）がある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            構造補強なしで天井に接着できるため、耐震性を気にするリフォームでも採用しやすい。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【折り上げ天井・コーブ照明】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「アゴ」に溜まる埃（ほこり）問題</h4>
          
          <p className="mb-1 text-xs ml-3">
            天井の一部を高くして、間接照明（コーブ照明）を入れる手法は人気だが、光を隠す立ち上がり部分（アゴ）の内側には埃が猛烈に溜まる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            設計配慮: 掃除機のノズルが入る隙間を確保するか、あるいは埃が溜まらないようにカバー（乳半アクリル等）で蓋をするディテールにするか、施主の掃除スタイルに合わせた提案が必要。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">エアコンとの干渉</h4>
          
          <p className="mb-1 text-xs ml-3">
            折り上げ天井の近くに壁掛けエアコンを設置すると、エアコンの風が天井の段差に当たって気流が乱れたり、冷気がショートサーキット（跳ね返り）して効きが悪くなることがある。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            風の通り道を計算した配置計画が必須。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【格天井（ごうてんじょう）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「格式」とコスト</h4>
          
          <p className="mb-1 text-xs ml-3">
            角材を格子状に組んだ、和室における最も格式高い天井。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            本格的に組むと大工手間が非常にかかるため高額になるが、現在は石膏ボードに格子柄の化粧シートを貼った<strong>「格天井風ボード」</strong>などの簡易製品もあり、旅館風の演出をローコストで実現できる。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* ルーバー */}
      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">ルーバー</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ﾊﾟﾅｿﾆｯｸﾊｳｼﾞﾝｸﾞｿﾘｭｰｼｮﾝｽﾞ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://sumai.panasonic.jp/housing-biz/public/airylight/airylightlouver/', '商品ページ')}｜
          {renderLink('https://esctlg.panasonic.biz/iportal/CatalogViewInterfaceStartUpAction.do?method=startUp&mode=PAGE&catalogCategoryId=&catalogId=7055460000&pageGroupId=&volumeID=PEWJ0001&designID=', 'カタログ')}｜
          {renderLink('https://sumai.panasonic.jp/sr/', '営業所')}｜
          {renderLink('https://sumai.panasonic.jp/support/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
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
          {renderLink('https://www.abc-t.co.jp/products/material/ceiling/side/', '商品ページ')}｜
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
        <span className="w-[180px]">・難波金属</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.naniwa-kinzoku.co.jp/pro2.html', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.naniwa-kinzoku.co.jp/cp.html', '営業所')}｜
          {renderLink('https://www.naniwa-kinzoku.co.jp/contact.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ﾆﾁﾓｸﾌｧﾝｼｰﾏﾃﾘｱﾙ</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nf-m.co.jp/fancylouver/', '商品ページ')}｜
          {renderLink('https://www.nf-m.co.jp/fireproof/catalog/', 'カタログ')}｜
          {renderLink('https://www.nf-m.co.jp/corporate/access/', '営業所')}｜
          {renderLink('https://www.nf-m.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      {/* 格子 */}
      <div className="flex items-center mt-4 mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">格子</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・エービーシー商会</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.abc-t.co.jp/products/material/ceiling/big/', '商品ページ')}｜
          {renderLink('https://www.abc-t.co.jp/apps/contact/catalog_list', 'カタログ')}｜
          {renderLink('https://www.abc-t.co.jp/company/establishments.html', '営業所')}｜
          {renderLink('https://www.abc-t.co.jp/apps/contact/select', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderFunctional = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">機能性内装天井</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【吸音（きゅうおん）天井】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「穴あきボード」の効果と限界</h4>
          
          <p className="mb-1 text-xs ml-3">
            表面に多数の穴が開いた石膏ボードや金属パネルは、音を穴の中で減衰させる吸音材。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            機能: 室内の反響（ワンワンという響き）を抑え、話し声をクリアにする。会議室、教室、ホールなどで必須。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            誤解: 「吸音＝防音（外に漏れない）」ではない。音を漏らさない（遮音）ためには、天井裏に遮音シートや鉛ボードを施工する必要がある。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">グラスウール天井板の「軽量性」</h4>
          
          <p className="mb-1 text-xs ml-3">
            グラスウールを固めた天井材（パラマウント硝子工業「キソラトン」等）。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            非常に軽く、吸音・断熱性が高い。万が一落下しても柔らかいため怪我をしにくいという安全面でのメリットもある。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【調湿（ちょうしつ）天井】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「モイス」や「珪藻土クロス」の天井利用</h4>
          
          <p className="mb-1 text-xs ml-3">
            湿気は上に溜まる性質があるため、壁だけでなく天井に調湿建材を使うのが最も効率的。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            メリット: 結露防止や、洗濯物の室内干しの乾燥促進に効果を発揮する。寝室やクローゼットにも推奨される。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">カビのリスクと換気</h4>
          
          <p className="mb-1 text-xs ml-3">
            調湿材は湿気を「吸う」だけでなく「吐く」機能も必要。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            常に湿度が高い環境（換気扇のない脱衣所など）では、吸湿の限界を超えてカビが生えることがあるため、適切な換気計画との併用が前提となる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【耐震（たいしん）天井】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">3.11以降の「天井脱落対策」</h4>
          
          <p className="mb-1 text-xs ml-3">
            過去の大地震で、体育館やホールの重い天井が崩落する事故が多発した。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            特定天井（とくていてんじょう）: 高さ6m以上、面積200㎡以上などの特定天井には、ブレース（筋交い）を入れたり、クリップを強化したりする<strong>「耐震天井工法」</strong>が法律で義務付けられている。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            重いボード天井ではなく、最初から軽い「膜天井」を採用することで、リスクそのものを回避する手法も増えている。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【断熱（だんねつ）天井】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「最上階」の断熱強化</h4>
          
          <p className="mb-1 text-xs ml-3">
            マンションの最上階や戸建ての2階は、屋根からの熱をダイレクトに受けるため、夏場は灼熱地獄になる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 天井材の裏に高性能な断熱材（フェノールフォーム等）を敷き込むか、天井裏に断熱材を吹き付ける<strong>「天井断熱」</strong>の厚みを増やすことが、快適性と光熱費削減に直結する。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* システム天井 */}
      <div className="flex items-center mb-1">
        <span className="inline-flex items-center px-3 py-1 text-[13px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-full">システム天井</span>
        <div className="flex-1 h-px bg-gray-300 ml-2"></div>
      </div>
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・エービーシー商会</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.abc-t.co.jp/products/material/ceiling/systemCeiling/', '商品ページ')}｜
          {renderLink('https://www.abc-t.co.jp/apps/contact/catalog_list', 'カタログ')}｜
          {renderLink('https://www.abc-t.co.jp/company/establishments.html', '営業所')}｜
          {renderLink('https://www.abc-t.co.jp/apps/contact/select', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・日幸産業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nikko-ind.co.jp/product/interior.html', '商品ページ')}｜
          {renderLink('https://www.nikko-ind.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.nikko-ind.co.jp/about/', '営業所')}｜
          {renderLink('https://www.nikko-ind.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
      
      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・東京興業貿易商会</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.tkbs.co.jp/cnav08/', '商品ページ')}｜
          {renderLink('https://www.tkbs.co.jp/cnav08/pdf/dampa01.pdf', 'カタログ')}｜
          {renderLink('https://www.tkbs.co.jp/company/#link02', '営業所')}｜
          {renderLink('https://www.tkbs.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・マグ・イゾベール</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.isover.co.jp/products/ecophon', '商品ページ')}｜
          {renderLink('https://www.isover.co.jp/documentation', 'カタログ')}｜
          {renderLink('https://www.isover.co.jp/aboutus/offices', '営業所')}｜
          {renderLink('https://www.isover.co.jp/inquiry', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ﾊﾟﾅｿﾆｯｸ内装建材</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://sumai.panasonic.jp/housing-biz/public/airylight/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://panasonic.co.jp/phs/pibp/company_summary.html', '営業所')}｜
          {renderLink('https://panasonic.co.jp/phs/pibp/contactus.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・帝人フロンティア</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kal-ten.jp/products.php', '商品ページ')}｜
          {renderLink('https://inquiry.teijin.co.jp/form/contact_kr_jp.html', 'カタログ')}｜
          {renderLink('https://www2.teijin-frontier.com/company/office/', '営業所')}｜
          {renderLink('https://inquiry.teijin.co.jp/form/contact_kr_jp.html', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・森村金属</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.morison.co.jp/business/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.morison.co.jp/business/company/office/', '営業所')}｜
          {renderLink('https://www.morison.co.jp/business/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・桐井製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kirii.co.jp/products/ceiling/', '商品ページ')}｜
          {renderLink('https://www.kirii.co.jp/download/', 'カタログ')}｜
          {renderLink('https://www.kirii.co.jp/company/location/', '営業所')}｜
          {renderLink('https://www.kirii.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderOther = () => (
    <div>
      <div className="mb-2">
        <h2 className="text-xl font-semibold inline">内装天井 その他</h2>
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
          <h3 className="font-bold text-[13px] mb-1.5">【光天井（ひかりてんじょう）・樹脂プレート】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「虫の死骸」とメンテナンス性</h4>
          
          <p className="mb-1 text-xs ml-3">
            乳半色のアクリル板やポリカ板の裏に照明を仕込み、天井全体を光らせる手法。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            最大のリスク: カバーの裏側（照明スペース）に小さな虫が入り込み、黒い影となって下から丸見えになること。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            対策: 密閉性を高める「防虫パッキン」の施工精度と、掃除のために<strong>「カバーが簡単に外せる（落下防止チェーン付き）」</strong>仕様になっているかどうかが、運用後のクレームを防ぐ鍵。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「アクリル」と「ポリカ」の変色差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>アクリル</strong>: 透明度が高く美しいが、割れやすい。</li>
            <li><span className="mr-1">・</span><strong>ポリカーボネート</strong>: 割れにくいが、アクリルに比べて紫外線（照明の光含む）による「黄変（黄ばみ）」が起きやすい傾向がある。</li>
          </ul>
          
          <p className="mb-2 text-xs ml-3">
            長期間の美観維持にはアクリル、安全重視ならポリカ、または「耐候グレード」の選定が必要。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【グラスウール化粧板（ガラスクロス仕上げ）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">機械室・ポンプ室の標準仕様</h4>
          
          <p className="mb-1 text-xs ml-3">
            グラスウールボードの表面をガラスクロス（布）で包んだもの（パラマウント硝子「GCボード」等）。
          </p>
          
          <p className="mb-1 text-xs ml-3">
            機能: 「吸音性」と「断熱性」が極めて高いため、騒音が出る機械室や、結露しやすいポンプ室の天井・壁に採用される。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            一般のロックウール吸音板（ソーラトン）よりも湿気に強く、ボロボロになりにくい。
          </p>
          
          <h4 className="font-bold text-[12px] mb-1">「額縁（がくぶち）貼り」の意匠</h4>
          
          <p className="mb-1 text-xs ml-3">
            断面のグラスウールが露出しないように、周囲をクロスで巻き込んだり、塩ビの枠（額縁）を回したりして施工する。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            意匠性は低いため、居室ではなくバックヤードやスタジオ（防音室）の内装下地として使われることが多い。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【浴室天井材（バスリブ・樹脂パネル）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「バスリブ」と「フラットパネル」の清掃性格差</h4>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>バスリブ</strong>: 昔ながらの細長い中空の樹脂板。安価で軽量だが、継ぎ目の「溝」が多く、カビが生えると掃除が絶望的に大変。</li>
            <li><span className="mr-1">・</span><strong>フラットパネル</strong>: 大判の樹脂パネルやアルミ樹脂複合板。継ぎ目が少なく、表面がツルツルしているため、水切りが良くカビが生えにくい。リフォームではこちらを提案するのが鉄則。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">「断熱セット」によるヒートショック対策</h4>
          
          <p className="mb-1 text-xs ml-3">
            浴室天井は湯気が結露して冷たい滴（しずく）になりやすい。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            単なる樹脂板ではなく、裏面に<strong>「保温材（発泡スチロール等）」</strong>が裏打ちされた製品を選ぶことで、結露を抑制し、浴室全体の保温性を高めることができる。
          </p>
          
          <h3 className="font-bold text-[13px] mb-1.5 mt-3">【スパンドレル（金属化粧板）】の重要知識</h3>
          
          <h4 className="font-bold text-[12px] mb-1">「アルミ」と「カラー鋼板」の錆びリスク</h4>
          
          <p className="mb-1 text-xs ml-3">
            軒天（屋外）や厨房、トイレ天井に使われる金属板。
          </p>
          
          <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
            <li><span className="mr-1">・</span><strong>アルミ製</strong>: 錆に強く、軽量。外部や湿気の多い場所（厨房・浴室）はアルミ一択。</li>
            <li><span className="mr-1">・</span><strong>カラー鋼板（鉄）</strong>: 安価だが、切断面から錆びるリスクがある。厨房などの「水蒸気」が当たる場所でコストダウンのために鋼板製を使うと、数年で赤錆だらけになるため注意が必要。</li>
          </ul>
          
          <h4 className="font-bold text-[12px] mb-1">強風対策の「耐風圧」仕様</h4>
          
          <p className="mb-1 text-xs ml-3">
            玄関ポーチやピロティなどの外部天井に使う場合、ビル風や台風の吹き上げでスパンドレルが剥がれ落ちる事故が起きる。
          </p>
          
          <p className="mb-2 text-xs ml-3">
            外部に使用する場合は、必ず<strong>「耐風圧仕様（補強クリップ等）」</strong>で施工されているか確認が必要。
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-8">
        {renderRecrutmentCard()}
      </div>

      {/* その他企業 */}
      <div className="mt-4 text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ロックウール工業会</span>
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
        <span className="w-[180px]">・南海プライウッド</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nankaiplywood.co.jp/product/', '商品ページ')}｜
          {renderLink('https://www.nankaiplywood.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.nankaiplywood.co.jp/company/office/', '営業所')}｜
          {renderLink('https://www.nankaiplywood.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・ニチアス</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.nichias.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.nichias.co.jp/company/network/', '営業所')}｜
          {renderLink('https://www.nichias.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・理研軽金属工業</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.rfriken.co.jp/products/', '商品ページ')}｜
          {renderLink('#', 'カタログ')}｜
          {renderLink('https://www.rfriken.co.jp/company/', '営業所')}｜
          {renderLink('https://www.rfriken.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>

      <div className="text-[13px] flex items-start gap-2">
        <span className="w-[180px]">・桐井製作所</span>
        <span className="flex gap-1 flex-wrap">
          {renderLink('https://www.kirii.co.jp/products/', '商品ページ')}｜
          {renderLink('https://www.kirii.co.jp/catalog/', 'カタログ')}｜
          {renderLink('https://www.kirii.co.jp/company/base/', '営業所')}｜
          {renderLink('https://www.kirii.co.jp/contact/', 'お問い合わせ')}｜
          {renderLink('#', 'サンプル')}｜
          {renderLink('#', 'CADDOWNLOAD')}
        </span>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (subcategory) {
      case '内装天井ボード':
      case 'ボード':
        return renderBoard();
      case '内装天井化粧材':
      case '化粧材':
        return renderDecorative();
      case '内装天井装飾材':
      case '装飾材':
        return renderDecorativeMaterial();
      case '内装天井機能性':
      case '機能性':
        return renderFunctional();
      case '内装天井その他':
      case 'その他':
        return renderOther();
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

export default InternalCeilingContent; 