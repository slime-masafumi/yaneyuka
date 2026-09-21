'use client';

import React, { useState } from 'react';
import MakerLink from '@/components/MakerLink';
import MakerRows from '@/components/MakerRows';

interface ExternalFloorContentProps {
  subcategory: string;
}

const ExternalFloorContent: React.FC<ExternalFloorContentProps> = ({ subcategory }) => {
  const [showBasicKnowledge, setShowBasicKnowledge] = useState(false);
  // リンクの実体は src/components/MakerLink.tsx。
  // 404 になったメーカーページは会社トップへ自動で振り替わる。
  const renderLink = (url: string | undefined, label: string) => (
    <MakerLink url={url} label={label} />
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    if (img.src.includes('掲載募集中a.png')) {
      return;
    }
    img.src = '/image/掲載募集中a.png';
    img.alt = '掲載企業様募集中';
    
    const cardDiv = img.closest('.card');
    if (cardDiv) {
      const titleDiv = cardDiv.querySelector('.font-bold');
      if (titleDiv) {
        titleDiv.textContent = '□□□';
      }
    }
  };

  const handleCommercialImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
  };

  const renderContent = () => {
    switch (subcategory) {
      case 'external-tile':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外部床 タイル</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【外部床タイルの安全性と機能】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">絶対条件「防滑（ぼうかつ）性能」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  雨で濡れたタイルは氷の上のように滑るため、外部には表面がザラザラした<strong>「ノンスリップ（防滑）仕様」</strong>のタイルを選ぶのが鉄則。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: デザインが気に入ったからといって、表面がツルツルの「磨きタイル（鏡面仕上げ）」や「内装用タイル」を玄関ポーチに使うと、転倒事故に直結するため絶対にNG。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「滑りにくい」＝「汚れが落ちにくい」のジレンマ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  防滑タイルは表面の凹凸に靴の泥や埃が入り込むため、ツルツルのタイルに比べて掃除が大変になる（モップが引っかかる）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  推奨: 近年は、滑りにくさを維持しつつ、汚れが落ちやすい加工（マイクロガード等の防汚処理）がされた<strong>「清掃性重視タイプ」</strong>が出ているため、そちらを選ぶと日々の掃除が楽になる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「磁器質（じきしつ）」以外の採用リスク</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>磁器質</strong>: 吸水率が1%以下。水を吸わないため汚れにくく、寒冷地でも凍害（水分が凍って割れる）が起きない。外部床の標準。</li>
                  <li><span className="mr-1">・</span><strong>せっ器質・陶器質</strong>: 吸水率が高いため、寒冷地では凍って割れるリスクが高く、汚れも染み込みやすい。テラコッタ調などの雰囲気を重視する場合以外は、磁器質を選ぶのが無難。</li>
                </ul>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【デザインと施工のトレンド】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「300角」から「600角」への大型化</h4>
                
                <p className="mb-1 text-xs ml-3">
                  昔は30cm角（300角）が標準だったが、近年は60cm角（600角）の大判タイルが人気。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 目地（継ぎ目）の数が減るため、空間が広く見え、高級感が出る。また、目地掃除の手間も減る。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">目地（めじ）の色選びで汚れを目立たなくする</h4>
                
                <p className="mb-1 text-xs ml-3">
                  白い目地は新築時は美しいが、泥汚れや排気ガスですぐに黒ずんでしまう。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  実用策: 最初から<strong>「グレー」や「ダークグレー」の目地</strong>を選んでおくと、経年での汚れが目立ちにくく、メンテナンスのストレスが減る。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">バルコニー用の「置き敷き（ペデスタル）工法」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  マンションや屋上の防水層の上には、通常タイルをモルタルで貼ることができない（防水が切れるため）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 樹脂製の束（ペデスタル）の上に厚手のタイルを置くだけの<strong>「置き敷き工法」</strong>を採用する。水はタイルの隙間から下に流れ、防水層を傷つけずにフラットなタイル空間を作れる。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【階段・段差の安全対策】</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「段鼻（だんばな）」の視認性</h4>
                
                <p className="mb-1 text-xs ml-3">
                  同じ色のタイルで階段を作ると、段差の境界線が見えづらく、踏み外す事故が起きやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 階段の先端（段鼻）専用の<strong>「段鼻タイル（滑り止め溝付き）」</strong>を使うか、先端だけ色を変えるなどの視覚的な配慮（コントラスト）が必要。高齢者がいる住宅では特に重要。
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
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
                <img src="/image/ChatGPT Image 2025年5月1日 16_25_41.webp" alt="Manufacturer Commercial" className="mt-3 w-full rounded w-[clamp(180px,22vw,320px)]" onError={handleCommercialImageError} />
              </div>
            </div>

            <div className="mt-4 text-[13px]">
              <MakerRows category="外部床" page="external-tile" nameWidth="200px" />
            </div>
          </div>
        );

      case 'external-stone-brick':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外部床 石・レンガ</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【天然石（石畳・敷石）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">表面仕上げは「バーナー仕上げ」が絶対条件</h4>
                
                <p className="mb-1 text-xs ml-3">
                  墓石のようなツルツルの「本磨き（鏡面）」仕上げは、雨の日にスケートリンクのように滑り、転倒事故の元凶となる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須スペック: 表面を火で炙って凸凹に荒らした<strong>「ジェットバーナー仕上げ」や、叩いてザラザラにした「ビシャン仕上げ」</strong>を選定するのが、外部床の安全基準。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「御影石（みかげいし）」一強の理由</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>御影石（花崗岩）</strong>: 非常に硬く、吸水率が低いため、泥汚れや酸性雨に強い。車が乗る駐車場でも割れにくい。外部床の王様。</li>
                  <li><span className="mr-1">・</span><strong>大理石</strong>: 酸に弱く、雨で溶けて艶がなくなり、さらに滑りやすいため屋外床には不向き。</li>
                  <li><span className="mr-1">・</span><strong>ライムストーン・砂岩</strong>: 柔らかく水を吸うため、すぐに苔が生えたり、寒冷地では凍って割れたりする。南欧風の見た目は良いが、日本の気候では維持が難しい。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">油汚れは「染み」になる</h4>
                
                <p className="mb-1 text-xs ml-3">
                  天然石には微細な穴（細孔）があるため、バーベキューの油や車のオイル、コーヒーなどをこぼすと、瞬時に染み込んで取れなくなる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 汚れやすい場所（テラス等）に使う場合は、施工直後に<strong>「浸透性吸水防止剤（ストーンシーラー）」</strong>を塗布し、汚れが奥に入り込まないようにする事前対策が推奨される。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「乱張り（らんばり）」の歩きにくさと美学</h4>
                
                <p className="mb-1 text-xs ml-3">
                  形の違う石をパズルのように組み合わせる「乱張り」は、職人のセンスが光る人気のデザイン。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 表面に自然な凹凸があるため、ハイヒールやベビーカー、車椅子には優しくない。アプローチのメイン動線は平らな「方形（四角い石）」にし、脇を乱張りにするなど、動線への配慮が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【レンガ（敷きレンガ・インターロッキング）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">壁用とは違う「敷きレンガ（ペイビング）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  壁用のレンガを床に使うと、強度が足りずに割れたり、水を吸いすぎて冬に凍結破壊（凍害）を起こしたりする。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  選定: 高温で焼き締め、吸水率を下げて強度を高めた<strong>「舗装用レンガ（ペイビングレンガ）」</strong>を指定する必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">コンクリートで固めない「サンドクッション工法」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  レンガの下をコンクリートで固めるのではなく、砂（サンド）を敷いてその上に並べる工法が一般的。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メリット: 雨水が目地から地面に浸透するため水はけが良い。また、レンガが割れたり沈んだりしても、そこだけ外して簡単に交換・補修ができる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「目地（めじ）の雑草」対策</h4>
                
                <p className="mb-1 text-xs ml-3">
                  砂決め（砂目地）の場合、目地から雑草が生えてくるのが最大の悩み。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  現代の解決策: 水をかけるとカチカチに固まる<strong>「固まる砂（ポリマーサンド）」</strong>を目地に使うことで、透水性を保ちながら雑草と虫の発生を劇的に抑えることができる。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">日陰の「苔（コケ）」によるスリップ</h4>
                
                <p className="mb-1 text-xs ml-3">
                  レンガは適度に水を吸うため、北側や日陰では苔が生えやすい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  雰囲気（アンティーク感）としては良いが、雨の日は非常に滑りやすくなるため、高齢者が通る場所には不向きか、高圧洗浄などの定期メンテナンスが必要になる。
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

            <div className="mt-4 text-[13px]">
              <MakerRows category="外部床" page="external-stone-brick" nameWidth="200px" />
            </div>
          </div>
        );

      case 'pvc-sheet':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外部床 塩ビシート</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【防滑性ビニル床シート（ノンスリップシート）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「エンボス（凹凸）」による転倒防止</h4>
                
                <p className="mb-1 text-xs ml-3">
                  外部用シートは、表面に深い凹凸（エンボス加工）や、硬い粒子（骨材）を練り込むことで、雨の日でも靴が滑らないように設計されている（CSR値0.6以上などの基準がある）。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  注意点: 室内用のフロアタイル等を外部に使うと、雨で濡れた際に極端に滑りやすくなり、転倒事故につながるため厳禁。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">足音を消す「遮音（しゃおん）性能」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  裏面に発泡層やゴム層を設けた厚手のシートは、靴音（コツコツ音）を吸収する効果が高い。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  コンクリート直仕上げの廊下に比べて静粛性が格段に上がるため、マンションリフォーム（大規模修繕）での採用率がほぼ100%。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「端部（たんぶ）」処理が寿命を決める</h4>
                
                <p className="mb-1 text-xs ml-3">
                  シートの端（際）から水が入ると、接着剤が劣化してシートが剥がれてくる。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  必須施工: 端部は<strong>「シール（コーキング）処理」を徹底するか、専用の「端部金物（押さえ金物）」</strong>を取り付けて、水の侵入を物理的に防ぐ納まりにする必要がある。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「インレイド」と「プリント」の摩耗差</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>インレイド構造</strong>: 模様が金太郎飴のように中まで練り込まれているタイプ。表面が摩耗しても模様が消えないため、通行量の多い廊下に適している。</li>
                  <li><span className="mr-1">・</span><strong>プリント</strong>: 表面に印刷したタイプ。摩耗すると模様が消えて下地が見えてしまうため、歩行頻度の高い場所には不向き。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">清掃の難敵「エンボスの汚れ」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  防滑のための凹凸に泥汚れが入り込むと、モップ拭きだけでは落ちにくい。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  メンテナンス: 定期的に<strong>「ポリッシャー（機械洗浄）」</strong>や高圧洗浄を行うか、最初から汚れが付きにくい防汚コーティング仕様の製品を選ぶことが美観維持の鍵。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">階段専用部材（ステップ）の採用</h4>
                
                <p className="mb-1 text-xs ml-3">
                  階段部分は、踏み面と滑り止め（ノンスリップ）が一体になった<strong>「階段用シート」</strong>を使用する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  視認性を高めるために、段鼻（先端）の色を変えた製品を選ぶことで、高齢者の踏み外し事故防止に貢献する。
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

            <div className="mt-4 text-[13px]">
              <MakerRows category="外部床" page="pvc-sheet" nameWidth="200px" />
            </div>
          </div>
        );

      case 'external-finish':
        return (
          <div>
            <div className="mb-2">
              <h2 className="text-xl font-semibold inline">外部床 その他</h2>
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
                <h3 className="font-bold text-[13px] mb-1.5">【ウッドデッキ（天然木）】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「ハードウッド」一択の理由</h4>
                
                <p className="mb-1 text-xs ml-3">
                  ホームセンターで売られているSPF材（ソフトウッド）は、防腐塗装をしても屋外では数年で腐る。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  プロの常識: 外部で使うなら、<strong>「ウリン」「イペ」「セランガンバツ」などの高耐久ハードウッド（硬木）</strong>を選ぶのが基本。無塗装でも20〜30年以上腐らない耐久性を持つ。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">最強木材ウリンの「樹液（灰汁）」問題</h4>
                
                <p className="mb-1 text-xs ml-3">
                  「鉄の木」と呼ばれる最強のウリンだが、施工後数ヶ月間は雨で<strong>真っ赤な樹液（ポリフェノール）</strong>が染み出し、下のコンクリートを汚す。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 汚れても良い場所に使うか、樹液が出にくいイペを選ぶ等の配慮が必要。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「ささくれ（トゲ）」の危険性</h4>
                
                <p className="mb-2 text-xs ml-3">
                  天然木は経年劣化で表面が毛羽立ち、トゲが出る。小さな子供が裸足で歩く可能性がある場合は、定期的なサンディング（やすり掛け）が必要。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【人工木・樹脂木デッキ】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">「腐らない」が最大のメリット</h4>
                
                <p className="mb-1 text-xs ml-3">
                  木粉とプラスチックを混ぜて成形した工業製品。絶対に腐らず、シロアリも来ない。塗装メンテナンスも不要。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  変色: 紫外線で多少の色褪せはするが、天然木のような激しい変色は起きない。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">夏場の「表面温度」火傷リスク</h4>
                
                <p className="mb-1 text-xs ml-3">
                  樹脂は熱を蓄えやすいため、真夏の直射日光下では表面温度が<strong>60℃〜70℃</strong>近くになり、裸足で歩くと火傷する。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: 「遮熱タイプ」の製品を選ぶか、夏場はシェードや打ち水で冷やす対策が必須。
                </p>
                
                <h3 className="font-bold text-[13px] mb-1.5 mt-3">【土間コンクリート・洗い出し】の重要知識</h3>
                
                <h4 className="font-bold text-[12px] mb-1">ひび割れを誘発させる「伸縮目地（しんしゅくめじ）」</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コンクリートは乾燥収縮で必ずひび割れ（クラック）が入る。
                </p>
                
                <p className="mb-2 text-xs ml-3">
                  対策: コンクリートが割れたい力を逃がすために、あえて3m〜5m間隔で<strong>「目地（スリット）」</strong>を入れて、そこで割れさせる（誘発目地）。これがないと、意図しない場所で不規則に割れて美観を損なう。
                </p>
                
                <h4 className="font-bold text-[12px] mb-1">「洗い出し（あらいだし）」の意匠性と滑り止め</h4>
                
                <p className="mb-1 text-xs ml-3">
                  コンクリートが固まる前に表面を水で洗い流し、中の砂利（骨材）を露出させる伝統工法。
                </p>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>メリット</strong>: 砂利の凹凸で滑りにくくなるため、アプローチや駐車場に適している。また、タイヤ痕などの汚れが目立ちにくい。</li>
                  <li><span className="mr-1">・</span><strong>リスク</strong>: 職人の腕に左右されやすく、施工直後の雨で仕上がりが台無しになるリスク（白華や剥離）があるため、天候管理がシビア。</li>
                </ul>
                
                <h4 className="font-bold text-[12px] mb-1">「刷毛引き（はけびき）」と「金鏝（かなごて）」</h4>
                
                <ul className="mb-2 space-y-0.5 text-xs ml-3 list-none">
                  <li><span className="mr-1">・</span><strong>金鏝仕上げ</strong>: ツルツル。掃除はしやすいが雨の日は滑る。車庫内などに。</li>
                  <li><span className="mr-1">・</span><strong>刷毛引き仕上げ</strong>: ホウキ目でザラザラにする。滑りにくいので勾配のあるスロープや屋外通路の標準仕上げ。</li>
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

            <div className="mt-4 text-[13px]">
              <MakerRows category="外部床" page="external-finish" nameWidth="200px" />
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

export default ExternalFloorContent; 