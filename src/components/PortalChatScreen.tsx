import { useRef, useState, type ChangeEvent, type JSX, type RefObject } from 'react';
import type { ChatMessage, ScrollContainerRef } from '../types/quiz';

interface PortalChatScreenProps {
  chatInput: string;
  chatRef: ScrollContainerRef;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSendingMessage: boolean;
  messages: ChatMessage[];
  currentUserEmail: string | null;
  selectedMessageIds: string[];
  selectionMode: boolean;
  otherMemberEmail: string | null;
  otherMemberOnline: boolean;
  otherMemberTyping: boolean;
  onlineCount: number;
  roomName: string | null;
  onAttachClick: () => void;
  onBackToLock: () => void;
  onChatInputChange: (value: string) => void;
  onDownloadAttachment: (messageId: string) => void;
  onForwardMessage: (messageId: string) => void;
  onHeaderLogoClick: () => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteSelectedMessages: () => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onRemoveSelectedImage: () => void;
  onToggleMessageSelection: (messageId: string) => void;
  onToggleSelectionMode: () => void;
  onSendGif: () => void;
  onSendMessage: () => void;
  selectedImage: string | null;
}

export function PortalChatScreen({
  chatInput,
  chatRef,
  fileInputRef,
  isSendingMessage,
  messages,
  currentUserEmail,
  selectedMessageIds,
  selectionMode,
  otherMemberEmail,
  otherMemberOnline,
  otherMemberTyping,
  onlineCount,
  roomName,
  onAttachClick,
  onBackToLock,
  onChatInputChange,
  onDownloadAttachment,
  onForwardMessage,
  onHeaderLogoClick,
  onImageChange,
  onDeleteMessage,
  onDeleteSelectedMessages,
  onReactMessage,
  onRemoveSelectedImage,
  onToggleMessageSelection,
  onToggleSelectionMode,
  onSendGif,
  onSendMessage,
  selectedImage,
}: PortalChatScreenProps): JSX.Element {
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const openMenuAt = (messageId: string, anchorRect: DOMRect): void => {
    const menuWidth = 150;
    const menuHeight = 220;
    const padding = 10;

    const preferRight = anchorRect.left + anchorRect.width / 2 < window.innerWidth / 2;
    let left = preferRight ? anchorRect.right + 8 : anchorRect.left - menuWidth - 8;
    let top = anchorRect.top + 8;

    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding;
    }
    if (top < padding) {
      top = padding;
    }

    setMenuMessageId(messageId);
    setMenuPosition({ top, left });
  };

  const startLongPress = (messageId: string, target: HTMLElement): void => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      openMenuAt(messageId, target.getBoundingClientRect());
    }, 450);
  };

  const cancelLongPress = (): void => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const closeMenu = (): void => {
    setMenuMessageId(null);
    setMenuPosition(null);
  };

  const isOwnMessage = (message: ChatMessage): boolean => {
    if (message.senderEmail && currentUserEmail) {
      return message.senderEmail.toLowerCase() === currentUserEmail.toLowerCase();
    }
    return message.type === 'user';
  };

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-header-left">
          <button className="header-logo-btn" onClick={onHeaderLogoClick}>
            <div className="quiz-avatar">🛡️</div>
          </button>
          <div>
            <div className="quiz-name">{roomName ? `Room: ${roomName}` : 'Secure Portal'}</div>
            <div className="quiz-status">
              ● {otherMemberEmail ? `${otherMemberOnline ? 'ONLINE' : 'OFFLINE'} · ${otherMemberEmail}` : `${onlineCount} ONLINE`} · ENCRYPTED CHANNEL
            </div>
            {otherMemberTyping && <div className="quiz-status">typing...</div>}
          </div>
        </div>
        <button className="exit-btn" onClick={onBackToLock}>
          LOCK
        </button>
      </div>

      <div className="chat-area" ref={chatRef} onClick={closeMenu}>
        {messages.map((message) => (
          <div key={message.id} className={`msg ${isOwnMessage(message) ? 'user' : 'bot'} ${selectedMessageIds.includes(message.id) ? 'selected' : ''}`}>
            <div className="msg-row">
              {selectionMode && (
                <input
                  type="checkbox"
                  className="msg-select-checkbox"
                  checked={selectedMessageIds.includes(message.id)}
                  onChange={() => onToggleMessageSelection(message.id)}
                  onClick={(event) => event.stopPropagation()}
                />
              )}

              <div
                className="msg-bubble"
                onMouseDown={(event) => startLongPress(message.id, event.currentTarget)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={(event) => startLongPress(message.id, event.currentTarget)}
                onTouchEnd={cancelLongPress}
              >
                <button
                  className="msg-more-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (menuMessageId === message.id) {
                      closeMenu();
                      return;
                    }
                    openMenuAt(message.id, event.currentTarget.getBoundingClientRect());
                  }}
                >
                  ⋯
                </button>

                {message.image && <img src={message.image} alt="upload" className="msg-image" />}
                {message.gifUrl && <img src={message.gifUrl} alt="gif" className="msg-image" />}
                {message.text}
                {message.attachment && (
                  <button
                    className="attachment-btn"
                    disabled={!message.attachment.hasData}
                    onClick={() => onDownloadAttachment(message.id)}
                  >
                    {message.attachment.hasData
                      ? `Download ${message.attachment.fileName ?? 'attachment'}`
                      : 'Attachment expired'}
                  </button>
                )}

                {menuMessageId === message.id && (
                  <div
                    className="message-menu"
                    style={menuPosition ? { top: menuPosition.top, left: menuPosition.left } : undefined}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button onClick={() => { onReactMessage(message.id, '👍'); closeMenu(); }}>👍</button>
                    <button onClick={() => { onReactMessage(message.id, '❤️'); closeMenu(); }}>❤️</button>
                    <button onClick={() => { onReactMessage(message.id, '😂'); closeMenu(); }}>😂</button>
                    <button onClick={() => { onForwardMessage(message.id); closeMenu(); }}>Forward</button>
                    <button onClick={() => { onDeleteMessage(message.id); closeMenu(); }}>Delete</button>
                    <button onClick={() => { onToggleMessageSelection(message.id); closeMenu(); }}>
                      {selectedMessageIds.includes(message.id) ? 'Unselect' : 'Select'}
                    </button>
                  </div>
                )}

                {message.reactions && message.reactions.length > 0 && (
                  <div className="msg-reactions">
                    {message.reactions.map((item, index) => (
                      <span key={`${message.id}-reaction-${index}`}>{item.emoji}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-bar">
        <div className="selection-toolbar">
          <button className="attach-btn" onClick={onToggleSelectionMode}>
            {selectionMode ? 'Cancel Select' : 'Select'}
          </button>
          {selectionMode && (
            <button className="attach-btn" onClick={onDeleteSelectedMessages}>
              Delete Selected ({selectedMessageIds.length})
            </button>
          )}
        </div>
        {selectedImage && (
          <div className="image-preview">
            <img src={selectedImage} alt="preview" />
            <button className="remove-img" onClick={onRemoveSelectedImage}>
              x
            </button>
          </div>
        )}

        <div className="input-row">
          <input
            className="chat-msg-input"
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSendMessage()}
            placeholder="Type a secure message..."
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            style={{ display: 'none' }}
            onChange={onImageChange}
          />

          <button className="attach-btn" onClick={onAttachClick}>
            +
          </button>
          <button className="attach-btn" onClick={onSendGif}>
            GIF
          </button>
          <button className="send-btn" onClick={onSendMessage}>
            {isSendingMessage ? '...' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}
