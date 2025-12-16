"""
官公需情報ポータルサイト（kkj.go.jp）からHTML解析で
公共工事入札情報を取得し、Firestoreに保存するスクリプト
"""
import os
import json
import time
import hashlib
import re
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlencode
import requests
from bs4 import BeautifulSoup
import firebase_admin
from firebase_admin import credentials, firestore

# Firebase初期化
firebase_service_account = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
if not firebase_service_account:
    raise ValueError('FIREBASE_SERVICE_ACCOUNT環境変数が設定されていません')

service_account_info = json.loads(firebase_service_account)

if not firebase_admin._apps:
    cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# 都道府県コードと名称のマッピング
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
    '46': '鹿児島', '47': '沖縄'
}

# ベースURL
BASE_URL = 'https://www.kkj.go.jp/s/'

# 固定パラメータ
BASE_PARAMS = {
    'U': '0-all',
    'ca': '2',  # 工事
    'rc': '100',  # 1度に100件取得（効率化）
    'ty': '',  # 空欄＝全入札区分対象
    'S': '',
    'ti': '',
    'on': '',
    'X': '検　索'
}

def get_document_id(url):
    """URLからドキュメントIDを生成（重複チェック用）"""
    return hashlib.md5(url.encode()).hexdigest()

def parse_date(date_str):
    """日付文字列をパースしてdatetimeオブジェクトに変換"""
    try:
        # YYYY-MM-DD形式を想定
        match = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_str)
        if match:
            year, month, day = map(int, match.groups())
            return datetime(year, month, day)
    except:
        pass
    return None

def is_recent_date(date_obj, days=45):
    """日付が最近（デフォルト45日以内）かどうかを判定"""
    if not date_obj:
        return False
    cutoff_date = datetime.now() - timedelta(days=days)
    return date_obj >= cutoff_date

def detect_prefecture_from_text(text):
    """テキスト（タイトルや発注機関名）から都道府県を判定"""
    if not text:
        return None
    
    # 都道府県名のマッピング（長いものから順に）
    prefecture_keywords = {
        '北海道': ['北海道', '札幌', '函館', '旭川', '釧路', '北見', '帯広'],
        '青森': ['青森', '弘前', '八戸', '十和田'],
        '岩手': ['岩手', '盛岡', '宮古', '大船渡'],
        '宮城': ['宮城', '仙台', '石巻', '気仙沼'],
        '秋田': ['秋田', '能代', '横手'],
        '山形': ['山形', '米沢', '鶴岡', '酒田'],
        '福島': ['福島', '郡山', 'いわき', '会津'],
        '茨城': ['茨城', '水戸', 'つくば', '日立', '土浦'],
        '栃木': ['栃木', '宇都宮', '足利', '栃木市'],
        '群馬': ['群馬', '前橋', '高崎', '太田', '伊勢崎'],
        '埼玉': ['埼玉', 'さいたま', '川越', '所沢', '越谷', '川口', '熊谷', '新都心'],
        '千葉': ['千葉', '船橋', '松戸', '市川', '柏', '習志野'],
        '東京': ['東京', '新宿', '渋谷', '品川', '世田谷', '練馬', '足立', '江戸川'],
        '神奈川': ['神奈川', '横浜', '川崎', '相模原', '藤沢', '茅ヶ崎', '厚木'],
        '新潟': ['新潟', '長岡', '上越', '三条'],
        '富山': ['富山', '高岡', '魚津'],
        '石川': ['石川', '金沢', '小松', '七尾'],
        '福井': ['福井', '敦賀'],
        '山梨': ['山梨', '甲府', '富士吉田'],
        '長野': ['長野', '松本', '上田', '諏訪', '飯田'],
        '岐阜': ['岐阜', '大垣', '多治見', '中津川'],
        '静岡': ['静岡', '浜松', '沼津', '富士', '焼津'],
        '愛知': ['愛知', '名古屋', '豊橋', '岡崎', '一宮', '春日井', '豊田', '安城'],
        '三重': ['三重', '津', '四日市', '伊勢', '松阪'],
        '滋賀': ['滋賀', '大津', '彦根', '草津'],
        '京都': ['京都', '宇治', '亀岡'],
        '大阪': ['大阪', '堺', '東大阪', '枚方', '豊中', '吹田', '高槻'],
        '兵庫': ['兵庫', '神戸', '姫路', '尼崎', '西宮', '明石'],
        '奈良': ['奈良', '大和', '橿原'],
        '和歌山': ['和歌山', '橋本', '田辺'],
        '鳥取': ['鳥取', '米子'],
        '島根': ['島根', '松江', '出雲'],
        '岡山': ['岡山', '倉敷', '津山'],
        '広島': ['広島', '福山', '呉', '尾道'],
        '山口': ['山口', '下関', '宇部', '周南'],
        '徳島': ['徳島', '鳴門'],
        '香川': ['香川', '高松', '丸亀'],
        '愛媛': ['愛媛', '松山', '今治', '新居浜'],
        '高知': ['高知', '室戸', '安芸'],
        '福岡': ['福岡', '北九州', '久留米', '飯塚', '大牟田'],
        '佐賀': ['佐賀', '唐津', '鳥栖'],
        '長崎': ['長崎', '佐世保', '諫早'],
        '熊本': ['熊本', '八代', '人吉'],
        '大分': ['大分', '別府', '中津'],
        '宮崎': ['宮崎', '延岡', '都城'],
        '鹿児島': ['鹿児島', '鹿屋', '枕崎'],
        '沖縄': ['沖縄', '那覇', '宜野湾', 'うるま']
    }
    
    # 長い都道府県名から順にチェック（誤判定を防ぐため）
    for prefecture, keywords in prefecture_keywords.items():
        for keyword in keywords:
            if keyword in text:
                return prefecture
    
    return None

