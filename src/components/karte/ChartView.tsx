'use client';

import React, { useState } from 'react';
import ProjectForm from './ProjectForm';
import { depShow, staleOf, stamp, type Study } from '@/lib/karte/engine';
import { DEP_LABEL, type Project, type ToolKey } from '@/lib/karte/masters';

type Props = {
  project: Project;
  studies: Study[];
  onSaveProject: (p: Project) => void;
  onReopen: (tool: ToolKey) => void;
  onDelete: (id: string) => void;
  persistent: boolean;
};

/** カルテ = 物件条件の入力 ＋ 検討の記録 */
export default function ChartView({ project, studies, onSaveProject, onReopen, onDelete, persistent }: Props) {
  const [shareNote, setShareNote] = useState(false);

  return (
    <section>
      <h1>{project.name}</h1>
      <p className="yk-hint" style={{ marginBottom: 16 }}>
        ここに入れた条件が、意匠・構造・設備・電気の各検討で共通に使われます。関係のない項目は自動でグレーになります。
      </p>
      <ProjectForm key={project.id} project={project} onSave={onSaveProject} />
      <p className="yk-hint">V₀・粗度区分・Z・垂直積雪量は告示および自治体規則で地域ごとに定まります。所在地からの自動取得は今後の対応です。</p>

      <h2>
        検討の記録
        {studies.length > 0 && <span className="yk-cnt">　{studies.length} 件</span>}
      </h2>
      {studies.length === 0 ? (
        <div className="yk-empty-state">
          まだ記録がありません。<br />各分野の項目から計算すると、根拠つきでここに残ります。
        </div>
      ) : (
        <>
          {studies.map((s) => {
            const diffs = staleOf(s, project);
            return (
              <article key={s.id} className={`yk-study${diffs.length ? ' yk-stale' : ''}`}>
                {diffs.length > 0 && (
                  <p className="yk-flag">
                    <b>要再確認</b>　検討後に条件が変わりました：
                    {diffs.map((d, i) => (
                      <React.Fragment key={d.k}>
                        {i > 0 && '、'}
                        {DEP_LABEL[d.k] ?? d.k} <span className="yk-d">{depShow(d.k, d.was)} → {depShow(d.k, d.now)}</span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
                <header>
                  <h3>{s.title}</h3>
                  <span className={`yk-res${s.ok ? '' : ' yk-ng'}`}>{s.result}</span>
                  <time dateTime={s.at}>{stamp(s.at)}</time>
                </header>
                <dl className="yk-kv">
                  {Object.entries(s.inputs).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </React.Fragment>
                  ))}
                </dl>
                <p className="yk-hint">{s.detail ? `${s.detail}　` : ''}根拠：{s.basis}</p>
                <p className={`yk-memo${s.memo ? '' : ' yk-empty'}`}>{s.memo || 'メモなし'}</p>
                <div className="yk-acts">
                  <button type="button" className="yk-btn yk-ghost yk-small" onClick={() => onReopen(s.tool)}>開き直す</button>
                  <button type="button" className="yk-btn yk-ghost yk-small yk-danger" onClick={() => onDelete(s.id)}>削除</button>
                </div>
              </article>
            );
          })}
          <div className="yk-acts">
            <button type="button" className="yk-btn yk-ghost" onClick={() => setShareNote(true)}>共有リンクを作る</button>
            <button type="button" className="yk-btn yk-ghost" onClick={() => window.print()}>印刷・PDFで出す</button>
            {shareNote && (
              <span className="yk-hint">
                共有リンク（施主・工務店・審査機関に読み取り専用で渡す限定URL）は準備中です。いまは「印刷・PDF」でお渡しください。
              </span>
            )}
          </div>
        </>
      )}

      <p className="yk-note">
        {persistent
          ? 'データはこの端末（ブラウザ）の中だけに保存され、サーバーには送られません。別の端末や他の人とは共有されません。ブラウザのサイトデータを消すと記録も消えます。'
          : 'このブラウザでは保存領域が使えないため、記録はページを閉じると消えます。'}
      </p>
    </section>
  );
}
