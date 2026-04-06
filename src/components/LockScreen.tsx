import type { JSX, RefObject } from 'react';

interface LockScreenProps {
  codeError: boolean;
  codeInput: string;
  codeErrorMessage: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChangeCode: (value: string) => void;
  onSubmit: () => void;
  shaking: boolean;
  isJoiningRoom: boolean;
}

export function LockScreen({
  codeError,
  codeInput,
  codeErrorMessage,
  inputRef,
  onChangeCode,
  onSubmit,
  shaking,
  isJoiningRoom,
}: LockScreenProps): JSX.Element {
  return (
    <div className="lock-container">
      <div className="lock-badge">🔐</div>
      <p className="lock-title">Access Required</p>
      <h1 className="lock-heading">Quiz Arena</h1>
      <p className="lock-sub">100 Questions · Enter code to begin</p>

      <div className="lock-card">
        <span className="lock-label">Secret Access Code</span>
        <div className={`lock-input-wrap ${shaking ? 'shake' : ''}`}>
          <input
            ref={inputRef}
            className={`lock-input ${codeError ? 'error' : ''}`}
            placeholder="· · · · · · · ·"
            value={codeInput}
            onChange={(event) => onChangeCode(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
            maxLength={12}
            autoFocus
          />
        </div>
        <p className={`error-msg ${codeError ? 'show' : ''}`}>⚠ {codeErrorMessage}</p>
        <button className="lock-btn" onClick={onSubmit} disabled={isJoiningRoom}>
          {isJoiningRoom ? 'Joining...' : 'Enter Portal'}
        </button>
      </div>
      <p className="lock-hint">[ system secured · authorized access only ]</p>
    </div>
  );
}
