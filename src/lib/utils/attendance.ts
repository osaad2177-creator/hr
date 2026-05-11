// ============================================================
// Attendance Service
// Handles geofencing, GPS validation, check-in/out logic
// ============================================================

import { WorkLocation, AttendanceEvent, DeviceInfo } from '../types/index';
import { getDeviceFingerprint, getDeviceInfo } from '../firebase/auth';
// ─── Geolocation ──────────────────────────────────────────────
export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export async function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(new Error(`Location error: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// ─── Distance Calculation (Haversine formula) ─────────────────
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Validate Location Against Work Locations ─────────────────
export function validateLocation(
  position: GeoPosition,
  workLocations: WorkLocation[]
): { isValid: boolean; nearestLocation: WorkLocation | null; distance: number } {
  let nearestLocation: WorkLocation | null = null;
  let minDistance = Infinity;

  for (const loc of workLocations) {
    const distance = calculateDistance(
      position.latitude, position.longitude,
      loc.latitude, loc.longitude
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestLocation = loc;
    }
  }

  const isValid = nearestLocation ? minDistance <= nearestLocation.radius : false;
  return { isValid, nearestLocation, distance: Math.round(minDistance) };
}

// ─── Fake GPS Detection (basic heuristics) ────────────────────
export function detectFakeGPS(position: GeoPosition): boolean {
  // Very low accuracy might indicate mock location
  if (position.accuracy > 2000) return true;
  // Suspiciously perfect coordinates (exactly 0.0 etc)
  if (position.latitude === 0 && position.longitude === 0) return true;
  return false;
}

// ─── Get IP Address ───────────────────────────────────────────
export async function getClientIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// ─── Reverse Geocoding ────────────────────────────────────────
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

// ─── Build Attendance Event ───────────────────────────────────
export async function buildAttendanceEvent(
  position: GeoPosition,
  photoURL?: string
): Promise<AttendanceEvent> {
  const [fingerprint, ip, address] = await Promise.all([
    getDeviceFingerprint(),
    getClientIP(),
    reverseGeocode(position.latitude, position.longitude),
  ]);

  const deviceInfo: DeviceInfo = {
    ...getDeviceInfo(),
    fingerprint,
  };

  const isFake = detectFakeGPS(position);

  return {
    time: new Date(),
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy,
    address,
    deviceId: fingerprint,
    deviceInfo,
    ipAddress: ip,
    photoURL,
    isValid: !isFake,
    validationNotes: isFake ? 'Possible fake GPS detected' : undefined,
  };
}

// ─── Calculate Late Minutes ───────────────────────────────────
export function calculateLateMinutes(
  checkInTime: Date,
  shiftStartTime: string, // "09:00"
  graceMinutes: number
): number {
  const [hours, minutes] = shiftStartTime.split(':').map(Number);
  const shiftStart = new Date(checkInTime);
  shiftStart.setHours(hours, minutes, 0, 0);
  const graceEnd = new Date(shiftStart.getTime() + graceMinutes * 60000);

  if (checkInTime <= graceEnd) return 0;
  return Math.floor((checkInTime.getTime() - shiftStart.getTime()) / 60000);
}

// ─── Calculate Early Leave Minutes ───────────────────────────
export function calculateEarlyLeaveMinutes(
  checkOutTime: Date,
  shiftEndTime: string, // "17:00"
): number {
  const [hours, minutes] = shiftEndTime.split(':').map(Number);
  const shiftEnd = new Date(checkOutTime);
  shiftEnd.setHours(hours, minutes, 0, 0);

  if (checkOutTime >= shiftEnd) return 0;
  return Math.floor((shiftEnd.getTime() - checkOutTime.getTime()) / 60000);
}

// ─── Format Duration ──────────────────────────────────────────
export function formatWorkDuration(minutes: number): string {
  if (minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
