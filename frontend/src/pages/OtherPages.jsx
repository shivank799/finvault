// ──────────────────────────────────────────────────────────────────
// BudgetPage.jsx
// ──────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { budgetsAPI, dashboardAPI } from '../services/api';

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

export function BudgetPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [newLimit, setNewLimit] = useState('');

  const { data: budData } = useQuery({
    queryKey: ['budgets'],
    queryFn:  () => dashboardAPI.budgetStatus().then(r => r.data.data.budgets),
  });

  const updateMut = useMutation({
    mutationFn: ({ cat, amount }) => budgetsAPI.update(cat, { amount }),
    onSuccess:  () => { qc.invalidateQueries(['budgets']); qc.invalidateQueries(['dashboard']); toast.success('Budget updated!'); setEditing(null); },
    onError:    () => toast.error('Failed to update'),
  });

  const budgets = budData || [];
  const total   = budgets.reduce((s, b) => s + parseFloat(b.budget_limit), 0);
  const spent   = budgets.reduce((s, b) => s + parseFloat(b.spent), 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>Budget Tracker</h1><p style={{ color: 'var(--muted)', fontSize: 14 }}>Monitor spending against your monthly limits</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Monthly Budget', value: `₹${fmt(total)}`, color: 'var(--accent3)' },
          { label: 'Total Spent',    value: `₹${fmt(spent)}`, color: 'var(--accent2)' },
          { label: 'Remaining',      value: `₹${fmt(Math.max(0, total - spent))}`, color: 'var(--accent)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ borderTopColor: c.color }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Category Budgets</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {budgets.map((b, i) => {
            const pct = parseFloat(b.pct_used);
            const barColor = b.status === 'over' ? 'var(--accent2)' : b.status === 'warning' ? 'var(--accent4)' : 'var(--accent)';
            return (
              <motion.div key={b.category} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{b.category}</span>
                    {b.status !== 'ok' && <span className={`badge badge-${b.status === 'over' ? 'red' : 'yellow'}`}>{b.status === 'over' ? 'Over budget' : 'Alert'}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {editing === b.category ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)} style={{ width: 100, padding: '5px 10px', fontSize: 13 }} placeholder="New limit" />
                        <button onClick={() => updateMut.mutate({ cat: b.category, amount: parseFloat(newLimit) })} style={{ padding: '5px 12px', background: 'var(--accent)', color: '#0a0d14', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none' }}>Save</button>
                        <button onClick={() => setEditing(null)} style={{ padding: '5px 10px', background: 'var(--surface2)', color: 'var(--muted)', borderRadius: 8, fontSize: 12, border: '1px solid var(--border)' }}>✕</button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>₹{fmt(b.spent)} / ₹{fmt(b.budget_limit)}</span>
                        <button onClick={() => { setEditing(b.category); setNewLimit(b.budget_limit); }} style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6 }}>Edit</button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: i * 0.06 }}
                    style={{ height: '100%', background: barColor, borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{Math.round(pct)}% used</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// GoalsPage.jsx
// ──────────────────────────────────────────────────────────────────
import { goalsAPI } from '../services/api';

export function GoalsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', target_amount: '', icon: '🎯', color: '#4fffb0', target_date: '' });

  const { data } = useQuery({ queryKey: ['goals'], queryFn: () => goalsAPI.getAll().then(r => r.data.data.goals) });
  const goals = data || [];

  const createMut = useMutation({
    mutationFn: (d) => goalsAPI.create(d),
    onSuccess:  () => { qc.invalidateQueries(['goals']); toast.success('Goal created!'); setShowAdd(false); setForm({ name: '', target_amount: '', icon: '🎯', color: '#4fffb0', target_date: '' }); },
  });

  const contribMut = useMutation({
    mutationFn: ({ id, amount }) => goalsAPI.contribute(id, amount),
    onSuccess: () => { qc.invalidateQueries(['goals']); toast.success('Contribution added!'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => goalsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['goals']); toast.success('Goal removed'); },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>Savings Goals</h1><p style={{ color: 'var(--muted)', fontSize: 14 }}>Track your financial milestones</p></div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,var(--accent),#00d4ff)', border: 'none', borderRadius: 10, color: '#0a0d14', fontWeight: 700, fontSize: 13 }}>+ New Goal</button>
      </div>

      {showAdd && (
        <motion.div className="card" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20, borderColor: 'rgba(79,255,176,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Goal Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency Fund" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Target Amount (₹)</label><input type="number" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} placeholder="100000" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Target Date</label><input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['🎯','🏠','🚗','💻','✈️','💍','🎓','🏦'].map(ic => <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} style={{ fontSize: 20, background: form.icon === ic ? 'var(--surface2)' : 'none', border: `1px solid ${form.icon === ic ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '6px 8px' }}>{ic}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['#4fffb0','#6b8cff','#ffd166','#ff6b6b','#ff99cc'].map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => createMut.mutate(form)} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#0a0d14', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none' }}>Create Goal</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '10px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--muted)', fontSize: 13 }}>Cancel</button>
          </div>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
        {goals.map((g, i) => {
          const pct = Math.min(Math.round((parseFloat(g.saved_amount) / parseFloat(g.target_amount)) * 100), 100);
          return (
            <motion.div key={g.id} className="card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{g.icon}</span>
                <button onClick={() => deleteMut.mutate(g.id)} style={{ background: 'none', color: 'var(--muted)', fontSize: 13, border: '1px solid var(--border)', padding: '3px 7px', borderRadius: 6 }}>🗑️</button>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>₹{fmt(g.saved_amount)} of ₹{fmt(g.target_amount)}</div>
              <div style={{ height: 5, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 }}
                  style={{ height: '100%', background: g.color || 'var(--accent)', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: g.color || 'var(--accent)' }}>{pct}%</span>
                <button onClick={() => { const amt = prompt('Add contribution (₹):'); if (amt && !isNaN(parseFloat(amt))) contribMut.mutate({ id: g.id, amount: parseFloat(amt) }); }}
                  style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(79,255,176,0.1)', color: 'var(--accent)', border: '1px solid rgba(79,255,176,0.2)', borderRadius: 6 }}>
                  + Contribute
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// ReportsPage.jsx
// ──────────────────────────────────────────────────────────────────
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { reportsAPI } from '../services/api';

export function ReportsPage() {
  const year = new Date().getFullYear();
  const { data } = useQuery({
    queryKey: ['reports', 'yearly', year],
    queryFn:  () => reportsAPI.yearly(year).then(r => r.data.data.yearly),
  });
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartData = (data || []).map(d => ({ month: MONTHS[parseInt(d.month)-1], expenses: parseFloat(d.expenses), savings: parseFloat(d.savings), income: parseFloat(d.income) }));

  const handleExport = async () => {
    try {
      const res = await reportsAPI.exportCSV({});
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'finvault-export.csv'; a.click();
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>Reports</h1><p style={{ color: 'var(--muted)', fontSize: 14 }}>Annual overview for {year}</p></div>
        <button onClick={handleExport} style={{ padding: '10px 18px', background: 'rgba(79,255,176,0.1)', border: '1px solid var(--accent)', borderRadius: 10, color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>📥 Export CSV</button>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Monthly Breakdown — {year}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ left: -10 }}>
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v>=1000?v/1000+'k':v}`} />
            <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} formatter={v => `₹${Number(v).toLocaleString('en-IN')}`} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
            <Bar dataKey="expenses" fill="#ff6b6b" radius={[4,4,0,0]} opacity={0.8} />
            <Bar dataKey="savings"  fill="#4fffb0" radius={[4,4,0,0]} opacity={0.8} />
            <Bar dataKey="income"   fill="#6b8cff" radius={[4,4,0,0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// SettingsPage.jsx
// ──────────────────────────────────────────────────────────────────
import { usersAPI } from '../services/api';
import useAuthStore from '../context/authStore';

export function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');

  const updateMut = useMutation({
    mutationFn: (d) => usersAPI.updateProfile(d),
    onSuccess: (res) => { updateUser(res.data.data.user); toast.success('Profile updated!'); },
    onError: () => toast.error('Update failed'),
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>Settings</h1><p style={{ color: 'var(--muted)', fontSize: 14 }}>Manage your account and preferences</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ color: 'var(--accent)', marginBottom: 18, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>👤 Profile</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Full Name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Email</label><input value={user?.email || ''} disabled style={{ opacity: 0.6 }} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="INR">₹ INR — Indian Rupee</option>
                <option value="USD">$ USD — US Dollar</option>
                <option value="EUR">€ EUR — Euro</option>
              </select>
            </div>
            <button onClick={() => updateMut.mutate({ name, currency })} disabled={updateMut.isPending} style={{ padding: '11px', background: 'linear-gradient(135deg,var(--accent),#00d4ff)', border: 'none', borderRadius: 10, color: '#0a0d14', fontWeight: 700, fontSize: 14 }}>
              {updateMut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--accent)', marginBottom: 18, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔐 Security</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Current Password','New Password','Confirm Password'].map(label => (
              <div key={label}><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{label}</label><input type="password" placeholder="••••••••" /></div>
            ))}
            <button style={{ padding: '11px', background: 'rgba(107,140,255,0.1)', border: '1px solid var(--accent3)', borderRadius: 10, color: 'var(--accent3)', fontWeight: 600, fontSize: 14 }}>Update Password</button>
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--accent)', marginBottom: 18, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔔 Notifications</h3>
          {[['Budget Alerts', 'When 80% of limit is reached', true], ['Weekly Report', 'Every Monday summary email', true], ['Goal Milestones', 'Celebrate your progress', false]].map(([label, sub, on]) => {
            const [enabled, setEnabled] = useState(on);
            return (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div><div style={{ fontSize: 14 }}>{label}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div></div>
                <div onClick={() => setEnabled(!enabled)} style={{ width: 42, height: 24, background: enabled ? 'rgba(79,255,176,0.2)' : 'var(--surface2)', borderRadius: 99, border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'var(--transition)' }}>
                  <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: enabled ? 'var(--accent)' : 'var(--muted)', top: 3, left: enabled ? 19 : 3, transition: 'var(--transition)' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--accent)', marginBottom: 18, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>💾 Data & Privacy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>Export Data</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Download all records as CSV</div></div>
              <button onClick={() => reportsAPI.exportCSV({}).then(r => { const url = URL.createObjectURL(new Blob([r.data])); const a = document.createElement('a'); a.href=url; a.download='finvault.csv'; a.click(); toast.success('Exported!'); })} style={{ padding: '7px 14px', background: 'rgba(79,255,176,0.1)', border: '1px solid var(--accent)', borderRadius: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>Export</button>
            </div>
            <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>App Version</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>FinVault v2.0.0</div></div>
              <span className="badge badge-green">Latest</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
