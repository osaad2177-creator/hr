'use client';

import { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, RefreshCcw, Check, Key, X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
  getActivationCodes, createActivationCode, deleteActivationCode,
  getDepartments, getWorkLocations, getShifts,
} from '@/lib/firebase/firestore';
import { ActivationCode, Department, WorkLocation, Shift, UserRole } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

const s = {
  // Layout
  page: { fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' as const, gap: 24 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 },
  // Typography
  h1: { fontSize: 24, fontWeight: 800, color: '#0f1e4a', letterSpacing: '-0.03em', margin: 0 },
  sub: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  // Cards
  card: { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
  // Buttons
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', fontFamily: 'inherit' },
  btnIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', color: '#6b7280', transition: 'all 0.15s' },
  // Form
  label: { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '0.01em' },
  select: { width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#f9fafb', fontSize: 13.5, color: '#111827', fontFamily: 'inherit', outline: 'none' },
  input: { width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#f9fafb', fontSize: 13.5, color: '#111827', fontFamily: 'inherit', outline: 'none' },
};

export default function ActivationCodesPage() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    role: 'employee' as UserRole,
    departmentId: '',
    locationIds: [] as string[],
    shiftId: '',
    expiresIn: 7,
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [c, d, , s] = await Promise.all([getActivationCodes(), getDepartments(), getWorkLocations(), getShifts()]);
    setCodes(c); setDepartments(d); setShifts(s);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!user) return;
    try {
      await createActivationCode({
        code: '', role: form.role,
        departmentId: form.departmentId || undefined,
        locationIds: form.locationIds.length ? form.locationIds : undefined,
        shiftId: form.shiftId || undefined,
        expiresAt: addDays(new Date(), form.expiresIn),
        createdBy: user.uid,
        notes: form.notes || undefined,
      });
      toast.success('Activation code created!');
      setShowForm(false);
      setForm({ role: 'employee', departmentId: '', locationIds: [], shiftId: '', expiresIn: 7, notes: '' });
      loadData();
    } catch { toast.error('Failed to create code'); }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activation code?')) return;
    try { await deleteActivationCode(id); toast.success('Deleted'); loadData(); }
    catch { toast.error('Failed to delete'); }
  };

  const unusedCodes = codes.filter((c) => !c.isUsed);
  const usedCodes = codes.filter((c) => c.isUsed);

  const statCards = [
    { label: 'Total Codes', value: codes.length, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Available', value: unusedCodes.length, color: '#059669', bg: '#ecfdf5' },
    { label: 'Used', value: usedCodes.length, color: '#6b7280', bg: '#f9fafb' },
  ];

  return (
    <div style={s.page}>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        .row-hover:hover { background: #f8faff !important; }
        .btn-icon-hover:hover { background: #f3f4f6 !important; border-color: #d1d5db !important; }
        .copy-btn:hover { background: #eff6ff !important; color: #2563eb !important; }
        .del-btn:hover { background: #fef2f2 !important; color: #ef4444 !important; }
        .day-btn { flex:1; padding:8px 4px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all 0.15s; font-family:inherit; }
      `}</style>

      {/* Header */}
      <div style={s.row}>
        <div>
          <h1 style={s.h1}>Activation Codes</h1>
          <p style={s.sub}>Generate codes for new employees to register</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadData} style={s.btnIcon} className="btn-icon-hover" title="Refresh">
            <RefreshCcw size={15} />
          </button>
          <button onClick={() => setShowForm(true)} style={s.btnPrimary}>
            <Plus size={15} /> Generate Code
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {statCards.map((sc) => (
          <div key={sc.label} style={{ ...s.card, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: sc.color, letterSpacing: '-0.03em' }}>{sc.value}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, fontWeight: 500 }}>{sc.label}</div>
            <div style={{ width: 32, height: 3, background: sc.bg, borderRadius: 2, margin: '10px auto 0', border: `1px solid ${sc.color}22` }} />
          </div>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', animation: 'modalIn 0.2s ease' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={19} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15.5, color: '#0f1e4a', letterSpacing: '-0.02em' }}>Generate Code</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>Fill in the details below</div>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Role */}
              <div>
                <label style={s.label}>Role</label>
                <select style={s.select} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label style={s.label}>Department</label>
                <select style={s.select} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">— None —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Shift */}
              <div>
                <label style={s.label}>Shift</label>
                <select style={s.select} value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: e.target.value })}>
                  <option value="">— None —</option>
                  {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Expires */}
              <div>
                <label style={s.label}>Expires in (days)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 3, 7, 14, 30].map((d) => (
                    <button key={d} className="day-btn"
                      onClick={() => setForm({ ...form, expiresIn: d })}
                      style={{ background: form.expiresIn === d ? '#2563eb' : '#f3f4f6', color: form.expiresIn === d ? '#fff' : '#6b7280' }}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={s.label}>Notes <span style={{ color: '#d1d5db', fontWeight: 400 }}>(optional)</span></label>
                <input style={s.input} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. For John Smith – Sales dept." />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleCreate} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ ...s.card, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f1e4a', letterSpacing: '-0.01em' }}>All Codes</span>
          <span style={{ fontSize: 12, color: '#9ca3af', background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>{codes.length} total</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                {['Code', 'Role', 'Department', 'Expires', 'Status', 'Notes', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 16px', color: '#9ca3af', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '13px 16px' }}>
                        <div style={{ height: 14, background: '#f0f0f0', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Key size={20} color="#d1d5db" />
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: 13.5 }}>No codes yet. Generate one to get started.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                codes.map((code) => {
                  const dept = departments.find((d) => d.id === code.departmentId);
                  const isExpired = new Date() > new Date(code.expiresAt as unknown as string);
                  const statusColor = code.isUsed
                    ? { bg: '#f3f4f6', color: '#6b7280' }
                    : isExpired
                    ? { bg: '#fef2f2', color: '#ef4444' }
                    : { bg: '#ecfdf5', color: '#059669' };
                  const statusLabel = code.isUsed ? 'Used' : isExpired ? 'Expired' : 'Active';

                  return (
                    <tr key={code.id} className="row-hover" style={{ borderBottom: '1px solid #f5f5f5', transition: 'background 0.15s' }}>
                      <td style={{ padding: '13px 16px' }}>
                        <code style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: 15, letterSpacing: '0.08em' }}>
                          {code.code}
                        </code>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ color: '#374151', fontWeight: 500, textTransform: 'capitalize' }}>{code.role}</span>
                      </td>
                      <td style={{ padding: '13px 16px', color: '#9ca3af' }}>{dept?.name || '—'}</td>
                      <td style={{ padding: '13px 16px', color: isExpired ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap' }}>
                        {format(new Date(code.expiresAt as unknown as string), 'MMM d, yyyy')}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: statusColor.bg, color: statusColor.color }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', color: '#9ca3af', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {code.notes || '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {!code.isUsed && !isExpired && (
                            <button className="copy-btn" onClick={() => copyCode(code.code, code.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 8, color: '#9ca3af', display: 'flex', transition: 'all 0.15s' }}
                              title="Copy code">
                              {copiedId === code.id ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                            </button>
                          )}
                          <button className="del-btn" onClick={() => handleDelete(code.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 8, color: '#9ca3af', display: 'flex', transition: 'all 0.15s' }}
                            title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
