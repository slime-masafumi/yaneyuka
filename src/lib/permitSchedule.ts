/**
 * 建築確認・検査の期限の逆算（Myカレンダーの「手続きの期限を入れる」）。
 * テスト: node scripts/test-permit-schedule.ts
 *
 * 建築基準法
 *   6条4項  確認: 受理から 35 日以内（法6条1項1〜2号＝新2号など）／7 日以内（新3号）
 *   6条7項  構造計算適合性判定が要るときは 35 日の範囲で延長できる（最大 70 日）
 *   7条の3 2項  中間検査の申請: 特定工程の工事を終えた日から 4 日以内
 *   7条の3 4項  中間検査: 申請の受理から 4 日以内
 *   7条 2項  完了検査の申請: 工事を完了した日から 4 日以内
 *   7条 4項  完了検査: 申請の受理から 7 日以内
 * 「〜の日から n 日以内」は初日を数えないので、基準日に n 日を足した日が期限。
 */

export type ReviewClass = 'large' | 'small' | 'tekihan';

export const REVIEW_CLASSES: { id: ReviewClass; label: string; days: number }[] = [
  { id: 'large', label: '新2号・特殊建築物など（審査 35 日以内）', days: 35 },
  { id: 'small', label: '新3号（平屋かつ200㎡以下など・審査 7 日以内）', days: 7 },
  { id: 'tekihan', label: '構造計算適合性判定あり（最大 70 日）', days: 70 },
];

export type PermitInput = {
  project: string;
  /** 着工予定日 */
  start: string;
  /** 特定工程の工事を終える予定日（中間検査がある場合） */
  specificProcess?: string;
  /** 工事の完了予定日 */
  finish?: string;
  review: ReviewClass;
  /** 確認申請に、法定の審査期間とは別に見ておく余裕（補正のやりとりなど）日数 */
  margin?: number;
};

export type Milestone = { date: string; title: string; note: string; kind: 'deadline' | 'event' };

const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  const x = new Date(y, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export function permitMilestones(inp: PermitInput): Milestone[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inp.start)) return [];
  const p = inp.project.trim() ? `【${inp.project.trim()}】` : '';
  const review = REVIEW_CLASSES.find((r) => r.id === inp.review) ?? REVIEW_CLASSES[0];
  const margin = inp.margin ?? 14;
  const out: Milestone[] = [
    {
      date: addDays(inp.start, -(review.days + margin)),
      title: `${p}確認申請 提出（目安）`,
      note: `法定の審査期間 ${review.days} 日＋補正などの余裕 ${margin} 日を着工日から逆算。確認済証が出るまで着工できません（法6条）`,
      kind: 'deadline',
    },
    { date: inp.start, title: `${p}着工`, note: '確認済証の交付を受けてから', kind: 'event' },
  ];
  if (inp.specificProcess && /^\d{4}-\d{2}-\d{2}$/.test(inp.specificProcess)) {
    out.push(
      { date: inp.specificProcess, title: `${p}特定工程 完了`, note: '中間検査の対象工程（自治体が指定）', kind: 'event' },
      {
        date: addDays(inp.specificProcess, 4),
        title: `${p}中間検査 申請期限`,
        note: '特定工程の工事を終えた日から 4 日以内（法7条の3第2項）。検査は受理から 4 日以内（同4項）。合格するまで次の工程に進めません',
        kind: 'deadline',
      }
    );
  }
  if (inp.finish && /^\d{4}-\d{2}-\d{2}$/.test(inp.finish)) {
    out.push(
      { date: inp.finish, title: `${p}工事完了`, note: '', kind: 'event' },
      {
        date: addDays(inp.finish, 4),
        title: `${p}完了検査 申請期限`,
        note: '工事を完了した日から 4 日以内（法7条2項）',
        kind: 'deadline',
      },
      {
        date: addDays(inp.finish, 4 + 7),
        title: `${p}完了検査（遅くとも）`,
        note: '申請の受理から 7 日以内に検査（法7条4項）。検査済証が出るまで原則使用できません（法7条の6）',
        kind: 'event',
      }
    );
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
