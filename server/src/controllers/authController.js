import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserSession, PasswordReset } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_STATUSES } from '../config/constants.js';
import { sendPasswordResetEmail, generateSixDigitOtp } from '../utils/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ruo_super_secret_jwt_key_2026_production_grade_university';
const ACCESS_TOKEN_EXPIRY = '15m'; // UC-1.1 requirement: 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // UC-1.1 requirement: 7 days

// Helper: Hash token for storage & revocation checks
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Password policy regex: >= 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Phone number regex (Vietnam 10-digit mobile)
const PHONE_REGEX = /^(84|0)(3|5|7|8|9)[0-9]{8}$/;

/**
 * UC-1.1: Login
 * Authenticate with email or employeeCode + password
 * Issues 15-minute Access Token and 7-day Refresh Token
 * Records IP, user-agent, and creates session in MongoDB
 */
export const login = async (req, res) => {
  try {
    const { email, employeeCode, identifier, password } = req.body;
    const loginInput = identifier || email || employeeCode;

    if (!loginInput || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã sinh viên/cán bộ hoặc email cùng mật khẩu.'
      });
    }

    const trimmedInput = String(loginInput).trim();
    const query = trimmedInput.includes('@')
      ? { email: trimmedInput.toLowerCase() }
      : { employeeCode: trimmedInput.toUpperCase() };

    const user = await User.findOne(query).populate('department');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập hoặc mật khẩu không chính xác.'
      });
    }

    // Check locked status (e.g. critically low repute score or manual lock)
    if (user.status === USER_STATUSES.LOCKED) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa do vi phạm chính sách hoặc điểm uy tín quá thấp.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập hoặc mật khẩu không chính xác.'
      });
    }

    // Generate JWT Access Token (15m) and Refresh Token (7d)
    const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY
    });

    const refreshToken = jwt.sign({ id: user._id, type: 'refresh' }, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY
    });

    // Create session in UserSession
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    const tokenHash = hashToken(accessToken);
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await UserSession.create({
      tokenHash,
      refreshTokenHash,
      user: user._id,
      ipAddress,
      userAgent,
      isRevoked: false,
      expiresAt
    });

    // Log action to AuditLog
    await AuditLog.logAction({
      user: user._id,
      userDisplay: `${user.fullName} (${user.employeeCode})`,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress
    });

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 900 seconds
      user: {
        id: user._id,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department ? user.department.name : null,
        className: user.className,
        phone: user.phone,
        avatar: user.avatar,
        reputeScore: user.reputeScore,
        status: user.status
      }
    });
  } catch (error) {
    console.error('[authController:login] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi hệ thống trong quá trình xử lý đăng nhập.',
      error: error.message
    });
  }
};

/**
 * UC-1.2: Logout
 * Revoke current JWT token session or all sessions if allDevices is true
 */
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { allDevices } = req.body;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const tokenHash = hashToken(token);

      if (allDevices) {
        // Revoke all sessions for this user across all devices
        await UserSession.updateMany(
          { user: req.user._id, isRevoked: false },
          { isRevoked: true }
        );
      } else {
        // Revoke current session only
        await UserSession.updateOne(
          { tokenHash },
          { isRevoked: true }
        );
      }
    }

    // Log logout to AuditLog
    await AuditLog.logAction({
      user: req.user._id,
      userDisplay: req.user.fullName,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user._id.toString(),
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: allDevices 
        ? 'Đăng xuất thành công khỏi tất cả các thiết bị.' 
        : 'Đăng xuất thành công. Phiên làm việc đã kết thúc.'
    });
  } catch (error) {
    console.error('[authController:logout] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xử lý yêu cầu đăng xuất.',
      error: error.message
    });
  }
};

