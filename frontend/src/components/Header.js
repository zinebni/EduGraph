'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Generate', path: '/' },
    { name: 'History Log', path: '/history' },
    { name: 'Settings', path: '/settings' },
  ];

  const handleLogoClick = () => {
    // Dispatches custom event to trigger form/state resets on home page
    const resetEvent = new CustomEvent('reset-curriculum-form');
    window.dispatchEvent(resetEvent);
  };

  return (
    <header className="pill-navbar">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      }}>
        <Link 
          href="/" 
          onClick={handleLogoClick}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <span style={{ fontSize: '26px' }}>🧠</span>
          <span className="gradient-text" style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: '800',
            fontSize: '20px',
            letterSpacing: '-0.03em'
          }}>
            EduGraph
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: '8px' }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link 
                key={link.name} 
                href={link.path}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-heading)',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
