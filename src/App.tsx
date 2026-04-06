import { useEffect, useRef, useState, type ChangeEvent, type JSX } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { CreateRoomScreen } from './components/CreateRoomScreen';
import { LockScreen } from './components/LockScreen';
import { QuizScreen } from './components/QuizScreen';
import { ResultScreen } from './components/ResultScreen';
import { PortalChatScreen } from './components/PortalChatScreen';
import { GRADE_COLORS, OPTION_LABELS, QUESTIONS } from './constants/quizData';
import type { ChatMessage, Grade, QuizMessage, Screen } from './types/quiz';
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  signout as signoutRequest,
  storeAuthToken,
  validateToken,
  type AuthUser
} from './services/authApi';
import { joinRoomByCode } from './services/chatRoomApi';
import {
  deleteMessageById,
  deleteMessagesBulk,
  downloadAttachment,
  forwardMessage,
  listMessages,
  sendAttachmentMessage,
  sendGifMessage,
  sendTextMessage,
  toggleReaction
} from './services/messageApi';
import { connectSocket, disconnectSocket, getSocket } from './services/socketClient';
import './app.css';

const QUIZ_INTRO_DELAY_MS = 300;
const SHOW_OPTIONS_DELAY_MS = 600;
const ROOM_CREATOR_EMAIL = (import.meta.env.VITE_ROOM_CREATOR_EMAIL ?? '').trim().toLowerCase();

