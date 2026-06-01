'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSettings } from '@/lib/api';

export default function SetupGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [keysConfigured, setKeysConfigured] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === '/settings') {
      setLoading(false);
      setKeysConfigured(true);
      return;
    }

    async function checkKeys() {
      setLoading(true);
      try {
        const settings = await getSettings();
        if (settings.google_api_key_set && settings.tavily_api_key_set) {
          setKeysConfigured(true);
        } else {
          setKeysConfigured(false);
        }
      } catch (err) {
        setKeysConfigured(false);
      } finally {
        setLoading(false);
      }
    }

    checkKeys();
  }, [pathname]);

  if (pathname === '/settings') {
    return children;
  }

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <span style={{ fontSize: '48px', display: 'inline-block', transformOrigin: 'center' }} className="spin-element">⚙️</span>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
          Verifying application credentials...
        </p>
        <style>{`
          .spin-element {
            animation: spin 2s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (keysConfigured === false) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '550px', marginTop: '40px' }}>
        <div className="glass-card" style={{ textAlign: 'center', borderColor: 'var(--accent-warning)', padding: '40px' }}>
          <span style={{ fontSize: '56px' }}>🔑</span>
          <h2 style={{ margin: '20px 0 10px', fontFamily: 'var(--font-heading)' }}>API Keys Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '15px' }}>
            EduGraph runs advanced multi-agent orchestrations powered by Google Gemini and Tavily Search. Please configure your API keys in Settings to start.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => router.push('/settings')}
            style={{ width: '100%' }}
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return children;
}
