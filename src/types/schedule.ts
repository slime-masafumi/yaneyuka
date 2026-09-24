import { Timestamp } from 'firebase/firestore';

export type ScheduleMode = 'date' | 'question';
export type ResponseValue = 'yes' | 'maybe' | 'no';

export interface Schedule {
  id: string;
  slug: string;
  title: string;
  description?: string;
  ownerUid?: string;
  ownerName: string;
  // ownerEmail は意図的に持たない。
  // このドキュメントは公開スケジュールだと誰でも読めるため、
  // メールアドレスを載せると共有URLの受け取り手全員に見えてしまう。
  mode: ScheduleMode;
  isPublic: boolean;
  deadline?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** 種別（現場定例・中間検査・施主打合せ…） */
  kind?: string;
  /** 回答者 id → 役割（主催者が付ける） */
  roles?: Record<string, string>;
  /** 必ず出てほしい役割 */
  requiredRoles?: string[];
}

export interface ScheduleOption {
  id: string;
  label: string;
  dateTime?: Timestamp;
  order: number;
}

export interface ScheduleParticipant {
  id: string;
  name: string;
  comment?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ScheduleResponse {
  id: string;
  participantId: string;
  optionId: string;
  value: ResponseValue;
}

export interface OptionSummary {
  optionId: string;
  yes: number;
  maybe: number;
  no: number;
  total: number;
}











