def categorize_work(title):
    """タイトルから工事区分を自動判定（優先順位順）"""
    if not title:
        return '土木・道路'
    
    # 上から順に判定し、マッチしたら確定（return）
    
    # 優先度1：業務・委託（工事ではないもの）を最優先で除外
    service_keywords = ['業務', '委託', '支援', '調査', '設計', '点検', '清掃', '警備', '保守', '運転', '運搬', '剪定', '伐採', '除雪', 'システム', '借入']
    if any(keyword in title for keyword in service_keywords):
        return '業務・その他'
    
    # 優先度2：設備（特定のキーワードが強い）
    # 「火災報知」「設備」「換気」「給排水」などを追加
    equipment_keywords = [
        '空調', '暖房', '冷房', 'ボイラー', '電気', '電源', '盤', 'LED', '照明', 
        '監視', '通信', '警報', '火災報知', '火災', '報知', '設備', '換気', 
        '給排水', '給水', '排水', 'ポンプ', '昇降機', '浄化槽', '機械', 
        'エアコン', '換気扇', '配管', '配線', 'コンセント', 'スイッチ', 
        '受電', '変電', '発電', '蓄電池', '太陽光', '太陽電池'
    ]
    if any(keyword in title for keyword in equipment_keywords):
        return '設備（電気・空調）'
    
    # 優先度3：建築・解体（建物系）
    # 「撤去」は建築物の撤去のみを想定（橋の撤去は土木なので、橋が先に判定される）
    architecture_keywords = ['建築', '新築', '改修', '修繕', '建具', '天井', 'トイレ', '塗装', '屋根', '防水', '解体', '庁舎', '校舎', '宿舎', '住宅', '倉庫', '体育館', 'プール', '駐車場']
    if any(keyword in title for keyword in architecture_keywords):
        return '建築・解体'
    
    # 優先度4：水路・河川
    river_keywords = ['水路', '河川', '護岸', '堤防', 'ダム', '下水', '管きょ', '排水', '浚渫', '水門', '樋門', '堰', '取水']
    if any(keyword in title for keyword in river_keywords):
        return '水路・河川'
    
    # 優先度5：土木・道路（橋、トンネル、道路、舗装など）
    # 「橋」は土木工事なので、建築の「撤去」より先に判定
    civil_keywords = ['橋', '橋梁', 'トンネル', '道路', '舗装', 'アスファルト', 'コンクリート', '擁壁', '法面', '盛土', '切土', '造成', '土工', '仮設', '撤去']
    if any(keyword in title for keyword in civil_keywords):
        return '土木・道路'
    
    # 優先度6：建築・解体（撤去が橋でない場合）
    # 「撤去」が橋のキーワードにマッチしなかった場合（建物の撤去）
    if '撤去' in title:
        return '建築・解体'
    
    # 優先度7：その他すべては土木・道路
    return '土木・道路'

