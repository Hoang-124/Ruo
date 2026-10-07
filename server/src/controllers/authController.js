import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, PasswordReset } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_STATUSES, USER_ROLES } from '../config/constants.js';
import { sendPasswordResetEmail, generateSixDigitOtp } from '../utils/mailer.js';

const ACCESS_TOKEN_EXPIRY = '15m'; // UC-1.1: 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // UC-1.1: 7 days

// Helper: SHA-256 hash for secure token storage
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Password policy regex: >= 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{8,}$/;

// Phone number regex (Vietnam 10-digit mobile)
const PHONE_REGEX = /^(84|0)(3|5|7|8|9)[0-9]{8}$/;

/**
 * UC-1.1: Login
 * Authenticate with email or employee code + password
 * Issues 15-minute Access Token and 7-day Refresh Token with token rotation
 */
export const login = async (req, res) => {
  const jwtSecret = process.env.JWT_SECRET || 'ruo_super_secret_jwt_key_2026_production_grade_university';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

  try {
    const { email, employeeCode, identifier, password } = req.body;
    const loginInput = identifier || email || employeeCode;

    if (!loginInput || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã nhân viên hoặc email cùng mật khẩu.'
      });
    }

    const trimmedInput = String(loginInput).trim();
    const query = trimmedInput.includes('@')
      ? { email: trimmedInput.toLowerCase() }
      : { code: trimmedInput.toUpperCase() };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập hoặc mật khẩu không chính xác.'
      });
    }

    if (user.status === USER_STATUSES.LOCKED) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa bởi lệnh quản trị.'
      });
    }

    if (user.status === USER_STATUSES.PENDING_APPROVAL) {
      const roleText = user.requested_role === USER_ROLES.FACILITY_MANAGER ? 'Quản Lý CSVC' : user.requested_role === USER_ROLES.TECHNICIAN ? 'Kỹ Thuật Viên' : 'Chức vụ chuyên trách';
      return res.status(403).json({
        success: false,
        isPending: true,
        message: `Hồ sơ đăng ký chức vụ [${roleText}] của bạn đang chờ Ban Quản trị (Admin) phê duyệt. Vui lòng liên hệ Admin để được kích hoạt tài khoản.`
      });
    }

    if (user.isLocked()) {
      const remainingMinutes = Math.max(1, Math.ceil((user.lock_until.getTime() - Date.now()) / (60 * 1000)));
      return res.status(423).json({
        success: false,
        isLocked: true,
        remainingMinutes,
        message: `Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
      });
    }

    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      const lockResult = await user.handleFailedLogin();

      if (lockResult.isLocked) {
        await AuditLog.logAction({
          user_id: user._id,
          user_display: `${user.full_name} (${user.code})`,
          action: 'USER_ACCOUNT_TEMP_LOCKED',
          target_table: 'users',
          entity_id: user._id.toString(),
          ip_address: ipAddress,
          new_value: {
            reason: 'FAILED_LOGIN_EXCEEDED_5_ATTEMPTS',
            lockDurationMinutes: 15,
            lockUntil: user.lock_until
          }
        });

        return res.status(423).json({
          success: false,
          isLocked: true,
          remainingMinutes: 15,
          message: 'Tài khoản của bạn đã bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp.'
        });
      }

      return res.status(401).json({
        success: false,
        isLocked: false,
        attemptsLeft: lockResult.attemptsLeft,
        failedAttempts: lockResult.failedAttempts,
        message: `Mật khẩu không chính xác. Bạn còn ${lockResult.attemptsLeft} lần thử trước khi tài khoản bị khóa tạm thời 15 phút.`
      });
    }

    // Reset failed counter on successful login
    await user.resetFailedLogin(ipAddress);

    // Generate JWT Access Token (15m) and Refresh Token (7d)
    const accessToken = jwt.sign(
      { id: user._id, userId: user._id, role: user.role, code: user.code, jti: crypto.randomUUID() },
      jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user._id, userId: user._id, role: user.role, type: 'refresh', jti: crypto.randomUUID() },
      jwtRefreshSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const hashedRefreshToken = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      user_id: user._id,
      token: hashedRefreshToken,
      device_info: req.headers['user-agent'] || 'Unknown Browser',
      ip_address: ipAddress,
      expires_at: expiresAt,
      is_revoked: false
    });

    // Record audit log
    await AuditLog.logAction({
      user_id: user._id,
      user_display: `${user.full_name} (${user.code})`,
      action: 'USER_LOGIN',
      target_table: 'users',
      entity_id: user._id.toString(),
      ip_address: ipAddress
    });

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 900 seconds
      user: {
        id: user._id,
        _id: user._id,
        code: user.code,
        employeeCode: user.code,
        full_name: user.full_name,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone || '',
        avatar: user.avatar || '',
        status: user.status,
        force_change_pw: user.force_change_pw,
        reputeScore: 100
      }
    });
  } catch (error) {
    console.error('[authController:login] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi hệ thống trong quá trình xử lý đăng nhập.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * UC-1.0: Register
 * Public registration for university staff, lecturers, and technicians
 * Issues 15-minute Access Token and 7-day Refresh Token upon success
 */
export const register = async (req, res) => {
  const jwtSecret = process.env.JWT_SECRET || 'ruo_super_secret_jwt_key_2026_production_grade_university';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

  try {
    const { fullName, email, employeeCode, password, role, department, phone } = req.body;

    if (!fullName || !email || !employeeCode || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ họ tên, email trường, mã cán bộ và mật khẩu.'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedCode = String(employeeCode).trim().toUpperCase();

    // Check duplicate email or employeeCode
    const existing = await User.findOne({
      $or: [{ email: trimmedEmail }, { code: trimmedCode }]
    });

    if (existing) {
      const isEmailDup = existing.email.toLowerCase() === trimmedEmail;
      const isCodeDup = existing.code.toUpperCase() === trimmedCode;

      let message = 'Thông tin đăng ký đã tồn tại trong hệ thống.';
      let duplicateField = 'both';
      if (isEmailDup && isCodeDup) {
        message = 'Cả email và mã cán bộ này đều đã tồn tại trong hệ thống.';
        duplicateField = 'both';
      } else if (isEmailDup) {
        message = 'Email trường này đã tồn tại trong hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.';
        duplicateField = 'email';
      } else if (isCodeDup) {
        message = 'Mã cán bộ / sinh viên này đã tồn tại trong hệ thống.';
        duplicateField = 'employeeCode';
      }

      return res.status(409).json({
        success: false,
        errorType: isEmailDup ? 'DUPLICATE_EMAIL' : 'DUPLICATE_CODE',
        duplicateField,
        message
      });
    }

    // Password validation (min 8 chars)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.'
      });
    }

    // Approval Workflow: Technicians and Facility Managers require Admin approval
    const requestedRole = (role === USER_ROLES.TECHNICIAN || role === USER_ROLES.FACILITY_MANAGER)
      ? role
      : USER_ROLES.LECTURER;
    const isPendingApproval = requestedRole !== USER_ROLES.LECTURER;
    const initialStatus = isPendingApproval ? USER_STATUSES.PENDING_APPROVAL : USER_STATUSES.ACTIVE;
    const initialRole = USER_ROLES.LECTURER;
    const { otp, skipOtp } = req.body;

    // Email OTP Verification flow for public registration (only when requireOtp is explicitly requested or configured)
    if (!otp && !skipOtp && (req.body.requireOtp === true || process.env.REQUIRE_REGISTER_OTP === 'true')) {
      const rawOtp = generateSixDigitOtp();
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(rawOtp, salt);

      await PasswordReset.updateMany(
        { email: trimmedEmail, purpose: 'register', is_used: false },
        { is_used: true }
      );

      await PasswordReset.create({
        email: trimmedEmail,
        otp_hash: otpHash,
        purpose: 'register',
        attempts: 0,
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
        is_used: false
      });

      await sendPasswordResetEmail(trimmedEmail, rawOtp, 'register');

      return res.status(200).json({
        success: true,
        requireOtp: true,
        email: trimmedEmail,
        message: 'Mã xác thực email OTP 6 số đã được gửi tới hộp thư của bạn. Vui lòng xác thực để hoàn tất tạo tài khoản.'
      });
    }

    if (otp) {
      const resetRecord = await PasswordReset.findOne({
        email: trimmedEmail,
        purpose: 'register',
        is_used: false,
        expires_at: { $gt: new Date() }
      }).sort({ _id: -1 });

      if (!resetRecord) {
        return res.status(400).json({
          success: false,
          message: 'Mã xác thực email không hợp lệ hoặc đã hết hạn hiệu lực (15 phút).'
        });
      }

      const isMatch = await bcrypt.compare(String(otp).trim(), resetRecord.otp_hash || resetRecord.otpHash);
      if (!isMatch) {
        resetRecord.attempts = (resetRecord.attempts || 0) + 1;
        if (resetRecord.attempts >= 5) resetRecord.is_used = true;
        await resetRecord.save();
        return res.status(400).json({
          success: false,
          message: 'Mã xác thực email không chính xác.'
        });
      }

      resetRecord.is_used = true;
      await resetRecord.save();
    }

    const newUser = await User.create({
      code: trimmedCode,
      full_name: String(fullName).trim(),
      email: trimmedEmail,
      password_hash: password, // Mongoose pre-save hook will bcrypt hash this
      role: initialRole,
      requested_role: requestedRole,
      department: department || 'Khoa Công Nghệ Thông Tin',
      phone: phone ? String(phone).trim() : '',
      status: initialStatus,
      avatar: fullName.slice(0, 2).toUpperCase()
    });

    // If role requires approval, do not issue tokens yet
    if (isPendingApproval) {
      const roleName = requestedRole === USER_ROLES.FACILITY_MANAGER ? 'Quản Lý CSVC' : 'Kỹ Thuật Viên';
      await AuditLog.logAction({
        user_id: newUser._id,
        user_display: `${newUser.full_name} (${newUser.code})`,
        action: 'USER_REGISTER_PENDING',
        target_table: 'users',
        entity_id: newUser._id.toString(),
        ip_address: req.ip || '127.0.0.1',
        new_value: { requested_role: requestedRole, status: USER_STATUSES.PENDING_APPROVAL }
      });

      return res.status(201).json({
        success: true,
        isPending: true,
        message: `Đăng ký thành công! Hồ sơ đăng ký chức vụ [${roleName}] của bạn đã được ghi nhận ở trạng thái CHỜ DUYỆT. Vui lòng đợi Ban Quản trị (Admin) phê duyệt kích hoạt tài khoản.`,
        user: {
          id: newUser._id,
          code: newUser.code,
          fullName: newUser.full_name,
          email: newUser.email,
          role: newUser.role,
          requestedRole: newUser.requested_role,
          status: newUser.status
        }
      });
    }

    // Generate JWT access token (15m) & refresh token (7d)
    const accessToken = jwt.sign(
      { id: newUser._id, userId: newUser._id, role: newUser.role, code: newUser.code, jti: crypto.randomUUID() },
      jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: newUser._id, userId: newUser._id, role: newUser.role, type: 'refresh', jti: crypto.randomUUID() },
      jwtRefreshSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const hashedRefreshToken = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      user_id: newUser._id,
      token: hashedRefreshToken,
      device_info: req.headers['user-agent'] || 'Unknown Browser',
      ip_address: ipAddress,
      expires_at: expiresAt,
      is_revoked: false
    });

    // Record audit log
    await AuditLog.logAction({
      user_id: newUser._id,
      user_display: `${newUser.full_name} (${newUser.code})`,
      action: 'USER_REGISTER',
      target_table: 'users',
      entity_id: newUser._id.toString(),
      ip_address: ipAddress,
      new_value: { code: newUser.code, email: newUser.email, role: newUser.role }
    });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Chào mừng bạn gia nhập hệ thống Ruo UEMS.',
      token: accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      user: {
        id: newUser._id,
        code: newUser.code,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        phone: newUser.phone || '',
        avatar: newUser.avatar,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('[authController:register] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi hệ thống trong quá trình đăng ký tài khoản.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check duplicate email or code in real-time
 */
export const checkDuplicate = async (req, res) => {
  try {
    const { email, code } = req.query;
    const result = {
      success: true,
      emailExists: false,
      codeExists: false,
      message: ''
    };

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        result.emailExists = true;
        result.message = 'Email này đã tồn tại trong hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.';
      }
    }

    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      const existingCode = await User.findOne({ code: cleanCode });
      if (existingCode) {
        result.codeExists = true;
        result.message = result.message
          ? `${result.message} Mã cán bộ này cũng đã tồn tại.`
          : 'Mã cán bộ / MSSV này đã tồn tại trong hệ thống.';
      }
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra trùng lặp thông tin.' });
  }
};

/**
 * UC-1.1b: Refresh Token with Automatic Token Rotation
 */
export const refreshToken = async (req, res) => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

  try {
    const { refreshToken: tokenInput } = req.body;

    if (!tokenInput) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Refresh Token.'
      });
    }

    const decoded = jwt.verify(tokenInput, jwtRefreshSecret);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Mã xác thực không phải là Refresh Token hợp lệ.'
      });
    }

    const hashedToken = hashToken(tokenInput);
    const tokenRecord = await RefreshToken.findOne({ token: hashedToken, is_revoked: false });

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        message: 'Refresh Token không tồn tại hoặc đã bị thu hồi.'
      });
    }

    const user = await User.findById(decoded.id || decoded.userId);
    if (!user || user.status === USER_STATUSES.LOCKED) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không hợp lệ hoặc đã bị khóa.'
      });
    }

    // Revoke old refresh token (token rotation)
    tokenRecord.is_revoked = true;
    await tokenRecord.save();

    // Issue new Access Token (15m) and new Refresh Token (7d)
    const newAccessToken = jwt.sign(
      { id: user._id, userId: user._id, role: user.role, code: user.code, jti: crypto.randomUUID() },
      jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id, userId: user._id, role: user.role, type: 'refresh', jti: crypto.randomUUID() },
      jwtRefreshSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    await RefreshToken.create({
      user_id: user._id,
      token: hashToken(newRefreshToken),
      device_info: req.headers['user-agent'] || '',
      ip_address: req.ip || '127.0.0.1',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      is_revoked: false
    });

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Refresh Token không hợp lệ hoặc đã hết hạn.'
    });
  }
};

/**
 * UC-1.2: Logout
 * Revokes refresh tokens for this user
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken: tokenInput, allDevices } = req.body;

    if (allDevices) {
      await RefreshToken.updateMany(
        { user_id: req.user._id, is_revoked: false },
        { is_revoked: true }
      );
    } else if (tokenInput) {
      await RefreshToken.updateOne(
        { token: hashToken(tokenInput) },
        { is_revoked: true }
      );
    } else {
      await RefreshToken.updateMany(
        { user_id: req.user._id, is_revoked: false },
        { is_revoked: true }
      );
    }

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'USER_LOGOUT',
      target_table: 'users',
      entity_id: req.user._id.toString(),
      ip_address: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: 'Đăng xuất thành công. Phiên làm việc đã được thu hồi an toàn.',
      scope: allDevices ? 'all' : 'single'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi trong quá trình xử lý đăng xuất.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * UC-1.3: Forgot Password - Step 1: Request OTP
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp địa chỉ email.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Anti-enumeration: always respond positively
    if (!user) {
      return res.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, mã xác thực OTP đã được gửi đến hòm thư.'
      });
    }

    // Rate limit: max 3 requests in last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await PasswordReset.countDocuments({
      email: normalizedEmail,
      $or: [
        { created_at: { $gte: oneHourAgo } },
        { createdAt: { $gte: oneHourAgo } }
      ]
    });

    if (recentCount >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã yêu cầu OTP quá 3 lần trong vòng 1 giờ qua. Vui lòng thử lại sau.'
      });
    }

    // Invalidate any older unused OTP records for this email so only the newest code is active
    await PasswordReset.updateMany(
      { email: normalizedEmail, isUsed: false },
      { isUsed: true }
    );

    const otp = generateSixDigitOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    await PasswordReset.create({
      email: normalizedEmail,
      otpHash,
      attempts: 0,
      isUsed: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    const mailSent = await sendPasswordResetEmail(normalizedEmail, otp);
    const hasSmtpConfig = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

    res.json({
      success: true,
      message: hasSmtpConfig && mailSent
        ? `Mã xác thực OTP đã được gửi đến hộp thư ${normalizedEmail}.`
        : 'Mã xác thực OTP (6 chữ số) đã được tạo và có hiệu lực trong 15 phút.',
      debugOtp: (!hasSmtpConfig && process.env.NODE_ENV !== 'production') ? otp : undefined,
      isRealMailSent: hasSmtpConfig && mailSent
    });
  } catch (error) {
    console.error('[forgotPassword] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo mã OTP khôi phục mật khẩu lúc này.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * UC-1.3: Forgot Password - Step 2: Verify OTP
 */
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ email và mã OTP 6 số.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    // Sort by _id descending to strictly guarantee the most recent OTP record is checked
    const resetRecord = await PasswordReset.findOne({
      email: normalizedEmail,
      expiresAt: { $gt: new Date() }
    }).sort({ _id: -1 });

    if (!resetRecord || (resetRecord.is_used && resetRecord.attempts < 5)) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực OTP không tồn tại hoặc đã hết hạn hiệu lực (15 phút).'
      });
    }

    if (resetRecord.attempts >= 5) {
      resetRecord.is_used = true;
      await resetRecord.save();
      return res.status(400).json({
        success: false,
        message: 'Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị vô hiệu hóa, vui lòng yêu cầu mã mới.'
      });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), resetRecord.otpHash);
    if (!isMatch) {
      const newAttempts = (resetRecord.attempts || 0) + 1;
      resetRecord.attempts = newAttempts;
      if (newAttempts >= 5) {
        resetRecord.isUsed = true;
      }
      await resetRecord.save();

      const remaining = Math.max(0, 5 - newAttempts);
      if (remaining === 0) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị vô hiệu hóa, vui lòng yêu cầu mã mới.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`
      });
    }

    res.json({
      success: true,
      message: 'Xác thực mã OTP thành công! Bạn có thể tiến hành đặt lại mật khẩu mới.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi trong quá trình xác thực OTP.'
    });
  }
};

