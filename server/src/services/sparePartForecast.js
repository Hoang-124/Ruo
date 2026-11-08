/**
 * Spare-part demand forecasting and reorder advice (UC-5.12 extension).
 *
 * Demand comes from approved PartsRequest history. Spare-part demand is intermittent
 * (most days are zero), so the rate uses Croston's method with the Syntetos-Boylan
 * bias correction instead of a plain average. Output is advisory: a Facility Manager
 * decides whether to apply a suggested min_stock or place an order.
 */

const DAY_MS = 86_400_000;

export const FORECAST_DEFAULTS = Object.freeze({
  historyDays: 180,
  leadTimeDays: 7,
  reviewDays: 7,
  alpha: 0.1,
  serviceZ: 1.65 // ~95% cycle service level
});

const STATUS_ORDER = ['out_of_stock', 'critical', 'reorder', 'ok', 'no_demand'];

const idOf = (value) => String(value?._id ?? value ?? '');

const positiveQty = (item) => {
  const qty = Number(item?.qty ?? item?.quantity);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
};

/** Croston-SBA demand rate per period for an intermittent series (oldest first). */
export const crostonSba = (values = [], alpha = FORECAST_DEFAULTS.alpha) => {
  let size = null;
  let interval = null;
  let sinceLast = 1;
  for (const value of values) {
    if (value > 0) {
      if (size === null) {
        size = value;
        interval = sinceLast;
      } else {
        size += alpha * (value - size);
        interval += alpha * (sinceLast - interval);
      }
      sinceLast = 1;
    } else {
      sinceLast += 1;
    }
  }
  return size === null ? 0 : (1 - alpha / 2) * (size / interval);
};

const standardDeviation = (values) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
};

/** Map partId -> daily consumed quantities over the window (index 0 = oldest day). */
export const buildDailyDemand = (approvedRequests = [], { now = new Date(), historyDays = FORECAST_DEFAULTS.historyDays } = {}) => {
  const start = now.getTime() - historyDays * DAY_MS;
  const demand = new Map();
  for (const request of approvedRequests) {
    const at = request?.approved_at ? new Date(request.approved_at).getTime() : NaN;
    if (!Number.isFinite(at) || at < start || at > now.getTime()) continue;
    const day = Math.min(historyDays - 1, Math.floor((at - start) / DAY_MS));
    for (const item of request.items || []) {
      const qty = positiveQty(item);
      const partId = idOf(item?.part_id);
      if (!qty || !partId) continue;
      if (!demand.has(partId)) demand.set(partId, new Array(historyDays).fill(0));
      demand.get(partId)[day] += qty;
    }
  }
  return demand;
};

/** Lead time resolution: part override, then supplier, then the default. */
export const resolveLeadTime = (part) => {
  for (const [value, source] of [[part?.lead_time_days, 'part'], [part?.supplier_id?.lead_time_days, 'supplier']]) {
    const days = Number(value);
    if (Number.isFinite(days) && days >= 1 && days <= 365) return { days, source };
  }
  return { days: FORECAST_DEFAULTS.leadTimeDays, source: 'default' };
};

export const forecastSparePart = ({
  part,
  series = [],
  pendingQty = 0,
  leadTimeDays = FORECAST_DEFAULTS.leadTimeDays,
  reviewDays = FORECAST_DEFAULTS.reviewDays,
  alpha = FORECAST_DEFAULTS.alpha,
  serviceZ = FORECAST_DEFAULTS.serviceZ
}) => {
  const stock = Math.max(0, Number(part?.stock) || 0);
  const available = stock - pendingQty;
  const demandEvents = series.filter((v) => v > 0).length;
  const totalConsumed = series.reduce((sum, v) => sum + v, 0);
  const dailyDemand = crostonSba(series, alpha);
  const safetyStock = Math.ceil(serviceZ * standardDeviation(series) * Math.sqrt(leadTimeDays));
  const reorderPoint = Math.ceil(dailyDemand * leadTimeDays + safetyStock);
  const daysUntilStockout = dailyDemand > 0 ? Math.floor(Math.max(0, available) / dailyDemand) : null;
  const orderUpTo = dailyDemand * (leadTimeDays + reviewDays) + safetyStock;

  const currentMinStock = Math.max(0, Number(part?.min_stock) || 0);
  // No consumption history: nothing to forecast, so honour the manager's manual floor.
  const usesFallback = totalConsumed === 0;

  let status = 'ok';
  if (stock <= 0) status = 'out_of_stock';
  else if (usesFallback) status = available < currentMinStock ? 'reorder' : 'no_demand';
  else if (daysUntilStockout !== null && daysUntilStockout <= leadTimeDays) status = 'critical';
  else if (available <= reorderPoint) status = 'reorder';

  const needsOrder = ['out_of_stock', 'critical', 'reorder'].includes(status);
  const orderQty = usesFallback ? currentMinStock - available : orderUpTo - available;
  const confidence = demandEvents >= 8 ? 'high' : demandEvents >= 3 ? 'medium' : 'low';

  return {
    _id: idOf(part?._id),
    code: part?.code || '',
    name: part?.name || '',
    unit: part?.unit || 'Cái',
    stock,
    pending_qty: pendingQty,
    available,
    current_min_stock: currentMinStock,
    daily_demand: Number(dailyDemand.toFixed(3)),
    monthly_demand: Number((dailyDemand * 30).toFixed(1)),
    days_until_stockout: daysUntilStockout,
    safety_stock: safetyStock,
    reorder_point: reorderPoint,
    suggested_min_stock: confidence === 'low' ? null : Math.max(1, reorderPoint),
    suggested_order_qty: needsOrder ? Math.max(0, Math.ceil(orderQty)) : 0,
    status,
    confidence,
    basis: {
      policy: usesFallback ? 'min_stock_fallback' : 'croston_sba',
      history_days: series.length,
      demand_events: demandEvents,
      total_consumed: totalConsumed,
      lead_time_days: leadTimeDays,
      review_days: reviewDays
    }
  };
};

export const buildSparePartForecasts = ({
  parts = [],
  approvedRequests = [],
  pendingRequests = [],
  now = new Date(),
  historyDays = FORECAST_DEFAULTS.historyDays
}) => {
  const demand = buildDailyDemand(approvedRequests, { now, historyDays });
  const pending = new Map();
  for (const request of pendingRequests) {
    for (const item of request.items || []) {
      const partId = idOf(item?.part_id);
      if (partId) pending.set(partId, (pending.get(partId) || 0) + positiveQty(item));
    }
  }

  const forecasts = parts.map((part) => {
    const id = idOf(part._id);
    const leadTime = resolveLeadTime(part);
    const forecast = forecastSparePart({
      part,
      series: demand.get(id) || new Array(historyDays).fill(0),
      pendingQty: pending.get(id) || 0,
      leadTimeDays: leadTime.days
    });
    forecast.basis.lead_time_source = leadTime.source;
    return forecast;
  }).sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    || (a.days_until_stockout ?? Infinity) - (b.days_until_stockout ?? Infinity)
    || a.code.localeCompare(b.code));

  const summary = Object.fromEntries(STATUS_ORDER.map((status) => [status, forecasts.filter((f) => f.status === status).length]));
  return { forecasts, summary };
};
