'use client';

import { useState, useEffect } from 'react';
import { getHistory, deleteGeneration } from '@/lib/api';

export default function HistoryList({ onSelect }) {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory();
      setGenerations(data);
    } catch (err) {
      alert('Failed to retrieve generation history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent card click select trigger
    
    if (!confirm('Are you sure you want to delete this curriculum from history? This cannot be undone.')) {
      return;
    }

    try {
      await deleteGeneration(id);
      setGenerations((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert('Failed to delete generation: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        Loading past generations...
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📚</span>
        <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>No Curricula Logged Yet</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Create your very first AI course outline on the Generate tab!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {generations.map((item) => {
        const isModernize = item.mode === 'modernize';
        const isComplete = item.status === 'complete';
        const isError = item.status === 'error';

        return (
          <div 
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              padding: '24px 32px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-lg)',
              transition: 'all var(--transition-fast)'
            }}
            className="history-list-card"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge ${isModernize ? 'badge-modernize' : 'badge-generate'}`} style={{ fontSize: '10px' }}>
                  {isModernize ? 'Modernize' : 'Generate'}
                </span>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: isComplete ? 'var(--accent-success)' : isError ? 'var(--accent-error)' : 'var(--accent-warning)',
                  display: 'inline-block' 
                }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {item.status}
                </span>
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {item.title}
              </h4>

              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Created: {new Date(item.created_at).toLocaleString()}
              </span>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={(e) => handleDelete(e, item.id)}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5'
              }}
            >
              🗑️ Delete
            </button>

            <style>{`
              .history-list-card:hover {
                background: rgba(255, 255, 255, 0.04) !important;
                border-color: rgba(99, 102, 241, 0.3) !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
}
