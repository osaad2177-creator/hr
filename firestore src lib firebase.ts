// ============================================================
// Firestore Database Service
// All CRUD operations for the HR system
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  DocumentSnapshot,
  QueryConstraint,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import {
  User, Employee, AttendanceRecord, LeaveRequest, ActivationCode,
  Department, WorkLocation, Shift, Notification, Announcement,
  Holiday, SystemSettings, AuditLog, DashboardStats,
  AttendanceFilter, EmployeeFilter, UserRole,
} from '@/lib/types/index'

// ─── Helpers ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function mapDoc<T>(snapshot: DocumentSnapshot | QueryDocumentSnapshot): T {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

// ─── Users ────────────────────────────────────────────────────
export async function getUserById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return mapDoc<User>(snap);
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

export async function getAllUsers(role?: UserRole): Promise<User[]> {
  const constraints: QueryConstraint[] = [orderBy('displayName')];
  if (role) constraints.unshift(where('role', '==', role));
  const snap = await getDocs(query(collection(db, 'users'), ...constraints));
  return snap.docs.map((d) => mapDoc<User>(d));
}

// ─── Employees ────────────────────────────────────────────────
export async function getEmployee(uid: string): Promise<Employee | null> {
  const snap = await getDoc(doc(db, 'employees', uid));
  if (!snap.exists()) return null;
  return mapDoc<Employee>(snap);
}

export async function getAllEmployees(filters?: EmployeeFilter): Promise<Employee[]> {
  const constraints: QueryConstraint[] = [orderBy('displayName')];
  if (filters?.departmentId) constraints.push(where('departmentId', '==', filters.departmentId));
  if (filters?.managerId) constraints.push(where('managerId', '==', filters.managerId));
  if (filters?.status) constraints.push(where('status', '==', filters.status));
  const snap = await getDocs(query(collection(db, 'employees'), ...constraints));
  let employees = snap.docs.map((d) => mapDoc<Employee>(d));
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    employees = employees.filter(
      (e) =>
        e.displayName.toLowerCase().includes(search) ||
        e.email.toLowerCase().includes(search) ||
        e.position?.toLowerCase().includes(search)
    );
  }
  return employees;
}

export async function updateEmployee(uid: string, data: Partial<Employee>): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'employees', uid), { ...data, updatedAt: serverTimestamp() });
  batch.update(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function deleteEmployee(uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'employees', uid));
  batch.update(doc(db, 'users', uid), { status: 'inactive', updatedAt: serverTimestamp() });
  await batch.commit();
}

// ─── Attendance ───────────────────────────────────────────────
export async function getAttendanceByDate(
  employeeId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const q = query(
    collection(db, 'attendance'),
    where('employeeId', '==', employeeId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapDoc<AttendanceRecord>(snap.docs[0]);
}

export async function checkIn(
  employeeId: string,
  employeeName: string,
  departmentId: string,
  shiftId: string,
  locationId: string,
  checkInData: AttendanceRecord['checkIn'],
  lateMinutes: number
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const existing = await getAttendanceByDate(employeeId, today);
  if (existing?.checkIn) throw new Error('Already checked in today');

  const status = lateMinutes > 0 ? 'late' : 'present';

  if (existing) {
    await updateDoc(doc(db, 'attendance', existing.id), {
      checkIn: checkInData,
      status,
      lateMinutes,
      updatedAt: serverTimestamp(),
    });
    return existing.id;
  }

  const ref = await addDoc(collection(db, 'attendance'), {
    employeeId,
    employeeName,
    departmentId,
    date: today,
    checkIn: checkInData,
    status,
    lateMinutes,
    earlyLeaveMinutes: 0,
    totalWorkMinutes: 0,
    shiftId,
    locationId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function checkOut(
  attendanceId: string,
  checkOutData: AttendanceRecord['checkOut'],
  checkInTime: Date,
  earlyLeaveMinutes: number
): Promise<void> {
  const checkOutTime = new Date();
  const totalWorkMinutes = Math.floor(
    (checkOutTime.getTime() - checkInTime.getTime()) / 60000
  );

  await updateDoc(doc(db, 'attendance', attendanceId), {
    checkOut: checkOutData,
    earlyLeaveMinutes,
    totalWorkMinutes,
    updatedAt: serverTimestamp(),
  });
}

export async function getAttendanceRecords(filters: AttendanceFilter): Promise<AttendanceRecord[]> {
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')];
  if (filters.employeeId) constraints.push(where('employeeId', '==', filters.employeeId));
  if (filters.departmentId) constraints.push(where('departmentId', '==', filters.departmentId));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.startDate) constraints.push(where('date', '>=', filters.startDate));
  if (filters.endDate) constraints.push(where('date', '<=', filters.endDate));
  const snap = await getDocs(query(collection(db, 'attendance'), ...constraints));
  return snap.docs.map((d) => mapDoc<AttendanceRecord>(d));
}

export function subscribeToTodayAttendance(
  callback: (records: AttendanceRecord[]) => void
) {
  const today = new Date().toISOString().split('T')[0];
  const q = query(collection(db, 'attendance'), where('date', '==', today));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => mapDoc<AttendanceRecord>(d)));
  });
}

