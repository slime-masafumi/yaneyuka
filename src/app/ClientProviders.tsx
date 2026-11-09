'use client';

import React, { lazy } from 'react';
import { AuthProvider } from '../lib/AuthContext';
import { TaskProvider } from '../components/providers/TaskProvider';
import MainLayout from '../components/layout/MainLayout';
import AfterMount from '../components/AfterMount';

// ブラウザ専用の常駐部品。全ページに載るので next/dynamic({ ssr: false }) ではなく
// AfterMount で囲む（配信 HTML に CSR bailout の印を残さないため）。
const NewsPrefetch = lazy(() => import('../components/content/news/NewsPrefetch'));
const ChatNotificationListener = lazy(() => import('../components/ChatNotificationListener'));
const WorkMusic = lazy(() => import('@/features/music/YoutubeMusicPlayer'));

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthProvider>
        <AfterMount><ChatNotificationListener /></AfterMount>
        <TaskProvider>
          <AfterMount><NewsPrefetch /></AfterMount>
          <MainLayout>
            {children}
          </MainLayout>
        </TaskProvider>
      </AuthProvider>
      <AfterMount><WorkMusic /></AfterMount>
    </>
  );
}
