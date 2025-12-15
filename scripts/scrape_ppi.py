import os
import json
import time
import hashlib
import re
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
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

# 公共工事入札情報サイト（i-ppi.jp）のURL
# エリア別の入札情報一覧ページ
# tabパラメータ: 10=東京都, その他のエリアのtab番号は要確認
AREAS = [
    {'name': '東京都', 'url': 'https://www.i-ppi.jp/IPPI/SearchServices/Web/Koji/Kokoku/List.aspx?tab=10'},
    # 他のエリアのURLを追加する場合は、tabパラメータを変更
    # 例: {'name': '大阪府', 'url': 'https://www.i-ppi.jp/IPPI/SearchServices/Web/Koji/Kokoku/List.aspx?tab=XX'},
]

def setup_driver():
    """Chromeドライバーのセットアップ"""
    chrome_options = Options()
    chrome_options.add_argument('--headless=new')  # 新しいヘッドレスモード
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    # より人間らしいUser-Agent
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    # 自動化検出を回避するための設定
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    
    # GitHub Actions環境では、システムにインストールされたchromedriverを使用
    import os
    if os.path.exists('/usr/local/bin/chromedriver'):
        # GitHub Actions環境: システムのchromedriverを使用
        driver_path = '/usr/local/bin/chromedriver'
        service = Service(driver_path)
    else:
        # ローカル環境: webdriver-managerを使用
        try:
            driver_path = ChromeDriverManager().install()
            service = Service(driver_path)
        except Exception as e:
            print(f'ChromeDriverManagerでエラー: {e}')
            # フォールバック: システムのchromedriverを使用
            service = Service()
    
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # 自動化検出を回避するためのJavaScript実行
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        '''
    })
    
    return driver

def get_document_id(url):
    """URLからドキュメントIDを生成（重複チェック用）"""
    return hashlib.md5(url.encode()).hexdigest()

def scrape_area(driver, area_info):
    """特定エリアの入札情報をスクレイピング"""
    area_name = area_info['name']
    url = area_info['url']
    
    print(f'[{datetime.now()}] {area_name}エリアのスクレイピングを開始...')
    print(f'  アクセスURL: {url}')
    
    try:
        # タイムアウトを長めに設定
        driver.set_page_load_timeout(30)
        
        # まずトップページにアクセスしてから、目的のページに遷移（自然な遷移に見せる）
        try:
            print('  トップページにアクセス中...')
            driver.get('https://www.i-ppi.jp/IPPI/SearchServices/Web/Index.htm')
            time.sleep(3)  # 人間らしい待機時間
            
            # マウスを動かす（人間らしい動作）
            from selenium.webdriver.common.action_chains import ActionChains
            actions = ActionChains(driver)
            actions.move_by_offset(100, 100).perform()
            time.sleep(1)
        except Exception as e:
            print(f'  トップページアクセスでエラー（続行）: {e}')
        
        # 目的のページにアクセス
        print('  入札情報ページにアクセス中...')
        driver.get(url)
        
        # アラートが表示された場合は閉じる（複数回試行）
        for attempt in range(3):
            try:
                WebDriverWait(driver, 1).until(EC.alert_is_present())
                alert = driver.switch_to.alert
                alert_text = alert.text
                print(f'  アラート検出（試行{attempt+1}）: {alert_text}')
                alert.accept()
                time.sleep(2)
            except:
                break  # アラートがない場合は終了
        
        # ページ読み込み待機
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(5)  # JavaScriptの読み込みを待つ
        
        # 再度アラートチェック（ページ読み込み後に表示される場合がある）
        try:
            WebDriverWait(driver, 2).until(EC.alert_is_present())
            alert = driver.switch_to.alert
            alert_text = alert.text
            print(f'  遅延アラート検出: {alert_text}')
            alert.accept()
            time.sleep(2)
        except:
            pass
        
        # デバッグ: ページのHTMLを確認
        page_source = driver.page_source
        print(f'  ページタイトル: {driver.title}')
        print(f'  ページソースの長さ: {len(page_source)}文字')
        
        # ページのHTML構造を確認（最初の2000文字を出力）
        print(f'\n  ページのHTML構造（最初の2000文字）:')
        print(page_source[:2000])
        
        # フォーム要素を探す
        forms = driver.find_elements(By.CSS_SELECTOR, 'form')
        print(f'\n  見つかったフォーム数: {len(forms)}')
        for idx, form in enumerate(forms, 1):
            form_action = form.get_attribute('action')
            form_method = form.get_attribute('method')
            print(f'    フォーム{idx}: action={form_action}, method={form_method}')
        
        # 入力フィールドを探す
        inputs = driver.find_elements(By.CSS_SELECTOR, 'input, select, textarea')
        print(f'\n  見つかった入力フィールド数: {len(inputs)}')
        for idx, inp in enumerate(inputs[:10], 1):  # 最初の10個だけ
            inp_type = inp.get_attribute('type')
            inp_name = inp.get_attribute('name')
            inp_id = inp.get_attribute('id')
            print(f'    入力{idx}: type={inp_type}, name={inp_name}, id={inp_id}')
        
        # ボタンを探す
        buttons = driver.find_elements(By.CSS_SELECTOR, 'button, input[type="submit"], input[type="button"]')
        print(f'\n  見つかったボタン数: {len(buttons)}')
        for idx, btn in enumerate(buttons[:10], 1):  # 最初の10個だけ
            btn_text = btn.text.strip() or btn.get_attribute('value') or btn.get_attribute('title')
            btn_type = btn.get_attribute('type')
            print(f'    ボタン{idx}: text={btn_text[:50]}, type={btn_type}')
        
        # 入札情報のテーブルを取得
        # 実際のサイト構造に合わせてセレクタを調整してください
        tables = driver.find_elements(By.CSS_SELECTOR, 'table')
        print(f'\n  見つかったテーブル数: {len(tables)}')
        
        rows = driver.find_elements(By.CSS_SELECTOR, 'table tr')
        print(f'  見つかった行数: {len(rows)}')
        
        # リスト形式の可能性もある
        list_items = driver.find_elements(By.CSS_SELECTOR, 'ul li, ol li, div.item, div.result')
        print(f'  見つかったリスト項目数: {len(list_items)}')
        
        scraped_data = []
        
        for idx, row in enumerate(rows[1:], 1):  # ヘッダー行をスキップ
            try:
                cells = row.find_elements(By.TAG_NAME, 'td')
                if len(cells) < 3:
                    if idx <= 3:  # 最初の3行だけデバッグ出力
                        print(f'    行{idx}: セル数が少ない ({len(cells)}個)')
                    continue
                
                # セルの内容を取得（実際のサイト構造に合わせて調整）
                date = cells[0].text.strip() if len(cells) > 0 else ''
                organization = cells[1].text.strip() if len(cells) > 1 else ''
                title = cells[2].text.strip() if len(cells) > 2 else ''
                
                # リンクを取得（複数のセルからリンクを探す）
                link = ''
                for cell in cells:
                    link_elements = cell.find_elements(By.TAG_NAME, 'a')
                    if link_elements:
                        link = link_elements[0].get_attribute('href')
                        break
                
                if idx <= 3:  # 最初の3行だけデバッグ出力
                    print(f'    行{idx}: 日付={date[:20]}, 機関={organization[:20]}, タイトル={title[:30]}, リンク={link[:50] if link else "なし"}')
                
                if not link or not title:
                    continue
                
                # 相対URLを絶対URLに変換
                if link.startswith('/'):
                    link = f'https://www.i-ppi.jp{link}'
                elif not link.startswith('http'):
                    link = f'https://www.i-ppi.jp/{link}'
                
                scraped_data.append({
                    'date': date,
                    'area': area_name,
                    'organization': organization,
                    'title': title,
                    'link': link,
                    'scrapedAt': datetime.now().isoformat(),
                })
                
            except Exception as e:
                print(f'  行の処理中にエラー: {e}')
                continue
        
        print(f'  {len(scraped_data)}件のデータを取得')
        return scraped_data
        
    except Exception as e:
        print(f'  {area_name}エリアのスクレイピング中にエラー: {e}')
        return []

def save_to_firestore(data_list):
    """Firestoreにデータを保存（重複チェック付き）"""
    collection_ref = db.collection('public_works')
    saved_count = 0
    updated_count = 0
    
    for data in data_list:
        doc_id = get_document_id(data['link'])
        
        try:
            # merge=Trueで既存データがあれば更新、なければ新規作成
            collection_ref.document(doc_id).set({
                'date': data['date'],
                'area': data['area'],
                'organization': data['organization'],
                'title': data['title'],
                'link': data['link'],
                'scrapedAt': data['scrapedAt'],
            }, merge=True)
            
            # 既存ドキュメントかどうかを確認
            doc = collection_ref.document(doc_id).get()
            if doc.exists:
                updated_count += 1
            else:
                saved_count += 1
                
        except Exception as e:
            print(f'  Firestore保存エラー ({data["title"][:30]}...): {e}')
    
    print(f'保存完了: 新規{saved_count}件、更新{updated_count}件')

def main():
    """メイン処理"""
    print(f'[{datetime.now()}] スクレイピング開始')
    
    driver = None
    try:
        driver = setup_driver()
        all_data = []
        
        for i, area_info in enumerate(AREAS):
            # 各エリアのスクレイピング
            area_data = scrape_area(driver, area_info)
            all_data.extend(area_data)
            
            # 最後のエリア以外は30秒待機
            if i < len(AREAS) - 1:
                print(f'  30秒待機中...')
                time.sleep(30)
        
        # Firestoreに保存
        if all_data:
            print(f'[{datetime.now()}] Firestoreへの保存を開始...')
            save_to_firestore(all_data)
        else:
            print('取得したデータがありません')
        
        print(f'[{datetime.now()}] スクレイピング完了')
        
    except Exception as e:
        print(f'エラーが発生しました: {e}')
        raise
    finally:
        if driver:
            driver.quit()

if __name__ == '__main__':
    main()

