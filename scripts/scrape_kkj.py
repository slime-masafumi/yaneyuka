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

def categorize_work(title):
    """タイトルから工事区分を自動判定（優先順位順）"""
    if not title:
        return '土木・道路'
    
    # タイトルを正規化（全角・半角の統一は不要だが、検索しやすくする）
    title_normalized = title
    
    # 1. 設備（電気・空調） - 最優先
    equipment_keywords = ['空調', '暖房', 'ボイラー', '電気', '電源', '照明', 'LED', 'led', '監視', '通信', '警報', 'ポンプ', '浄化槽', '機械', '昇降機', 'エアコン', '空調設備']
    if any(keyword in title_normalized for keyword in equipment_keywords):
        return '設備（電気・空調）'
    
    # 2. 建築・解体
    building_keywords = ['建築', '増築', '新営', '改修', '修繕', '建具', '天井', 'トイレ', '塗装', '屋根', '防水', '解体', '撤去', '内装', '外装', '改築', 'リニューアル']
    if any(keyword in title_normalized for keyword in building_keywords):
        return '建築・解体'
    
    # 3. 水路・河川
    water_keywords = ['水路', '河川', '護岸', '堤防', 'ダム', '砂防', '下水', '管きょ', '管渠', '排水', '浚渫', '用水路', '排水路']
    if any(keyword in title_normalized for keyword in water_keywords):
        return '水路・河川'
    
    # 4. 業務・その他
    business_keywords = ['業務', '委託', '支援', '調査', '設計', 'システム', '点検', '清掃', '伐採', '運搬', '管理', '維持', '補修業務']
    if any(keyword in title_normalized for keyword in business_keywords):
        return '業務・その他'
    
    # 5. 土木・道路（デフォルト）
    return '土木・道路'

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
                
                # 発注機関と地域: .box_contents dd span
                organization = ''
                area = prefecture_name
                
                dd = box.find('dd')
                if dd:
                    spans = dd.find_all('span')
                    if len(spans) >= 1:
                        organization = spans[0].get_text(strip=True)
                    if len(spans) >= 2:
                        # 2つ目のspanが地域情報の可能性
                        area_info = spans[1].get_text(strip=True)
                        if area_info:
                            area = area_info
                
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
