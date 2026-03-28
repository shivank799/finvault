import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { transactionsAPI } from '../services/api';

const CAT_ICONS = { Food:'🍔', Transport:'🚗', Shopping:'🛍️', Bills:'💡', Health:'💊', Entertainment:'🎮', Savings:'💰', Investment:'📈', Salary:'💵', Freelance:'💻', Other:'📦' };

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

export default function Transactions() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [type,   setType]   = useState('all');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { search, type, page }],
    queryFn:  () => transactionsAPI.getAll({ search: search || undefined, type: type !== 'all' ? type : undefined, page, limit: 15 }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => transactionsAPI.delete(id),
    onSuccess:  () => { qc.invalidateQueries(['transactions']); qc.invalidateQueries(['dashboard']); toast.success('Transaction deleted'); },
    onError:    () => toast.error('Failed to delete'),
  });

  const transactions = data?.transactions || [];
  const pagination   = data?.pagination;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>Transactions</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>All your financial records in one place</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          style={{ flex: 1, minWidth: 200 }}
          placeholder="🔍  Search transactions..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select style={{ width: 160 }} value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
          <option value="all">All Types</option>
          <option value="expense">Expenses</option>
          <option value="saving">Savings</option>
          <option value="income">Income</option>
          <option value="investment">Investments</option>
        </select>
        {pagination && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
            <span>{pagination.total} records</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={styles.tableHead}>
          <span>Date</span><span>Description</span><span>Category</span><span>Method</span><span style={{ textAlign: 'right' }}>Amount</span><span />
        </div>

        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={styles.tableRow}>
              <div className="skeleton" style={{ height: 14, width: 60 }} />
              <div className="skeleton" style={{ height: 14, width: 140 }} />
              <div className="skeleton" style={{ height: 14, width: 80 }} />
              <div className="skeleton" style={{ height: 14, width: 70 }} />
              <div className="skeleton" style={{ height: 14, width: 60, marginLeft: 'auto' }} />
              <div style={{ width: 24 }} />
            </div>
          ))
        ) : transactions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            No transactions found. Add one!
          </div>
        ) : (
          transactions.map((txn, i) => (
            <motion.div
              key={txn.id}
              style={styles.tableRow}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                {format(parseISO(txn.date), 'dd MMM')}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ marginRight: 6 }}>{CAT_ICONS[txn.category] || '💳'}</span>
                {txn.description}
              </span>
              <span>
                <span className={`badge badge-${txn.type === 'expense' ? 'red' : txn.type === 'saving' ? 'green' : 'blue'}`}>
                  {txn.category}
                </span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{txn.payment_method || '—'}</span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: txn.type === 'expense' ? 'var(--accent2)' : 'var(--accent)' }}>
                {txn.type === 'expense' ? '-' : '+'}₹{fmt(txn.amount)}
              </span>
              <button
                style={{ background: 'none', color: 'var(--muted)', fontSize: 14, padding: '4px 6px', borderRadius: 6, border: '1px solid transparent' }}
                onClick={() => { if (window.confirm('Delete this transaction?')) deleteMut.mutate(txn.id); }}
                title="Delete"
              >🗑️</button>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button style={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1).map(p => (
            <button key={p} style={{ ...styles.pageBtn, ...(p === page ? styles.pageBtnActive : {}) }} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button style={styles.pageBtn} onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>Next →</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  tableHead: { display: 'grid', gridTemplateColumns: '80px 1fr 130px 110px 110px 40px', gap: 12, padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' },
  tableRow:  { display: 'grid', gridTemplateColumns: '80px 1fr 130px 110px 110px 40px', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: 'var(--transition)' },
  pageBtn:   { padding: '7px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, cursor: 'pointer' },
  pageBtnActive: { background: 'rgba(79,255,176,0.1)', borderColor: 'var(--accent)', color: 'var(--accent)' },
};
