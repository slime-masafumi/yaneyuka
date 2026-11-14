'use client';

import React from 'react';
import PageHead, { Stat } from '../ui/PageHead';
import { Intake, RequestPanel, Sec } from './ConnectParts';
import './connect-pages.css';

interface ConstructionCompaniesProps {
  onNavigateToRegistration?: () => void;
}

/**
 * 施工会社の一覧。2026-11-14 に架空の見本を外し、企業からの申し込みで載せる形にした
 * (他サイトの名簿からの転載はしない)。掲載が入ったら、この並びの 1 行の索引で出す。
 */
const CATS = ['建築一式', '土木工事', '設備工事', '内装仕上', '外構工事'];

const ConstructionCompanies: React.FC<ConstructionCompaniesProps> = ({ onNavigateToRegistration }) => (
  <div>
    <PageHead
      no="18"
      en="contractors"
      title="施工会社"
      desc="建築・土木・設備など各専門分野の施工会社"
      right={
        <>
          <Stat n={0} label="社" />
          <Stat n={CATS.length} label="分類" />
        </>
      }
    />
    <div className="yy-newspage">
      <div className="yy-newspage__main">
        <Intake
          what="施工会社"
          uses="設計者・発注者が、協力会社の検討や見積依頼先の候補を探すときに見る一覧です。専門と所在地で絞り込めるように並べます。"
          columns={['社名 · 紹介', '専門', '所在地', '設立', '従業員']}
          fields={['社名・所在地・連絡先(公式サイトの URL)', '専門の工種(建築一式・設備など)', '設立年・従業員数', '紹介文(200 字程度)', '施工実績の写真(権利をお持ちのもの)']}
          cats={CATS}
          onRequest={onNavigateToRegistration}
        />
      </div>
      <aside className="yy-newspage__side">
        <section>
          <Sec no="V" title="掲載希望" />
          <RequestPanel what="施工会社" text="協力会社の検討や見積依頼先リスト作成に使われる一覧です。専門・所在地・実績を掲載できます。" onRequest={onNavigateToRegistration} />
        </section>
      </aside>
    </div>
  </div>
);

export default ConstructionCompanies;
