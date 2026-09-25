// Maker conect の依頼文（src/lib/makerRequest.ts）のテスト。  node scripts/test-maker-request.ts
import { targetFor, buildRequest, logKindOf, missingRequester } from '../src/lib/makerRequest.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const links = { products: 'https://m.example/p', catalog: 'https://m.example/c', contact: 'https://m.example/q', sample: '#', cad: '' };
check('サンプルのページが無ければお問い合わせ', targetFor('サンプル請求', links), { url: 'https://m.example/q', label: 'お問い合わせ' });
check('カタログ請求はカタログのページ', targetFor('カタログ請求', links)?.label, 'カタログページ');
check('何も無ければ商品ページ', targetFor('見積依頼', { products: 'https://m.example/p' })?.label, '商品ページ');
check('どこも無ければ null', targetFor('見積依頼', { contact: '#' }), null);

const who = { companyName: '合同会社slime', personName: '山田', email: 'a@b.jp', phone: '03-0000-0000', address: '東京都…' };
const r = buildRequest('サンプル請求', '旭化成建材', who, { projectName: 'A邸', part: '外壁', items: 'ヘーベル 37mm 色見本', quantity: '各1' });
check('件名に物件名', r.subject, 'サンプル送付のお願い（A邸）');
check('宛名', r.text.startsWith('旭化成建材 ご担当者様'), true);
check('入れた項目は出る', r.text.includes('品番・品名: ヘーベル 37mm 色見本'), true);
check('送付先は依頼者の住所', r.text.includes('送付先: 東京都…'), true);
check('空の項目は出さない', r.text.includes('所在地:'), false);
check('空行は重ねない', /\n\n\n/.test(r.text), false);
check('空の項目の跡に空行を残さない', buildRequest('カタログ請求', 'X', who, { projectName: 'A邸', part: '屋根' }).text.includes('物件名: A邸\n部位・用途: 屋根'), true);
const m = buildRequest('打合せ依頼', 'LIXIL', who, { slots: ['10/1 10:00', '', '10/2 14:00'] });
check('打合せは候補日', m.text.includes('希望日時: 10/1 10:00 / 10/2 14:00'), true);
check('物件が空なら見出しごと出さない', m.text.includes('■ 物件'), false);
check('履歴の種類（サンプルは依頼中）', logKindOf('サンプル請求'), { kind: 'サンプル', status: '依頼中' });
check('足りない依頼者情報', missingRequester({ companyName: 'x', personName: '', email: 'bad', phone: '' }), ['氏名', 'メール', '電話']);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
