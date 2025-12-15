"""
官公需情報ポータルサイト（kkj.go.jp）からRSSフィードを使って
公共工事入札情報を取得し、Firestoreに保存するスクリプト
"""
import os
import json
import time
import hashlib
import re
from datetime import datetime
from urllib.parse import urlencode, quote
import requests
from xml.etree import ElementTree as ET
import firebase_admin
from firebase_admin import credentials, firestore

# Firebase初期化
firebase_service_account = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
if not firebase_service_account:
    raise ValueError('FIREBASE_SERVICE_ACCOUNT環境変数が設定されていません')

# JSON文字列をパース
service_account_info = json.loads(firebase_service_account)

# Firebase Admin SDK初期化（既に初期化されている場合はスキップ）
if not firebase_admin._apps:
    cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# 官公需情報ポータルサイトのRSSフィードURL
# 検索結果ページのURLパラメータに基づいてRSSフィードのURLを生成
# RSSフィードのURLは検索結果ページのURLパラメータをそのまま使用
# パラメータ:
# - ty=1: 工事
# - pr=13: 都道府県コード（13=東京都など）
# - ca=2: 受注内容（2=工事）
# - U=0-all: 検索範囲（0-all=すべて）
# - rc=100: 表示件数（100件、最大取得可能件数）
RSS_FEEDS = [
    {
        'name': '東京都',
        # 検索結果ページのURLパラメータをそのまま使用（pr=13は東京都）
        'url': 'https://www.kkj.go.jp/rss/?U=0-all&S=&ti=&on=&rc=100&X=%E6%A4%9C%E3%80%80%E7%B4%A2&ca=2&ty=1&pr=13',
    },
    {
        'name': '全国',
        # 全国の工事（都道府県指定なし）
        'url': 'https://www.kkj.go.jp/rss/?U=0-all&S=&ti=&on=&rc=100&X=%E6%A4%9C%E3%80%80%E7%B4%A2&ca=2&ty=1',
    },
    # 他の都道府県を追加する場合は、prパラメータを変更
    # 例: {'name': '大阪府', 'url': 'https://www.kkj.go.jp/rss/?U=0-all&S=&ti=&on=&rc=10&X=%E6%A4%9C%E3%80%80%E7%B4%A2&ca=2&ty=1&pr=27'},
]

def get_document_id(url):
    """URLからドキュメントIDを生成（重複チェック用）"""
    return hashlib.md5(url.encode()).hexdigest()

def parse_rss_feed(xml_content, area_name):
    """RSSフィードのXMLをパースしてデータを抽出"""
    scraped_data = []
    
    try:
        root = ET.fromstring(xml_content)
        
        # RSS 2.0形式の場合
        items = root.findall('.//item')
        
        for item in items:
            try:
                title_elem = item.find('title')
                link_elem = item.find('link')
                pub_date_elem = item.find('pubDate')
                description_elem = item.find('description')
                
                title = title_elem.text if title_elem is not None else ''
                link = link_elem.text if link_elem is not None else ''
                pub_date = pub_date_elem.text if pub_date_elem is not None else ''
                description = description_elem.text if description_elem is not None else ''
                
                if not title or not link:
                    continue
                
                # 発注機関名を抽出（タイトルから推測、またはdescriptionから）
                organization = ''
                if description:
                    # descriptionから発注機関を抽出する試み
                    org_match = re.search(r'(国土交通省|都道府県|市|町|村|区)', description)
                    if org_match:
                        organization = org_match.group(0)
                
                # 日付をパース
                date_str = ''
                if pub_date:
                    try:
                        # RFC 822形式の日付をパース
                        from email.utils import parsedate_to_datetime
                        dt = parsedate_to_datetime(pub_date)
                        date_str = dt.strftime('%Y-%m-%d')
                    except:
                        date_str = pub_date[:10] if len(pub_date) >= 10 else pub_date
                
                scraped_data.append({
                    'date': date_str,
                    'area': area_name,
                    'organization': organization,
                    'title': title,
                    'link': link,
                    'description': description,
                    'scrapedAt': datetime.now().isoformat(),
                })
                
            except Exception as e:
                print(f'  アイテムの処理中にエラー: {e}')
                continue
        
    except ET.ParseError as e:
        print(f'  XMLパースエラー: {e}')
        # 正規表現でフォールバック
        item_pattern = r'<item[\s\S]*?</item>'
        title_pattern = r'<title>([\s\S]*?)</title>'
        link_pattern = r'<link>([\s\S]*?)</link>'
        pub_date_pattern = r'<pubDate>([\s\S]*?)</pubDate>'
        description_pattern = r'<description>([\s\S]*?)</description>'
        
        items = re.findall(item_pattern, xml_content)
        for item_xml in items:
            try:
                title_match = re.search(title_pattern, item_xml)
                link_match = re.search(link_pattern, item_xml)
                pub_date_match = re.search(pub_date_pattern, item_xml)
                description_match = re.search(description_pattern, item_xml)
                
                title = title_match.group(1).strip() if title_match else ''
                link = link_match.group(1).strip() if link_match else ''
                pub_date = pub_date_match.group(1).strip() if pub_date_match else ''
                description = description_match.group(1).strip() if description_match else ''
                
                if not title or not link:
                    continue
                
                # CDATAを削除
                title = re.sub(r'<!\[CDATA\[|\]\]>', '', title)
                link = re.sub(r'<!\[CDATA\[|\]\]>', '', link)
                description = re.sub(r'<!\[CDATA\[|\]\]>', '', description)
                
                # 発注機関名を抽出
                organization = ''
                if description:
                    org_match = re.search(r'(国土交通省|都道府県|市|町|村|区)', description)
                    if org_match:
                        organization = org_match.group(0)
                
                # 日付をパース
                date_str = ''
                if pub_date:
                    try:
                        from email.utils import parsedate_to_datetime
                        dt = parsedate_to_datetime(pub_date)
                        date_str = dt.strftime('%Y-%m-%d')
                    except:
                        date_str = pub_date[:10] if len(pub_date) >= 10 else pub_date
                
                scraped_data.append({
                    'date': date_str,
                    'area': area_name,
                    'organization': organization,
                    'title': title,
                    'link': link,
                    'description': description,
                    'scrapedAt': datetime.now().isoformat(),
                })
            except Exception as e:
                print(f'  フォールバック処理中にエラー: {e}')
                continue
    
    return scraped_data

