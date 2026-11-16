import type { Metadata } from 'next';
import ProjectHub from '@/components/projects/ProjectHub';
import '@/components/projects/project-hub.css';

/**
 * 物件ハブ。物件の台帳から 1 件選ぶと、Myタスク・メモ・yymail・Teamタスクの中身を集めて見せる。
 * 中身は利用者ごと(ログイン中はアカウント、未ログインはこのブラウザ)なので検索には出さない。
 * メニュー・サイトマップには載せない(各ツールの物件名の横の「物件ハブ」から入る)。2026-11-16
 */
export const metadata: Metadata = {
  title: '物件ハブ',
  description: '物件ごとに、宿題・メモ・メール・チームのタスクを 1 画面に集めます。',
  robots: { index: false, follow: false },
  alternates: { canonical: '/bukken/' },
};

export default function BukkenPage() {
  return <ProjectHub />;
}
