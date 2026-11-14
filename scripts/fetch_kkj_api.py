"""
公共工事(官公需情報ポータルサイト)の取得。公式の検索 API を使う(2026-11-14)。

    python scripts/fetch_kkj_api.py [--dry-run] [--pref 13]
    .github/workflows/daily_scrape.yml が平日に実行する

以前の scripts/scrape_kkj.py は検索画面の HTML を読み、件名に発注機関が無いと詳細ページを 1 件ずつ開いていた。
北海道から順に 12 県ほど読むと相手から接続を断られ(Connection refused)、13 番目の東京以降が毎回 0 件だった。
東京は 2026-08-21 を最後に更新が止まっていた。また地域を件名の地名から推測していたため、
大阪の「国立文楽劇場」の工事が東京に入るなどの誤りがあった。

公式 API(https://www.kkj.go.jp/api/ 、ガイド V1.1)なら、都道府県ごとに 1 回の呼び出しで
件名・機関名・都道府県・公告日がそろって返る。工事(Category=2)・公告日が 45 日以内に絞って、
47 都道府県を 5 秒おきに 1 回ずつ読む(計 47 回)。失敗したら間を空けて最大 3 回まで読み直す。

保存先と項目は以前と同じ(Firestore の public_works。date / area / organization / title / link / category / expireAt / scrapedAt)。
"""
import argparse
import hashlib
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

import requests

API_URL = 'https://www.kkj.go.jp/api/'
UA = 'Mozilla/5.0 (compatible; yaneyuka-publicworks/1.0; +https://yaneyuka.com/)'
DAYS = 45
WAIT_SEC = 5
RETRY_WAITS = [30, 60, 120]

# 都道府県コード(JIS X0401)→ 画面で使う名前(以前と同じ短い名前)
PREFECTURES = {
    '01': '北海道', '02': '青森', '03': '岩手', '04': '宮城', '05': '秋田',
    '06': '山形', '07': '福島', '08': '茨城', '09': '栃木', '10': '群馬',
    '11': '埼玉', '12': '千葉', '13': '東京', '14': '神奈川', '15': '新潟',
    '16': '富山', '17': '石川', '18': '福井', '19': '山梨', '20': '長野',
    '21': '岐阜', '22': '静岡', '23': '愛知', '24': '三重', '25': '滋賀',
    '26': '京都', '27': '大阪', '28': '兵庫', '29': '奈良', '30': '和歌山',
    '31': '鳥取', '32': '島根', '33': '岡山', '34': '広島', '35': '山口',
    '36': '徳島', '37': '香川', '38': '愛媛', '39': '高知', '40': '福岡',
    '41': '佐賀', '42': '長崎', '43': '熊本', '44': '大分', '45': '宮崎',
    '46': '鹿児島', '47': '沖縄',
}

# 利用の多い地域を先に読む(途中で止まっても、よく見られる県から埋まるように)
ORDER = ['13', '14', '27', '23', '11', '12', '28', '40', '26', '22', '01', '04', '34']
ORDER += [c for c in PREFECTURES if c not in ORDER]


def categorize_work(title):
    """件名から工事の区分を決める(以前の scrape_kkj.py と同じ規則)"""
    if not title:
        return '土木・道路'
    if any(k in title for k in ['業務', '委託', '支援', '調査', '設計', '点検', '清掃', '警備', '保守', '運転', '運搬', '剪定', '伐採', '除雪', 'システム', '借入']):
        return '業務・その他'
    if any(k in title for k in ['空調', '暖房', '冷房', 'ボイラー', '電気', '電源', '盤', 'LED', '照明', '監視', '通信', '警報', '火災報知', '火災', '報知', '設備', '換気',
                                 '給排水', '給水', '排水', 'ポンプ', '昇降機', '浄化槽', '機械', 'エアコン', '換気扇', '配管', '配線', 'コンセント', 'スイッチ',
                                 '受電', '変電', '発電', '蓄電池', '太陽光', '太陽電池']):
        return '設備（電気・空調）'
    if any(k in title for k in ['建築', '新築', '改修', '修繕', '建具', '天井', 'トイレ', '塗装', '屋根', '防水', '解体', '庁舎', '校舎', '宿舎', '住宅', '倉庫', '体育館', 'プール', '駐車場']):
        return '建築・解体'
    if any(k in title for k in ['水路', '河川', '護岸', '堤防', 'ダム', '下水', '管きょ', '排水', '浚渫', '水門', '樋門', '堰', '取水']):
        return '水路・河川'
    if any(k in title for k in ['橋', '橋梁', 'トンネル', '道路', '舗装', 'アスファルト', 'コンクリート', '擁壁', '法面', '盛土', '切土', '造成', '土工', '仮設', '撤去']):
        return '土木・道路'
    if '撤去' in title:
        return '建築・解体'
    return '土木・道路'


