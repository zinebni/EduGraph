'use client';

import { useState, useEffect, useRef } from 'react';
import SyllabusUploader from '@/components/SyllabusUploader';
import AgentProgress from '@/components/AgentProgress';
import ModuleAccordion from '@/components/ModuleAccordion';
import { connectAndGenerate } from '@/lib/api';

export default function GeneratePage() {
  const [status, setStatus] = useState('idle'); // idle, processing, complete, error
  const [errorMessage, setErrorMessage] = useState('');
  const [generationMode, setGenerationMode] = useState(null); // modernize, generate
  const [activeAgent, setActiveAgent] = useState(null);
  const [completedAgents, setCompletedAgents] = useState([]);
  const [agentResults, setAgentResults] = useState({});
  const [finalResult, setFinalResult] = useState(null);
  const [generationId, setGenerationId] = useState(null);
  const wsRef = useRef(null);
  const activeAgentRef = useRef(null);

  // Auto scroll to agent progress or final report
  const progressRef = useRef(null);
  const reportRef = useRef(null);

  useEffect(() => {
    if (status === 'processing' && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (status === 'complete' && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status]);

  const handleStartGeneration = (requestData) => {
    // Reset state
    setStatus('processing');
    setGenerationMode(requestData.mode);
    setErrorMessage('');
    setActiveAgent(null);
    activeAgentRef.current = null;
    setCompletedAgents([]);
    setAgentResults({});
    setFinalResult(null);
    setGenerationId(null);

    // Establish socket connection and start generating
    const ws = connectAndGenerate(requestData, {
      onAgentStart: (agent, message) => {
        const previousAgent = activeAgentRef.current;
        activeAgentRef.current = agent;
        setActiveAgent(agent);
        setCompletedAgents((prev) => {
          if (!previousAgent || previousAgent === agent || prev.includes(previousAgent)) {
            return prev;
          }
          return [...prev, previousAgent];
        });
      },
      onAgentResult: (agent, data) => {
        setCompletedAgents((prev) => prev.includes(agent) ? prev : [...prev, agent]);
        setAgentResults((prev) => ({ ...prev, [agent]: data }));
      },
      onComplete: (data, id) => {
        setFinalResult(data);
        setGenerationId(id);
        setStatus('complete');
        setActiveAgent(null);
        activeAgentRef.current = null;
      },
      onError: (message) => {
        setErrorMessage(message);
        setStatus('error');
        setActiveAgent(null);
        activeAgentRef.current = null;
      },
      onClose: () => {
        // Safe to ignore if already complete or error
      }
    });

    wsRef.current = ws;
  };

  const handleReset = () => {
    setStatus('idle');
    setGenerationMode(null);
    setErrorMessage('');
    setActiveAgent(null);
    activeAgentRef.current = null;
    setCompletedAgents([]);
    setAgentResults({});
    setFinalResult(null);
    setGenerationId(null);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  return (
    <div className="container animate-slide-up">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '42px', fontWeight: '800', marginBottom: '12px' }} className="gradient-text">
          Generate Future-Proof Curricula
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
          Harness the power of a collaborative team of AI agents that research, design, structure, and build comprehensive educational plans.
        </p>
      </div>

      {status === 'idle' && (
        <SyllabusUploader onSubmit={handleStartGeneration} />
      )}

      {status === 'processing' && (
        <div ref={progressRef} className="glass-card animate-fade-in pulse-active" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '24px', textAlign: 'center', fontFamily: 'var(--font-heading)' }}>
            Orchestrating AI Educator Agent Team...
          </h2>
          <AgentProgress 
            mode={generationMode} 
            activeAgent={activeAgent} 
            completedAgents={completedAgents} 
          />
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <button className="btn btn-secondary" onClick={handleReset}>
              Cancel Generation
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', borderColor: 'var(--accent-error)' }}>
          <span style={{ fontSize: '48px' }}>⚠️</span>
          <h2 style={{ margin: '16px 0 8px', color: 'var(--accent-error)' }}>Generation Failed</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{errorMessage}</p>
          <button className="btn btn-primary" onClick={handleReset}>
            Try Again
          </button>
        </div>
      )}

      {status === 'complete' && finalResult && (
        <div ref={reportRef} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px' }}>
            <div>
              <span className={`badge ${generationMode === 'modernize' ? 'badge-modernize' : 'badge-generate'}`} style={{ marginBottom: '8px' }}>
                {generationMode === 'modernize' ? 'Modernize Mode' : 'Generate Mode'}
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Curriculum Generated Successfully!</h2>
            </div>
            <button className="btn btn-secondary" onClick={handleReset}>
              Create Another
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
            {(finalResult.quizzes_data?.modules || []).length > 0 ? (
              <ModuleAccordion modules={finalResult.quizzes_data.modules} />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                The curriculum report was created, but structured modules were not returned. Try generating again so the assessment agent can produce lessons, quizzes, and exercises.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
