import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { facilityApi, maintenanceApi, masterDataApi } from '../../lib/api';
import {
  getMaintenanceCalendarDays,
  getMaintenanceOccurrencesForMonth,
  getMaintenancePlanDetails
} from './maintenanceCalendar';

const DEFAULT_CHECKLIST = [
  'Kiểm tra nguồn điện và dây kết nối',
  'Kiểm tra hoạt động và chất lượng vận hành',
  'Vệ sinh thiết bị và khu vực lắp đặt',
  'Kiểm tra dấu hiệu hư hỏng, tiếng ồn hoặc quá nhiệt'
];

const localDate = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const localDateFor = (date) => {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
};

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : 'Chưa xác định';

const fieldStyle = {
  display: 'block',
  width: '100%',
  marginTop: 6
};

const labelStyle = {
  display: 'block',
  color: 'var(--ink-secondary)',
  fontSize: 12,
  fontWeight: 700
};

const cardStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  padding: 20
};

export const MaintenancePage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isManager = currentUser?.role === 'facility_manager';
  const isTechnician = currentUser?.role === 'technician';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(localDate());
  const [planForm, setPlanForm] = useState({
    title: '',
    building: '',
    floor: '',
    scope: 'floor',
    room_ids: [],
    category_ids: [],
    frequency: 'monthly',
    start_date: localDate(),
    checklist: DEFAULT_CHECKLIST.join('\n')
  });
  const [logForm, setLogForm] = useState({ plan_id: '', equipment_id: '', results: {}, notes: '' });

  const loadData = useCallback(async () => {
    try {
      const [planData, roomData, categoryData] = await Promise.all([
        maintenanceApi.listPlans(),
        facilityApi.getAllRooms({ limit: 100 }),
        masterDataApi.getCategories()
      ]);
      setPlans(planData.plans || []);
      setEquipment(planData.equipment || []);
      setRooms((roomData.rooms || []).filter((room) => room.status !== 'inactive'));
      setCategories(categoryData.categories || []);
      setLogForm((previous) => ({
        ...previous,
        plan_id: previous.plan_id || planData.plans?.[0]?._id || ''
      }));
      setPlanForm((previous) => {
        const building = previous.building || roomData.rooms?.[0]?.building || '';
        const floor = previous.floor || String(roomData.rooms?.find((room) => room.building === building)?.floor || '');
        return { ...previous, building, floor };
      });
    } catch (error) {
      toast.error(`Không thể tải dữ liệu bảo dưỡng: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buildings = useMemo(
    () => [...new Set(rooms.map((room) => room.building).filter(Boolean))].sort(),
    [rooms]
  );
  const floors = useMemo(
    () => [...new Set(rooms.filter((room) => room.building === planForm.building).map((room) => room.floor))].sort((a, b) => a - b),
    [rooms, planForm.building]
  );
  const selectableRooms = useMemo(
    () => rooms.filter((room) => room.building === planForm.building && String(room.floor) === planForm.floor),
    [rooms, planForm.building, planForm.floor]
  );
  const selectedPlan = plans.find((plan) => plan._id === logForm.plan_id);
  const planRoomIds = selectedPlan?.room_ids?.map((room) => typeof room === 'string' ? room : room._id) || [];
  const planCategoryIds = selectedPlan?.category_ids?.map((category) => typeof category === 'string' ? category : category._id) || [];
  const planRoomEquipment = equipment.filter((item) => planRoomIds.includes(item.room_id?._id || item.room_id));
  const planEquipment = planRoomEquipment.filter((item) =>
    !planCategoryIds.length || planCategoryIds.includes(item.category_id?._id || item.category_id)
  );
  const equipmentCategoriesInPlanRooms = [...new Map(
    planRoomEquipment
      .filter((item) => item.category_id)
      .map((item) => {
        const category = item.category_id;
        return [category._id || category, { id: category._id || category, name: category.name || 'Chưa phân loại' }];
      })
  ).values()];
  const planFormRoomIds = planForm.scope === 'rooms' && planForm.room_ids.length
    ? planForm.room_ids
    : selectableRooms.map((room) => room._id);
  const planFormRoomEquipment = equipment.filter((item) => planFormRoomIds.includes(item.room_id?._id || item.room_id));
  const planFormCategoryMatchCount = planForm.category_ids.length
    ? planFormRoomEquipment.filter((item) => planForm.category_ids.includes(item.category_id?._id || item.category_id)).length
    : planFormRoomEquipment.length;
  const planFormCategoryNames = categories
    .filter((category) => planForm.category_ids.includes(category._id))
    .map((category) => category.name);
  const calendarDays = useMemo(
    () => getMaintenanceCalendarDays(calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [calendarMonth]
  );
  const calendarOccurrences = useMemo(
    () => getMaintenanceOccurrencesForMonth(plans, calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [plans, calendarMonth]
  );
  const selectedDayPlans = calendarOccurrences.get(selectedCalendarDate) || [];
  const calendarMonthLabel = calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const changeCalendarMonth = (amount) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setSelectedCalendarDate((current) => {
      const selected = new Date(`${current}T00:00:00`);
      selected.setDate(1);
      selected.setMonth(selected.getMonth() + amount);
      return localDateFor(selected);
    });
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedCalendarDate(localDate());
  };

  const openMaintenanceLog = (plan) => {
    setLogForm({ plan_id: plan._id, equipment_id: '', results: {}, notes: '' });
    window.setTimeout(() => document.getElementById('maintenance-log-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const handleCreatePlan = async (event) => {
    event.preventDefault();
    const checklist = planForm.checklist.split('\n').map((item) => item.trim()).filter(Boolean);
    if (planForm.scope === 'rooms' && !planForm.room_ids.length) {
      toast.error('Hãy chọn ít nhất một phòng cho kế hoạch.');
      return;
    }
    try {
      setSubmitting(true);
      await maintenanceApi.createPlan({
        title: planForm.title,
        building: planForm.building,
        floor: Number(planForm.floor),
        ...(planForm.scope === 'rooms' ? { room_ids: planForm.room_ids } : {}),
        category_ids: planForm.category_ids,
        frequency: planForm.frequency,
        start_date: planForm.start_date,
        checklist
      });
      toast.success('Đã tạo kế hoạch bảo dưỡng định kỳ.');
      setPlanForm((previous) => ({ ...previous, title: '' }));
      await loadData();
    } catch (error) {
      toast.error(`Không thể tạo kế hoạch: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogResult = async (event) => {
    event.preventDefault();
    if (!selectedPlan || !logForm.equipment_id) {
      toast.error('Hãy chọn kế hoạch và thiết bị cần kiểm tra.');
      return;
    }
    const results = selectedPlan.checklist.map((item) => ({
      item,
      passed: logForm.results[item] === true,
      notes: logForm.results[item] === false ? (logForm.results[`${item}:notes`] || '').trim() : ''
    }));
    if (results.some((item) => logForm.results[item.item] === undefined)) {
      toast.error('Hãy đánh dấu đạt hoặc không đạt cho từng hạng mục.');
      return;
    }
    if (results.some((item) => !item.passed && !item.notes)) {
      toast.error('Hãy mô tả dấu hiệu hư hỏng cho các hạng mục không đạt.');
      return;
    }
    try {
      setSubmitting(true);
      const response = await maintenanceApi.logResult(selectedPlan._id, {
        equipment_id: logForm.equipment_id,
        checklist_results: results,
        notes: logForm.notes
      });
      toast.success(response.message || 'Đã lưu kết quả bảo dưỡng.');
      setLogForm((previous) => ({ ...previous, results: {}, notes: '' }));
      await loadData();
    } catch (error) {
      toast.error(`Không thể lưu kết quả: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRoom = (roomId) => {
    setPlanForm((previous) => ({
      ...previous,
      room_ids: previous.room_ids.includes(roomId)
        ? previous.room_ids.filter((id) => id !== roomId)
        : [...previous.room_ids, roomId]
    }));
  };

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gap: 20 }}>
      <section style={{
        ...cardStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 18,
        borderLeft: '4px solid var(--blueprint-500)',
        background: 'linear-gradient(120deg, var(--surface-card), rgba(234, 88, 12, 0.08))'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--blueprint-400)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em' }}>
            <Icons.Calendar size={17} /> BẢO DƯỠNG ĐỊNH KỲ & PHÒNG NGỪA
          </div>
          <h1 style={{ color: 'var(--ink-primary)', fontSize: 25, margin: '10px 0 6px' }}>Lịch bảo dưỡng định kỳ</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: 13, margin: 0 }}>
            Lập lịch theo tầng/phòng, ghi checklist tại hiện trường và theo dõi lịch sử trong từng phòng.
          </p>
        </div>
        <div style={{ minWidth: 100, textAlign: 'center', padding: '12px 18px', borderRadius: 12, background: 'var(--surface-2)' }}>
          <div style={{ color: 'var(--ink-muted)', fontSize: 11, fontWeight: 700 }}>KẾ HOẠCH</div>
          <strong style={{ display: 'block', color: 'var(--ink-primary)', fontSize: 24, marginTop: 3 }}>{plans.length}</strong>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h2 style={{ color: 'var(--ink-primary)', fontSize: 17, margin: 0 }}>Thời khóa biểu bảo dưỡng</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 12, margin: '5px 0 0' }}>
              Chọn ngày để xem các kế hoạch đến lịch trong tháng.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="ruo-btn ruo-btn-secondary ruo-btn-sm" onClick={() => changeCalendarMonth(-1)} aria-label="Tháng trước">
              <Icons.ChevronLeft size={15} />
            </button>
            <strong style={{ color: 'var(--ink-primary)', minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>{calendarMonthLabel}</strong>
            <button type="button" className="ruo-btn ruo-btn-secondary ruo-btn-sm" onClick={() => changeCalendarMonth(1)} aria-label="Tháng sau">
              <Icons.ChevronRight size={15} />
            </button>
            <button type="button" className="ruo-btn ruo-btn-secondary ruo-btn-sm" onClick={goToCurrentMonth}>Hôm nay</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
          {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((weekday) => (
            <div key={weekday} style={{ color: 'var(--ink-muted)', fontSize: 11, fontWeight: 800, textAlign: 'center', padding: '5px 2px' }}>{weekday}</div>
          ))}
          {calendarDays.map((day) => {
            const duePlans = calendarOccurrences.get(day.key) || [];
            const isSelected = day.key === selectedCalendarDate;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedCalendarDate(day.key)}
                aria-label={`${day.key}, ${duePlans.length} kế hoạch bảo dưỡng`}
                aria-pressed={isSelected}
                style={{
                  minWidth: 0,
                  minHeight: 82,
                  padding: '8px 7px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 5,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 9,
                  border: isSelected ? '1px solid var(--blueprint-400)' : '1px solid var(--border-default)',
                  background: isSelected ? 'rgba(234, 88, 12, 0.14)' : 'var(--surface-1)',
                  color: day.isCurrentMonth ? 'var(--ink-primary)' : 'var(--ink-muted)',
                  opacity: day.isCurrentMonth ? 1 : 0.5
                }}
              >
                <span style={{ fontSize: 12, fontWeight: isSelected ? 800 : 600 }}>{day.day}</span>
                {duePlans.slice(0, 2).map((plan) => {
                  const details = getMaintenancePlanDetails(plan, equipment);
                  return (
                  <span
                    key={plan._id}
                    title={`${plan.title} · Tòa ${plan.building}, tầng ${plan.floor} · ${details.roomLabel} · ${details.categoryLabel}`}
                    style={{
                      width: '100%',
                      overflow: 'hidden',
                      borderRadius: 4,
                      padding: '3px 5px',
                      background: 'rgba(234, 88, 12, 0.14)',
                      color: 'var(--blueprint-400)',
                      fontSize: 9,
                      fontWeight: 700,
                      lineHeight: 1.35
                    }}
                  >
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title}</span>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>
                      {plan.building} · T{plan.floor} · {plan.room_ids?.length || 0} phòng
                    </span>
                  </span>
                  );
                })}
                {duePlans.length > 2 && <span style={{ color: 'var(--ink-muted)', fontSize: 9 }}>+{duePlans.length - 2} kế hoạch</span>}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 16, padding: 14, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--surface-1)' }}>
          <div style={{ color: 'var(--ink-primary)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
            Kế hoạch ngày {new Date(`${selectedCalendarDate}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          {selectedDayPlans.length === 0 ? (
            <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>Không có kế hoạch đến lịch trong ngày này.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {selectedDayPlans.map((plan) => (
                <div key={plan._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: 12, borderRadius: 8, background: 'var(--surface-2)' }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <strong style={{ display: 'block', color: 'var(--ink-primary)', fontSize: 12 }}>{plan.title}</strong>
                    <span style={{ display: 'block', color: 'var(--ink-muted)', fontSize: 11, marginTop: 4 }}>
                      Tòa {plan.building} • Tầng {plan.floor} • {plan.frequency === 'quarterly' ? 'Hàng quý' : 'Hàng tháng'}
                    </span>
                    {(() => {
                      const details = getMaintenancePlanDetails(plan, equipment);
                      return (
                        <>
                          <span style={{ display: 'block', color: 'var(--ink-secondary)', fontSize: 11, marginTop: 4 }}>
                            Phòng ({plan.room_ids?.length || 0}): {details.roomLabel}
                          </span>
                          <span style={{ display: 'block', color: 'var(--ink-secondary)', fontSize: 11, marginTop: 3 }}>
                            Loại thiết bị: {details.categoryLabel} • {details.equipmentCount} thiết bị trong phạm vi
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  {isTechnician && (
                    <button type="button" className="ruo-btn ruo-btn-primary ruo-btn-sm" onClick={() => openMaintenanceLog(plan)}>
                      <Icons.ClipboardCheck size={13} /> Ghi checklist
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ color: 'var(--ink-primary)', fontSize: 17, margin: 0 }}>Lịch kế hoạch</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 12, margin: '5px 0 0' }}>Chu kỳ bảo dưỡng đang áp dụng cho các phòng và thiết bị.</p>
          </div>
          <button type="button" onClick={() => { setLoading(true); loadData(); }} className="ruo-btn ruo-btn-secondary ruo-btn-sm" disabled={loading}>
            <Icons.RefreshCw size={13} /> Làm mới
          </button>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>Đang tải lịch bảo dưỡng...</div>
        ) : plans.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', border: '1px dashed var(--border-default)', borderRadius: 10, color: 'var(--ink-muted)', fontSize: 13 }}>
            Chưa có kế hoạch. Quản lý CSVC có thể tạo kế hoạch mới bên dưới.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 12 }}>
            {plans.map((plan) => (
              <article key={plan._id} style={{ border: '1px solid var(--border-default)', borderRadius: 12, padding: 16, background: 'var(--surface-1)' }}>
                {(() => {
                  const details = getMaintenancePlanDetails(plan, equipment);
                  return (
                    <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ color: 'var(--ink-primary)', fontSize: 14, fontWeight: 800 }}>{plan.title}</div>
                  <span style={{ borderRadius: 20, padding: '4px 8px', background: 'rgba(234, 88, 12, 0.14)', color: 'var(--blueprint-400)', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {plan.frequency === 'quarterly' ? 'HÀNG QUÝ' : 'HÀNG THÁNG'}
                  </span>
                </div>
                <div style={{ color: 'var(--ink-secondary)', fontSize: 12, marginTop: 10 }}>
                  Tòa {plan.building} • Tầng {plan.floor} • {plan.room_ids?.length || 0} phòng: {details.roomLabel}
                </div>
                <div style={{ color: 'var(--ink-muted)', fontSize: 12, marginTop: 5 }}>
                  Bắt đầu {formatDate(plan.start_date)} • Kỳ kế tiếp {formatDate(plan.schedule?.next_due_at)}
                </div>
                <div style={{ color: 'var(--ink-muted)', fontSize: 11, marginTop: 8 }}>
                  Loại thiết bị: {details.categoryLabel} • {details.equipmentCount} thiết bị • {plan.checklist?.length || 0} mục checklist
                </div>
                {isTechnician && (
                  <button
                    type="button"
                    className="ruo-btn ruo-btn-primary ruo-btn-sm"
                    style={{ marginTop: 14 }}
                    onClick={() => openMaintenanceLog(plan)}
                  >
                    <Icons.ClipboardCheck size={14} /> Ghi nhận kiểm tra
                  </button>
                )}
                    </>
                  );
                })()}
              </article>
            ))}
          </div>
        )}
      </section>

      {isManager && (
        <section style={cardStyle}>
          <h2 style={{ color: 'var(--ink-primary)', fontSize: 17, margin: '0 0 5px' }}>Tạo kế hoạch bảo dưỡng</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: 12, margin: '0 0 18px' }}>Chọn phạm vi theo tầng hoặc một nhóm phòng; checklist sẽ được dùng cho từng thiết bị.</p>
          <form onSubmit={handleCreatePlan} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, alignItems: 'start' }}>
            <label style={labelStyle}>Tên kế hoạch
              <input required minLength={3} maxLength={160} className="ruo-portal-input" style={fieldStyle} value={planForm.title} onChange={(event) => setPlanForm({ ...planForm, title: event.target.value })} placeholder="VD: Bảo dưỡng máy chiếu định kỳ" />
            </label>
            <label style={labelStyle}>Tòa nhà
              <select required className="ruo-portal-input" style={fieldStyle} value={planForm.building} onChange={(event) => setPlanForm({ ...planForm, building: event.target.value, floor: '', room_ids: [] })}>
                <option value="">Chọn tòa nhà</option>
                {buildings.map((building) => <option key={building} value={building}>{building}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Tầng
              <select required className="ruo-portal-input" style={fieldStyle} value={planForm.floor} onChange={(event) => setPlanForm({ ...planForm, floor: event.target.value, room_ids: [] })}>
                <option value="">Chọn tầng</option>
                {floors.map((floor) => <option key={floor} value={floor}>Tầng {floor}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Chu kỳ
              <select className="ruo-portal-input" style={fieldStyle} value={planForm.frequency} onChange={(event) => setPlanForm({ ...planForm, frequency: event.target.value })}>
                <option value="monthly">Hàng tháng</option>
                <option value="quarterly">Hàng quý</option>
              </select>
            </label>
            <label style={labelStyle}>Ngày bắt đầu
              <input required type="date" className="ruo-portal-input" style={fieldStyle} value={planForm.start_date} onChange={(event) => setPlanForm({ ...planForm, start_date: event.target.value })} />
            </label>
            <label style={labelStyle}>Phạm vi phòng
              <select className="ruo-portal-input" style={fieldStyle} value={planForm.scope} onChange={(event) => setPlanForm({ ...planForm, scope: event.target.value, room_ids: [] })}>
                <option value="floor">Toàn bộ tầng</option>
                <option value="rooms">Chọn phòng cụ thể</option>
              </select>
            </label>
            {planForm.scope === 'rooms' && (
              <div style={{ gridColumn: '1 / -1', border: '1px solid var(--border-default)', borderRadius: 8, padding: 12 }}>
                <div style={{ color: 'var(--ink-secondary)', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Phòng thuộc tầng đã chọn</div>
                {selectableRooms.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectableRooms.map((room) => (
                      <label key={room._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--ink-secondary)', fontSize: 12 }}>
                        <input type="checkbox" checked={planForm.room_ids.includes(room._id)} onChange={() => toggleRoom(room._id)} />
                        {room.code} · {room.name}
                      </label>
                    ))}
                  </div>
                ) : <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>Chọn tòa nhà và tầng để xem danh sách phòng.</div>}
              </div>
            )}
            <div style={{ gridColumn: '1 / -1', border: '1px solid var(--border-default)', borderRadius: 8, padding: 12 }}>
              <div style={{ color: 'var(--ink-secondary)', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Loại thiết bị cần bảo dưỡng (để trống = tất cả)</div>
              {categories.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map((category) => (
                    <label key={category._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--ink-secondary)', fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={planForm.category_ids.includes(category._id)}
                        onChange={() => setPlanForm((previous) => ({
                          ...previous,
                          category_ids: previous.category_ids.includes(category._id)
                            ? previous.category_ids.filter((id) => id !== category._id)
                            : [...previous.category_ids, category._id]
                        }))}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              ) : <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>Chưa có danh mục thiết bị để lọc.</div>}
              {planFormRoomEquipment.length > 0 && planForm.category_ids.length > 0 && (
                <div
                  role="status"
                  style={{
                    marginTop: 10,
                    padding: '9px 11px',
                    borderRadius: 7,
                    background: planFormCategoryMatchCount ? 'rgba(47,179,122,0.1)' : 'rgba(229,72,77,0.1)',
                    color: planFormCategoryMatchCount ? '#2FB37A' : '#E5484D',
                    fontSize: 12
                  }}
                >
                  {planFormCategoryMatchCount
                    ? `Có ${planFormCategoryMatchCount} thiết bị thuộc loại ${planFormCategoryNames.join(', ')} trong phạm vi phòng đã chọn.`
                    : `Cảnh báo: không có thiết bị thuộc loại ${planFormCategoryNames.join(', ')} trong các phòng đã chọn. Thiết bị hiện có: ${[...new Set(planFormRoomEquipment.map((item) => item.category_id?.name || 'Chưa phân loại'))].join(', ')}.`}
                </div>
              )}
            </div>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Checklist (mỗi dòng là một hạng mục)
              <textarea required rows={4} className="ruo-portal-input" style={fieldStyle} value={planForm.checklist} onChange={(event) => setPlanForm({ ...planForm, checklist: event.target.value })} />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={submitting || !rooms.length} className="ruo-btn ruo-btn-primary ruo-btn-md">
                <Icons.Calendar size={15} /> {submitting ? 'Đang tạo...' : 'Tạo kế hoạch'}
              </button>
            </div>
          </form>
          {!rooms.length && !loading && <p role="alert" style={{ color: 'var(--crimson-500)', fontSize: 12 }}>Chưa có phòng hoạt động để lập kế hoạch bảo dưỡng.</p>}
        </section>
      )}

      {isTechnician && selectedPlan && (
        <section id="maintenance-log-form" style={cardStyle}>
          <h2 style={{ color: 'var(--ink-primary)', fontSize: 17, margin: '0 0 5px' }}>Ghi checklist kiểm tra</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: 12, margin: '0 0 18px' }}>{selectedPlan.title} · Tòa {selectedPlan.building}, tầng {selectedPlan.floor}</p>
          <form onSubmit={handleLogResult} style={{ display: 'grid', gap: 15 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <label style={labelStyle}>Kế hoạch
                <select className="ruo-portal-input" style={fieldStyle} value={logForm.plan_id} onChange={(event) => setLogForm({ plan_id: event.target.value, equipment_id: '', results: {}, notes: '' })}>
                  {plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.title} · {plan.building}/T{plan.floor}</option>)}
                </select>
              </label>
              <label style={labelStyle}>Thiết bị
                <select required className="ruo-portal-input" style={fieldStyle} value={logForm.equipment_id} onChange={(event) => setLogForm({ ...logForm, equipment_id: event.target.value })}>
                  <option value="">Chọn thiết bị</option>
                  {planEquipment.map((item) => (
                    <option key={item._id} value={item._id}>{item.code} · {item.name} ({item.room_id?.code})</option>
                  ))}
                </select>
              </label>
            </div>
            {!planEquipment.length && (
              <div
                role="alert"
                style={{
                  padding: 12,
                  border: '1px solid rgba(229,72,77,0.35)',
                  borderRadius: 8,
                  background: 'rgba(229,72,77,0.08)',
                  color: 'var(--ink-secondary)',
                  fontSize: 12,
                  lineHeight: 1.6
                }}
              >
                {planRoomEquipment.length === 0
                  ? 'Không có thiết bị trong các phòng thuộc kế hoạch. Vui lòng báo Quản lý CSVC kiểm tra phòng và vị trí thiết bị.'
                  : (
                    <>
                      Kế hoạch đang lọc theo loại <strong>{selectedPlan.category_ids?.map((category) => category.name).join(', ') || 'đã chọn'}</strong>,
                      nhưng thiết bị trong các phòng này thuộc loại <strong>{equipmentCategoriesInPlanRooms.map((category) => category.name).join(', ') || 'chưa phân loại'}</strong>.
                      Báo Quản lý CSVC chọn đúng loại thiết bị trong kế hoạch hoặc cập nhật loại thiết bị trong Danh Mục Thiết Bị.
                    </>
                  )}
              </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {selectedPlan.checklist.map((item, index) => (
                <div key={`${item}-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: 12, alignItems: 'center', padding: 12, border: '1px solid var(--border-default)', borderRadius: 9 }}>
                  <span style={{ color: 'var(--ink-primary)', fontSize: 13, fontWeight: 600 }}>{item}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[true, false].map((passed) => (
                      <label key={String(passed)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: passed ? '#2FB37A' : '#E5484D', fontSize: 12, fontWeight: 700 }}>
                        <input type="radio" name={`check-${index}`} checked={logForm.results[item] === passed} onChange={() => setLogForm((previous) => ({ ...previous, results: { ...previous.results, [item]: passed } }))} />
                        {passed ? 'Đạt' : 'Không đạt'}
                      </label>
                    ))}
                  </div>
                  {logForm.results[item] === false && (
                    <input
                      className="ruo-portal-input"
                      style={{ ...fieldStyle, gridColumn: '1 / -1', marginTop: 0 }}
                      value={logForm.results[`${item}:notes`] || ''}
                      onChange={(event) => setLogForm((previous) => ({ ...previous, results: { ...previous.results, [`${item}:notes`]: event.target.value } }))}
                      placeholder="Mô tả dấu hiệu hư hỏng (bắt buộc)"
                    />
                  )}
                </div>
              ))}
            </div>
            <label style={labelStyle}>Ghi chú chung
              <textarea rows={3} maxLength={2000} className="ruo-portal-input" style={fieldStyle} value={logForm.notes} onChange={(event) => setLogForm({ ...logForm, notes: event.target.value })} placeholder="Ghi chú bổ sung sau khi kiểm tra..." />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--ink-muted)', fontSize: 11 }}>Mục không đạt sẽ tự tạo phiếu sửa chữa và đánh dấu thiết bị hỏng.</span>
              <button type="submit" disabled={submitting || !planEquipment.length} className="ruo-btn ruo-btn-primary ruo-btn-md">
                <Icons.ClipboardCheck size={15} /> {submitting ? 'Đang lưu...' : 'Lưu kết quả kiểm tra'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default MaintenancePage;
