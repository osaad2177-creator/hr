'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Loader2, ArrowRight, Shield, Clock, Users, BarChart3 } from 'lucide-react';
import { loginUser } from '@/lib/firebase/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Clock, label: 'Real-time Tracking', desc: 'GPS-verified attendance in seconds' },
  { icon: Users, label: 'Team Management', desc: 'Manage departments & shifts easily' },
  { icon: BarChart3, label: 'Live Analytics', desc: 'Insights updated every minute' },
  { icon: Shield, label: 'Device-Locked', desc: 'Secure, fraud-proof check-ins' },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const result = await loginUser(data.email, data.password);
      if (result.success && result.user) {
        toast.success('Welcome back!');
        router.push(`/dashboard/${result.user.role}`);
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* ── LEFT PANEL ─────────────────────────────── */}
      <div className="login-left">
        {/* Noise overlay */}
        <div className="login-noise" />

        {/* Orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="login-left-inner">
          {/* Logo */}
          <div className="brand">
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="10" y1="14" x2="14" y2="14" />
              </svg>
            </div>
            <div>
              <div className="brand-name">HR Attendance</div>
              <div className="brand-sub">Enterprise System</div>
            </div>
          </div>

          {/* Headline */}
          <div className="hero-text">
            <h1>Manage your team<br /><span>with confidence.</span></h1>
            <p>Real-time attendance, leave management, and employee monitoring — all in one place.</p>
          </div>

          {/* Feature cards */}
          <div className="feature-grid">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="feature-card">
                <div className="feature-icon">
                  <Icon size={16} />
                </div>
                <div>
                  <div className="feature-label">{label}</div>
                  <div className="feature-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom stat bar */}
          <div className="stat-bar">
            {[['99.9%', 'Uptime'], ['<1s', 'Check-in'], ['256-bit', 'Encryption']].map(([val, lbl]) => (
              <div key={lbl} className="stat-item">
                <span className="stat-val">{val}</span>
                <span className="stat-lbl">{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────── */}
      <div className="login-right">
        <div className="login-form-wrap">
          {/* Mobile logo */}
          <div className="mobile-brand">
            <div className="brand-icon small">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="10" y1="14" x2="14" y2="14" />
              </svg>
            </div>
            <span>HR Attendance</span>
          </div>

          <div className="form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {/* Email */}
            <div className="field">
              <label>Email address</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </div>

            {/* Password */}
            <div className="field">
              <div className="field-row">
                <label>Password</label>
                <Link href="/auth/forgot-password" className="forgot-link">Forgot password?</Link>
              </div>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading} className="submit-btn">
              {isLoading ? (
                <><Loader2 size={17} className="spin" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={17} /></>
              )}
            </button>
          </form>

          <div className="form-footer">
            <p>New employee? <Link href="/auth/register" className="register-link">Register with activation code</Link></p>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Reset & Root ─────────────────────────── */
        .login-root {
          display: flex;
          min-height: 100vh;
          background: #f8f9fb;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── LEFT PANEL ───────────────────────────── */
        .login-left {
          position: relative;
          width: 52%;
          min-height: 100vh;
          background: linear-gradient(145deg, #0f1e4a 0%, #1a3490 45%, #1d4ed8 100%);
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        @media (max-width: 900px) {
          .login-left { display: none; }
          .login-right { width: 100%; }
        }

        .login-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.4;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .orb-1 { width: 400px; height: 400px; background: rgba(99,170,255,0.18); top: -100px; right: -80px; }
        .orb-2 { width: 300px; height: 300px; background: rgba(59,130,246,0.22); bottom: -60px; left: -60px; }
        .orb-3 { width: 200px; height: 200px; background: rgba(147,197,253,0.12); top: 50%; left: 40%; }

        .login-left-inner {
          position: relative;
          z-index: 2;
          padding: 56px 52px;
          display: flex;
          flex-direction: column;
          gap: 44px;
          width: 100%;
        }

        /* Brand */
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand-icon {
          width: 46px; height: 46px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          backdrop-filter: blur(8px);
        }
        .brand-icon.small { width: 36px; height: 36px; border-radius: 10px; }
        .brand-name { font-size: 1.15rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
        .brand-sub { font-size: 0.75rem; color: rgba(255,255,255,0.55); margin-top: 1px; }

        /* Hero text */
        .hero-text h1 {
          font-size: clamp(2rem, 3vw, 2.75rem);
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin: 0 0 16px;
        }
        .hero-text h1 span { color: rgba(147,197,253,0.9); }
        .hero-text p {
          font-size: 1rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
          max-width: 380px;
        }

        /* Feature grid */
        .feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .feature-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          backdrop-filter: blur(8px);
          transition: background 0.2s;
        }
        .feature-card:hover { background: rgba(255,255,255,0.11); }
        .feature-icon {
          width: 32px; height: 32px; flex-shrink: 0;
          background: rgba(255,255,255,0.12);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #93c5fd;
        }
        .feature-label { font-size: 0.82rem; font-weight: 600; color: #fff; }
        .feature-desc { font-size: 0.73rem; color: rgba(255,255,255,0.5); margin-top: 2px; line-height: 1.4; }

        /* Stat bar */
        .stat-bar {
          display: flex;
          gap: 0;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          overflow: hidden;
        }
        .stat-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 12px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .stat-item:last-child { border-right: none; }
        .stat-val { font-size: 1.1rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
        .stat-lbl { font-size: 0.7rem; color: rgba(255,255,255,0.45); margin-top: 2px; }

        /* ── RIGHT PANEL ──────────────────────────── */
        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: #f8f9fb;
        }

        .login-form-wrap {
          width: 100%;
          max-width: 420px;
        }

        .mobile-brand {
          display: none;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
          font-weight: 700;
          font-size: 1.05rem;
          color: #1e3a8a;
        }
        .mobile-brand .brand-icon {
          background: #1d4ed8;
          border: none;
        }
        @media (max-width: 900px) {
          .mobile-brand { display: flex; }
        }

        .form-header { margin-bottom: 32px; }
        .form-header h2 {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0f1e4a;
          letter-spacing: -0.03em;
          margin: 0 0 6px;
        }
        .form-header p {
          font-size: 0.9rem;
          color: #6b7280;
        }

        /* Form */
        .auth-form { display: flex; flex-direction: column; gap: 20px; }

        .field { display: flex; flex-direction: column; gap: 7px; }
        .field label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.01em;
        }
        .field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: #9ca3af;
          pointer-events: none;
        }
        .input-wrap input {
          width: 100%;
          padding: 13px 14px 13px 42px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          font-size: 0.92rem;
          color: #111827;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .input-wrap input::placeholder { color: #d1d5db; }
        .input-wrap input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }

        .eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.15s;
        }
        .eye-btn:hover { color: #374151; }

        .forgot-link {
          font-size: 0.78rem;
          font-weight: 600;
          color: #2563eb;
          text-decoration: none;
          transition: color 0.15s;
        }
        .forgot-link:hover { color: #1d4ed8; }

        .field-error {
          font-size: 0.75rem;
          color: #ef4444;
          font-weight: 500;
        }

        /* Submit button */
        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          font-family: inherit;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          letter-spacing: -0.01em;
          box-shadow: 0 4px 16px rgba(37,99,235,0.35);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          margin-top: 4px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37,99,235,0.45);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Footer */
        .form-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 0.85rem;
          color: #6b7280;
          padding-top: 24px;
          border-top: 1px solid #f0f0f0;
        }
        .register-link {
          color: #2563eb;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.15s;
        }
        .register-link:hover { color: #1d4ed8; }
      `}</style>
    </div>
  );
}
