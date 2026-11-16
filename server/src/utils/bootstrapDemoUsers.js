import { User } from '../models/User.js';
import { USER_ROLES, TECHNICIAN_SPECIALTY_PROFILES } from '../config/constants.js';

const DEMO_TECH_SEEDS = [
  {
    code: 'KT001',
    email: 'technician@ruo.edu.vn',
    full_name: 'Kỹ Thuật Viên Trần Minh Tuấn',
    profile: TECHNICIAN_SPECIALTY_PROFILES.TECH_GENERAL,
    phone: '0987654321',
    avatar: 'TT'
  },
  {
    code: 'KT002',
    email: 'guard@ruo.edu.vn',
    full_name: 'Trực Ban Bảo Vệ Nguyễn Văn Bình',
    profile: TECHNICIAN_SPECIALTY_PROFILES.GUARD_OPS,
    phone: '0981112233',
    avatar: 'NB'
  },
  {
    code: 'KT003',
    email: 'hvac.tech@ruo.edu.vn',
    full_name: 'KTV Điện Lạnh Phạm Quang Huy',
    profile: TECHNICIAN_SPECIALTY_PROFILES.TECH_HVAC_POWER,
    phone: '0982223344',
    avatar: 'QH'
  },
  {
    code: 'KT004',
    email: 'it.tech@ruo.edu.vn',
    full_name: 'KTV CNTT & Nghe Nhìn Vũ Hoàng Nam',
    profile: TECHNICIAN_SPECIALTY_PROFILES.TECH_IT_AV,
    phone: '0983334455',
    avatar: 'HN'
  },
  {
    code: 'KT005',
    email: 'furn.tech@ruo.edu.vn',
    full_name: 'KTV Mộc & Cơ Khí Đỗ Văn Sơn',
    profile: TECHNICIAN_SPECIALTY_PROFILES.TECH_FURN_MECH,
    phone: '0984445566',
    avatar: 'VS'
  }
];

/**
 * Non-destructive initialization: guarantees all 5 specialized technicians exist
 * and can log in with standard demo credentials ('Ruo@2026').
 */
export const ensureDemoUsers = async () => {
  if (process.env.NODE_ENV === 'test') return;

  const commonPassword = 'Ruo@2026';

  for (const st of DEMO_TECH_SEEDS) {
    try {
      let user = await User.findOne({ $or: [{ code: st.code }, { email: st.email }] });

      if (!user) {
        await User.create({
          code: st.code,
          email: st.email,
          password_hash: commonPassword,
          full_name: st.full_name,
          role: USER_ROLES.TECHNICIAN,
          department: st.profile.department,
          specialty_code: st.profile.code,
          specialty_label: st.profile.label,
          allowed_categories: st.profile.allowed_categories,
          allowed_damage_levels: st.profile.allowed_damage_levels,
          specialized_tasks: st.profile.specialized_tasks,
          phone: st.phone,
          avatar: st.avatar
        });
        console.log(`[Ruo Auth Bootstrap] Initialized demo technician account: ${st.code} (${st.email})`);
      } else {
        let changed = false;
        if (!user.specialty_code || user.specialty_code === 'TECH_GENERAL' && st.profile.code !== 'TECH_GENERAL') {
          user.specialty_code = st.profile.code;
          user.specialty_label = st.profile.label;
          user.department = st.profile.department;
          user.allowed_categories = st.profile.allowed_categories;
          user.allowed_damage_levels = st.profile.allowed_damage_levels;
          user.specialized_tasks = st.profile.specialized_tasks;
          changed = true;
        }

        // If user is locked out from failed attempts during demo testing, unlock them
        if (user.failed_login_attempts > 0 || user.lock_until) {
          user.failed_login_attempts = 0;
          user.lock_until = null;
          changed = true;
        }

        // Ensure demo password matches Ruo@2026
        const passwordValid = await user.comparePassword(commonPassword);
        if (!passwordValid) {
          user.password_hash = commonPassword;
          changed = true;
        }

        if (changed) {
          await user.save();
          console.log(`[Ruo Auth Bootstrap] Synced demo technician account: ${st.code}`);
        }
      }
    } catch (err) {
      console.warn(`[Ruo Auth Bootstrap] Warning syncing demo user ${st.code}:`, err.message);
    }
  }
};