def fetch_organization_from_detail_page(detail_url):
    """詳細ページから発注機関を取得"""
    try:
        # サーバー負荷軽減のため、1秒待機
        time.sleep(1)
        # リクエストを送信
        response = requests.get(detail_url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # テーブル構造から「組織」を探す
        # パターン1: テーブルの行（tr）から「組織」というラベルを含む行を探す
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    # 最初のセルに「組織」が含まれているか確認
                    first_cell_text = cells[0].get_text(strip=True)
                    if '組織' in first_cell_text:
                        # 2番目のセルが組織名
                        org_text = cells[1].get_text(strip=True)
                        if org_text:
                            return org_text
        
        # パターン2: テーブル以外の構造（divやdlなど）から探す
        # 「組織：」というテキストを含む要素を探す
        org_patterns = [
            soup.find(string=re.compile(r'組織\s*[:：]')),
            soup.find(string=re.compile(r'発注機関\s*[:：]')),
            soup.find(string=re.compile(r'組織名\s*[:：]')),
        ]
        
        for pattern in org_patterns:
            if pattern:
                # 親要素を取得して、その中のテキストから組織名を抽出
                parent = pattern.parent
                if parent:
                    # 次の要素やテキストノードから組織名を取得
                    next_sibling = parent.find_next_sibling()
                    if next_sibling:
                        org_text = next_sibling.get_text(strip=True)
                        if org_text:
                            return org_text
                    # 親要素全体から「組織：」の後のテキストを抽出
                    full_text = parent.get_text()
                    match = re.search(r'組織\s*[:：]\s*([^\n\r]+)', full_text)
                    if match:
                        org_text = match.group(1).strip()
                        if org_text:
                            return org_text
        
        # パターン3: 定義リスト（dl）から探す
        dl_elements = soup.find_all('dl')
        for dl in dl_elements:
            dts = dl.find_all('dt')
            dds = dl.find_all('dd')
            for dt, dd in zip(dts, dds):
                dt_text = dt.get_text(strip=True)
                if '組織' in dt_text:
                    org_text = dd.get_text(strip=True)
                    if org_text:
                        return org_text
        
        return None
    except Exception as e:
        print(f'    詳細ページからの発注機関取得エラー ({detail_url[:50]}...): {e}')
        return None

def parse_search_results(html_content, prefecture_code, prefecture_name):
    """検索結果ページのHTMLを解析してデータを抽出"""
    scraped_data = []
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # <div class="box_contents"> を抽出
        box_contents = soup.find_all('div', class_='box_contents')
        
        if not box_contents:
            print(f'    box_contentsが見つかりませんでした')
            return scraped_data, None
        
        print(f'    box_contentsを{len(box_contents)}個発見')
        
        oldest_date = None  # 最も古い日付を記録
        
        for box in box_contents:
            try:
                # 件名とリンク: dt > a
                dt = box.find('dt')
                if not dt:
                    continue
                
                link_elem = dt.find('a')
                if not link_elem:
                    continue
                
                title = link_elem.get_text(strip=True)
                href = link_elem.get('href', '')
                
                if not title or not href:
                    continue
                
                # 相対パスを絶対パスに変換
                if href.startswith('/'):
                    link = urljoin('https://www.kkj.go.jp', href)
                elif not href.startswith('http'):
                    link = urljoin(BASE_URL, href)
                else:
                    link = href
                
                # 公告日: .box_bottom .fRight から抽出
                date_str = ''
                box_bottom = box.find('div', class_='box_bottom')
                if box_bottom:
                    f_right = box_bottom.find(class_='fRight')
                    if f_right:
                        date_text = f_right.get_text(strip=True)
                        date_match = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_text)
                        if date_match:
                            date_str = date_match.group(0)
                
                # 発注機関と地域: テキストの長さと構造に基づいて抽出
                organization = ''
                area = prefecture_name
                
                # パターン1: spanタグから抽出（テキストの長さと構造に基づく）
                all_spans = box.find_all('span')
                
                # NGワードリスト（システム文言）
                ng_words = ['詳細', '地図', '入札', '公告', '検索', '一覧', '戻る', '次へ', '前へ']
                
                # 日付パターン（年・月・日を表す数字の並び）
                date_pattern = re.compile(r'\d{4}.*\d{1,2}.*\d{1,2}')
                
                # 候補の絞り込み
                candidates = []
                for span in all_spans:
                    text = span.get_text(strip=True)
                    
                    # 条件チェック
                    # 1. 文字数チェック: 1 < len(text) <= 25
                    if not (1 < len(text) <= 25):
                        continue
                    
                    # 2. 日付除外: テキスト内に年・月・日を表す数字の並びが含まれていない
                    if date_pattern.search(text):
                        continue
                    
                    # 3. NGワード除外: システム文言と完全一致しない
                    if text in ng_words:
                        continue
                    
                    # すべての条件を満たす場合、候補に追加
                    candidates.append(text)
                
                # 採用ルール: リストの先頭（1番目）を採用
                if candidates:
                    organization = candidates[0]
                    if len(scraped_data) < 3:
                        print(f'    発注機関取得（spanタグ）: "{organization}"')
                
                # パターン2: spanタグで見つからない場合、dd要素から抽出（フォールバック）
                if not organization:
                    dd = box.find('dd')
                    if dd:
                        # dd要素内のテキストを区切り文字付きで全取得
                        dd_text_separated = dd.get_text(separator='|', strip=True)
                        if dd_text_separated:
                            # |で分割してリスト化
                            parts = [p.strip() for p in dd_text_separated.split('|') if p.strip()]
                            
                            # 日付パターン（YYYY-MM-DD形式）を除外
                            date_pattern_dd = re.compile(r'^\d{4}-\d{2}-\d{2}')
                            # 都道府県名を除外
                            prefecture_names_list = list(PREFECTURES.values())
                            
                            # 発注機関の候補を探す
                            dd_candidates = []
                            for part in parts:
                                # 文字数チェック: 1 < len(part) <= 25
                                if not (1 < len(part) <= 25):
                                    continue
                                # 日付や都道府県名でない、かつ空でないものを候補に
                                if not date_pattern_dd.match(part) and part not in prefecture_names_list:
                                    # NGワード除外
                                    if part not in ng_words:
                                        dd_candidates.append(part)
                            
                            # 発注機関のキーワードを含むものを優先
                            org_keywords = ['省', '県', '市', '町', '村', '局', 'センター', '大学', '病院', '事務所', '庁', '署', '所', '課', '部', '室']
                            for candidate in dd_candidates:
                                if any(keyword in candidate for keyword in org_keywords):
                                    organization = candidate
                                    break
                            
                            # キーワードマッチがない場合、最初の候補を採用
                            if not organization and dd_candidates:
                                organization = dd_candidates[0]
                            
                            if len(scraped_data) < 3:
                                print(f'    発注機関取得（dd要素）: "{organization}"')
                
                # パターン3: 最終手段 - 詳細ページから取得
                if not organization or len(organization.strip()) == 0:
                    if len(scraped_data) < 3:
                        print(f'    発注機関が取得できなかったため、詳細ページから取得を試みます: {link[:60]}...')
                    detail_org = fetch_organization_from_detail_page(link)
                    if detail_org:
                        organization = detail_org
                        if len(scraped_data) < 3:
                            print(f'    詳細ページから発注機関を取得: "{organization}"')
                    else:
                        if len(scraped_data) < 3:
                            print(f'    詳細ページからも発注機関を取得できませんでした')
                
                # 発注機関名から都道府県を判定（タイトルと発注機関の両方を確認）
                detected_area = detect_prefecture_from_text(title + ' ' + organization)
                if detected_area:
                    area = detected_area
                    if organization:
                        print(f'    エリア判定: "{title[:30]}..." (発注機関: {organization[:20]}...) -> {area}')
                
                # 日付をパース
                date_obj = parse_date(date_str)
                
                # 45日より前の日付が出現したら処理を中断（降順で取得しているため）
                if date_obj and not is_recent_date(date_obj, days=45):
                    print(f'    45日より前の日付を検出、処理を中断: {date_str}')
                    # この時点で処理を中断するため、oldest_dateを設定して返す
                    if oldest_date is None:
                        oldest_date = date_obj
                    break
                
                # 日付が無効または45日以内の場合のみ処理を続行
                if not date_obj:
                    print(f'    日付が無効なデータをスキップ: {title[:50]}...')
                    continue
                
                # 最も古い日付を記録
                if oldest_date is None or date_obj < oldest_date:
                    oldest_date = date_obj
                
                # 工事区分を自動判定
                category = categorize_work(title)
                # デバッグ: カテゴリ判定結果をログ出力（最初の10件のみ）
                if len(scraped_data) < 10:
                    print(f'    カテゴリ判定: "{title[:40]}..." -> {category}')
                
                # expireAtを計算（公告日 + 45日）
                expire_at = (date_obj + timedelta(days=45)).isoformat()
                
                scraped_data.append({
                    'date': date_str,
                    'area': area,
                    'organization': organization,
                    'title': title,
                    'link': link,
                    'description': '',
                    'category': category,
                    'expireAt': expire_at,
                    'scrapedAt': datetime.now().isoformat(),
                })
                
            except Exception as e:
                print(f'    アイテムの処理中にエラー: {e}')
                continue
        
        if oldest_date:
            print(f'    最も古い日付: {oldest_date.strftime("%Y-%m-%d")}')
        
        return scraped_data, oldest_date
        
    except Exception as e:
        print(f'  HTMLパースエラー: {e}')
        import traceback
        traceback.print_exc()
        return [], None

