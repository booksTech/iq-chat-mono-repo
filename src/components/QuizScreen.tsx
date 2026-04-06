import type { JSX } from 'react';
import { OPTION_LABELS } from '../constants/quizData';
import type { Question, QuizMessage, ScrollContainerRef } from '../types/quiz';

interface QuizScreenProps {
  answerConfirmed: boolean;
  canConfirm: boolean;
  chatRef: ScrollContainerRef;
  currentQuestion: Question;
  currentQuestionIndex: number;
  messages: QuizMessage[];
  onChangeOtherAnswer: (value: string) => void;
  onConfirmAnswer: () => void;
  onHeaderLogoClick: () => void;
  onSelectAnswer: (index: number) => void;
  otherAnswerText: string;
  otherOptionIndex: number;
  selectedOptionIndex: number | null;
  showOptions: boolean;
  totalQuestions: number;
}

export function QuizScreen({
  answerConfirmed,
  canConfirm,
  chatRef,
  currentQuestion,
  currentQuestionIndex,
  messages,
  onChangeOtherAnswer,
  onConfirmAnswer,
  onHeaderLogoClick,
  onSelectAnswer,
  otherAnswerText,
  otherOptionIndex,
  selectedOptionIndex,
  showOptions,
  totalQuestions,
}: QuizScreenProps): JSX.Element {
  const renderedOptions = [...currentQuestion.options, 'Other'];
  const isOtherSelected = selectedOptionIndex === otherOptionIndex;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-header-left">
          <button className="header-logo-btn" onClick={onHeaderLogoClick}>
            <div className="quiz-avatar">🤖</div>
          </button>
          <div>
            <div className="quiz-name">Nova Quiz AI</div>
            <div className="quiz-status">● LIVE SESSION</div>
          </div>
        </div>

        <div className="quiz-progress-wrap">
          <span className="quiz-progress-label">
            {currentQuestionIndex + 1} / {totalQuestions}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="chat-area" ref={chatRef}>
        {messages.map((message) => (
          <div key={message.id} className={`msg ${message.type}`}>
            <div
              className={`msg-bubble ${
                message.correct === true ? 'correct' : message.correct === false ? 'wrong' : ''
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {showOptions && !answerConfirmed && (
          <div className="question-card">
            <div className="question-text">{currentQuestion.question}</div>
            <div className="options-grid">
              {renderedOptions.map((option, index) => (
                <button
                  key={`${currentQuestion.id}-${index}`}
                  className={`option-btn ${selectedOptionIndex === index ? 'selected' : ''} ${
                    answerConfirmed ? 'disabled' : ''
                  }`}
                  onClick={() => onSelectAnswer(index)}
                >
                  <span className="option-label">{OPTION_LABELS[index]}</span>
                  {option}
                </button>
              ))}
            </div>
            {isOtherSelected && (
              <input
                className="other-answer-input"
                value={otherAnswerText}
                onChange={(event) => onChangeOtherAnswer(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && canConfirm && onConfirmAnswer()}
                placeholder="Type your answer (or secret code)..."
                autoFocus
              />
            )}
          </div>
        )}
      </div>

      <div className="confirm-bar">
        <button
          className="confirm-btn"
          onClick={onConfirmAnswer}
          disabled={!canConfirm}
        >
          {answerConfirmed
            ? 'Loading next...'
            : selectedOptionIndex !== null
              ? 'Confirm Answer ->'
              : 'Select an option'}
        </button>
      </div>
    </div>
  );
}
