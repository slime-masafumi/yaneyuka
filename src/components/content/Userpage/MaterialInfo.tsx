'use client';

import React, { useRef, useState } from 'react';

const MaterialInfo: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    '意匠': false,
    '構造': false,
    '機械': false,
    '電気': false,
  });

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element && contentRef.current) {
      const container = contentRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const elementTop = elementRect.top - containerRect.top + scrollTop;
      container.scrollTo({
        top: elementTop - 20, // 少し上に余白を持たせる
        behavior: 'smooth'
      });
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const categorySections = {
    '意匠': [
      { id: 'section-1', title: 'ガラス種別（JIS R 3202 他）' },
      { id: 'section-2', title: '木材比較表（代表樹種）' },
      { id: 'section-3', title: '内装仕上げ材（例）' },
      { id: 'section-4', title: 'タイル・石材・左官材' },
      { id: 'section-5', title: '内装壁・天井材' },
      { id: 'section-6', title: '外壁材・屋根材' },
      { id: 'section-7', title: '天井材（システム天井含む）' },
      { id: 'section-8', title: '金属板材' },
      { id: 'section-9', title: '塗料種別' },
      { id: 'section-10', title: 'シーリング材（シール材）' },
      { id: 'section-11', title: '主要断熱材一覧（熱伝導率 λ：W/m･K）' },
      { id: 'section-11a', title: 'LGS（軽量鉄骨天井・壁下地）規格（JIS A 6517）' },
    ],
    '構造': [
      { id: 'section-12', title: '鉄筋（JIS G 3112）' },
      { id: 'section-13', title: 'H形鋼（JIS G 3192 形鋼の寸法・質量）' },
      { id: 'section-14', title: '六角ボルト（JIS B 1180・JIS B 1051）' },
      { id: 'section-15', title: '一般的な鋼板の板厚（JIS G 3193 他）' },
      { id: 'section-16', title: '鉄筋 断面積・単位重量 早見（参考）' },
      { id: 'section-17', title: '等辺山形鋼（L形） 代表例' },
      { id: 'section-18', title: '溝形鋼（C形鋼） 代表例' },
      { id: 'section-19', title: '角形・矩形鋼管（JIS G 3466 STKR 代表）' },
      { id: 'section-20', title: '高力ボルト（JIS B 1186 等）' },
      { id: 'section-21', title: '座金・ナット（対応規格）' },
      { id: 'section-22', title: 'アンカーボルト（定着材）' },
      { id: 'section-23', title: 'コンクリート（設計基準強度・材料特性）' },
      { id: 'section-24', title: '耐震補強・補強材（RC・SRC・S造共通）' },
    ],
    '機械': [
      { id: 'section-25', title: '給排水・衛生配管材' },
      { id: 'section-26', title: '空調ダクト（材質・用途別）' },
      { id: 'section-27', title: '熱絶縁（保温材）' },
      { id: 'section-28', title: '空調・換気機器例（抜粋）' },
      { id: 'section-29', title: '冷媒配管・ドレン・機器接続材' },
      { id: 'section-30', title: '衛生器具・給排水装置' },
      { id: 'section-31', title: 'ポンプ・給水・排水装置' },
      { id: 'section-32', title: '消火設備・加圧装置' },
    ],
    '電気': [
      { id: 'section-33', title: '電線・配線材（JIS C 3307 等）' },
      { id: 'section-34', title: '分電盤・配電設備' },
      { id: 'section-35', title: '照明・スイッチ・コンセント類' },
      { id: 'section-36', title: '弱電・情報・セキュリティ設備' },
      { id: 'section-37', title: '接地・避雷・保安設備' },
      { id: 'section-38', title: '非常電源・防災・避難設備' },
      { id: 'section-39', title: '制御・計装・BEMS対応' },
      { id: 'section-40', title: '照度基準と設計目安（JIS Z 9110）' },
      { id: 'section-41', title: '実務的な配線・設計注意点' },
    ],
  };

  return (
    <div className="p-0 bg-white rounded-lg">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">材料情報</h2>
        <span className="text-red-600 font-bold text-xs sm:text-sm ml-4">※この機能は現在β版です。ご意見をぜひお聞かせください。</span>
      </div>
      <p className="text-[12px] text-gray-600 mb-4">
        材料・建材に関する情報やリンク集です。意匠、構造、機械、電気の各分野における材料の規格、寸法、特性などの情報をまとめています。※情報は設計者が実務において適切に調査・確認してください。
      </p>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-[13px] font-medium">情報一覧</h3>
            </div>
          </div>
        </div>

      <div className="flex h-[calc(100vh-200px)]">
        {/* 目次エリア */}
        <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <h4 className="text-[13px] font-semibold mb-3 text-gray-800 text-left">目次</h4>
            <div className="flex flex-col items-start space-y-1">
              {Object.entries(categorySections).map(([category, sections]) => (
                <div key={category} className="w-full">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full text-left text-[12px] font-semibold text-gray-800 hover:text-gray-900 py-2 flex items-center"
                  >
                    <span className="text-[0.5rem] mr-2">{expandedCategories[category] ? '▼' : '▶'}</span>
                    <span>{category}</span>
                  </button>
                  {expandedCategories[category] && (
                    <div className="ml-4 space-y-1 mb-2">
                      {sections.map((section) => (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToSection(section.id);
                          }}
                          className="text-left text-[11px] text-black hover:underline py-1 block"
                          style={{ textAlign: 'left', display: 'block', width: '100%' }}
                        >
                          {section.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 本文エリア */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
      <div className="p-4 text-[12px] text-gray-700 space-y-8">
        {/* 意匠セクション */}
        <div id="section-1">
          <h4 className="text-[13px] font-semibold mb-2">ガラス種別（JIS R 3202 他）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要なガラス種別と用途例。防火・安全・性能は別途要件確認。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">ガラス種別</th>
                  <th className="border px-2 py-1 text-left">厚さ (mm)</th>
                  <th className="border px-2 py-1 text-left">用途例</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">フロートガラス</td>
                  <td className="border px-2 py-1">3, 4, 5, 6, 8, 10</td>
                  <td className="border px-2 py-1">室内建具・小開口窓・間仕切り</td>
                  <td className="border px-2 py-1">一般透明板ガラス</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">強化ガラス</td>
                  <td className="border px-2 py-1">5, 6, 8, 10, 12</td>
                  <td className="border px-2 py-1">手摺・大型窓・床</td>
                  <td className="border px-2 py-1">フロートの約3〜5倍の強度</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">合わせガラス</td>
                  <td className="border px-2 py-1">6.8 (3+3), 8.8 (4+4), 10.8 (5+5)</td>
                  <td className="border px-2 py-1">安全対策・防音・防犯</td>
                  <td className="border px-2 py-1">中間膜の種類により性能変化</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">複層ガラス（断熱）</td>
                  <td className="border px-2 py-1">22 (5+12A+5), 24 (6+12A+6), 28 (8+12A+8)</td>
                  <td className="border px-2 py-1">窓サッシ・高断熱住宅</td>
                  <td className="border px-2 py-1">アルゴン封入・Low-E対応も可</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-2">
          <h4 className="text-[13px] font-semibold mb-2">木材比較表（代表樹種）</h4>
          <p className="text-[11px] text-gray-500 mb-2">値は代表的な目安。等級・含水率・産地等により変動します。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">樹種</th>
                  <th className="border px-2 py-1 text-left">比重 (目安)</th>
                  <th className="border px-2 py-1 text-left">硬さ</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考（耐水・コスト等）</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">スギ</td>
                  <td className="border px-2 py-1">約0.38</td>
                  <td className="border px-2 py-1">低</td>
                  <td className="border px-2 py-1">内装・造作・下地材</td>
                  <td className="border px-2 py-1">安価・軽量・吸音性高い</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ヒノキ</td>
                  <td className="border px-2 py-1">約0.41</td>
                  <td className="border px-2 py-1">中</td>
                  <td className="border px-2 py-1">構造材・床組・柱</td>
                  <td className="border px-2 py-1">耐久性・香り・防虫性あり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">カラマツ</td>
                  <td className="border px-2 py-1">約0.50</td>
                  <td className="border px-2 py-1">中</td>
                  <td className="border px-2 py-1">土台・梁材</td>
                  <td className="border px-2 py-1">節が多く構造向き</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ナラ（オーク）</td>
                  <td className="border px-2 py-1">約0.70</td>
                  <td className="border px-2 py-1">高</td>
                  <td className="border px-2 py-1">フローリング・家具</td>
                  <td className="border px-2 py-1">硬く耐摩耗性高い</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">メープル</td>
                  <td className="border px-2 py-1">約0.63</td>
                  <td className="border px-2 py-1">高</td>
                  <td className="border px-2 py-1">階段・天板・高級家具</td>
                  <td className="border px-2 py-1">乾燥後の寸法安定性良い</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ウォールナット</td>
                  <td className="border px-2 py-1">約0.64</td>
                  <td className="border px-2 py-1">中〜高</td>
                  <td className="border px-2 py-1">高級家具・壁面仕上げ</td>
                  <td className="border px-2 py-1">色味・高級感あり</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-3">
          <h4 className="text-[13px] font-semibold mb-2">内装仕上げ材（例）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な内装仕上げ材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材料種別</th>
                  <th className="border px-2 py-1 text-left">厚さ・寸法例</th>
                  <th className="border px-2 py-1 text-left">用途</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">石膏ボード</td>
                  <td className="border px-2 py-1">9.5mm, 12.5mm, 15mm</td>
                  <td className="border px-2 py-1">壁・天井下地、不燃仕様</td>
                  <td className="border px-2 py-1">JIS A 6901</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">合板仕上げ材</td>
                  <td className="border px-2 py-1">5.5〜24mm</td>
                  <td className="border px-2 py-1">床下地・壁下地</td>
                  <td className="border px-2 py-1">構造用/JAS認定品</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">塩ビタイル</td>
                  <td className="border px-2 py-1">2〜3mm</td>
                  <td className="border px-2 py-1">商業施設・病院床仕上げ</td>
                  <td className="border px-2 py-1">耐摩耗・清掃性高い</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">化粧合板</td>
                  <td className="border px-2 py-1">12〜15mm</td>
                  <td className="border px-2 py-1">収納・壁面パネル等</td>
                  <td className="border px-2 py-1">表面化粧シート貼り</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">フローリング材</td>
                  <td className="border px-2 py-1">12〜15mm</td>
                  <td className="border px-2 py-1">居室床</td>
                  <td className="border px-2 py-1">複合or無垢タイプあり</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-4">
          <h4 className="text-[13px] font-semibold mb-2">タイル・石材・左官材</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要なタイル・石材・左官材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材料種別</th>
                  <th className="border px-2 py-1 text-left">寸法・厚さ例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">磁器質タイル</td>
                  <td className="border px-2 py-1">300×300～600×600mm／厚さ9～12mm</td>
                  <td className="border px-2 py-1">外壁・床・水回り</td>
                  <td className="border px-2 py-1">吸水率1%以下／耐凍害</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">陶器質タイル</td>
                  <td className="border px-2 py-1">150角・200角など／厚さ6〜9mm</td>
                  <td className="border px-2 py-1">屋内壁・腰壁</td>
                  <td className="border px-2 py-1">吸水率大きく外部使用は注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">大理石／御影石</td>
                  <td className="border px-2 py-1">厚さ20～30mm</td>
                  <td className="border px-2 py-1">床・壁・カウンター</td>
                  <td className="border px-2 py-1">天然石／メンテナンス要確認</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">モルタル仕上げ</td>
                  <td className="border px-2 py-1">塗厚15〜25mm程度</td>
                  <td className="border px-2 py-1">壁・天井下地・意匠仕上</td>
                  <td className="border px-2 py-1">左官仕上／押さえ／掻き落とし等</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">洗い出し</td>
                  <td className="border px-2 py-1">骨材混入モルタル</td>
                  <td className="border px-2 py-1">玄関・外構床・壁</td>
                  <td className="border px-2 py-1">滑り止め効果、外部意匠性高い</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-5">
          <h4 className="text-[13px] font-semibold mb-2">内装壁・天井材</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な内装壁・天井材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材料種別</th>
                  <th className="border px-2 py-1 text-left">厚さ・規格例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">ビニールクロス</td>
                  <td className="border px-2 py-1">厚さ0.3〜0.5mm</td>
                  <td className="border px-2 py-1">居室・廊下など</td>
                  <td className="border px-2 py-1">不燃／防汚／抗菌等機能付きあり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">吸音ボード</td>
                  <td className="border px-2 py-1">600×600／600×1200mm等</td>
                  <td className="border px-2 py-1">天井・壁</td>
                  <td className="border px-2 py-1">穴あき（グラスウール＋表面紙）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">化粧石膏ボード</td>
                  <td className="border px-2 py-1">厚さ9.5／12.5mm</td>
                  <td className="border px-2 py-1">壁面・天井</td>
                  <td className="border px-2 py-1">仕上げ不要／コスト削減</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">木毛セメント板</td>
                  <td className="border px-2 py-1">厚さ15〜25mm</td>
                  <td className="border px-2 py-1">天井・壁</td>
                  <td className="border px-2 py-1">不燃材料／調湿性／耐久性あり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">不燃化粧パネル</td>
                  <td className="border px-2 py-1">3〜5mm（下地合板と併用）</td>
                  <td className="border px-2 py-1">キッチン・水回り壁面</td>
                  <td className="border px-2 py-1">メラミン化粧板／アルミ複合板など</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-6">
          <h4 className="text-[13px] font-semibold mb-2">外壁材・屋根材</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な外壁材・屋根材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材料種別</th>
                  <th className="border px-2 py-1 text-left">厚さ・寸法例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">押出成形セメント板</td>
                  <td className="border px-2 py-1">t=15〜18mm</td>
                  <td className="border px-2 py-1">外壁下地・化粧外壁</td>
                  <td className="border px-2 py-1">JIS A 5430／不燃認定／下地兼用</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">金属サイディング</td>
                  <td className="border px-2 py-1">t=12〜18mm（芯材含む）</td>
                  <td className="border px-2 py-1">外壁</td>
                  <td className="border px-2 py-1">断熱材付き鋼板／軽量</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ALCパネル</td>
                  <td className="border px-2 py-1">t=50, 75, 100mm等</td>
                  <td className="border px-2 py-1">外壁・間仕切り</td>
                  <td className="border px-2 py-1">高断熱・不燃材・軽量</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ガルバリウム鋼板</td>
                  <td className="border px-2 py-1">t=0.35〜0.5mm</td>
                  <td className="border px-2 py-1">屋根・外壁</td>
                  <td className="border px-2 py-1">耐候性／加工性良／カラー豊富</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">スレート（無石綿）</td>
                  <td className="border px-2 py-1">t=5.5〜6mm</td>
                  <td className="border px-2 py-1">屋根・外壁</td>
                  <td className="border px-2 py-1">軽量・耐水／旧アスベスト代替</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-7">
          <h4 className="text-[13px] font-semibold mb-2">天井材（システム天井含む）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な天井材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材料種別</th>
                  <th className="border px-2 py-1 text-left">寸法／厚さ例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">ロックウール吸音板</td>
                  <td className="border px-2 py-1">600×600×t15〜25mm等</td>
                  <td className="border px-2 py-1">天井吸音仕上</td>
                  <td className="border px-2 py-1">吸音・不燃・軽量</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">化粧スラグウール板</td>
                  <td className="border px-2 py-1">600×1200×t15mm</td>
                  <td className="border px-2 py-1">事務所・店舗天井</td>
                  <td className="border px-2 py-1">白色系、張替え容易</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">木目化粧合板</td>
                  <td className="border px-2 py-1">t=5.5〜12mm</td>
                  <td className="border px-2 py-1">和室・造作天井</td>
                  <td className="border px-2 py-1">無垢突板／プリントタイプあり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">アルミパンチング板</td>
                  <td className="border px-2 py-1">任意</td>
                  <td className="border px-2 py-1">意匠天井・目隠し</td>
                  <td className="border px-2 py-1">軽量・通気・モダン意匠対応</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-8">
          <h4 className="text-[13px] font-semibold mb-2">金属板材</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な金属板材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材料種別</th>
                  <th className="border px-2 py-1 text-left">厚さ・規格例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考・特徴</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">ガルバリウム鋼板</td>
                  <td className="border px-2 py-1">t=0.35〜0.5mm</td>
                  <td className="border px-2 py-1">屋根・外壁・庇・笠木</td>
                  <td className="border px-2 py-1">アルミ55%＋亜鉛メッキ、耐候・耐食性◎</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">カラー鋼板</td>
                  <td className="border px-2 py-1">t=0.27〜0.5mm</td>
                  <td className="border px-2 py-1">外壁・屋根・サイディング材</td>
                  <td className="border px-2 py-1">塗装済み鋼板（ポリエステル・フッ素系）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">フッ素樹脂鋼板</td>
                  <td className="border px-2 py-1">t=0.4〜0.5mm</td>
                  <td className="border px-2 py-1">高耐候外装・屋根</td>
                  <td className="border px-2 py-1">変色・退色に強くメンテ周期長い</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ステンレス鋼板（SUS304等）</td>
                  <td className="border px-2 py-1">t=0.3〜1.5mm</td>
                  <td className="border px-2 py-1">建具・内壁パネル・天井・水廻り</td>
                  <td className="border px-2 py-1">耐食・耐水・衛生性に優れる（鏡面/ヘアライン）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">チタン亜鉛合金板</td>
                  <td className="border px-2 py-1">t=0.7〜1.0mm</td>
                  <td className="border px-2 py-1">高級外装・ルーバー等</td>
                  <td className="border px-2 py-1">銅のような経年変化と耐久性、軽量</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">銅板</td>
                  <td className="border px-2 py-1">t=0.35〜0.6mm</td>
                  <td className="border px-2 py-1">屋根・雨樋・装飾部</td>
                  <td className="border px-2 py-1">経年で緑青が形成され重厚感</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">アルミ板</td>
                  <td className="border px-2 py-1">t=0.5〜3.0mm</td>
                  <td className="border px-2 py-1">外装ルーバー・内装パネル等</td>
                  <td className="border px-2 py-1">軽量で加工性◎、アルマイト仕上など可能</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">アルミ複合板（ACP）</td>
                  <td className="border px-2 py-1">総厚3〜4mm（中芯＋薄板）</td>
                  <td className="border px-2 py-1">内外装パネル・サイン面板等</td>
                  <td className="border px-2 py-1">芯材はポリエチレン、表裏はアルミ薄板</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">エキスパンドメタル</td>
                  <td className="border px-2 py-1">厚さ1.2〜3mm</td>
                  <td className="border px-2 py-1">天井・手摺・目隠しパネル</td>
                  <td className="border px-2 py-1">網状鋼板で軽量・透過性あり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">パンチングメタル</td>
                  <td className="border px-2 py-1">板厚1.0〜2.0mm</td>
                  <td className="border px-2 py-1">意匠天井・通気ルーバー等</td>
                  <td className="border px-2 py-1">穴径・ピッチ調整で多様なデザインが可能</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-9">
          <h4 className="text-[13px] font-semibold mb-2">塗料種別</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な塗料種別の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">塗料種別</th>
                  <th className="border px-2 py-1 text-left">主成分／系統</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">特徴・備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">アクリル樹脂塗料</td>
                  <td className="border px-2 py-1">アクリル系水性または溶剤型</td>
                  <td className="border px-2 py-1">内壁・天井（内装）</td>
                  <td className="border px-2 py-1">安価・作業性良・耐久性はやや劣る</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ウレタン樹脂塗料</td>
                  <td className="border px-2 py-1">ポリウレタン系</td>
                  <td className="border px-2 py-1">鉄部・木部・床</td>
                  <td className="border px-2 py-1">密着性・耐久性良、外装も可</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">シリコン樹脂塗料</td>
                  <td className="border px-2 py-1">シリコン変性樹脂</td>
                  <td className="border px-2 py-1">外壁・屋根・鉄部</td>
                  <td className="border px-2 py-1">耐候性良・中～長寿命</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">フッ素樹脂塗料</td>
                  <td className="border px-2 py-1">フッ素系</td>
                  <td className="border px-2 py-1">高耐候部（屋根・外装金属等）</td>
                  <td className="border px-2 py-1">耐候・耐紫外線性最高、コスト高</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">水性エマルション塗料</td>
                  <td className="border px-2 py-1">水性アクリル系</td>
                  <td className="border px-2 py-1">内装壁・天井（改修含む）</td>
                  <td className="border px-2 py-1">低臭・環境対応・作業性高</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">錆止め塗料（下塗）</td>
                  <td className="border px-2 py-1">エポキシ系・合成樹脂系</td>
                  <td className="border px-2 py-1">鉄骨・鉄部下塗り</td>
                  <td className="border px-2 py-1">防錆性・密着性高い</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">床用塗料</td>
                  <td className="border px-2 py-1">エポキシ・ポリウレタン</td>
                  <td className="border px-2 py-1">工場床・機械室・バルコニー</td>
                  <td className="border px-2 py-1">耐摩耗・耐油性重視／厚膜タイプもあり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">断熱・遮熱塗料</td>
                  <td className="border px-2 py-1">セラミック・特殊樹脂</td>
                  <td className="border px-2 py-1">屋根・外壁</td>
                  <td className="border px-2 py-1">表面温度抑制／光反射率が高い</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-10">
          <h4 className="text-[13px] font-semibold mb-2">シーリング材（シール材）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要なシーリング材の種類と用途。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材料種別</th>
                  <th className="border px-2 py-1 text-left">主成分系統</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">特徴・備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">変成シリコン系</td>
                  <td className="border px-2 py-1">1成分 or 2成分</td>
                  <td className="border px-2 py-1">外壁目地・ALC目地</td>
                  <td className="border px-2 py-1">汎用性高・塗装可・低汚染タイプあり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ポリウレタン系</td>
                  <td className="border px-2 py-1">1成分 or 2成分</td>
                  <td className="border px-2 py-1">サッシ周り・パネルジョイント</td>
                  <td className="border px-2 py-1">弾性◎・密着性高・紫外線には劣る</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">シリコン系（純シリコン）</td>
                  <td className="border px-2 py-1">1成分（非塗装用）</td>
                  <td className="border px-2 py-1">ガラス周り・水廻り</td>
                  <td className="border px-2 py-1">耐候・耐水性◎／塗装不可・汚染注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">アクリル系</td>
                  <td className="border px-2 py-1">1成分（内装用）</td>
                  <td className="border px-2 py-1">壁内装目地・隙間補修</td>
                  <td className="border px-2 py-1">安価・内装専用・耐水性は劣る</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ポリサルファイド系</td>
                  <td className="border px-2 py-1">2成分硬化型</td>
                  <td className="border px-2 py-1">構造目地・防水目地</td>
                  <td className="border px-2 py-1">高強度・耐薬品・耐油性あり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ブチルゴム系</td>
                  <td className="border px-2 py-1">テープ状</td>
                  <td className="border px-2 py-1">仮設目地・防水下地補助</td>
                  <td className="border px-2 py-1">初期接着力強・施工性高／非硬化</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-11">
          <h4 className="text-[13px] font-semibold mb-2">主要断熱材一覧（熱伝導率 λ：W/m･K）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な断熱材の熱伝導率と用途。実設計ではメーカー資料・仕様書を確認してください。熱伝導率（λ）は値が小さいほど断熱性能が高い。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材料区分</th>
                  <th className="border px-2 py-1 text-left">材料名</th>
                  <th className="border px-2 py-1 text-left">規格・密度</th>
                  <th className="border px-2 py-1 text-left">熱伝導率 (λ)</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">長所</th>
                  <th className="border px-2 py-1 text-left">短所・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1" rowSpan={3}>無機繊維系</td>
                  <td className="border px-2 py-1">グラスウール</td>
                  <td className="border px-2 py-1">10K〜38K</td>
                  <td className="border px-2 py-1">0.038〜0.045</td>
                  <td className="border px-2 py-1">木造壁・天井・間仕切り</td>
                  <td className="border px-2 py-1">安価・不燃・吸音性◎</td>
                  <td className="border px-2 py-1">施工不良で性能低下／吸湿注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">高性能グラスウール</td>
                  <td className="border px-2 py-1">16K〜24K</td>
                  <td className="border px-2 py-1">0.032〜0.036</td>
                  <td className="border px-2 py-1">省エネ住宅・ZEH</td>
                  <td className="border px-2 py-1">断熱性良・価格手頃</td>
                  <td className="border px-2 py-1">厚み必要／気流止め必須</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ロックウール</td>
                  <td className="border px-2 py-1">40K〜80K</td>
                  <td className="border px-2 py-1">0.038〜0.044</td>
                  <td className="border px-2 py-1">外壁・屋根・耐火被覆</td>
                  <td className="border px-2 py-1">不燃・耐火性能◎</td>
                  <td className="border px-2 py-1">GWより高価</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1" rowSpan={4}>発泡プラスチック系</td>
                  <td className="border px-2 py-1">押出法ポリスチレンフォーム（XPS）</td>
                  <td className="border px-2 py-1">1種〜3種</td>
                  <td className="border px-2 py-1">0.028〜0.032</td>
                  <td className="border px-2 py-1">床下・基礎外断熱</td>
                  <td className="border px-2 py-1">水に強い・軽量</td>
                  <td className="border px-2 py-1">防火注意（準不燃まで）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ビーズ法ポリスチレンフォーム（EPS）</td>
                  <td className="border px-2 py-1">A種〜B種</td>
                  <td className="border px-2 py-1">0.032〜0.038</td>
                  <td className="border px-2 py-1">外断熱・屋根断熱</td>
                  <td className="border px-2 py-1">耐水◎・コスパ良</td>
                  <td className="border px-2 py-1">XPSより断熱性劣る</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">硬質ウレタンフォーム（PUF）</td>
                  <td className="border px-2 py-1">65〜80kg/m³</td>
                  <td className="border px-2 py-1">0.020〜0.024</td>
                  <td className="border px-2 py-1">屋根・壁・吹付断熱</td>
                  <td className="border px-2 py-1">λが最小・隙間無施工</td>
                  <td className="border px-2 py-1">施工者技術差あり／耐火処理要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">現場発泡ウレタン</td>
                  <td className="border px-2 py-1">―</td>
                  <td className="border px-2 py-1">0.020〜0.024</td>
                  <td className="border px-2 py-1">既存改修・木造全般</td>
                  <td className="border px-2 py-1">気密性能◎</td>
                  <td className="border px-2 py-1">厚み管理・硬化熱管理が必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">木質系</td>
                  <td className="border px-2 py-1">セルロースファイバー</td>
                  <td className="border px-2 py-1">―</td>
                  <td className="border px-2 py-1">0.040〜0.045</td>
                  <td className="border px-2 py-1">壁・天井</td>
                  <td className="border px-2 py-1">調湿性・吸音性◎</td>
                  <td className="border px-2 py-1">施工費高・乾燥管理</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">無機材</td>
                  <td className="border px-2 py-1">カルシウムシリケート（不燃）</td>
                  <td className="border px-2 py-1">20〜50mm</td>
                  <td className="border px-2 py-1">0.050〜0.065</td>
                  <td className="border px-2 py-1">機械室・高温部</td>
                  <td className="border px-2 py-1">耐熱性◎</td>
                  <td className="border px-2 py-1">重量あり・高価</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1" rowSpan={2}>設備断熱</td>
                  <td className="border px-2 py-1">発泡ゴム断熱（Armaflex等）</td>
                  <td className="border px-2 py-1">9〜32mm</td>
                  <td className="border px-2 py-1">0.033〜0.037</td>
                  <td className="border px-2 py-1">冷媒・冷水管</td>
                  <td className="border px-2 py-1">結露防止◎・柔軟</td>
                  <td className="border px-2 py-1">厚み管理重要／紫外線NG</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">PEフォーム（ポリエチレン）</td>
                  <td className="border px-2 py-1">10〜25mm</td>
                  <td className="border px-2 py-1">0.040〜0.045</td>
                  <td className="border px-2 py-1">給水・給湯</td>
                  <td className="border px-2 py-1">軽量・安価</td>
                  <td className="border px-2 py-1">高温に弱い（給湯不可も）</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-11a">
          <h4 className="text-[13px] font-semibold mb-2">LGS（軽量鉄骨天井・壁下地）規格（JIS A 6517）</h4>
          <p className="text-[11px] text-gray-500 mb-2">日本のJIS規格（JIS A 6517）に基づいた、代表的なLGS（壁・天井）の一覧表。実設計ではメーカー資料・仕様書を確認してください。※JIS材か一般材（JIS外）かの確認も重要です。</p>
          
          <div className="mb-4">
            <h5 className="text-[12px] font-semibold mb-2 mt-4">1. 壁下地材（LGS：Light Gauge Steel）</h5>
            <p className="text-[11px] text-gray-500 mb-2">主に間仕切り壁の骨組みに使用される材料です。</p>
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full border text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border px-2 py-1 text-left">材料種別</th>
                    <th className="border px-2 py-1 text-left">規格（主なサイズ）</th>
                    <th className="border px-2 py-1 text-left">主な用途</th>
                    <th className="border px-2 py-1 text-left">備考・特徴</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-2 py-1"><strong>スタッド (C形)</strong></td>
                    <td className="border px-2 py-1">50 / 65 / 75 / 90 / 100 × 45mm (t=0.8mm)</td>
                    <td className="border px-2 py-1">一般間仕切り壁の縦材</td>
                    <td className="border px-2 py-1">高さに応じてサイズを選択。高所は100型など。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>ランナー (U形)</strong></td>
                    <td className="border px-2 py-1">50 / 65 / 75 / 90 / 100 × 40mm (t=0.8mm)</td>
                    <td className="border px-2 py-1">壁の上下に固定する受け材</td>
                    <td className="border px-2 py-1">スタッドのサイズに合わせて選択。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>振れ止め</strong></td>
                    <td className="border px-2 py-1">25 × 10 × 2.0mm / 1.2mm</td>
                    <td className="border px-2 py-1">スタッドのねじれ防止材</td>
                    <td className="border px-2 py-1">スタッドの中段（1200mmピッチ以下）に通す。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>スペーサー</strong></td>
                    <td className="border px-2 py-1">各スタッドサイズに対応</td>
                    <td className="border px-2 py-1">スタッドと振れ止めの固定</td>
                    <td className="border px-2 py-1">スタッドのピッチ（300/450/600mm）に合わせる。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>補強チャネル</strong></td>
                    <td className="border px-2 py-1">38 × 12 × 1.2mm</td>
                    <td className="border px-2 py-1">ドア枠周りや重量物取付</td>
                    <td className="border px-2 py-1">開口部の補強や、強度が求められる箇所に使用。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-4">
            <h5 className="text-[12px] font-semibold mb-2 mt-4">2. 天井下地材（LGS：野縁）</h5>
            <p className="text-[11px] text-gray-500 mb-2">天井の仕上げ材を貼るための骨組みです。</p>
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full border text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border px-2 py-1 text-left">材料種別</th>
                    <th className="border px-2 py-1 text-left">規格（主なサイズ）</th>
                    <th className="border px-2 py-1 text-left">主な用途</th>
                    <th className="border px-2 py-1 text-left">備考・特徴</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-2 py-1"><strong>シングル野縁 (U形)</strong></td>
                    <td className="border px-2 py-1">25 × 19 × 0.5mm (M-S)</td>
                    <td className="border px-2 py-1">一般的な天井の受け材</td>
                    <td className="border px-2 py-1">ボードの継ぎ目以外で使用。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>ダブル野縁 (U形)</strong></td>
                    <td className="border px-2 py-1">50 × 19 × 0.5mm (M-D)</td>
                    <td className="border px-2 py-1">ボードの継ぎ目用受け材</td>
                    <td className="border px-2 py-1">ボードのジョイント部分でビスを2列打つ用。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>野縁受け (C形)</strong></td>
                    <td className="border px-2 py-1">38 × 12 × 1.2mm (C-38)</td>
                    <td className="border px-2 py-1">野縁を支持する主軸材</td>
                    <td className="border px-2 py-1">吊りボルトからハンガーで吊るされる。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>吊りボルト</strong></td>
                    <td className="border px-2 py-1">W3/8（3分ボルト）</td>
                    <td className="border px-2 py-1">天井全体を吊り下げる</td>
                    <td className="border px-2 py-1">インサート等に固定し、天井荷重を支える。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>ハンガー</strong></td>
                    <td className="border px-2 py-1">各サイズ用</td>
                    <td className="border px-2 py-1">野縁受けとボルトを接続</td>
                    <td className="border px-2 py-1">施工箇所により防振ハンガー等も使い分ける。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>クリップ</strong></td>
                    <td className="border px-2 py-1">シングル用 / ダブル用</td>
                    <td className="border px-2 py-1">野縁と野縁受けを固定</td>
                    <td className="border px-2 py-1">ワンタッチでパチンと留めるのが一般的。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-4">
            <h5 className="text-[12px] font-semibold mb-2 mt-4">3. 特殊・高機能下地</h5>
            <p className="text-[11px] text-gray-500 mb-2">耐火や遮音、高所対応などで使用される特殊な規格です。</p>
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full border text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border px-2 py-1 text-left">材料種別</th>
                    <th className="border px-2 py-1 text-left">特徴・システム</th>
                    <th className="border px-2 py-1 text-left">主な用途</th>
                    <th className="border px-2 py-1 text-left">備考</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-2 py-1"><strong>高耐食下地</strong></td>
                    <td className="border px-2 py-1">溶融亜鉛スズ・マグネシウムめっき</td>
                    <td className="border px-2 py-1">プール・厨房・半屋外</td>
                    <td className="border px-2 py-1">サビに強く、湿気の多い場所に最適。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>SQバー (角スタッド)</strong></td>
                    <td className="border px-2 py-1">50 × 19 / 60 × 30 など</td>
                    <td className="border px-2 py-1">高い剛性が求められる天井</td>
                    <td className="border px-2 py-1">体育館や天井が高いエントランスなど。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>耐震天井用部材</strong></td>
                    <td className="border px-2 py-1">ブレース、高剛性クリップ</td>
                    <td className="border px-2 py-1">大規模空間の脱落防止</td>
                    <td className="border px-2 py-1">震災対策用。通常のLGSより部材が厚く、数が多い。</td>
                  </tr>
                  <tr>
                    <td className="border px-2 py-1"><strong>遮音スタッド</strong></td>
                    <td className="border px-2 py-1">特殊断面スタッド（ハット形等）</td>
                    <td className="border px-2 py-1">映画館、集合住宅の戸境壁</td>
                    <td className="border px-2 py-1">音の振動を伝えにくい形状になっている。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 構造セクション */}
        <div id="section-12">
          <h4 className="text-[13px] font-semibold mb-2">鉄筋（異形棒鋼：JIS G 3112）</h4>
          <p className="text-[11px] text-gray-500 mb-2">代表的な呼び径と用途目安。実設計では図面・仕様書・メーカー資料を必ず確認してください。構造計算上は設計基準強度（fsy）および設計引張強度（ft）も要確認。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼び</th>
                  <th className="border px-2 py-1 text-left">公称径 (mm)</th>
                  <th className="border px-2 py-1 text-left">断面積 (mm²)</th>
                  <th className="border px-2 py-1 text-left">単位重量 (kg/m)</th>
                  <th className="border px-2 py-1 text-left">強度区分</th>
                  <th className="border px-2 py-1 text-left">降伏強度 (N/mm²)</th>
                  <th className="border px-2 py-1 text-left">主な適用構造</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">D10</td>
                  <td className="border px-2 py-1">9.53</td>
                  <td className="border px-2 py-1">71</td>
                  <td className="border px-2 py-1">0.560</td>
                  <td className="border px-2 py-1">SD295A</td>
                  <td className="border px-2 py-1">295</td>
                  <td className="border px-2 py-1">スラブ・壁配筋・軽構造補強筋</td>
                  <td className="border px-2 py-1">曲げ施工性が良い</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">D13</td>
                  <td className="border px-2 py-1">12.7</td>
                  <td className="border px-2 py-1">127</td>
                  <td className="border px-2 py-1">0.995</td>
                  <td className="border px-2 py-1">SD295A/B</td>
                  <td className="border px-2 py-1">295</td>
                  <td className="border px-2 py-1">スラブ主筋・耐力壁補強筋</td>
                  <td className="border px-2 py-1">Bは溶接性が高い</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">D16</td>
                  <td className="border px-2 py-1">15.9</td>
                  <td className="border px-2 py-1">198</td>
                  <td className="border px-2 py-1">1.56</td>
                  <td className="border px-2 py-1">SD345</td>
                  <td className="border px-2 py-1">345</td>
                  <td className="border px-2 py-1">梁帯筋・柱帯筋・中規模構造部主筋</td>
                  <td className="border px-2 py-1">鉄筋コンクリート梁・柱に常用</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">D22</td>
                  <td className="border px-2 py-1">22.2</td>
                  <td className="border px-2 py-1">387</td>
                  <td className="border px-2 py-1">3.04</td>
                  <td className="border px-2 py-1">SD345</td>
                  <td className="border px-2 py-1">345</td>
                  <td className="border px-2 py-1">柱主筋・梁主筋・基礎梁</td>
                  <td className="border px-2 py-1">降伏強度と伸び性能のバランス</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">D32</td>
                  <td className="border px-2 py-1">31.8</td>
                  <td className="border px-2 py-1">794</td>
                  <td className="border px-2 py-1">6.31</td>
                  <td className="border px-2 py-1">SD390</td>
                  <td className="border px-2 py-1">390</td>
                  <td className="border px-2 py-1">大スパン梁・耐震壁主筋</td>
                  <td className="border px-2 py-1">曲げ耐力設計時に有効</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-13">
          <h4 className="text-[13px] font-semibold mb-2">H形鋼（JIS G 3192 / 材質：JIS G 3101 SS400, JIS G 3136 SN490等）</h4>
          <p className="text-[11px] text-gray-500 mb-2">代表的な呼称例。実寸・断面性能はカタログ値を参照してください。Ix：主軸方向の断面二次モーメント、構造設計時の曲げ剛性に関与。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼称 (H×B×tw×tf mm)</th>
                  <th className="border px-2 py-1 text-left">重量 (kg/m)</th>
                  <th className="border px-2 py-1 text-left">断面性能 Ix(cm⁴)</th>
                  <th className="border px-2 py-1 text-left">適用構造</th>
                  <th className="border px-2 py-1 text-left">材質例</th>
                  <th className="border px-2 py-1 text-left">注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">H-150×150×7×10</td>
                  <td className="border px-2 py-1">31.1</td>
                  <td className="border px-2 py-1">約1210</td>
                  <td className="border px-2 py-1">一般柱・梁</td>
                  <td className="border px-2 py-1">SS400/SN400B</td>
                  <td className="border px-2 py-1">曲げ剛性良好／小中規模鉄骨造</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">H-200×200×8×12</td>
                  <td className="border px-2 py-1">49.9</td>
                  <td className="border px-2 py-1">約2950</td>
                  <td className="border px-2 py-1">柱・梁（中規模）</td>
                  <td className="border px-2 py-1">SN490B</td>
                  <td className="border px-2 py-1">軸力設計時は局部座屈に注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">H-300×150×6.5×9</td>
                  <td className="border px-2 py-1">36.3</td>
                  <td className="border px-2 py-1">約3300</td>
                  <td className="border px-2 py-1">大梁・門型ラーメン</td>
                  <td className="border px-2 py-1">SS400</td>
                  <td className="border px-2 py-1">梁成・梁幅バランス注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">H-400×200×8×13</td>
                  <td className="border px-2 py-1">66.2</td>
                  <td className="border px-2 py-1">約7920</td>
                  <td className="border px-2 py-1">主梁・耐震架構</td>
                  <td className="border px-2 py-1">SN490B</td>
                  <td className="border px-2 py-1">施工時の搬入・接合条件確認</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">H-588×300×12×20</td>
                  <td className="border px-2 py-1">151</td>
                  <td className="border px-2 py-1">約38000</td>
                  <td className="border px-2 py-1">高層柱・大スパン梁</td>
                  <td className="border px-2 py-1">SN490C等</td>
                  <td className="border px-2 py-1">高力ボルト接合／現場溶接部の熱影響管理</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-14">
          <h4 className="text-[13px] font-semibold mb-2">六角ボルト（JIS B 1180・JIS B 1051）</h4>
          <p className="text-[11px] text-gray-500 mb-2">並目ねじの代表値。二面幅（SW）は一般的なスパナサイズ。</p>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-[560px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼び (M)</th>
                  <th className="border px-2 py-1 text-left">ピッチ (mm)</th>
                  <th className="border px-2 py-1 text-left">二面幅 SW (mm)</th>
                  <th className="border px-2 py-1 text-left">頭部高さ k (参考)</th>
                  <th className="border px-2 py-1 text-left">強度区分 例</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">M8</td>
                  <td className="border px-2 py-1">1.25</td>
                  <td className="border px-2 py-1">13</td>
                  <td className="border px-2 py-1">5.3</td>
                  <td className="border px-2 py-1">8.8 / 10.9</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M10</td>
                  <td className="border px-2 py-1">1.5</td>
                  <td className="border px-2 py-1">17</td>
                  <td className="border px-2 py-1">6.4</td>
                  <td className="border px-2 py-1">8.8 / 10.9</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M12</td>
                  <td className="border px-2 py-1">1.75</td>
                  <td className="border px-2 py-1">19</td>
                  <td className="border px-2 py-1">7.5</td>
                  <td className="border px-2 py-1">8.8 / 10.9</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M16</td>
                  <td className="border px-2 py-1">2.0</td>
                  <td className="border px-2 py-1">24</td>
                  <td className="border px-2 py-1">10.0</td>
                  <td className="border px-2 py-1">8.8 / 10.9</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M20</td>
                  <td className="border px-2 py-1">2.5</td>
                  <td className="border px-2 py-1">30</td>
                  <td className="border px-2 py-1">12.5</td>
                  <td className="border px-2 py-1">8.8 / 10.9</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="overflow-x-auto">
              <table className="min-w-[420px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                    <th className="border px-2 py-1 text-left">呼び (M)</th>
                    <th className="border px-2 py-1 text-left">標準穴径 (mm)</th>
                </tr>
              </thead>
              <tbody>
                  <tr><td className="border px-2 py-1">M8</td><td className="border px-2 py-1">9</td></tr>
                  <tr><td className="border px-2 py-1">M10</td><td className="border px-2 py-1">11</td></tr>
                  <tr><td className="border px-2 py-1">M12</td><td className="border px-2 py-1">13</td></tr>
                  <tr><td className="border px-2 py-1">M16</td><td className="border px-2 py-1">18</td></tr>
                  <tr><td className="border px-2 py-1">M20</td><td className="border px-2 py-1">22</td></tr>
                  <tr><td className="border px-2 py-1">M24</td><td className="border px-2 py-1">26</td></tr>
                </tbody>
              </table>
        </div>
          <div className="overflow-x-auto">
            <table className="min-w-[520px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                    <th className="border px-2 py-1 text-left">呼び (M)</th>
                    <th className="border px-2 py-1 text-left">内径 d (mm)</th>
                    <th className="border px-2 py-1 text-left">外径 D (mm)</th>
                    <th className="border px-2 py-1 text-left">厚さ t (mm)</th>
                </tr>
              </thead>
              <tbody>
                  <tr><td className="border px-2 py-1">M8</td><td className="border px-2 py-1">8.4</td><td className="border px-2 py-1">16</td><td className="border px-2 py-1">1.6</td></tr>
                  <tr><td className="border px-2 py-1">M10</td><td className="border px-2 py-1">10.5</td><td className="border px-2 py-1">20</td><td className="border px-2 py-1">2.0</td></tr>
                  <tr><td className="border px-2 py-1">M12</td><td className="border px-2 py-1">13.0</td><td className="border px-2 py-1">24</td><td className="border px-2 py-1">2.5</td></tr>
                  <tr><td className="border px-2 py-1">M16</td><td className="border px-2 py-1">17.0</td><td className="border px-2 py-1">30</td><td className="border px-2 py-1">3.0</td></tr>
                  <tr><td className="border px-2 py-1">M20</td><td className="border px-2 py-1">21.0</td><td className="border px-2 py-1">37</td><td className="border px-2 py-1">3.0</td></tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>

        <div id="section-15">
          <h4 className="text-[13px] font-semibold mb-2">鋼板類（JIS G 3101, G 3136 他）</h4>
          <p className="text-[11px] text-gray-500 mb-2">よく使う呼び厚の早見。材質により取り合い・在庫は異なります。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼び厚 (t mm)</th>
                  <th className="border px-2 py-1 text-left">用途分類</th>
                  <th className="border px-2 py-1 text-left">主な構造用途</th>
                  <th className="border px-2 py-1 text-left">材質例</th>
                  <th className="border px-2 py-1 text-left">加工・施工上の注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">4.5</td>
                  <td className="border px-2 py-1">ブラケット・補剛板</td>
                  <td className="border px-2 py-1">柱梁接合部補強、座金補強</td>
                  <td className="border px-2 py-1">SS400</td>
                  <td className="border px-2 py-1">曲げ・溶接可、穴加工精度に注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">6.0〜9.0</td>
                  <td className="border px-2 py-1">ベースプレート・仕口</td>
                  <td className="border px-2 py-1">柱脚・柱頭プレート、梁接合部</td>
                  <td className="border px-2 py-1">SS400/SN400</td>
                  <td className="border px-2 py-1">剛性確保・アンカー座面との整合性必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">12.0〜16.0</td>
                  <td className="border px-2 py-1">柱脚基礎部プレート</td>
                  <td className="border px-2 py-1">高耐力柱脚・架台基礎</td>
                  <td className="border px-2 py-1">SS400/SN490</td>
                  <td className="border px-2 py-1">精密な穴開け／余盛溶接・開先加工必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">19.0〜25.0</td>
                  <td className="border px-2 py-1">高強度ベース・アンカー用</td>
                  <td className="border px-2 py-1">耐震架構・大型工作機据付</td>
                  <td className="border px-2 py-1">SN490C</td>
                  <td className="border px-2 py-1">製作図段階で孔加工と溶接方法の指定が必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">32.0以上</td>
                  <td className="border px-2 py-1">特殊架構・支承部</td>
                  <td className="border px-2 py-1">ブレース接合・ピン支点構造部等</td>
                  <td className="border px-2 py-1">SM570等</td>
                  <td className="border px-2 py-1">超厚板は開先・後処理・非破壊検査必要</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-16">
          <h4 className="text-[13px] font-semibold mb-2">鉄筋 断面積・単位重量 早見（参考）</h4>
          <p className="text-[11px] text-gray-500 mb-2">概算値。実務ではメーカー資料・構造計算書を確認してください。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼び</th>
                  <th className="border px-2 py-1 text-left">公称径 d (mm)</th>
                  <th className="border px-2 py-1 text-left">断面積 (mm²)</th>
                  <th className="border px-2 py-1 text-left">単位重量 (kg/m)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border px-2 py-1">D10</td><td className="border px-2 py-1">9.53</td><td className="border px-2 py-1">71</td><td className="border px-2 py-1">0.560</td></tr>
                <tr><td className="border px-2 py-1">D13</td><td className="border px-2 py-1">12.7</td><td className="border px-2 py-1">127</td><td className="border px-2 py-1">0.995</td></tr>
                <tr><td className="border px-2 py-1">D16</td><td className="border px-2 py-1">15.9</td><td className="border px-2 py-1">198</td><td className="border px-2 py-1">1.56</td></tr>
                <tr><td className="border px-2 py-1">D19</td><td className="border px-2 py-1">19.1</td><td className="border px-2 py-1">286</td><td className="border px-2 py-1">2.25</td></tr>
                <tr><td className="border px-2 py-1">D22</td><td className="border px-2 py-1">22.2</td><td className="border px-2 py-1">387</td><td className="border px-2 py-1">3.04</td></tr>
                <tr><td className="border px-2 py-1">D25</td><td className="border px-2 py-1">25.4</td><td className="border px-2 py-1">507</td><td className="border px-2 py-1">3.98</td></tr>
                <tr><td className="border px-2 py-1">D29</td><td className="border px-2 py-1">28.6</td><td className="border px-2 py-1">643</td><td className="border px-2 py-1">5.04</td></tr>
                <tr><td className="border px-2 py-1">D32</td><td className="border px-2 py-1">31.8</td><td className="border px-2 py-1">794</td><td className="border px-2 py-1">6.31</td></tr>
                <tr><td className="border px-2 py-1">D35</td><td className="border px-2 py-1">35.0</td><td className="border px-2 py-1">962</td><td className="border px-2 py-1">7.99</td></tr>
                <tr><td className="border px-2 py-1">D38</td><td className="border px-2 py-1">38.1</td><td className="border px-2 py-1">1140</td><td className="border px-2 py-1">9.89</td></tr>
                <tr><td className="border px-2 py-1">D41</td><td className="border px-2 py-1">41.3</td><td className="border px-2 py-1">1330</td><td className="border px-2 py-1">12.0</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-17">
          <h4 className="text-[13px] font-semibold mb-2">等辺山形鋼（L形） 代表例</h4>
          <div className="overflow-x-auto">
            <table className="min-w-[520px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼称 (L×L×t)</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border px-2 py-1">40×40×4</td><td className="border px-2 py-1">軽補強・当て板</td></tr>
                <tr><td className="border px-2 py-1">50×50×5</td><td className="border px-2 py-1">ブラケット・補強</td></tr>
                <tr><td className="border px-2 py-1">65×65×6</td><td className="border px-2 py-1">小梁・補剛</td></tr>
                <tr><td className="border px-2 py-1">75×75×6</td><td className="border px-2 py-1">一般補強</td></tr>
                <tr><td className="border px-2 py-1">90×90×7</td><td className="border px-2 py-1">梁端補強 等</td></tr>
                <tr><td className="border px-2 py-1">100×100×9</td><td className="border px-2 py-1">柱梁接合部補強</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-18">
          <h4 className="text-[13px] font-semibold mb-2">溝形鋼（C形鋼） 代表例</h4>
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼称</th>
                  <th className="border px-2 py-1 text-left">寸法 (h×b×t<wbr/>w×t<wbr/>f) mm</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border px-2 py-1">C-75×40</td><td className="border px-2 py-1">75×40×5.0×7.0</td><td className="border px-2 py-1">軽フレーム</td></tr>
                <tr><td className="border px-2 py-1">C-100×50</td><td className="border px-2 py-1">100×50×5.0×7.5</td><td className="border px-2 py-1">母屋・小梁</td></tr>
                <tr><td className="border px-2 py-1">C-125×65</td><td className="border px-2 py-1">125×65×6.0×8.0</td><td className="border px-2 py-1">梁補強</td></tr>
                <tr><td className="border px-2 py-1">C-150×75</td><td className="border px-2 py-1">150×75×6.5×10</td><td className="border px-2 py-1">梁</td></tr>
                <tr><td className="border px-2 py-1">C-200×80</td><td className="border px-2 py-1">200×80×7.5×11</td><td className="border px-2 py-1">主梁・補剛</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-19">
          <h4 className="text-[13px] font-semibold mb-2">角形・矩形鋼管（JIS G 3466 STKR 代表）</h4>
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼称</th>
                  <th className="border px-2 py-1 text-left">外法寸法 (mm)</th>
                  <th className="border px-2 py-1 text-left">板厚 t (mm)</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border px-2 py-1">□50×50×2.3</td><td className="border px-2 py-1">50×50</td><td className="border px-2 py-1">2.3</td><td className="border px-2 py-1">軽鉄骨・手摺</td></tr>
                <tr><td className="border px-2 py-1">□75×75×3.2</td><td className="border px-2 py-1">75×75</td><td className="border px-2 py-1">3.2</td><td className="border px-2 py-1">柱・架台</td></tr>
                <tr><td className="border px-2 py-1">□100×100×4.5</td><td className="border px-2 py-1">100×100</td><td className="border px-2 py-1">4.5</td><td className="border px-2 py-1">柱</td></tr>
                <tr><td className="border px-2 py-1">■50×100×2.3</td><td className="border px-2 py-1">50×100</td><td className="border px-2 py-1">2.3</td><td className="border px-2 py-1">梁・笠木下地</td></tr>
                <tr><td className="border px-2 py-1">■100×150×3.2</td><td className="border px-2 py-1">100×150</td><td className="border px-2 py-1">3.2</td><td className="border px-2 py-1">門柱・梁</td></tr>
                <tr><td className="border px-2 py-1">■125×250×4.5</td><td className="border px-2 py-1">125×250</td><td className="border px-2 py-1">4.5</td><td className="border px-2 py-1">大梁・フレーム</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-20">
          <h4 className="text-[13px] font-semibold mb-2">高力ボルト（JIS B 1186 等）</h4>
          <p className="text-[11px] text-gray-500 mb-2">高力ボルトの代表例。F8T: 降伏強度785MPa／引張強度1000MPa相当、予め軸力管理が必要（トルク・回転法）。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼び径 (M)</th>
                  <th className="border px-2 py-1 text-left">二面幅 SW (mm)</th>
                  <th className="border px-2 py-1 text-left">頭部高さ k (mm)</th>
                  <th className="border px-2 py-1 text-left">強度区分</th>
                  <th className="border px-2 py-1 text-left">破断荷重 (kN)</th>
                  <th className="border px-2 py-1 text-left">適用例</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">M16</td>
                  <td className="border px-2 py-1">24</td>
                  <td className="border px-2 py-1">約10.0</td>
                  <td className="border px-2 py-1">F8T</td>
                  <td className="border px-2 py-1">約147</td>
                  <td className="border px-2 py-1">一般柱梁接合、高力フランジ</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M20</td>
                  <td className="border px-2 py-1">30</td>
                  <td className="border px-2 py-1">約12.5</td>
                  <td className="border px-2 py-1">F8T</td>
                  <td className="border px-2 py-1">約230</td>
                  <td className="border px-2 py-1">大梁接合、十字仕口</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M22</td>
                  <td className="border px-2 py-1">32</td>
                  <td className="border px-2 py-1">約14.0</td>
                  <td className="border px-2 py-1">F10T</td>
                  <td className="border px-2 py-1">約300</td>
                  <td className="border px-2 py-1">耐震仕口、大型接合部</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M24</td>
                  <td className="border px-2 py-1">36</td>
                  <td className="border px-2 py-1">約15.0</td>
                  <td className="border px-2 py-1">F10T</td>
                  <td className="border px-2 py-1">約355</td>
                  <td className="border px-2 py-1">高層構造柱脚</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-21">
          <h4 className="text-[13px] font-semibold mb-2">座金・ナット（対応規格）</h4>
          <p className="text-[11px] text-gray-500 mb-2">高力ボルト用座金・ナットの代表例。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼び径 (M)</th>
                  <th className="border px-2 py-1 text-left">座金外径 D (mm)</th>
                  <th className="border px-2 py-1 text-left">厚さ t (mm)</th>
                  <th className="border px-2 py-1 text-left">ナット高さ (mm)</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">M16</td>
                  <td className="border px-2 py-1">32</td>
                  <td className="border px-2 py-1">3.2</td>
                  <td className="border px-2 py-1">約14</td>
                  <td className="border px-2 py-1">ばね座金は不可（摩擦接合）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M20</td>
                  <td className="border px-2 py-1">40</td>
                  <td className="border px-2 py-1">4.0</td>
                  <td className="border px-2 py-1">約17</td>
                  <td className="border px-2 py-1">スペーサー併用時は組合せ注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">M24</td>
                  <td className="border px-2 py-1">48</td>
                  <td className="border px-2 py-1">5.0</td>
                  <td className="border px-2 py-1">約19</td>
                  <td className="border px-2 py-1">垂直部・摩擦面に錆止め禁止</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-22">
          <h4 className="text-[13px] font-semibold mb-2">アンカーボルト（定着材）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要なアンカーボルトの種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">種別</th>
                  <th className="border px-2 py-1 text-left">規格</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">特徴・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">J型アンカー</td>
                  <td className="border px-2 py-1">SD295A/D16〜D25</td>
                  <td className="border px-2 py-1">柱脚ベース、仮設基礎</td>
                  <td className="border px-2 py-1">コンクリート埋込み／定着長確保が必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ストレート型</td>
                  <td className="border px-2 py-1">S45C、M20〜M30</td>
                  <td className="border px-2 py-1">重機架台・ベース接合</td>
                  <td className="border px-2 py-1">長ナット併用やスリーブ納まり注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ケミカルアンカー</td>
                  <td className="border px-2 py-1">M12〜M24</td>
                  <td className="border px-2 py-1">改修・耐震補強</td>
                  <td className="border px-2 py-1">孔清掃・樹脂注入管理・施工温度管理必要</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-23">
          <h4 className="text-[13px] font-semibold mb-2">コンクリート（設計基準強度・材料特性）</h4>
          <p className="text-[11px] text-gray-500 mb-2">スランプは部材形状・配筋密度による。自己充填コンクリート（SCC）は別途性能試験必要。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">呼び強度 (Fc)</th>
                  <th className="border px-2 py-1 text-left">推奨スランプ (cm)</th>
                  <th className="border px-2 py-1 text-left">用途例</th>
                  <th className="border px-2 py-1 text-left">設計上の留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">18N/mm²</td>
                  <td className="border px-2 py-1">12～15</td>
                  <td className="border px-2 py-1">小規模住宅・基礎</td>
                  <td className="border px-2 py-1">打設性優先、冬期は寒中対策要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">21N/mm²</td>
                  <td className="border px-2 py-1">15～18</td>
                  <td className="border px-2 py-1">一般RC建築（柱・梁・スラブ）</td>
                  <td className="border px-2 py-1">標準配合、W/C&lt;60%、骨材サイズ調整が必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">24N/mm²</td>
                  <td className="border px-2 py-1">15～18</td>
                  <td className="border px-2 py-1">耐震壁・高支持力基礎</td>
                  <td className="border px-2 py-1">高流動性可（AE減水剤・高性能減水剤使用）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">27〜30N/mm²</td>
                  <td className="border px-2 py-1">18〜21</td>
                  <td className="border px-2 py-1">高耐久性部位・高層RC</td>
                  <td className="border px-2 py-1">材令強度管理、緻密性と養生重要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">36N/mm²以上</td>
                  <td className="border px-2 py-1">設計条件による</td>
                  <td className="border px-2 py-1">構造スリム化、特殊梁・柱等</td>
                  <td className="border px-2 py-1">材料費増加、試験体成形・現場品質管理厳格化</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-24">
          <h4 className="text-[13px] font-semibold mb-2">耐震補強・補強材（RC・SRC・S造共通）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な耐震補強工法と補強材の種類。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">補強工法</th>
                  <th className="border px-2 py-1 text-left">補強材種類</th>
                  <th className="border px-2 py-1 text-left">適用構造</th>
                  <th className="border px-2 py-1 text-left">特徴・留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">鋼板巻き立て補強</td>
                  <td className="border px-2 py-1">t=6〜12mm鋼板（SS400等）</td>
                  <td className="border px-2 py-1">RC柱・梁補強</td>
                  <td className="border px-2 py-1">接着系（エポキシ）＋アンカー固定必須</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">CFRPシート補強</td>
                  <td className="border px-2 py-1">炭素繊維＋エポキシ樹脂</td>
                  <td className="border px-2 py-1">耐震壁・柱・梁補強</td>
                  <td className="border px-2 py-1">引張方向有効／重ね幅・終端処理重要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">あと施工アンカー接合</td>
                  <td className="border px-2 py-1">ケミカル系／拡張機械系</td>
                  <td className="border px-2 py-1">各種部材追加・耐震金物</td>
                  <td className="border px-2 py-1">孔径・穿孔深さ・清掃・設計引張荷重厳守</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">鋼製ブレース補強</td>
                  <td className="border px-2 py-1">H鋼・角パイプ・プレート</td>
                  <td className="border px-2 py-1">フレーム・開口補強</td>
                  <td className="border px-2 py-1">剛性配分／躯体応力再検討必要</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 機械セクション */}
        <div id="section-25">
          <h4 className="text-[13px] font-semibold mb-2">給排水・衛生配管材</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な給排水・衛生配管材の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">配管種別</th>
                  <th className="border px-2 py-1 text-left">規格／呼び径例 (mm)</th>
                  <th className="border px-2 py-1 text-left">用途</th>
                  <th className="border px-2 py-1 text-left">特徴・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">SGP鋼管（白／黒）</td>
                  <td className="border px-2 py-1">15A〜100A（外径21.7〜114.3）</td>
                  <td className="border px-2 py-1">給水・冷温水・蒸気・ガス配管</td>
                  <td className="border px-2 py-1">防食被覆要／ネジ接続or溶接／高温系対応</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">SUS鋼管（SUS304）</td>
                  <td className="border px-2 py-1">15A〜100A</td>
                  <td className="border px-2 py-1">飲料水・医療用水・厨房</td>
                  <td className="border px-2 py-1">耐食性◎／溶接施工／酸洗処理必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">銅管（JIS H 3300）</td>
                  <td className="border px-2 py-1">外径10〜50mm</td>
                  <td className="border px-2 py-1">冷媒配管・給湯</td>
                  <td className="border px-2 py-1">銅腐食に注意／はんだ接合orフレア・プレス接続</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">硬質塩ビ管（VP/VU）</td>
                  <td className="border px-2 py-1">VP：給水／VU：排水</td>
                  <td className="border px-2 py-1">トイレ排水、雑排水、通気管</td>
                  <td className="border px-2 py-1">接着接合／温度変形・紫外線劣化注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">HTVP（耐熱塩ビ管）</td>
                  <td className="border px-2 py-1">VP13〜VP100</td>
                  <td className="border px-2 py-1">給湯配管</td>
                  <td className="border px-2 py-1">最高使用温度90℃前後／赤色管体</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">架橋ポリエチレン管（PE-X）</td>
                  <td className="border px-2 py-1">呼び13A〜25A</td>
                  <td className="border px-2 py-1">給水・給湯・ヘッダー式配管</td>
                  <td className="border px-2 py-1">柔軟・継手簡易／耐熱／支持ピッチ厳守</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-26">
          <h4 className="text-[13px] font-semibold mb-2">空調ダクト（材質・用途別）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な空調ダクトの材質と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">材質／構成</th>
                  <th className="border px-2 py-1 text-left">厚さ目安 (mm)</th>
                  <th className="border px-2 py-1 text-left">適用系統</th>
                  <th className="border px-2 py-1 text-left">特徴・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">亜鉛メッキ鋼板ダクト（GI）</td>
                  <td className="border px-2 py-1">0.5〜1.2</td>
                  <td className="border px-2 py-1">空調・換気一般</td>
                  <td className="border px-2 py-1">最も一般的／コスト・加工性良／防食処理必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ステンレス鋼板ダクト（SUS304）</td>
                  <td className="border px-2 py-1">0.6〜1.5</td>
                  <td className="border px-2 py-1">厨房排気・クリーンルーム</td>
                  <td className="border px-2 py-1">耐食・高温対応◎／施工費高</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">アルミ製ダクト</td>
                  <td className="border px-2 py-1">0.5〜1.0</td>
                  <td className="border px-2 py-1">排気・小風量空調</td>
                  <td className="border px-2 py-1">軽量／加工容易／強度・火災性能注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">難燃フレキシブルダクト</td>
                  <td className="border px-2 py-1">φ100〜φ300</td>
                  <td className="border px-2 py-1">居室・天井裏送気</td>
                  <td className="border px-2 py-1">柔軟で納まり良／通風抵抗大／長さ制限あり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">グラスウールパネルダクト</td>
                  <td className="border px-2 py-1">20〜25厚（断熱一体）</td>
                  <td className="border px-2 py-1">中大規模空調幹線</td>
                  <td className="border px-2 py-1">軽量断熱一体／強度や清掃性は鋼板より劣る</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-27">
          <h4 className="text-[13px] font-semibold mb-2">熱絶縁（保温材）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な熱絶縁（保温材）の種類と用途。</p>
            <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                  <th className="border px-2 py-1 text-left">材料名</th>
                  <th className="border px-2 py-1 text-left">厚さ目安 (mm)</th>
                  <th className="border px-2 py-1 text-left">用途</th>
                  <th className="border px-2 py-1 text-left">特徴・施工注意点</th>
                  </tr>
                </thead>
                <tbody>
                <tr>
                  <td className="border px-2 py-1">グラスウール巻付け材</td>
                  <td className="border px-2 py-1">20, 25, 50</td>
                  <td className="border px-2 py-1">空調・給水・冷温水管</td>
                  <td className="border px-2 py-1">安価・断熱性◎／外装材と防湿要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ポリエチレンフォーム</td>
                  <td className="border px-2 py-1">10〜25</td>
                  <td className="border px-2 py-1">給水・冷水管</td>
                  <td className="border px-2 py-1">柔軟・施工性◎／耐熱性×（給湯不可）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">発泡ゴム系断熱材</td>
                  <td className="border px-2 py-1">10〜32</td>
                  <td className="border px-2 py-1">冷媒・冷温水管（結露防止）</td>
                  <td className="border px-2 py-1">防露性能◎／厚み選定と気密施工が重要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">剛性フェノールフォーム</td>
                  <td className="border px-2 py-1">25〜50</td>
                  <td className="border px-2 py-1">ダクト外張り・冷温水幹線</td>
                  <td className="border px-2 py-1">不燃・高断熱／割れやすいため外装必須</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">カルシウムシリケート板</td>
                  <td className="border px-2 py-1">25〜50</td>
                  <td className="border px-2 py-1">高温配管（ボイラー廻り等）</td>
                  <td className="border px-2 py-1">耐熱◎／粉塵注意／結束・ラッキング必要</td>
                </tr>
                </tbody>
              </table>
            </div>
        </div>

        <div id="section-28">
          <h4 className="text-[13px] font-semibold mb-2">空調・換気機器例（抜粋）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な空調・換気機器の代表例。</p>
            <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                  <th className="border px-2 py-1 text-left">機器種別</th>
                  <th className="border px-2 py-1 text-left">型式・容量例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                  </tr>
                </thead>
                <tbody>
                <tr>
                  <td className="border px-2 py-1">天井カセット型PAC</td>
                  <td className="border px-2 py-1">2.2〜12.5kW</td>
                  <td className="border px-2 py-1">オフィス・店舗空調</td>
                  <td className="border px-2 py-1">吹出口数・風向設定重要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">壁掛形エアコン</td>
                  <td className="border px-2 py-1">2.2〜5.6kW</td>
                  <td className="border px-2 py-1">住宅・個室空調</td>
                  <td className="border px-2 py-1">コンセント電源区分注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ダクト用送風機</td>
                  <td className="border px-2 py-1">φ150〜φ400口径</td>
                  <td className="border px-2 py-1">換気・排気（機械換気）</td>
                  <td className="border px-2 py-1">静圧・風量計算に基づき選定</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">全熱交換器（HRV）</td>
                  <td className="border px-2 py-1">150〜1000m³/h</td>
                  <td className="border px-2 py-1">OA・RA熱回収・省エネ換気</td>
                  <td className="border px-2 py-1">フィルタ清掃性・バイパス対応確認</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">加圧防煙ファン</td>
                  <td className="border px-2 py-1">5.0〜50kW</td>
                  <td className="border px-2 py-1">防煙区画の加圧</td>
                  <td className="border px-2 py-1">防火ダンパ連動・非常電源要</td>
                </tr>
                </tbody>
              </table>
            </div>
        </div>

        <div id="section-29">
          <h4 className="text-[13px] font-semibold mb-2">冷媒配管・ドレン・機器接続材</h4>
          <p className="text-[11px] text-gray-500 mb-2">冷媒配管、ドレン、機器接続材の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">種別</th>
                  <th className="border px-2 py-1 text-left">外径規格 (mm)</th>
                  <th className="border px-2 py-1 text-left">適用冷媒</th>
                  <th className="border px-2 py-1 text-left">特徴・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">冷媒用銅管（冷媒管）</td>
                  <td className="border px-2 py-1">φ6.35〜φ41.28</td>
                  <td className="border px-2 py-1">R32, R410A 他</td>
                  <td className="border px-2 py-1">JIS H 3300 C1220T／脱酸銅、清浄内面仕様</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">絶縁チューブ</td>
                  <td className="border px-2 py-1">10〜30厚（対応径）</td>
                  <td className="border px-2 py-1">冷媒・冷水管断熱用</td>
                  <td className="border px-2 py-1">結露防止／接続部・屋外露出処理必須</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">フレア継手</td>
                  <td className="border px-2 py-1">専用ナット規格</td>
                  <td className="border px-2 py-1">機器接続</td>
                  <td className="border px-2 py-1">トルク管理必須／漏れ防止フレアパッキンあり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ドレン管（VP管）</td>
                  <td className="border px-2 py-1">φ25〜φ50</td>
                  <td className="border px-2 py-1">室内機ドレン</td>
                  <td className="border px-2 py-1">勾配1/100以上確保／排水試験必要</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-30">
          <h4 className="text-[13px] font-semibold mb-2">衛生器具・給排水装置</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な衛生器具・給排水装置の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">器具・機器</th>
                  <th className="border px-2 py-1 text-left">型式例・接続径</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">注意点・備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">洗面器（壁掛／埋込）</td>
                  <td className="border px-2 py-1">Φ32〜40排水／13A給水</td>
                  <td className="border px-2 py-1">トイレ・洗面所</td>
                  <td className="border px-2 py-1">専用トラップ一体型／VP接続</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">便器（床置／壁掛）</td>
                  <td className="border px-2 py-1">排水芯200mm前後</td>
                  <td className="border px-2 py-1">トイレ</td>
                  <td className="border px-2 py-1">床フランジ仕様・排水方向に注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">小便器（センサー）</td>
                  <td className="border px-2 py-1">13A給水・VP40排水</td>
                  <td className="border px-2 py-1">トイレ男性用</td>
                  <td className="border px-2 py-1">自動洗浄型は電源または電池タイプあり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">自動水栓</td>
                  <td className="border px-2 py-1">AC100V or 電池駆動</td>
                  <td className="border px-2 py-1">手洗い場・厨房</td>
                  <td className="border px-2 py-1">湿気対策／制御ユニット配置</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">電気温水器（小型）</td>
                  <td className="border px-2 py-1">2L〜20L／単相100V</td>
                  <td className="border px-2 py-1">手洗い用温水</td>
                  <td className="border px-2 py-1">設置スペース・空調干渉・排気口注意</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-31">
          <h4 className="text-[13px] font-semibold mb-2">ポンプ・給水・排水装置</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要なポンプ・給水・排水装置の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">種別</th>
                  <th className="border px-2 py-1 text-left">仕様例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">特徴・設計注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">加圧給水ポンプ</td>
                  <td className="border px-2 py-1">インバータ制御／0.75〜3.7kW</td>
                  <td className="border px-2 py-1">高置水槽レス給水</td>
                  <td className="border px-2 py-1">逆流防止・ノイズ対策・ポンプ容量計算必須</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">雑排水ポンプ（ピット）</td>
                  <td className="border px-2 py-1">フロート式自動運転</td>
                  <td className="border px-2 py-1">地階排水・機械室床排水</td>
                  <td className="border px-2 py-1">溢水警報・非常用電源対応</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">汚水ポンプ</td>
                  <td className="border px-2 py-1">刃付・圧送タイプ</td>
                  <td className="border px-2 py-1">汚水槽・マンホール内</td>
                  <td className="border px-2 py-1">メンテナンススペース確保／通気経路確認</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">揚水ポンプ</td>
                  <td className="border px-2 py-1">立型多段・横型渦巻</td>
                  <td className="border px-2 py-1">高層建築給水加圧</td>
                  <td className="border px-2 py-1">NPSH計算要／パイプ支持と騒音防止工夫</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-32">
          <h4 className="text-[13px] font-semibold mb-2">消火設備・加圧装置</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な消火設備・加圧装置の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">設備種別</th>
                  <th className="border px-2 py-1 text-left">主構成／仕様例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考・設計注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">スプリンクラー配管</td>
                  <td className="border px-2 py-1">SGW鋼管 25A〜80A</td>
                  <td className="border px-2 py-1">倉庫・共同住宅・商業施設</td>
                  <td className="border px-2 py-1">ヘッド配置は面積・天井高により異なる</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">連結送水管（乾式）</td>
                  <td className="border px-2 py-1">75A縦管・送水口・放水口</td>
                  <td className="border px-2 py-1">高層建物消防隊連携</td>
                  <td className="border px-2 py-1">屋外送水口・防火戸室への接続位置計画</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">屋内消火栓（1号／2号）</td>
                  <td className="border px-2 py-1">消火栓箱・ホース・バルブ</td>
                  <td className="border px-2 py-1">公共施設・大規模建物</td>
                  <td className="border px-2 py-1">消火用水源・ポンプ連動、距離制限（建築基準法）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">加圧送水装置</td>
                  <td className="border px-2 py-1">1.5〜7.5kW ポンプ＋制御盤</td>
                  <td className="border px-2 py-1">スプリンクラー・消火栓共用系統</td>
                  <td className="border px-2 py-1">動作電源・受水槽容量計算・バイパス配管</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 電気セクション */}
        <div id="section-33">
          <h4 className="text-[13px] font-semibold mb-2">電線・配線材（JIS C 3307 等）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な電線・配線材の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">種類</th>
                  <th className="border px-2 py-1 text-left">記号／規格例</th>
                  <th className="border px-2 py-1 text-left">用途</th>
                  <th className="border px-2 py-1 text-left">特徴・備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">VVFケーブル</td>
                  <td className="border px-2 py-1">600V VVF 2.0-2C等</td>
                  <td className="border px-2 py-1">居室・一般照明回路</td>
                  <td className="border px-2 py-1">平形／耐熱60℃／露出・隠ぺい兼用</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">CVケーブル</td>
                  <td className="border px-2 py-1">600V CV 3.5sq〜150sq</td>
                  <td className="border px-2 py-1">幹線・分電幹線</td>
                  <td className="border px-2 py-1">架橋PE絶縁／耐熱／三芯・四芯構成あり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">IV電線</td>
                  <td className="border px-2 py-1">600V IV 1.6〜14sq</td>
                  <td className="border px-2 py-1">盤内配線・低圧結線</td>
                  <td className="border px-2 py-1">一芯単線／可とう性無／金属管内配線用</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">EM-EEFケーブル</td>
                  <td className="border px-2 py-1">環境配慮型（非鉛PVC）</td>
                  <td className="border px-2 py-1">室内一般照明・電源</td>
                  <td className="border px-2 py-1">ハロゲンフリー／F☆☆☆☆相当／低発煙</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">Fケーブル</td>
                  <td className="border px-2 py-1">600V耐熱電線</td>
                  <td className="border px-2 py-1">機械室・厨房等高温部</td>
                  <td className="border px-2 py-1">90℃耐熱／特定用途のみ</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">LANケーブル</td>
                  <td className="border px-2 py-1">CAT5e〜CAT6A</td>
                  <td className="border px-2 py-1">通信・インターネット</td>
                  <td className="border px-2 py-1">導体径、遮蔽構造（STP/UTP）に注意</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-34">
          <h4 className="text-[13px] font-semibold mb-2">分電盤・配電設備</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な分電盤・配電設備の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">種別</th>
                  <th className="border px-2 py-1 text-left">主な仕様例</th>
                  <th className="border px-2 py-1 text-left">用途</th>
                  <th className="border px-2 py-1 text-left">備考・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">主幹分電盤</td>
                  <td className="border px-2 py-1">75〜600A／3φ3W</td>
                  <td className="border px-2 py-1">建物主電源受入・変電室</td>
                  <td className="border px-2 py-1">CT・漏電遮断器・SPD搭載可</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">動力分電盤</td>
                  <td className="border px-2 py-1">200V系3φ機器対応盤</td>
                  <td className="border px-2 py-1">空調・ポンプ・厨房等</td>
                  <td className="border px-2 py-1">マグネットリレー・端子台整備</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">照明分電盤</td>
                  <td className="border px-2 py-1">100V系2P20A程度×複数回路</td>
                  <td className="border px-2 py-1">室内照明・スイッチ系統</td>
                  <td className="border px-2 py-1">回路名称明記／系統分離／リミッタ付加可能</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">スマート分電盤</td>
                  <td className="border px-2 py-1">BEMS・エネルギー管理連動盤</td>
                  <td className="border px-2 py-1">省エネ計測・負荷制御</td>
                  <td className="border px-2 py-1">計測CT・通信ユニット内蔵／クラウド連携可</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-35">
          <h4 className="text-[13px] font-semibold mb-2">照明・スイッチ・コンセント類</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な照明・スイッチ・コンセント類の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">器具・部品</th>
                  <th className="border px-2 py-1 text-left">型式・定格例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考・設計留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">LEDベースライト</td>
                  <td className="border px-2 py-1">20W/40W相当 直付・埋込</td>
                  <td className="border px-2 py-1">室内天井照明</td>
                  <td className="border px-2 py-1">色温度3000K〜5000K／調光可否明記</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">ダウンライト（LED）</td>
                  <td className="border px-2 py-1">φ100〜φ150開口</td>
                  <td className="border px-2 py-1">天井埋込照明</td>
                  <td className="border px-2 py-1">断熱・非断熱対応機種に注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">人感センサー付き照明</td>
                  <td className="border px-2 py-1">AC100V 壁面or天井取付</td>
                  <td className="border px-2 py-1">廊下・階段・WC</td>
                  <td className="border px-2 py-1">検出角度／点灯時間調整</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">壁スイッチ（3路対応）</td>
                  <td className="border px-2 py-1">埋込形プレート一体</td>
                  <td className="border px-2 py-1">室内照明制御</td>
                  <td className="border px-2 py-1">2〜3箇所制御系統で配線整理</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">15Aコンセント</td>
                  <td className="border px-2 py-1">2口接地付100V</td>
                  <td className="border px-2 py-1">汎用電源供給</td>
                  <td className="border px-2 py-1">容量超過配慮／水廻りは防水コンセント指定</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">200Vコンセント</td>
                  <td className="border px-2 py-1">2P接地極付（エアコン用等）</td>
                  <td className="border px-2 py-1">専用負荷回路</td>
                  <td className="border px-2 py-1">配線色区別（黒赤白）／極性に注意</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-36">
          <h4 className="text-[13px] font-semibold mb-2">弱電・情報・セキュリティ設備</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な弱電・情報・セキュリティ設備の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">システム種別</th>
                  <th className="border px-2 py-1 text-left">配線・端末例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考・構成例</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">テレビ共聴設備</td>
                  <td className="border px-2 py-1">同軸ケーブル・分配器</td>
                  <td className="border px-2 py-1">地デジ・BS分配</td>
                  <td className="border px-2 py-1">75Ω同軸／ブースター／壁TV端子</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">インターホン設備</td>
                  <td className="border px-2 py-1">2線式・IP式端末</td>
                  <td className="border px-2 py-1">玄関・集合住宅玄関機</td>
                  <td className="border px-2 py-1">カメラ付親機／録画機能／外部制御連動</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">LAN・情報通信</td>
                  <td className="border px-2 py-1">CAT6A〜光ファイバー</td>
                  <td className="border px-2 py-1">インターネット／業務</td>
                  <td className="border px-2 py-1">ルータ・HUB配置、管路径・耐ノイズ施工必要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">防犯カメラ</td>
                  <td className="border px-2 py-1">アナログ／PoE／光伝送</td>
                  <td className="border px-2 py-1">屋内外監視</td>
                  <td className="border px-2 py-1">HDDレコーダ・NVR／死角無く配置</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">火災報知設備</td>
                  <td className="border px-2 py-1">感知器・発信機・音響器</td>
                  <td className="border px-2 py-1">法定／自主報知設備</td>
                  <td className="border px-2 py-1">連動制御盤／避難経路表示・非常放送連携</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-37">
          <h4 className="text-[13px] font-semibold mb-2">接地・避雷・保安設備</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な接地・避雷・保安設備の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">種別</th>
                  <th className="border px-2 py-1 text-left">規格・工法例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">A種接地（接地抵抗10Ω以下）</td>
                  <td className="border px-2 py-1">Φ14接地極、CV線22sq</td>
                  <td className="border px-2 py-1">分電盤・高圧機器接地</td>
                  <td className="border px-2 py-1">接地抵抗測定必須／補助極設置検討</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">C種接地（100Ω以下）</td>
                  <td className="border px-2 py-1">Φ9接地棒、VVF2.0mm²</td>
                  <td className="border px-2 py-1">弱電・LAN・機器保護接地</td>
                  <td className="border px-2 py-1">接地共用可否確認／絶縁確認</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">避雷設備（LPS）</td>
                  <td className="border px-2 py-1">直撃雷保護・引下線</td>
                  <td className="border px-2 py-1">高層建築・法定対象建物</td>
                  <td className="border px-2 py-1">JIS A 4201適合／等電位化処理</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-38">
          <h4 className="text-[13px] font-semibold mb-2">非常電源・防災・避難設備</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な非常電源・防災・避難設備の種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">設備種別</th>
                  <th className="border px-2 py-1 text-left">主構成・仕様例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">備考・設計留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">自家発電設備</td>
                  <td className="border px-2 py-1">ディーゼル発電機（20〜100kVA）</td>
                  <td className="border px-2 py-1">非常照明・防災設備のバックアップ</td>
                  <td className="border px-2 py-1">燃料貯蔵・始動バッテリー・定期試験義務あり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">非常用蓄電池装置</td>
                  <td className="border px-2 py-1">リチウム／鉛蓄電池（2〜10kWh）</td>
                  <td className="border px-2 py-1">非常照明・放送・情報機器</td>
                  <td className="border px-2 py-1">放電深度管理、設置温度、停電切替時間に注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">非常照明</td>
                  <td className="border px-2 py-1">LED式バッテリー内蔵灯具</td>
                  <td className="border px-2 py-1">避難経路・階段・廊下照明</td>
                  <td className="border px-2 py-1">60分間点灯、壁・天井取付、保守点検義務あり</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">誘導灯（避難口）</td>
                  <td className="border px-2 py-1">A級（20m）・B級（10m）・C級（6m）</td>
                  <td className="border px-2 py-1">避難方向表示</td>
                  <td className="border px-2 py-1">消防法に基づく視認距離設計／蓄電池付属</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">非常放送設備</td>
                  <td className="border px-2 py-1">アンプ・マイク・スピーカー・制御盤</td>
                  <td className="border px-2 py-1">避難誘導・火災時警報</td>
                  <td className="border px-2 py-1">感知器・発信機と連動／事前アナウンス録音対応可能</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-39">
          <h4 className="text-[13px] font-semibold mb-2">制御・計装・BEMS対応</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な制御・計装・BEMS対応システムの種類と用途。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">種別</th>
                  <th className="border px-2 py-1 text-left">システム構成例</th>
                  <th className="border px-2 py-1 text-left">主な用途</th>
                  <th className="border px-2 py-1 text-left">特徴・設計留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">建物集中制御（BAS）</td>
                  <td className="border px-2 py-1">PLC＋タッチパネルorPC UI</td>
                  <td className="border px-2 py-1">空調・照明・換気等統合制御</td>
                  <td className="border px-2 py-1">通信規格（BACnet／Modbus等）統一／ロギング可能</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">BEMS（エネルギー管理）</td>
                  <td className="border px-2 py-1">計測CT＋データ収集装置＋クラウド連携</td>
                  <td className="border px-2 py-1">エネルギー可視化・負荷最適化</td>
                  <td className="border px-2 py-1">中央監視盤／インバータ制御と連携</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">自動制御計装</td>
                  <td className="border px-2 py-1">圧力・温度・湿度センサー、コントローラ等</td>
                  <td className="border px-2 py-1">AHU・FCU・ポンプ制御</td>
                  <td className="border px-2 py-1">配管・ダクト内計装設置スペース・校正要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">タイムスケジュール制御</td>
                  <td className="border px-2 py-1">週次・日次時刻プログラム設定</td>
                  <td className="border px-2 py-1">外構照明・空調ON/OFF</td>
                  <td className="border px-2 py-1">分電盤組込み／UPS連動が望ましい</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-40">
          <h4 className="text-[13px] font-semibold mb-2">照度基準と設計目安（JIS Z 9110）</h4>
          <p className="text-[11px] text-gray-500 mb-2">主要な空間用途別の照度基準と設計目安。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">空間用途</th>
                  <th className="border px-2 py-1 text-left">照度基準 (lx)</th>
                  <th className="border px-2 py-1 text-left">色温度の目安 (K)</th>
                  <th className="border px-2 py-1 text-left">備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">住宅リビング</td>
                  <td className="border px-2 py-1">300〜500</td>
                  <td className="border px-2 py-1">2700〜3500</td>
                  <td className="border px-2 py-1">温白色推奨／調光器併用可</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">事務所（一般執務）</td>
                  <td className="border px-2 py-1">500〜750</td>
                  <td className="border px-2 py-1">4000〜5000</td>
                  <td className="border px-2 py-1">均等配光、机面照度維持</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">会議室</td>
                  <td className="border px-2 py-1">300〜500</td>
                  <td className="border px-2 py-1">3500〜4500</td>
                  <td className="border px-2 py-1">映像対応照明／グレア防止要</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">廊下・階段</td>
                  <td className="border px-2 py-1">100〜200</td>
                  <td className="border px-2 py-1">3000〜4000</td>
                  <td className="border px-2 py-1">非常照明とのバランス</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">教室</td>
                  <td className="border px-2 py-1">500〜750</td>
                  <td className="border px-2 py-1">4000〜5000</td>
                  <td className="border px-2 py-1">黒板照明別回路推奨／演色性Ra&gt;80が望ましい</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-41">
          <h4 className="text-[13px] font-semibold mb-2">実務的な配線・設計注意点</h4>
          <p className="text-[11px] text-gray-500 mb-2">実務的な配線・設計における注意点と指針。</p>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">項目分類</th>
                  <th className="border px-2 py-1 text-left">具体的指針・注意事項</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">幹線サイズ計算</td>
                  <td className="border px-2 py-1">許容電流・電圧降下5％以内・同時使用率を考慮（CVケーブル選定）</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">負荷分散設計</td>
                  <td className="border px-2 py-1">空調・照明・動力・コンセントを分離し、グルーピングする／分電盤位置と回路長配慮</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">弱電配線分離</td>
                  <td className="border px-2 py-1">高圧・低圧・通信を別ルートに敷設（EMC・感電対策）／金属管と樹脂管の干渉注意</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">防火区画貫通</td>
                  <td className="border px-2 py-1">ケーブル貫通部には防火材（ロックウール・防火パテ）封止／法令に従い施工写真記録</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">天井内配線管理</td>
                  <td className="border px-2 py-1">未来ダクト・ラックで整理／保守点検スペース（300mm以上推奨）確保</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[10px] text-gray-500">注：上記は代表例・目安であり、設計・施工では最新のJIS・JASS・メーカー資料・法規を必ず確認してください。</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default MaterialInfo;


