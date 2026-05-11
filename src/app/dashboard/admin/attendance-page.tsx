'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCcw, Download, Filter } from 'lucide-react';
import { getAttendanceRecords } from '@/lib/firebase/firestore';
import { AttendanceRecord } from '@/lib/types';

const statusColors: Record<string, { bg: string; color: string }> = {
  present: { bg: '#d1fae5', color: '#065f46' },
  absent: { bg: '#fee2e2', color: '#991b1b' },
  late: { bg: '#fef3c7', color: '#92400e' },
  on_leave: { bg: '#dbeafe', color: '#1e40af' },
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const data = await getAttendanceRecords({
      startDate: dateFilter || undefined,
      endDate: dateFilter || undefined,
      status: statusFilter as AttendanceRecord['status'] || undefined,
    });
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [dateFilter, statusFilter]);

  const filtered = records.filter(r =>
    r.employeeName?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (val: unknown) => {
    if (!val) return '—';
    try { return new Date(val as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} .tr-h:hover{background:#f8faff!important}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f1e4a', margin: 0, letterSpacing: '-0.03em' }}>Attendance</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{records.length} records found</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..."
            style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#374151' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#374151' }}>
          <option value="">All Statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="on_leave">On Leave</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f1e4a' }}>Attendance Records</span>
          <span style={{ fontSize: 12, color: '#9ca3af', background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>{filtered.length} records</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                {['Employee', 'Date', 'Check In', 'Check Out', 'Work Time', 'Status', 'Late (min)'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 20px', color: '#9ca3af', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '13px 20px' }}>
                        <div style={{ height: 14, background: '#f0f0f0', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
                    No attendance records found
                  </td>
                </tr>
              ) : filtered.map(record => {
                const badge = statusColors[record.status] || { bg: '#f3f4f6', color: '#6b7280' };
                const workH = Math.floor((record.totalWorkMinutes || 0) / 60);
                const workM = (record.totalWorkMinutes || 0) % 60;
                return (
                  <tr key={record.id} className="tr-h" style={{ borderBottom: '1px solid #f5f5f5', transition: 'background 0.15s' }}>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, background: '#dbeafe', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {record.employeeName?.charAt(0) || '?'}
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{record.employeeName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#6b7280', whiteSpace: 'nowrap' }}>{record.date}</td>
                    <td style={{ padding: '13px 20px', color: '#6b7280' }}>{formatTime(record.checkIn?.time)}</td>
                    <td style={{ padding: '13px 20px', color: '#6b7280' }}>{formatTime(record.checkOut?.time)}</td>
                    <td style={{ padding: '13px 20px', color: '#2563eb', fontWeight: 600 }}>
                      {record.totalWorkMinutes > 0 ? `${workH}h ${workM}m` : '—'}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: record.lateMinutes > 0 ? '#f59e0b' : '#9ca3af', fontWeight: record.lateMinutes > 0 ? 600 : 400 }}>
                      {record.lateMinutes > 0 ? `+${record.lateMinutes}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
