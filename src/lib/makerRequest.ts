/**
 * Maker conect の依頼文づくり（純粋ロジック）。
 * メーカーごとの窓口（お問い合わせ・サンプル・カタログ・CAD のページ）は makers.json にある。
 * yaneyuka から直接メールできるのは登録済みのメーカーだけなので、それ以外は
 * 「文面を作ってコピー → メーカーの窓口を開いて貼る」で送り、送ったことは担当者連絡先に残す。
 */

export const REQUEST_PURPOSES = ['打合せ依頼', 'カタログ請求', 'サンプル請求', '見積依頼', '技術資料請求', '納まり相談'] as const;
export type RequestPurpose = (typeof REQUEST_PURPOSES)[number];

export type MakerLinksLite = { products?: string; catalog?: string; office?: string; contact?: string; sample?: string; cad?: string };

export type Requester = { companyName: string; personName: string; email: string; phone: string; address?: string };

export type RequestDetail = {
  projectName?: string;
  location?: string;
  part?: string;
  items?: string;
  quantity?: string;
  deadline?: string;
  meetingPlace?: string;
  slots?: string[];
  body?: string;
};

const usable = (u?: string) => !!u && u !== '#' && /^https?:\/\//.test(u);

/** 依頼の種類ごとに、開くべきメーカーのページ（無ければお問い合わせ → 営業所 → 商品ページ） */
export function targetFor(purpose: RequestPurpose, links: MakerLinksLite): { url: string; label: string } | null {
  const order: Array<[keyof MakerLinksLite, string]> =
    purpose === 'サンプル請求'
      ? [['sample', 'サンプル請求ページ'], ['contact', 'お問い合わせ'], ['office', '営業所']]
      : purpose === 'カタログ請求'
        ? [['catalog', 'カタログページ'], ['contact', 'お問い合わせ'], ['office', '営業所']]
        : purpose === '技術資料請求'
          ? [['cad', 'CAD・技術資料ページ'], ['contact', 'お問い合わせ'], ['office', '営業所']]
          : purpose === '打合せ依頼'
            ? [['office', '営業所'], ['contact', 'お問い合わせ']]
            : [['contact', 'お問い合わせ'], ['office', '営業所']];
  for (const [k, label] of [...order, ['products', '商品ページ'] as [keyof MakerLinksLite, string]]) {
    if (usable(links[k])) return { url: links[k]!, label };
  }
  return null;
}

const SUBJECT: Record<RequestPurpose, string> = {
  打合せ依頼: 'お打合せのお願い',
  カタログ請求: 'カタログ送付のお願い',
  サンプル請求: 'サンプル送付のお願い',
  見積依頼: 'お見積りのお願い',
  技術資料請求: '技術資料（CAD・認定書等）のお願い',
  納まり相談: '納まりについてのご相談',
};

const LEAD: Record<RequestPurpose, string> = {
  打合せ依頼: '下記の件で、製品についてお打合せの機会をいただけますでしょうか。',
  カタログ請求: '下記の件で検討しており、カタログをお送りいただけますでしょうか。',
  サンプル請求: '下記の件で検討しており、サンプルをお送りいただけますでしょうか。',
  見積依頼: '下記の件で、お見積りをお願いできますでしょうか。',
  技術資料請求: '下記の件で、CAD データ・認定書・施工要領書などの技術資料をいただけますでしょうか。',
  納まり相談: '下記の件で、納まりについてご相談させてください。',
};

/** 件名と本文（そのままメーカーの問い合わせフォームに貼れる形） */
export function buildRequest(purpose: RequestPurpose, maker: string, who: Requester, d: RequestDetail): { subject: string; text: string } {
  const subject = `${SUBJECT[purpose]}${d.projectName ? `（${d.projectName}）` : ''}`;
  // 空の項目は null にして行ごと消す（'' は意図した空行）
  const line = (label: string, v?: string): string | null => (v && v.trim() ? `${label}: ${v.trim()}` : null);
  const raw: Array<string | null> = [
    `${maker} ご担当者様`,
    '',
    `${who.companyName} の ${who.personName} と申します。`,
    LEAD[purpose],
    '',
    '■ 物件',
    line('物件名', d.projectName),
    line('所在地', d.location),
    line('部位・用途', d.part),
    '',
    '■ ご依頼の内容',
    line('品番・品名', d.items),
    line('数量', d.quantity),
    purpose === '打合せ依頼' ? line('希望日時', d.slots?.filter(Boolean).join(' / ')) : line(purpose === '見積依頼' ? '回答希望日' : '希望時期', d.deadline),
    purpose === '打合せ依頼' ? line('場所', d.meetingPlace || 'オンライン可') : null,
    (purpose === 'カタログ請求' || purpose === 'サンプル請求') ? line('送付先', d.meetingPlace || who.address) : null,
    d.body?.trim() ? '' : null,
    d.body?.trim() ? d.body.trim() : null,
    '',
    '■ 連絡先',
    `${who.companyName}　${who.personName}`,
    line('メール', who.email),
    line('電話', who.phone),
    '',
    'よろしくお願いいたします。',
    '（yaneyuka.com の Maker conect から作成）',
  ];
  const lines = raw.filter((l): l is string => l !== null);
  // 空行を重ねない・中身の無い見出しは出さない
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l === '' && out[out.length - 1] === '') continue;
    if (l.startsWith('■') && (lines[i + 1] === undefined || lines[i + 1] === '' || lines[i + 1].startsWith('■'))) {
      // 見出しの下が全部空なら見出しごと出さない
      let j = i + 1;
      while (j < lines.length && lines[j] === '' ) j++;
      if (j >= lines.length || lines[j].startsWith('■')) continue;
    }
    out.push(l);
  }
  return { subject, text: out.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}

/** 担当者連絡先の履歴に残す種類 */
export function logKindOf(purpose: RequestPurpose): { kind: '打合せ' | 'カタログ' | 'サンプル' | '見積' | '問合せ'; status?: '依頼中' } {
  if (purpose === '打合せ依頼') return { kind: '打合せ' };
  if (purpose === 'カタログ請求') return { kind: 'カタログ' };
  if (purpose === 'サンプル請求') return { kind: 'サンプル', status: '依頼中' };
  if (purpose === '見積依頼') return { kind: '見積' };
  return { kind: '問合せ' };
}

/** 依頼者情報がそろっているか（足りない項目名） */
export function missingRequester(who: Requester): string[] {
  const m: string[] = [];
  if (!who.companyName.trim()) m.push('会社名');
  if (!who.personName.trim()) m.push('氏名');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(who.email.trim())) m.push('メール');
  if (!who.phone.trim()) m.push('電話');
  return m;
}