/**
 * Refresh Token endpoint: Issue new 15m Access Token using 7d Refresh Token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: tokenInput } = req.body;

    if (!tokenInput) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Refresh Token hợp lệ.'
      });
    }

    const decoded = jwt.verify(tokenInput, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Mã xác thực không phải là Refresh Token hợp lệ.'
      });
    }

    const refreshTokenHash = hashToken(tokenInput);
    const session = await UserSession.findOne({ refreshTokenHash, isRevoked: false });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Phiên làm việc của Refresh Token không tồn tại hoặc đã bị thu hồi.'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status === USER_STATUSES.LOCKED) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không hợp lệ hoặc đã bị khóa.'
      });
    }

    // Issue new 15-minute Access Token
    const newAccessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY
    });

    // Update session with new access token hash
    session.tokenHash = hashToken(newAccessToken);
    await session.save();

    res.json({
      success: true,
      token: newAccessToken,
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
 * UC-1.3: Forgot Password - Step 1: Request OTP
 * Generates 6-digit OTP with 15-minute TTL
 * Enforces rate limit: maximum 3 requests per hour
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập địa chỉ email trường.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Anti-Enumeration: Always respond positively even if email doesn't exist
    if (!user) {
      return res.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, mã xác thực OTP (6 chữ số) đã được gửi đến hòm thư.'
      });
    }

    // Rate Limit Check: Maximum 3 requests in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequestsCount = await PasswordReset.countDocuments({
      email: normalizedEmail,
      createdAt: { $gte: oneHourAgo }
    });

    if (recentRequestsCount >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã yêu cầu OTP quá 3 lần trong vòng 1 giờ qua. Vui lòng thử lại sau.'
      });
    }

    // Generate 6-digit OTP
    const otp = generateSixDigitOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // Save to PasswordReset collection with 15-minute expiry
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await PasswordReset.create({
      email: normalizedEmail,
      otpHash,
      attempts: 0,
      isUsed: false,
      expiresAt
    });

    // Send email / log to terminal
    await sendPasswordResetEmail(normalizedEmail, otp);

    res.json({
      success: true,
      message: 'Mã xác thực OTP (6 chữ số) đã được gửi đến email trường của bạn. Mã có hiệu lực trong 15 phút.',
      // In development mode, return debugOtp so tests and UI demos can be seamless
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error('[authController:forgotPassword] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo mã OTP khôi phục mật khẩu lúc này.',
      error: error.message
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

    // Find the latest unused, unexpired reset record
    const resetRecord = await PasswordReset.findOne({
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực OTP không tồn tại hoặc đã hết hạn hiệu lực (15 phút).'
      });
    }

    // Lock if attempts exceed 5
    if (resetRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị vô hiệu hóa, vui lòng yêu cầu mã mới.'
      });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), resetRecord.otpHash);
    if (!isMatch) {
      resetRecord.attempts += 1;
      await resetRecord.save();
      return res.status(400).json({
        success: false,
        message: `Mã OTP không chính xác. Bạn còn ${5 - resetRecord.attempts} lần thử.`
      });
    }

    res.json({
      success: true,
      message: 'Xác thực mã OTP thành công! Bạn có thể tiến hành đặt lại mật khẩu mới.'
    });
  } catch (error) {
    console.error('[authController:verifyResetOtp] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi trong quá trình xác thực OTP.',
      error: error.message
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
        message: 'Vui lòng nhập đầy đủ thông tin: email, OTP và mật khẩu mới.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Validate new password complexity
    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt (@$!%*?&).'
      });
    }

    const resetRecord = await PasswordReset.findOne({
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.'
      });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), resetRecord.otpHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực OTP không chính xác.'
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng liên kết với email này.'
      });
    }

    // Check if new password is identical to old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng với mật khẩu cũ gần đây.'
      });
    }

    // Update password (pre-save hook will hash it)
    user.passwordHash = newPassword;
    await user.save();

    // Mark OTP record as used
    resetRecord.isUsed = true;
    await resetRecord.save();

    // Invalidate all active sessions across all devices for security
    await UserSession.updateMany(
      { user: user._id, isRevoked: false },
      { isRevoked: true }
    );

    // Audit log
    await AuditLog.logAction({
      user: user._id,
      userDisplay: user.fullName,
      action: 'PASSWORD_RESET_SUCCESS',
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Toàn bộ phiên đăng nhập cũ đã được thu hồi an toàn. Vui lòng đăng nhập bằng mật khẩu mới.'
    });
  } catch (error) {
    console.error('[authController:resetPassword] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể hoàn tất quá trình đặt lại mật khẩu.',
      error: error.message
    });
  }
};

/**
 * UC-1.4: Change Password
 * Validates old password, ensures new password meets complexity rules,
 * prevents duplicate password, and revokes all other sessions
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, logoutOtherDevices = true } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp cả mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại.'
      });
    }

    // Validate old password
    const isOldMatch = await user.comparePassword(oldPassword);
    if (!isOldMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.'
      });
    }

    // Check new password policy
    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt (@$!%*?&).'
      });
    }

    // Check duplicate with old password
    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
      });
    }

    // Update password (pre-save hook hashes passwordHash)
    user.passwordHash = newPassword;
    await user.save();

    // Revoke sessions
    const authHeader = req.headers.authorization;
    let currentTokenHash = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      currentTokenHash = hashToken(authHeader.split(' ')[1]);
    }

    if (logoutOtherDevices) {
      // Keep only current session alive, revoke all others
      await UserSession.updateMany(
        { user: user._id, tokenHash: { $ne: currentTokenHash }, isRevoked: false },
        { isRevoked: true }
      );
    }

    // Audit log
    await AuditLog.logAction({
      user: user._id,
      userDisplay: user.fullName,
      action: 'USER_CHANGE_PASSWORD',
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Các phiên đăng nhập trên thiết bị khác đã được thu hồi an toàn.'
    });
  } catch (error) {
    console.error('[authController:changePassword] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể hoàn tất việc đổi mật khẩu.',
      error: error.message
    });
  }
};

/**
 * UC-1.5: Profile View
 * Returns detailed identity, academic affiliations, contact info, and Repute Score (0-100)
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash')
      .populate('department');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ người dùng.'
      });
    }

    // Format repute score tier information
    let reputeTier = 'Chuẩn';
    let reputeColor = '#3B82F6';
    let bookingPrivilege = 'Duyệt mượn phòng bình thường, đặt trước tối đa 14 ngày';

    if (user.reputeScore >= 90) {
      reputeTier = 'Kim Cương (Ưu Tiên Tối Đa)';
      reputeColor = '#10B981';
      bookingPrivilege = 'Ưu tiên duyệt tự động tức thì, đặt trước tối đa 30 ngày';
    } else if (user.reputeScore < 50 && user.reputeScore > 30) {
      reputeTier = 'Cảnh Báo No-Show';
      reputeColor = '#F59E0B';
      bookingPrivilege = 'Bị giới hạn số lượt mượn phòng, cần phê duyệt thủ công 2 cấp';
    } else if (user.reputeScore <= 30) {
      reputeTier = 'Đình Chỉ Mượn Phòng';
      reputeColor = '#EF4444';
      bookingPrivilege = 'Tài khoản bị khóa quyền mượn phòng học/thiết bị do vi phạm quy chế';
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar || '',
        role: user.role,
        department: user.department ? {
          id: user.department._id,
          name: user.department.name,
          code: user.department.code
        } : null,
        className: user.className || '',
        reputeScore: user.reputeScore,
        reputeTier,
        reputeColor,
        bookingPrivilege,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[authController:getMe] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin hồ sơ cá nhân.',
      error: error.message
    });
  }
};

/**
 * UC-1.6: Update Profile
 * Allows user to update phone and avatar URL only
 * Hard-locks employeeCode, email, department, role, and reputeScore
 */
export const updateProfile = async (req, res) => {
  try {
    const { phone, avatar } = req.body;
    const user = await User.findById(req.user._id).populate('department');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ người dùng.'
      });
    }

    // Validate phone number if provided
    if (phone !== undefined) {
      const trimmedPhone = String(phone).replace(/\s+/g, '');
      if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (10 chữ số, ví dụ 0912345678).'
        });
      }
      user.phone = phone.trim();
    }

    // Update avatar if provided
    if (avatar !== undefined) {
      user.avatar = String(avatar).trim();
    }

    await user.save();

    // Audit log
    await AuditLog.logAction({
      user: user._id,
      userDisplay: user.fullName,
      action: 'USER_UPDATE_PROFILE',
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin liên hệ thành công!',
      user: {
        id: user._id,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        department: user.department ? user.department.name : null,
        className: user.className,
        reputeScore: user.reputeScore,
        status: user.status
      }
    });
  } catch (error) {
    console.error('[authController:updateProfile] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật hồ sơ cá nhân.',
      error: error.message
    });
  }
};

/**
 * Get all users list (for committee assignment / selector)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const query = { deletedAt: null };
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-passwordHash')
      .populate('department')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      total: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách người dùng.',
      error: error.message
    });
  }
};
