const toUtcDate = (value) => {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

export const getCalendarDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMaintenanceCalendarDays = (year, month) => {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, month, 1 - mondayOffset));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    return {
      key: getCalendarDateKey(date),
      day: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === month,
      date
    };
  });
};

export const getMaintenanceOccurrencesForMonth = (plans, year, month) => {
  const occurrences = new Map();

  for (const plan of plans) {
    const start = toUtcDate(plan.start_date);
    const monthOffset = (year - start.getUTCFullYear()) * 12 + month - start.getUTCMonth();
    const interval = plan.frequency === 'quarterly' ? 3 : 1;
    if (monthOffset < 0 || monthOffset % interval !== 0) continue;

    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const dueDate = new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDayOfMonth)));
    const key = getCalendarDateKey(dueDate);
    const duePlans = occurrences.get(key) || [];
    duePlans.push(plan);
    occurrences.set(key, duePlans);
  }

  return occurrences;
};

const getId = (item) => String(typeof item === 'object' && item !== null ? item._id : item);

export const getMaintenancePlanDetails = (plan, equipment = []) => {
  const rooms = plan.room_ids || [];
  const categories = plan.category_ids || [];
  const roomIds = rooms.map(getId);
  const categoryIds = categories.map(getId);
  const roomNames = rooms
    .map((room) => typeof room === 'object' && room !== null ? room.code || room.name : '')
    .filter(Boolean);
  const categoryNames = categories
    .map((category) => typeof category === 'object' && category !== null ? category.name : '')
    .filter(Boolean);
  const equipmentCount = equipment.filter((item) => {
    const roomId = getId(item.room_id);
    const categoryId = getId(item.category_id);
    return roomIds.includes(roomId) && (!categoryIds.length || categoryIds.includes(categoryId));
  }).length;

  return {
    roomNames,
    roomLabel: roomNames.length ? roomNames.join(', ') : `${rooms.length} phòng`,
    categoryNames,
    categoryLabel: categoryNames.length ? categoryNames.join(', ') : 'Tất cả loại thiết bị',
    equipmentCount
  };
};
