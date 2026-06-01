'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, User, Mail, Phone, Lock, Loader2, ArrowRight } from 'lucide-react';
import { registerEmployee, validateActivationCode } from '@/lib/firebase/auth';

const registerSchema = z.object({
  activationCode: z.string().min(6, 'Enter your activation code').max(12),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(9, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type RegisterForm = z.infer<typeof registerSchema>;

const inputStyle = {
  width: '100%', padding: '11px 14px 11px 42px',
  border: '1.5px solid #e5e7eb', borderRadius: 12,
  background: '#f9fafb', fontSize: 14, color: '#111827',
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  display: 'block', fontSize: 12.5, fontWeight: 600,
  color: '#374151', marginBottom: 6, letterSpacing: '0.01em',
};

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const activationCode = watch('activationCode');

  const checkCode = async () => {
    if (!activationCode || activationCode.length < 6) return;
    setCheckingCode(true);
    const result = await validateActivationCode(activationCode);
    setCodeValid(!!result);
    setCheckingCode(false);
    if (!result) toast.error('Invalid or expired activation code');
    else toast.success('Activation code valid!');
  };

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const result = await registerEmployee(data.activationCode, data.email, data.password, data.displayName, data.phoneNumber);
      if (result.success) {
        toast.success('Account created! Redirecting...');
        setTimeout(() => router.push('/auth/login'), 1500);
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .input-focus:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
      `}</style>

      <div style={{ width: '100%', maxWidth: 500 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f1e4a', letterSpacing: '-0.03em', margin: '0 0 8px' }}>Create Account</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Register using your activation code from HR</p>
        </div>

        {/* Form Card */}
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Activation Code */}
            <div>
              <label style={labelStyle}>Activation Code <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input {...register('activationCode')} placeholder="XXXX-XXXX" className="input-focus"
                    style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                </div>
                <button type="button" onClick={checkCode} disabled={checkingCode} style={{
                  padding: '11px 16px', background: '#2563eb', color: '#fff', border: 'none',
                  borderRadius: 12, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}>
                  {checkingCode ? '...' : 'Verify'}
                </button>
              </div>
              {codeValid === true && <p style={{ fontSize: 12, color: '#10b981', marginTop: 5, fontWeight: 500 }}>✓ Code verified successfully</p>}
              {codeValid === false && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 5 }}>Invalid or expired activation code</p>}
              {errors.activationCode && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 5 }}>{errors.activationCode.message}</p>}
            </div>

            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input {...register('displayName')} placeholder="John Doe" className="input-focus" style={inputStyle} />
              </div>
              {errors.displayName && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 5 }}>{errors.displayName.message}</p>}
            </div>

            {/* Email & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input {...register('email')} type="email" placeholder="you@company.com" className="input-focus"
                    style={{ ...inputStyle, fontSize: 13, padding: '11px 12px 11px 36px' }} />
                </div>
                {errors.email && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.email.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input {...register('phoneNumber')} placeholder="+1 234 567" className="input-focus"
                    style={{ ...inputStyle, fontSize: 13, padding: '11px 12px 11px 36px' }} />
                </div>
                {errors.phoneNumber && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.phoneNumber.message}</p>}
              </div>
            </div>

            {/* Passwords */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="input-focus"
                    style={{ ...inputStyle, fontSize: 13, padding: '11px 36px 11px 36px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.password.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Confirm</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input {...register('confirmPassword')} type="password" placeholder="••••••••" className="input-focus"
                    style={{ ...inputStyle, fontSize: 13, padding: '11px 12px 11px 36px' }} />
                </div>
                {errors.confirmPassword && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px', marginTop: 4,
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              color: '#fff', border: 'none', borderRadius: 14,
              fontWeight: 700, fontSize: 15, cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(37,99,235,0.35)', opacity: isLoading ? 0.7 : 1,
              fontFamily: 'inherit', transition: 'opacity 0.15s',
            }}>
              {isLoading
                ? <><div style={{ width: 17, height: 17, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Creating account...</>
                : <>Create Account <ArrowRight size={16} /></>
              }
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 13.5, color: '#6b7280' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