def fetch_prefecture_data(prefecture_code, prefecture_name):
    """都道府県のデータを取得（ページング対応）"""
    print(f'[{datetime.now()}] {prefecture_name}（{prefecture_code}）のデータ取得開始...')
    
    all_data = []
    page = 1
    should_continue = True
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.kkj.go.jp/'
    }
    
    while should_continue:
        try:
            # パラメータを構築
            params = BASE_PARAMS.copy()
            params['pr'] = prefecture_code
            if page > 1:
                params['P'] = str(page)
            
            url = BASE_URL + '?' + urlencode(params)
            print(f'  ページ{page}にアクセス: {url}')
            
            # ページ遷移ごとに3秒待機
            if page > 1:
                time.sleep(3)
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # HTMLを解析（parse_search_results内で既に45日以内のデータのみが返される）
            page_data, oldest_date = parse_search_results(response.text, prefecture_code, prefecture_name)
            
            if not page_data:
                print(f'  ページ{page}にデータがありませんでした')
                should_continue = False
                break
            
            # parse_search_results内で既に45日以内のデータのみがフィルタリングされている
            all_data.extend(page_data)
            print(f'  ページ{page}: {len(page_data)}件取得（全て45日以内）')
            
            # 日付が古くなったら、その都道府県の処理を打ち切る
            if oldest_date and not is_recent_date(oldest_date, days=45):
                print(f'  最も古い日付が45日を超えているため、{prefecture_name}の処理を終了します')
                should_continue = False
                break
            
            # 100件取得できた場合は次のページへ
            if len(page_data) >= 100:
                page += 1
            else:
                should_continue = False
                
        except Exception as e:
            print(f'  {prefecture_name}のページ{page}取得中にエラー: {e}')
            should_continue = False
            break
    
    print(f'  {prefecture_name}: 合計{len(all_data)}件のデータを取得')
    return all_data

