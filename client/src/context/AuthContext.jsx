import { createContext, useContext } from 'react';
import { USER_ROLES, ROLE_METADATA, getNavItemsForRole } from '../config/navigation';

const authContext = createContext();

// Export canonical role permissions for any legacy components
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    title: ROLE_METADATA[USER_ROLES.ADMIN].label,
    desc: ROLE_METADATA[USER_ROLES.ADMIN].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.ADMIN).map(i => i.id)
  },
  [USER_ROLES.FACILITY_MANAGER]: {
    title: ROLE_METADATA[USER_ROLES.FACILITY_MANAGER].label,
    desc: ROLE_METADATA[USER_ROLES.FACILITY_MANAGER].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.FACILITY_MANAGER).map(i => i.id)
  },
  [USER_ROLES.TECHNICIAN]: {
    title: ROLE_METADATA[USER_ROLES.TECHNICIAN].label,
    desc: ROLE_METADATA[USER_ROLES.TECHNICIAN].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.TECHNICIAN).map(i => i.id)
  },
  [USER_ROLES.LECTURER]: {
    title: ROLE_METADATA[USER_ROLES.LECTURER].label,
    desc: ROLE_METADATA[USER_ROLES.LECTURER].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.LECTURER).map(i => i.id)
  },
  // Backward compatibility aliases
  manager: {
    title: ROLE_METADATA[USER_ROLES.FACILITY_MANAGER].label,
    desc: ROLE_METADATA[USER_ROLES.FACILITY_MANAGER].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.FACILITY_MANAGER).map(i => i.id)
  },
  staff: {
    title: ROLE_METADATA[USER_ROLES.TECHNICIAN].label,
    desc: ROLE_METADATA[USER_ROLES.TECHNICIAN].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.TECHNICIAN).map(i => i.id)
  }
};

export const useAuth = () => {
  const context = useContext(authContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default authContext;