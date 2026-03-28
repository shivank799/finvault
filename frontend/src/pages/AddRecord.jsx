import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { transactionsAPI } from '../services/api';

const CATEGORIES = ['Food','Transport','Shopping','Bills','Health','Entertainment','Savings','Investment','Salary','Freelance','Other'];
const METHODS     = ['UPI','Cash','Credit Card','Debit Card','Net Banking','Wallet'];
const CAT_ICONS   = { Food:'🍔',Transport:'🚗',Shopping:'🛍️',Bills:'💡',Health:'💊',Entertainment:'🎮',Savings:'💰',Investment:'📈',Salary:'💵',Freelance:'💻',Other:'📦' };

const schema = z.object({
  type:           z.enum(['expense','income','saving','investment']),
  amount:         z.coerce.number({ invalid_type_error: 'Enter a valid amount' }).positive('Must be > 0'),
  description:    z.string().min(1, 'Description required').max(500),
  category:       z.string().min(1),
  date:           z.string().min(1, 'Date required'),
  payment_method: z.string().optional(),
  notes:          z.string().optional(),
  is_recurring:   z.boolean().optional(),
});

export default function AddRecord() {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), category: 'Food', payment_method: 'UPI' },
  });
  const txnType = watch('type');

  const mutation = useMutation({
    mutationFn: (data) => transactionsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['transactions']);
      qc.invalidateQueries(['dashboard']);
      reset({ type: txnType, date: format(new Date(), 'yyyy-MM-dd'), category: 'Food', payment_method: 'UPI' });
      toast.success(txnType === 'expense' ? '🔴 Expense recorded!' : '💚 Saving recorded!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const typeColors = { expense: 'var(--accent2)', income: 'var(--accent)', saving: 'var(--accent)', investment: 'var(--accent3)' };
  const typeIcons  = { expense: '🔴', income: '💚', saving: '💰', investment: '📈' };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>Add Record</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Track a new transaction in your financial history</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
            {/* Type selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Transaction Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {['expense','income','saving','investment'].map(t => {
                  const active = txnType === t;
                  return (
                    <label key={t} style={{ cursor: 'pointer' }}>
                      <input type="radio" value={t} {...register('type')} style={{ display: 'none' }} />
                      <div style={{
                        padding: '10px 8px', borderRadius: 10, textAlign: 'center', fontSize: 13, fontWeight: 500,
                        border: `1px solid ${active ? typeColors[t] : 'var(--border)'}`,
                        background: active ? `${typeColors[t]}18` : 'var(--bg)',
                        color: active ? typeColors[t] : 'var(--muted)',
                        transition: 'var(--transition)',
                      }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{typeIcons[t]}</div>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Form grid */}
            <div style={styles.grid}>
              <Field label="Amount (₹)" error={errors.amount?.message}>
                <input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
              </Field>
              <Field label="Date" error={errors.date?.message}>
                <input type="date" {...register('date')} />
              </Field>
              <Field label="Description" error={errors.description?.message} style={{ gridColumn: '1/-1' }}>
                <input type="text" placeholder="What was this for?" {...register('description')} />
              </Field>
              <Field label="Category" error={errors.category?.message}>
                <select {...register('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                </select>
              </Field>
              <Field label="Payment Method">
                <select {...register('payment_method')}>
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Notes (optional)" style={{ gridColumn: '1/-1' }}>
                <textarea rows={3} placeholder="Any additional notes..." {...register('notes')} style={{ resize: 'vertical' }} />
              </Field>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--muted)' }}>
                <input type="checkbox" {...register('is_recurring')} />
                Recurring transaction
              </label>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                marginTop: 20, width: '100%', padding: '13px',
                background: mutation.isPending ? 'var(--surface2)' : 'linear-gradient(135deg,var(--accent),#00d4ff)',
                border: 'none', borderRadius: 10, color: '#0a0d14',
                fontWeight: 700, fontSize: 15, cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                transition: 'var(--transition)',
              }}
            >
              {mutation.isPending ? 'Saving...' : '+ Add Record'}
            </button>
          </form>
        </motion.div>

        {/* Tips panel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card" style={{ background: 'rgba(79,255,176,0.04)', borderColor: 'rgba(79,255,176,0.15)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 14 }}>💡 Pro Tips</div>
            {[
              'Use consistent categories for better budget tracking',
              'Add notes to remember context behind big purchases',
              'Mark salary and freelance as Income, not Savings',
              'SIPs and FDs count as Investments — track them separately',
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>→</span>
                {tip}
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>📱 Keyboard Shortcuts</div>
            {[['Ctrl + S', 'Save record'], ['Ctrl + Z', 'Clear form'], ['Tab', 'Next field']].map(([key, desc]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent)' }}>{key}</span>
                <span style={{ color: 'var(--muted)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, error, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <label style={styles.label}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--accent2)' }}>{error}</span>}
    </div>
  );
}

const styles = {
  grid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: { fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
};
