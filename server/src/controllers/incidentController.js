import { Incident, MaintenanceTicket, IncidentComment } from '../models/Incident.js';
import { Room } from '../models/Facility.js';
import { Equipment } from '../models/Equipment.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { computeSlaDeadlines, evaluateSlaStatus } from '../services/slaReactor.js';
import { TICKET_STATUSES, ROOM_STATUSES } from '../config/constants.js';

// @desc    Report an incident (Student, Lecturer, Staff)
// @route   POST /api/incidents
export const reportIncident = async (req, res) => {
  const { roomCode, equipmentAssetCode, title, description, priority = 'medium', images = [] } = req.body;

  let room = null;
  if (roomCode) {
    room = await Room.findOne({ code: roomCode.toUpperCase() });
  }

  let equipment = null;
  if (equipmentAssetCode) {
    equipment = await Equipment.findOne({ assetCode: equipmentAssetCode.toUpperCase() });
  }

  const ticketCode = `TCK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const slaMetrics = computeSlaDeadlines(priority, new Date());

  const incident = await Incident.create({
    ticketCode,
    reporter: req.user._id,
    room: room ? room._id : null,
    equipment: equipment ? equipment._id : null,
    title,
    description,
    priority,
    status: TICKET_STATUSES.OPEN,
    images,
    slaTracking: {
      slaStartTime: slaMetrics.slaStartTime,
      responseDeadline: slaMetrics.responseDeadline,
      resolutionDeadline: slaMetrics.resolutionDeadline,
      remainingMinutes: slaMetrics.totalMinutes,
      state: 'on_track'
    }
  });

  // If high or critical, mark room or equipment under maintenance
  if (['high', 'critical'].includes(priority) && room) {
    room.status = ROOM_STATUSES.MAINTENANCE;
    await room.save();
  }

  // Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: 'INCIDENT_REPORT',
    entityType: 'Incident',
    entityId: incident._id.toString(),
    ipAddress: req.ip,
    diffData: {
      ticketCode,
      priority,
      roomCode: room ? room.code : null,
      equipmentCode: equipment ? equipment.assetCode : null
    }
  });

  res.status(201).json({
    success: true,
    message: 'Báo cáo sự cố thành công. Hệ thống SLA Reactor đã khởi động đếm ngược xử lý.',
    incident
  });
};

// @desc    Get all tickets for Kanban Board with real-time SLA metrics
// @route   GET /api/incidents/kanban
export const getKanbanTickets = async (req, res) => {
  const incidents = await Incident.find({ deletedAt: null })
    .populate('reporter', 'fullName employeeCode role phone')
    .populate('room', 'code name building floorNumber')
    .populate('equipment', 'assetCode name originalPrice remainingValue')
    .sort({ createdAt: -1 });

  // Evaluate real-time SLA states
  const now = new Date();
  const evaluatedIncidents = incidents.map(inc => {
    const incObj = inc.toObject();
    if (inc.status !== TICKET_STATUSES.CLOSED && inc.status !== TICKET_STATUSES.RESOLVED) {
      const evaluation = evaluateSlaStatus(inc.slaTracking, now);
      incObj.slaTracking.remainingMinutes = evaluation.remainingMinutes;
      incObj.slaTracking.state = evaluation.state;
    }
    return incObj;
  });

  res.json({
    success: true,
    total: evaluatedIncidents.length,
    tickets: evaluatedIncidents
  });
};

// @desc    Assign ticket to a maintenance technician
// @route   PUT /api/incidents/:id/assign
export const assignTicket = async (req, res) => {
  const { technicianId } = req.body;

  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, message: 'Ticket không tồn tại.' });
  }

  incident.status = TICKET_STATUSES.ASSIGNED;
  incident.slaTracking.actualResponseTime = new Date();
  await incident.save();

  // Create or update maintenance ticket
  let ticket = await MaintenanceTicket.findOne({ incident: incident._id });
  if (!ticket) {
    ticket = await MaintenanceTicket.create({
      incident: incident._id,
      assignedTo: technicianId,
      status: TICKET_STATUSES.ASSIGNED,
      startedAt: new Date()
    });
  } else {
    ticket.assignedTo = technicianId;
    ticket.status = TICKET_STATUSES.ASSIGNED;
    await ticket.save();
  }

  // Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: 'TICKET_ASSIGN',
    entityType: 'Incident',
    entityId: incident._id.toString(),
    ipAddress: req.ip,
    diffData: {
      ticketCode: incident.ticketCode,
      assignedTo: technicianId
    }
  });

  res.json({
    success: true,
    message: 'Phân công kỹ thuật viên xử lý sự cố thành công.',
    incident,
    maintenanceTicket: ticket
  });
};

// @desc    Update ticket resolution & costs
// @route   PUT /api/incidents/:id/resolve
export const resolveTicket = async (req, res) => {
  const { rootCause, resolution, laborCost = 0, materialCost = 0, partsUsed = [] } = req.body;

  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, message: 'Ticket không tồn tại.' });
  }

  incident.status = TICKET_STATUSES.RESOLVED;
  incident.resolvedAt = new Date();
  incident.slaTracking.actualResolutionTime = new Date();
  await incident.save();

  const totalCost = Number(laborCost) + Number(materialCost);

  // Update maintenance ticket record
  await MaintenanceTicket.findOneAndUpdate(
    { incident: incident._id },
    {
      status: TICKET_STATUSES.RESOLVED,
      rootCause,
      resolution,
      laborCost,
      materialCost,
      totalRepairCost: totalCost,
      partsUsed,
      completedAt: new Date()
    },
    { upsert: true }
  );

  // If incident was related to equipment, aggregate its repair cost and count
  if (incident.equipment) {
    const eq = await Equipment.findById(incident.equipment);
    if (eq) {
      eq.repairCount += 1;
      eq.estimatedRepairCost += totalCost;
      await eq.save(); // Save triggers the R >= 60% check automatically!
    }
  }

  // If room was under maintenance, restore to available
  if (incident.room) {
    await Room.findByIdAndUpdate(incident.room, { status: ROOM_STATUSES.AVAILABLE });
  }

  // Audit Log
  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: 'TICKET_RESOLVE',
    entityType: 'Incident',
    entityId: incident._id.toString(),
    ipAddress: req.ip,
    diffData: {
      ticketCode: incident.ticketCode,
      totalRepairCost: totalCost,
      resolution
    }
  });

  res.json({
    success: true,
    message: 'Đã hoàn tất khắc phục sự cố và cập nhật chi phí sửa chữa vào hồ sơ tài sản.',
    incident
  });
};
