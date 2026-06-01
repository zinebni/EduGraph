'use client';

import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/lib/api';

export default function SettingsForm() {
  const [googleKey, setGoogleKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('gemini-3.1-flash-lite');

  const [googleKeySet, setGoogleKeySet] = useState(false);
  const [tavilyKeySet, setTavilyKeySet] = useState(false);

  const [showGoogle, setShowGoogle] = useState(false);
  const [showTavily, setShowTavily] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: '' }

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getSettings();
        setGoogleKeySet(data.google_api_key_set);
        setTavilyKeySet(data.tavily_api_key_set);
        setDefaultModel(data.default_model || 'gemini-3.1-flash-lite');
      } catch (err) {
        showFeedback('error', 'Failed to retrieve database configuration.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const showFeedback = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Prepare payload (only send non-empty keys so we don't overwrite with empty values)
    const payload = { default_model: defaultModel };
    if (googleKey.trim()) payload.google_api_key = googleKey;
    if (tavilyKey.trim()) payload.tavily_api_key = tavilyKey;

    try {
      await updateSettings(payload);
      showFeedback('success', 'Settings saved successfully!');
      
      // Update configured indicators
      if (googleKey.trim()) {
        setGoogleKeySet(true);
        setGoogleKey('');
      }
      if (tavilyKey.trim()) {
        setTavilyKeySet(true);
        setTavilyKey('');
      }
    } catch (err) {
      showFeedback('error', 'Error occurred while saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Retrieving configurations...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} style={{ position: 'relative' }}>
      {/* Toast Notification */}
      {toast && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: '-64px',
            left: 0,
            right: 0,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            border: toast.type === 'success' ? '1px solid var(--accent-success)' : '1px solid var(--accent-error)',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '14px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            zIndex: 10
          }}
        >
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.text}
        </div>
      )}

      {/* Model Selection */}
      <div className="form-group">
        <label className="form-label" htmlFor="model-select">Default LLM Model</label>
        <select 
          id="model-select"
          className="form-select"
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
        >
          <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Free / Fast)</option>
          <option value="gemini-2.5-flash">gemini-2.5-flash (Standard)</option>
          <option value="gemini-2.5-pro">gemini-2.5-pro (Highly Capable)</option>
        </select>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
          This model will drive the supervisors, writer, and quiz creator agents.
        </span>
      </div>

      <div style={{ borderBottom: '1px solid var(--border-glass)', margin: '24px 0' }} />

      {/* Google API Key */}
      <div className="form-group" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="form-label" htmlFor="google-api" style={{ margin: 0 }}>Google AI Studio API Key</label>
          <span className={`badge ${googleKeySet ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '10px' }}>
            {googleKeySet ? 'Configured' : 'Not Set'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            id="google-api"
            type={showGoogle ? 'text' : 'password'} 
            className="form-input"
            placeholder={googleKeySet ? '••••••••••••••••••••••••••••••••' : 'Enter API Key'}
            value={googleKey}
            onChange={(e) => setGoogleKey(e.target.value)}
          />
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0 16px' }}
            onClick={() => setShowGoogle(!showGoogle)}
          >
            {showGoogle ? 'Hide' : 'Show'}
          </button>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
          Acquire a free developer key at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>aistudio.google.com</a>
        </span>
      </div>

      {/* Tavily API Key */}
      <div className="form-group" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="form-label" htmlFor="tavily-api" style={{ margin: 0 }}>Tavily Search API Key</label>
          <span className={`badge ${tavilyKeySet ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '10px' }}>
            {tavilyKeySet ? 'Configured' : 'Not Set'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            id="tavily-api"
            type={showTavily ? 'text' : 'password'} 
            className="form-input"
            placeholder={tavilyKeySet ? '••••••••••••••••••••••••••••••••' : 'Enter API Key'}
            value={tavilyKey}
            onChange={(e) => setTavilyKey(e.target.value)}
          />
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0 16px' }}
            onClick={() => setShowTavily(!showTavily)}
          >
            {showTavily ? 'Hide' : 'Show'}
          </button>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
          Acquire a free search API key at <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>tavily.com</a>
        </span>
      </div>

      <button 
        type="submit" 
        className="btn btn-primary" 
        style={{ width: '100%', padding: '14px 24px', fontSize: '15px', marginTop: '16px' }}
        disabled={saving}
      >
        {saving ? 'Saving...' : '💾 Save Configurations'}
      </button>
    </form>
  );
}
