import { Equipment } from '../models/Equipment.js';
import { Repair } from '../models/Repair.js';
import { SparePart } from '../models/SparePart.js';
import { Room } from '../models/Room.js';
import { Disposal } from '../models/Disposal.js';
import { DISPOSAL_STATUSES } from '../config/constants.js';
import { OPEN_REPAIR_STATUSES, EQUIPMENT_STATUS_GROUP, summarizeKpi } from '../services/dashboardAnalytics.js';

export const getKpi = async (req, res) => {
  try {
    const now = new Date();
    const [groups, repairGroups, stock, totalRooms, pendingDisposals] = await Promise.all([
      Equipment.aggregate([EQUIPMENT_STATUS_GROUP]),
      Repair.aggregate([
        { $match: { status: { $in: OPEN_REPAIR_STATUSES } } },
        { $group: { _id: null, openRepairs: { $sum: 1 }, overdueRepairs: { $sum: { $cond: [
          { $and: [{ $ne: ['$deadline', null] }, { $lt: ['$deadline', now] }] }, 1, 0
        ] } } } }
      ]),
      SparePart.aggregate([{ $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$price'] } } } }]),
      Room.countDocuments(), Disposal.countDocuments({ status: DISPOSAL_STATUSES.PROPOSED })
    ]);
    res.json({ success: true, generatedAt: now, metrics: { ...summarizeKpi(groups, repairGroups[0], stock[0]?.value), totalRooms, pendingDisposals } });
  } catch {
    res.status(500).json({ success: false, message: 'Không tải được chỉ số tổng quan.' });
  }
};

