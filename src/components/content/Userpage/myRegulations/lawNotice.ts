/**
 * My法規の改正をベルの通知に出す。
 *
 * 照合（lawSync.checkHouki）の結果は画面の中の印にしか出ておらず、My法規を開かない人には
 * 改正が伝わらなかった。改正を見つけたら users/{uid}/notifications に 1 件書く。
 * 通知を読むのは上部ナビのベル（src/components/layout/NotificationBell.tsx）。
 *
 * 同じ改正で何度も通知しないよう、id は「法令 + 版」から決める。既にあれば書かない
 * （上書きすると既読が未読に戻ってしまう）。
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { toWareki } from '@/lib/egovLaw';
import type { HoukiCheck, LawLink } from './lawSync';

type ArticleRef = { id: string; jo: string; ko: string; go: string; source?: unknown };

export type LawNotice = { id: string; title: string; body: string };

/** Firestore の id に使えない字（/ など）を落とす */
const safeId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 300);

const label = (a: ArticleRef) => `${a.jo}${a.ko}${a.go}`.trim() || '（条項未設定）';

const listArticles = (names: string[]) => {
  const head = names.slice(0, 4).join('・');
  return names.length > 4 ? `${head} ほか${names.length - 4}件` : head;
};

/**
 * 照合結果から、出すべき通知を作る（純粋関数）。
 * - 現行の改正で変わった条文（「このまま残す」を選んだものは除く）→「法令が改正されました」
 * - 施行前の改正で変わる条文 →「施行予定の改正があります」
 * 手で貼った条文が現行と違うだけのもの（differs）は、改正ではないので通知しない。
 */
export function lawNoticesFrom(link: LawLink, check: HoukiCheck, articles: ArticleRef[]): LawNotice[] {
  if (check.error) return [];
  const out: LawNotice[] = [];

  const changed = articles.filter((a) => {
    const c = check.articles[a.id];
    // 見つからない条項は、以前は照合できていたもの（=改正で消えた・繰り下がった）だけ。
    // 初めから番号を打ち間違えているものまで「改正」と言わない
    return (c?.status === 'changed' && !c.acked) || (c?.status === 'missing' && !!a.source);
  });
  if (changed.length && check.current) {
    const when = toWareki(check.current.enforcementDate);
    out.push({
      id: safeId(`lawRevision_${link.lawId}_${check.current.revisionId}`),
      title: '法令が改正されました',
      body: `${link.lawTitle} ${listArticles(changed.map(label))}${when ? `（${when}施行）` : ''}`,
    });
  }

  // 施行前の改正は、版ごとに 1 件
  const byRevision = new Map<string, { date: string | null; names: string[] }>();
  for (const a of articles) {
    const c = check.articles[a.id];
    if (!c || !('upcoming' in c) || !c.upcoming) continue;
    const r = c.upcoming.revision;
    const cur = byRevision.get(r.revisionId) ?? { date: r.enforcementDate, names: [] };
    cur.names.push(label(a));
    byRevision.set(r.revisionId, cur);
  }
  for (const [revisionId, v] of byRevision) {
    const when = toWareki(v.date);
    out.push({
      id: safeId(`lawRevision_${link.lawId}_${revisionId}`),
      title: '施行予定の改正があります',
      body: `${link.lawTitle} ${listArticles(v.names)}（${when ? `${when}施行予定` : '施行日未定'}）`,
    });
  }
  return out;
}

/** 通知を書く。既にある id は触らない。失敗しても照合そのものは止めない */
export async function writeLawNotices(uid: string, notices: LawNotice[]): Promise<void> {
  for (const n of notices) {
    try {
      const ref = doc(db, 'users', uid, 'notifications', n.id);
      if ((await getDoc(ref)).exists()) continue;
      await setDoc(ref, {
        type: 'lawRevision',
        title: n.title,
        body: n.body,
        link: '/?m=my-regulations',
        createdAt: Date.now(),
        read: false,
      });
    } catch (e) {
      console.warn('改正の通知を書けませんでした', e);
    }
  }
}