/**
 * UC-1.3: Forgot Password - Step 3: Reset Password
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email, OTP và mật khẩu mới.'
      });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    // Sort by _id descending to strictly guarantee the most recent OTP record is checked
    const resetRecord = await PasswordReset.findOne({
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ _id: -1 });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.'
      });
    }

    if (resetRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP này đã bị khóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.'
      });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), resetRecord.otpHash);
    if (!isMatch) {
      const newAttempts = (resetRecord.attempts || 0) + 1;
      resetRecord.attempts = newAttempts;
      if (newAttempts >= 5) {
        resetRecord.isUsed = true;
      }
      await resetRecord.save();
      const remaining = Math.max(0, 5 - newAttempts);
      return res.status(400).json({
        success: false,
        message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng liên kết với email này.'
      });
    }

    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
      });
    }

    user.password_hash = newPassword; // Pre-save hook will hash it
    user.force_change_pw = false;
    await user.save();

    resetRecord.isUsed = true;
    await resetRecord.save();

    // Revoke all refresh tokens
    await RefreshToken.updateMany({ user_id: user._id, is_revoked: false }, { is_revoked: true });

    await AuditLog.logAction({
      user_id: user._id,
      user_display: `${user.full_name} (${user.code})`,
      action: 'PASSWORD_RESET_SUCCESS',
      target_table: 'users',
      entity_id: user._id.toString(),
      ip_address: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Toàn bộ phiên đăng nhập cũ đã được thu hồi an toàn.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể hoàn tất quá trình đặt lại mật khẩu.'
    });
  }
};

/**
 * UC-1.4: Change Password
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
    }

    const isOldMatch = await user.comparePassword(oldPassword);
    if (!isOldMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.'
      });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt.'
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
      });
    }

    user.password_hash = newPassword;
    user.force_change_pw = false;
    await user.save();

    // Revoke all refresh tokens
    await RefreshToken.updateMany({ user_id: user._id, is_revoked: false }, { is_revoked: true });

    await AuditLog.logAction({
      user_id: user._id,
      user_display: `${user.full_name} (${user.code})`,
      action: 'USER_CHANGE_PASSWORD',
      target_table: 'users',
      entity_id: user._id.toString(),
      ip_address: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Các phiên đăng nhập khác đã được thu hồi an toàn.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể hoàn tất việc đổi mật khẩu.'
    });
  }
};

/**
 * UC-1.5: Profile View
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ người dùng.' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        code: user.code,
        employeeCode: user.code,
        full_name: user.full_name,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar || '',
        role: user.role,
        department: user.department,
        status: user.status,
        force_change_pw: user.force_change_pw,
        created_at: user.created_at,
        reputeScore: 100,
        reputeTier: 'Chuẩn',
        bookingPrivilege: 'Tiêu chuẩn'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể tải thông tin hồ sơ cá nhân.' });
  }
};

/**
 * UC-1.6: Update Profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ người dùng.' });
    }

    if (phone !== undefined) {
      const trimmedPhone = String(phone).replace(/\s+/g, '');
      if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không hợp lệ (yêu cầu số di động Việt Nam 10 chữ số).'
        });
      }
      user.phone = phone.trim();
    }

    if (avatar !== undefined) {
      user.avatar = String(avatar).trim();
    }

    await user.save();

    await AuditLog.logAction({
      user_id: user._id,
      user_display: `${user.full_name} (${user.code})`,
      action: 'USER_UPDATE_PROFILE',
      target_table: 'users',
      entity_id: user._id.toString(),
      ip_address: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công!',
      user: {
        id: user._id,
        code: user.code,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        department: user.department,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể cập nhật hồ sơ cá nhân.' });
  }
};

/**
 * UC-10.1: Create User (Admin Only)
 */
