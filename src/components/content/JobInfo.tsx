'use client';

import React, { useState } from 'react';
import PageHead, { Stat } from '../ui/PageHead';
import { CountList, RequestPanel, SampleLine, Sec, countBy, regionOf, todayJST } from './ConnectParts';
import './connect-pages.css';

interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  employment: string;
  experience: string;
  category: 'isho' | 'kozo' | 'setsubi' | 'sekou' | 'koshubetsu';
  description: string;
  requirements: string[];
  benefits: string[];
  postedDate: string;
}

interface JobInfoProps {
  onNavigateToRegistration?: () => void;
}

const JobInfo: React.FC<JobInfoProps> = ({ onNavigateToRegistration }) => {
  const [activeCategory, setActiveCategory] = useState<string>('isho');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // 求人情報データの定義
  const jobData: Record<string, JobItem[]> = {
    isho: [
      {
        id: 'isho1',
        title: '意匠設計士（住宅・商業建築）',
        company: '株式会社アーキテクトワークス',
        location: '東京都渋谷区',
        salary: '月給 28万円～45万円',
        employment: '正社員',
        experience: '実務経験3年以上',
        category: 'isho',
        description: '住宅から商業建築まで幅広いプロジェクトに携わっていただきます。',
        requirements: ['建築士資格（一級または二級）', 'AutoCAD・Revitスキル', 'チームワーク重視'],
        benefits: ['交通費全額支給', '資格取得支援', '年2回賞与'],
        postedDate: '2024-12-15'
      },
      {
        id: 'isho2',
        title: 'BIM設計エンジニア',
        company: '有限会社モダンデザイン',
        location: '神奈川県横浜市',
        salary: '年俸 400万円～600万円',
        employment: '正社員',
        experience: 'BIM経験2年以上',
        category: 'isho',
        description: 'BIMを活用した最先端の建築設計業務をお任せします。',
        requirements: ['Revit・ArchiCAD経験', '英語読解能力', '新技術への関心'],
        benefits: ['リモートワーク可', '最新ソフトウェア環境', '研修制度充実'],
        postedDate: '2024-12-10'
      },
      {
        id: 'isho3',
        title: 'プロジェクトマネージャー（意匠）',
        company: 'クリエイティブ建築事務所',
        location: '大阪府大阪市',
        salary: '月給 35万円～55万円',
        employment: '正社員',
        experience: '管理経験5年以上',
        category: 'isho',
        description: '大型プロジェクトの企画・管理をリードしていただきます。',
        requirements: ['プロジェクト管理経験', 'コミュニケーション力', '問題解決能力'],
        benefits: ['管理職手当', '社用車支給', '海外研修制度'],
        postedDate: '2024-12-08'
      }
    ],
    kozo: [
      {
        id: 'kozo1',
        title: '構造設計エンジニア',
        company: '構造設計コンサルタント株式会社',
        location: '東京都港区',
        salary: '月給 32万円～50万円',
        employment: '正社員',
        experience: '構造設計経験3年以上',
        category: 'kozo',
        description: '高層建築・大スパン構造の設計業務を担当していただきます。',
        requirements: ['構造設計一級建築士優遇', '構造解析ソフト経験', '耐震設計知識'],
        benefits: ['技術者手当', '学会参加支援', '資格取得奨励金'],
        postedDate: '2024-12-12'
      },
      {
        id: 'kozo2',
        title: '耐震診断技術者',
        company: 'エンジニアリング・ストラクチャー',
        location: '神奈川県川崎市',
        salary: '年俸 450万円～650万円',
        employment: '正社員',
        experience: '耐震診断経験2年以上',
        category: 'kozo',
        description: '既存建物の耐震診断・補強設計を行います。',
        requirements: ['耐震診断資格', '現地調査経験', '報告書作成能力'],
        benefits: ['出張手当', '技術研修充実', '昇進制度明確'],
        postedDate: '2024-12-14'
      },
      {
        id: 'kozo3',
        title: '構造解析スペシャリスト',
        company: 'ストラクチュラル・デザイン',
        location: '愛知県名古屋市',
        salary: '月給 30万円～48万円',
        employment: '正社員',
        experience: '解析業務経験3年以上',
        category: 'kozo',
        description: '最新の構造解析技術を用いた設計業務です。',
        requirements: ['構造解析ソフト精通', 'プログラミング知識歓迎', '数学・物理学素養'],
        benefits: ['在宅勤務可', '最新解析ソフト', '学会発表支援'],
        postedDate: '2024-12-11'
      }
    ],
    setsubi: [
      {
        id: 'setsubi1',
        title: '設備設計技術者（空調・衛生）',
        company: '総合設備設計事務所',
        location: '東京都新宿区',
        salary: '月給 28万円～42万円',
        employment: '正社員',
        experience: '設備設計経験2年以上',
        category: 'setsubi',
        description: '商業施設・オフィスビルの設備設計を担当します。',
        requirements: ['設備士資格歓迎', 'CADスキル必須', '省エネ知識'],
        benefits: ['資格手当', '設計ソフト完備', '継続教育制度'],
        postedDate: '2024-12-13'
      },
      {
        id: 'setsubi2',
        title: '再生可能エネルギー設計者',
        company: 'エコ・エンジニアリング',
        location: '大阪府大阪市',
        salary: '年俸 380万円～580万円',
        employment: '正社員',
        experience: '新卒・第二新卒歓迎',
        category: 'setsubi',
        description: '太陽光発電・地中熱システムの設計業務です。',
        requirements: ['環境工学知識', '新技術への興味', 'チャレンジ精神'],
        benefits: ['研修制度充実', '環境認定資格支援', '成長企業'],
        postedDate: '2024-12-09'
      },
      {
        id: 'setsubi3',
        title: 'スマートビル設計エンジニア',
        company: 'スマート設備デザイン',
        location: '福岡県福岡市',
        salary: '月給 30万円～45万円',
        employment: '正社員',
        experience: 'IoT・自動制御経験',
        category: 'setsubi',
        description: 'IoT技術を活用したスマートビルシステムの設計です。',
        requirements: ['プログラミング能力', 'IoT知識', 'システム設計経験'],
        benefits: ['最新技術環境', 'リモートワーク', 'ストックオプション'],
        postedDate: '2024-12-07'
      }
    ],
    sekou: [
      {
        id: 'sekou1',
        title: '建築施工管理技士',
        company: '大手総合建設会社',
        location: '東京都千代田区',
        salary: '月給 35万円～55万円',
        employment: '正社員',
        experience: '施工管理経験3年以上',
        category: 'sekou',
        description: '大型建築プロジェクトの施工管理業務です。',
        requirements: ['一級建築施工管理技士', '現場経験豊富', 'リーダーシップ'],
        benefits: ['現場手当', '社宅制度', '海外プロジェクト参加機会'],
        postedDate: '2024-12-16'
      },
      {
        id: 'sekou2',
        title: '土木施工管理者',
        company: 'インフラ建設株式会社',
        location: '神奈川県相模原市',
        salary: '年俸 500万円～750万円',
        employment: '正社員',
        experience: '土木工事経験5年以上',
        category: 'sekou',
        description: '道路・橋梁・上下水道工事の施工管理を行います。',
        requirements: ['土木施工管理技士', '測量知識', '安全管理意識'],
        benefits: ['危険手当', '技術研修', '昇格制度'],
        postedDate: '2024-12-05'
      },
      {
        id: 'sekou3',
        title: '品質管理責任者',
        company: 'クオリティ建設',
        location: '愛知県名古屋市',
        salary: '月給 32万円～48万円',
        employment: '正社員',
        experience: '品質管理経験3年以上',
        category: 'sekou',
        description: '建築品質の管理・検査業務を担当します。',
        requirements: ['品質管理資格', '検査経験', '細かい作業が得意'],
        benefits: ['品質手当', '検査機器完備', '安定企業'],
        postedDate: '2024-12-06'
      }
    ],
    koshubetsu: [
      {
        id: 'koshu1',
        title: '鉄筋工事技能者',
        company: '専門工事業者協同組合',
        location: '東京都江東区',
        salary: '日給 12,000円～18,000円',
        employment: '正社員・日雇い選択可',
        experience: '未経験者歓迎',
        category: 'koshubetsu',
        description: '鉄筋組立・配筋作業を行います。技能習得支援あり。',
        requirements: ['体力に自信', '高所作業可能', 'チームワーク'],
        benefits: ['技能講習費用負担', '道具貸与', '昇給制度'],
        postedDate: '2024-12-14'
      },
      {
        id: 'koshu2',
        title: '左官職人',
        company: '伝統左官技術保存会',
        location: '京都府京都市',
        salary: '月給 25万円～40万円',
        employment: '正社員',
        experience: '左官経験1年以上',
        category: 'koshubetsu',
        description: '伝統的な左官技術から現代工法まで幅広く対応。',
        requirements: ['左官技能', '伝統技術への関心', '職人気質'],
        benefits: ['技能検定支援', '伝統技術継承', '独立支援'],
        postedDate: '2024-12-03'
      },
      {
        id: 'koshu3',
        title: '防水工事スペシャリスト',
        company: '防水工事専門会社',
        location: '大阪府堺市',
        salary: '月給 28万円～42万円',
        employment: '正社員',
        experience: '防水工事経験2年以上',
        category: 'koshubetsu',
        description: '屋上・外壁防水工事の施工・管理業務です。',
        requirements: ['防水施工技能士', '高所作業資格', '責任感'],
        benefits: ['技術研修充実', '資格取得支援', '独立支援制度'],
        postedDate: '2024-12-01'
      }
    ]
  };

  const showContactForm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigateToRegistration) {
      onNavigateToRegistration();
    } else {
      alert('掲載希望フォームを表示します（実装予定）');
    }
  };

  const displayJobSubType = (category: string) => {
    if (category === activeCategory) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  const getCurrentItems = (): JobItem[] => {
    if (!activeCategory) return [];
    return jobData[activeCategory] || [];
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      isho: '意匠設計',
      kozo: '構造設計',
      setsubi: '設備設計',
      sekou: '施工管理',
      koshubetsu: '工種別'
    };
    return names[category] || category;
  };

  // ---- モック「高級感 3」:職種は下線タブ、求人は 1 行の索引(掲載日は明朝の数字)、右に新しい掲載・地域ごとの件数・掲載希望 ----
  const CATS = ['isho', 'kozo', 'setsubi', 'sekou', 'koshubetsu'];
  const all = CATS.flatMap((c) => jobData[c] || []);
  const regions = countBy(all, (x) => regionOf(x.location));
  const latest = [...all].sort((a, b) => b.postedDate.localeCompare(a.postedDate));
  const today = todayJST();
  const md = (iso: string) => iso.slice(5).replace('-', '.');
  const yr = (iso: string) => (iso.slice(0, 4) !== today.slice(0, 4) ? iso.slice(0, 4) : '');
  const sampleAlert = () => alert('こちらはサンプルになります。\n掲載希望の方は「掲載希望はコチラ」よりご連絡下さい。');

  const renderContent = () => {
    if (!activeCategory) {
      return <p className="yy-home__empty">上のタブから表示する内容を選択してください。</p>;
    }

    const items = getCurrentItems();

    if (items.length === 0) {
      return <p className="yy-home__empty">該当する求人情報がありません。</p>;
    }

    return (
      <>
        <SampleLine target="求人" onRequest={onNavigateToRegistration} />
        <div className="yy-jb-row yy-jb-row--head">
          <span>掲載日</span>
          <span>職種 · 会社 · 応募要件 · 待遇</span>
          <span className="yy-jb-loc">勤務地</span>
          <span className="yy-jb-pay">給与 · 雇用形態 · 経験</span>
          <span />
        </div>
        {items.map((item) => (
          <div key={item.id} className="yy-jb-row">
            <span className="yy-jb-date" title={`掲載日: ${item.postedDate}`}>
              {md(item.postedDate)}
              {yr(item.postedDate) && <small>{yr(item.postedDate)}</small>}
            </span>
            <span className="yy-cn-body">
              <span className="yy-cn-title" title={item.title}>{item.title}</span>
              <span className="yy-cn-sub" title={`${item.company} · ${item.description}`}>
                {item.company} · {item.description}
              </span>
              <span className="yy-cn-sub yy-jb-req" title={`応募要件: ${item.requirements.join('、')} / 待遇・福利厚生: ${item.benefits.join('、')}`}>
                <i>要件</i>
                {item.requirements.slice(0, 2).join('、')}
                <i style={{ marginLeft: 8 }}>待遇</i>
                {item.benefits.slice(0, 2).join('、')}
              </span>
            </span>
            <span className="yy-cn-cell yy-jb-loc" title={`勤務地: ${item.location}`}>{item.location}</span>
            <span className="yy-jb-pay">
              <b title={item.salary}>{item.salary}</b>
              <span title={`${item.employment} · ${item.experience}`}>
                {item.employment} · {item.experience}
              </span>
            </span>
            <button type="button" className="yy-linkbtn yy-cn-act" onClick={sampleAlert}>
              応募する
            </button>
          </div>
        ))}
      </>
    );
  };

  return (
    <div>
      <PageHead
        no="22"
        en="jobs"
        title="求人情報"
        desc="建築・設備・施工分野の求人を職種別に"
        right={
          <>
            <Stat n={all.length} label="件" />
            <Stat n={CATS.length} label="職種" />
            <Stat n={regions.length} label="地域" />
            <a href="#" onClick={showContactForm} className="yy-stat" style={{ textDecoration: 'none' }}>
              掲載希望はコチラ ↗
            </a>
          </>
        }
      />

      <div id="job-navigation" className="yy-tabs">
        {CATS.map((c) => (
          <button key={c} type="button" className="yy-tab" aria-pressed={activeCategory === c} onClick={() => displayJobSubType(c)}>
            {getCategoryName(c)}
            <small>{(jobData[c] || []).length}</small>
          </button>
        ))}
      </div>

      <div className="yy-newspage">
        <div id="job-subtype-content" className={`yy-newspage__main yy-cn-fade${isTransitioning ? ' is-out' : ''}`}>
          <section className="yy-cn-list">
            <Sec no="I" title={getCategoryName(activeCategory)} right={`${getCurrentItems().length} 件`} />
            {renderContent()}
          </section>
        </div>
        <aside className="yy-newspage__side">
          <section>
            <Sec no="II" title="新しい掲載" right="全職種" />
            <ul className="yy-cn-due">
              {latest.slice(0, 5).map((x) => (
                <li key={x.id}>
                  <span className="yy-cn-due__d">{md(x.postedDate)}</span>
                  <span className="yy-cn-due__b">
                    <span className="yy-cn-due__t" title={x.title}>{x.title}</span>
                    <span className="yy-cn-due__s">
                      {getCategoryName(x.category)} · {regionOf(x.location)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <Sec no="III" title="地域ごとの件数" right="全職種" />
            <CountList rows={regions.map(([k, n]) => ({ key: k, label: k, n }))} />
          </section>
          <section>
            <Sec no="IV" title="掲載希望" />
            <RequestPanel
              what="求人"
              text="採用動向の把握や転職検討に使われる一覧です。職種・勤務地・給与・待遇を掲載できます。"
              onRequest={onNavigateToRegistration}
            />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default JobInfo;
