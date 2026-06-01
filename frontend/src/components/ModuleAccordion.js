'use client';

import { useState } from 'react';
import QuizCard from '@/components/QuizCard';
import ExerciseCard from '@/components/ExerciseCard';

export default function ModuleAccordion({ modules }) {
  const [openModuleId, setOpenModuleId] = useState(null);

  const toggleModule = (id) => {
    setOpenModuleId(openModuleId === id ? null : id);
  };

  if (!modules || modules.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
        No modules or study materials generated yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {modules.map((mod) => {
        const isOpen = openModuleId === mod.module_id;

        return (
          <div 
            key={mod.module_id} 
            className={`accordion-item ${isOpen ? 'open' : ''}`}
          >
            <div 
              className="accordion-header"
              onClick={() => toggleModule(mod.module_id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="badge badge-modernize" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  {mod.module_id}
                </span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>
                  {mod.module_title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {mod.estimated_hours || mod.quiz?.questions?.length * 10 || 50} mins
                </span>
                <span style={{ 
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform var(--transition-fast)',
                  color: 'var(--text-muted)'
                }}>
                  ▼
                </span>
              </div>
            </div>

            {isOpen && (
              <div className="accordion-body animate-fade-in">
                {/* Description & Learning Objectives */}
                {mod.module_description && (
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                      Overview
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {mod.module_description}
                    </p>
                  </div>
                )}

                {/* Interactive Quiz Section */}
                {mod.quiz && (
                  <div style={{ 
                    marginTop: '28px',
                    borderTop: '1px solid var(--border-glass)',
                    paddingTop: '24px'
                  }}>
                    <QuizCard quiz={mod.quiz} />
                  </div>
                )}

                {/* Practical Exercises Section */}
                {mod.exercises && mod.exercises.length > 0 && (
                  <div style={{ 
                    marginTop: '28px',
                    borderTop: '1px solid var(--border-glass)',
                    paddingTop: '24px'
                  }}>
                    <h4 style={{ 
                      fontSize: '15px', 
                      fontWeight: '600', 
                      marginBottom: '16px',
                      color: 'var(--accent-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      🛠️ Hands-on Practice & Challenges
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {mod.exercises.map((exercise, index) => (
                        <ExerciseCard key={index} exercise={exercise} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
