import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { USER_ROLES, USER_STATUSES } from './constants.js';

const CANONICAL_DEMO_USERS = [
  {
    code: 'AD001',
    email: 'admin@ruo.edu.vn',
    password: 'Ruo@2026',
    full_name: 'Quản Trị Viên Hệ Thống',
    role: USER_ROLES.ADMIN,
    department: 'Phòng Quản Trị Hệ Thống',
    phone: '0901234567',
    status: USER_STATUSES.ACTIVE
  },
  {
    code: 'QL001',
    email: 'manager@ruo.edu.vn',
    password: 'Ruo@2026',
    full_name: 'Quản Lý CSVC Lê Hoàng Hải',
    role: USER_ROLES.FACILITY_MANAGER,
    department: 'Phòng Quản Lý Cơ Sở Vật Chất',
    phone: '0912345678',
    status: USER_STATUSES.ACTIVE
  },
  {
    code: 'KT001',
    email: 'technician@ruo.edu.vn',
    password: 'Ruo@2026',
    full_name: 'Kỹ Thuật Viên Trần Minh Tuấn',
    role: USER_ROLES.TECHNICIAN,
    department: 'Tổ Kỹ Thuật Bảo Trì',
    phone: '0987654321',
    status: USER_STATUSES.ACTIVE
  },
  {
    code: 'GV001',
    email: 'lecturer@ruo.edu.vn',
    password: 'Ruo@2026',
    full_name: 'Giảng Viên Nguyễn Văn An',
    role: USER_ROLES.LECTURER,
    department: 'Khoa Công Nghệ Thông Tin',
    phone: '0971234567',
    status: USER_STATUSES.ACTIVE
  }
];

export const ensureCanonicalDemoUsers = async () => {
  const usersCollection = mongoose.connection.db.collection('users');
  const auditLogsCollection = mongoose.connection.db.collection('auditlogs');

  const legacyUserExists = await User.exists({
    $or: [
      { employeeCode: { $exists: true } },
      { passwordHash: { $exists: true } },
      { role: { $in: ['student', 'facility_staff', 'maintenance', 'academic_affairs'] } }
    ]
  });

  if (legacyUserExists) {
    await usersCollection.dropIndex('employeeCode_1').catch(() => {});
    await User.deleteMany({});
    console.log('[Ruo Database] Detected legacy auth schema. Resetting users collection to canonical demo accounts.');
  }

  const legacyAuditLogFilter = {
    $or: [
      { seq: { $exists: false } },
      { previous_hash: { $exists: false } },
      { hash_sha256: { $exists: false } },
      { seq: null },
      { previous_hash: null },
      { hash_sha256: null },
      { sha256Hash: null },
      { prevHash: null },
      { sha256Hash: { $exists: false } },
      { prevHash: { $exists: false } }
    ]
  };

  const legacyAuditLogCount = await auditLogsCollection.countDocuments(legacyAuditLogFilter);

  if (legacyAuditLogCount > 0) {
    await auditLogsCollection.deleteMany(legacyAuditLogFilter);
    console.log('[Ruo Database] Removed legacy audit records with null/missing hash fields so login audit logging can resume.');
  }

  for (const seedUser of CANONICAL_DEMO_USERS) {
    const query = { email: seedUser.email.toLowerCase() };
    let user = await User.findOne(query);

    if (!user) {
      user = new User({
        ...seedUser,
        email: seedUser.email.toLowerCase(),
        password_hash: seedUser.password,
        status: USER_STATUSES.ACTIVE,
        requested_role: null,
        approved_by: null,
        approved_at: null,
        force_change_pw: false,
        failed_login_attempts: 0,
        lock_until: null
      });
      await user.save();
      console.log(`[Ruo Database] Created demo account: ${seedUser.email} / ${seedUser.password}`);
      continue;
    }

    const shouldReset =
      user.code !== seedUser.code ||
      user.full_name !== seedUser.full_name ||
      user.role !== seedUser.role ||
      user.department !== seedUser.department ||
      user.phone !== seedUser.phone ||
      user.status !== USER_STATUSES.ACTIVE;

    if (shouldReset) {
      user.code = seedUser.code;
      user.full_name = seedUser.full_name;
      user.role = seedUser.role;
      user.department = seedUser.department;
      user.phone = seedUser.phone;
      user.status = USER_STATUSES.ACTIVE;
      user.password_hash = seedUser.password;
      await user.save();
      console.log(`[Ruo Database] Reset demo account: ${seedUser.email}`);
    }
  }
};

export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    console.log(`[Ruo Database] Connected to MongoDB host: ${conn.connection.host} | DB: ${conn.connection.name}`);

    await ensureCanonicalDemoUsers();

    mongoose.connection.on('error', (err) => {
      console.error('[Ruo Database Error]', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Ruo Database Warning] MongoDB connection disconnected. Attempting reconnect...');
    });

    return conn;
  } catch (error) {
    console.error(`[Ruo Database Connection Failure] ${error.message}`);
    process.exit(1);
  }
};