def save_to_firestore(data_list):
    """Firestoreにデータを保存"""
    saved_count = 0
    skipped_count = 0
    
    for data in data_list:
        try:
            doc_id = get_document_id(data['link'])
            db.collection('public_works').document(doc_id).set(data, merge=True)
            saved_count += 1
        except Exception as e:
            print(f'  Firestore保存エラー: {e}')
            skipped_count += 1
            continue
    
    print(f'  Firestoreに保存: {saved_count}件, スキップ: {skipped_count}件')

def main():
    """メイン処理"""
    print(f'[{datetime.now()}] HTML解析によるデータ取得開始')
    
    all_data = []
    
    # 都道府県ループ: 01から47まで順に実行
    for prefecture_code, prefecture_name in PREFECTURES.items():
        try:
            data = fetch_prefecture_data(prefecture_code, prefecture_name)
            all_data.extend(data)
            
            # 都道府県が変わるタイミングで10秒待機
            if prefecture_code != '47':  # 最後の都道府県以外は待機
                print(f'  10秒待機中...')
                time.sleep(10)
                
        except Exception as e:
            print(f'  {prefecture_name}の処理中にエラー: {e}')
            import traceback
            traceback.print_exc()
            continue
    
    if not all_data:
        print('取得したデータがありません')
        return
    
    # Firestoreに保存
    print(f'\n[{datetime.now()}] Firestoreに保存開始...')
    save_to_firestore(all_data)
    
    print(f'[{datetime.now()}] データ取得完了')

if __name__ == '__main__':
    main()
