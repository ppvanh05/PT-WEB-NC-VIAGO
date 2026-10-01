import { Injectable, signal } from '@angular/core';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPhoneNumber,
  updatePassword,
  EmailAuthProvider,
  linkWithCredential,
  RecaptchaVerifier,
  ConfirmationResult,
  Auth
} from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

export interface User {
  id: string;
  phoneNumber: string;
  passwordHash: string; // Plain text or hashed password
  password?: string;    // Plain text password
  name: string;
  role: 'customer' | 'admin';
  status: string;       // 'Đang hoạt động', 'Đã khóa', 'active', etc.
  avatar: string;
  failedLoginAttempts: number;
  lockoutUntil: string | null;
  email?: string;
  gender?: string;
  birthday?: string;
  dob?: string;
  occupation?: string;
  job?: string;
  phone?: string;
  regDate?: string;
  type?: string;
  rank?: string;
  spent?: number;
  tickets?: number;
  twoFA?: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  phoneNumber: string;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOCKOUT' | 'PASSWORD_RESET' | 'REGISTER' | 'LOGOUT' | 'OTP_SENT' | 'OTP_VERIFIED' | 'OTP_FAILED' | 'UPDATE_PROFILE';
  details: string;
}

export interface AuthConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
}

const DEFAULT_CONFIG: AuthConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  sessionTimeoutMinutes: 30
};

const DEFAULT_USER_AVATAR = '/asset/images/customer/user.png';

