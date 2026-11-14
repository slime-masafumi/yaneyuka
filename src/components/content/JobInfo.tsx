'use client';

import React from 'react';
import PageHead, { Stat } from '../ui/PageHead';
import { Intake, RequestPanel, Sec } from './ConnectParts';
import './connect-pages.css';

interface JobInfoProps {
  onNavigateToRegistration?: () => void;
}

/**
 * 求人情報。2026-11-14 に架空の見本を外し、企業から直接いただいた求人だけを載せる形にした。
 * 他の求人サイトからの転載はしない。求人情報を載せるサイトは職業安定法の「募集情報等提供事業」に当たるので、
 * 応募はこのサイトで受け付けず(求職者の個人情報を預からない)、企業の採用ページへ案内する。
 */
const CATS = ['意匠設計', '構造設計', '設備設計', '施工管理', '工種別'];

const JobInfo: React.FC<JobInfoProps> = ({ onNavigateToRegistration }) => (
  <div>
    <PageHead
      no="20"
      en="jobs"
      title="求人情報"
      desc="建築・設備・施工分野の求人を職種別に"
      right={
        <>
          <Stat n={0} label="件" />
          <Stat n={CATS.length} label="職種" />
        </>
      }
    />
    <div className="yy-newspage">
      <div className="yy-newspage__main">
        <Intake
          what="求人"
          uses="建築・設備・施工の仕事を探す人が見る一覧です。職種と勤務地で絞り込めるように並べ、応募は各社の採用ページへご案内します。"
          columns={['職種 · 会社', '勤務地', '雇用形態', '給与', '掲載日']}
          fields={['会社名・採用ページの URL', '職種・仕事の内容', '勤務地・雇用形態', '給与・待遇(実際の条件どおりに)', '掲載の期限(募集を終えたら取り下げ)']}
          cats={CATS}
          rules={[
            '企業・団体から直接いただいた求人だけを載せます。他の求人サイトからの転載はしません。',
            '応募はこのサイトでは受け付けません。各社の採用ページへご案内し、応募者の個人情報はお預かりしません。',
            '募集の内容は実際の条件どおりに書き、募集を終えた求人や条件が変わった求人はすぐに直すか取り下げます(職業安定法の的確な表示)。',
          ]}
          onRequest={onNavigateToRegistration}
        />
      </div>
      <aside className="yy-newspage__side">
        <section>
          <Sec no="V" title="掲載希望" />
          <RequestPanel what="求人" text="採用動向の把握や転職検討に使われる一覧です。職種・勤務地・給与・待遇を掲載できます。" onRequest={onNavigateToRegistration} />
        </section>
      </aside>
    </div>
  </div>
);

export default JobInfo;
