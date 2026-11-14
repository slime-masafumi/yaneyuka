'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PageHead, { Stat } from '@/components/ui/PageHead';
import { SecHead } from '@/components/ui/Sheet';
import { ScreenLink } from '@/components/home/HomeParts';
import './info-pages.css';

/**
 * 材料情報(左カラム「01 見る」の 12)。本の早見表として組む。
 *   頭 … 1 行の見出し + 数字
 *   分野タブ … 意匠 / 構造 / 機械 / 電気(下線タブ。選んだ分野の章だけを出す)
 *   本文 … 章ごとに明朝の番号 + 章題 + 黒 1px、表は 1px の線だけ(.yy-tbl)
 *   右 … 目次(いまの分野の章。追従)/ 関連 / この資料について
 * 表の中身(数値・文言)は以前のまま。章の出し分けは data-cat と info-pages.css で行う。
 */
type Cat = '意匠' | '構造' | '機械' | '電気';
const CAT_CODE: Record<Cat, string> = { 意匠: 'arch', 構造: 'struct', 機械: 'mech', 電気: 'elec' };

/** 「ガラス種別（JIS R 3202 他）」→ 名前「ガラス種別」と補足「JIS R 3202 他」(目次の 項目 ……… 補足 用) */
function splitTitle(title: string): { name: string; note: string } {
  if (title.endsWith('）')) {
    const i = title.lastIndexOf('（');
    if (i > 0) return { name: title.slice(0, i), note: title.slice(i + 1, -1) };
  }
  return { name: title, note: '' };
}