// ─── Leave Requests ───────────────────────────────────────────
export async function createLeaveRequest(
  data: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'leaveRequests'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function reviewLeaveRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  comment?: string
): Promise<void> {
  const requestSnap = await getDoc(doc(db, 'leaveRequests', requestId));
  if (!requestSnap.exists()) throw new Error('Leave request not found');
  const request = requestSnap.data() as LeaveRequest;

  const batch = writeBatch(db);

  batch.update(doc(db, 'leaveRequests', requestId), {
    status,
    reviewedBy,
    reviewedAt: serverTimestamp(),
    reviewComment: comment || '',
    updatedAt: serverTimestamp(),
  });

  // Update leave balance if approved
  if (status === 'approved') {
    const balanceField = `leaveBalance.used${capitalize(request.type)}`;
    batch.update(doc(db, 'employees', request.employeeId), {
      [balanceField]: increment(request.totalDays),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function getLeaveRequests(
  employeeId?: string,
  managerId?: string,
  status?: string
): Promise<LeaveRequest[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  if (employeeId) constraints.push(where('employeeId', '==', employeeId));
  if (managerId) constraints.push(where('managerId', '==', managerId));
  if (status) constraints.push(where('status', '==', status));
  const snap = await getDocs(query(collection(db, 'leaveRequests'), ...constraints));
  return snap.docs.map((d) => mapDoc<LeaveRequest>(d));
}

// ─── Activation Codes ─────────────────────────────────────────
export async function createActivationCode(
  data: Omit<ActivationCode, 'id' | 'isUsed' | 'createdAt'>
): Promise<string> {
  const code = generateCode();
  const ref = await addDoc(collection(db, 'activationCodes'), {
    ...data,
    code,
    isUsed: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getActivationCodes(): Promise<ActivationCode[]> {
  const snap = await getDocs(
    query(collection(db, 'activationCodes'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => mapDoc<ActivationCode>(d));
}

export async function deleteActivationCode(id: string): Promise<void> {
  await deleteDoc(doc(db, 'activationCodes', id));
}

// ─── Departments ──────────────────────────────────────────────
export async function getDepartments(): Promise<Department[]> {
  const snap = await getDocs(query(collection(db, 'departments'), orderBy('name')));
  return snap.docs.map((d) => mapDoc<Department>(d));
}

export async function saveDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<string> {
  if (id) {
    await updateDoc(doc(db, 'departments', id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, 'departments'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function deleteDepartment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'departments', id));
}

// ─── Work Locations ───────────────────────────────────────────
export async function getWorkLocations(): Promise<WorkLocation[]> {
  const snap = await getDocs(query(collection(db, 'workLocations'), where('isActive', '==', true)));
  return snap.docs.map((d) => mapDoc<WorkLocation>(d));
}

export async function saveWorkLocation(data: Omit<WorkLocation, 'id' | 'createdAt'>, id?: string): Promise<string> {
  if (id) {
    await updateDoc(doc(db, 'workLocations', id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, 'workLocations'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

// ─── Shifts ───────────────────────────────────────────────────
export async function getShifts(): Promise<Shift[]> {
  const snap = await getDocs(query(collection(db, 'shifts'), where('isActive', '==', true)));
  return snap.docs.map((d) => mapDoc<Shift>(d));
}

export async function saveShift(data: Omit<Shift, 'id'>, id?: string): Promise<string> {
  if (id) {
    await updateDoc(doc(db, 'shifts', id), data);
    return id;
  }
  const ref = await addDoc(collection(db, 'shifts'), data);
  return ref.id;
}

// ─── Notifications ────────────────────────────────────────────
export async function createNotification(data: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'notifications'), { ...data, isRead: false, createdAt: serverTimestamp() });
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => mapDoc<Notification>(d)));
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { isRead: true });
}

// ─── Announcements ────────────────────────────────────────────
export async function getAnnouncements(role: UserRole): Promise<Announcement[]> {
  const snap = await getDocs(
    query(
      collection(db, 'announcements'),
      where('targetRoles', 'array-contains', role),
      orderBy('publishedAt', 'desc'),
      limit(20)
    )
  );
  return snap.docs.map((d) => mapDoc<Announcement>(d));
}

export async function saveAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>, id?: string): Promise<string> {
  if (id) {
    await updateDoc(doc(db, 'announcements', id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, 'announcements'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

// ─── Holidays ─────────────────────────────────────────────────
export async function getHolidays(year?: number): Promise<Holiday[]> {
  const y = year || new Date().getFullYear();
  const snap = await getDocs(
    query(
      collection(db, 'holidays'),
      where('date', '>=', `${y}-01-01`),
      where('date', '<=', `${y}-12-31`),
      orderBy('date')
    )
  );
  return snap.docs.map((d) => mapDoc<Holiday>(d));
}

// ─── System Settings ──────────────────────────────────────────
export async function getSystemSettings(): Promise<SystemSettings | null> {
  const snap = await getDoc(doc(db, 'settings', 'system'));
  if (!snap.exists()) return null;
  return snap.data() as SystemSettings;
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'system'), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Audit Logs ───────────────────────────────────────────────
export async function logAuditEvent(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'auditLogs'), { ...data, createdAt: serverTimestamp() });
}

export async function getAuditLogs(limitCount = 100): Promise<AuditLog[]> {
  const snap = await getDocs(
    query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(limitCount))
  );
  return snap.docs.map((d) => mapDoc<AuditLog>(d));
}

// ─── Dashboard Stats ──────────────────────────────────────────
export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0];
  const [employeesSnap, todayAttendanceSnap, pendingLeaveSnap] = await Promise.all([
    getDocs(query(collection(db, 'employees'), where('status', '==', 'active'))),
    getDocs(query(collection(db, 'attendance'), where('date', '==', today))),
    getDocs(query(collection(db, 'leaveRequests'), where('status', '==', 'pending'))),
  ]);

  const totalEmployees = employeesSnap.size;
  const attendanceRecords = todayAttendanceSnap.docs.map((d) => d.data());
  const presentToday = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const lateToday = attendanceRecords.filter((r) => r.status === 'late').length;
  const onLeaveToday = attendanceRecords.filter((r) => r.status === 'on_leave').length;
  const absentToday = totalEmployees - presentToday - onLeaveToday;

  return {
    totalEmployees,
    presentToday,
    absentToday: Math.max(0, absentToday),
    lateToday,
    onLeaveToday,
    pendingLeaveRequests: pendingLeaveSnap.size,
    pendingApprovals: pendingLeaveSnap.size,
    attendanceRate: totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0,
  };
}

// ─── Helpers ──────────────────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
