import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: 'server/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db');

  const Repair = mongoose.model('Repair', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Equipment = mongoose.model('Equipment', new mongoose.Schema({}, { strict: false }));
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
  const Room = mongoose.model('Room', new mongoose.Schema({}, { strict: false }));
  const RepairLog = mongoose.model('RepairLog', new mongoose.Schema({}, { strict: false }));

  const kt1 = await User.findOne({ code: 'KT001' });
  const kt2 = await User.findOne({ code: 'KT002' });
  const kt3 = await User.findOne({ code: 'KT003' });
  const kt4 = await User.findOne({ code: 'KT004' });
  const kt5 = await User.findOne({ code: 'KT005' });
  const fm = await User.findOne({ role: 'facility_manager' });
  const gv = await User.findOne({ role: 'lecturer' });

  const cats = await Category.find({}).lean();
  const catMap = {};
  for (const c of cats) catMap[c._id.toString()] = c.code;

  // 1. Update existing tickets to proper specialty technicians
  const repairs = await Repair.find({}).lean();
  for (const r of repairs) {
    const eq = r.equipment_id ? await Equipment.findById(r.equipment_id).lean() : null;
    const catCode = eq ? catMap[eq.category_id?.toString()] : '';
    let newTech = null;
    if (['CAT-DISPLAY', 'CAT-AUDIO', 'CAT-IT', 'CAT-NET', 'CAT-SEC', 'CAT-OFFICE'].includes(catCode)) {
      newTech = kt4;
    } else if (['CAT-HVAC', 'CAT-POWER'].includes(catCode)) {
      newTech = kt3;
    } else if (catCode === 'CAT-FIRE') {
      newTech = r.damage_level === 'minor' ? kt2 : kt3;
    } else if (['CAT-FURN', 'CAT-SPEC'].includes(catCode)) {
      newTech = kt5;
    }

    if (newTech) {
      const updateData = {};
      if (r.assigned_to) {
        updateData.assigned_to = newTech._id;
      }
      updateData.ai_recommended_to = newTech._id;
      updateData.ai_dispatch_reason = `Phân công đúng chuyên môn: ${newTech.specialty_label || newTech.department} (${newTech.code})`;
      await Repair.findByIdAndUpdate(r._id, { $set: updateData });
      console.log(`Updated ${r.ticket_code} [${eq?.name}] -> assigned to ${newTech.code} (${newTech.full_name})`);
    }
  }

  // 2. Ensure KT005 has dedicated Furniture/Mechanical task
  const deskEq = await Equipment.findOne({ code: /DESKSTU|DESKLEC|RACK/ });
  const room101 = await Room.findOne({ code: 'A1-101' });
  if (deskEq) {
    let furnTicket = await Repair.findOne({ equipment_id: deskEq._id });
    if (!furnTicket) {
      furnTicket = await Repair.create({
        ticket_code: 'REP-MWFURN05-101',
        equipment_id: deskEq._id,
        room_id: deskEq.room_id || room101?._id,
        source: 'lecturer_report',
        reported_by: gv?._id || fm?._id,
        incident_description: 'Bàn ghế sinh viên bị lỏng bu-lông chân sắt, cập kênh và bung nẹp viền gỗ Melamine',
        damage_level: 'minor',
        status: 'in_progress',
        assigned_by: fm?._id,
        assigned_to: kt5._id,
        ai_recommended_to: kt5._id,
        ai_dispatch_score: 95,
        ai_dispatch_reason: 'Khớp chuyên ngành: KTV Mộc & Cơ Khí Đỗ Văn Sơn (KT005)',
        deadline: new Date(Date.now() + 36 * 3600 * 1000)
      });
      await RepairLog.create({
        repair_id: furnTicket._id,
        action: 'assigned',
        performed_by: fm?._id,
        description: 'Giao việc sửa chữa cơ khí bàn ghế cho KTV Mộc & Cơ Khí Đỗ Văn Sơn (KT005)'
      });
      console.log('Created dedicated Mechanical task for KT005:', furnTicket.ticket_code);
    } else {
      await Repair.findByIdAndUpdate(furnTicket._id, {
        $set: {
          ticket_code: 'REP-MWFURN05-101',
          assigned_to: kt5._id,
          ai_recommended_to: kt5._id,
          ai_dispatch_reason: 'Khớp chuyên ngành: KTV Mộc & Cơ Khí Đỗ Văn Sơn (KT005)'
        }
      });
    }
  }

  // 3. Ensure KT002 has dedicated Security/Operational task
  const extEq = await Equipment.findOne({ code: /EXT|FIRE/ });
  if (extEq) {
    let guardTicket = await Repair.findOne({ assigned_to: kt2?._id });
    if (!guardTicket) {
      guardTicket = await Repair.create({
        equipment_id: extEq._id,
        room_id: extEq.room_id || room101?._id,
        source: 'system_auto',
        reported_by: fm?._id,
        incident_description: 'Kiểm tra chốt niêm phong an toàn và áp suất bình chữa cháy PCCC theo ca trực ban',
        damage_level: 'minor',
        status: 'assigned',
        assigned_by: fm?._id,
        assigned_to: kt2._id,
        ai_recommended_to: kt2._id,
        ai_dispatch_score: 92,
        ai_dispatch_reason: 'Khớp chuyên ngành vận hành: Trực Ban Bảo Vệ Nguyễn Văn Bình (KT002)',
        deadline: new Date(Date.now() + 24 * 3600 * 1000)
      });
      console.log('Created dedicated Operational task for KT002:', guardTicket.ticket_code);
    }
  }

  console.log('ALL TASKS SUCCESSFULLY REALIGNED BY SPECIALTY!');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
