'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';

interface RegisterFormProps {
  onNavigateToLogin?: () => void;
}

const passwordIsStrong = (password: string) => {
  if (password.length < 10) return false;
  const categories = [
    /[a-z]/,
    /[A-Z]/,
    /[0-9]/,
    /[^A-Za-z0-9]/,
  ];
  const passed = categories.reduce((count, regex) => (regex.test(password) ? count + 1 : count), 0);
  return passed >= 3;
};

const RegisterForm: React.FC<RegisterFormProps> = ({ onNavigateToLogin }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>('info');
  const { register } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setMessageTone('info');

    try {
      if (!formData.email.trim()) {
        throw new Error('メールアドレスを入力してください。');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('有効なメールアドレスを入力してください。');
      }
      if (!formData.password.trim()) {
        throw new Error('パスワードを入力してください。');
      }
      if (!passwordIsStrong(formData.password)) {
        throw new Error('パスワードは10文字以上・英大文字/小文字/数字/記号のうち3種類以上を含めてください。');
      }

      const result = await register(formData.email, formData.password, formData.displayName || undefined);
      
      if (result.success && result.requiresVerification) {
        setMessageTone('success');
        setMessage(
          '仮登録を受け付けました。ご入力のメールアドレスに確認メールを送信しています。メール内のリンクを開いて本登録を完了してください。迷惑メールフォルダもご確認ください。\n\nメールが届かない場合は、ログイン画面でログインを試みると確認メールが再送されます。'
        );
        setFormData({ displayName: '', email: '', password: '' });
      } else if (!result.success) {
        setMessageTone('error');
        setMessage(result.error || '登録に失敗しました。時間をおいて再度お試しください。');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : '登録に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateToLogin) {
      onNavigateToLogin();
    }
  };

  return (
    <div className="opacity-100 transition-all duration-500 ease-in-out">
      <h2 className="text-xl font-semibold mb-1">新規会員登録</h2>
      <p className="text-sm text-gray-700 mb-3">まずはメールとパスワードを登録します。登録後にメールに届くリンクで確認を完了してください。</p>
      <div className="p-6 max-w-2xl mx-auto bg-white rounded border">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">表示名（任意）</label>
              <input
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="例） やねゆか 太郎"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="10文字以上（英大小文字・数字・記号のうち3種類以上）"
                disabled={isSubmitting}
              />
              <p className="text-[12px] text-gray-600 mt-1">安全のため英数字・記号の組み合わせを推奨します。</p>
            </div>
          </div>

          {/* メッセージ表示 */}
          {message && (
            <div
              className={`text-sm p-3 rounded ${
                messageTone === 'success'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : messageTone === 'error'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              {message.split('\n').map((line, i) => (
                <span key={i}>{line}{i < message.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          )}

          <div className="text-center mt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-2 rounded text-sm transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
          </div>
          
          <p className="text-sm text-center mt-4">
            すでに登録済みの方は{' '}
            <a
              href="#"
              onClick={handleLoginLinkClick}
              className="text-blue-600 font-semibold hover:underline"
            >
              ログイン
            </a>
          </p>
        </form>
      </div>
      <div className="max-w-2xl mx-auto mt-4 text-[12px] text-gray-600 space-y-1 bg-white/70 border border-gray-200 rounded p-3">
        <p className="font-semibold">ご注意事項</p>
        <ul className="list-disc list-inside space-y-1">
          <li>登録直後に「no-reply@firebaseapp.com」などから確認メールが届きます。迷惑メールフォルダに振り分けられる場合があります。</li>
          <li>確認メールのリンクを開くまではログインできません。メールを紛失した場合はログイン画面から再送できます。</li>
        </ul>
      </div>
    </div>
  );
};

export default RegisterForm; 