export default function QuizApp(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('auth');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState('INVALID CODE - ACCESS DENIED');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [shaking, setShaking] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [otherAnswerText, setOtherAnswerText] = useState('');
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizMessages, setQuizMessages] = useState<QuizMessage[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    fileName: string;
    mimeType: string;
    dataBase64: string;
    sizeBytes: number;
  } | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [currentRoomMembers, setCurrentRoomMembers] = useState<string[]>([]);
  const [onlineMemberEmails, setOnlineMemberEmails] = useState<string[]>([]);
  const [otherMemberTyping, setOtherMemberTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  const quizChatRef = useRef<HTMLDivElement | null>(null);
  const portalChatRef = useRef<HTMLDivElement | null>(null);
  const lockInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isRoomCreator =
    Boolean(currentUser?.email) &&
    ROOM_CREATOR_EMAIL.length > 0 &&
    currentUser?.email.toLowerCase() === ROOM_CREATOR_EMAIL;
  const normalizedCurrentUserEmail = currentUser?.email?.toLowerCase() ?? null;
  const otherMemberEmail =
    currentRoomMembers.find((email) => email.toLowerCase() !== normalizedCurrentUserEmail) ?? null;
  const otherMemberOnline = otherMemberEmail
    ? onlineMemberEmails.map((email) => email.toLowerCase()).includes(otherMemberEmail.toLowerCase())
    : false;

  const upsertChatMessage = (incoming: ChatMessage): void => {
    setChatMessages((previous) => {
      const index = previous.findIndex((item) => item.id === incoming.id);
      if (index === -1) {
        return [...previous, incoming];
      }
      const next = [...previous];
      next[index] = { ...next[index], ...incoming };
      return next;
    });
  };

  useEffect(() => {
    const bootstrapAuth = async (): Promise<void> => {
      const storedToken = getStoredAuthToken();
      if (!storedToken) {
        setIsAuthChecking(false);
        setScreen('auth');
        return;
      }

      const validation = await validateToken(storedToken);
      if (!validation.ok) {
        clearStoredAuthToken();
        setAuthToken(null);
        setCurrentUser(null);
        setScreen('auth');
        setIsAuthChecking(false);
        return;
      }

      setAuthToken(storedToken);
      setCurrentUser(validation.user);
      setIsAuthChecking(false);
      setScreen('quiz');
    };

    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!isAuthChecking && !authToken && screen !== 'auth') {
      setScreen('auth');
    }
  }, [authToken, isAuthChecking, screen]);

  useEffect(() => {
    if (!authToken) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(authToken);
    return () => {
      socket.off('message:new');
      socket.off('message:update');
      socket.off('room:presence');
      socket.off('room:typing');
      socket.off('room:error');
    };
  }, [authToken]);

  useEffect(() => {
    setIsHeaderMenuOpen(false);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'quiz' || quizMessages.length > 0) {
      return;
    }

    const introTimeout = window.setTimeout(() => {
      setQuizMessages([
        {
          id: crypto.randomUUID(),
          type: 'bot',
          text: `Let's begin the evaluation.\n\nQuestion 1 of ${QUESTIONS.length}`,
        },
      ]);

      const optionsTimeout = window.setTimeout(() => {
        setShowOptions(true);
      }, SHOW_OPTIONS_DELAY_MS);

      return () => window.clearTimeout(optionsTimeout);
    }, QUIZ_INTRO_DELAY_MS);

    return () => {
      window.clearTimeout(introTimeout);
    };
  }, [screen, quizMessages.length]);

  useEffect(() => {
    if (screen === 'quiz' && quizMessages.length > 0) {
      const timeout = window.setTimeout(() => {
        quizChatRef.current?.scrollTo({
          top: quizChatRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);

      return () => window.clearTimeout(timeout);
    }

    if (screen === 'chat' && chatMessages.length > 0) {
      const timeout = window.setTimeout(() => {
        portalChatRef.current?.scrollTo({
          top: portalChatRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [quizMessages, chatMessages, screen]);

  useEffect(() => {
    if (screen !== 'chat' || !authToken || !currentRoomCode || !currentUser?.email) {
      return;
    }

    const socket = getSocket();
    const onMessageNew = (payload: {
      id: string;
      senderEmail: string;
      messageType: 'text' | 'gif' | 'attachment' | 'forward';
      text: string | null;
      gifUrl: string | null;
      attachment: ChatMessage['attachment'];
      reactions: Array<{ emoji: string; userId: string }>;
      forwardedFromMessageId: string | null;
      createdAt: string;
    }): void => {
      const incoming: ChatMessage = {
        id: payload.id,
        type:
          payload.senderEmail.toLowerCase() === currentUser.email.toLowerCase() ? 'user' : 'bot',
        senderEmail: payload.senderEmail,
        messageType: payload.messageType,
        text: payload.text ?? (payload.messageType === 'attachment' ? '[Attachment]' : ''),
        gifUrl: payload.gifUrl,
        attachment: payload.attachment,
        reactions: payload.reactions,
        forwardedFromMessageId: payload.forwardedFromMessageId,
        createdAt: payload.createdAt
      };
      upsertChatMessage(incoming);
      window.setTimeout(() => {
        portalChatRef.current?.scrollTo({
          top: portalChatRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 30);
    };

    const onMessageUpdate = (payload: {
      id: string;
      senderEmail: string;
      messageType: 'text' | 'gif' | 'attachment' | 'forward';
      text: string | null;
      gifUrl: string | null;
      attachment: ChatMessage['attachment'];
      reactions: Array<{ emoji: string; userId: string }>;
      forwardedFromMessageId: string | null;
      createdAt: string;
    }): void => {
      const incoming: ChatMessage = {
        id: payload.id,
        type:
          payload.senderEmail.toLowerCase() === currentUser.email.toLowerCase() ? 'user' : 'bot',
        senderEmail: payload.senderEmail,
        messageType: payload.messageType,
        text: payload.text ?? (payload.messageType === 'attachment' ? '[Attachment]' : ''),
        gifUrl: payload.gifUrl,
        attachment: payload.attachment,
        reactions: payload.reactions,
        forwardedFromMessageId: payload.forwardedFromMessageId,
        createdAt: payload.createdAt
      };
      upsertChatMessage(incoming);
    };

    const onPresence = (payload: {
      onlineCount?: number;
      onlineMemberEmails?: string[];
      memberEmails?: string[];
    }): void => {
      setOnlineCount(payload.onlineCount ?? 0);
      setOnlineMemberEmails(payload.onlineMemberEmails ?? []);
      if (payload.memberEmails?.length) {
        setCurrentRoomMembers(payload.memberEmails);
      }
    };

    const onMessageDeleted = (payload: { messageId?: string }): void => {
      if (!payload?.messageId) {
        return;
      }
      setChatMessages((previous) => previous.filter((item) => item.id !== payload.messageId));
      setSelectedMessageIds((previous) => previous.filter((id) => id !== payload.messageId));
    };

    const onMessagesBulkDeleted = (payload: { messageIds?: string[] }): void => {
      const ids = payload?.messageIds ?? [];
      if (!ids.length) {
        return;
      }
      const idSet = new Set(ids);
      setChatMessages((previous) => previous.filter((item) => !idSet.has(item.id)));
      setSelectedMessageIds((previous) => previous.filter((id) => !idSet.has(id)));
    };

    const onTyping = (payload: { email?: string; isTyping?: boolean }): void => {
      if (!payload?.email || !otherMemberEmail) {
        return;
      }
      if (payload.email.toLowerCase() !== otherMemberEmail.toLowerCase()) {
        return;
      }
      setOtherMemberTyping(Boolean(payload.isTyping));
    };

    socket?.emit('room:join', { roomCode: currentRoomCode });
    socket?.on('message:new', onMessageNew);
    socket?.on('message:update', onMessageUpdate);
    socket?.on('message:deleted', onMessageDeleted);
    socket?.on('message:bulkDeleted', onMessagesBulkDeleted);
    socket?.on('room:presence', onPresence);
    socket?.on('room:typing', onTyping);
    socket?.on('room:error', (payload: { message?: string }) => {
      if (payload?.message) {
        showInvalidCode(payload.message.toUpperCase());
      }
    });

    let isMounted = true;

    const syncMessages = async (): Promise<void> => {
      const result = await listMessages(authToken, currentRoomCode, currentUser.email);
      if (!isMounted || !result.ok) {
        return;
      }
      setChatMessages(result.messages);
    };

    void syncMessages();

    return () => {
      isMounted = false;
      socket?.emit('room:leave', { roomCode: currentRoomCode });
      socket?.off('message:new', onMessageNew);
      socket?.off('message:update', onMessageUpdate);
      socket?.off('message:deleted', onMessageDeleted);
      socket?.off('message:bulkDeleted', onMessagesBulkDeleted);
      socket?.off('room:presence', onPresence);
      socket?.off('room:typing', onTyping);
    };
  }, [screen, authToken, currentRoomCode, currentUser?.email, otherMemberEmail]);

  const showInvalidCode = (message = 'INVALID CODE - ACCESS DENIED'): void => {
    setCodeErrorMessage(message);
    setCodeError(true);
    setShaking(true);
    window.setTimeout(() => setShaking(false), 600);
    window.setTimeout(() => setCodeError(false), 2500);
  };

  const joinRoomWithCode = async (
    rawCode: string
  ): Promise<{ ok: true } | { ok: false; message: string }> => {
    const normalizedCode = rawCode.trim().toUpperCase();
    if (!normalizedCode) {
      return { ok: false, message: 'Room code is required' };
    }

    if (!authToken) {
      setScreen('auth');
      return { ok: false, message: 'Authentication required' };
    }

    const result = await joinRoomByCode(authToken, normalizedCode);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    const currentEmail = currentUser?.email?.toLowerCase().trim();
    const memberEmails = result.memberEmails.map((email) => email.toLowerCase().trim());
    if (currentEmail && !memberEmails.includes(currentEmail)) {
      return {
        ok: false,
        message: 'Current signed-in user is not a member of this room'
      };
    }

    setCurrentRoomName(result.roomName ?? normalizedCode);
    setCurrentRoomCode(result.roomCode);
    setCurrentRoomMembers(result.memberEmails);
    setScreen('chat');
    return { ok: true };
  };

  const tryJoinRoomWithCode = async (rawCode: string): Promise<boolean> => {
    const result = await joinRoomWithCode(rawCode);
    if (!result.ok) {
      showInvalidCode(result.message.toUpperCase());
      return false;
    }

    setCodeInput('');
    setCodeError(false);
    return true;
  };

  const unlockChat = async (): Promise<void> => {
    setIsJoiningRoom(true);
    try {
      const joined = await tryJoinRoomWithCode(codeInput);
      if (!joined) {
        return;
      }
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const [file] = event.target.files ?? [];
    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showInvalidCode('ATTACHMENT TOO LARGE. MAX 10MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        return;
      }

      const commaIndex = result.indexOf(',');
      const dataBase64 = commaIndex >= 0 ? result.slice(commaIndex + 1) : result;
      setSelectedAttachment({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64,
        sizeBytes: file.size
      });
      if (file.type.startsWith('image/')) {
        setSelectedImage(result);
      } else {
        setSelectedImage(null);
      }
    };
    reader.readAsDataURL(file);

    event.target.value = '';
  };

  const emitTypingState = (isTyping: boolean): void => {
    const socket = getSocket();
    if (!socket || !currentRoomCode) {
      return;
    }
    socket.emit('room:typing', { roomCode: currentRoomCode, isTyping });
  };

  const handleChatInputChange = (value: string): void => {
    setChatInput(value);
    emitTypingState(value.trim().length > 0);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      emitTypingState(false);
    }, 1200);
  };

  const sendChatMessage = async (): Promise<void> => {
    if (!chatInput.trim() && !selectedAttachment) {
      return;
    }

    if (!authToken || !currentRoomCode || !currentUser?.email) {
      return;
    }

    setIsSendingMessage(true);
    try {
      if (selectedAttachment) {
        const attachmentResult = await sendAttachmentMessage(
          authToken,
          currentRoomCode,
          selectedAttachment.fileName,
          selectedAttachment.mimeType,
          selectedAttachment.dataBase64,
          currentUser.email
        );
        if (!attachmentResult.ok) {
          showInvalidCode(attachmentResult.message.toUpperCase());
          return;
        }
        upsertChatMessage(attachmentResult.message);
        setChatInput('');
        emitTypingState(false);
        setSelectedImage(null);
        setSelectedAttachment(null);
        return;
      }

      const textResult = await sendTextMessage(authToken, currentRoomCode, chatInput.trim(), currentUser.email);
      if (!textResult.ok) {
        showInvalidCode(textResult.message.toUpperCase());
        return;
      }
      upsertChatMessage(textResult.message);
      setChatInput('');
      emitTypingState(false);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const sendGif = async (): Promise<void> => {
    const gifUrl = window.prompt('Paste GIF URL');
    if (!gifUrl?.trim() || !authToken || !currentRoomCode || !currentUser?.email) {
      return;
    }

    const result = await sendGifMessage(authToken, currentRoomCode, gifUrl.trim(), currentUser.email);
    if (!result.ok) {
      showInvalidCode(result.message.toUpperCase());
      return;
    }
    upsertChatMessage(result.message);
  };

  const reactToChatMessage = async (messageId: string, emoji: string): Promise<void> => {
    if (!authToken || !currentRoomCode || !currentUser?.email) {
      return;
    }
    const result = await toggleReaction(authToken, currentRoomCode, messageId, emoji, currentUser.email);
    if (!result.ok) {
      return;
    }
    setChatMessages((previous) =>
      previous.map((item) => (item.id === messageId ? result.message : item))
    );
  };

  const deleteChatMessage = async (messageId: string): Promise<void> => {
    if (!authToken || !currentRoomCode) {
      return;
    }
    const result = await deleteMessageById(authToken, currentRoomCode, messageId);
    if (!result.ok) {
      showInvalidCode(result.message.toUpperCase());
      return;
    }
    setChatMessages((previous) => previous.filter((item) => item.id !== result.messageId));
    setSelectedMessageIds((previous) => previous.filter((id) => id !== result.messageId));
  };

  const deleteSelectedChatMessages = async (): Promise<void> => {
    if (!authToken || !currentRoomCode || selectedMessageIds.length === 0) {
      return;
    }
    const result = await deleteMessagesBulk(authToken, currentRoomCode, selectedMessageIds);
    if (!result.ok) {
      showInvalidCode(result.message.toUpperCase());
      return;
    }
    const idSet = new Set(result.messageIds);
    setChatMessages((previous) => previous.filter((item) => !idSet.has(item.id)));
    setSelectedMessageIds([]);
    setSelectionMode(false);
  };

  const toggleMessageSelection = (messageId: string): void => {
    setSelectedMessageIds((previous) =>
      previous.includes(messageId)
        ? previous.filter((id) => id !== messageId)
        : [...previous, messageId]
    );
  };

  const forwardChatMessage = async (messageId: string): Promise<void> => {
    if (!authToken || !currentRoomCode || !currentUser?.email) {
      return;
    }
    const result = await forwardMessage(authToken, currentRoomCode, messageId, currentUser.email);
    if (!result.ok) {
      showInvalidCode(result.message.toUpperCase());
      return;
    }
    upsertChatMessage(result.message);
  };

  const downloadMessageAttachment = async (messageId: string): Promise<void> => {
    if (!authToken || !currentRoomCode) {
      return;
    }
    const result = await downloadAttachment(authToken, currentRoomCode, messageId);
    if (!result.ok) {
      showInvalidCode(result.message.toUpperCase());
      return;
    }

    const byteCharacters = atob(result.dataBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let index = 0; index < byteCharacters.length; index += 1) {
      byteNumbers[index] = byteCharacters.charCodeAt(index);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    link.click();
    URL.revokeObjectURL(url);

    setChatMessages((previous) =>
      previous.map((item) =>
        item.id === messageId && item.attachment
          ? {
              ...item,
              attachment: {
                ...item.attachment,
                hasData: false
              }
            }
          : item
      )
    );
  };

  const handleAnswerSelection = (optionIndex: number): void => {
    if (answerConfirmed) {
      return;
    }

    setSelectedOptionIndex(optionIndex);
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    const otherOptionIndex = currentQuestion.options.length;
    if (optionIndex !== otherOptionIndex) {
      setOtherAnswerText('');
    }
  };

  const normalizeAnswer = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

  const confirmAnswer = (): void => {
    if (selectedOptionIndex === null || answerConfirmed) {
      return;
    }

    const currentQuestion = QUESTIONS[currentQuestionIndex];
    const otherOptionIndex = currentQuestion.options.length;
    const isOtherSelected = selectedOptionIndex === otherOptionIndex;
    const typedOtherAnswer = otherAnswerText.trim();

    if (isOtherSelected && typedOtherAnswer.length === 0) {
      return;
    }

    setAnswerConfirmed(true);
    setShowOptions(false);

    const correctAnswerText = currentQuestion.options[currentQuestion.answer];
    const isCorrect = isOtherSelected
      ? normalizeAnswer(typedOtherAnswer) === normalizeAnswer(correctAnswerText)
      : selectedOptionIndex === currentQuestion.answer;

    if (isCorrect) {
      setScore((previous) => previous + 1);
    }

    const userAnswerLabel = OPTION_LABELS[selectedOptionIndex] ?? 'E';
    const userAnswerText = isOtherSelected
      ? typedOtherAnswer
      : currentQuestion.options[selectedOptionIndex];

    const userMessage: QuizMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      text: `${userAnswerLabel}. ${userAnswerText}`,
    };

    const botReply: QuizMessage = {
      id: crypto.randomUUID(),
      type: 'bot',
      text: isCorrect
        ? 'Correct! Well done.'
        : `Incorrect. The answer was:\n${OPTION_LABELS[currentQuestion.answer]}. ${correctAnswerText}`,
      correct: isCorrect,
    };

    setQuizMessages((previous) => [...previous, userMessage]);

    window.setTimeout(() => {
      void (async () => {
        // For "Other", first treat input as a potential room code.
        if (isOtherSelected) {
          const joinedResult = await joinRoomWithCode(typedOtherAnswer);
          if (joinedResult.ok) {
            setQuizMessages((previous) => [
              ...previous,
              {
                id: crypto.randomUUID(),
                type: 'bot',
                text: 'Room found. Redirecting you to secure portal chat.'
              }
            ]);
            return;
          }
        }

        // If room join fails, continue normal quiz validation flow.
        setQuizMessages((previous) => [...previous, botReply]);

        if (currentQuestionIndex + 1 < QUESTIONS.length) {
          window.setTimeout(() => {
            const nextQuestion = QUESTIONS[currentQuestionIndex + 1];

            setQuizMessages((previous) => [
              ...previous,
              {
                id: crypto.randomUUID(),
                type: 'bot',
                text: `Question ${currentQuestionIndex + 2} of ${QUESTIONS.length}\n\n${nextQuestion.question}`,
              },
            ]);

            setCurrentQuestionIndex((previous) => previous + 1);
            setSelectedOptionIndex(null);
            setOtherAnswerText('');
            setAnswerConfirmed(false);

            window.setTimeout(() => setShowOptions(true), 400);
          }, 1000);

          return;
        }

        window.setTimeout(() => {
          setScreen('result');
        }, 1200);
      })();
    }, 400);
  };

  const goToLockScreen = (): void => {
    emitTypingState(false);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    setScreen('lock');
    setCodeInput('');
    setCodeError(false);
    setCodeErrorMessage('INVALID CODE - ACCESS DENIED');
    setIsJoiningRoom(false);
    setShaking(false);
    setSelectedAttachment(null);
    setSelectedImage(null);
    setCurrentRoomCode(null);
    setCurrentRoomName(null);
    setCurrentRoomMembers([]);
    setOnlineMemberEmails([]);
    setOtherMemberTyping(false);
    setOnlineCount(0);
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const resetQuiz = (): void => {
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setOtherAnswerText('');
    setAnswerConfirmed(false);
    setScore(0);
    setQuizMessages([]);
    setShowOptions(false);
    goToLockScreen();
  };

  const handleAuthenticated = (payload: { token: string; user: AuthUser }): void => {
    storeAuthToken(payload.token);
    setAuthToken(payload.token);
    setCurrentUser(payload.user);
    setScreen('quiz');
  };

  const handleSignout = async (): Promise<void> => {
    emitTypingState(false);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    setIsHeaderMenuOpen(false);
    await signoutRequest(authToken ?? undefined);
    clearStoredAuthToken();
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentRoomName(null);
    setCurrentRoomCode(null);
    setCurrentRoomMembers([]);
    setOnlineMemberEmails([]);
    setOtherMemberTyping(false);
    setOnlineCount(0);
    setSelectionMode(false);
    setSelectedMessageIds([]);
    disconnectSocket();
    setScreen('auth');
  };

  const openCreateRoomScreen = (): void => {
    if (!isRoomCreator) {
      return;
    }
    setIsHeaderMenuOpen(false);
    setScreen('create-room');
  };

  const percentage = Math.round((score / QUESTIONS.length) * 100);
  const grade: Grade =
    percentage >= 90
      ? 'S'
      : percentage >= 80
      ? 'A'
      : percentage >= 70
      ? 'B'
      : percentage >= 60
      ? 'C'
      : percentage >= 50
      ? 'D'
      : 'F';
  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const otherOptionIndex = currentQuestion.options.length;
  const isOtherSelected = selectedOptionIndex === otherOptionIndex;
  const canConfirm =
    !answerConfirmed &&
    selectedOptionIndex !== null &&
    (!isOtherSelected || otherAnswerText.trim().length > 0);

  return (
    <div className="app">
      <div className="scanline" />

      {isAuthChecking && <div className="auth-loading">Validating session...</div>}

      {!isAuthChecking && screen === 'auth' && <AuthScreen onAuthenticated={handleAuthenticated} />}

      {screen === 'lock' && (
        <LockScreen
          codeError={codeError}
          codeErrorMessage={codeErrorMessage}
          codeInput={codeInput}
          inputRef={lockInputRef}
          onChangeCode={(value) => setCodeInput(value.toUpperCase())}
          onSubmit={() => void unlockChat()}
          shaking={shaking}
          isJoiningRoom={isJoiningRoom}
        />
      )}

      {screen === 'quiz' && (
        <QuizScreen
          answerConfirmed={answerConfirmed}
          canConfirm={canConfirm}
          currentQuestion={QUESTIONS[currentQuestionIndex]}
          currentQuestionIndex={currentQuestionIndex}
          messages={quizMessages}
          onChangeOtherAnswer={setOtherAnswerText}
          onConfirmAnswer={confirmAnswer}
          onHeaderLogoClick={() => setIsHeaderMenuOpen((previous) => !previous)}
          onSelectAnswer={handleAnswerSelection}
          otherAnswerText={otherAnswerText}
          otherOptionIndex={otherOptionIndex}
          selectedOptionIndex={selectedOptionIndex}
          showOptions={showOptions}
          totalQuestions={QUESTIONS.length}
          chatRef={quizChatRef}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          percentage={percentage}
          grade={grade}
          gradeColor={GRADE_COLORS[grade]}
          score={score}
          totalQuestions={QUESTIONS.length}
          onRetakeQuiz={resetQuiz}
          onContinueToPortal={goToLockScreen}
        />
      )}

      {screen === 'chat' && (
        <PortalChatScreen
          chatInput={chatInput}
          isSendingMessage={isSendingMessage}
          messages={chatMessages}
          currentUserEmail={currentUser?.email ?? null}
          selectedMessageIds={selectedMessageIds}
          selectionMode={selectionMode}
          otherMemberEmail={otherMemberEmail}
          otherMemberOnline={otherMemberOnline}
          otherMemberTyping={otherMemberTyping}
          onlineCount={onlineCount}
          roomName={currentRoomName}
          onAttachClick={() => fileInputRef.current?.click()}
          onBackToLock={goToLockScreen}
          onChatInputChange={handleChatInputChange}
          onDownloadAttachment={(messageId) => void downloadMessageAttachment(messageId)}
          onForwardMessage={(messageId) => void forwardChatMessage(messageId)}
          onHeaderLogoClick={() => setIsHeaderMenuOpen((previous) => !previous)}
          onImageChange={handleImageChange}
          onDeleteMessage={(messageId) => void deleteChatMessage(messageId)}
          onDeleteSelectedMessages={() => void deleteSelectedChatMessages()}
          onReactMessage={(messageId, emoji) => void reactToChatMessage(messageId, emoji)}
          onRemoveSelectedImage={() => setSelectedImage(null)}
          onToggleMessageSelection={toggleMessageSelection}
          onToggleSelectionMode={() => setSelectionMode((previous) => !previous)}
          onSendGif={() => void sendGif()}
          onSendMessage={() => void sendChatMessage()}
          selectedImage={selectedImage}
          chatRef={portalChatRef}
          fileInputRef={fileInputRef}
        />
      )}

      {screen === 'create-room' && authToken && isRoomCreator && (
        <CreateRoomScreen authToken={authToken} onBack={() => setScreen('quiz')} />
      )}

      {isHeaderMenuOpen && authToken && screen !== 'auth' && (
        <div className="header-menu-overlay" onClick={() => setIsHeaderMenuOpen(false)}>
          <div className="header-menu-modal" onClick={(event) => event.stopPropagation()}>
            <p className="header-menu-email">{currentUser?.email}</p>
            {isRoomCreator && (
              <button className="header-menu-btn" onClick={openCreateRoomScreen}>
                Create Room
              </button>
            )}
            <button className="header-menu-btn danger" onClick={() => void handleSignout()}>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