def fetch_rss_feed(feed_info):
    """RSSフィードを取得してデータを抽出"""
    area_name = feed_info['name']
    url = feed_info['url']
    
    print(f'[{datetime.now()}] {area_name}エリアのRSSフィードを取得中...')
    print(f'  アクセスURL: {url}')
    
    try:
        # RSSフィードを取得
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Referer': 'https://www.kkj.go.jp/'
        }
        response = requests.get(url, headers=headers, timeout=30)
        
        # 404エラーの場合は、検索結果ページからRSSリンクを探す
        if response.status_code == 404:
            print(f'  404エラー: 検索結果ページからRSSリンクを探します...')
            # 検索結果ページのURLを生成（/rss/ を /s/ に置き換える）
            search_url = url.replace('/rss/', '/s/')
            print(f'  検索結果ページURL: {search_url}')
            
            try:
                # 検索結果ページにアクセス
                search_response = requests.get(search_url, headers=headers, timeout=30)
                if search_response.status_code == 200:
                    html_content = search_response.text
                    print(f'  検索結果ページのHTMLサイズ: {len(html_content)}文字')
                    rss_url = None
                    
                    # パターン1: <link rel="alternate" type="application/rss+xml" href="..."> を探す
                    rss_link_match = re.search(r'<link[^>]*rel=["\']alternate["\'][^>]*type=["\']application/rss\+xml["\'][^>]*href=["\']([^"\']+)["\']', html_content, re.IGNORECASE)
                    if rss_link_match:
                        rss_url = rss_link_match.group(1)
                        print(f'  パターン1でRSSリンクを発見: {rss_url}')
                    
                    # パターン2: RSSボタンやアイコンのリンクを探す（より広範囲に検索）
                    if not rss_url:
                        # RSSという文字を含むリンクを探す
                        rss_button_matches = re.findall(r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>.*?[Rr][Ss][Ss]', html_content, re.IGNORECASE | re.DOTALL)
                        if not rss_button_matches:
                            # 逆順でも探す（RSSという文字がリンクの前にある場合）
                            rss_button_matches = re.findall(r'[Rr][Ss][Ss].*?<a[^>]*href=["\']([^"\']+)["\']', html_content, re.IGNORECASE | re.DOTALL)
                        for match in rss_button_matches:
                            if 'rss' in match.lower() or match.startswith('/r/') or '/rss' in match.lower():
                                rss_url = match
                                print(f'  パターン2でRSSリンクを発見: {rss_url}')
                                break
                    
                    # パターン3: /r/ で始まるURLを探す（東京都エリアの成功パターン）
                    if not rss_url:
                        r_pattern_matches = re.findall(r'href=["\'](/r/[^"\']+)["\']', html_content, re.IGNORECASE)
                        if r_pattern_matches:
                            # 最初に見つかった/r/リンクを使用
                            rss_url = r_pattern_matches[0]
                            print(f'  パターン3でRSSリンクを発見: {rss_url}')
                    
                    # パターン4: /rss/ で始まるURLを探す
                    if not rss_url:
                        rss_path_matches = re.findall(r'href=["\'](/rss/[^"\']+)["\']', html_content, re.IGNORECASE)
                        if rss_path_matches:
                            rss_url = rss_path_matches[0]
                            print(f'  パターン4でRSSリンクを発見: {rss_url}')
                    
                    # パターン5: JavaScript内のRSS URLを探す
                    if not rss_url:
                        js_rss_matches = re.findall(r'["\']([^"\']*rss[^"\']*)["\']', html_content, re.IGNORECASE)
                        for match in js_rss_matches:
                            if ('rss' in match.lower() or '/r/' in match) and ('http' in match or match.startswith('/')):
                                rss_url = match
                                print(f'  パターン5でRSSリンクを発見: {rss_url}')
                                break
                    
                    if rss_url:
                        # 相対URLの場合は絶対URLに変換
                        if not rss_url.startswith('http'):
                            if rss_url.startswith('/'):
                                rss_url = 'https://www.kkj.go.jp' + rss_url
                            else:
                                rss_url = 'https://www.kkj.go.jp/' + rss_url
                        print(f'  見つかったRSS URL: {rss_url}')
                        # 見つかったRSS URLで再度取得
                        response = requests.get(rss_url, headers=headers, timeout=30)
                    else:
                        # RSSリンクが見つからない場合、検索パラメータから直接RSS URLを生成してみる
                        from urllib.parse import urlparse, parse_qs, urlencode
                        parsed = urlparse(search_url)
                        params = parse_qs(parsed.query)
                        
                        # パラメータを整理
                        rss_params = {}
                        for key, value_list in params.items():
                            if value_list:
                                rss_params[key] = value_list[0]
                        
                        # 全国エリアの場合はprパラメータを削除
                        if 'pr' in rss_params:
                            del rss_params['pr']
                        
                        # フォールバック1: /r/ エンドポイントを使用（東京都エリアの成功パターン）
                        encoded_params = urlencode(rss_params, quote_via=quote)
                        fallback_rss_url_1 = f'https://www.kkj.go.jp/r/?{encoded_params}'
                        print(f'  フォールバック1: /r/ エンドポイントを使用: {fallback_rss_url_1}')
                        
                        try:
                            test_response = requests.get(fallback_rss_url_1, headers=headers, timeout=30)
                            if test_response.status_code == 200 and '<?xml' in test_response.text[:100]:
                                print(f'  フォールバック1が有効でした')
                                response = test_response
                                rss_url = fallback_rss_url_1
                            else:
                                raise Exception(f'フォールバック1が無効でした (ステータス: {test_response.status_code})')
                        except Exception as e1:
                            print(f'  フォールバック1が失敗: {e1}')
                            
                            # フォールバック2: /rss/ エンドポイントを使用
                            fallback_rss_url_2 = f'https://www.kkj.go.jp/rss/?{encoded_params}'
                            print(f'  フォールバック2: /rss/ エンドポイントを使用: {fallback_rss_url_2}')
                            
                            try:
                                test_response = requests.get(fallback_rss_url_2, headers=headers, timeout=30)
                                if test_response.status_code == 200 and '<?xml' in test_response.text[:100]:
                                    print(f'  フォールバック2が有効でした')
                                    response = test_response
                                    rss_url = fallback_rss_url_2
                                else:
                                    raise Exception(f'フォールバック2が無効でした (ステータス: {test_response.status_code})')
                            except Exception as e2:
                                print(f'  フォールバック2も失敗: {e2}')
                                print(f'  検索結果ページのHTML（最初の10000文字）: {html_content[:10000]}')
                                raise Exception('RSSリンクが見つかりませんでした')
            except Exception as e:
                print(f'  検索結果ページからのRSSリンク取得中にエラー: {e}')
                raise
        
        response.raise_for_status()
        
        print(f'  レスポンスサイズ: {len(response.text)}文字')
        print(f'  レスポンスの最初の500文字: {response.text[:500]}')
        
        # RSSフィードをパース
        scraped_data = parse_rss_feed(response.text, area_name)
        
        print(f'  {len(scraped_data)}件のデータを取得')
        return scraped_data
        
    except Exception as e:
        print(f'  {area_name}エリアのRSSフィード取得中にエラー: {e}')
        import traceback
        traceback.print_exc()
        return []

def save_to_firestore(data_list):
    """Firestoreにデータを保存"""
    saved_count = 0
    skipped_count = 0
    
    for data in data_list:
        try:
            # リンクURLをドキュメントIDとして使用（重複防止）
            doc_id = get_document_id(data['link'])
            
            # Firestoreに保存（既存データは上書き）
            db.collection('public_works').document(doc_id).set(data, merge=True)
            saved_count += 1
            
        except Exception as e:
            print(f'  Firestore保存エラー: {e}')
            skipped_count += 1
            continue
    
    print(f'  Firestoreに保存: {saved_count}件, スキップ: {skipped_count}件')

def main():
    """メイン処理"""
    print(f'[{datetime.now()}] RSSフィード取得開始')
    
    all_data = []
    
    # 各エリアのRSSフィードを取得
    for feed_info in RSS_FEEDS:
        data = fetch_rss_feed(feed_info)
        all_data.extend(data)
        
        # サーバー負荷対策: 各エリアの取得間に30秒待機
        if feed_info != RSS_FEEDS[-1]:  # 最後のエリア以外は待機
            print(f'  30秒待機中...')
            time.sleep(30)
    
    if not all_data:
        print('取得したデータがありません')
        return
    
    # Firestoreに保存
    print(f'\n[{datetime.now()}] Firestoreに保存開始...')
    save_to_firestore(all_data)
    
    print(f'[{datetime.now()}] RSSフィード取得完了')

if __name__ == '__main__':
    main()

