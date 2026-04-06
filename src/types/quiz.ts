import type { RefObject } from 'react';

export type Screen = 'auth' | 'quiz' | 'result' | 'lock' | 'chat' | 'create-room';

export type MessageAuthor = 'bot' | 'user';

export interface Question {
  id: number;
  question: string;
  options: string[];
  answer: number;
}

export interface QuizMessage {
  id: string;
  type: MessageAuthor;
  text: string;
  correct?: boolean;
}

export interface ChatMessage {
  id: string;
  type: MessageAuthor;
  senderEmail?: string;
  messageType?: 'text' | 'gif' | 'attachment' | 'forward';
  text: string;
  gifUrl?: string | null;
  reactions?: Array<{ emoji: string; userId: string }>;
  forwardedFromMessageId?: string | null;
  attachment?: {
    fileName: string | null;
    mimeType: string | null;
    hasData: boolean;
    sizeBytes: number;
    deletedAt: string | null;
  } | null;
  image?: string | null;
  createdAt?: string;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export type ScrollContainerRef = RefObject<HTMLDivElement | null>;
