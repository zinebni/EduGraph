'use client';

import { useState } from 'react';
import HistoryList from '@/components/HistoryList';
import ModuleAccordion from '@/components/ModuleAccordion';
import { getGeneration } from '@/lib/api';

export default function HistoryPage() {
  const [selectedGen, setSelectedGen] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleSelectGeneration = async (id) => {
    setLoadingDetails(true);
    try {
      const data = await getGeneration(id);
      
      // Parse JSON fields if they are strings from DB
      let quizzes = data.quizzes_data;
      if (typeof quizzes === 'string' && quizzes) {
        try {
          quizzes = json.loads(quizzes);
        } catch (e) {
          try {
            quizzes = JSON.parse(quizzes);
          } catch(err){}
        }
      }

      setSelectedGen({
        ...data,
        quizzes_data: quizzes
      });
    } catch (error) {
      alert('Failed to load generation details: ' + error.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToList = () => {
    setSelectedGen(null);
  };

  return (
    <div className="container animate-slide-up">
      {selectedGen ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px' }}>
            <div>
              <span className={`badge ${selectedGen.mode === 'modernize' ? 'badge-modernize' : 'badge-generate'}`} style={{ marginBottom: '8px' }}>
                {selectedGen.mode === 'modernize' ? 'Modernize Mode' : 'Generate Mode'}
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: '700' }}>{selectedGen.title}</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Generated on {new Date(selectedGen.created_at).toLocaleString()}
              </span>
            </div>
            <button className="btn btn-secondary" onClick={handleBackToList}>
              ← Back to History
            </button>
          </div>

          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '8px', fontSize: '22px', color: 'var(--text-primary)' }}>
                📖 Modules, Lessons, Quizzes & Exercises
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Each module is divided into learning content, lesson topics, a knowledge check, and hands-on practice.
              </p>
            </div>
            <ModuleAccordion modules={selectedGen.quizzes_data?.modules || []} />
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px' }} className="gradient-text">
              Generation Log & History
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Browse through previously structured curricula, review lessons, and test yourself on past generation quizzes.
            </p>
          </div>

          <HistoryList onSelect={handleSelectGeneration} />
        </div>
      )}
    </div>
  );
}
