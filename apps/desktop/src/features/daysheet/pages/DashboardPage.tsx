import React from 'react';

export function DashboardPage() {
  return (
    <main data-page="dashboard" style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>RégieArt</h1>
        <p style={styles.subtitle}>Desktop — React + Vite</p>
        <span style={styles.badge}>✓ Contenedor activo en puerto 5173</span>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    textAlign: 'center',
    padding: '48px 64px',
    borderRadius: '16px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: '3rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#888888',
    margin: '0 0 24px',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '9999px',
    backgroundColor: '#1a3a2a',
    color: '#4ade80',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
};