export const createUser = async (req, res) => {
  try {
    const { code, full_name, email, password, role, department, phone } = req.body;

    if (!code || !full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã nhân viên, họ tên và email.'
      });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ code: cleanCode }, { email: cleanEmail }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Mã nhân viên hoặc email đã tồn tại trong hệ thống.'
      });
    }

    const validRoles = Object.values(USER_ROLES);
    const assignedRole = validRoles.includes(role) ? role : USER_ROLES.LECTURER;
    const initialPassword = password || `Ruo@${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = await User.create({
      code: cleanCode,
      full_name: String(full_name).trim(),
      email: cleanEmail,
      password_hash: initialPassword, // Pre-save hook will hash it
      role: assignedRole,
      department: department || 'Phòng Hành Chính Quản Trị',
      phone: phone || '',
      status: USER_STATUSES.ACTIVE,
      force_change_pw: !password // If auto-generated, force change
    });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'USER_CREATE',
      target_table: 'users',
      entity_id: newUser._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { code: cleanCode, email: cleanEmail, role: assignedRole }
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản người dùng thành công.',
      user: {
        id: newUser._id,
        code: newUser.code,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        phone: newUser.phone,
        status: newUser.status,
        tempPassword: !password ? initialPassword : undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể tạo tài khoản người dùng.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * UC-10.2: Get All Users (Admin Only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { code: { $regex: escaped, $options: 'i' } },
        { full_name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password_hash')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      total: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách người dùng.'
    });
  }
};

/**
 * View User Details (Admin Only)
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tải chi tiết người dùng.' });
  }
};

/**
 * Assign User Role (Admin Only)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò (role) không hợp lệ.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'UPDATE_ROLE',
      target_table: 'users',
      entity_id: user._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      old_value: { role: oldRole },
      new_value: { role: user.role }
    });

    res.json({ success: true, message: 'Cập nhật vai trò người dùng thành công.', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể cập nhật vai trò người dùng.' });
  }
};

/**
 * Lock / Unlock User Account (Admin Only)
 */
export const toggleUserLock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    // Toggle status
    const newStatus = user.status === USER_STATUSES.LOCKED ? USER_STATUSES.ACTIVE : USER_STATUSES.LOCKED;
    const oldStatus = user.status;
    user.status = newStatus;
    if (newStatus === USER_STATUSES.ACTIVE) {
      user.failed_login_attempts = 0;
      user.lock_until = null;
    }
    await user.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: newStatus === USER_STATUSES.LOCKED ? 'LOCK_USER' : 'UNLOCK_USER',
      target_table: 'users',
      entity_id: user._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      old_value: { status: oldStatus },
      new_value: { status: newStatus }
    });

    res.json({
      success: true,
      message: newStatus === USER_STATUSES.LOCKED ? 'Đã khóa tài khoản người dùng.' : 'Đã mở khóa tài khoản người dùng.',
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể thay đổi trạng thái tài khoản.' });
  }
};

/**
 * Reset User Password (Admin Only)
 */
export const adminResetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    const { new_password } = req.body;
    const tempPassword = new_password || `Ruo@${Math.floor(100000 + Math.random() * 900000)}`;
    user.password_hash = tempPassword; // Pre-save hook will hash
    user.force_change_pw = true;
    user.failed_login_attempts = 0;
    user.lock_until = null;
    await user.save();

    // Revoke existing refresh tokens
    await RefreshToken.updateMany({ user_id: user._id }, { is_revoked: true });

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'ADMIN_RESET_PASSWORD',
      target_table: 'users',
      entity_id: user._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { force_change_pw: true }
    });

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Người dùng sẽ phải đổi mật khẩu khi đăng nhập lần tới.',
      tempPassword
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể đặt lại mật khẩu người dùng.' });
  }
};

/**
 * Approve or Reject User Registration Role (Admin Only)
 */
export const approveUser = async (req, res) => {
  try {
    const { action, role } = req.body; // action: 'approve' | 'reject'
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    if (action === 'reject') {
      const oldRequested = user.requested_role;
      user.status = USER_STATUSES.ACTIVE;
      user.role = USER_ROLES.LECTURER;
      user.requested_role = null;
      await user.save();

      await AuditLog.logAction({
        user_id: req.user._id,
        user_display: `${req.user.full_name} (${req.user.code})`,
        action: 'REJECT_USER_ROLE',
        target_table: 'users',
        entity_id: user._id.toString(),
        ip_address: req.ip || '127.0.0.1',
        old_value: { requested_role: oldRequested },
        new_value: { role: USER_ROLES.LECTURER, status: USER_STATUSES.ACTIVE }
      });

      return res.json({
        success: true,
        message: `Đã từ chối nguyện vọng chức vụ và kích hoạt tài khoản với vai trò Giảng Viên thường.`,
        user
      });
    }

    // Approve
    const approvedRole = role || user.requested_role || USER_ROLES.LECTURER;
    if (!Object.values(USER_ROLES).includes(approvedRole)) {
      return res.status(400).json({ success: false, message: 'Vai trò (role) phê duyệt không hợp lệ.' });
    }

    user.role = approvedRole;
    user.status = USER_STATUSES.ACTIVE;
    user.approved_by = req.user._id;
    user.approved_at = new Date();
    await user.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'APPROVE_USER_ROLE',
      target_table: 'users',
      entity_id: user._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { role: approvedRole, status: USER_STATUSES.ACTIVE, approved_by: req.user._id }
    });

    const roleTitle = approvedRole === USER_ROLES.FACILITY_MANAGER ? 'Quản Lý CSVC' : approvedRole === USER_ROLES.TECHNICIAN ? 'Kỹ Thuật Viên' : 'Giảng Viên';

    res.json({
      success: true,
      message: `Đã phê duyệt tài khoản ${user.full_name} vào chức vụ [${roleTitle}] thành công!`,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi xử lý phê duyệt tài khoản: ' + error.message });
  }
};

/**
 * Verify Register OTP and Activate User Account
 */
export const verifyRegisterOtp = async (req, res) => {
  return register(req, res);
};

