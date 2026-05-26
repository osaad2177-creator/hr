'use client';

import { useState, useEffect } from 'react';
import { Users, Search, RefreshCcw } from 'lucide-react';
import { getAllEmployees } from '@/lib/firebase/firestore';
import { Employee } from '@/lib/types/index';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllEmployees().then(e => { setEmployees(e); setLoading(false); });
  }, []);

  const filtered = employees.filter(e =>
    e.displayName.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f1e4a', margin: 0, letterSpacing: '-0.03em' }}>Employees</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{employees.length} total employees</p>
        </div>
        <button onClick={() => { setLoading(true); getAllEmployees().then(e => { setEmployees(e); setLoading(false); }); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
          style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              {['Employee', 'Email', 'Department', 'Role', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', color: '#9ca3af', fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} style={{ padding: '14px 20px' }}>
                      <div style={{ height: 14, background: '#f0f0f0', borderRadius: 6 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
                  <Users size={32} style={{ margin: '0 auto 10px', display: 'block', color: '#d1d5db' }} />
                  No employees found
                </td>
              </tr>
            ) : (
              filtered.map(emp => (
                <tr key={emp.uid} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {emp.displayName.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{emp.displayName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px', color: '#6b7280' }}>{emp.email}</td>
                  <td style={{ padding: '13px 20px', color: '#6b7280' }}>{emp.departmentId || '—'}</td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#dbeafe', color: '#1e40af', textTransform: 'capitalize' }}>{emp.role}</span>
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: emp.status === 'active' ? '#d1fae5' : '#fee2e2', color: emp.status === 'active' ? '#065f46' : '#991b1b', textTransform: 'capitalize' }}>{emp.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
