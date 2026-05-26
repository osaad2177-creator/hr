'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Clock, CalendarDays, Settings,
  Bell, LogOut, Menu, X, ChevronLeft, Building2, Map, Shield,
  BarChart3, Key, Megaphone, Calendar, Sun, Moon,
  UserCheck, Briefcase, ClipboardList, QrCode, Activity,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { logoutUser } from '@/lib/firebase/auth';
import { subscribeToNotifications } from '@/lib/firebase/firestore';
import { Notification } from '@/lib/types/index';
import toast from 'react-hot-toast';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  const currentLabel = navItems.find((n) => n.href === pathname)?.label || 'Dashboard';
  const sidebarWidth = sidebarOpen ? 260 : 72;

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
          <Shield size={18} color="#fff" />
        </div>
        {(sidebarOpen || mobile) && (
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, letterSpacing: '-0.01em' }}>HR Attendance</div>
            <div style={{ color: 'rgba(147,197,253,0.8)', fontSize: 11, textTransform: 'capitalize', marginTop: 1 }}>{role} Portal</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                textDecoration: 'none', fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                color: isActive ? '#1e3a8a' : 'rgba(255,255,255,0.7)',
                background: isActive ? '#fff' : 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {(sidebarOpen || mobile) && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: 12 }}>
        {(sidebarOpen || mobile) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {user.displayName.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName}</div>
              <div style={{ color: 'rgba(147,197,253,0.8)', fontSize: 11, textTransform: 'capitalize' }}>{role}</div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(147,197,253,0.8)', padding: 4, borderRadius: 6, display: 'flex' }}>
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(147,197,253,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
            <LogOut size={17} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f8', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(-260px) } to { transform: translateX(0) } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        @media (max-width: 1024px) {
          .desktop-sidebar { display: none !important; }
          .main-content { margin-left: 0 !important; }
        }
        @media (min-width: 1025px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar" style={{
        position: 'fixed', left: 0, top: 0, height: '100%', zIndex: 40,
        width: sidebarWidth, transition: 'width 0.3s ease',
        background: 'linear-gradient(180deg, #0f1e4a 0%, #1a3490 50%, #1d4ed8 100%)',
        overflow: 'hidden',
      }}>
        <SidebarContent />
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
          position: 'absolute', right: -12, top: 80,
          width: 24, height: 24, background: '#2563eb', borderRadius: '50%',
          border: '2px solid #fff', color: '#fff', display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'background 0.15s',
        }}>
          <ChevronLeft size={12} style={{ transform: sidebarOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, animation: 'fadeIn 0.2s ease' }}
          onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <aside style={{
          position: 'fixed', left: 0, top: 0, height: '100%', width: 260, zIndex: 50,
          background: 'linear-gradient(180deg, #0f1e4a 0%, #1a3490 50%, #1d4ed8 100%)',
          animation: 'slideIn 0.25s ease',
        }}>
          <SidebarContent mobile />
        </aside>
      )}

      {/* Main */}
      <main className="main-content" style={{ flex: 1, marginLeft: sidebarWidth, transition: 'margin-left 0.3s ease', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Topbar */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '0 24px', height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 8, borderRadius: 8, color: '#6b7280', display: 'flex',
            }}>
              <Menu size={20} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 17, color: '#111827', letterSpacing: '-0.02em' }}>{currentLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Dark mode */}
            <button onClick={toggleDark} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 10, color: '#6b7280', display: 'flex', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(!notifOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 10, color: '#6b7280', display: 'flex', position: 'relative', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, background: '#ef4444', color: '#fff', fontSize: 10, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 320, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Notifications</span>
                    <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={16} /></button>
                  </div>
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No notifications</div>
                    ) : notifications.slice(0, 10).map((n) => (
                      <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f9f9f9', background: !n.isRead ? '#eff6ff' : 'transparent' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{n.title}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: '#e5e7eb', margin: '0 6px' }} />

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                {user.displayName.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{user.displayName}</span>
                <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, padding: 24 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
