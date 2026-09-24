/**
 * スケジュール調整を「建設プロジェクトの日程調整」にする（純粋ロジック）。
 *   - 候補に種別（現場定例・中間検査・施主打合せ…）
 *   - 回答者に役割（施主・設計・施工…）を主催者が付け、「この役割は必ず出る」を満たす日を探す
 * 役割は回答者の入力欄を増やさず、主催者がスケジュールの側に持つ（回答のルールを変えずに済む）。
 */

export const MEETING_KINDS = ['現場定例', '施主打合せ', '設計打合せ', '中間検査', '完了検査', '配筋検査', '社内検査', 'その他'];
export const PARTY_ROLES = ['施主', '設計', '施工', '構造', '設備', '確認検査機関', 'その他'];

type Resp = { participantId: string; optionId: string; value: string };

export type Coverage = {
  optionId: string;
  yes: number;
  maybe: number;
  /** 必須の役割のうち、○ の人が 1 人もいない役割 */
  missing: string[];
  /** 必須の役割のうち、△ の人しかいない役割 */
  weak: string[];
  allOk: boolean;
};

/** 回答が無い欄は △（画面の表示と同じ扱い） */
const valueOf = (responses: Resp[], pid: string, oid: string) => responses.find((r) => r.participantId === pid && r.optionId === oid)?.value ?? 'maybe';

export function roleCoverage(
  options: { id: string }[],
  participants: { id: string }[],
  responses: Resp[],
  roles: Record<string, string>,
  required: string[],
): Coverage[] {
  return options.map((o) => {
    let yes = 0;
    let maybe = 0;
    const yesRoles = new Set<string>();
    const maybeRoles = new Set<string>();
    for (const p of participants) {
      const v = valueOf(responses, p.id, o.id);
      const role = roles[p.id];
      if (v === 'yes') {
        yes++;
        if (role) yesRoles.add(role);
      } else if (v === 'maybe') {
        maybe++;
        if (role) maybeRoles.add(role);
      }
    }
    const missing = required.filter((r) => !yesRoles.has(r) && !maybeRoles.has(r));
    const weak = required.filter((r) => !yesRoles.has(r) && maybeRoles.has(r));
    return { optionId: o.id, yes, maybe, missing, weak, allOk: required.length > 0 && missing.length === 0 && weak.length === 0 };
  });
}

/** 確定の候補: 必須の役割が全員○ → ○の数 → △の数 → 先の候補 */
export function bestOption(cov: Coverage[]): string {
  let best: Coverage | null = null;
  for (const c of cov) {
    if (!best) {
      best = c;
      continue;
    }
    const k = (x: Coverage) => [x.allOk ? 1 : 0, -x.missing.length, x.yes, x.maybe];
    const a = k(c);
    const b = k(best);
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        if (a[i] > b[i]) best = c;
        break;
      }
    }
  }
  return best?.optionId ?? '';
}
