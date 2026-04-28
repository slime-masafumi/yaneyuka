/**
 * チャット機能の型定義
 * ステップ1: データ構造の定義
 */

export interface ChatUser {
  uid: string;
  username: string;
  email?: string | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: Date;
  readAt?: Date;
  readBy?: string[]; // 既読したユーザーのUID配列
}

export interface ChatRoom {
  id: string;
  participants: string[]; // 参加者のUID配列（2人用）
  participantUsernames: Record<string, string>; // UID -> ユーザー名のマッピング
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: Date;
  };
  lastActivityAt: Date;
  createdAt: Date;
  unreadCount?: Record<string, number>; // ユーザーUID -> 未読メッセージ数
  hiddenAvatarUserIds?: string[]; // このルームでアイコンを隠したいユーザーのIDリスト
  deletedBy?: string[]; // このルームを削除したユーザーのUID配列
}

