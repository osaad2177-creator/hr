'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Clock, UserX, CalendarOff, TrendingUp, AlertCircle,
  CheckCircle, Timer, RefreshCcw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { getDashboardStats, getAttendanceRecords } from '@/lib/firebase/firestore';
import { DashboardStats, AttendanceRecord } from '@/lib/types';
import { subscribeToTodayAttendance } from '@/lib/firebase/firestore';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const weeklyData = [
  { day: 'Mon', present: 42, absent: 3, late: 5 },
  { day: 'Tue', present: 45, absent: 2, late: 3 },
  { day: 'Wed', present: 40, absent: 5, late: 7 },
  { day: 'Thu', present: 44, absent: 3, late: 4 },
  { day: 'Fri', present: 38, absent: 8, late: 2 },
  { day: 'Sat', present: 20, absent: 15, late: 1 },
  { day: 'Today', present: 0, absent: 0, late: 0 }, // will be updated
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1" style={{ color }}>
            {value}{suffix}
          </p>
          {change && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${changeType === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
              <TrendingUp size={12} className={changeType === 'down' ? 'rotate-180' : ''} />
              {change} from yesterday
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const s = await getDashboardStats();
      setStats(s);
      setLoading(false);
    };
    load();

    const unsubscribe = subscribeToTodayAttendance((records) => {
      setTodayRecords(records);
    });
    return () => unsubscribe();
  }, []);

  const pieData = stats ? [
    { name: 'Present', value: stats.presentToday },
    { name: 'Absent', value: stats.absentToday },
    { name: 'Late', value: stats.lateToday },
    { name: 'On Leave', value: stats.onLeaveToday },
  ] : [];

  const liveWeeklyData = weeklyData.map((d, i) =>
    i === weeklyData.length - 1
      ? { ...d, present: stats?.presentToday || 0, absent: stats?.absentToday || 0, late: stats?.lateToday || 0 }
      : d
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
          <RefreshCcw size={15} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={stats?.totalEmployees || 0}
          icon={Users} color="#2563eb" bgColor="#dbeafe" change="+2" changeType="up" />
        <StatCard title="Present Today" value={stats?.presentToday || 0}
          icon={CheckCircle} color="#10b981" bgColor="#d1fae5" />
        <StatCard title="Absent Today" value={stats?.absentToday || 0}
          icon={UserX} color="#ef4444" bgColor="#fee2e2" />
        <StatCard title="Late Today" value={stats?.lateToday || 0}
          icon={Timer} color="#f59e0b" bgColor="#fef3c7" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="On Leave" value={stats?.onLeaveToday || 0}
          icon={CalendarOff} color="#8b5cf6" bgColor="#ede9fe" />
        <StatCard title="Pending Requests" value={stats?.pendingLeaveRequests || 0}
          icon={AlertCircle} color="#f59e0b" bgColor="#fef3c7" />
        <StatCard title="Attendance Rate" value={stats?.attendanceRate || 0}
          icon={TrendingUp} color="#10b981" bgColor="#d1fae5" suffix="%" />
        <StatCard title="Active Today" value={(stats?.presentToday || 0) + (stats?.lateToday || 0)}
          icon={Clock} color="#2563eb" bgColor="#dbeafe" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Area Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Weekly Attendance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 days overview</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={liveWeeklyData}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="present" stroke="#2563eb" fill="url(#presentGrad)" strokeWidth={2} name="Present" />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="url(#absentGrad)" strokeWidth={2} name="Absent" />
              <Area type="monotone" dataKey="late" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Late" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Status Pie */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Today's Status</h2>
          <p className="text-xs text-gray-400 mb-4">Real-time attendance</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                paddingAngle={3} dataKey="value">
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Live Attendance Feed</h2>
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2.5 pr-4 text-gray-400 font-medium">Employee</th>
                <th className="text-left py-2.5 pr-4 text-gray-400 font-medium">Check In</th>
                <th className="text-left py-2.5 pr-4 text-gray-400 font-medium">Check Out</th>
                <th className="text-left py-2.5 pr-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-2.5 text-gray-400 font-medium">Late (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {todayRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No attendance records yet today</td>
                </tr>
              ) : (
                todayRecords.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
                          {record.employeeName?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{record.employeeName}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {record.checkIn?.time
                        ? new Date(record.checkIn.time as unknown as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                      {record.checkOut?.time
                        ? new Date(record.checkOut.time as unknown as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-${record.status}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={record.lateMinutes > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                        {record.lateMinutes > 0 ? `+${record.lateMinutes}` : '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
