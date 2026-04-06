import { useState, type JSX } from 'react';
import { createRoom } from '../services/chatRoomApi';

interface CreateRoomScreenProps {
  authToken: string;
  onBack: () => void;
}

export function CreateRoomScreen({ authToken, onBack }: CreateRoomScreenProps): JSX.Element {
  const [roomName, setRoomName] = useState('');
  const [emailOne, setEmailOne] = useState('');
  const [emailTwo, setEmailTwo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');

  const submit = async (): Promise<void> => {
    setErrorMessage('');
    setSuccessMessage('');
    setCreatedRoomCode('');

    if (!roomName.trim()) {
      setErrorMessage('Room name is required.');
      return;
    }

    if (!emailOne.trim() || !emailTwo.trim()) {
      setErrorMessage('Both member emails are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createRoom(authToken, roomName, emailOne, emailTwo);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setCreatedRoomCode(result.roomCode);
      setSuccessMessage(result.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <p className="lock-title">Admin Tools</p>
      <h1 className="lock-heading">Create Chat Room</h1>
      <p className="lock-sub">Create one-on-one room by member emails</p>

      <div className="auth-card">
        <label className="lock-label">Room Name</label>
        <input
          className="auth-input"
          type="text"
          value={roomName}
          onChange={(event) => setRoomName(event.target.value)}
          placeholder="alpha-room"
        />

        <label className="lock-label">Member Email 1</label>
        <input
          className="auth-input"
          type="email"
          value={emailOne}
          onChange={(event) => setEmailOne(event.target.value)}
          placeholder="member1@example.com"
        />

        <label className="lock-label">Member Email 2</label>
        <input
          className="auth-input"
          type="email"
          value={emailTwo}
          onChange={(event) => setEmailTwo(event.target.value)}
          placeholder="member2@example.com"
        />

        {errorMessage && <p className="auth-msg auth-msg-error">{errorMessage}</p>}
        {successMessage && <p className="auth-msg auth-msg-success">{successMessage}</p>}

        {createdRoomCode && (
          <p className="auth-msg auth-msg-success">
            Room code: <strong>{createdRoomCode}</strong>
          </p>
        )}

        <button className="lock-btn" onClick={() => void submit()} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Room'}
        </button>

        <button className="auth-link-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
