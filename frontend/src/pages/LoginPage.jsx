import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import useAuthStore from '../context/authStore';

const loginSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be 8+ characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Need uppercase, lowercase, and number'),
});

export default function LoginPage() {
  const [tab, setTab]     = useState('login');
  const { login, register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const loginForm = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: 'demo@finvault.app', password: 'Demo1234' } });
  const regForm   = useForm({ resolver: zodResolver(registerSchema) });

  const onLogin = async (data) => {
    const res = await login(data.email, data.password);
    if (res.success) { toast.success('Welcome back!'); navigate('/'); }
    else toast.error(res.message);
  };

  const onRegister = async (data) => {
    const res = await registerUser(data.name, data.email, data.password);
    if (res.success) { toast.success('Account created!'); navigate('/'); }
    else toast.error(res.message);
  };

  return (
    <div style={styles.page}>
      {/* Background glow orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>💰</div>
          <div>
            <div style={styles.logoText}>Fin<span style={{ color: 'var(--accent)' }}>Vault</span></div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Personal Finance Platform</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={styles.tabRow}>
          {['login', 'register'].map(t => (
            <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            {tab === 'login' ? (
              <form onSubmit={loginForm.handleSubmit(onLogin)} style={styles.form}>
                <Field label="Email" error={loginForm.formState.errors.email?.message}>
                  <input type="email" placeholder="you@example.com" {...loginForm.register('email')} />
                </Field>
                <Field label="Password" error={loginForm.formState.errors.password?.message}>
                  <input type="password" placeholder="••••••••" {...loginForm.register('password')} />
                </Field>
                <button type="submit" style={styles.submitBtn} disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In →'}
                </button>
                <p style={styles.hint}>Demo: <code style={styles.code}>demo@finvault.app</code> / <code style={styles.code}>Demo1234</code></p>
              </form>
            ) : (
              <form onSubmit={regForm.handleSubmit(onRegister)} style={styles.form}>
                <Field label="Full Name" error={regForm.formState.errors.name?.message}>
                  <input type="text" placeholder="Your full name" {...regForm.register('name')} />
                </Field>
                <Field label="Email" error={regForm.formState.errors.email?.message}>
                  <input type="email" placeholder="you@example.com" {...regForm.register('email')} />
                </Field>
                <Field label="Password" error={regForm.formState.errors.password?.message}>
                  <input type="password" placeholder="Min 8 chars (A-Z, a-z, 0-9)" {...regForm.register('password')} />
                </Field>
                <button type="submit" style={styles.submitBtn} disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Account →'}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--accent2)' }}>{error}</span>}
    </div>
  );
}

const styles = {
  page:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' },
  orb1:       { position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,255,176,0.07), transparent 70%)', pointerEvents: 'none' },
  orb2:       { position: 'absolute', bottom: '10%', right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(107,140,255,0.07), transparent 70%)', pointerEvents: 'none' },
  card:       { width: 420, maxWidth: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 36px', boxShadow: '0 0 80px rgba(79,255,176,0.05), var(--shadow-lg)', position: 'relative', zIndex: 1 },
  logo:       { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoIcon:   { width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,var(--accent),#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  logoText:   { fontFamily: 'var(--font-display)', fontSize: 22 },
  tabRow:     { display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4, marginBottom: 24 },
  tab:        { flex: 1, padding: '9px', borderRadius: 8, background: 'none', color: 'var(--muted)', fontSize: 14, fontWeight: 500, transition: 'var(--transition)' },
  tabActive:  { background: 'var(--surface2)', color: 'var(--text)' },
  form:       { display: 'flex', flexDirection: 'column', gap: 16 },
  submitBtn:  { marginTop: 4, padding: '13px', background: 'linear-gradient(135deg,var(--accent),#00d4ff)', borderRadius: 10, color: '#0a0d14', fontWeight: 700, fontSize: 15, transition: 'var(--transition)' },
  hint:       { textAlign: 'center', fontSize: 12, color: 'var(--muted)' },
  code:       { background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 11 },
};