const SEED_USERS: User[] = [
  {
    id: 'KH0001',
    name: 'Nguyễn Minh Anh',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0901234567',
    phoneNumber: '0901234567',
    email: 'minhanh@gmail.com',
    gender: 'Nam',
    dob: '2005-10-12',
    birthday: '2005-10-12',
    job: 'Học sinh / Sinh viên',
    occupation: 'Học sinh / Sinh viên',
    regDate: '15/01/2025',
    type: 'Hội viên',
    rank: 'Bạc',
    spent: 4500000,
    tickets: 8,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0002',
    name: 'Trần Quốc Bảo',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0912345678',
    phoneNumber: '0912345678',
    email: 'quocbao@gmail.com',
    gender: 'Nam',
    dob: '1998-05-20',
    birthday: '1998-05-20',
    job: 'Nhân viên văn phòng',
    occupation: 'Nhân viên văn phòng',
    regDate: '20/02/2025',
    type: 'Hội viên',
    rank: 'Vàng',
    spent: 8200000,
    tickets: 15,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0003',
    name: 'Lê Thu Hà',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0933456789',
    phoneNumber: '0933456789',
    email: 'thuha@gmail.com',
    gender: 'Nữ',
    dob: '2001-08-14',
    birthday: '2001-08-14',
    job: 'Kinh doanh tự do',
    occupation: 'Kinh doanh tự do',
    regDate: '12/03/2025',
    type: 'Hội viên',
    rank: 'Bạc',
    spent: 3800000,
    tickets: 7,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0004',
    name: 'Phạm Gia Hưng',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0944567890',
    phoneNumber: '0944567890',
    email: 'giahung@gmail.com',
    gender: 'Nam',
    dob: '1993-02-05',
    birthday: '1993-02-05',
    job: 'Kỹ sư / Công nghệ',
    occupation: 'Kỹ sư / Công nghệ',
    regDate: '05/04/2025',
    type: 'Hội viên',
    rank: 'Kim cương',
    spent: 18500000,
    tickets: 32,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0005',
    name: 'Võ Thanh Tâm',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0965678901',
    phoneNumber: '0965678901',
    email: 'thanhtam@gmail.com',
    gender: 'Nam',
    dob: '2004-11-22',
    birthday: '2004-11-22',
    job: 'Học sinh / Sinh viên',
    occupation: 'Học sinh / Sinh viên',
    regDate: '22/05/2025',
    type: 'Khách vãng lai',
    rank: 'Không có',
    spent: 850000,
    tickets: 1,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0006',
    name: 'Đặng Hoài Nam',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0976789012',
    phoneNumber: '0976789012',
    email: 'hoainam@gmail.com',
    gender: 'Nam',
    dob: '1996-07-30',
    birthday: '1996-07-30',
    job: 'Công nhân / Tài xế',
    occupation: 'Công nhân / Tài xế',
    regDate: '18/06/2025',
    type: 'Hội viên',
    rank: 'Bạc',
    spent: 2900000,
    tickets: 5,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0007',
    name: 'Mai Thanh Trúc',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0987890123',
    phoneNumber: '0987890123',
    email: 'thanhtruc@gmail.com',
    gender: 'Nữ',
    dob: '2002-01-09',
    birthday: '2002-01-09',
    job: 'Giáo viên / Giảng viên',
    occupation: 'Giáo viên / Giảng viên',
    regDate: '07/07/2025',
    type: 'Hội viên',
    rank: 'Vàng',
    spent: 9600000,
    tickets: 18,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0008',
    name: 'Đỗ Quốc Huy',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0398901234',
    phoneNumber: '0398901234',
    email: 'quochuy@gmail.com',
    gender: 'Nam',
    dob: '1995-03-18',
    birthday: '1995-03-18',
    job: 'Nhân viên văn phòng',
    occupation: 'Nhân viên văn phòng',
    regDate: '25/07/2025',
    type: 'Khách vãng lai',
    rank: 'Không có',
    spent: 1200000,
    tickets: 2,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0009',
    name: 'Phan Ngọc Linh',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0389012345',
    phoneNumber: '0389012345',
    email: 'ngoclinh@gmail.com',
    gender: 'Nữ',
    dob: '1990-12-25',
    birthday: '1990-12-25',
    job: 'Bác sĩ / Y tá',
    occupation: 'Bác sĩ / Y tá',
    regDate: '11/08/2025',
    type: 'Hội viên',
    rank: 'Kim cương',
    spent: 22300000,
    tickets: 40,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0010',
    name: 'Bùi Khánh Vy',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0370123456',
    phoneNumber: '0370123456',
    email: 'khanhvy@gmail.com',
    gender: 'Nữ',
    dob: '2003-04-19',
    birthday: '2003-04-19',
    job: 'Học sinh / Sinh viên',
    occupation: 'Học sinh / Sinh viên',
    regDate: '19/08/2025',
    type: 'Hội viên',
    rank: 'Bạc',
    spent: 3400000,
    tickets: 6,
    status: 'Đã khóa',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0011',
    name: 'Nguyễn Hoàng Phúc',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0361234567',
    phoneNumber: '0361234567',
    email: 'hoangphuc@gmail.com',
    gender: 'Nam',
    dob: '1997-09-02',
    birthday: '1997-09-02',
    job: 'Kỹ sư / Công nghệ',
    occupation: 'Kỹ sư / Công nghệ',
    regDate: '02/09/2025',
    type: 'Hội viên',
    rank: 'Vàng',
    spent: 7800000,
    tickets: 13,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0012',
    name: 'Trần Mỹ Linh',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0352345678',
    phoneNumber: '0352345678',
    email: 'mylinh@gmail.com',
    gender: 'Nữ',
    dob: '2000-06-15',
    birthday: '2000-06-15',
    job: 'Kế toán / Kiểm toán',
    occupation: 'Kế toán / Kiểm toán',
    regDate: '15/09/2025',
    type: 'Khách vãng lai',
    rank: 'Không có',
    spent: 600000,
    tickets: 1,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0013',
    name: 'Lê Gia Bảo',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0343456789',
    phoneNumber: '0343456789',
    email: 'giabao@gmail.com',
    gender: 'Nam',
    dob: '2006-01-28',
    birthday: '2006-01-28',
    job: 'Học sinh / Sinh viên',
    occupation: 'Học sinh / Sinh viên',
    regDate: '28/09/2025',
    type: 'Hội viên',
    rank: 'Bạc',
    spent: 4200000,
    tickets: 8,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0014',
    name: 'Phạm Thanh Hằng',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0334567890',
    phoneNumber: '0334567890',
    email: 'thanhhang@gmail.com',
    gender: 'Nữ',
    dob: '1988-10-10',
    birthday: '1988-10-10',
    job: 'Kinh doanh tự do',
    occupation: 'Kinh doanh tự do',
    regDate: '10/10/2025',
    type: 'Hội viên',
    rank: 'Kim cương',
    spent: 25600000,
    tickets: 45,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0015',
    name: 'Võ Đức Minh',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0325678901',
    phoneNumber: '0325678901',
    email: 'ducminh@gmail.com',
    gender: 'Nam',
    dob: '1994-02-22',
    birthday: '1994-02-22',
    job: 'Luật sư / Công chức',
    occupation: 'Luật sư / Công chức',
    regDate: '22/10/2025',
    type: 'Hội viên',
    rank: 'Vàng',
    spent: 11300000,
    tickets: 20,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0016',
    name: 'Đặng Thảo Nhi',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0316789012',
    phoneNumber: '0316789012',
    email: 'thaonhi@gmail.com',
    gender: 'Nữ',
    dob: '2001-07-05',
    birthday: '2001-07-05',
    job: 'Nhân viên văn phòng',
    occupation: 'Nhân viên văn phòng',
    regDate: '05/11/2025',
    type: 'Khách vãng lai',
    rank: 'Không có',
    spent: 950000,
    tickets: 2,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0017',
    name: 'Mai Quốc Thịnh',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0397890123',
    phoneNumber: '0397890123',
    email: 'quocthinh@gmail.com',
    gender: 'Nam',
    dob: '1999-08-18',
    birthday: '1999-08-18',
    job: 'Công nhân / Tài xế',
    occupation: 'Công nhân / Tài xế',
    regDate: '18/11/2025',
    type: 'Hội viên',
    rank: 'Bạc',
    spent: 3100000,
    tickets: 5,
    status: 'Đã khóa',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0018',
    name: 'Đỗ Minh Châu',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0388901234',
    phoneNumber: '0388901234',
    email: 'minhchau@gmail.com',
    gender: 'Nữ',
    dob: '1992-03-30',
    birthday: '1992-03-30',
    job: 'Giáo viên / Giảng viên',
    occupation: 'Giáo viên / Giảng viên',
    regDate: '30/11/2025',
    type: 'Hội viên',
    rank: 'Vàng',
    spent: 8900000,
    tickets: 16,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0019',
    name: 'Phan Nhật Nam',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0379012345',
    phoneNumber: '0379012345',
    email: 'nhatnam@gmail.com',
    gender: 'Nam',
    dob: '1995-06-12',
    birthday: '1995-06-12',
    job: 'Kỹ sư / Công nghệ',
    occupation: 'Kỹ sư / Công nghệ',
    regDate: '12/12/2025',
    type: 'Hội viên',
    rank: 'Kim cương',
    spent: 19800000,
    tickets: 34,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  },
  {
    id: 'KH0020',
    name: 'Bùi Thanh Tùng',
    password: '12345678',
    passwordHash: '12345678',
    phone: '0360123456',
    phoneNumber: '0360123456',
    email: 'thanhtung@gmail.com',
    gender: 'Nam',
    dob: '2004-09-20',
    birthday: '2004-09-20',
    job: 'Học sinh / Sinh viên',
    occupation: 'Học sinh / Sinh viên',
    regDate: '20/12/2025',
    type: 'Khách vãng lai',
    rank: 'Không có',
    spent: 700000,
    tickets: 1,
    status: 'Đang hoạt động',
    twoFA: false,
    role: 'customer',
    avatar: '/asset/images/customer/user.png',
    failedLoginAttempts: 0,
    lockoutUntil: null
  }
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  auth!: Auth;
  isFirebaseMode = false;

  // Signals for reactive UI bindings
  currentUser = signal<User | null>(null);
  activityLogs = signal<ActivityLog[]>([]);
  config = signal<AuthConfig>(DEFAULT_CONFIG);
  sessionTimeoutTriggered = signal<boolean>(false);

  // In-memory OTP session management
  private confirmationResult: ConfirmationResult | null = null;
  private activeOTPs = new Map<string, { otp: string; expiresAt: number }>();
  
  // Security metrics tracking
  private otpResendTracker = new Map<string, { count: number; lastTime: number }>();
  private failedOtpAttempts = new Map<string, number>();

  // Idle session tracking
  private lastActivityTime: number = Date.now();
  private idleCheckIntervalId: any = null;

  constructor() {
    this.initFirebase();
    this.initDatabase();
    this.loadSession();
    this.setupInactivityMonitor();
  }

  // --- INITIALIZATION ---

  private initFirebase(): void {
    console.log('[VIAGO AUTH] Chạy chế độ GIẢ LẬP LocalStorage Mock Data Frontend.');
    this.isFirebaseMode = false;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private initDatabase(): void {
    if (!this.isBrowser()) return;

    const savedConfig = localStorage.getItem('viago_auth_config');
    if (savedConfig) {
      this.config.set(JSON.parse(savedConfig));
    } else {
      localStorage.setItem('viago_auth_config', JSON.stringify(DEFAULT_CONFIG));
    }

    // Overwrite with the latest seed users list to clear any old registered accounts.
    localStorage.setItem('viago_users', JSON.stringify(SEED_USERS));
    
    // Wipe any existing auto-logged-in session from previous state
    localStorage.removeItem('viago_current_user');
    localStorage.removeItem('viago_session_expiry');

    const savedLogs = localStorage.getItem('viago_activity_log');
    if (savedLogs) {
      this.activityLogs.set(JSON.parse(savedLogs));
    } else {
      localStorage.setItem('viago_activity_log', JSON.stringify([]));
    }
  }

  getUsers(): User[] {
    if (!this.isBrowser()) return SEED_USERS;
    const usersStr = localStorage.getItem('viago_users');
    return usersStr ? JSON.parse(usersStr) : SEED_USERS;
  }

  saveUsers(users: User[]): void {
    if (!this.isBrowser()) return;
    localStorage.setItem('viago_users', JSON.stringify(users));
  }

  private normalizeUserAvatar(user: User): User {
    let avatar = user.avatar && user.avatar.trim() ? user.avatar : DEFAULT_USER_AVATAR;
    if (avatar === '/asset/images/customer/icon_user.svg') {
      avatar = DEFAULT_USER_AVATAR;
    }
    return {
      ...user,
      avatar: avatar
    };
  }

  private loadSession(): void {
    if (!this.isBrowser()) return;
    const sessionUser = localStorage.getItem('viago_current_user');
    const sessionExpiry = localStorage.getItem('viago_session_expiry');

    if (sessionUser && sessionExpiry) {
      const expiryTime = parseInt(sessionExpiry, 10);
      if (Date.now() < expiryTime) {
        const parsedUser = JSON.parse(sessionUser) as User;
        this.currentUser.set(this.normalizeUserAvatar(parsedUser));
        this.updateSessionExpiry();
      } else {
        this.logout('Phiên đăng nhập hết hạn do không hoạt động.');
      }
    } else {
      // Start in guest state (not logged in)
      this.currentUser.set(null);
    }
  }

  private updateSessionExpiry(): void {
    if (!this.isBrowser()) return;
    const expiryTime = Date.now() + this.config().sessionTimeoutMinutes * 60 * 1000;
    localStorage.setItem('viago_session_expiry', expiryTime.toString());
  }

  // --- CRYPTOGRAPHY ---

  async hashPassword(password: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // --- AUTHENTICATION FLOWS ---

  // Register Profile (Saves profile details locally and logs in)
  async registerProfile(name: string, phoneNumber: string, passwordHash: string, profileData: Partial<User> = {}): Promise<{ success: boolean; message: string; user?: User }> {
    if (!this.isBrowser()) return { success: false, message: 'Yêu cầu môi trường trình duyệt.' };

    const phoneTrimmed = phoneNumber.trim();
    const users = this.getUsers();

    // Check unique locally
    if (users.some(u => u.phoneNumber === phoneTrimmed)) {
      return { success: false, message: 'Số điện thoại đã tồn tại trong hệ thống.' };
    }

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const regDateStr = `${dd}/${mm}/${yyyy}`;

    const newUser: User = {
      id: `KH${Math.floor(1000 + Math.random() * 9000)}`,
      phoneNumber: phoneTrimmed,
      phone: phoneTrimmed,
      passwordHash,
      name,
      role: 'customer',
      status: 'active',
      avatar: profileData.avatar && profileData.avatar.trim() ? profileData.avatar : DEFAULT_USER_AVATAR,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      email: profileData.email || '',
      gender: profileData.gender || '',
      birthday: profileData.birthday || '',
      occupation: profileData.occupation || '',
      regDate: regDateStr,
      type: 'Hội viên',
      rank: 'Không có',
      spent: 0,
      tickets: 0,
      twoFA: false
    };

    users.push(newUser);
    this.saveUsers(users);
    this.logActivity(phoneTrimmed, 'REGISTER', `Đăng ký tài khoản mới thành công: ${name}`);

    // Set local session
    localStorage.setItem('viago_current_user', JSON.stringify(newUser));
    this.currentUser.set(newUser);
    this.updateSessionExpiry();
    this.lastActivityTime = Date.now();
    this.sessionTimeoutTriggered.set(false);

    return { success: true, message: 'Đăng ký tài khoản thành công.', user: newUser };
  }

  // Update Profile (Saves updated profile details locally and updates session)
  async updateProfile(phoneNumber: string, name: string, profileData: Partial<User>): Promise<{ success: boolean; message: string; user?: User }> {
    if (!this.isBrowser()) return { success: false, message: 'Yêu cầu môi trường trình duyệt.' };

    const phoneTrimmed = phoneNumber.trim();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.phoneNumber === phoneTrimmed);

    if (userIndex === -1) {
      return { success: false, message: 'Người dùng không tồn tại.' };
    }

    const updatedUser = {
      ...users[userIndex],
      name,
      avatar: profileData.avatar !== undefined
        ? (profileData.avatar && profileData.avatar.trim() ? profileData.avatar : DEFAULT_USER_AVATAR)
        : (users[userIndex].avatar && users[userIndex].avatar.trim() ? users[userIndex].avatar : DEFAULT_USER_AVATAR),
      email: profileData.email !== undefined ? profileData.email : users[userIndex].email,
      gender: profileData.gender !== undefined ? profileData.gender : users[userIndex].gender,
      birthday: profileData.birthday !== undefined ? profileData.birthday : users[userIndex].birthday,
      occupation: profileData.occupation !== undefined ? profileData.occupation : users[userIndex].occupation
    };

    users[userIndex] = updatedUser;
    this.saveUsers(users);
    this.logActivity(phoneTrimmed, 'UPDATE_PROFILE', 'Cập nhật thông tin hồ sơ cá nhân');

    localStorage.setItem('viago_current_user', JSON.stringify(updatedUser));
    this.currentUser.set(updatedUser);
    this.updateSessionExpiry();

    return { success: true, message: 'Cập nhật hồ sơ thành công.', user: updatedUser };
  }

  // Link Email/Password to currently signed-in Phone Auth User (Used in Step 3 of Registration)
  async linkEmailAndPassword(phoneNumber: string, password: string): Promise<{ success: boolean; message: string }> {
    if (this.isFirebaseMode) {
      try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
          return { success: false, message: 'Không tìm thấy phiên xác thực SĐT hiện tại.' };
        }
        
        const email = `${phoneNumber.trim()}@viago.com`;
        const credential = EmailAuthProvider.credential(email, password);
        
        // Link email/password provider to the verified phone account
        await linkWithCredential(currentUser, credential);
        return { success: true, message: 'Liên kết tài khoản thành công.' };
      } catch (error: any) {
        console.error('[VIAGO AUTH] Firebase Link Account Error:', error);
        let errorMsg = 'Thiết lập mật khẩu thất bại trên Firebase.';
        if (error.code === 'auth/email-already-in-use') {
          errorMsg = 'Tài khoản Firebase đã tồn tại.';
        }
        return { success: false, message: errorMsg };
      }
    }
    return { success: true, message: 'Chế độ giả lập.' };
  }

  // Login
  async login(phoneNumber: string, password: string): Promise<{ success: boolean; message: string }> {
    if (!this.isBrowser()) return { success: false, message: 'Yêu cầu môi trường trình duyệt.' };

    const phoneTrimmed = phoneNumber.trim();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.phoneNumber === phoneTrimmed);

    if (userIndex === -1) {
      this.logActivity(phoneTrimmed, 'LOGIN_FAILED', 'Số điện thoại không tồn tại.');
      return { success: false, message: 'Số điện thoại hoặc mật khẩu không chính xác.' };
    }

    const user = users[userIndex];

    if (user.status === 'disabled') {
      this.logActivity(phoneTrimmed, 'LOGIN_FAILED', 'Tài khoản đã bị vô hiệu hóa.');
      return { success: false, message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.' };
    }

    if (user.status === 'locked' && user.lockoutUntil) {
      const lockoutTime = new Date(user.lockoutUntil).getTime();
      if (Date.now() < lockoutTime) {
        const remainingMs = lockoutTime - Date.now();
        const remainingMins = Math.ceil(remainingMs / (60 * 1000));
        return {
          success: false,
          message: `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${remainingMins} phút.`
        };
      } else {
        user.status = 'active';
        user.lockoutUntil = null;
        user.failedLoginAttempts = 0;
      }
    }

    // Call Real Firebase Login
    if (this.isFirebaseMode) {
      try {
        const email = `${phoneTrimmed}@viago.com`;
        await signInWithEmailAndPassword(this.auth, email, password);
      } catch (error: any) {
        console.error('[VIAGO AUTH] Firebase Login Error:', error);
        
        // Log failure in Firebase
        user.failedLoginAttempts++;
        let msg = 'Số điện thoại hoặc mật khẩu không chính xác.';
        
        if (user.failedLoginAttempts >= this.config().maxFailedAttempts) {
          user.status = 'locked';
          const durationMs = this.config().lockoutDurationMinutes * 60 * 1000;
          user.lockoutUntil = new Date(Date.now() + durationMs).toISOString();
          msg = `Tài khoản bị khóa tạm thời trong ${this.config().lockoutDurationMinutes} phút do nhập sai mật khẩu quá ${this.config().maxFailedAttempts} lần liên tiếp.`;
          this.logActivity(phoneTrimmed, 'LOCKOUT', `Tài khoản bị khóa do nhập sai mật khẩu ${user.failedLoginAttempts} lần liên tiếp.`);
        } else {
          const attemptsLeft = this.config().maxFailedAttempts - user.failedLoginAttempts;
          msg = `Mật khẩu không chính xác. Bạn còn ${attemptsLeft} lần thử lại trước khi tài khoản bị khóa.`;
          this.logActivity(phoneTrimmed, 'LOGIN_FAILED', `Nhập sai mật khẩu (Lần ${user.failedLoginAttempts}).`);
        }
        
        users[userIndex] = user;
        this.saveUsers(users);
        return { success: false, message: msg };
      }
    } else {
      // Local DB verification in Mock Mode
      const hashed = await this.hashPassword(password);
      if (user.passwordHash !== hashed && user.password !== password) {
        user.failedLoginAttempts++;
        let msg = 'Số điện thoại hoặc mật khẩu không chính xác.';
        if (user.failedLoginAttempts >= this.config().maxFailedAttempts) {
          user.status = 'locked';
          const durationMs = this.config().lockoutDurationMinutes * 60 * 1000;
          user.lockoutUntil = new Date(Date.now() + durationMs).toISOString();
          msg = `Tài khoản bị khóa tạm thời trong ${this.config().lockoutDurationMinutes} phút do nhập sai mật khẩu quá ${this.config().maxFailedAttempts} lần liên tiếp.`;
          this.logActivity(phoneTrimmed, 'LOCKOUT', `Tài khoản bị khóa do nhập sai mật khẩu ${user.failedLoginAttempts} lần liên tiếp.`);
        } else {
          const attemptsLeft = this.config().maxFailedAttempts - user.failedLoginAttempts;
          msg = `Mật khẩu không chính xác. Bạn còn ${attemptsLeft} lần thử lại trước khi tài khoản bị khóa.`;
          this.logActivity(phoneTrimmed, 'LOGIN_FAILED', `Nhập sai mật khẩu (Lần ${user.failedLoginAttempts}).`);
        }
        users[userIndex] = user;
        this.saveUsers(users);
        return { success: false, message: msg };
      }
    }

    // Login Success
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.status = 'active';
    const normalizedUser = this.normalizeUserAvatar({ ...user });
    users[userIndex] = normalizedUser;
    this.saveUsers(users);

    this.logActivity(phoneTrimmed, 'LOGIN_SUCCESS', `Đăng nhập thành công (${normalizedUser.role}).`);
    
    localStorage.setItem('viago_current_user', JSON.stringify(normalizedUser));
    this.currentUser.set(normalizedUser);
    this.updateSessionExpiry();
    this.lastActivityTime = Date.now();
    this.sessionTimeoutTriggered.set(false);

    return { success: true, message: 'Đăng nhập thành công.' };
  }

  // --- DYNAMIC OTP SENDING ---

  async sendOTP(phoneNumber: string, recaptchaVerifier: any, type: 'register' | 'forgot'): Promise<{ success: boolean; message: string; otp?: string }> {
    if (!this.isBrowser()) return { success: false, message: 'Yêu cầu môi trường trình duyệt.' };

    const phoneTrimmed = phoneNumber.trim();
    const users = this.getUsers();
    const userExists = users.some(u => u.phoneNumber === phoneTrimmed);

    if (type === 'register' && userExists) {
      return { 
        success: false, 
        message: 'Số điện thoại đã tồn tại. Vui lòng Đăng nhập.' 
      };
    }

    if (type === 'forgot' && !userExists) {
      return { success: false, message: 'Số điện thoại này chưa được đăng ký trong hệ thống.' };
    }

    if (type === 'forgot') {
      const user = users.find(u => u.phoneNumber === phoneTrimmed);
      if (user && user.status === 'disabled') {
        return { success: false, message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.' };
      }
    }

    // Rate Limit: Max 3 sends in 2 minutes
    const now = Date.now();
    const tracking = this.otpResendTracker.get(phoneTrimmed) || { count: 0, lastTime: 0 };
    if (tracking.count >= 3 && now - tracking.lastTime < 2 * 60 * 1000) {
      return { 
        success: false, 
        message: 'Yêu cầu gửi OTP quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau ít phút.' 
      };
    }

    // Update tracking
    if (now - tracking.lastTime > 2 * 60 * 1000) {
      tracking.count = 1;
    } else {
      tracking.count++;
    }
    tracking.lastTime = now;
    this.otpResendTracker.set(phoneTrimmed, tracking);

    // Reset failed OTP attempts
    this.failedOtpAttempts.set(phoneTrimmed, 0);

    if (this.isFirebaseMode) {
      try {
        const intlPhone = `+84${phoneTrimmed.substring(1)}`;
        this.confirmationResult = await signInWithPhoneNumber(this.auth, intlPhone, recaptchaVerifier);
        this.logActivity(phoneTrimmed, 'OTP_SENT', `Gửi OTP thành công qua Firebase (Loại: ${type}).`);
        return { success: true, message: 'Mã xác thực OTP đã được gửi về số điện thoại của bạn.' };
      } catch (error: any) {
        console.error('[VIAGO AUTH] Firebase Send OTP Error:', error);
        return { 
          success: false, 
          message: 'Hệ thống gửi mã xác thực đang gián đoạn, vui lòng thử lại sau.' 
        };
      }
    } else {
      // Mock mode OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 3 * 60 * 1000;
      
      this.activeOTPs.set(phoneTrimmed, { otp, expiresAt });
      this.logActivity(phoneTrimmed, 'OTP_SENT', `Gửi OTP giả lập thành công (Loại: ${type}).`);
      console.log(`[VIAGO SMS SERVICE - MOCK] OTP gửi tới số ${phoneTrimmed}: ${otp}`);

      return { 
        success: true, 
        message: 'Mã xác thực đã được gửi về số điện thoại của bạn.',
        otp
      };
    }
  }

  // --- OTP VERIFICATION WITH LOCKOUT ---

  async verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string }> {
    if (!this.isBrowser()) return { success: false, message: 'Yêu cầu môi trường trình duyệt.' };

    const phoneTrimmed = phoneNumber.trim();
    const failedAttempts = this.failedOtpAttempts.get(phoneTrimmed) || 0;
    
    if (failedAttempts >= 5) {
      this.activeOTPs.delete(phoneTrimmed);
      this.confirmationResult = null;
      return { 
        success: false, 
        message: 'Phiên xác thực hiện tại đã bị khóa do nhập sai OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.' 
      };
    }

    if (this.isFirebaseMode) {
      if (!this.confirmationResult) {
        return { success: false, message: 'Không tìm thấy phiên xác thực OTP. Vui lòng gửi lại mã.' };
      }

      try {
        // Authenticate user via Phone Auth
        await this.confirmationResult.confirm(otp);
        // Do NOT clear confirmationResult immediately, so we can verify linking if needed
        this.failedOtpAttempts.set(phoneTrimmed, 0);
        this.logActivity(phoneTrimmed, 'OTP_VERIFIED', 'Xác thực OTP thành công qua Firebase.');
        return { success: true, message: 'Xác thực mã OTP thành công.' };
      } catch (error: any) {
        console.error('[VIAGO AUTH] Firebase Confirm OTP Error:', error);
        
        const newAttempts = failedAttempts + 1;
        this.failedOtpAttempts.set(phoneTrimmed, newAttempts);
        this.logActivity(phoneTrimmed, 'OTP_FAILED', `Nhập sai OTP qua Firebase (Lần ${newAttempts}).`);

        if (newAttempts >= 5) {
          this.confirmationResult = null;
          return { 
            success: false, 
            message: 'Phiên xác thực hiện tại đã bị khóa do nhập sai OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.' 
          };
        }
        return { success: false, message: 'Mã xác thực không đúng. Vui lòng nhập lại.' };
      }
    } else {
      // Mock verification
      const activeOtp = this.activeOTPs.get(phoneTrimmed);
      
      if (!activeOtp) {
        return { success: false, message: 'Phiên xác thực không tồn tại. Vui lòng gửi lại mã.' };
      }
      
      if (Date.now() > activeOtp.expiresAt) {
        this.activeOTPs.delete(phoneTrimmed);
        return { success: false, message: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.' };
      }
      
      if (activeOtp.otp !== otp) {
        const newAttempts = failedAttempts + 1;
        this.failedOtpAttempts.set(phoneTrimmed, newAttempts);
        this.logActivity(phoneTrimmed, 'OTP_FAILED', `Nhập sai OTP giả lập (Lần ${newAttempts}).`);

        if (newAttempts >= 5) {
          this.activeOTPs.delete(phoneTrimmed);
          return { 
            success: false, 
            message: 'Phiên xác thực hiện tại đã bị khóa do nhập sai OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.' 
          };
        }
        return { success: false, message: 'Mã xác thực không đúng. Vui lòng nhập lại.' };
      }

      this.activeOTPs.delete(phoneTrimmed);
      this.failedOtpAttempts.set(phoneTrimmed, 0);
      this.logActivity(phoneTrimmed, 'OTP_VERIFIED', 'Xác thực OTP giả lập thành công.');
      return { success: true, message: 'Xác thực mã OTP thành công.' };
    }
  }

  // --- PASSWORD UPDATE (FORGOT PASSWORD RESET) ---

  async resetPassword(phoneNumber: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!this.isBrowser()) return { success: false, message: 'Yêu cầu môi trường trình duyệt.' };

    const phoneTrimmed = phoneNumber.trim();

    if (this.isFirebaseMode) {
      try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
          return { success: false, message: 'Phiên đăng nhập xác thực SĐT không hợp lệ.' };
        }
        // Update password of currently signed-in (via Phone Auth) user account
        await updatePassword(currentUser, newPassword);
      } catch (error: any) {
        console.error('[VIAGO AUTH] Firebase Update Password Error:', error);
        return { success: false, message: 'Cập nhật mật khẩu thất bại trên Firebase Auth.' };
      }
    }

    // Update locally
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.phoneNumber === phoneTrimmed);

    if (userIndex === -1) {
      return { success: false, message: 'Không tìm thấy tài khoản để cập nhật mật khẩu.' };
    }

    const user = users[userIndex];
    user.passwordHash = await this.hashPassword(newPassword);
    user.password = newPassword;
    
    user.status = 'active';
    user.lockoutUntil = null;
    user.failedLoginAttempts = 0;

    users[userIndex] = user;
    this.saveUsers(users);

    // Sync current user session password if the phone number matches
    const currUser = this.currentUser();
    if (currUser && currUser.phoneNumber === phoneTrimmed) {
      currUser.passwordHash = user.passwordHash;
      currUser.password = newPassword;
      this.currentUser.set({ ...currUser });
      localStorage.setItem('viago_current_user', JSON.stringify(currUser));
    }

    this.logActivity(phoneTrimmed, 'PASSWORD_RESET', 'Đặt lại mật khẩu thành công.');
    return { success: true, message: 'Đặt lại mật khẩu thành công!' };
  }

  async softDeleteAccount(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    if (!this.isBrowser()) return { success: false, message: 'Yêu cầu môi trường trình duyệt.' };

    const phoneTrimmed = phoneNumber.trim();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.phoneNumber === phoneTrimmed);

    if (userIndex === -1) {
      return { success: false, message: 'Không tìm thấy tài khoản để khóa.' };
    }

    const user = users[userIndex];
    user.status = 'deleted'; // soft delete state
    
    // Rename SĐT to SĐT_deleted_timestamp to release it for new registrations
    const timestamp = Date.now();
    user.phoneNumber = `${phoneTrimmed}_deleted_${timestamp}`;
    
    users[userIndex] = user;
    this.saveUsers(users);

    this.logActivity(phoneTrimmed, 'LOCKOUT', 'Khóa tài khoản thành công. Số điện thoại được giải phóng.');

    // Clear user session
    localStorage.removeItem('viago_current_user');
    localStorage.removeItem('viago_session_expiry');
    this.currentUser.set(null);

    return { success: true, message: 'Khóa tài khoản thành công.' };
  }

  // --- LOGOUT & CONFIGURATION ---

  logout(reason: string = 'Đăng xuất khỏi hệ thống'): void {
    if (!this.isBrowser()) return;

    const user = this.currentUser();
    if (user) {
      this.logActivity(user.phoneNumber, 'LOGOUT', reason);
    }

    if (this.isFirebaseMode && this.auth) {
      signOut(this.auth).catch((err: any) => console.error('[VIAGO AUTH] Firebase SignOut Error:', err));
    }

    localStorage.removeItem('viago_current_user');
    localStorage.removeItem('viago_session_expiry');
    this.currentUser.set(null);
  }

  updateConfig(newConfig: AuthConfig): void {
    if (!this.isBrowser()) return;
    this.config.set(newConfig);
    localStorage.setItem('viago_auth_config', JSON.stringify(newConfig));
    this.updateSessionExpiry();
  }

  logActivity(phoneNumber: string, action: ActivityLog['action'], details: string): void {
    if (!this.isBrowser()) return;

    const logs = this.getActivityLogs();
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      phoneNumber,
      action,
      details
    };

    logs.unshift(newLog);
    const trimmedLogs = logs.slice(0, 100);
    
    localStorage.setItem('viago_activity_log', JSON.stringify(trimmedLogs));
    this.activityLogs.set(trimmedLogs);
  }

  getActivityLogs(): ActivityLog[] {
    if (!this.isBrowser()) return [];
    const logsStr = localStorage.getItem('viago_activity_log');
    return logsStr ? JSON.parse(logsStr) : [];
  }

  // --- SESSION INACTIVITY MONITOR ---

  private setupInactivityMonitor(): void {
    if (!this.isBrowser()) return;

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, () => this.recordUserActivity());
    });

    this.idleCheckIntervalId = setInterval(() => {
      if (this.currentUser()) {
        const idleDurationMs = Date.now() - this.lastActivityTime;
        const limitMs = this.config().sessionTimeoutMinutes * 60 * 1000;

        if (idleDurationMs > limitMs) {
          this.sessionTimeoutTriggered.set(true);
          this.logout(`Tự động đăng xuất do không hoạt động trong ${this.config().sessionTimeoutMinutes} phút.`);
        }
      }
    }, 10000);
  }

  private recordUserActivity(): void {
    if (!this.currentUser()) return;
    this.lastActivityTime = Date.now();
    this.updateSessionExpiry();
  }
}
