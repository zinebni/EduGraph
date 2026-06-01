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

  const getModuleKey = (mod, index) => mod.module_id || `module-${index}`;
  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) return [value];
    return [];
  };
  const formatDuration = (mod) => {
    if (mod.estimated_hours) return `${mod.estimated_hours}h`;
    if (mod.estimated_time) return `${mod.estimated_time}m`;
    if (mod.quiz?.questions?.length) return `${mod.quiz.questions.length * 10}m`;
    return '50m';
  };

  const SectionTitle = ({ children }) => (
    <p style={{
      color: 'var(--text-primary)',
      fontSize: '13px',
      marginBottom: '10px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }}>
      {children}
    </p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {modules.map((mod, index) => {
        const moduleKey = getModuleKey(mod, index);
        const isOpen = openModuleId === moduleKey;
        const lessons = asArray(mod.lessons || mod.lesson_breakdown);
        const objectives = asArray(mod.learning_objectives || mod.objectives);
        const tools = asArray(mod.tools || mod.recommended_tools || mod.technologies);
        const resources = asArray(mod.resources || mod.suggested_resources);

        return (
          <div 
            key={moduleKey} 
            className={`accordion-item ${isOpen ? 'open' : ''}`}
          >
            <div 
              className="accordion-header"
              onClick={() => toggleModule(moduleKey)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="badge badge-modernize" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  {mod.module_id || `MOD_${String(index + 1).padStart(2, '0')}`}
                </span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>
                  {mod.module_title || `Module ${index + 1}`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatDuration(mod)}
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
                {mod.module_description && (
                  <div style={{ marginBottom: '24px' }}>
                    <SectionTitle>Module Content</SectionTitle>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.7' }}>
                      {mod.module_description}
                    </p>
                  </div>
                )}

                {objectives.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <SectionTitle>Learning Objectives</SectionTitle>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '18px' }}>
                      {objectives.map((objective, objectiveIndex) => (
                        <li key={objectiveIndex} style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {lessons.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <SectionTitle>Lessons</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lessonIndex}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '14px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                            <h5 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>
                              {lesson.title || `Lesson ${lessonIndex + 1}`}
                            </h5>
                            {lesson.estimated_hours && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                {lesson.estimated_hours}h
                              </span>
                            )}
                          </div>
                          {asArray(lesson.topics).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {asArray(lesson.topics).map((topic, topicIndex) => (
                                <span
                                  key={topicIndex}
                                  className="badge badge-generate"
                                  style={{ fontSize: '10px' }}
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(tools.length > 0 || resources.length > 0) && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    {tools.length > 0 && (
                      <div>
                        <SectionTitle>Tools</SectionTitle>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {tools.map((tool, toolIndex) => (
                            <span key={toolIndex} className="badge badge-generate" style={{ fontSize: '10px' }}>
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {resources.length > 0 && (
                      <div>
                        <SectionTitle>Resources</SectionTitle>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '18px' }}>
                          {resources.map((resource, resourceIndex) => (
                            <li key={resourceIndex} style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                              {resource}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {mod.quiz && (
                  <div style={{ 
                    marginTop: '28px',
                    borderTop: '1px solid var(--border-glass)',
                    paddingTop: '24px'
                  }}>
                    <QuizCard quiz={mod.quiz} />
                  </div>
                )}

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
