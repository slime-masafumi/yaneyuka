'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';

interface FeedbackFormData {
  email?: string;
  nickname?: string;
  message: string;
}

const FeedbackForm: React.FC = () => {
  const { isLoggedIn, currentUser } = useAuth();
  const [formData, setFormData] = useState<FeedbackFormData>({
    email: '',
    nickname: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      setSubmitResult('ご意見・ご要望の内容を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setSubmitResult('');

    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'feedback', 
          user: isLoggedIn ? currentUser?.uid : undefined,
          email: formData.email || undefined,
          nickname: formData.nickname || undefined,
          message: formData.message, 
          ts: Date.now() 
        })
      })

      setSubmitResult('ご意見・ご要望を送信いたしました。貴重なご意見をありがとうございました。');
      
      // フォームをリセット
      setFormData({
        email: '',
        nickname: '',
        message: ''
      });
    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitResult('送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrivacyPolicyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('プライバシーポリシーの詳細ページを表示します（実装予定）');
  };

  return (
    <div className="opacity-100 transition-all duration-500 ease-in-out">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">ご意見・ご要望</h2>
      </div>
      <div className="p-4 max-w-2xl mx-auto">
        <p className="text-[12px] text-gray-600 mb-3 text-center">
          yaneyuka をより良いサービスにするため、機能追加のご希望や改善点・バグのご報告などをお寄せください。<br />頂いた内容は運営チームが確認し、今後のアップデートに活かしてまいります。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded p-4">
          {/* 名前（任意） */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              名前（任意）
            </label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="お名前やニックネーム"
            />
          </div>

          {/* メールアドレス（任意） */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              メールアドレス（任意）
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="返信が必要な場合にご連絡します"
            />
          </div>

          {/* ご意見・ご要望内容 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              ご意見・ご要望 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              rows={6}
              value={formData.message}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`yaneyukaに関するお気づきの点をお書きください。
例：
・追加してほしい機能
・使いづらかった操作
・不具合のご報告
・掲載コンテンツへのご要望`}
              required
            />
          </div>

          {/* 送信結果メッセージ */}
          {submitResult && (
            <div className={`text-sm p-3 rounded ${
              submitResult.includes('送信いたしました')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {submitResult}
            </div>
          )}

          {/* 送信ボタン */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting || !formData.message.trim()}
              className={`px-8 py-2 rounded text-sm transition-colors ${
                isSubmitting || !formData.message.trim()
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? '送信中...' : '送信する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm; 