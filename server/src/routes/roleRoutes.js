import express from 'express';
import { getRoles, updateRolePermissions, batchUpdateRoles, resetDefaultRoles } from '../controllers/roleController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';

const router = express.Router();

router.use(protect);

// View role permissions (Admin, Facility Manager)
router.get('/', getRoles);

// Configure role permissions (Admin Only)
router.post('/batch-update', requireRole(USER_ROLES.ADMIN), batchUpdateRoles);
router.post('/reset-defaults', requireRole(USER_ROLES.ADMIN), resetDefaultRoles);
router.put('/:id', requireRole(USER_ROLES.ADMIN), updateRolePermissions);

export default router;
