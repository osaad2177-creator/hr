'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Clock, CalendarDays, FileText, Settings,
  Bell, LogOut, Menu, X, ChevronLeft, Building2, Map, Shield,
  BarChart3, Key, Megaphone, Calendar, Sun, Moon, Globe,
  UserCheck, Briefcase, ClipboardList, QrCode, Activity,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logoutUser } from '@/lib/firebase/auth';
import { subscribeToNotifications } from '@/lib/firebase/firestore';
import { Notification } from '@/lib/types';
import toast from 'react-hot-toast';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  badge?: number;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToNotifications(user.uid, setNotifications);
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push('/auth/login');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const role = user.role;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const navItems: NavItem[] = [
    { href: `/dashboard/${role}`, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
    { href: `/dashboard/${role}/employees`, label: 'Employees', icon: Users, roles: ['admin', 'manager'] },
    { href: `/dashboard/${role}/attendance`, label: 'Attendance', icon: Clock, roles: ['admin', 'manager', 'employee'] },
    { href: `/dashboard/${role}/leave`, label: 'Leave Requests', icon: CalendarDays, roles: ['admin', 'manager', 'employee'] },
    { href: `/dashboard/${role}/check-in`, label: 'Check In/Out', icon: UserCheck, roles: ['employee'] },
    { href: `/dashboard/${role}/locations`, label: 'Work Locations', icon: Map, roles: ['admin'] },
    { href: `/dashboard/${role}/departments`, label: 'Departments', icon: Building2, roles: ['admin'] },
    { href: `/dashboard/${role}/shifts`, label: 'Shifts', icon: Briefcase, roles: ['admin'] },
    { href: `/dashboard/${role}/holidays`, label: 'Holidays', icon: Calendar, roles: ['admin'] },
    { href: `/dashboard/${role}/announcements`, label: 'Announcements', icon: Megaphone, roles: ['admin', 'manager'] },
    { href: `/dashboard/${role}/activation-codes`, label: 'Activation Codes', icon: Key, roles: ['admin'] },
    { href: `/dashboard/${role}/reports`, label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { href: `/dashboard/${role}/audit-logs`, label: 'Audit Logs', icon: ClipboardList, roles: ['admin'] },
    { href: `/dashboard/${role}/qr-attendance`, label: 'QR Attendance', icon: QrCode, roles: ['admin', 'manager'] },
    { href: `/dashboard/${role}/activity`, label: 'Activity', icon: Activity, roles: ['admin', 'manager'] },
    { href: `/dashboard/${role}/settings`, label: 'Settings', icon: Settings, roles: ['admin'] },
  ].filter((item) => item.roles.includes(role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-tight">HR Attendance</p>
            <p className="text-blue-300 text-xs capitalize">{role} Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}>
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="flex-1 truncate">{item.label}</span>}
                {sidebarOpen && item.badge && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      <div className="border-t border-white/10 p-4">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user.displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-blue-300 text-xs capitalize">{role}</p>
            </div>
            <button onClick={handleLogout} className="text-blue-300 hover:text-white transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="sidebar-link w-full justify-center">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 transition-all duration-300"
        style={{
          width: sidebarOpen ? '260px' : '72px',
          background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
        }}>
        <SidebarContent />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-blue-600 rounded-full border-2 border-white text-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors">
          <ChevronLeft size={12} className={`transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-64 z-50 lg:hidden flex flex-col"
              style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)' }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className="flex-1 min-h-screen flex flex-col transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '260px' : '72px' }}
      >
        {/* Topbar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="font-semibold text-gray-800 dark:text-gray-200 text-lg hidden sm:block">
              {navItems.find((n) => n.href === pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button onClick={toggleDark}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors relative">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Notifications</span>
                    <button onClick={() => setNotifOpen(false)}><X size={16} className="text-gray-400" /></button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">No notifications</div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id}
                          className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {user.displayName.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">{user.displayName}</p>
                <p className="text-xs text-gray-400 capitalize">{role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6">
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
