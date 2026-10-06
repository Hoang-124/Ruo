// Centralized Model Registry for Ruo (24 Collections across 6 Modules)

// Module 1: Auth & Security
export { User } from './User.js';
export { Role } from './Role.js';
export { RefreshToken } from './RefreshToken.js';
export { LoginHistory } from './LoginHistory.js';

// Module 2: Master Data & Spatial
export { Room, Building, Floor } from './Room.js';
export { Category, EquipmentCategory } from './Category.js';
export { Supplier } from './Supplier.js';
export { RepairUnit } from './RepairUnit.js';
export { SparePart } from './SparePart.js';

// Module 3: Equipment Management
export { Equipment } from './Equipment.js';
export { Transfer } from './Transfer.js';
export { Disposal, DisposalProposal } from './Disposal.js';
export { ImportSession } from './ImportSession.js';

// Module 4: Incident & Repair Management
export { Repair } from './Repair.js';
export { RepairLog } from './RepairLog.js';
export { PartsRequest } from './PartsRequest.js';
export { RepairPart } from './RepairPart.js';

// Module 5: Maintenance & Inventory Management
export { MaintenancePlan } from './MaintenancePlan.js';
export { MaintenanceLog } from './MaintenanceLog.js';
export { InventorySession } from './InventorySession.js';
export { InventoryLog } from './InventoryLog.js';

// Module 6: System & Governance
export { Notification } from './Notification.js';
export { NotificationTemplate } from './NotificationTemplate.js';
export { AuditLog } from './AuditLog.js';
