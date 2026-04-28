import React from 'react'

interface PrivacyPolicyProps {
  unreadCount?: number;
}

export default function PrivacyPolicy({ unreadCount = 0 }: PrivacyPolicyProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-baseline mb-3">
        <h2 className="text-lg font-semibold">yaneyuka プライバシーポリシー</h2>
      </div>
      <div className="bg-white p-4 rounded border border-gray-300 text-[13px] leading-6 text-gray-800 space-y-3">
        <p>本ポリシーは、yaneyuka（以下「当サイト」）が提供するサービスにおける個人情報の取扱いを定めるものです。会員登録・お問い合わせ・サービス利用時に取得する情報の利用目的、保護体制等について定めます。</p>
        <div>
          <h3 className="font-semibold mb-1">1. 取得する情報</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>氏名（表示名）、メールアドレス、電話番号、会社名 等の連絡情報</li>
            <li>サービス利用に伴い発生する操作履歴・Cookie・アクセスログ</li>
            <li>お問い合わせ内容、掲載希望に関する入力情報</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-1">2. 利用目的</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>サービスの提供・本人確認・アカウント管理</li>
            <li>お問い合わせ/掲載希望への対応、連絡</li>
            <li>品質向上・不正防止・統計データの作成</li>
            <li>必要なお知らせの配信</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-1">3. 第三者提供</h3>
          <p>法令に基づく場合や人命・財産保護の必要がある場合等を除き、本人の同意なく第三者に提供しません。</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">4. 委託</h3>
          <p>業務委託先に取り扱いを委託する場合は、十分な管理体制を有する委託先を選定し、適切な監督を行います。</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">5. 安全管理</h3>
          <p>不正アクセス・漏えい・改ざん・滅失の防止のため、適切な技術的/組織的安全管理措置を実施します。</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">6. Cookie等の利用</h3>
          <p>利便性向上やアクセス解析のためCookie等を使用することがあります。ブラウザ設定で無効化することが可能です。</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">7. 個人情報の開示等の請求</h3>
          <p>ご本人からの開示・訂正・利用停止・削除のご請求に対して、法令に基づき速やかに対応します。</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">8. 改定</h3>
          <p>法令やサービス内容の変更に伴い、本ポリシーを改定することがあります。重要な変更は当サイト上で告知します。</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">9. お問い合わせ</h3>
          <p>本ポリシーに関するお問い合わせは、以下までご連絡ください。<br />メール: info@yaneyuka.com<br />運営会社：合同会社slime</p>
        </div>
      </div>
    </div>
  );
}
