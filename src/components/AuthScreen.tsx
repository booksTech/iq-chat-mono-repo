import { useEffect, useState, type JSX } from 'react';
import { forgotPassword, resetPassword, signin, signup, type AuthUser } from '../services/authApi';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

interface AuthScreenProps {
  onAuthenticated: (payload: { token: string; user: AuthUser }) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps): JSX.Element {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const resetMessages = (): void => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetFields = (): void => {
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (nextMode: AuthMode): void => {
    setMode(nextMode);
    resetMessages();
    resetFields();
    if (nextMode !== 'reset') {
      setResetToken('');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token') ?? params.get('resetToken');
    if (!tokenFromUrl) {
      return;
    }

    setResetToken(tokenFromUrl);
    setMode('reset');
    resetMessages();
    resetFields();
  }, []);

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const submit = async (): Promise<void> => {
    resetMessages();

    if (mode !== 'reset' && !validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (mode !== 'forgot' && password.trim().length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Confirm password does not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'reset') {
        if (!resetToken.trim()) {
          setErrorMessage('Reset token is missing.');
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage('Confirm password does not match.');
          return;
        }

        const result = await resetPassword(resetToken, password, confirmPassword);
        if (!result.ok) {
          setErrorMessage(result.message);
          return;
        }

        setSuccessMessage(result.message);
        setMode('signin');
        setResetToken('');
        setPassword('');
        setConfirmPassword('');

        const params = new URLSearchParams(window.location.search);
        if (params.has('token') || params.has('resetToken')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return;
      }

      if (mode === 'signin') {
        const result = await signin(email, password);
        if (!result.ok) {
          setErrorMessage(result.message);
          return;
        }

        onAuthenticated({ token: result.token, user: result.user });
        return;
      }

      if (mode === 'signup') {
        const result = await signup(email, password, confirmPassword);
        if (!result.ok) {
          setErrorMessage(result.message);
          return;
        }

        onAuthenticated({ token: result.token, user: result.user });
        return;
      }

      const result = await forgotPassword(email);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setSuccessMessage(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error occurred';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <p className="lock-title">Secure Authentication</p>
      <h1 className="lock-heading">Welcome Back</h1>
      <p className="lock-sub">
        {mode === 'signin'
          ? 'Sign in to continue'
          : mode === 'signup'
            ? 'Create your account'
            : mode === 'forgot'
              ? 'Recover your password'
              : 'Set your new password'}
      </p>

      <div className="auth-card">
        {mode !== 'reset' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => switchMode('signin')}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              Sign Up
            </button>
          </div>
        )}

        {mode !== 'reset' && (
          <>
            <label className="lock-label">Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </>
        )}

        {mode !== 'forgot' && (
          <>
            <label className="lock-label">Password</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </>
        )}

        {(mode === 'signup' || mode === 'reset') && (
          <>
            <label className="lock-label">Confirm Password</label>
            <input
              className="auth-input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter password"
            />
          </>
        )}

        {errorMessage && <p className="auth-msg auth-msg-error">{errorMessage}</p>}
        {successMessage && <p className="auth-msg auth-msg-success">{successMessage}</p>}

        <button className="lock-btn" onClick={submit} disabled={isSubmitting}>
          {isSubmitting
            ? 'Please wait...'
            : mode === 'signin'
              ? 'Sign In'
              : mode === 'signup'
                ? 'Create Account'
                : mode === 'forgot'
                  ? 'Send Reset Link'
                  : 'Reset Password'}
        </button>

        {mode === 'signin' && (
          <button className="auth-link-btn" onClick={() => switchMode('forgot')}>
            Forgot Password?
          </button>
        )}

        {mode === 'forgot' && (
          <button className="auth-link-btn" onClick={() => switchMode('signin')}>
            Back to Sign In
          </button>
        )}

        {mode === 'reset' && (
          <button className="auth-link-btn" onClick={() => switchMode('signin')}>
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
}
