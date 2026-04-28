'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { auth } from '../../lib/firebaseClient';
import { sendPasswordResetEmail } from 'firebase/auth';

interface LoginFormProps {
  onNavigateToRegister?: () => void;
  onLoginSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onNavigateToRegister, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>('info');
  const { login } = useAuth();

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
      if (!formData.username.trim()) {
        throw new Error('ユーザー名を入力してください。');
      }
      if (!formData.password.trim()) {
        throw new Error('パスワードを入力してください。');
      }

      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        setMessageTone('success');
        setMessage('ログインしました。');
        setFormData({ username: '', password: '' });
        if (onLoginSuccess) {
          setTimeout(() => onLoginSuccess(), 500);
        }
      } else if (result.requiresVerification) {
        setMessageTone('info');
        setMessage('メールアドレスの確認がまだ完了していません。確認メールを再送しましたので受信ボックスおよび迷惑メールフォルダをご確認ください。');
      } else {
        setMessageTone('error');
        setMessage(result.error || 'メールアドレスまたはパスワードが正しくありません。');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'ログインに失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateToRegister) {
      onNavigateToRegister();
    }
  };

  return (
    <div className="opacity-100 transition-all duration-500 ease-in-out">
      <h2 className="text-xl font-semibold mb-1">ログイン</h2>
      <p className="text-sm text-gray-700 mb-3">メールアドレスとパスワードを入力してログインしてください。</p>
      <div className="bg-white rounded border p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <input
              required
              name="username"
              type="email"
              value={formData.username}
              onChange={handleInputChange}
              autoComplete="email"
              className="border w-full rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <input
              required
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="current-password"
              className="border w-full rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="パスワード"
              disabled={isSubmitting}
            />
          </div>

          {/* メッセージ表示 */}
          {message && (
            <div
              className={`text-sm p-3 rounded ${
                messageTone === 'success'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : messageTone === 'info'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-2 rounded text-sm transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? 'ログイン中...' : 'ログインする'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              className="text-[12px] text-blue-600 hover:text-blue-700 underline"
              onClick={async () => {
                if (!formData.username) { setMessage('再設定にはメールアドレスを入力してください'); return; }
                try {
                  await sendPasswordResetEmail(auth, formData.username);
                  setMessageTone('info');
                  setMessage('パスワード再設定メールを送信しました。届かない場合は迷惑メールフォルダもご確認ください。');
                } catch (err) {
                  console.error('パスワードリセットエラー:', err);
                  setMessageTone('error');
                  setMessage('再設定メールの送信に失敗しました。時間をおいて再度お試しください。');
                }
              }}
            >
              パスワードをお忘れですか？（再設定メールを送信）
            </button>
          </div>
          
          <p className="text-sm text-center">
            まだ登録していない方は{' '}
            <a
              href="#"
              onClick={handleRegisterLinkClick}
              className="text-blue-600 font-semibold hover:underline"
            >
              新規会員登録
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginForm; 