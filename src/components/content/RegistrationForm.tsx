import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const RegistrationForm: React.FC = () => {
  console.log('RegistrationForm component rendered');
  
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    company: '',
    department: '',
    name: '',
    email: '',
    phone: '',
    category: '',
    message: '',
    privacy: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    const categoryParam = searchParams?.get('category');
    if (categoryParam) {
      setFormData(prev => ({ ...prev, category: categoryParam }));
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checkbox.checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // 開発用APIへ送信（メール送付は行わない）
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'listing', ...formData })
      })
      
      setSubmitMessage('お問い合わせを受け付けました。担当者より折り返しご連絡いたします。');
      setFormData({
        company: '',
        department: '',
        name: '',
        email: '',
        phone: '',
        category: '',
        message: '',
        privacy: false
      });
    } catch (error) {
      setSubmitMessage('送信中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="opacity-100 transition-all duration-500 ease-in-out transform w-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">掲載希望のお問い合わせ</h2>
      <div className="p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 会社情報 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-1">会社情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  会社名 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="例：株式会社〇〇"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">部署名</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="例：営業部"
                />
              </div>
            </div>
          </div>

          {/* 担当者情報 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-1">ご担当者様 情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  ご担当者名 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="例：山田太郎"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="例：example@company.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="例：03-1234-5678"
                />
              </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                掲載希望カテゴリ <span className="text-red-500">*</span>
              </label>
              <select
                required
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full border rounded px-2 py-1 text-sm"
                data-dropdown-direction="down"
              >
                <option value="">選択してください</option>
                <option value="屋根">屋根</option>
                <option value="外壁">外壁</option>
                <option value="開口部">開口部</option>
                <option value="外壁仕上げ">外壁仕上げ</option>
                <option value="外部床">外部床</option>
                <option value="外部その他">外部その他</option>
                <option value="内部床材">内部床材</option>
                <option value="内装壁材">内装壁材</option>
                <option value="内装天井材">内装天井材</option>
                <option value="内装その他">内装その他</option>
                <option value="防水">防水</option>
                <option value="金物">金物</option>
                <option value="ファニチャー">ファニチャー</option>
                <option value="電気設備">電気設備</option>
                <option value="機械設備">機械設備</option>
                <option value="外構">外構</option>
                <option value="エクステリア">エクステリア</option>
                <option value="イベント情報">イベント情報</option>
                <option value="新商品">新製品</option>
                <option value="書籍・ソフト">書籍・ソフト</option>
                <option value="Pickup">Pickup</option>
                <option value="Shop">Shop</option>
                <option value="プロジェクト">プロジェクト</option>
                <option value="コンペ">コンペ</option>
                <option value="施工会社">施工会社</option>
                <option value="設計事務所">設計事務所</option>
                <option value="求人情報">求人情報</option>
                <option value="広告">広告</option>
                <option value="Maker conect">Maker conect</option>
                <option value="Chatbot">Chatbot</option>
                <option value="その他">その他</option>
              </select>
            </div>
            </div>
          </div>

          {/* お問い合わせ内容 */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-700 border-b pb-1">お問い合わせ内容</h3>
            <textarea
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="掲載に関するご要望やご質問がございましたらご記入ください。"
            />
          </div>

          {/* プライバシーポリシー */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <input
                required
                type="checkbox"
                id="privacy"
                name="privacy"
                checked={formData.privacy}
                onChange={handleInputChange}
                className="mt-0.5 h-4 w-4 translate-y-[-2px]"
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="privacy" className="text-xs text-gray-600">
                  プライバシーポリシーに同意します。
                </label>
                <button
                  type="button"
                  onClick={() => setShowPolicy(prev => !prev)}
                  className="text-left text-xs text-blue-600 hover:underline"
                  aria-expanded={showPolicy}
                  aria-controls="privacy-policy-content"
                >
                  {showPolicy ? '閉じる' : 'プライバシーポリシーを読む'}
                </button>
              </div>
            </div>
            {showPolicy && (
              <div
                id="privacy-policy-content"
                className="border border-gray-200 rounded bg-gray-50 p-3 text-[11px] leading-5 text-gray-700 space-y-3"
              >
                <p>
                  本ポリシーは、yaneyuka（以下「当サイト」）が提供するサービスにおける個人情報の取扱いを定めるものです。会員登録・お問い合わせ・サービス利用時に取得する情報の利用目的、保護体制等について定めます。
                </p>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">1. 取得する情報</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>氏名（表示名）、メールアドレス、電話番号、会社名 等の連絡情報</li>
                    <li>サービス利用に伴い発生する操作履歴・Cookie・アクセスログ</li>
                    <li>お問い合わせ内容、掲載希望に関する入力情報</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">2. 利用目的</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>サービスの提供・本人確認・アカウント管理</li>
                    <li>お問い合わせ/掲載希望への対応、連絡</li>
                    <li>品質向上・不正防止・統計データの作成</li>
                    <li>必要なお知らせの配信</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">3. 第三者提供</h3>
                  <p>法令に基づく場合や人命・財産保護の必要がある場合等を除き、本人の同意なく第三者に提供しません。</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">4. 委託</h3>
                  <p>業務委託先に取り扱いを委託する場合は、十分な管理体制を有する委託先を選定し、適切な監督を行います。</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">5. 安全管理</h3>
                  <p>不正アクセス・漏えい・改ざん・滅失の防止のため、適切な技術的/組織的安全管理措置を実施します。</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">6. Cookie等の利用</h3>
                  <p>利便性向上やアクセス解析のためCookie等を使用することがあります。ブラウザ設定で無効化することが可能です。</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">7. 個人情報の開示等の請求</h3>
                  <p>ご本人からの開示・訂正・利用停止・削除のご請求に対して、法令に基づき速やかに対応します。</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">8. 改定</h3>
                  <p>法令やサービス内容の変更に伴い、本ポリシーを改定することがあります。重要な変更は当サイト上で告知します。</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">9. お問い合わせ</h3>
                  <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。<br />メール: info@yaneyuka.com<br />運営会社：合同会社slime</p>
                </div>
              </div>
            )}
          </div>

          {/* 送信ボタン */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '送信中...' : '送信する'}
            </button>
          </div>

          {/* 送信結果メッセージ */}
          {submitMessage && (
            <div className={`text-center text-sm p-3 rounded ${
              submitMessage.includes('エラー') 
                ? 'bg-red-50 text-red-600 border border-red-200' 
                : 'bg-green-50 text-green-600 border border-green-200'
            }`}>
              {submitMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm; 