const MaterialInfo: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Cat>('意匠');
  const [current, setCurrent] = useState<string | null>(null);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const cats = Object.keys(categorySections) as Cat[];
  const sections = categorySections[tab];
  const total = cats.reduce((n, c) => n + categorySections[c].length, 0);

  // いま読んでいる章(目次の印)。中央カラム(#yy-main-scroll)のスクロールで決める
  useEffect(() => {
    const scroller = document.getElementById('yy-main-scroll');
    const target: HTMLElement | Window = scroller ?? window;
    const ids = sections.map((s) => s.id);
    const update = () => {
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      let cur: string | null = ids[0] ?? null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - top <= 80) cur = id;
      }
      setCurrent(cur);
    };
    update();
    target.addEventListener('scroll', update, { passive: true });
    return () => target.removeEventListener('scroll', update);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeTab = (c: Cat) => {
    setTab(c);
    const el = rootRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  };

  return (
    <div ref={rootRef} className="yy-mi" data-tab={CAT_CODE[tab]}>
      <PageHead
        no="16"
        en="material info"
        title="材料情報"
        desc={
          <>
            規格・寸法・特性の早見表 <span className="yy-fmt yy-info-beta">β版</span>
          </>
        }
        right={
          <>
            <Stat n={cats.length} label="分野" />
            <Stat n={total} label="章" />
          </>
        }
      />
      <nav className="yy-tabs" aria-label="分野">
        {cats.map((c) => (
          <button key={c} type="button" className="yy-tab" aria-pressed={c === tab} onClick={() => changeTab(c)}>
            {c}
            <small>{categorySections[c].length}</small>
          </button>
        ))}
      </nav>

      <div className="yy-info-body">
        {/* 本文 */}
        <div className="yy-mi-main">
        {/* 意匠セクション */}
        <div id="section-1" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">ガラス種別（JIS R 3202 他）</h4>
          <p className="yy-mi-note">主要なガラス種別と用途例。防火・安全・性能は別途要件確認。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>ガラス種別</th>
                  <th>厚さ (mm)</th>
                  <th>用途例</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>フロートガラス</td>
                  <td>3, 4, 5, 6, 8, 10</td>
                  <td>室内建具・小開口窓・間仕切り</td>
                  <td>一般透明板ガラス</td>
                </tr>
                <tr>
                  <td>強化ガラス</td>
                  <td>5, 6, 8, 10, 12</td>
                  <td>手摺・大型窓・床</td>
                  <td>フロートの約3〜5倍の強度</td>
                </tr>
                <tr>
                  <td>合わせガラス</td>
                  <td>6.8 (3+3), 8.8 (4+4), 10.8 (5+5)</td>
                  <td>安全対策・防音・防犯</td>
                  <td>中間膜の種類により性能変化</td>
                </tr>
                <tr>
                  <td>複層ガラス（断熱）</td>
                  <td>22 (5+12A+5), 24 (6+12A+6), 28 (8+12A+8)</td>
                  <td>窓サッシ・高断熱住宅</td>
                  <td>アルゴン封入・Low-E対応も可</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-2" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">木材比較表（代表樹種）</h4>
          <p className="yy-mi-note">値は代表的な目安。等級・含水率・産地等により変動します。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>樹種</th>
                  <th>比重 (目安)</th>
                  <th>硬さ</th>
                  <th>主な用途</th>
                  <th>備考（耐水・コスト等）</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>スギ</td>
                  <td>約0.38</td>
                  <td>低</td>
                  <td>内装・造作・下地材</td>
                  <td>安価・軽量・吸音性高い</td>
                </tr>
                <tr>
                  <td>ヒノキ</td>
                  <td>約0.41</td>
                  <td>中</td>
                  <td>構造材・床組・柱</td>
                  <td>耐久性・香り・防虫性あり</td>
                </tr>
                <tr>
                  <td>カラマツ</td>
                  <td>約0.50</td>
                  <td>中</td>
                  <td>土台・梁材</td>
                  <td>節が多く構造向き</td>
                </tr>
                <tr>
                  <td>ナラ（オーク）</td>
                  <td>約0.70</td>
                  <td>高</td>
                  <td>フローリング・家具</td>
                  <td>硬く耐摩耗性高い</td>
                </tr>
                <tr>
                  <td>メープル</td>
                  <td>約0.63</td>
                  <td>高</td>
                  <td>階段・天板・高級家具</td>
                  <td>乾燥後の寸法安定性良い</td>
                </tr>
                <tr>
                  <td>ウォールナット</td>
                  <td>約0.64</td>
                  <td>中〜高</td>
                  <td>高級家具・壁面仕上げ</td>
                  <td>色味・高級感あり</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-3" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">内装仕上げ材（例）</h4>
          <p className="yy-mi-note">主要な内装仕上げ材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材料種別</th>
                  <th>厚さ・寸法例</th>
                  <th>用途</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>石膏ボード</td>
                  <td>9.5mm, 12.5mm, 15mm</td>
                  <td>壁・天井下地、不燃仕様</td>
                  <td>JIS A 6901</td>
                </tr>
                <tr>
                  <td>合板仕上げ材</td>
                  <td>5.5〜24mm</td>
                  <td>床下地・壁下地</td>
                  <td>構造用/JAS認定品</td>
                </tr>
                <tr>
                  <td>塩ビタイル</td>
                  <td>2〜3mm</td>
                  <td>商業施設・病院床仕上げ</td>
                  <td>耐摩耗・清掃性高い</td>
                </tr>
                <tr>
                  <td>化粧合板</td>
                  <td>12〜15mm</td>
                  <td>収納・壁面パネル等</td>
                  <td>表面化粧シート貼り</td>
                </tr>
                <tr>
                  <td>フローリング材</td>
                  <td>12〜15mm</td>
                  <td>居室床</td>
                  <td>複合or無垢タイプあり</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-4" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">タイル・石材・左官材</h4>
          <p className="yy-mi-note">主要なタイル・石材・左官材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材料種別</th>
                  <th>寸法・厚さ例</th>
                  <th>主な用途</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>磁器質タイル</td>
                  <td>300×300～600×600mm／厚さ9～12mm</td>
                  <td>外壁・床・水回り</td>
                  <td>吸水率1%以下／耐凍害</td>
                </tr>
                <tr>
                  <td>陶器質タイル</td>
                  <td>150角・200角など／厚さ6〜9mm</td>
                  <td>屋内壁・腰壁</td>
                  <td>吸水率大きく外部使用は注意</td>
                </tr>
                <tr>
                  <td>大理石／御影石</td>
                  <td>厚さ20～30mm</td>
                  <td>床・壁・カウンター</td>
                  <td>天然石／メンテナンス要確認</td>
                </tr>
                <tr>
                  <td>モルタル仕上げ</td>
                  <td>塗厚15〜25mm程度</td>
                  <td>壁・天井下地・意匠仕上</td>
                  <td>左官仕上／押さえ／掻き落とし等</td>
                </tr>
                <tr>
                  <td>洗い出し</td>
                  <td>骨材混入モルタル</td>
                  <td>玄関・外構床・壁</td>
                  <td>滑り止め効果、外部意匠性高い</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-5" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">内装壁・天井材</h4>
          <p className="yy-mi-note">主要な内装壁・天井材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材料種別</th>
                  <th>厚さ・規格例</th>
                  <th>主な用途</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ビニールクロス</td>
                  <td>厚さ0.3〜0.5mm</td>
                  <td>居室・廊下など</td>
                  <td>不燃／防汚／抗菌等機能付きあり</td>
                </tr>
                <tr>
                  <td>吸音ボード</td>
                  <td>600×600／600×1200mm等</td>
                  <td>天井・壁</td>
                  <td>穴あき（グラスウール＋表面紙）</td>
                </tr>
                <tr>
                  <td>化粧石膏ボード</td>
                  <td>厚さ9.5／12.5mm</td>
                  <td>壁面・天井</td>
                  <td>仕上げ不要／コスト削減</td>
                </tr>
                <tr>
                  <td>木毛セメント板</td>
                  <td>厚さ15〜25mm</td>
                  <td>天井・壁</td>
                  <td>不燃材料／調湿性／耐久性あり</td>
                </tr>
                <tr>
                  <td>不燃化粧パネル</td>
                  <td>3〜5mm（下地合板と併用）</td>
                  <td>キッチン・水回り壁面</td>
                  <td>メラミン化粧板／アルミ複合板など</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-6" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">外壁材・屋根材</h4>
          <p className="yy-mi-note">主要な外壁材・屋根材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材料種別</th>
                  <th>厚さ・寸法例</th>
                  <th>主な用途</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>押出成形セメント板</td>
                  <td>t=15〜18mm</td>
                  <td>外壁下地・化粧外壁</td>
                  <td>JIS A 5430／不燃認定／下地兼用</td>
                </tr>
                <tr>
                  <td>金属サイディング</td>
                  <td>t=12〜18mm（芯材含む）</td>
                  <td>外壁</td>
                  <td>断熱材付き鋼板／軽量</td>
                </tr>
                <tr>
                  <td>ALCパネル</td>
                  <td>t=50, 75, 100mm等</td>
                  <td>外壁・間仕切り</td>
                  <td>高断熱・不燃材・軽量</td>
                </tr>
                <tr>
                  <td>ガルバリウム鋼板</td>
                  <td>t=0.35〜0.5mm</td>
                  <td>屋根・外壁</td>
                  <td>耐候性／加工性良／カラー豊富</td>
                </tr>
                <tr>
                  <td>スレート（無石綿）</td>
                  <td>t=5.5〜6mm</td>
                  <td>屋根・外壁</td>
                  <td>軽量・耐水／旧アスベスト代替</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-7" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">天井材（システム天井含む）</h4>
          <p className="yy-mi-note">主要な天井材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材料種別</th>
                  <th>寸法／厚さ例</th>
                  <th>主な用途</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ロックウール吸音板</td>
                  <td>600×600×t15〜25mm等</td>
                  <td>天井吸音仕上</td>
                  <td>吸音・不燃・軽量</td>
                </tr>
                <tr>
                  <td>化粧スラグウール板</td>
                  <td>600×1200×t15mm</td>
                  <td>事務所・店舗天井</td>
                  <td>白色系、張替え容易</td>
                </tr>
                <tr>
                  <td>木目化粧合板</td>
                  <td>t=5.5〜12mm</td>
                  <td>和室・造作天井</td>
                  <td>無垢突板／プリントタイプあり</td>
                </tr>
                <tr>
                  <td>アルミパンチング板</td>
                  <td>任意</td>
                  <td>意匠天井・目隠し</td>
                  <td>軽量・通気・モダン意匠対応</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-8" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">金属板材</h4>
          <p className="yy-mi-note">主要な金属板材の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材料種別</th>
                  <th>厚さ・規格例</th>
                  <th>主な用途</th>
                  <th>備考・特徴</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ガルバリウム鋼板</td>
                  <td>t=0.35〜0.5mm</td>
                  <td>屋根・外壁・庇・笠木</td>
                  <td>アルミ55%＋亜鉛メッキ、耐候・耐食性◎</td>
                </tr>
                <tr>
                  <td>カラー鋼板</td>
                  <td>t=0.27〜0.5mm</td>
                  <td>外壁・屋根・サイディング材</td>
                  <td>塗装済み鋼板（ポリエステル・フッ素系）</td>
                </tr>
                <tr>
                  <td>フッ素樹脂鋼板</td>
                  <td>t=0.4〜0.5mm</td>
                  <td>高耐候外装・屋根</td>
                  <td>変色・退色に強くメンテ周期長い</td>
                </tr>
                <tr>
                  <td>ステンレス鋼板（SUS304等）</td>
                  <td>t=0.3〜1.5mm</td>
                  <td>建具・内壁パネル・天井・水廻り</td>
                  <td>耐食・耐水・衛生性に優れる（鏡面/ヘアライン）</td>
                </tr>
                <tr>
                  <td>チタン亜鉛合金板</td>
                  <td>t=0.7〜1.0mm</td>
                  <td>高級外装・ルーバー等</td>
                  <td>銅のような経年変化と耐久性、軽量</td>
                </tr>
                <tr>
                  <td>銅板</td>
                  <td>t=0.35〜0.6mm</td>
                  <td>屋根・雨樋・装飾部</td>
                  <td>経年で緑青が形成され重厚感</td>
                </tr>
                <tr>
                  <td>アルミ板</td>
                  <td>t=0.5〜3.0mm</td>
                  <td>外装ルーバー・内装パネル等</td>
                  <td>軽量で加工性◎、アルマイト仕上など可能</td>
                </tr>
                <tr>
                  <td>アルミ複合板（ACP）</td>
                  <td>総厚3〜4mm（中芯＋薄板）</td>
                  <td>内外装パネル・サイン面板等</td>
                  <td>芯材はポリエチレン、表裏はアルミ薄板</td>
                </tr>
                <tr>
                  <td>エキスパンドメタル</td>
                  <td>厚さ1.2〜3mm</td>
                  <td>天井・手摺・目隠しパネル</td>
                  <td>網状鋼板で軽量・透過性あり</td>
                </tr>
                <tr>
                  <td>パンチングメタル</td>
                  <td>板厚1.0〜2.0mm</td>
                  <td>意匠天井・通気ルーバー等</td>
                  <td>穴径・ピッチ調整で多様なデザインが可能</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-9" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">塗料種別</h4>
          <p className="yy-mi-note">主要な塗料種別の代表例。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>塗料種別</th>
                  <th>主成分／系統</th>
                  <th>主な用途</th>
                  <th>特徴・備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>アクリル樹脂塗料</td>
                  <td>アクリル系水性または溶剤型</td>
                  <td>内壁・天井（内装）</td>
                  <td>安価・作業性良・耐久性はやや劣る</td>
                </tr>
                <tr>
                  <td>ウレタン樹脂塗料</td>
                  <td>ポリウレタン系</td>
                  <td>鉄部・木部・床</td>
                  <td>密着性・耐久性良、外装も可</td>
                </tr>
                <tr>
                  <td>シリコン樹脂塗料</td>
                  <td>シリコン変性樹脂</td>
                  <td>外壁・屋根・鉄部</td>
                  <td>耐候性良・中～長寿命</td>
                </tr>
                <tr>
                  <td>フッ素樹脂塗料</td>
                  <td>フッ素系</td>
                  <td>高耐候部（屋根・外装金属等）</td>
                  <td>耐候・耐紫外線性最高、コスト高</td>
                </tr>
                <tr>
                  <td>水性エマルション塗料</td>
                  <td>水性アクリル系</td>
                  <td>内装壁・天井（改修含む）</td>
                  <td>低臭・環境対応・作業性高</td>
                </tr>
                <tr>
                  <td>錆止め塗料（下塗）</td>
                  <td>エポキシ系・合成樹脂系</td>
                  <td>鉄骨・鉄部下塗り</td>
                  <td>防錆性・密着性高い</td>
                </tr>
                <tr>
                  <td>床用塗料</td>
                  <td>エポキシ・ポリウレタン</td>
                  <td>工場床・機械室・バルコニー</td>
                  <td>耐摩耗・耐油性重視／厚膜タイプもあり</td>
                </tr>
                <tr>
                  <td>断熱・遮熱塗料</td>
                  <td>セラミック・特殊樹脂</td>
                  <td>屋根・外壁</td>
                  <td>表面温度抑制／光反射率が高い</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-10" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">シーリング材（シール材）</h4>
          <p className="yy-mi-note">主要なシーリング材の種類と用途。実設計ではメーカー資料・仕様書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材料種別</th>
                  <th>主成分系統</th>
                  <th>主な用途</th>
                  <th>特徴・備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>変成シリコン系</td>
                  <td>1成分 or 2成分</td>
                  <td>外壁目地・ALC目地</td>
                  <td>汎用性高・塗装可・低汚染タイプあり</td>
                </tr>
                <tr>
                  <td>ポリウレタン系</td>
                  <td>1成分 or 2成分</td>
                  <td>サッシ周り・パネルジョイント</td>
                  <td>弾性◎・密着性高・紫外線には劣る</td>
                </tr>
                <tr>
                  <td>シリコン系（純シリコン）</td>
                  <td>1成分（非塗装用）</td>
                  <td>ガラス周り・水廻り</td>
                  <td>耐候・耐水性◎／塗装不可・汚染注意</td>
                </tr>
                <tr>
                  <td>アクリル系</td>
                  <td>1成分（内装用）</td>
                  <td>壁内装目地・隙間補修</td>
                  <td>安価・内装専用・耐水性は劣る</td>
                </tr>
                <tr>
                  <td>ポリサルファイド系</td>
                  <td>2成分硬化型</td>
                  <td>構造目地・防水目地</td>
                  <td>高強度・耐薬品・耐油性あり</td>
                </tr>
                <tr>
                  <td>ブチルゴム系</td>
                  <td>テープ状</td>
                  <td>仮設目地・防水下地補助</td>
                  <td>初期接着力強・施工性高／非硬化</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-11" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">主要断熱材一覧（熱伝導率 λ：W/m･K）</h4>
          <p className="yy-mi-note">主要な断熱材の熱伝導率と用途。実設計ではメーカー資料・仕様書を確認してください。熱伝導率（λ）は値が小さいほど断熱性能が高い。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材料区分</th>
                  <th>材料名</th>
                  <th>規格・密度</th>
                  <th>熱伝導率 (λ)</th>
                  <th>主な用途</th>
                  <th>長所</th>
                  <th>短所・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="is-group" rowSpan={3}>無機繊維系</td>
                  <td>グラスウール</td>
                  <td>10K〜38K</td>
                  <td>0.038〜0.045</td>
                  <td>木造壁・天井・間仕切り</td>
                  <td>安価・不燃・吸音性◎</td>
                  <td>施工不良で性能低下／吸湿注意</td>
                </tr>
                <tr>
                  <td>高性能グラスウール</td>
                  <td>16K〜24K</td>
                  <td>0.032〜0.036</td>
                  <td>省エネ住宅・ZEH</td>
                  <td>断熱性良・価格手頃</td>
                  <td>厚み必要／気流止め必須</td>
                </tr>
                <tr>
                  <td>ロックウール</td>
                  <td>40K〜80K</td>
                  <td>0.038〜0.044</td>
                  <td>外壁・屋根・耐火被覆</td>
                  <td>不燃・耐火性能◎</td>
                  <td>GWより高価</td>
                </tr>
                <tr>
                  <td className="is-group" rowSpan={4}>発泡プラスチック系</td>
                  <td>押出法ポリスチレンフォーム（XPS）</td>
                  <td>1種〜3種</td>
                  <td>0.028〜0.032</td>
                  <td>床下・基礎外断熱</td>
                  <td>水に強い・軽量</td>
                  <td>防火注意（準不燃まで）</td>
                </tr>
                <tr>
                  <td>ビーズ法ポリスチレンフォーム（EPS）</td>
                  <td>A種〜B種</td>
                  <td>0.032〜0.038</td>
                  <td>外断熱・屋根断熱</td>
                  <td>耐水◎・コスパ良</td>
                  <td>XPSより断熱性劣る</td>
                </tr>
                <tr>
                  <td>硬質ウレタンフォーム（PUF）</td>
                  <td>65〜80kg/m³</td>
                  <td>0.020〜0.024</td>
                  <td>屋根・壁・吹付断熱</td>
                  <td>λが最小・隙間無施工</td>
                  <td>施工者技術差あり／耐火処理要</td>
                </tr>
                <tr>
                  <td>現場発泡ウレタン</td>
                  <td>―</td>
                  <td>0.020〜0.024</td>
                  <td>既存改修・木造全般</td>
                  <td>気密性能◎</td>
                  <td>厚み管理・硬化熱管理が必要</td>
                </tr>
                <tr>
                  <td>木質系</td>
                  <td>セルロースファイバー</td>
                  <td>―</td>
                  <td>0.040〜0.045</td>
                  <td>壁・天井</td>
                  <td>調湿性・吸音性◎</td>
                  <td>施工費高・乾燥管理</td>
                </tr>
                <tr>
                  <td>無機材</td>
                  <td>カルシウムシリケート（不燃）</td>
                  <td>20〜50mm</td>
                  <td>0.050〜0.065</td>
                  <td>機械室・高温部</td>
                  <td>耐熱性◎</td>
                  <td>重量あり・高価</td>
                </tr>
                <tr>
                  <td className="is-group" rowSpan={2}>設備断熱</td>
                  <td>発泡ゴム断熱（Armaflex等）</td>
                  <td>9〜32mm</td>
                  <td>0.033〜0.037</td>
                  <td>冷媒・冷水管</td>
                  <td>結露防止◎・柔軟</td>
                  <td>厚み管理重要／紫外線NG</td>
                </tr>
                <tr>
                  <td>PEフォーム（ポリエチレン）</td>
                  <td>10〜25mm</td>
                  <td>0.040〜0.045</td>
                  <td>給水・給湯</td>
                  <td>軽量・安価</td>
                  <td>高温に弱い（給湯不可も）</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-11a" className="yy-mi-sec" data-cat="arch">
          <h4 className="yy-mi-ch">LGS（軽量鉄骨天井・壁下地）規格（JIS A 6517）</h4>
          <p className="yy-mi-note">日本のJIS規格（JIS A 6517）に基づいた、代表的なLGS（壁・天井）の一覧表。実設計ではメーカー資料・仕様書を確認してください。※JIS材か一般材（JIS外）かの確認も重要です。</p>
          
          <div className="yy-mi-part">
            <h5 className="yy-mi-sub">1. 壁下地材（LGS：Light Gauge Steel）</h5>
            <p className="yy-mi-note">主に間仕切り壁の骨組みに使用される材料です。</p>
            <div className="yy-mi-scroll">
              <table className="yy-tbl yy-mi-tbl">
                <thead>
                  <tr>
                    <th>材料種別</th>
                    <th>規格（主なサイズ）</th>
                    <th>主な用途</th>
                    <th>備考・特徴</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>スタッド (C形)</strong></td>
                    <td>50 / 65 / 75 / 90 / 100 × 45mm (t=0.8mm)</td>
                    <td>一般間仕切り壁の縦材</td>
                    <td>高さに応じてサイズを選択。高所は100型など。</td>
                  </tr>
                  <tr>
                    <td><strong>ランナー (U形)</strong></td>
                    <td>50 / 65 / 75 / 90 / 100 × 40mm (t=0.8mm)</td>
                    <td>壁の上下に固定する受け材</td>
                    <td>スタッドのサイズに合わせて選択。</td>
                  </tr>
                  <tr>
                    <td><strong>振れ止め</strong></td>
                    <td>25 × 10 × 2.0mm / 1.2mm</td>
                    <td>スタッドのねじれ防止材</td>
                    <td>スタッドの中段（1200mmピッチ以下）に通す。</td>
                  </tr>
                  <tr>
                    <td><strong>スペーサー</strong></td>
                    <td>各スタッドサイズに対応</td>
                    <td>スタッドと振れ止めの固定</td>
                    <td>スタッドのピッチ（300/450/600mm）に合わせる。</td>
                  </tr>
                  <tr>
                    <td><strong>補強チャネル</strong></td>
                    <td>38 × 12 × 1.2mm</td>
                    <td>ドア枠周りや重量物取付</td>
                    <td>開口部の補強や、強度が求められる箇所に使用。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="yy-mi-part">
            <h5 className="yy-mi-sub">2. 天井下地材（LGS：野縁）</h5>
            <p className="yy-mi-note">天井の仕上げ材を貼るための骨組みです。</p>
            <div className="yy-mi-scroll">
              <table className="yy-tbl yy-mi-tbl">
                <thead>
                  <tr>
                    <th>材料種別</th>
                    <th>規格（主なサイズ）</th>
                    <th>主な用途</th>
                    <th>備考・特徴</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>シングル野縁 (U形)</strong></td>
                    <td>25 × 19 × 0.5mm (M-S)</td>
                    <td>一般的な天井の受け材</td>
                    <td>ボードの継ぎ目以外で使用。</td>
                  </tr>
                  <tr>
                    <td><strong>ダブル野縁 (U形)</strong></td>
                    <td>50 × 19 × 0.5mm (M-D)</td>
                    <td>ボードの継ぎ目用受け材</td>
                    <td>ボードのジョイント部分でビスを2列打つ用。</td>
                  </tr>
                  <tr>
                    <td><strong>野縁受け (C形)</strong></td>
                    <td>38 × 12 × 1.2mm (C-38)</td>
                    <td>野縁を支持する主軸材</td>
                    <td>吊りボルトからハンガーで吊るされる。</td>
                  </tr>
                  <tr>
                    <td><strong>吊りボルト</strong></td>
                    <td>W3/8（3分ボルト）</td>
                    <td>天井全体を吊り下げる</td>
                    <td>インサート等に固定し、天井荷重を支える。</td>
                  </tr>
                  <tr>
                    <td><strong>ハンガー</strong></td>
                    <td>各サイズ用</td>
                    <td>野縁受けとボルトを接続</td>
                    <td>施工箇所により防振ハンガー等も使い分ける。</td>
                  </tr>
                  <tr>
                    <td><strong>クリップ</strong></td>
                    <td>シングル用 / ダブル用</td>
                    <td>野縁と野縁受けを固定</td>
                    <td>ワンタッチでパチンと留めるのが一般的。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="yy-mi-part">
            <h5 className="yy-mi-sub">3. 特殊・高機能下地</h5>
            <p className="yy-mi-note">耐火や遮音、高所対応などで使用される特殊な規格です。</p>
            <div className="yy-mi-scroll">
              <table className="yy-tbl yy-mi-tbl">
                <thead>
                  <tr>
                    <th>材料種別</th>
                    <th>特徴・システム</th>
                    <th>主な用途</th>
                    <th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>高耐食下地</strong></td>
                    <td>溶融亜鉛スズ・マグネシウムめっき</td>
                    <td>プール・厨房・半屋外</td>
                    <td>サビに強く、湿気の多い場所に最適。</td>
                  </tr>
                  <tr>
                    <td><strong>SQバー (角スタッド)</strong></td>
                    <td>50 × 19 / 60 × 30 など</td>
                    <td>高い剛性が求められる天井</td>
                    <td>体育館や天井が高いエントランスなど。</td>
                  </tr>
                  <tr>
                    <td><strong>耐震天井用部材</strong></td>
                    <td>ブレース、高剛性クリップ</td>
                    <td>大規模空間の脱落防止</td>
                    <td>震災対策用。通常のLGSより部材が厚く、数が多い。</td>
                  </tr>
                  <tr>
                    <td><strong>遮音スタッド</strong></td>
                    <td>特殊断面スタッド（ハット形等）</td>
                    <td>映画館、集合住宅の戸境壁</td>
                    <td>音の振動を伝えにくい形状になっている。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 構造セクション */}
        <div id="section-12" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">鉄筋（異形棒鋼：JIS G 3112）</h4>
          <p className="yy-mi-note">代表的な呼び径と用途目安。実設計では図面・仕様書・メーカー資料を必ず確認してください。構造計算上は設計基準強度（fsy）および設計引張強度（ft）も要確認。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼び</th>
                  <th>公称径 (mm)</th>
                  <th>断面積 (mm²)</th>
                  <th>単位重量 (kg/m)</th>
                  <th>強度区分</th>
                  <th>降伏強度 (N/mm²)</th>
                  <th>主な適用構造</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>D10</td>
                  <td>9.53</td>
                  <td>71</td>
                  <td>0.560</td>
                  <td>SD295A</td>
                  <td>295</td>
                  <td>スラブ・壁配筋・軽構造補強筋</td>
                  <td>曲げ施工性が良い</td>
                </tr>
                <tr>
                  <td>D13</td>
                  <td>12.7</td>
                  <td>127</td>
                  <td>0.995</td>
                  <td>SD295A/B</td>
                  <td>295</td>
                  <td>スラブ主筋・耐力壁補強筋</td>
                  <td>Bは溶接性が高い</td>
                </tr>
                <tr>
                  <td>D16</td>
                  <td>15.9</td>
                  <td>198</td>
                  <td>1.56</td>
                  <td>SD345</td>
                  <td>345</td>
                  <td>梁帯筋・柱帯筋・中規模構造部主筋</td>
                  <td>鉄筋コンクリート梁・柱に常用</td>
                </tr>
                <tr>
                  <td>D22</td>
                  <td>22.2</td>
                  <td>387</td>
                  <td>3.04</td>
                  <td>SD345</td>
                  <td>345</td>
                  <td>柱主筋・梁主筋・基礎梁</td>
                  <td>降伏強度と伸び性能のバランス</td>
                </tr>
                <tr>
                  <td>D32</td>
                  <td>31.8</td>
                  <td>794</td>
                  <td>6.31</td>
                  <td>SD390</td>
                  <td>390</td>
                  <td>大スパン梁・耐震壁主筋</td>
                  <td>曲げ耐力設計時に有効</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-13" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">H形鋼（JIS G 3192 / 材質：JIS G 3101 SS400, JIS G 3136 SN490等）</h4>
          <p className="yy-mi-note">代表的な呼称例。実寸・断面性能はカタログ値を参照してください。Ix：主軸方向の断面二次モーメント、構造設計時の曲げ剛性に関与。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼称 (H×B×tw×tf mm)</th>
                  <th>重量 (kg/m)</th>
                  <th>断面性能 Ix(cm⁴)</th>
                  <th>適用構造</th>
                  <th>材質例</th>
                  <th>注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>H-150×150×7×10</td>
                  <td>31.1</td>
                  <td>約1210</td>
                  <td>一般柱・梁</td>
                  <td>SS400/SN400B</td>
                  <td>曲げ剛性良好／小中規模鉄骨造</td>
                </tr>
                <tr>
                  <td>H-200×200×8×12</td>
                  <td>49.9</td>
                  <td>約2950</td>
                  <td>柱・梁（中規模）</td>
                  <td>SN490B</td>
                  <td>軸力設計時は局部座屈に注意</td>
                </tr>
                <tr>
                  <td>H-300×150×6.5×9</td>
                  <td>36.3</td>
                  <td>約3300</td>
                  <td>大梁・門型ラーメン</td>
                  <td>SS400</td>
                  <td>梁成・梁幅バランス注意</td>
                </tr>
                <tr>
                  <td>H-400×200×8×13</td>
                  <td>66.2</td>
                  <td>約7920</td>
                  <td>主梁・耐震架構</td>
                  <td>SN490B</td>
                  <td>施工時の搬入・接合条件確認</td>
                </tr>
                <tr>
                  <td>H-588×300×12×20</td>
                  <td>151</td>
                  <td>約38000</td>
                  <td>高層柱・大スパン梁</td>
                  <td>SN490C等</td>
                  <td>高力ボルト接合／現場溶接部の熱影響管理</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-14" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">六角ボルト（JIS B 1180・JIS B 1051）</h4>
          <p className="yy-mi-note">並目ねじの代表値。二面幅（SW）は一般的なスパナサイズ。</p>
          <div className="yy-mi-scroll is-gap">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼び (M)</th>
                  <th>ピッチ (mm)</th>
                  <th>二面幅 SW (mm)</th>
                  <th>頭部高さ k (参考)</th>
                  <th>強度区分 例</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>M8</td>
                  <td>1.25</td>
                  <td>13</td>
                  <td>5.3</td>
                  <td>8.8 / 10.9</td>
                </tr>
                <tr>
                  <td>M10</td>
                  <td>1.5</td>
                  <td>17</td>
                  <td>6.4</td>
                  <td>8.8 / 10.9</td>
                </tr>
                <tr>
                  <td>M12</td>
                  <td>1.75</td>
                  <td>19</td>
                  <td>7.5</td>
                  <td>8.8 / 10.9</td>
                </tr>
                <tr>
                  <td>M16</td>
                  <td>2.0</td>
                  <td>24</td>
                  <td>10.0</td>
                  <td>8.8 / 10.9</td>
                </tr>
                <tr>
                  <td>M20</td>
                  <td>2.5</td>
                  <td>30</td>
                  <td>12.5</td>
                  <td>8.8 / 10.9</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="yy-mi-grid2">
          <div className="yy-mi-scroll">
              <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                    <th>呼び (M)</th>
                    <th>標準穴径 (mm)</th>
                </tr>
              </thead>
              <tbody>
                  <tr><td>M8</td><td>9</td></tr>
                  <tr><td>M10</td><td>11</td></tr>
                  <tr><td>M12</td><td>13</td></tr>
                  <tr><td>M16</td><td>18</td></tr>
                  <tr><td>M20</td><td>22</td></tr>
                  <tr><td>M24</td><td>26</td></tr>
                </tbody>
              </table>
        </div>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                    <th>呼び (M)</th>
                    <th>内径 d (mm)</th>
                    <th>外径 D (mm)</th>
                    <th>厚さ t (mm)</th>
                </tr>
              </thead>
              <tbody>
                  <tr><td>M8</td><td>8.4</td><td>16</td><td>1.6</td></tr>
                  <tr><td>M10</td><td>10.5</td><td>20</td><td>2.0</td></tr>
                  <tr><td>M12</td><td>13.0</td><td>24</td><td>2.5</td></tr>
                  <tr><td>M16</td><td>17.0</td><td>30</td><td>3.0</td></tr>
                  <tr><td>M20</td><td>21.0</td><td>37</td><td>3.0</td></tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>

        <div id="section-15" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">鋼板類（JIS G 3101, G 3136 他）</h4>
          <p className="yy-mi-note">よく使う呼び厚の早見。材質により取り合い・在庫は異なります。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼び厚 (t mm)</th>
                  <th>用途分類</th>
                  <th>主な構造用途</th>
                  <th>材質例</th>
                  <th>加工・施工上の注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>4.5</td>
                  <td>ブラケット・補剛板</td>
                  <td>柱梁接合部補強、座金補強</td>
                  <td>SS400</td>
                  <td>曲げ・溶接可、穴加工精度に注意</td>
                </tr>
                <tr>
                  <td>6.0〜9.0</td>
                  <td>ベースプレート・仕口</td>
                  <td>柱脚・柱頭プレート、梁接合部</td>
                  <td>SS400/SN400</td>
                  <td>剛性確保・アンカー座面との整合性必要</td>
                </tr>
                <tr>
                  <td>12.0〜16.0</td>
                  <td>柱脚基礎部プレート</td>
                  <td>高耐力柱脚・架台基礎</td>
                  <td>SS400/SN490</td>
                  <td>精密な穴開け／余盛溶接・開先加工必要</td>
                </tr>
                <tr>
                  <td>19.0〜25.0</td>
                  <td>高強度ベース・アンカー用</td>
                  <td>耐震架構・大型工作機据付</td>
                  <td>SN490C</td>
                  <td>製作図段階で孔加工と溶接方法の指定が必要</td>
                </tr>
                <tr>
                  <td>32.0以上</td>
                  <td>特殊架構・支承部</td>
                  <td>ブレース接合・ピン支点構造部等</td>
                  <td>SM570等</td>
                  <td>超厚板は開先・後処理・非破壊検査必要</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-16" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">鉄筋 断面積・単位重量 早見（参考）</h4>
          <p className="yy-mi-note">概算値。実務ではメーカー資料・構造計算書を確認してください。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼び</th>
                  <th>公称径 d (mm)</th>
                  <th>断面積 (mm²)</th>
                  <th>単位重量 (kg/m)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>D10</td><td>9.53</td><td>71</td><td>0.560</td></tr>
                <tr><td>D13</td><td>12.7</td><td>127</td><td>0.995</td></tr>
                <tr><td>D16</td><td>15.9</td><td>198</td><td>1.56</td></tr>
                <tr><td>D19</td><td>19.1</td><td>286</td><td>2.25</td></tr>
                <tr><td>D22</td><td>22.2</td><td>387</td><td>3.04</td></tr>
                <tr><td>D25</td><td>25.4</td><td>507</td><td>3.98</td></tr>
                <tr><td>D29</td><td>28.6</td><td>643</td><td>5.04</td></tr>
                <tr><td>D32</td><td>31.8</td><td>794</td><td>6.31</td></tr>
                <tr><td>D35</td><td>35.0</td><td>962</td><td>7.99</td></tr>
                <tr><td>D38</td><td>38.1</td><td>1140</td><td>9.89</td></tr>
                <tr><td>D41</td><td>41.3</td><td>1330</td><td>12.0</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-17" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">等辺山形鋼（L形） 代表例</h4>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼称 (L×L×t)</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>40×40×4</td><td>軽補強・当て板</td></tr>
                <tr><td>50×50×5</td><td>ブラケット・補強</td></tr>
                <tr><td>65×65×6</td><td>小梁・補剛</td></tr>
                <tr><td>75×75×6</td><td>一般補強</td></tr>
                <tr><td>90×90×7</td><td>梁端補強 等</td></tr>
                <tr><td>100×100×9</td><td>柱梁接合部補強</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-18" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">溝形鋼（C形鋼） 代表例</h4>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼称</th>
                  <th>寸法 (h×b×t<wbr/>w×t<wbr/>f) mm</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>C-75×40</td><td>75×40×5.0×7.0</td><td>軽フレーム</td></tr>
                <tr><td>C-100×50</td><td>100×50×5.0×7.5</td><td>母屋・小梁</td></tr>
                <tr><td>C-125×65</td><td>125×65×6.0×8.0</td><td>梁補強</td></tr>
                <tr><td>C-150×75</td><td>150×75×6.5×10</td><td>梁</td></tr>
                <tr><td>C-200×80</td><td>200×80×7.5×11</td><td>主梁・補剛</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-19" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">角形・矩形鋼管（JIS G 3466 STKR 代表）</h4>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼称</th>
                  <th>外法寸法 (mm)</th>
                  <th>板厚 t (mm)</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>□50×50×2.3</td><td>50×50</td><td>2.3</td><td>軽鉄骨・手摺</td></tr>
                <tr><td>□75×75×3.2</td><td>75×75</td><td>3.2</td><td>柱・架台</td></tr>
                <tr><td>□100×100×4.5</td><td>100×100</td><td>4.5</td><td>柱</td></tr>
                <tr><td>■50×100×2.3</td><td>50×100</td><td>2.3</td><td>梁・笠木下地</td></tr>
                <tr><td>■100×150×3.2</td><td>100×150</td><td>3.2</td><td>門柱・梁</td></tr>
                <tr><td>■125×250×4.5</td><td>125×250</td><td>4.5</td><td>大梁・フレーム</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-20" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">高力ボルト（JIS B 1186 等）</h4>
          <p className="yy-mi-note">高力ボルトの代表例。F8T: 降伏強度785MPa／引張強度1000MPa相当、予め軸力管理が必要（トルク・回転法）。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼び径 (M)</th>
                  <th>二面幅 SW (mm)</th>
                  <th>頭部高さ k (mm)</th>
                  <th>強度区分</th>
                  <th>破断荷重 (kN)</th>
                  <th>適用例</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>M16</td>
                  <td>24</td>
                  <td>約10.0</td>
                  <td>F8T</td>
                  <td>約147</td>
                  <td>一般柱梁接合、高力フランジ</td>
                </tr>
                <tr>
                  <td>M20</td>
                  <td>30</td>
                  <td>約12.5</td>
                  <td>F8T</td>
                  <td>約230</td>
                  <td>大梁接合、十字仕口</td>
                </tr>
                <tr>
                  <td>M22</td>
                  <td>32</td>
                  <td>約14.0</td>
                  <td>F10T</td>
                  <td>約300</td>
                  <td>耐震仕口、大型接合部</td>
                </tr>
                <tr>
                  <td>M24</td>
                  <td>36</td>
                  <td>約15.0</td>
                  <td>F10T</td>
                  <td>約355</td>
                  <td>高層構造柱脚</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-21" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">座金・ナット（対応規格）</h4>
          <p className="yy-mi-note">高力ボルト用座金・ナットの代表例。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼び径 (M)</th>
                  <th>座金外径 D (mm)</th>
                  <th>厚さ t (mm)</th>
                  <th>ナット高さ (mm)</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>M16</td>
                  <td>32</td>
                  <td>3.2</td>
                  <td>約14</td>
                  <td>ばね座金は不可（摩擦接合）</td>
                </tr>
                <tr>
                  <td>M20</td>
                  <td>40</td>
                  <td>4.0</td>
                  <td>約17</td>
                  <td>スペーサー併用時は組合せ注意</td>
                </tr>
                <tr>
                  <td>M24</td>
                  <td>48</td>
                  <td>5.0</td>
                  <td>約19</td>
                  <td>垂直部・摩擦面に錆止め禁止</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-22" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">アンカーボルト（定着材）</h4>
          <p className="yy-mi-note">主要なアンカーボルトの種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>規格</th>
                  <th>主な用途</th>
                  <th>特徴・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>J型アンカー</td>
                  <td>SD295A/D16〜D25</td>
                  <td>柱脚ベース、仮設基礎</td>
                  <td>コンクリート埋込み／定着長確保が必要</td>
                </tr>
                <tr>
                  <td>ストレート型</td>
                  <td>S45C、M20〜M30</td>
                  <td>重機架台・ベース接合</td>
                  <td>長ナット併用やスリーブ納まり注意</td>
                </tr>
                <tr>
                  <td>ケミカルアンカー</td>
                  <td>M12〜M24</td>
                  <td>改修・耐震補強</td>
                  <td>孔清掃・樹脂注入管理・施工温度管理必要</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-23" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">コンクリート（設計基準強度・材料特性）</h4>
          <p className="yy-mi-note">スランプは部材形状・配筋密度による。自己充填コンクリート（SCC）は別途性能試験必要。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>呼び強度 (Fc)</th>
                  <th>推奨スランプ (cm)</th>
                  <th>用途例</th>
                  <th>設計上の留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>18N/mm²</td>
                  <td>12～15</td>
                  <td>小規模住宅・基礎</td>
                  <td>打設性優先、冬期は寒中対策要</td>
                </tr>
                <tr>
                  <td>21N/mm²</td>
                  <td>15～18</td>
                  <td>一般RC建築（柱・梁・スラブ）</td>
                  <td>標準配合、W/C&lt;60%、骨材サイズ調整が必要</td>
                </tr>
                <tr>
                  <td>24N/mm²</td>
                  <td>15～18</td>
                  <td>耐震壁・高支持力基礎</td>
                  <td>高流動性可（AE減水剤・高性能減水剤使用）</td>
                </tr>
                <tr>
                  <td>27〜30N/mm²</td>
                  <td>18〜21</td>
                  <td>高耐久性部位・高層RC</td>
                  <td>材令強度管理、緻密性と養生重要</td>
                </tr>
                <tr>
                  <td>36N/mm²以上</td>
                  <td>設計条件による</td>
                  <td>構造スリム化、特殊梁・柱等</td>
                  <td>材料費増加、試験体成形・現場品質管理厳格化</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-24" className="yy-mi-sec" data-cat="struct">
          <h4 className="yy-mi-ch">耐震補強・補強材（RC・SRC・S造共通）</h4>
          <p className="yy-mi-note">主要な耐震補強工法と補強材の種類。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>補強工法</th>
                  <th>補強材種類</th>
                  <th>適用構造</th>
                  <th>特徴・留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>鋼板巻き立て補強</td>
                  <td>t=6〜12mm鋼板（SS400等）</td>
                  <td>RC柱・梁補強</td>
                  <td>接着系（エポキシ）＋アンカー固定必須</td>
                </tr>
                <tr>
                  <td>CFRPシート補強</td>
                  <td>炭素繊維＋エポキシ樹脂</td>
                  <td>耐震壁・柱・梁補強</td>
                  <td>引張方向有効／重ね幅・終端処理重要</td>
                </tr>
                <tr>
                  <td>あと施工アンカー接合</td>
                  <td>ケミカル系／拡張機械系</td>
                  <td>各種部材追加・耐震金物</td>
                  <td>孔径・穿孔深さ・清掃・設計引張荷重厳守</td>
                </tr>
                <tr>
                  <td>鋼製ブレース補強</td>
                  <td>H鋼・角パイプ・プレート</td>
                  <td>フレーム・開口補強</td>
                  <td>剛性配分／躯体応力再検討必要</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 機械セクション */}
        <div id="section-25" className="yy-mi-sec" data-cat="mech">
          <h4 className="yy-mi-ch">給排水・衛生配管材</h4>
          <p className="yy-mi-note">主要な給排水・衛生配管材の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>配管種別</th>
                  <th>規格／呼び径例 (mm)</th>
                  <th>用途</th>
                  <th>特徴・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>SGP鋼管（白／黒）</td>
                  <td>15A〜100A（外径21.7〜114.3）</td>
                  <td>給水・冷温水・蒸気・ガス配管</td>
                  <td>防食被覆要／ネジ接続or溶接／高温系対応</td>
                </tr>
                <tr>
                  <td>SUS鋼管（SUS304）</td>
                  <td>15A〜100A</td>
                  <td>飲料水・医療用水・厨房</td>
                  <td>耐食性◎／溶接施工／酸洗処理必要</td>
                </tr>
                <tr>
                  <td>銅管（JIS H 3300）</td>
                  <td>外径10〜50mm</td>
                  <td>冷媒配管・給湯</td>
                  <td>銅腐食に注意／はんだ接合orフレア・プレス接続</td>
                </tr>
                <tr>
                  <td>硬質塩ビ管（VP/VU）</td>
                  <td>VP：給水／VU：排水</td>
                  <td>トイレ排水、雑排水、通気管</td>
                  <td>接着接合／温度変形・紫外線劣化注意</td>
                </tr>
                <tr>
                  <td>HTVP（耐熱塩ビ管）</td>
                  <td>VP13〜VP100</td>
                  <td>給湯配管</td>
                  <td>最高使用温度90℃前後／赤色管体</td>
                </tr>
                <tr>
                  <td>架橋ポリエチレン管（PE-X）</td>
                  <td>呼び13A〜25A</td>
                  <td>給水・給湯・ヘッダー式配管</td>
                  <td>柔軟・継手簡易／耐熱／支持ピッチ厳守</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-26" className="yy-mi-sec" data-cat="mech">
          <h4 className="yy-mi-ch">空調ダクト（材質・用途別）</h4>
          <p className="yy-mi-note">主要な空調ダクトの材質と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>材質／構成</th>
                  <th>厚さ目安 (mm)</th>
                  <th>適用系統</th>
                  <th>特徴・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>亜鉛メッキ鋼板ダクト（GI）</td>
                  <td>0.5〜1.2</td>
                  <td>空調・換気一般</td>
                  <td>最も一般的／コスト・加工性良／防食処理必要</td>
                </tr>
                <tr>
                  <td>ステンレス鋼板ダクト（SUS304）</td>
                  <td>0.6〜1.5</td>
                  <td>厨房排気・クリーンルーム</td>
                  <td>耐食・高温対応◎／施工費高</td>
                </tr>
                <tr>
                  <td>アルミ製ダクト</td>
                  <td>0.5〜1.0</td>
                  <td>排気・小風量空調</td>
                  <td>軽量／加工容易／強度・火災性能注意</td>
                </tr>
                <tr>
                  <td>難燃フレキシブルダクト</td>
                  <td>φ100〜φ300</td>
                  <td>居室・天井裏送気</td>
                  <td>柔軟で納まり良／通風抵抗大／長さ制限あり</td>
                </tr>
                <tr>
                  <td>グラスウールパネルダクト</td>
                  <td>20〜25厚（断熱一体）</td>
                  <td>中大規模空調幹線</td>
                  <td>軽量断熱一体／強度や清掃性は鋼板より劣る</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-27" className="yy-mi-sec" data-cat="mech">
          <h4 className="yy-mi-ch">熱絶縁（保温材）</h4>
          <p className="yy-mi-note">主要な熱絶縁（保温材）の種類と用途。</p>
            <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
                <thead>
                  <tr>
                  <th>材料名</th>
                  <th>厚さ目安 (mm)</th>
                  <th>用途</th>
                  <th>特徴・施工注意点</th>
                  </tr>
                </thead>
                <tbody>
                <tr>
                  <td>グラスウール巻付け材</td>
                  <td>20, 25, 50</td>
                  <td>空調・給水・冷温水管</td>
                  <td>安価・断熱性◎／外装材と防湿要</td>
                </tr>
                <tr>
                  <td>ポリエチレンフォーム</td>
                  <td>10〜25</td>
                  <td>給水・冷水管</td>
                  <td>柔軟・施工性◎／耐熱性×（給湯不可）</td>
                </tr>
                <tr>
                  <td>発泡ゴム系断熱材</td>
                  <td>10〜32</td>
                  <td>冷媒・冷温水管（結露防止）</td>
                  <td>防露性能◎／厚み選定と気密施工が重要</td>
                </tr>
                <tr>
                  <td>剛性フェノールフォーム</td>
                  <td>25〜50</td>
                  <td>ダクト外張り・冷温水幹線</td>
                  <td>不燃・高断熱／割れやすいため外装必須</td>
                </tr>
                <tr>
                  <td>カルシウムシリケート板</td>
                  <td>25〜50</td>
                  <td>高温配管（ボイラー廻り等）</td>
                  <td>耐熱◎／粉塵注意／結束・ラッキング必要</td>
                </tr>
                </tbody>
              </table>
            </div>
        </div>

        <div id="section-28" className="yy-mi-sec" data-cat="mech">
          <h4 className="yy-mi-ch">空調・換気機器例（抜粋）</h4>
          <p className="yy-mi-note">主要な空調・換気機器の代表例。</p>
            <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
                <thead>
                  <tr>
                  <th>機器種別</th>
                  <th>型式・容量例</th>
                  <th>主な用途</th>
                  <th>備考</th>
                  </tr>
                </thead>
                <tbody>
                <tr>
                  <td>天井カセット型PAC</td>
                  <td>2.2〜12.5kW</td>
                  <td>オフィス・店舗空調</td>
                  <td>吹出口数・風向設定重要</td>
                </tr>
                <tr>
                  <td>壁掛形エアコン</td>
                  <td>2.2〜5.6kW</td>
                  <td>住宅・個室空調</td>
                  <td>コンセント電源区分注意</td>
                </tr>
                <tr>
                  <td>ダクト用送風機</td>
                  <td>φ150〜φ400口径</td>
                  <td>換気・排気（機械換気）</td>
                  <td>静圧・風量計算に基づき選定</td>
                </tr>
                <tr>
                  <td>全熱交換器（HRV）</td>
                  <td>150〜1000m³/h</td>
                  <td>OA・RA熱回収・省エネ換気</td>
                  <td>フィルタ清掃性・バイパス対応確認</td>
                </tr>
                <tr>
                  <td>加圧防煙ファン</td>
                  <td>5.0〜50kW</td>
                  <td>防煙区画の加圧</td>
                  <td>防火ダンパ連動・非常電源要</td>
                </tr>
                </tbody>
              </table>
            </div>
        </div>

        <div id="section-29" className="yy-mi-sec" data-cat="mech">
          <h4 className="yy-mi-ch">冷媒配管・ドレン・機器接続材</h4>
          <p className="yy-mi-note">冷媒配管、ドレン、機器接続材の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>外径規格 (mm)</th>
                  <th>適用冷媒</th>
                  <th>特徴・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>冷媒用銅管（冷媒管）</td>
                  <td>φ6.35〜φ41.28</td>
                  <td>R32, R410A 他</td>
                  <td>JIS H 3300 C1220T／脱酸銅、清浄内面仕様</td>
                </tr>
                <tr>
                  <td>絶縁チューブ</td>
                  <td>10〜30厚（対応径）</td>
                  <td>冷媒・冷水管断熱用</td>
                  <td>結露防止／接続部・屋外露出処理必須</td>
                </tr>
                <tr>
                  <td>フレア継手</td>
                  <td>専用ナット規格</td>
                  <td>機器接続</td>
                  <td>トルク管理必須／漏れ防止フレアパッキンあり</td>
                </tr>
                <tr>
                  <td>ドレン管（VP管）</td>
                  <td>φ25〜φ50</td>
                  <td>室内機ドレン</td>
                  <td>勾配1/100以上確保／排水試験必要</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-30" className="yy-mi-sec" data-cat="mech">
          <h4 className="yy-mi-ch">衛生器具・給排水装置</h4>
          <p className="yy-mi-note">主要な衛生器具・給排水装置の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>器具・機器</th>
                  <th>型式例・接続径</th>
                  <th>主な用途</th>
                  <th>注意点・備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>洗面器（壁掛／埋込）</td>
                  <td>Φ32〜40排水／13A給水</td>
                  <td>トイレ・洗面所</td>
                  <td>専用トラップ一体型／VP接続</td>
                </tr>
                <tr>
                  <td>便器（床置／壁掛）</td>
                  <td>排水芯200mm前後</td>
                  <td>トイレ</td>
                  <td>床フランジ仕様・排水方向に注意</td>
                </tr>
                <tr>
                  <td>小便器（センサー）</td>
                  <td>13A給水・VP40排水</td>
                  <td>トイレ男性用</td>
                  <td>自動洗浄型は電源または電池タイプあり</td>
                </tr>
                <tr>
                  <td>自動水栓</td>
                  <td>AC100V or 電池駆動</td>
                  <td>手洗い場・厨房</td>
                  <td>湿気対策／制御ユニット配置</td>
                </tr>
                <tr>
                  <td>電気温水器（小型）</td>
                  <td>2L〜20L／単相100V</td>
                  <td>手洗い用温水</td>
                  <td>設置スペース・空調干渉・排気口注意</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-31" className="yy-mi-sec" data-cat="mech">
          <h4 className="yy-mi-ch">ポンプ・給水・排水装置</h4>
          <p className="yy-mi-note">主要なポンプ・給水・排水装置の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>仕様例</th>
                  <th>主な用途</th>
                  <th>特徴・設計注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>加圧給水ポンプ</td>
                  <td>インバータ制御／0.75〜3.7kW</td>
                  <td>高置水槽レス給水</td>
                  <td>逆流防止・ノイズ対策・ポンプ容量計算必須</td>
                </tr>
                <tr>
                  <td>雑排水ポンプ（ピット）</td>
                  <td>フロート式自動運転</td>
                  <td>地階排水・機械室床排水</td>
                  <td>溢水警報・非常用電源対応</td>
                </tr>
                <tr>
                  <td>汚水ポンプ</td>
                  <td>刃付・圧送タイプ</td>
                  <td>汚水槽・マンホール内</td>
                  <td>メンテナンススペース確保／通気経路確認</td>
                </tr>
                <tr>
                  <td>揚水ポンプ</td>
                  <td>立型多段・横型渦巻</td>
                  <td>高層建築給水加圧</td>
                  <td>NPSH計算要／パイプ支持と騒音防止工夫</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-32" className="yy-mi-sec" data-cat="mech">
          <h4 className="yy-mi-ch">消火設備・加圧装置</h4>
          <p className="yy-mi-note">主要な消火設備・加圧装置の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>設備種別</th>
                  <th>主構成／仕様例</th>
                  <th>主な用途</th>
                  <th>備考・設計注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>スプリンクラー配管</td>
                  <td>SGW鋼管 25A〜80A</td>
                  <td>倉庫・共同住宅・商業施設</td>
                  <td>ヘッド配置は面積・天井高により異なる</td>
                </tr>
                <tr>
                  <td>連結送水管（乾式）</td>
                  <td>75A縦管・送水口・放水口</td>
                  <td>高層建物消防隊連携</td>
                  <td>屋外送水口・防火戸室への接続位置計画</td>
                </tr>
                <tr>
                  <td>屋内消火栓（1号／2号）</td>
                  <td>消火栓箱・ホース・バルブ</td>
                  <td>公共施設・大規模建物</td>
                  <td>消火用水源・ポンプ連動、距離制限（建築基準法）</td>
                </tr>
                <tr>
                  <td>加圧送水装置</td>
                  <td>1.5〜7.5kW ポンプ＋制御盤</td>
                  <td>スプリンクラー・消火栓共用系統</td>
                  <td>動作電源・受水槽容量計算・バイパス配管</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 電気セクション */}
        <div id="section-33" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">電線・配線材（JIS C 3307 等）</h4>
          <p className="yy-mi-note">主要な電線・配線材の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>種類</th>
                  <th>記号／規格例</th>
                  <th>用途</th>
                  <th>特徴・備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>VVFケーブル</td>
                  <td>600V VVF 2.0-2C等</td>
                  <td>居室・一般照明回路</td>
                  <td>平形／耐熱60℃／露出・隠ぺい兼用</td>
                </tr>
                <tr>
                  <td>CVケーブル</td>
                  <td>600V CV 3.5sq〜150sq</td>
                  <td>幹線・分電幹線</td>
                  <td>架橋PE絶縁／耐熱／三芯・四芯構成あり</td>
                </tr>
                <tr>
                  <td>IV電線</td>
                  <td>600V IV 1.6〜14sq</td>
                  <td>盤内配線・低圧結線</td>
                  <td>一芯単線／可とう性無／金属管内配線用</td>
                </tr>
                <tr>
                  <td>EM-EEFケーブル</td>
                  <td>環境配慮型（非鉛PVC）</td>
                  <td>室内一般照明・電源</td>
                  <td>ハロゲンフリー／F☆☆☆☆相当／低発煙</td>
                </tr>
                <tr>
                  <td>Fケーブル</td>
                  <td>600V耐熱電線</td>
                  <td>機械室・厨房等高温部</td>
                  <td>90℃耐熱／特定用途のみ</td>
                </tr>
                <tr>
                  <td>LANケーブル</td>
                  <td>CAT5e〜CAT6A</td>
                  <td>通信・インターネット</td>
                  <td>導体径、遮蔽構造（STP/UTP）に注意</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-34" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">分電盤・配電設備</h4>
          <p className="yy-mi-note">主要な分電盤・配電設備の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>主な仕様例</th>
                  <th>用途</th>
                  <th>備考・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>主幹分電盤</td>
                  <td>75〜600A／3φ3W</td>
                  <td>建物主電源受入・変電室</td>
                  <td>CT・漏電遮断器・SPD搭載可</td>
                </tr>
                <tr>
                  <td>動力分電盤</td>
                  <td>200V系3φ機器対応盤</td>
                  <td>空調・ポンプ・厨房等</td>
                  <td>マグネットリレー・端子台整備</td>
                </tr>
                <tr>
                  <td>照明分電盤</td>
                  <td>100V系2P20A程度×複数回路</td>
                  <td>室内照明・スイッチ系統</td>
                  <td>回路名称明記／系統分離／リミッタ付加可能</td>
                </tr>
                <tr>
                  <td>スマート分電盤</td>
                  <td>BEMS・エネルギー管理連動盤</td>
                  <td>省エネ計測・負荷制御</td>
                  <td>計測CT・通信ユニット内蔵／クラウド連携可</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-35" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">照明・スイッチ・コンセント類</h4>
          <p className="yy-mi-note">主要な照明・スイッチ・コンセント類の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>器具・部品</th>
                  <th>型式・定格例</th>
                  <th>主な用途</th>
                  <th>備考・設計留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>LEDベースライト</td>
                  <td>20W/40W相当 直付・埋込</td>
                  <td>室内天井照明</td>
                  <td>色温度3000K〜5000K／調光可否明記</td>
                </tr>
                <tr>
                  <td>ダウンライト（LED）</td>
                  <td>φ100〜φ150開口</td>
                  <td>天井埋込照明</td>
                  <td>断熱・非断熱対応機種に注意</td>
                </tr>
                <tr>
                  <td>人感センサー付き照明</td>
                  <td>AC100V 壁面or天井取付</td>
                  <td>廊下・階段・WC</td>
                  <td>検出角度／点灯時間調整</td>
                </tr>
                <tr>
                  <td>壁スイッチ（3路対応）</td>
                  <td>埋込形プレート一体</td>
                  <td>室内照明制御</td>
                  <td>2〜3箇所制御系統で配線整理</td>
                </tr>
                <tr>
                  <td>15Aコンセント</td>
                  <td>2口接地付100V</td>
                  <td>汎用電源供給</td>
                  <td>容量超過配慮／水廻りは防水コンセント指定</td>
                </tr>
                <tr>
                  <td>200Vコンセント</td>
                  <td>2P接地極付（エアコン用等）</td>
                  <td>専用負荷回路</td>
                  <td>配線色区別（黒赤白）／極性に注意</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-36" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">弱電・情報・セキュリティ設備</h4>
          <p className="yy-mi-note">主要な弱電・情報・セキュリティ設備の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>システム種別</th>
                  <th>配線・端末例</th>
                  <th>主な用途</th>
                  <th>備考・構成例</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>テレビ共聴設備</td>
                  <td>同軸ケーブル・分配器</td>
                  <td>地デジ・BS分配</td>
                  <td>75Ω同軸／ブースター／壁TV端子</td>
                </tr>
                <tr>
                  <td>インターホン設備</td>
                  <td>2線式・IP式端末</td>
                  <td>玄関・集合住宅玄関機</td>
                  <td>カメラ付親機／録画機能／外部制御連動</td>
                </tr>
                <tr>
                  <td>LAN・情報通信</td>
                  <td>CAT6A〜光ファイバー</td>
                  <td>インターネット／業務</td>
                  <td>ルータ・HUB配置、管路径・耐ノイズ施工必要</td>
                </tr>
                <tr>
                  <td>防犯カメラ</td>
                  <td>アナログ／PoE／光伝送</td>
                  <td>屋内外監視</td>
                  <td>HDDレコーダ・NVR／死角無く配置</td>
                </tr>
                <tr>
                  <td>火災報知設備</td>
                  <td>感知器・発信機・音響器</td>
                  <td>法定／自主報知設備</td>
                  <td>連動制御盤／避難経路表示・非常放送連携</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-37" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">接地・避雷・保安設備</h4>
          <p className="yy-mi-note">主要な接地・避雷・保安設備の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>規格・工法例</th>
                  <th>主な用途</th>
                  <th>備考・注意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>A種接地（接地抵抗10Ω以下）</td>
                  <td>Φ14接地極、CV線22sq</td>
                  <td>分電盤・高圧機器接地</td>
                  <td>接地抵抗測定必須／補助極設置検討</td>
                </tr>
                <tr>
                  <td>C種接地（100Ω以下）</td>
                  <td>Φ9接地棒、VVF2.0mm²</td>
                  <td>弱電・LAN・機器保護接地</td>
                  <td>接地共用可否確認／絶縁確認</td>
                </tr>
                <tr>
                  <td>避雷設備（LPS）</td>
                  <td>直撃雷保護・引下線</td>
                  <td>高層建築・法定対象建物</td>
                  <td>JIS A 4201適合／等電位化処理</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-38" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">非常電源・防災・避難設備</h4>
          <p className="yy-mi-note">主要な非常電源・防災・避難設備の種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>設備種別</th>
                  <th>主構成・仕様例</th>
                  <th>主な用途</th>
                  <th>備考・設計留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>自家発電設備</td>
                  <td>ディーゼル発電機（20〜100kVA）</td>
                  <td>非常照明・防災設備のバックアップ</td>
                  <td>燃料貯蔵・始動バッテリー・定期試験義務あり</td>
                </tr>
                <tr>
                  <td>非常用蓄電池装置</td>
                  <td>リチウム／鉛蓄電池（2〜10kWh）</td>
                  <td>非常照明・放送・情報機器</td>
                  <td>放電深度管理、設置温度、停電切替時間に注意</td>
                </tr>
                <tr>
                  <td>非常照明</td>
                  <td>LED式バッテリー内蔵灯具</td>
                  <td>避難経路・階段・廊下照明</td>
                  <td>60分間点灯、壁・天井取付、保守点検義務あり</td>
                </tr>
                <tr>
                  <td>誘導灯（避難口）</td>
                  <td>A級（20m）・B級（10m）・C級（6m）</td>
                  <td>避難方向表示</td>
                  <td>消防法に基づく視認距離設計／蓄電池付属</td>
                </tr>
                <tr>
                  <td>非常放送設備</td>
                  <td>アンプ・マイク・スピーカー・制御盤</td>
                  <td>避難誘導・火災時警報</td>
                  <td>感知器・発信機と連動／事前アナウンス録音対応可能</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-39" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">制御・計装・BEMS対応</h4>
          <p className="yy-mi-note">主要な制御・計装・BEMS対応システムの種類と用途。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>システム構成例</th>
                  <th>主な用途</th>
                  <th>特徴・設計留意点</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>建物集中制御（BAS）</td>
                  <td>PLC＋タッチパネルorPC UI</td>
                  <td>空調・照明・換気等統合制御</td>
                  <td>通信規格（BACnet／Modbus等）統一／ロギング可能</td>
                </tr>
                <tr>
                  <td>BEMS（エネルギー管理）</td>
                  <td>計測CT＋データ収集装置＋クラウド連携</td>
                  <td>エネルギー可視化・負荷最適化</td>
                  <td>中央監視盤／インバータ制御と連携</td>
                </tr>
                <tr>
                  <td>自動制御計装</td>
                  <td>圧力・温度・湿度センサー、コントローラ等</td>
                  <td>AHU・FCU・ポンプ制御</td>
                  <td>配管・ダクト内計装設置スペース・校正要</td>
                </tr>
                <tr>
                  <td>タイムスケジュール制御</td>
                  <td>週次・日次時刻プログラム設定</td>
                  <td>外構照明・空調ON/OFF</td>
                  <td>分電盤組込み／UPS連動が望ましい</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-40" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">照度基準と設計目安（JIS Z 9110）</h4>
          <p className="yy-mi-note">主要な空間用途別の照度基準と設計目安。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>空間用途</th>
                  <th>照度基準 (lx)</th>
                  <th>色温度の目安 (K)</th>
                  <th>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>住宅リビング</td>
                  <td>300〜500</td>
                  <td>2700〜3500</td>
                  <td>温白色推奨／調光器併用可</td>
                </tr>
                <tr>
                  <td>事務所（一般執務）</td>
                  <td>500〜750</td>
                  <td>4000〜5000</td>
                  <td>均等配光、机面照度維持</td>
                </tr>
                <tr>
                  <td>会議室</td>
                  <td>300〜500</td>
                  <td>3500〜4500</td>
                  <td>映像対応照明／グレア防止要</td>
                </tr>
                <tr>
                  <td>廊下・階段</td>
                  <td>100〜200</td>
                  <td>3000〜4000</td>
                  <td>非常照明とのバランス</td>
                </tr>
                <tr>
                  <td>教室</td>
                  <td>500〜750</td>
                  <td>4000〜5000</td>
                  <td>黒板照明別回路推奨／演色性Ra&gt;80が望ましい</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="section-41" className="yy-mi-sec" data-cat="elec">
          <h4 className="yy-mi-ch">実務的な配線・設計注意点</h4>
          <p className="yy-mi-note">実務的な配線・設計における注意点と指針。</p>
          <div className="yy-mi-scroll">
            <table className="yy-tbl yy-mi-tbl">
              <thead>
                <tr>
                  <th>項目分類</th>
                  <th>具体的指針・注意事項</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>幹線サイズ計算</td>
                  <td>許容電流・電圧降下5％以内・同時使用率を考慮（CVケーブル選定）</td>
                </tr>
                <tr>
                  <td>負荷分散設計</td>
                  <td>空調・照明・動力・コンセントを分離し、グルーピングする／分電盤位置と回路長配慮</td>
                </tr>
                <tr>
                  <td>弱電配線分離</td>
                  <td>高圧・低圧・通信を別ルートに敷設（EMC・感電対策）／金属管と樹脂管の干渉注意</td>
                </tr>
                <tr>
                  <td>防火区画貫通</td>
                  <td>ケーブル貫通部には防火材（ロックウール・防火パテ）封止／法令に従い施工写真記録</td>
                </tr>
                <tr>
                  <td>天井内配線管理</td>
                  <td>未来ダクト・ラックで整理／保守点検スペース（300mm以上推奨）確保</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="yy-mi-foot">注：上記は代表例・目安であり、設計・施工では最新のJIS・JASS・メーカー資料・法規を必ず確認してください。</p>
        </div>

        {/* 右:目次 / 関連 / この資料について */}
        <aside className="yy-info-side">
          <section className="yy-info-block" aria-label="目次">
            <SecHead no="I" title="目次" right={`${tab} · ${sections.length} 章`} />
            <ol className="yy-info-toc">
              {sections.map((s, i) => {
                const t = splitTitle(s.title);
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      title={s.title}
                      aria-current={current === s.id ? 'true' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(s.id);
                      }}
                    >
                      <span className="yy-info-tocno">{String(i + 1).padStart(2, '0')}</span>
                      <span className="yy-info-toct">{t.name}</span>
                      {t.note && (
                        <>
                          <span className="yy-leader" />
                          <span className="yy-info-tocv">{t.note}</span>
                        </>
                      )}
                    </a>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="yy-info-block" aria-label="関連">
            <SecHead no="II" title="関連" />
            <ul className="yy-info-toc">
              <li>
                <Link href="/lookup/">
                  <span className="yy-info-toct">建築の調べもの</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">条文と計算 ↗</span>
                </Link>
              </li>
              <li>
                <ScreenLink target={{ menu: 'design-info' }}>
                  <span className="yy-info-toct">設計情報</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">記事</span>
                </ScreenLink>
              </li>
              <li>
                <ScreenLink target={{ menu: 'design-index' }}>
                  <span className="yy-info-toct">設計ツール</span>
                  <span className="yy-leader" />
                  <span className="yy-info-tocv">計算書</span>
                </ScreenLink>
              </li>
            </ul>
          </section>

          <section className="yy-info-block" aria-label="この資料について">
            <SecHead no="III" title="この資料について" />
            <p className="yy-info-text">
              材料・建材に関する情報やリンク集です。意匠、構造、機械、電気の各分野における材料の規格、寸法、特性などの情報をまとめています。※情報は設計者が実務において適切に調査・確認してください。
            </p>
            <p className="yy-info-text is-beta">※この機能は現在β版です。ご意見をぜひお聞かせください。</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default MaterialInfo;
