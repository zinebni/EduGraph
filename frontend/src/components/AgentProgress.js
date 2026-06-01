'use client';

export default function AgentProgress({ mode, activeAgent, completedAgents }) {
  const allSteps = [
    {
      id: 'syllabus_reader_agent',
      name: 'Syllabus Reader Agent',
      desc: 'Parses existing JSON syllabus structures and identifies outdated items.',
      emoji: '📄',
      hideInMode: 'generate'
    },
    {
      id: 'search_agent',
      name: 'Trend Analyst Search Agent',
      desc: 'Researches current industry trends, skill demands, and modern tools via web search.',
      emoji: '🔍'
    },
    {
      id: 'curriculum_writer_agent',
      name: 'Lead Curriculum Architect',
      desc: 'Writes comprehensive curriculum structures, objectives, and detailed lesson guides.',
      emoji: '✍️'
    },
    {
      id: 'quiz_exercise_agent',
      name: 'Assessment Specialist',
      desc: 'Generates interactive multiple-choice quizzes and hands-on coding challenges.',
      emoji: '📝'
    }
  ];

  // Filter steps based on current mode
  const steps = allSteps.filter(step => !step.hideInMode || step.hideInMode !== mode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {steps.map((step, index) => {
        const isCompleted = completedAgents.includes(step.id);
        const isActive = activeAgent === step.id;
        const isWaiting = !isCompleted && !isActive;

        return (
          <div 
            key={step.id} 
            style={{
              display: 'flex',
              gap: '20px',
              position: 'relative',
              opacity: isWaiting ? 0.4 : 1,
              transition: 'opacity var(--transition-normal)'
            }}
          >
            {/* Connection Line */}
            {index < steps.length - 1 && (
              <div 
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '40px',
                  bottom: '-20px',
                  width: '2px',
                  background: isCompleted ? 'var(--accent-success)' : 'var(--border-glass)',
                  transition: 'background var(--transition-normal)'
                }}
              />
            )}

            {/* Step Icon Indicator */}
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: isCompleted 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : isActive 
                    ? 'rgba(99, 102, 241, 0.2)' 
                    : 'rgba(255, 255, 255, 0.03)',
                border: isCompleted 
                  ? '2px solid var(--accent-success)' 
                  : isActive 
                    ? '2px solid var(--accent-primary)' 
                    : '1px solid var(--border-glass)',
                color: isCompleted 
                  ? 'var(--accent-success)' 
                  : isActive 
                    ? 'var(--accent-primary)' 
                    : 'var(--text-muted)',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                position: 'relative',
                animation: isActive ? 'pulse-border 2s infinite ease-in-out' : 'none'
              }}
            >
              {isCompleted ? '✓' : step.emoji}
            </div>

            {/* Step Text Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontFamily: 'var(--font-heading)',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)'
                }}>
                  {step.name}
                </h4>
                {isActive && (
                  <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 8px', animation: 'blink 1.5s infinite' }}>
                    Active
                  </span>
                )}
                {isCompleted && (
                  <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    Done
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '550px' }}>
                {step.desc}
              </p>
            </div>

            <style>{`
              @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
              @keyframes pulse-border {
                0%, 100% { border-color: var(--accent-primary); }
                50% { border-color: var(--accent-secondary); }
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
}
