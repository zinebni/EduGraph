'use client';

import { useState } from 'react';

export default function QuizCard({ quiz }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // 'A', 'B', 'C', 'D' or null
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  const questions = quiz?.questions || [];

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionClick = (optionChar) => {
    if (hasAnswered) return;
    
    setSelectedOption(optionChar);
    setHasAnswered(true);

    if (optionChar === currentQuestion.correct_answer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setHasAnswered(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setQuizComplete(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setQuizComplete(false);
    setHasAnswered(false);
  };

  // Helper to extract option label (A, B, C, D) from option string "A) ..."
  const getOptionLetter = (optionStr) => {
    if (optionStr.startsWith('A')) return 'A';
    if (optionStr.startsWith('B')) return 'B';
    if (optionStr.startsWith('C')) return 'C';
    if (optionStr.startsWith('D')) return 'D';
    return optionStr[0]; // fallback
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--border-glass)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      marginTop: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📝 MCQ Knowledge Check
        </h4>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {quizComplete ? 'Completed' : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
        </span>
      </div>

      {!quizComplete ? (
        <div>
          {/* Question Text */}
          <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500', marginBottom: '20px' }}>
            {currentQuestion.question}
          </p>

          {/* Options Grid */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {currentQuestion.options.map((option, idx) => {
              const letter = getOptionLetter(option);
              const isSelected = selectedOption === letter;
              const isCorrect = letter === currentQuestion.correct_answer;
              
              let optionClass = '';
              if (hasAnswered) {
                if (isCorrect) optionClass = 'correct';
                else if (isSelected) optionClass = 'incorrect';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  className={`option-btn ${optionClass}`}
                  onClick={() => handleOptionClick(letter)}
                  disabled={hasAnswered}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {hasAnswered && (
            <div 
              className="animate-fade-in"
              style={{
                background: selectedOption === currentQuestion.correct_answer 
                  ? 'rgba(16, 185, 129, 0.08)' 
                  : 'rgba(239, 68, 68, 0.08)',
                border: selectedOption === currentQuestion.correct_answer
                  ? '1px solid rgba(16, 185, 129, 0.2)'
                  : '1px solid rgba(239, 68, 68, 0.2)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginTop: '16px',
                marginBottom: '20px'
              }}
            >
              <p style={{
                color: selectedOption === currentQuestion.correct_answer ? 'var(--accent-success)' : 'var(--accent-error)',
                fontWeight: '600',
                fontSize: '13px',
                marginBottom: '4px'
              }}>
                {selectedOption === currentQuestion.correct_answer ? '✓ Correct Answer!' : '✗ Incorrect'}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Bottom Action Button */}
          {hasAnswered && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextQuestion}
              style={{ width: '100%' }}
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'Finish Quiz'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 0' }} className="animate-fade-in">
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🏆</span>
          <h5 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Quiz Complete!</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            You scored <strong style={{ color: 'var(--accent-success)' }}>{score}</strong> out of <strong>{questions.length}</strong> questions correctly.
          </p>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetQuiz}
            style={{ width: '100%' }}
          >
            Restart Quiz
          </button>
        </div>
      )}
    </div>
  );
}