def text(el, tag):
    v = el.find(tag)
    return (v.text or '').strip() if v is not None and v.text else ''


def fetch_prefecture(code, since):
    # 都道府県コードは 2 桁のまま渡す('1' だと 0 件になる。'01' が正しい)
    params = {'LG_Code': code, 'Category': '2', 'CFT_Issue_Date': f'{since}/', 'Count': '1000'}
    for attempt in range(len(RETRY_WAITS) + 1):
        try:
            res = requests.get(API_URL, params=params, headers={'User-Agent': UA}, timeout=60)
            res.raise_for_status()
            root = ET.fromstring(res.content)
            hits = text(root, './SearchResults/SearchHits')
            return root.findall('./SearchResults/SearchResult'), hits
        except Exception as e:  # 接続を断られた・時間切れなど
            if attempt >= len(RETRY_WAITS):
                print(f'  {PREFECTURES[code]}: 取得に失敗({e})')
                return None, None
            wait = RETRY_WAITS[attempt]
            print(f'  {PREFECTURES[code]}: 失敗のため {wait} 秒後に読み直す({e.__class__.__name__})')
            time.sleep(wait)


def to_doc(r, area):
    title = text(r, 'ProjectName')
    link = text(r, 'ExternalDocumentURI')
    issued = text(r, 'CftIssueDate')[:10]
    if not title or not link or not issued:
        return None
    try:
        date_obj = datetime.strptime(issued, '%Y-%m-%d')
    except ValueError:
        return None
    return {
        'date': issued,
        'area': area,
        'organization': text(r, 'OrganizationName'),
        'title': title,
        'link': link,
        'description': '',
        'category': categorize_work(title),
        'city': text(r, 'CityName'),
        'kkjKey': text(r, 'Key'),
        'expireAt': (date_obj + timedelta(days=DAYS)).isoformat(),
        'scrapedAt': datetime.now().isoformat(),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--pref', help='都道府県コード(例 13)だけ読む')
    args = ap.parse_args()

    since = (datetime.now() - timedelta(days=DAYS)).strftime('%Y-%m-%d')
    codes = [args.pref.zfill(2)] if args.pref else ORDER
    print(f'[{datetime.now()}] 公共工事の取得(官公需 API・工事・公告日 {since} 以降): {len(codes)} 都道府県')

    docs = []
    failed = []
    for i, code in enumerate(codes):
        if i > 0:
            time.sleep(WAIT_SEC)
        results, hits = fetch_prefecture(code, since)
        if results is None:
            failed.append(PREFECTURES[code])
            continue
        got = [d for d in (to_doc(r, PREFECTURES[code]) for r in results) if d]
        docs.extend(got)
        print(f'  {PREFECTURES[code]}: {len(got)} 件(該当 {hits} 件)')

    print(f'取得 {len(docs)} 件 / 失敗 {len(failed)} 都道府県 {"、".join(failed)}')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write(f'## 公共工事の取得(官公需 API)\n取得 {len(docs)} 件 / 失敗 {len(failed)} 都道府県 {"、".join(failed)}\n')

    if args.dry_run:
        for d in docs[:5]:
            print('   ', d['date'], d['area'], d['organization'][:16], d['title'][:30])
        return

    raw = os.environ.get('FIREBASE_SERVICE_ACCOUNT') or os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
    if not raw:
        print('サービスアカウントが無いので保存しません')
        return
    import firebase_admin
    from firebase_admin import credentials, firestore
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(json.loads(raw)))
    db = firestore.client()
    batch = db.batch()
    n = 0
    for d in docs:
        doc_id = hashlib.md5(d['link'].encode()).hexdigest()
        batch.set(db.collection('public_works').document(doc_id), d, merge=True)
        n += 1
        if n % 400 == 0:
            batch.commit()
            batch = db.batch()
    batch.commit()
    print(f'Firestore に保存 {n} 件')
    if failed and len(failed) == len(codes):
        sys.exit(1)


if __name__ == '__main__':
    main()
