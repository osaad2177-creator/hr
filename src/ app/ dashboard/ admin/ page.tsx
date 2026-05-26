'use client';

import { useState, useEffect } from 'react';
import {
  Users, Clock, UserX, CalendarOff, TrendingUp, AlertCircle,
  CheckCircle, Timer, RefreshCcw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getDashboardStats, subscribeToTodayAttendance } from '@/lib/firebase/firestore';
import { DashboardStats, AttendanceRecord } from '@/lib/types/index';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const weeklyData = [
  { day: 'Mon', present: 42, absent: 3, late: 5 },
  { day: 'Tue', present: 45, absent: 2, late: 3 },
  { day: 'Wed', present: 40, absent: 5, late: 7 },
  { day: 'Thu', present: 44, absent: 3, late: 4 },
  { day: 'Fri', present: 38, absent: 8, late: 2 },
  { day: 'Sat', present: 20, absent: 15, late: 1 },
  { day: 'Today', present: 0, absent: 0, late: 0 },
];

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  change?: string;
  changeType?: 'up' | 'down';
  suffix?: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor, change, changeType, suffix }: StatCardProps) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 20,
      border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'none';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)';
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12.5, color: '#6b7280', fontWeight: 500, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 30, fontWeight: 800, color, margin: '6px 0 0', letterSpacing: '-0.03em' }}>
            {value}{suffix}
          </p>
          {change && (
            <p style={{ fontSize: 11.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, color: changeType === 'up' ? '#10b981' : '#ef4444' }}>
              <TrendingUp size={11} style={{ transform: changeType === 'down' ? 'rotate(180deg)' : 'none' }} />
              {change} from yesterday
            </p>
          )}
        </div>
        <div style={{ width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor, flexShrink: 0 }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

const statusBadge: Record<string, { bg: string; color: string }> = {
  present: { bg: '#d1fae5', color: '#065f46' },
  absent: { bg: '#fee2e2', color: '#991b1b' },
  late: { bg: '#fef3c7', color: '#92400e' },
  on_leave: { bg: '#dbeafe', color: '#1e40af' },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(s => { setStats(s); setLoading(false); });
    const unsubscribe = subscribeToTodayAttendance(setTodayRecords);
    return () => unsubscribe();
  }, []);

  const liveWeeklyData = weeklyData.map((d, i) =>
    i === weeklyData.length - 1
      ? { ...d, present: stats?.presentToday || 0, absent: stats?.absentToday || 0, late: stats?.lateToday || 0 }
      : d
  );

  const pieData = stats ? [
    { name: 'Present', value: stats.presentToday },
    { name: 'Absent', value: stats.absentToday },
    { name: 'Late', value: stats.lateToday },
    { name: 'On Leave', value: stats.onLeaveToday },
  ] : [];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 100, background: '#f0f0f0', borderRadius: 16, animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
        <div style={{ height: 280, background: '#f0f0f0', borderRadius: 16, animation: 'pulse 1.5s ease infinite' }} />
      </div>
    );
  }

  const cardStyle = {
    background: '#fff', borderRadius: 16,
    border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    padding: 24,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .tr-hover:hover { background: #f8faff !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f1e4a', letterSpacing: '-0.03em', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => window.location.reload()} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 16px', background: '#eff6ff', color: '#2563eb',
          border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {/* Stat Cards Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <StatCard title="Total Employees" value={stats?.totalEmployees || 0} icon={Users} color="#2563eb" bgColor="#dbeafe" change="+2" changeType="up" />
        <StatCard title="Present Today" value={stats?.presentToday || 0} icon={CheckCircle} color="#10b981" bgColor="#d1fae5" />
        <StatCard title="Absent Today" value={stats?.absentToday || 0} icon={UserX} color="#ef4444" bgColor="#fee2e2" />
        <StatCard title="Late Today" value={stats?.lateToday || 0} icon={Timer} color="#f59e0b" bgColor="#fef3c7" />
      </div>

      {/* Stat Cards Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <StatCard title="On Leave" value={stats?.onLeaveToday || 0} icon={CalendarOff} color="#8b5cf6" bgColor="#ede9fe" />
        <StatCard title="Pending Requests" value={stats?.pendingLeaveRequests || 0} icon={AlertCircle} color="#f59e0b" bgColor="#fef3c7" />
        <StatCard title="Attendance Rate" value={stats?.attendanceRate || 0} icon={TrendingUp} color="#10b981" bgColor="#d1fae5" suffix="%" />
        <StatCard title="Active Today" value={(stats?.presentToday || 0) + (stats?.lateToday || 0)} icon={Clock} color="#2563eb" bgColor="#dbeafe" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Area Chart */}
        <div style={cardStyle}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: '#0f1e4a', margin: 0, letterSpacing: '-0.01em' }}>Weekly Attendance</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>Last 7 days overview</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={liveWeeklyData}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="present" stroke="#2563eb" fill="url(#pg)" strokeWidth={2} name="Present" />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="url(#ag)" strokeWidth={2} name="Absent" />
              <Area type="monotone" dataKey="late" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Late" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div style={cardStyle}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: '#0f1e4a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Today's Status</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Real-time attendance</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {pieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[i] }} />
                  <span style={{ color: '#6b7280' }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#111827' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f1e4a', letterSpacing: '-0.01em' }}>Live Attendance Feed</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#10b981' }}>
            <div style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', animation: 'pulse 2s ease infinite' }} />
            Live
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                {['Employee', 'Check In', 'Check Out', 'Status', 'Late (min)'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 20px', color: '#9ca3af', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todayRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
                    No attendance records yet today
                  </td>
                </tr>
              ) : todayRecords.slice(0, 10).map((record) => {
                const badge = statusBadge[record.status] || { bg: '#f3f4f6', color: '#6b7280' };
                return (
                  <tr key={record.id} className="tr-hover" style={{ borderBottom: '1px solid #f5f5f5', transition: 'background 0.15s' }}>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, background: '#dbeafe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: 12 }}>
                          {record.employeeName?.charAt(0) || '?'}
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{record.employeeName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#6b7280' }}>
                      {record.checkIn?.time ? new Date(record.checkIn.time as unknown as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '13px 20px', color: '#6b7280' }}>
                      {record.checkOut?.time ? new Date(record.checkOut.time as unknown as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color }}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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
