import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { dashboardAPI } from '../services/api';
import useAuthStore from '../context/authStore';

const CAT_COLORS = ['#ff6b6b','#6b8cff','#ffd166','#4fffb0','#ff99cc','#a78bfa','#34d399','#60a5fa'];

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

export default function Dashboard() {
  const { user }  = useAuthStore();
  const firstName = user?.name?.split(' ')[0] || 'Dev';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: summaryRes, isLoading: sumLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn:  () => dashboardAPI.summary().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: budgetRes } = useQuery({
    queryKey: ['dashboard', 'budgets'],
    queryFn:  () => dashboardAPI.budgetStatus().then(r => r.data.data),
  });

  const summary = summaryRes;
  const budgets = budgetRes?.budgets || [];

  // Build 6-month chart data from trend
  const trendData = (summary?.trend || []).map(t => ({
    month:    t.month?.slice(5) || t.month,
    expenses: parseFloat(t.expenses || 0),
    savings:  parseFloat(t.savings  || 0),
  }));

  const categoryData = (summary?.categories || []).slice(0, 6).map((c, i) => ({
    name:  c.category,
    value: parseFloat(c.total),
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));

  const statCards = [
    { label: 'Total Savings',   value: `₹${fmt(summary?.totals?.savings)}`,  color: 'var(--accent)',  icon: '💚', sub: `${summary?.totals?.transactions || 0} total records` },
    { label: 'Total Expenses',  value: `₹${fmt(summary?.totals?.expenses)}`, color: 'var(--accent2)', icon: '🔴', sub: `this month: ₹${fmt(summary?.monthly?.expenses)}` },
    { label: 'Net Balance',     value: `₹${fmt(Math.abs(summary?.totals?.net_balance || 0))}`, color: 'var(--accent3)', icon: '⚖️', sub: (summary?.totals?.net_balance || 0) >= 0 ? 'surplus' : 'deficit' },
    { label: 'Savings Rate',    value: `${summary?.savings_rate || 0}%`,      color: 'var(--accent4)', icon: '📊', sub: 'income saved' },
  ];

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 4 }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {format(new Date(), 'EEEE, MMMM d yyyy')} · Here's your financial overview
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatCard {...card} loading={sumLoading} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={styles.chartsGrid}>
        {/* Area Chart */}
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div style={styles.cardHeader}>
            <span>📈</span>
            <h3>6-Month Trend</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
              {[['Expenses','var(--accent2)'],['Savings','var(--accent)']].map(([l,c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff6b6b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4fffb0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4fffb0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => `₹${fmt(v)}`}
              />
              <Area type="monotone" dataKey="expenses" stroke="#ff6b6b" fill="url(#gExp)" strokeWidth={2} />
              <Area type="monotone" dataKey="savings"  stroke="#4fffb0" fill="url(#gSav)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart + Category list */}
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <div style={styles.cardHeader}><span>🍩</span><h3>By Category</h3></div>
          {categoryData.length ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <PieChart width={120} height={120}>
                <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} strokeWidth={0}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categoryData.map(c => {
                  const total = categoryData.reduce((s, x) => s + x.value, 0);
                  const pct   = Math.round((c.value / total) * 100);
                  return (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{c.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No expense data yet</p>
          )}
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div style={styles.bottomGrid}>
        {/* Budget Status */}
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div style={styles.cardHeader}><span>📋</span><h3>Budget Status</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {budgets.slice(0, 5).map(b => {
              const pct = parseFloat(b.pct_used);
              const color = b.status === 'over' ? 'var(--accent2)' : b.status === 'warning' ? 'var(--accent4)' : 'var(--accent)';
              return (
                <div key={b.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{b.category}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                      ₹{fmt(b.spent)} / ₹{fmt(b.budget_limit)}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      style={{ height: '100%', background: color, borderRadius: 99 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Top Expenses */}
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          <div style={styles.cardHeader}><span>🔝</span><h3>Top Expenses</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(summary?.top_expenses || []).map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,107,107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                  💸
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.category}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent2)', fontWeight: 600 }}>
                  -₹{fmt(t.amount)}
                </span>
              </div>
            ))}
            {!summary?.top_expenses?.length && (
              <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No expenses this month</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, sub, loading }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)` }} />
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      {loading ? (
        <div className="skeleton" style={{ height: 32, width: '70%', marginBottom: 6 }} />
      ) : (
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>{value}</div>
      )}
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{sub}</div>
      <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 30, opacity: 0.12 }}>{icon}</div>
    </div>
  );
}

const styles = {
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(195px,1fr))', gap: 16, marginBottom: 20 },
  chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20 },
  bottomGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
};
