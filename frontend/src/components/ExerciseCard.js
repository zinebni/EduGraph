'use client';

export default function ExerciseCard({ exercise }) {
  if (!exercise) return null;

  // Determine difficulty badge colors
  const getDifficultyBadge = (difficulty) => {
    const diff = (difficulty || 'Medium').toLowerCase();
    if (diff === 'easy') return <span className="badge badge-success" style={{ fontSize: '10px' }}>Easy</span>;
    if (diff === 'hard') return <span className="badge badge-error" style={{ fontSize: '10px' }}>Hard</span>;
    return <span className="badge badge-warning" style={{ fontSize: '10px' }}>Medium</span>;
  };

  return (
    <div 
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)',
        padding: '18px',
        transition: 'all var(--transition-fast)',
        cursor: 'default'
      }}
      className="exercise-hover-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h5 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
          {exercise.title}
        </h5>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {getDifficultyBadge(exercise.difficulty)}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ⏱️ {exercise.estimated_time || 45}m
          </span>
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px', lineHeight: '1.6' }}>
        {exercise.description}
      </p>

      {exercise.expected_deliverable && (
        <div style={{
          background: 'rgba(0,0,0,0.15)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          borderLeft: '2px solid var(--accent-tertiary)'
        }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Expected Deliverable
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {exercise.expected_deliverable}
          </span>
        </div>
      )}

      <style>{`
        .exercise-hover-card:hover {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: rgba(139, 92, 246, 0.3) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
