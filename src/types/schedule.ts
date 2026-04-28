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
  ownerEmail?: string;
  mode: ScheduleMode;
  isPublic: boolean;
  deadline?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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











































