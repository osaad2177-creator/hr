'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Camera, CheckCircle, AlertCircle, Loader2, Navigation } from 'lucide-react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { getAttendanceByDate, checkIn, checkOut, getWorkLocations, getShifts, getEmployee } from '@/lib/firebase/firestore';
import {
  getCurrentPosition, validateLocation, buildAttendanceEvent,
  calculateLateMinutes, calculateEarlyLeaveMinutes, formatWorkDuration,
} from '@/lib/utils/attendance';
import { AttendanceRecord, WorkLocation, Shift } from '@/lib/types';

export default function CheckInPage() {
  const { user } = useAuth();
  const webcamRef = useRef<Webcam>(null);

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [employeeShift, setEmployeeShift] = useState<Shift | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [position, setPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'error'>('idle');
  const [nearestLocation, setNearestLocation] = useState<WorkLocation | null>(null);
  const [distance, setDistance] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [record, locations, employee] = await Promise.all([
        getAttendanceByDate(user.uid, today),
        getWorkLocations(),
        getEmployee(user.uid),
      ]);
      setTodayRecord(record);
      setWorkLocations(locations);
      if (employee?.shiftId) {
        const shifts = await getShifts();
        const shift = shifts.find((s) => s.id === employee.shiftId) || null;
        setEmployeeShift(shift);
      }
      setInitializing(false);
    };
    init();
  }, [user]);

  const checkLocation = async () => {
    setLocationStatus('checking');
    try {
      const pos = await getCurrentPosition();
      setPosition(pos);
      const validation = validateLocation(pos, workLocations);
      setNearestLocation(validation.nearestLocation);
      setDistance(validation.distance);
      setLocationStatus(validation.isValid ? 'valid' : 'invalid');
    } catch {
      setLocationStatus('error');
      toast.error('Could not get your location. Please enable GPS.');
    }
  };

  const capturePhoto = () => {
    const photo = webcamRef.current?.getScreenshot();
    if (photo) { setCapturedPhoto(photo); setShowCamera(false); }
  };

  const handleCheckIn = async () => {
    if (!user || !position || locationStatus !== 'valid') {
      toast.error('Please verify your location first'); return;
    }
    setLoading(true);
    try {
      const employee = await getEmployee(user.uid);
      if (!employee) throw new Error('Employee data not found');
      const event = await buildAttendanceEvent(position, capturedPhoto || undefined);
      const lateMinutes = employeeShift ? calculateLateMinutes(new Date(), employeeShift.startTime, employeeShift.graceMinutes) : 0;
      await checkIn(user.uid, user.displayName, employee.departmentId, employee.shiftId, nearestLocation?.id || '', event, lateMinutes);
      const today = new Date().toISOString().split('T')[0];
      setTodayRecord(await getAttendanceByDate(user.uid, today));
      toast.success(lateMinutes > 0 ? `Checked in (${lateMinutes} min late)` : 'Checked in! Have a great day.');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Check-in failed');
    } finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!user || !todayRecord?.id || !position) {
      toast.error('Please verify your location first'); return;
    }
    setLoading(true);
    try {
      const event = await buildAttendanceEvent(position, undefined);
      const earlyLeave = employeeShift ? calculateEarlyLeaveMinutes(new Date(), employeeShift.endTime) : 0;
      const checkInTime = todayRecord.checkIn?.time ? new Date(todayRecord.checkIn.time as unknown as string) : new Date();
      await checkOut(todayRecord.id, event, checkInTime, earlyLeave);
      const today = new Date().toISOString().split('T')[0];
      setTodayRecord(await getAttendanceByDate(user.uid, today));
      toast.success('Checked out! See you tomorrow.');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Check-out failed');
    } finally { setLoading(false); }
  };

  if (initializing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const hasCheckedIn = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;
  const workMinutes = todayRecord?.totalWorkMinutes || 0;

  const card = {
    background: '#fff', borderRadius: 20,
    border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', padding: 20,
  };

  const locColors = {
    valid: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
    invalid: { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
    error: { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Clock */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)',
        borderRadius: 24, padding: '32px 24px', textAlign: 'center',
        boxShadow: '0 12px 40px rgba(29,78,216,0.25)',
      }}>
        <p style={{ fontSize: 12, color: 'rgba(147,197,253,0.8)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        {employeeShift && (
          <p style={{ fontSize: 13, color: 'rgba(147,197,253,0.8)', marginTop: 10 }}>
            Shift: {employeeShift.name} ({employeeShift.startTime} – {employeeShift.endTime})
          </p>
        )}
      </div>

      {/* Today's Record */}
      {hasCheckedIn && (
        <div style={card}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: '#0f1e4a', margin: '0 0 16px', letterSpacing: '-0.01em' }}>Today's Record</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
            {[
              { label: 'Check In', value: new Date(todayRecord!.checkIn!.time as unknown as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), color: '#10b981' },
              { label: 'Check Out', value: hasCheckedOut ? new Date(todayRecord!.checkOut!.time as unknown as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--', color: hasCheckedOut ? '#ef4444' : '#9ca3af' },
              { label: 'Work Time', value: hasCheckedOut ? formatWorkDuration(workMinutes) : 'Active', color: '#2563eb' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontWeight: 700, color, fontSize: 15, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          {todayRecord!.lateMinutes > 0 && (
            <div style={{ marginTop: 12, padding: '8px 14px', background: '#fef3c7', borderRadius: 12, color: '#92400e', fontSize: 13, textAlign: 'center', fontWeight: 500 }}>
              ⚠ Late by {todayRecord!.lateMinutes} minutes
            </div>
          )}
        </div>
      )}

      {/* Location */}
      <div style={card}>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: '#0f1e4a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
          <Navigation size={16} color="#2563eb" /> Location Verification
        </h3>
        <button onClick={checkLocation} disabled={locationStatus === 'checking'} style={{
          width: '100%', padding: '12px', border: '2px dashed #e5e7eb', borderRadius: 14,
          background: 'none', cursor: locationStatus === 'checking' ? 'not-allowed' : 'pointer',
          color: '#6b7280', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { if (locationStatus !== 'checking') { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.color = '#2563eb'; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
          {locationStatus === 'checking'
            ? <><div style={{ width: 16, height: 16, border: '2px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Getting location...</>
            : <><MapPin size={16} /> {locationStatus === 'idle' ? 'Check My Location' : 'Re-check Location'}</>
          }
        </button>

        {locationStatus !== 'idle' && locationStatus !== 'checking' && (() => {
          const c = locColors[locationStatus as keyof typeof locColors] || locColors.error;
          return (
            <div style={{ marginTop: 12, padding: '12px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {locationStatus === 'valid'
                ? <CheckCircle size={17} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                : <AlertCircle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              }
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: c.color, margin: 0 }}>
                  {locationStatus === 'valid' ? 'Location verified!' : 'Outside work area'}
                </p>
                {nearestLocation && (
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {nearestLocation.name} — {distance}m away
                    {locationStatus === 'invalid' && ` (max: ${nearestLocation.radius}m)`}
                  </p>
                )}
                {locationStatus === 'error' && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Enable GPS and try again</p>}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Camera */}
      <div style={card}>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: '#0f1e4a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={16} color="#2563eb" /> Selfie Verification
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>
        </h3>
        {capturedPhoto ? (
          <div style={{ position: 'relative' }}>
            <img src={capturedPhoto} alt="Selfie" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12 }} />
            <button onClick={() => setCapturedPhoto(null)} style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Retake
            </button>
          </div>
        ) : showCamera ? (
          <div style={{ position: 'relative' }}>
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" style={{ width: '100%', height: 192, objectFit: 'cover', borderRadius: 12 }} />
            <button onClick={capturePhoto} style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', padding: '8px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Capture
            </button>
          </div>
        ) : (
          <button onClick={() => setShowCamera(true)} style={{ width: '100%', padding: 12, border: '2px dashed #e5e7eb', borderRadius: 14, background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
            <Camera size={15} /> Open Camera
          </button>
        )}
      </div>

      {/* CTA Button */}
      {!hasCheckedOut && (
        <button
          onClick={hasCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={loading || locationStatus !== 'valid'}
          style={{
            width: '100%', padding: '16px', borderRadius: 20, fontWeight: 800,
            color: '#fff', fontSize: 17, border: 'none', cursor: loading || locationStatus !== 'valid' ? 'not-allowed' : 'pointer',
            background: hasCheckedIn
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            boxShadow: hasCheckedIn ? '0 8px 24px rgba(239,68,68,0.3)' : '0 8px 24px rgba(37,99,235,0.3)',
            opacity: loading || locationStatus !== 'valid' ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit', transition: 'opacity 0.15s',
          }}>
          {loading
            ? <><div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Processing...</>
            : hasCheckedIn
            ? <><Clock size={20} /> Check Out</>
            : <><CheckCircle size={20} /> Check In</>
          }
        </button>
      )}

      {hasCheckedOut && (
        <div style={{ textAlign: 'center', padding: '32px 24px', background: '#ecfdf5', borderRadius: 20, border: '1px solid #a7f3d0' }}>
          <CheckCircle size={38} color="#10b981" style={{ margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontWeight: 800, color: '#065f46', fontSize: 16, margin: '0 0 6px' }}>Day Complete!</p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Total work time: {formatWorkDuration(workMinutes)}</p>
        </div>
      )}
    </div>
  );
}
