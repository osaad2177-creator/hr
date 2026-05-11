'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Trash2, RefreshCcw, Check, Calendar, Key } from 'lucide-react';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
  getActivationCodes, createActivationCode, deleteActivationCode,
  getDepartments, getWorkLocations, getShifts,
} from '@/lib/firebase/firestore';
import { ActivationCode, Department, WorkLocation, Shift, UserRole } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export default function ActivationCodesPage() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    role: 'employee' as UserRole,
    departmentId: '',
    locationIds: [] as string[],
    shiftId: '',
    expiresIn: 7, // days
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [c, d, l, s] = await Promise.all([
      getActivationCodes(),
      getDepartments(),
      getWorkLocations(),
      getShifts(),
    ]);
    setCodes(c);
    setDepartments(d);
    setLocations(l);
    setShifts(s);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!user) return;
    try {
      await createActivationCode({
        code: '', // generated inside
        role: form.role,
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
    } catch {
      toast.error('Failed to create code');
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activation code?')) return;
    try {
      await deleteActivationCode(id);
      toast.success('Code deleted');
      loadData();
    } catch {
      toast.error('Failed to delete code');
    }
  };

  const unusedCodes = codes.filter((c) => !c.isUsed);
  const usedCodes = codes.filter((c) => c.isUsed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activation Codes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Generate codes for new employees to register</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RefreshCcw size={16} className="text-gray-500" />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors shadow-lg shadow-blue-500/20">
            <Plus size={16} />
            Generate Code
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Codes', value: codes.length, color: 'text-blue-600' },
          { label: 'Available', value: unusedCodes.length, color: 'text-emerald-600' },
          { label: 'Used', value: usedCodes.length, color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-border/50 p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Key size={20} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Generate Activation Code</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Department</label>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— None —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Shift</label>
                <select value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— None —</option>
                  {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Expires in (days)
                </label>
                <div className="flex gap-2">
                  {[1, 3, 7, 14, 30].map((d) => (
                    <button key={d} onClick={() => setForm({ ...form, expiresIn: d })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        form.expiresIn === d
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      }`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. For John Smith - Sales department"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
                Generate
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Codes Table */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="font-semibold text-gray-900 dark:text-white">All Codes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-border/50">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Code</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Department</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Expires</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Notes</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No activation codes yet. Generate one to get started.
                  </td>
                </tr>
              ) : (
                codes.map((code) => {
                  const dept = departments.find((d) => d.id === code.departmentId);
                  const isExpired = new Date() > new Date(code.expiresAt as unknown as string);
                  return (
                    <tr key={code.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <code className="font-mono font-bold text-blue-600 dark:text-blue-400 text-base tracking-widest">
                          {code.code}
                        </code>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="capitalize text-gray-700 dark:text-gray-300">{code.role}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400">
                        {dept?.name || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm ${isExpired ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          {format(new Date(code.expiresAt as unknown as string), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          code.isUsed ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                          isExpired ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {code.isUsed ? 'Used' : isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs max-w-[150px] truncate">
                        {code.notes || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {!code.isUsed && !isExpired && (
                            <button onClick={() => copyCode(code.code, code.id)}
                              className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-gray-400 hover:text-blue-600">
                              {copiedId === code.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                            </button>
                          )}
                          <button onClick={() => handleDelete(code.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-gray-400 hover:text-red-600">
                            <Trash2 size={15} />
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
