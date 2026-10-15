import express from 'express';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  listAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory,
  listAdminSuppliers, createAdminSupplier, updateAdminSupplier, deleteAdminSupplier,
  listAdminRepairUnits, createAdminRepairUnit, updateAdminRepairUnit, deleteAdminRepairUnit,
  listAdminBuildings, createAdminBuilding, updateAdminBuilding, deleteAdminBuilding
} from '../controllers/adminMasterDataController.js';

const router = express.Router();
const route = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
router.use(protect, requireRole(USER_ROLES.ADMIN));

router.route('/categories')
  .get(route(listAdminCategories))
  .post(route(createAdminCategory));
router.route('/categories/:id')
  .put(route(updateAdminCategory))
  .delete(route(deleteAdminCategory));

router.route('/suppliers')
  .get(route(listAdminSuppliers))
  .post(route(createAdminSupplier));
router.route('/suppliers/:id')
  .put(route(updateAdminSupplier))
  .delete(route(deleteAdminSupplier));

router.route('/repair-units')
  .get(route(listAdminRepairUnits))
  .post(route(createAdminRepairUnit));
router.route('/repair-units/:id')
  .put(route(updateAdminRepairUnit))
  .delete(route(deleteAdminRepairUnit));

router.route('/buildings')
  .get(route(listAdminBuildings))
  .post(route(createAdminBuilding));
router.route('/buildings/:id')
  .put(route(updateAdminBuilding))
  .delete(route(deleteAdminBuilding));

export default router;
