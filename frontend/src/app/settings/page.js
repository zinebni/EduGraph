'use client';

import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="container animate-slide-up" style={{ maxWidth: '600px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px' }} className="gradient-text">
          Configuration & Keys
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Manage your AI models and Search API credentials. Keys are saved securely in your local database.
        </p>
      </div>

      <div className="glass-card">
        <SettingsForm />
      </div>
    </div>
  );
}
