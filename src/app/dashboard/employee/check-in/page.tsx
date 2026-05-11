'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Camera, CheckCircle, AlertCircle, Loader2, Navigation } from 'lucide-react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { getAttendanceByDate, checkIn, checkOut, getWorkLocations, getShifts } from '@/lib/firebase/firestore';
import { getEmployee } from '@/lib/firebase/firestore';
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
    } catch (err) {
      setLocationStatus('error');
      toast.error('Could not get your location. Please enable GPS.');
    }
  };

  const capturePhoto = () => {
    const photo = webcamRef.current?.getScreenshot();
    if (photo) {
      setCapturedPhoto(photo);
      setShowCamera(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user || !position || locationStatus !== 'valid') {
      toast.error('Please verify your location first');
      return;
    }
    setLoading(true);
    try {
      const employee = await getEmployee(user.uid);
      if (!employee) throw new Error('Employee data not found');

      const event = await buildAttendanceEvent(position, capturedPhoto || undefined);
      const lateMinutes = employeeShift
        ? calculateLateMinutes(new Date(), employeeShift.startTime, employeeShift.graceMinutes)
        : 0;

      await checkIn(
        user.uid,
        user.displayName,
        employee.departmentId,
        employee.shiftId,
        nearestLocation?.id || '',
        event,
        lateMinutes
      );

      const today = new Date().toISOString().split('T')[0];
      const record = await getAttendanceByDate(user.uid, today);
      setTodayRecord(record);

      toast.success(lateMinutes > 0
        ? `Checked in (${lateMinutes} min late)`
        : 'Checked in successfully! Have a great day.');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !todayRecord?.id || !position) {
      toast.error('Please verify your location first');
      return;
    }
    setLoading(true);
    try {
      const event = await buildAttendanceEvent(position, undefined);
      const earlyLeave = employeeShift
        ? calculateEarlyLeaveMinutes(new Date(), employeeShift.endTime)
        : 0;

      const checkInTime = todayRecord.checkIn?.time
        ? new Date(todayRecord.checkIn.time as unknown as string)
        : new Date();

      await checkOut(todayRecord.id, event, checkInTime, earlyLeave);

      const today = new Date().toISOString().split('T')[0];
      const record = await getAttendanceByDate(user.uid, today);
      setTodayRecord(record);

      toast.success('Checked out successfully! See you tomorrow.');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const hasCheckedIn = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;
  const workMinutes = todayRecord?.totalWorkMinutes || 0;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Time Display */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white text-center shadow-xl shadow-blue-500/20">
        <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-2">
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-5xl font-bold tabular-nums tracking-tight">
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        {employeeShift && (
          <p className="text-blue-200 text-sm mt-3">
            Shift: {employeeShift.name} ({employeeShift.startTime} – {employeeShift.endTime})
          </p>
        )}
      </motion.div>

      {/* Today Status */}
      {hasCheckedIn && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Today's Record</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 mb-1">Check In</p>
              <p className="font-bold text-green-600">
                {new Date(todayRecord!.checkIn!.time as unknown as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Check Out</p>
              <p className={`font-bold ${hasCheckedOut ? 'text-red-500' : 'text-gray-400'}`}>
                {hasCheckedOut
                  ? new Date(todayRecord!.checkOut!.time as unknown as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Work Time</p>
              <p className="font-bold text-blue-600">{hasCheckedOut ? formatWorkDuration(workMinutes) : 'Active'}</p>
            </div>
          </div>
          {todayRecord!.lateMinutes > 0 && (
            <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm text-center">
              ⚠ Late by {todayRecord!.lateMinutes} minutes
            </div>
          )}
        </motion.div>
      )}

      {/* Location Check */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Navigation size={18} className="text-blue-600" />
          Location Verification
        </h3>
        <button onClick={checkLocation} disabled={locationStatus === 'checking'}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 font-medium">
          {locationStatus === 'checking' ? (
            <><Loader2 size={18} className="animate-spin" /> Getting location...</>
          ) : (
            <><MapPin size={18} /> {locationStatus === 'idle' ? 'Check My Location' : 'Re-check Location'}</>
          )}
        </button>

        <AnimatePresence>
          {locationStatus !== 'idle' && locationStatus !== 'checking' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className={`mt-3 p-3 rounded-xl flex items-start gap-3 ${
                locationStatus === 'valid' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                locationStatus === 'invalid' ? 'bg-red-50 dark:bg-red-900/20' :
                'bg-gray-50 dark:bg-gray-800'
              }`}>
              {locationStatus === 'valid' ? (
                <CheckCircle size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${locationStatus === 'valid' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {locationStatus === 'valid' ? 'Location verified!' : 'Outside work area'}
                </p>
                {nearestLocation && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {nearestLocation.name} — {distance}m away
                    {locationStatus === 'invalid' && ` (max: ${nearestLocation.radius}m)`}
                  </p>
                )}
                {locationStatus === 'error' && (
                  <p className="text-xs text-gray-500 mt-0.5">Enable GPS and try again</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selfie Camera */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Camera size={18} className="text-blue-600" />
          Selfie Verification <span className="text-xs text-gray-400 font-normal">(Optional)</span>
        </h3>
        {capturedPhoto ? (
          <div className="relative">
            <img src={capturedPhoto} alt="Selfie" className="w-full h-40 object-cover rounded-xl" />
            <button onClick={() => setCapturedPhoto(null)}
              className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors">
              Retake
            </button>
          </div>
        ) : showCamera ? (
          <div className="relative">
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-48 object-cover rounded-xl" />
            <button onClick={capturePhoto}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
              Capture
            </button>
          </div>
        ) : (
          <button onClick={() => setShowCamera(true)}
            className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-sm">
            <Camera size={16} /> Open Camera
          </button>
        )}
      </div>

      {/* Check In / Check Out Button */}
      {!hasCheckedOut && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={hasCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={loading || locationStatus !== 'valid'}
          className={`w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg transition-all ${
            hasCheckedIn
              ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30 hover:from-red-600 hover:to-red-700 disabled:from-red-300 disabled:to-red-400'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-blue-500/30 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-300 disabled:to-blue-400'
          }`}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </span>
          ) : hasCheckedIn ? (
            <span className="flex items-center justify-center gap-2">
              <Clock size={20} />
              Check Out
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle size={20} />
              Check In
            </span>
          )}
        </motion.button>
      )}

      {hasCheckedOut && (
        <div className="text-center py-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
          <CheckCircle size={36} className="text-emerald-600 mx-auto mb-2" />
          <p className="font-bold text-emerald-700 dark:text-emerald-400">Day Complete!</p>
          <p className="text-sm text-gray-500 mt-1">Total work time: {formatWorkDuration(workMinutes)}</p>
        </div>
      )}
    </div>
  );
}
