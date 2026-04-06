import type { CSSProperties, JSX } from 'react';
import type { Grade } from '../types/quiz';

interface ResultScreenProps {
  grade: Grade;
  gradeColor: string;
  onContinueToPortal: () => void;
  onRetakeQuiz: () => void;
  percentage: number;
  score: number;
  totalQuestions: number;
}

type ResultStyle = CSSProperties & {
  '--grade-color': string;
  '--pct': string;
};

export function ResultScreen({
  grade,
  gradeColor,
  onContinueToPortal,
  onRetakeQuiz,
  percentage,
  score,
  totalQuestions,
}: ResultScreenProps): JSX.Element {
  const style: ResultStyle = {
    '--grade-color': gradeColor,
    '--pct': `${percentage}%`,
  };

  return (
    <div className="result-container" style={style}>
      <div className="result-ring">
        <div className="result-grade">{grade}</div>
        <div className="result-pct">{percentage}%</div>
      </div>

      <h2 className="result-title">Quiz Complete!</h2>
      <p className="result-sub">
        {percentage >= 80
          ? 'Outstanding performance!'
          : percentage >= 60
            ? 'Solid effort! Keep it up'
            : "Keep practicing, you'll get there"}
      </p>

      <div className="result-stats">
        <div className="stat-box">
          <div className="stat-num correct">{score}</div>
          <div className="stat-label">Correct</div>
        </div>
        <div className="stat-box">
          <div className="stat-num wrong">{totalQuestions - score}</div>
          <div className="stat-label">Wrong</div>
        </div>
        <div className="stat-box">
          <div className="stat-num score">{percentage}%</div>
          <div className="stat-label">Score</div>
        </div>
      </div>

      <div className="result-actions">
        <button className="retry-btn secondary" onClick={onRetakeQuiz}>
          Retake Quiz
        </button>
        <button className="retry-btn primary" onClick={onContinueToPortal}>
          Continue to Portal
        </button>
      </div>
    </div>
  );
}
