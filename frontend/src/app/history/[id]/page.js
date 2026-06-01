'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ModuleAccordion from '@/components/ModuleAccordion';
import { getGeneration } from '@/lib/api';

export default function GenerationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [generation, setGeneration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadGeneration() {
      setLoading(true);
      setError('');

      try {
        const data = await getGeneration(params.id);
        let quizzes = data.quizzes_data;

        if (typeof quizzes === 'string' && quizzes) {
          try {
            quizzes = JSON.parse(quizzes);
          } catch (err) {
            quizzes = {};
          }
        }

        setGeneration({
          ...data,
          quizzes_data: quizzes || {}
        });
      } catch (err) {
        setError(err.message || 'Failed to load generation details.');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadGeneration();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="container animate-fade-in">
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading generation details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '640px' }}>
        <div className="glass-card" style={{ textAlign: 'center', borderColor: 'var(--accent-error)' }}>
          <h2 style={{ color: 'var(--accent-error)', marginBottom: '12px' }}>Generation Not Available</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => router.push('/history')}>
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-slide-up">
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', gap: '20px' }}>
          <div>
            <span className={`badge ${generation.mode === 'modernize' ? 'badge-modernize' : 'badge-generate'}`} style={{ marginBottom: '8px' }}>
              {generation.mode === 'modernize' ? 'Modernize Mode' : 'Generate Mode'}
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: '700' }}>{generation.title}</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Generated on {new Date(generation.created_at).toLocaleString()}
            </span>
          </div>
          <button className="btn btn-secondary" onClick={() => router.push('/history')}>
            Back to History
          </button>
        </div>

        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '22px', color: 'var(--text-primary)' }}>
              Modules, Lessons, Quizzes & Exercises
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Each module is divided into learning content, lesson topics, a knowledge check, and hands-on practice.
            </p>
          </div>
          <ModuleAccordion modules={generation.quizzes_data?.modules || []} />
        </div>
      </div>
    </div>
  );
}
