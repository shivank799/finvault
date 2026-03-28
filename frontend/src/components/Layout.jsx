import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';

const NAV = [
  { to: '/',             icon: '📊', label: 'Dashboard',    exact: true },
  { to: '/transactions', icon: '💳', label: 'Transactions' },
  { to: '/add',          icon: '➕', label: 'Add Record' },
  { to: '/budgets',      icon: '📋', label: 'Budget' },
  { to: '/goals',        icon: '🎯', label: 'Goals' },
  { to: '/reports',      icon: '📈', label: 'Reports' },
  { to: '/settings',     icon: '⚙️', label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const [mobile, setMobile] = useState(false);
  const initials  = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div style={styles.shell}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.overlay} onClick={() => setMobile(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        style={{ ...styles.sidebar, ...(mobile ? styles.sidebarOpen : {}) }}
        initial={false}
      >
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>💰</div>
          <span style={styles.logoText}>Fin<span style={{ color: 'var(--accent)' }}>Vault</span></span>
          <button style={styles.closeBtn} onClick={() => setMobile(false)}>✕</button>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          <p style={styles.navLabel}>MAIN</p>
          {NAV.slice(0, 3).map(item => <NavItem key={item.to} {...item} onClick={() => setMobile(false)} />)}
          <p style={{ ...styles.navLabel, marginTop: 12 }}>PLANNING</p>
          {NAV.slice(3, 6).map(item => <NavItem key={item.to} {...item} onClick={() => setMobile(false)} />)}
          <p style={{ ...styles.navLabel, marginTop: 12 }}>ACCOUNT</p>
          {NAV.slice(6).map(item => <NavItem key={item.to} {...item} onClick={() => setMobile(false)} />)}
        </nav>

        {/* User */}
        <div style={styles.userArea}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.userInfo}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--accent)' }}>DevOps Engineer</div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout} title="Logout">
            ⎋
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <main style={styles.main}>
        {/* Mobile topbar */}
        <div style={styles.topbar}>
          <button style={styles.menuBtn} onClick={() => setMobile(true)}>☰</button>
          <span style={styles.logoText}>Fin<span style={{ color: 'var(--accent)' }}>Vault</span></span>
        </div>

        <div style={styles.content}>
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, exact, onClick }) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      style={({ isActive }) => ({
        ...styles.navItem,
        ...(isActive ? styles.navItemActive : {}),
      })}
    >
      <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>{icon}</span>
      {label}
    </NavLink>
  );
}

const styles = {
  shell:       { display: 'flex', minHeight: '100vh', position: 'relative' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(2px)' },
  sidebar:     { width: 230, minHeight: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', zIndex: 50, flexShrink: 0, transition: 'transform 0.28s ease' },
  sidebarOpen: { position: 'fixed', left: 0, top: 0 },
  logo:        { padding: '24px 20px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' },
  logoIcon:    { width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,var(--accent),#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 },
  logoText:    { fontFamily: 'var(--font-display)', fontSize: 19 },
  closeBtn:    { marginLeft: 'auto', background: 'none', color: 'var(--muted)', fontSize: 14, display: 'none' },
  nav:         { padding: '14px 10px', flex: 1, overflowY: 'auto' },
  navLabel:    { fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 12px 6px', display: 'block' },
  navItem:     { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, color: 'var(--text2)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'var(--transition)', marginBottom: 2 },
  navItemActive:{ background: 'rgba(79,255,176,0.1)', color: 'var(--accent)' },
  userArea:    { padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 },
  avatar:      { width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent3),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0a0d14', flexShrink: 0 },
  userInfo:    { flex: 1, minWidth: 0 },
  logoutBtn:   { background: 'none', color: 'var(--muted)', fontSize: 16, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)' },
  main:        { flex: 1, overflow: 'auto', minWidth: 0 },
  topbar:      { display: 'none', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 30 },
  menuBtn:     { background: 'none', color: 'var(--text)', fontSize: 20, padding: '4px 8px' },
  content:     { padding: '28px 28px', position: 'relative', zIndex: 1 },
};

// Responsive via media queries injected
const styleTag = document.createElement('style');
styleTag.textContent = `
  @media (max-width: 700px) {
    aside { display: none !important; }
    .fv-topbar { display: flex !important; }
  }
  @media (max-width: 700px) {
    .fv-main-content { padding: 16px !important; }
  }
  nav a:hover { background: var(--surface2) !important; color: var(--text) !important; }
`;
document.head.appendChild(styleTag);
