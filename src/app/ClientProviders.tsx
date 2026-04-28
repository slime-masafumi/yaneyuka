'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from '../lib/AuthContext';
import { TaskProvider } from '../components/providers/TaskProvider';
import MainLayout from '../components/layout/MainLayout';

const NewsPrefetch = dynamic(() => import('../components/content/news/NewsPrefetch'), { ssr: false });
const ChatNotificationListener = dynamic(() => import('../components/ChatNotificationListener'), { ssr: false });
const WorkMusic = dynamic(() => import('@/features/music/YoutubeMusicPlayer'), { ssr: false });

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthProvider>
        <ChatNotificationListener />
        <TaskProvider>
          <NewsPrefetch />
          <MainLayout>
            {children}
          </MainLayout>
        </TaskProvider>
      </AuthProvider>
      <WorkMusic />
    </>
  );
}
