// ============================================================
// HR System - Complete Type Definitions
// ============================================================

export type UserRole = 'admin' | 'manager' | 'employee';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'on_leave' | 'holiday' | 'weekend';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid' | 'maternity' | 'paternity';
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'flexible';
export type NotificationType = 'attendance' | 'leave' | 'announcement' | 'system' | 'reminder';
export type AccountStatus = 'active' | 'inactive' | 'locked' | 'pending';

// ─── User / Employee ────────────────────────────────────────
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
  photoURL?: string;
  phoneNumber?: string;
  deviceId?: string;
  deviceBound: boolean;
  language: 'en' | 'ar';
  fcmToken?: string;
}

export interface Employee extends User {
  role: 'employee';
  employeeId: string;
  departmentId: string;
  departmentName: string;
  position: string;
  managerId: string;
  managerName: string;
  locationIds: string[];
  shiftId: string;
  hireDate: Date;
  leaveBalance: LeaveBalance;
  notes?: string;
  emergencyContact?: EmergencyContact;
  nationalId?: string;
  address?: string;
}

export interface Manager extends User {
  role: 'manager';
  managerId: string;
  departmentIds: string[];
  assignedEmployeeIds: string[];
}

export interface Admin extends User {
  role: 'admin';
  isSuperAdmin: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// ─── Leave Balance ───────────────────────────────────────────
export interface LeaveBalance {
  annual: number;
  sick: number;
  emergency: number;
  unpaid: number;
  usedAnnual: number;
  usedSick: number;
  usedEmergency: number;
  usedUnpaid: number;
  year: number;
}

// ─── Department ──────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  employeeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Work Location ───────────────────────────────────────────
export interface WorkLocation {
  id: string;
  name: string;
  nameAr: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // meters - geofence radius
  isActive: boolean;
  createdAt: Date;
}

// ─── Shift ───────────────────────────────────────────────────
export interface Shift {
  id: string;
  name: string;
  nameAr: string;
  type: ShiftType;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  breakMinutes: number;
  workDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  graceMinutes: number; // late tolerance
  isActive: boolean;
}

// ─── Attendance ──────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  date: string; // "YYYY-MM-DD"
  checkIn?: AttendanceEvent;
  checkOut?: AttendanceEvent;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  totalWorkMinutes: number;
  notes?: string;
  shiftId: string;
  locationId: string;
}

export interface AttendanceEvent {
  time: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  deviceId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  photoURL?: string; // selfie verification
  isValid: boolean;
  validationNotes?: string;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  fingerprint: string;
}

// ─── Leave Request ───────────────────────────────────────────
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhoto?: string;
  departmentId: string;
  managerId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  attachmentURLs?: string[];
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Activation Code ─────────────────────────────────────────
export interface ActivationCode {
  id: string;
  code: string;
  role: UserRole;
  departmentId?: string;
  managerId?: string;
  locationIds?: string[];
  shiftId?: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: Date;
  expiresAt: Date;
  createdBy: string;
  createdAt: Date;
  notes?: string;
}

// ─── Notification ─────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  isRead: boolean;
  data?: Record<string, string>;
  createdAt: Date;
}

// ─── Announcement ─────────────────────────────────────────────
export interface Announcement {
  id: string;
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  targetRoles: UserRole[];
  targetDepartmentIds?: string[];
  isPinned: boolean;
  publishedAt: Date;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
}

// ─── Holiday ─────────────────────────────────────────────────
export interface Holiday {
  id: string;
  name: string;
  nameAr: string;
  date: string;
  isRecurring: boolean;
  createdAt: Date;
}

// ─── System Settings ─────────────────────────────────────────
export interface SystemSettings {
  companyName: string;
  companyNameAr: string;
  companyLogo?: string;
  timezone: string;
  workWeekStart: number;
  defaultLeaveBalance: {
    annual: number;
    sick: number;
    emergency: number;
    unpaid: number;
  };
  attendancePolicy: {
    allowSelfie: boolean;
    requireGeofence: boolean;
    geofenceRadius: number;
    allowFakeGPS: boolean;
    maxLateMinutes: number;
  };
  notifications: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    checkInReminder: boolean;
    checkInReminderTime: string;
    checkOutReminder: boolean;
    checkOutReminderTime: string;
  };
  updatedAt: Date;
  updatedBy: string;
}

// ─── Audit Log ────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType: string;
  targetId?: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

// ─── Dashboard Stats ──────────────────────────────────────────
export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  pendingApprovals: number;
  attendanceRate: number;
}

// ─── Filter & Search ──────────────────────────────────────────
export interface AttendanceFilter {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  departmentId?: string;
  status?: AttendanceStatus;
  managerId?: string;
}

export interface EmployeeFilter {
  search?: string;
  departmentId?: string;
  managerId?: string;
  status?: AccountStatus;
  locationId?: string;
}
