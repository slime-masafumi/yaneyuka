'use client';

import React, { useState } from 'react';
import ProjectForm from './ProjectForm';
import { KV, SecHead } from '@/components/ui/Sheet';
import { depShow, staleOf, stamp, type Study } from '@/lib/karte/engine';
import { DEP_LABEL, type Project, type ToolKey } from '@/lib/karte/masters';

type Props = {
  project: Project;
  studies: Study[];
  onSaveProject: (p: Project) => void;
  onReopen: (tool: ToolKey) => void;
  onDelete: (id: string) => void;
};

/**
 * カルテ = 物件条件の入力（I・II）＋ 検討の記録（III）。
 * 記録は「番号 / 検討名 / 結果（明朝）/ 日時」の 1 行と、その下に入力値を「項目 ……… 値」で。
 */
export default function ChartView({ project, studies, onSaveProject, onReopen, onDelete }: Props) {
  const [shareNote, setShareNote] = useState(false);

  return (
    <>
      <ProjectForm key={project.id} project={project} onSave={onSaveProject} />

      <section>
        <SecHead no="III" title="検討の記録" right={studies.length ? `${studies.length} 件 · 新しい順` : undefined} />
        {studies.length === 0 ? (
          <p className="yy-home__empty">
            まだ記録がありません。各分野の項目から計算すると、根拠つきでここに残ります。
          </p>
        ) : (
          <>
            <ol className="yy-kt-rec">
              {studies.map((s, i) => {
                const diffs = staleOf(s, project);
                return (
                  <li key={s.id}>
                    <div className="yy-kt-rec__head">
                      <span className="yy-kt-rec__no">{String(i + 1).padStart(2, '0')}</span>
                      <span className="yy-kt-rec__title">{s.title}</span>
                      <span className={`yy-kt-rec__res${s.ok ? '' : ' is-ng'}`}>{s.result}</span>
                      <time className="yy-kt-rec__at" dateTime={s.at}>
                        {stamp(s.at)}
                      </time>
                    </div>
                    {diffs.length > 0 && (
                      <p className="yy-kt-rec__flag">
                        <b>要再確認</b>検討後に条件が変わりました：
                        {diffs.map((d, j) => (
                          <React.Fragment key={d.k}>
                            {j > 0 && '、'}
                            {DEP_LABEL[d.k] ?? d.k} {depShow(d.k, d.was)} → {depShow(d.k, d.now)}
                          </React.Fragment>
                        ))}
                      </p>
                    )}
                    <div className="yy-kt-rec__body">
                      <div className="yy-kt-rec__kv">
                        {Object.entries(s.inputs).map(([k, v]) => (
                          <KV key={k} k={k} v={v} />
                        ))}
                      </div>
                      <p className="yy-kt-rec__basis">
                        {s.detail ? `${s.detail}　` : ''}根拠：{s.basis}
                      </p>
                      <p className={`yy-kt-rec__memo${s.memo ? '' : ' is-empty'}`}>{s.memo || 'メモなし'}</p>
                      <div className="yy-kt-rec__acts">
                        {s.tool === 'dt' ? (
                          s.href && (
                            <a className="yy-kt-link" href={s.href}>
                              開き直す
                            </a>
                          )
                        ) : (
                          <button type="button" className="yy-kt-link" onClick={() => onReopen(s.tool)}>
                            開き直す
                          </button>
                        )}
                        <button type="button" className="yy-kt-link is-mute is-del" onClick={() => onDelete(s.id)}>
                          削除
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="yy-kt-acts">
              <button type="button" className="yy-btn" onClick={() => setShareNote(true)}>
                共有リンクを作る
              </button>
              <button type="button" className="yy-btn" onClick={() => window.print()}>
                印刷・PDFで出す
              </button>
              {shareNote && (
                <span className="yy-kt-note" style={{ marginTop: 0 }}>
                  共有リンク（施主・工務店・審査機関に読み取り専用で渡す限定URL）は準備中です。いまは「印刷・PDF」でお渡しください。
                </span>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
