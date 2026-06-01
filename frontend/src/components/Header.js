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

  return (
    <header style={{
      background: 'rgba(10, 14, 26, 0.6)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-glass)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '16px 0'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🧠</span>
          <span className="gradient-text" style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: '800',
            fontSize: '22px',
            letterSpacing: '-0.03em'
          }}>
            EduGraph
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: '12px' }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link 
                key={link.name} 
                href={link.path}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-heading)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
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
