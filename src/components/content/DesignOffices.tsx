'use client';

import React from 'react';
import PageHead, { Stat } from '../ui/PageHead';
import { Intake, RequestPanel, Sec } from './ConnectParts';
import './connect-pages.css';

interface DesignOfficesProps {
  onNavigateToRegistration?: () => void;
}

/**
 * 設計事務所の一覧。2026-11-14 に架空の見本を外し、事務所からの申し込みで載せる形にした
 * (建築士事務所の名簿などからの転載はしない)。
 */
const CATS = ['意匠設計', '構造設計', '設備設計', '環境設計'];

const DesignOffices: React.FC<DesignOfficesProps> = ({ onNavigateToRegistration }) => (
  <div>
    <PageHead
      no="19"
      en="design offices"
      title="設計事務所"
      desc="意匠・構造・設備など専門分野ごとの設計事務所"
      right={
        <>
          <Stat n={0} label="事務所" />
          <Stat n={CATS.length} label="分野" />
        </>
      }
    />
    <div className="yy-newspage">
      <div className="yy-newspage__main">
        <Intake
          what="設計事務所"
          uses="外部パートナーや協力事務所を探す設計者・施工会社・発注者が見る一覧です。得意な分野と所在地で絞り込めるように並べます。"
          columns={['事務所名 · 紹介', '分野', '所在地', '設立', '所員']}
          fields={['事務所名・所在地・公式サイトの URL', '建築士事務所の登録(一級・二級・木造の別と登録番号)', '得意な分野・用途', '紹介文(200 字程度)', '作品の写真(権利をお持ちのもの)']}
          cats={CATS}
          onRequest={onNavigateToRegistration}
        />
      </div>
      <aside className="yy-newspage__side">
        <section>
          <Sec no="V" title="掲載希望" />
          <RequestPanel what="設計事務所" text="外部パートナーの探索や提携検討に使われる一覧です。得意領域・所在地・実績を掲載できます。" onRequest={onNavigateToRegistration} />
        </section>
      </aside>
    </div>
  </div>
);

export default DesignOffices;
