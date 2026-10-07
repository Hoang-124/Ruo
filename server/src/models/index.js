// Centralized Model Registry for Ruo (20 Collections across 6 Modules)
// Conforming to dbdiagram.dbml & DB_MODULES_EXPLAINED.md

// Module 1: Auth & User
export { User } from './User.js';
export { Role } from './Role.js';
export { RefreshToken } from './RefreshToken.js';
export { PasswordReset } from './PasswordReset.js';

// Module 2: Master Data
export { Category, EquipmentCategory } from './Category.js';
export { Supplier } from './Supplier.js';
export { RepairUnit } from './RepairUnit.js';
export { Room, Building, Floor } from './Room.js';
export { SparePart } from './SparePart.js';

// Module 3: Equipment, Movement & Disposal
export { Equipment } from './Equipment.js';
export { EquipmentMovement, Transfer } from './EquipmentMovement.js';
export { Disposal } from './Disposal.js';
export { ImportSession } from './ImportSession.js';

// Module 4: Repair
export { Repair } from './Repair.js';
export { RepairLog } from './RepairLog.js';
export { PartsRequest } from './PartsRequest.js';

// Module 5: Inventory
export { InventorySession } from './InventorySession.js';
export { InventoryLog } from './InventoryLog.js';

// Module 6: Notification & Audit
export { Notification } from './Notification.js';
export { AuditLog } from './AuditLog.js';
