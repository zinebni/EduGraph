import HistoryList from '@/components/HistoryList';

export default function HistoryPage() {
  return (
    <div className="container animate-slide-up">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px' }} className="gradient-text">
            Generation Log & History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Browse through previously structured curricula, review lessons, and test yourself on past generation quizzes.
          </p>
        </div>

        <HistoryList />
      </div>
    </div>
  );
}
