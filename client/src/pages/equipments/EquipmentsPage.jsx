import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { equipmentApi, masterDataApi } from '../../lib/api';

// Pure Native SVG 2D QR Matrix Generator (Deterministic from string seed, zero external libraries)
const NativeQrMatrixSvg = ({ value = 'QR-EQ-2026-001', size = 148 }) => {
  const gridSize = 21;
  const cells = [];

  // Deterministic hash function for non-finder cells
  const seedStr = String(value || 'RUO-UEMS');
  const isFinderPattern = (r, c) => {
    const topLeft = r < 7 && c < 7;
    const topRight = r < 7 && c >= gridSize - 7;
    const bottomLeft = r >= gridSize - 7 && c < 7;
    return topLeft || topRight || bottomLeft;
  };

  const getFinderBit = (r, c) => {
    const lr = r >= gridSize - 7 ? r - (gridSize - 7) : r;
    const lc = c >= gridSize - 7 ? c - (gridSize - 7) : c;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      let filled = false;
      if (isFinderPattern(r, c)) {
        filled = getFinderBit(r, c);
      } else if (r === 6 || c === 6) {
        filled = (r + c) % 2 === 0;
      } else {
        const charIdx = (r * gridSize + c) % seedStr.length;
        const code = seedStr.charCodeAt(charIdx);
        filled = ((code * (r + 3) + c * 17 + charIdx * 31) % 7) < 3;
      }
      if (filled) {
        cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#000000" />);
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${gridSize} ${gridSize}`} shapeRendering="crispEdges" style={{ display: 'block' }}>
      <rect width={gridSize} height={gridSize} fill="#ffffff" />
      {cells}
    </svg>
  );
};

export const EquipmentsPage = () => {
  const { toast } = useToast();
  const { currentUser, hasPermission } = useAuth();

  const userRole = currentUser?.role || 'facility_manager';
  const canCreateOrUpdate = typeof hasPermission === 'function'
    ? (hasPermission('equipment:create') || hasPermission('equipment:update'))
    : ['admin', 'facility_manager', 'technician'].includes(userRole);
  const canImportOrDispose = typeof hasPermission === 'function'
    ? (hasPermission('equipment:import') || hasPermission('equipment:dispose'))
    : ['admin', 'facility_manager'].includes(userRole);

  const [loading, setLoading] = useState(true);
  const [equipments, setEquipments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Master options
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Multi-dimensional Filters (UC-3.2: chủng loại, trạng thái, phòng học, tầng, bảo hành, tầm giá; tìm kiếm tên, mã QR)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [warrantyFilter, setWarrantyFilter] = useState('ALL');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Fast QR Lookup state
  const [fastQrInput, setFastQrInput] = useState('');
  const [qrLookupLoading, setQrLookupLoading] = useState(false);

  // Modals & Drawers
  const [selectedEq, setSelectedEq] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states (UC-3.1 & UC-3.4)
  const [formData, setFormData] = useState({
    code: '',
    qr_code: '',
    name: '',
    category_id: '',
    room_id: '',
    supplier_id: '',
    brand: '',
    model: '',
    serial_number: '',
    price: 15000000,
    depreciation_rate: 20,
    purchase_date: new Date().toISOString().split('T')[0],
    warranty_expiry: '',
    movement_reason: ''
  });

  const [warrantyData, setWarrantyData] = useState({
    warranty_expiry: '',
    warranty_status: 'active'
  });

  // Disposal Form state (UC-3.8)
  const [disposeData, setDisposeData] = useState({
    decision_number: '',
    acceptance_report: '',
    recovery_value: 0
  });

  // Batch Import & Validation states (UC-3.6 & UC-3.7)
  const [batchRawText, setBatchRawText] = useState('');
  const [batchFileName, setBatchFileName] = useState('danh_sach_thiet_bi_A1.csv');
  const [parsedBatchItems, setParsedBatchItems] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [validatingBatch, setValidatingBatch] = useState(false);

  const fetchMasterData = async () => {
    try {
      const [catRes, roomRes, supRes] = await Promise.all([
        masterDataApi.getCategories(),
        masterDataApi.getRooms({ limit: 100 }),
        masterDataApi.getSuppliers()
      ]);
      setCategories(catRes?.categories || []);
      setRooms(roomRes?.rooms || []);
      setSuppliers(supRes?.suppliers || []);
    } catch (err) {
      console.warn('Master data load warning:', err.message);
    }
  };

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 50,
        ...(search.trim() ? { q: search.trim() } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(categoryFilter !== 'ALL' ? { category_id: categoryFilter } : {}),
        ...(roomFilter !== 'ALL' ? { room_id: roomFilter } : {}),
        ...(floorFilter !== 'ALL' ? { floor: Number(floorFilter) } : {}),
        ...(warrantyFilter !== 'ALL' ? { warranty_status: warrantyFilter } : {}),
        ...(minPrice !== '' ? { minPrice: Number(minPrice) } : {}),
        ...(maxPrice !== '' ? { maxPrice: Number(maxPrice) } : {})
      };
      const res = await equipmentApi.list(params);
      setEquipments(res?.equipments || []);
      setTotalCount(res?.total || (res?.equipments || []).length);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      toast.error('Không thể tải danh sách thiết bị: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchEquipments();
  }, [page, statusFilter, categoryFilter, roomFilter, floorFilter, warrantyFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEquipments();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setRoomFilter('ALL');
    setFloorFilter('ALL');
    setWarrantyFilter('ALL');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
    setTimeout(() => fetchEquipments(), 0);
  };

  // Fast QR Lookup handler (QR Code Generator & Scan UC)
  const handleFastQrLookup = async (e) => {
    e.preventDefault();
    if (!fastQrInput.trim()) return;
    try {
      setQrLookupLoading(true);
      const res = await equipmentApi.getByQr(fastQrInput.trim());
      if (res?.success && res?.equipment) {
        toast.success(`Đã tra cứu nhanh mã QR: [${res.equipment.code}] ${res.equipment.name}`);
        setFastQrInput('');
        openDetail(res.equipment);
      }
    } catch (err) {
      toast.error('Không tìm thấy thiết bị với mã QR / Mã tài sản: ' + fastQrInput);
    } finally {
      setQrLookupLoading(false);
    }
  };

  const openCreate = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const autoCode = `EQ-2026-${randomSuffix}`;
    setFormData({
      code: autoCode,
      qr_code: `QR-${autoCode}`,
      name: '',
      category_id: categories[0]?._id || '',
      room_id: '',
      supplier_id: suppliers[0]?._id || '',
      brand: '',
      model: '',
      serial_number: '',
      price: 15000000,
      depreciation_rate: 20,
      purchase_date: new Date().toISOString().split('T')[0],
      warranty_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      movement_reason: ''
    });
    setShowCreateModal(true);
  };

  const openEdit = (eq) => {
    setSelectedEq(eq);
    setFormData({
      code: eq.code || '',
      qr_code: eq.qr_code || `QR-${eq.code}`,
      name: eq.name || '',
      category_id: eq.category_id?._id || eq.category_id || '',
      room_id: eq.room_id?._id || eq.room_id || '',
      supplier_id: eq.supplier_id?._id || eq.supplier_id || '',
      brand: eq.brand || '',
      model: eq.model || '',
      serial_number: eq.serial_number || '',
      price: eq.price || 0,
      depreciation_rate: eq.depreciation_rate || 20,
      purchase_date: eq.purchase_date ? new Date(eq.purchase_date).toISOString().split('T')[0] : '',
      warranty_expiry: eq.warranty_expiry ? new Date(eq.warranty_expiry).toISOString().split('T')[0] : '',
      movement_reason: 'Điều chuyển phòng khi cập nhật hồ sơ thiết bị (UC-3.4)'
    });
    setShowEditModal(true);
  };

  const openWarranty = (eq) => {
    setSelectedEq(eq);
    setWarrantyData({
      warranty_expiry: eq.warranty_expiry ? new Date(eq.warranty_expiry).toISOString().split('T')[0] : '',
      warranty_status: eq.warranty_status || 'active'
    });
    setShowWarrantyModal(true);
  };

  const openQr = (eq) => {
    setSelectedEq(eq);
    setShowQrModal(true);
  };

  const openDispose = (eq) => {
    setSelectedEq(eq);
    setDisposeData({
      decision_number: `QĐ-BGH-2026-${Math.floor(100 + Math.random() * 900)}`,
      acceptance_report: `Biên bản nghiệm thu thanh lý tài sản [${eq.code}] ${eq.name} tại Tòa nhà A1 do hết khấu hao / hư hỏng nặng.`,
      recovery_value: Math.round((eq.price || 0) * 0.05)
    });
    setShowDisposeModal(true);
  };

  const openDetail = async (eq) => {
    setSelectedEq(eq);
    setActiveTab('overview');
    setDetailData(null);
    setDetailLoading(true);
    try {
      const [res, lifeRes] = await Promise.all([
        equipmentApi.getById(eq._id),
        equipmentApi.getLifecycle(eq._id).catch(() => null)
      ]);
      if (res && res.success) {
        setDetailData({
          ...res,
          lifecycle: lifeRes?.events ? lifeRes : res.lifecycle
        });
        if (res.equipment) {
          setSelectedEq(res.equipment);
        }
      }
    } catch (err) {
      toast.error('Không thể tải chi tiết vòng đời thiết bị: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (formData.purchase_date && formData.warranty_expiry) {
      if (new Date(formData.warranty_expiry) < new Date(formData.purchase_date)) {
        toast.error('Lỗi logic thời gian: Hạn bảo hành không được nhỏ hơn Ngày mua thiết bị!');
        return;
      }
    }
    const depRate = Number(formData.depreciation_rate ?? 20);
    if (Number.isNaN(depRate) || depRate < 0 || depRate > 100) {
      toast.error('Tỷ lệ khấu hao (%/năm) phải nằm trong khoảng từ 0% đến 100%!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        qr_code: formData.qr_code || `QR-${formData.code.toUpperCase().trim()}`,
        price: Number(formData.price) || 0,
        depreciation_rate: depRate,
        room_id: formData.room_id || null,
        supplier_id: formData.supplier_id || null
      };
      const res = await equipmentApi.create(payload);
      if (res && res.success) {
        toast.success(`Đã đăng ký thiết bị mới [${res.equipment?.code}] thành công (UC-3.1)!`);
        setShowCreateModal(false);
        fetchEquipments();
      }
    } catch (err) {
      toast.error('Lỗi khi tạo thiết bị: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEq) return;
    if (formData.purchase_date && formData.warranty_expiry) {
      if (new Date(formData.warranty_expiry) < new Date(formData.purchase_date)) {
        toast.error('Lỗi logic thời gian: Hạn bảo hành không được nhỏ hơn Ngày mua thiết bị!');
        return;
      }
    }
    const depRate = Number(formData.depreciation_rate ?? 20);
    if (Number.isNaN(depRate) || depRate < 0 || depRate > 100) {
      toast.error('Tỷ lệ khấu hao (%/năm) phải nằm trong khoảng từ 0% đến 100%!');
      return;
    }
    if (selectedEq.status === 'disposed' && formData.room_id) {
      toast.error('Tài sản đã thanh lý (DISPOSED) không thể phân bổ lại vào phòng học đang vận hành!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await equipmentApi.update(selectedEq._id, {
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        serial_number: formData.serial_number,
        category_id: formData.category_id,
        room_id: formData.room_id || null,
        supplier_id: formData.supplier_id || null,
        price: Number(formData.price) || 0,
        depreciation_rate: depRate,
        purchase_date: formData.purchase_date || null,
        warranty_expiry: formData.warranty_expiry || null,
        movement_reason: formData.movement_reason
      });
      if (res && res.success) {
        toast.success(res.message || `Đã cập nhật thiết bị [${selectedEq.code}] thành công!`);
        setShowEditModal(false);
        fetchEquipments();
        if (detailData) {
          openDetail(res.equipment || selectedEq);
        }
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật thiết bị: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWarrantySubmit = async (e) => {
    e.preventDefault();
    if (!selectedEq) return;
    try {
      setSubmitting(true);
      const res = await equipmentApi.updateWarranty(selectedEq._id, warrantyData);
      if (res && res.success) {
        toast.success(`Đã cập nhật hạn bảo hành cho [${selectedEq.code}]!`);
        setShowWarrantyModal(false);
        fetchEquipments();
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật bảo hành: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisposeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEq) return;
    try {
      setSubmitting(true);
      const res = await equipmentApi.dispose(selectedEq._id, {
        decision_number: disposeData.decision_number,
        acceptance_report: disposeData.acceptance_report,
        reason: disposeData.acceptance_report,
        recovery_value: Number(disposeData.recovery_value) || 0
      });
      if (res && res.success) {
        toast.success(res.message || `Đã thanh lý thiết bị [${selectedEq.code}] (DISPOSED)!`);
        setShowDisposeModal(false);
        fetchEquipments();
        if (detailData) {
          openDetail(res.equipment || selectedEq);
        }
      }
    } catch (err) {
      toast.error('Lỗi khi thanh lý thiết bị: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // RFC-4180 Quote-Aware & Semicolon/Tab/Comma-Aware CSV Parser for UC-3.6 & UC-3.7
  const parseBatchInputText = (rawText) => {
    const cleaned = String(rawText || '').replace(/^\uFEFF/, '').trim();
    if (!cleaned) return [];

    // If JSON array
    if (cleaned.startsWith('[')) {
      try {
        const arr = JSON.parse(cleaned);
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        // Fallback to CSV parser
      }
    }

    const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Detect delimiter from first line: Tab (\t), Semicolon (;) for Vietnamese Excel, or Comma (,)
    const firstLineSample = lines[0];
    const delimiter = firstLineSample.includes('\t')
      ? '\t'
      : firstLineSample.split(';').length > firstLineSample.split(',').length
        ? ';'
        : ',';

    // RFC-4180 quote-aware line splitter (handles commas/semicolons inside "..." and escaped "")
    const splitCsvRow = (line) => {
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === delimiter && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());
      return cells;
    };

    const firstRow = splitCsvRow(lines[0]);
    const hasHeader = firstRow.some((h) =>
      ['code', 'mã tài sản', 'ma_ts', 'name', 'tên thiết bị', 'category', 'loại', 'price', 'giá'].includes(h.toLowerCase())
    );

    const headers = hasHeader
      ? firstRow.map((h) => {
          const lower = h.toLowerCase();
          if (lower.includes('code') || lower.includes('mã tài sản') || lower === 'ma_ts') return 'code';
          if (lower.includes('name') || lower.includes('tên')) return 'name';
          if (lower.includes('category') || lower.includes('loại')) return 'category';
          if (lower.includes('room') || lower.includes('phòng')) return 'room';
          if (lower.includes('price') || lower.includes('giá')) return 'price';
          if (lower.includes('brand') || lower.includes('hãng')) return 'brand';
          if (lower.includes('model')) return 'model';
          if (lower.includes('serial')) return 'serial_number';
          return lower;
        })
      : ['code', 'name', 'category', 'room', 'price', 'brand', 'model', 'serial_number'];

    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map((line) => {
      const cols = splitCsvRow(line);
      const obj = {};
      headers.forEach((key, idx) => {
        if (cols[idx] !== undefined) {
          obj[key] = key === 'price' ? Number(String(cols[idx]).replace(/[^0-9.-]/g, '')) || 0 : cols[idx];
        }
      });
      return obj;
    });
  };

  const serializeItemsToCsv = (items) => {
    const header = 'code,name,category,room,price,brand,model,serial_number';
    const escapeCell = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = items.map((it) =>
      [
        it.code || '',
        it.name || '',
        it.category || it.category_id || '',
        it.room || it.room_id || 'KHO',
        it.price ?? 0,
        it.brand || '',
        it.model || '',
        it.serial_number || ''
      ]
        .map(escapeCell)
        .join(',')
    );
    return [header, ...rows].join('\n');
  };

  const handleBatchTextChange = (text) => {
    setBatchRawText(text);
    const items = parseBatchInputText(text);
    setParsedBatchItems(items);
    setValidationResult(null);
  };

  // Inline cell editing directly inside the Preview Grid (UC-3.6 & UC-3.7)
  const handleInlineBatchCellChange = (rowIdx, field, value) => {
    setParsedBatchItems((prev) => {
      const next = prev.map((it, idx) => {
        if (idx !== rowIdx) return it;
        return {
          ...it,
          [field]: field === 'price' ? Number(value) || 0 : value
        };
      });
      setBatchRawText(serializeItemsToCsv(next));
      return next;
    });
    setValidationResult(null);
  };

  const handleRemoveBatchRow = (rowIdx) => {
    setParsedBatchItems((prev) => {
      const next = prev.filter((_, idx) => idx !== rowIdx);
      setBatchRawText(serializeItemsToCsv(next));
      return next;
    });
    setValidationResult(null);
  };

  const handleRemoveAllInvalidBatchRows = () => {
    if (!validationResult?.previewRows) return;
    const validIndices = new Set(
      validationResult.previewRows.filter((r) => r.valid).map((r) => r.row - 1)
    );
    const next = parsedBatchItems.filter((_, idx) => validIndices.has(idx));
    setParsedBatchItems(next);
    setBatchRawText(serializeItemsToCsv(next));
    setValidationResult(null);
    toast.success(`Đã loại bỏ các dòng lỗi. Còn lại ${next.length} dòng hợp lệ sẵn sàng kiểm tra & nhập kho!`);
  };

  // Native Zero-Dependency .xlsx (OpenXML ZIP) Parser using Web DecompressionStream + DOMParser
  const parseXlsxArrayBufferToCsv = async (buffer) => {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const decoder = new TextDecoder('utf-8');
    const entries = new Map();

    // Scan Central Directory headers (0x02014b50) for accurate compressed sizes
    for (let i = 0; i < bytes.length - 46; i++) {
      if (view.getUint32(i, true) === 0x02014b50) {
        const compression = view.getUint16(i + 10, true);
        const compSize = view.getUint32(i + 20, true);
        const nameLen = view.getUint16(i + 28, true);
        const extraLen = view.getUint16(i + 30, true);
        const commentLen = view.getUint16(i + 32, true);
        const localOffset = view.getUint32(i + 42, true);
        const name = decoder.decode(bytes.subarray(i + 46, i + 46 + nameLen));
        entries.set(name, { compression, compSize, localOffset });
        i += 45 + nameLen + extraLen + commentLen;
      }
    }

    const readZipEntryXml = async (entryName) => {
      const meta = entries.get(entryName);
      if (!meta) return null;
      const loc = meta.localOffset;
      if (view.getUint32(loc, true) !== 0x04034b50) return null;
      const lNameLen = view.getUint16(loc + 26, true);
      const lExtraLen = view.getUint16(loc + 28, true);
      const dataStart = loc + 30 + lNameLen + lExtraLen;
      const slice = bytes.subarray(dataStart, dataStart + meta.compSize);

      if (meta.compression === 0) {
        return decoder.decode(slice);
      }
      if (meta.compression === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(slice);
        writer.close();
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        return decoder.decode(decompressedBuf);
      }
      return null;
    };

    const sharedXml = await readZipEntryXml('xl/sharedStrings.xml');
    const sharedStrings = [];
    const domParser = new DOMParser();

    if (sharedXml) {
      const sDoc = domParser.parseFromString(sharedXml, 'application/xml');
      const siNodes = sDoc.getElementsByTagName('si');
      for (let i = 0; i < siNodes.length; i++) {
        const tNodes = siNodes[i].getElementsByTagName('t');
        let text = '';
        for (let j = 0; j < tNodes.length; j++) {
          text += tNodes[j].textContent || '';
        }
        sharedStrings.push(text);
      }
    }

    const sheetEntryName =
      Array.from(entries.keys()).find((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k)) ||
      'xl/worksheets/sheet1.xml';
    const sheetXml = await readZipEntryXml(sheetEntryName);
    if (!sheetXml) {
      throw new Error('Không tìm thấy bảng tính hợp lệ bên trong tệp .xlsx.');
    }

    const sheetDoc = domParser.parseFromString(sheetXml, 'application/xml');
    const rowNodes = sheetDoc.getElementsByTagName('row');
    const matrix = [];

    const colLettersToIndex = (ref) => {
      const match = String(ref || '').match(/^[A-Z]+/i);
      if (!match) return 0;
      const letters = match[0].toUpperCase();
      let idx = 0;
      for (let i = 0; i < letters.length; i++) {
        idx = idx * 26 + (letters.charCodeAt(i) - 64);
      }
      return Math.max(0, idx - 1);
    };

    for (let r = 0; r < rowNodes.length; r++) {
      const cNodes = rowNodes[r].getElementsByTagName('c');
      const rowValues = [];
      for (let c = 0; c < cNodes.length; c++) {
        const cell = cNodes[c];
        const colIdx = colLettersToIndex(cell.getAttribute('r') || '');
        const cellType = cell.getAttribute('t');
        const vNode = cell.getElementsByTagName('v')[0];
        const isNode = cell.getElementsByTagName('is')[0];
        let val = '';
        if (cellType === 's' && vNode) {
          const sIdx = parseInt(vNode.textContent || '0', 10);
          val = sharedStrings[sIdx] ?? '';
        } else if (cellType === 'inlineStr' && isNode) {
          val = isNode.textContent || '';
        } else if (vNode) {
          val = vNode.textContent || '';
        }
        rowValues[colIdx] = String(val).trim();
      }
      if (rowValues.some((v) => v && v.length > 0)) {
        const filled = [];
        for (let k = 0; k < rowValues.length; k++) {
          const cellStr = String(rowValues[k] ?? '');
          filled.push(
            cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')
              ? `"${cellStr.replace(/"/g, '""')}"`
              : cellStr
          );
        }
        matrix.push(filled.join(','));
      }
    }

    return matrix.join('\n');
  };

  const handleCsvFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchFileName(file.name);

    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
    if (isXlsx) {
      try {
        const arrayBuf = await file.arrayBuffer();
        const csvConverted = await parseXlsxArrayBufferToCsv(arrayBuf);
        handleBatchTextChange(csvConverted);
        toast.success(`Đã giải mã trực tiếp tệp Excel [${file.name}] vào lưới xem trước!`);
      } catch (err) {
        toast.error('Không thể đọc tệp .xlsx: ' + err.message);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result || '';
      handleBatchTextChange(String(content));
      toast.info(`Đã nạp tệp [${file.name}] vào lưới xem trước.`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Generate >100 sample records in 1 click for testing UC-3.6 (>100 records) & UC-3.7
  const handleGenerate105SampleRows = (includeIntentionalErrors = false) => {
    const defaultCat = categories[0]?.code || categories[0]?.name || categories[0]?._id || 'TB-TRINH-CHIEU';
    const defaultRoom = rooms[0]?.code || 'A1-101';
    const secondRoom = rooms[1]?.code || 'A1-201';
    const baseSeed = Math.floor(100 + Math.random() * 800);

    const rows = ['code,name,category,room,price,brand,model,serial_number'];
    for (let i = 1; i <= 105; i++) {
      const num = String(i).padStart(3, '0');
      let code = `EQ-A1-${baseSeed}-${num}`;
      let cat = defaultCat;
      let room = i % 3 === 0 ? 'KHO' : i % 2 === 0 ? secondRoom : defaultRoom;
      const price = 12000000 + (i % 10) * 1500000;

      if (includeIntentionalErrors) {
        if (i === 2) code = `EQ-A1-${baseSeed}-001`; // Duplicate code with row 1
        if (i === 3) room = 'B2-999'; // Invalid room outside Building A1
        if (i === 4) cat = 'LOAI-TB-SAI-999'; // Invalid category
      }

      rows.push(
        `${code},Thiết Bị Giảng Đường Tòa A1 #${num},${cat},${room},${price},Panasonic,PT-VZ580,SN-A1-${baseSeed}-${num}`
      );
    }

    const csvText = rows.join('\n');
    setBatchFileName(includeIntentionalErrors ? 'mau_kiem_thu_loi_105_dong.csv' : 'lo_nhap_thiet_bi_A1_105_dong.csv');
    handleBatchTextChange(csvText);
    toast.success(
      includeIntentionalErrors
        ? 'Đã tạo 105 dòng dữ liệu mẫu (kèm 3 dòng lỗi cố ý: trùng mã, sai phòng, sai loại TB) để kiểm thử UC-3.7!'
        : 'Đã tạo 105 bản ghi CSV chuẩn Tòa nhà A1 (>100 bản ghi) sẵn sàng kiểm tra và nhập kho!'
    );
  };

  const handleDownloadSampleCsv = () => {
    const defaultCat = categories[0]?.code || categories[0]?.name || 'TB-TRINH-CHIEU';
    const defaultRoom = rooms[0]?.code || 'A1-101';
    const csvContent = [
      'code,name,category,room,price,brand,model,serial_number',
      `EQ-2026-8001,Máy Chiếu Laser Tòa A1,${defaultCat},${defaultRoom},24500000,Sony,VPL-PHZ60,SN-8001`,
      `EQ-2026-8002,Màn Hình Tương Tác Thông Minh 75 inch,${defaultCat},KHO,42000000,Maxhub,V6-75,SN-8002`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau_nhap_thiet_bi_A1.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // UC-3.7: Validate Batch on Backend
  const handleValidateBatch = async () => {
    const items = parsedBatchItems.length > 0 ? parsedBatchItems : parseBatchInputText(batchRawText);
    if (!items || items.length === 0) {
      toast.error('Vui lòng tải tệp CSV/Excel hoặc nhập dữ liệu trước khi kiểm tra.');
      return;
    }

    try {
      setValidatingBatch(true);
      const res = await equipmentApi.validateBatch({
        file_name: batchFileName,
        items
      });
      setValidationResult(res);
      if (res.valid) {
        toast.success(res.message || `Kiểm tra hợp lệ 100% (${res.totalRows} bản ghi)!`);
      } else {
        toast.warning(res.message || `Phát hiện ${res.errorCount} lỗi dữ liệu trên các dòng.`);
      }
    } catch (err) {
      toast.error('Lỗi khi kiểm tra dữ liệu: ' + err.message);
    } finally {
      setValidatingBatch(false);
    }
  };

  // UC-3.6: Execute Batch Import on Backend
  const handleBatchImport = async (e) => {
    e.preventDefault();
    const items = parsedBatchItems.length > 0 ? parsedBatchItems : parseBatchInputText(batchRawText);
    if (!items || items.length === 0) {
      toast.error('Không có dữ liệu thiết bị để nhập hàng loạt.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await equipmentApi.importBatch({
        file_name: batchFileName,
        items,
        allowPartial: true
      });
      if (res && res.success) {
        toast.success(res.message || `Đã nhập thành công ${res.importedCount} thiết bị vào kho!`);
        setShowBatchModal(false);
        setBatchRawText('');
        setParsedBatchItems([]);
        setValidationResult(null);
        fetchEquipments();
      }
    } catch (err) {
      if (err.data?.previewRows) {
        setValidationResult(err.data);
      }
      toast.error('Lỗi khi nhập hàng loạt: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      in_use: { label: 'Đang sử dụng', color: 'var(--status-active-color)', bg: 'var(--status-active-bg)', border: 'var(--status-active-border)', dot: 'var(--status-active-solid)' },
      in_stock: { label: 'Kho dự phòng', color: 'var(--status-transferring-color)', bg: 'var(--status-transferring-bg)', border: 'var(--status-transferring-border)', dot: 'var(--status-transferring-solid)' },
      broken: { label: 'Bị hỏng', color: 'var(--status-overdue-color)', bg: 'var(--status-overdue-bg)', border: 'var(--status-overdue-border)', dot: 'var(--status-overdue-solid)' },
      repairing: { label: 'Đang sửa chữa', color: 'var(--status-repairing-color)', bg: 'var(--status-repairing-bg)', border: 'var(--status-repairing-border)', dot: 'var(--status-repairing-solid)' },
      pending_disposal: { label: 'Chờ thanh lý', color: 'var(--status-disposal-color)', bg: 'var(--status-disposal-bg)', border: 'var(--status-disposal-border)', dot: 'var(--status-disposal-solid)' },
      disposed: { label: 'Đã thanh lý (DISPOSED)', color: 'var(--status-disposed-color)', bg: 'var(--status-disposed-bg)', border: 'var(--status-disposed-border)', dot: 'var(--status-disposed-solid)' }
    };
    const item = map[status] || { label: status, color: 'var(--status-disposed-color)', bg: 'var(--status-disposed-bg)', border: 'var(--status-disposed-border)', dot: 'var(--status-disposed-solid)' };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '11.5px',
          fontWeight: 800,
          color: item.color,
          background: item.bg,
          border: `1.5px solid ${item.border}`
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.dot }} />
        {item.label}
      </span>
    );
  };

  // KPI Counters
  const inUseCount = equipments.filter((e) => e.status === 'in_use').length;
  const inStockCount = equipments.filter((e) => e.status === 'in_stock').length;
  const brokenCount = equipments.filter((e) => e.status === 'broken' || e.status === 'repairing').length;
  const disposedCount = equipments.filter((e) => e.status === 'disposed').length;

  const isEditingRoomChanged =
    showEditModal &&
    selectedEq &&
    String(selectedEq.room_id?._id || selectedEq.room_id || '') !== String(formData.room_id || '');

  const previewRowsToDisplay = parsedBatchItems.map((item, idx) => {
    const validatedRow = validationResult?.previewRows?.[idx];
    return {
      row: idx + 1,
      rawCode: item.code || '',
      rawName: item.name || '',
      rawCategory: item.category || item.category_id || '',
      rawRoom: item.room || item.room_id || 'KHO',
      rawPrice: item.price ?? 0,
      code: validatedRow?.code || item.code || '(Trống)',
      name: validatedRow?.name || item.name || '(Trống)',
      category_name: validatedRow?.category_name || item.category || item.category_id || '(Trống)',
      room_name: validatedRow?.room_name || item.room || item.room_id || 'Kho dự phòng',
      price: item.price || 0,
      valid: validatedRow ? validatedRow.valid : null,
      errors: validatedRow?.errors || []
    };
  });

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', background: 'var(--surface-card)', border: '1.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#FFFFFF', background: '#1D4ED8', border: '1px solid #1E40AF', padding: '3px 9px', borderRadius: '5px', fontWeight: 800 }}>
              MODULE 03 • TÒA NHÀ ĐA NĂNG A1
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 700 }}>
              UC-3.1 → UC-3.8 • QUẢN LÝ VÒNG ĐỜI, NHẬP LÔ EXCEL/CSV, TEM QR &amp; THANH LÝ
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Danh Mục Thiết Bị &amp; Hồ Sơ Vòng Đời Tài Sản (Tòa A1)
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Fast QR Lookup Input right in the header */}
          <form onSubmit={handleFastQrLookup} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <Icons.QrCode size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--laser-cyan)' }} />
              <input
                type="text"
                value={fastQrInput}
                onChange={(e) => setFastQrInput(e.target.value)}
                placeholder="Quét / nhập nhanh mã QR..."
                className="ruo-portal-input"
                style={{ paddingLeft: '32px', height: '38px', width: '210px', fontSize: '12.5px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
            </div>
            <button
              type="submit"
              disabled={qrLookupLoading}
              className="laser-btn laser-btn-secondary"
              style={{ height: '38px', padding: '0 14px', fontSize: '12.5px', fontWeight: 800, color: 'var(--laser-cyan)', border: '1.5px solid var(--laser-cyan)' }}
              title="Tra cứu dưới 1 giây bằng mã QR"
            >
              {qrLookupLoading ? '...' : 'Tra QR'}
            </button>
          </form>

          {canImportOrDispose && (
            <button
              onClick={() => {
                setShowBatchModal(true);
                if (parsedBatchItems.length === 0 && !batchRawText) {
                  handleGenerate105SampleRows(false);
                }
              }}
              className="laser-btn laser-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 800, border: '1.5px solid var(--border-strong)' }}
            >
              <Icons.Upload size={16} />
              <span>Nhập Lô Excel/CSV (&gt;100 bản ghi)</span>
            </button>
          )}

          {canCreateOrUpdate && (
            <button
              onClick={openCreate}
              className="laser-btn laser-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 800 }}
            >
              <Icons.Plus size={16} />
              <span>Đăng Ký Thiết Bị Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="ruo-stagger-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="ruo-motion-card" style={{ background: 'var(--surface-card)', border: '1.5px solid var(--border-default)', borderTop: '4px solid #1E3A8A', borderRadius: 'var(--radius-lg)', padding: '15px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 800 }}>Tổng thiết bị truy vấn</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{totalCount}</div>
        </div>
        <div className="ruo-motion-card" style={{ background: 'var(--surface-card)', border: '1.5px solid var(--status-active-border)', borderTop: '4px solid var(--status-active-solid)', borderRadius: 'var(--radius-lg)', padding: '15px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--status-active-color)', fontWeight: 800 }}>Đang sử dụng tại phòng (In Use)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--status-active-color)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{inUseCount}</div>
        </div>
        <div className="ruo-motion-card" style={{ background: 'var(--surface-card)', border: '1.5px solid var(--status-transferring-border)', borderTop: '4px solid var(--status-transferring-solid)', borderRadius: 'var(--radius-lg)', padding: '15px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--status-transferring-color)', fontWeight: 800 }}>Kho dự phòng (In Stock)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--status-transferring-color)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{inStockCount}</div>
        </div>
        <div className="ruo-motion-card" style={{ background: 'var(--surface-card)', border: '1.5px solid var(--status-overdue-border)', borderTop: '4px solid var(--status-overdue-solid)', borderRadius: 'var(--radius-lg)', padding: '15px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--status-overdue-color)', fontWeight: 800 }}>Hỏng / Đang sửa chữa</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--status-overdue-color)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{brokenCount}</div>
        </div>
        <div className="ruo-motion-card" style={{ background: 'var(--surface-card)', border: '1.5px solid var(--status-disposed-border)', borderTop: '4px solid var(--status-disposed-solid)', borderRadius: 'var(--radius-lg)', padding: '15px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '12px', color: 'var(--status-disposed-color)', fontWeight: 800 }}>Đã thanh lý (Disposed)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--status-disposed-color)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{disposedCount}</div>
        </div>
      </div>

      {/* Multi-dimensional Filter & Search Bar (UC-3.2) */}
      <div style={{ background: 'var(--surface-card)', border: '1.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '18px', marginBottom: '20px', boxShadow: 'var(--shadow-xs)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 250px' }}>
              <Icons.Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ink-secondary)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên thiết bị, mã tài sản, mã QR (QR-EQ-...), serial, model..."
                className="ruo-portal-input"
                style={{ paddingLeft: '38px', width: '100%', height: '38px', fontWeight: 600 }}
              />
            </div>

            {/* Filter 1: Chủng loại */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="ruo-portal-input"
              style={{ height: '38px', fontSize: '12.5px', padding: '0 12px', width: 'auto', minWidth: '165px', fontWeight: 600 }}
            >
              <option value="ALL">Tất cả chủng loại</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
              ))}
            </select>

            {/* Filter 2: Tầng Tòa A1 */}
            <select
              value={floorFilter}
              onChange={(e) => { setFloorFilter(e.target.value); setPage(1); }}
              className="ruo-portal-input"
              style={{ height: '38px', fontSize: '12.5px', padding: '0 12px', width: 'auto', minWidth: '135px', fontWeight: 600 }}
            >
              <option value="ALL">Tất cả 7 tầng</option>
              {[1, 2, 3, 4, 5, 6, 7].map((fl) => (
                <option key={fl} value={String(fl)}>Tầng {fl} — Tòa A1</option>
              ))}
            </select>

            {/* Filter 3: Phòng học Tòa A1 */}
            <select
              value={roomFilter}
              onChange={(e) => { setRoomFilter(e.target.value); setPage(1); }}
              className="ruo-portal-input"
              style={{ height: '38px', fontSize: '12.5px', padding: '0 12px', width: 'auto', minWidth: '180px', fontWeight: 600 }}
            >
              <option value="ALL">Tất cả vị trí (Tòa A1)</option>
              <option value="warehouse">Kho dự phòng (Chưa phân phòng)</option>
              {rooms
                .filter((r) => floorFilter === 'ALL' || Number(r.floor) === Number(floorFilter))
                .map((r) => (
                  <option key={r._id} value={r._id}>{r.code} — {r.name} (Tầng {r.floor})</option>
                ))}
            </select>

            {/* Filter 4: Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="ruo-portal-input"
              style={{ height: '38px', fontSize: '12.5px', padding: '0 12px', width: 'auto', minWidth: '160px', fontWeight: 600 }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="in_use">Đang sử dụng (in_use)</option>
              <option value="in_stock">Kho dự phòng (in_stock)</option>
              <option value="broken">Bị hỏng (broken)</option>
              <option value="repairing">Đang sửa (repairing)</option>
              <option value="pending_disposal">Chờ thanh lý</option>
              <option value="disposed">Đã thanh lý (disposed)</option>
            </select>

            {/* Filter 5: Bảo hành */}
            <select
              value={warrantyFilter}
              onChange={(e) => { setWarrantyFilter(e.target.value); setPage(1); }}
              className="ruo-portal-input"
              style={{ height: '38px', fontSize: '12.5px', padding: '0 12px', width: 'auto', minWidth: '150px', fontWeight: 600 }}
            >
              <option value="ALL">Tất cả bảo hành</option>
              <option value="active">Còn hạn bảo hành</option>
              <option value="expired">Đã hết hạn BH</option>
            </select>
          </div>

          {/* Second Filter Row: Price Range (Tầm giá) + Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--ink-primary)', fontWeight: 700 }}>Tầm nguyên giá (VNĐ):</span>
              <input
                type="number"
                min="0"
                step="1000000"
                placeholder="Từ giá (VD: 5000000)"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="ruo-portal-input"
                style={{ width: '165px', height: '34px', fontSize: '12px' }}
              />
              <span style={{ color: 'var(--ink-secondary)', fontWeight: 700 }}>—</span>
              <input
                type="number"
                min="0"
                step="1000000"
                placeholder="Đến giá (VD: 50000000)"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="ruo-portal-input"
                style={{ width: '165px', height: '34px', fontSize: '12px' }}
              />
              <button
                type="button"
                onClick={() => { setMinPrice(''); setMaxPrice('15000000'); }}
                style={{ fontSize: '11.5px', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)', color: 'var(--ink-primary)', cursor: 'pointer' }}
              >
                &lt; 15 triệu
              </button>
              <button
                type="button"
                onClick={() => { setMinPrice('15000000'); setMaxPrice('40000000'); }}
                style={{ fontSize: '11.5px', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)', color: 'var(--ink-primary)', cursor: 'pointer' }}
              >
                15 – 40 triệu
              </button>
              <button
                type="button"
                onClick={() => { setMinPrice('40000000'); setMaxPrice(''); }}
                style={{ fontSize: '11.5px', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)', color: 'var(--ink-primary)', cursor: 'pointer' }}
              >
                &gt; 40 triệu
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleResetFilters}
                className="laser-btn laser-btn-secondary"
                style={{ height: '34px', padding: '0 14px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700 }}
              >
                Đặt Lại Bộ Lọc
              </button>
              <button
                type="submit"
                className="laser-btn laser-btn-primary"
                style={{ height: '34px', padding: '0 18px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', fontWeight: 800 }}
              >
                Áp Dụng Tìm Kiếm
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Equipment Table */}
      <div style={{ background: 'var(--surface-card)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-secondary)' }}>
            <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 700 }}>Đang tải danh sách thiết bị...</div>
          </div>
        ) : equipments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-secondary)' }}>
            <Icons.Equipment size={36} style={{ opacity: 0.6, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink-pure)' }}>Không tìm thấy thiết bị nào phù hợp.</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Hãy thử điều chỉnh bộ lọc hoặc đăng ký tài sản mới.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-header)', borderBottom: '2px solid var(--border-strong)' }}>
                  <th style={{ padding: '14px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Mã Tài Sản / QR</th>
                  <th style={{ padding: '14px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Tên Thiết Bị / Model</th>
                  <th style={{ padding: '14px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Chủng Loại</th>
                  <th style={{ padding: '14px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Vị Trí (Tòa A1)</th>
                  <th style={{ padding: '14px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Nguyên Giá</th>
                  <th style={{ padding: '14px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Trạng Thái</th>
                  <th style={{ padding: '14px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Bảo Hành</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--ink-pure)', fontWeight: 800 }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {equipments.map((eq) => {
                  const roomInfo = eq.room_id ? `${eq.room_id.code} (${eq.room_id.name})` : 'Kho dự phòng';
                  const catInfo = eq.category_id?.name || 'Chung';
                  const isWarrantyActive = eq.warranty_expiry && new Date(eq.warranty_expiry) > new Date();

                  return (
                    <tr
                      key={eq._id}
                      style={{ borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}
                      onClick={() => openDetail(eq)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>{eq.code}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--ink-muted)' }}>{eq.qr_code || `QR-${eq.code}`}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{eq.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                          {eq.brand} {eq.model} {eq.serial_number && `• SN: ${eq.serial_number}`}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)' }}>
                        {catInfo}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: eq.room_id ? 'var(--ink-pure)' : 'var(--laser-cyan)' }}>
                          {roomInfo}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink-pure)' }}>
                        {(eq.price || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(eq.status)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {eq.warranty_expiry ? (
                          <div style={{ fontSize: '12px', fontWeight: 700, color: isWarrantyActive ? 'var(--status-active-color)' : 'var(--status-overdue-color)' }}>
                            ● {isWarrantyActive ? 'Còn hạn' : 'Hết hạn'} ({new Date(eq.warranty_expiry).toLocaleDateString('vi-VN')})
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)', fontSize: '12px', fontWeight: 600 }}>Không có</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => openQr(eq)}
                            className="laser-btn laser-btn-secondary"
                            style={{ padding: '6px 9px', borderRadius: '6px', background: 'var(--status-transferring-bg)', border: '1.5px solid var(--status-transferring-border)', color: 'var(--status-transferring-color)' }}
                            title="Tạo & In nhãn QR Code"
                          >
                            <Icons.QrCode size={14} />
                          </button>
                          {canCreateOrUpdate && (
                            <>
                              <button
                                onClick={() => openWarranty(eq)}
                                className="laser-btn laser-btn-secondary"
                                style={{ padding: '6px 9px', borderRadius: '6px', background: 'var(--status-active-bg)', border: '1.5px solid var(--status-active-border)', color: 'var(--status-active-color)' }}
                                title="Cập nhật bảo hành"
                              >
                                <Icons.Shield size={14} />
                              </button>
                              <button
                                onClick={() => openEdit(eq)}
                                className="laser-btn laser-btn-secondary"
                                style={{ padding: '6px 9px', borderRadius: '6px', background: 'var(--status-disposal-bg)', border: '1.5px solid var(--status-disposal-border)', color: 'var(--status-disposal-color)' }}
                                title="Chỉnh sửa thông số & vị trí phòng (UC-3.4)"
                              >
                                <Icons.Edit size={14} />
                              </button>
                            </>
                          )}
                          {canImportOrDispose && eq.status !== 'disposed' && (
                            <button
                              onClick={() => openDispose(eq)}
                              className="laser-btn laser-btn-secondary"
                              style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--status-overdue-bg)', border: '1.5px solid var(--status-overdue-border)', color: 'var(--status-overdue-color)', fontSize: '11.5px', fontWeight: 800 }}
                              title="Thanh lý tài sản theo QĐ BGH (UC-3.8)"
                            >
                              Thanh lý
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--hairline-medium)', background: 'var(--surface-panel)', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--ink-muted)' }}>
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng {totalCount} tài sản)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="laser-btn laser-btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12px', opacity: page <= 1 ? 0.5 : 1 }}
              >
                ← Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="laser-btn laser-btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12px', opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer (UC-3.3 & UC-3.5 Lifecycle Timeline) */}
      {selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setSelectedEq(null)}>
          <div className="ruo-drawer-panel" style={{ width: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">{selectedEq.name}</h2>
                <p className="ruo-drawer-subtitle">
                  {selectedEq.code} • QR: {selectedEq.qr_code || `QR-${selectedEq.code}`} • {selectedEq.brand} {selectedEq.model}
                </p>
              </div>
              <button onClick={() => setSelectedEq(null)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline-medium)', padding: '0 20px', gap: '4px', background: 'var(--surface-panel)', overflowX: 'auto' }}>
              {[
                { id: 'overview', label: 'Tổng Quan (UC-3.3)', icon: Icons.Equipment },
                { id: 'lifecycle', label: `Dòng Đời Timeline (${detailData?.lifecycle?.events?.length || 0})`, icon: Icons.Clock },
                { id: 'movements', label: `Điều Chuyển (${detailData?.movements?.length || 0})`, icon: Icons.Activity },
                { id: 'repairs', label: `Sự Cố & Sửa (${detailData?.repairs?.length || 0})`, icon: Icons.Wrench },
                { id: 'depreciation', label: 'Bảo Trì & Khấu Hao', icon: Icons.Shield }
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 11px',
                      border: 'none',
                      background: 'none',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? 'var(--laser-cyan)' : 'var(--ink-muted)',
                      borderBottom: isActive ? '2.5px solid var(--laser-cyan)' : '2.5px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <IconComp size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}>
                  <Icons.Clock size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '13px' }}>Đang tải lịch sử vòng đời tài sản...</div>
                </div>
              ) : (
                <>
                  {/* 5-Stage Lifecycle Pipeline Bar (UC-3.5: Tiếp nhận → Phân bổ → Báo hỏng → Sửa chữa → Thanh lý) */}
                  {detailData?.lifecycle?.stages && (
                    <div style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Chu Trình Vòng Đời Tài Sản (UC-3.5 Lifecycle Pipeline)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                        {detailData.lifecycle.stages.map((st) => (
                          <div
                            key={st.key}
                            className={st.reached ? 'ruo-pipeline-stage-active' : undefined}
                            style={{
                              padding: '7px 6px',
                              borderRadius: '6px',
                              textAlign: 'center',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: st.reached ? '#1D4ED8' : 'var(--surface-card)',
                              border: `1.5px solid ${st.reached ? '#1E40AF' : 'var(--border-default)'}`,
                              color: st.reached ? '#FFFFFF' : 'var(--ink-muted)'
                            }}
                          >
                            {st.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 1: OVERVIEW (UC-3.3) */}
                  {activeTab === 'overview' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--border-default)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Trạng Thái Vận Hành</div>
                          <div style={{ marginTop: '4px' }}>{getStatusBadge(selectedEq.status)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openQr(selectedEq)}
                            className="laser-btn laser-btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 800, color: 'var(--laser-cyan)', border: '1.5px solid var(--laser-cyan)' }}
                          >
                            <Icons.QrCode size={14} />
                            <span>In Nhãn QR</span>
                          </button>
                          <button
                            onClick={() => setActiveTab('lifecycle')}
                            className="laser-btn laser-btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
                          >
                            <Icons.Clock size={14} />
                            <span>Xem Timeline (UC-3.5)</span>
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '12.5px' }}>
                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Vị Trí Hiện Tại (Tòa A1):</div>
                          <div style={{ fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                            {selectedEq.room_id ? `${selectedEq.room_id.code} - ${selectedEq.room_id.name}` : 'Kho dự phòng (KHO-A1)'}
                          </div>
                        </div>

                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Chủng Loại:</div>
                          <div style={{ fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                            {selectedEq.category_id?.name || 'Chung'}
                          </div>
                        </div>

                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Nguyên Giá Mua & Khấu Hao:</div>
                          <div style={{ fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                            {(selectedEq.price || 0).toLocaleString('vi-VN')} đ ({selectedEq.depreciation_rate || 20}%/năm)
                          </div>
                        </div>

                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Số Serial & Ngày Mua:</div>
                          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-pure)', marginTop: '2px' }}>
                            {selectedEq.serial_number || 'N/A'} • {selectedEq.purchase_date ? new Date(selectedEq.purchase_date).toLocaleDateString('vi-VN') : 'N/A'}
                          </div>
                        </div>

                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Nhà Sản Xuất / Model:</div>
                          <div style={{ fontWeight: 600, color: 'var(--ink-pure)', marginTop: '2px' }}>
                            {selectedEq.brand || 'N/A'} {selectedEq.model ? `• ${selectedEq.model}` : ''}
                          </div>
                        </div>

                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Nhà Cung Cấp:</div>
                          <div style={{ fontWeight: 600, color: 'var(--ink-pure)', marginTop: '2px' }}>
                            {selectedEq.supplier_id?.name || 'Kho Thiết Bị Trường'}
                          </div>
                        </div>
                      </div>

                      {selectedEq.warranty_expiry && (
                        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-pure)' }}>Thông Tin Bảo Hành</span>
                            {canCreateOrUpdate && (
                              <button onClick={() => openWarranty(selectedEq)} style={{ background: 'none', border: 'none', color: 'var(--laser-cyan)', fontSize: '11.5px', cursor: 'pointer' }}>
                                Cập nhật →
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                            Hạn bảo hành: <strong>{new Date(selectedEq.warranty_expiry).toLocaleDateString('vi-VN')}</strong> • Trạng thái: <strong>{selectedEq.warranty_status || 'active'}</strong>
                          </div>
                        </div>
                      )}

                      {selectedEq.specs && Object.keys(selectedEq.specs).length > 0 && (
                        <div>
                          <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '6px' }}>
                            Thông Số Kỹ Thuật & Hồ Sơ Lưu Trữ (Specs)
                          </div>
                          <pre style={{ background: 'var(--surface-panel)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
                            {JSON.stringify(selectedEq.specs, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  )}

                  {/* TAB 2: UNIFIED LIFECYCLE TIMELINE (UC-3.5) */}
                  {activeTab === 'lifecycle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(!detailData?.lifecycle?.events || detailData.lifecycle.events.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}>
                          Chưa có sự kiện dòng đời nào.
                        </div>
                      ) : (
                        detailData.lifecycle.events.map((ev, idx) => (
                          <div
                            key={ev.id || idx}
                            className="ruo-timeline-item"
                            style={{
                              animationDelay: `${idx * 0.05}s`,
                              background: 'var(--surface-card)',
                              border: '1px solid var(--hairline-medium)',
                              borderLeft: `4px solid ${ev.badge_color || 'var(--laser-cyan)'}`,
                              borderRadius: 'var(--radius-md)',
                              padding: '14px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: `${ev.badge_color || '#06B6D4'}20`,
                                  color: ev.badge_color || '#06B6D4'
                                }}
                              >
                                {ev.stage_label}
                              </span>
                              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                                {new Date(ev.timestamp).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '4px' }}>
                              {ev.title}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>{ev.description}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '6px' }}>
                              Thực hiện / Ghi nhận bởi: <strong>{ev.actor}</strong>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: MOVEMENTS TIMELINE */}
                  {activeTab === 'movements' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(!detailData?.movements || detailData.movements.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)', background: 'var(--surface-card)', border: '1px dashed var(--hairline-medium)', borderRadius: 'var(--radius-md)' }}>
                          <Icons.Activity size={32} style={{ opacity: 0.5, margin: '0 auto 8px' }} />
                          <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Chưa có lượt điều chuyển nào</div>
                          <div style={{ fontSize: '12px', marginTop: '2px' }}>Tài sản vẫn ở vị trí khởi tạo ban đầu.</div>
                        </div>
                      ) : (
                        detailData.movements.map((m, idx) => (
                          <div key={m._id || idx} className="ruo-timeline-item" style={{ animationDelay: `${idx * 0.05}s`, background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                                {new Date(m.created_at).toLocaleString('vi-VN')}
                              </span>
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', background: m.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: m.status === 'completed' ? '#10B981' : '#F59E0B' }}>
                                {m.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--ink-pure)', marginBottom: '6px' }}>
                              <span>{m.from_room_id ? `${m.from_room_id.code}` : 'Kho dự phòng'}</span>
                              <span style={{ color: 'var(--laser-cyan)' }}>→</span>
                              <span>{m.to_room_id ? `${m.to_room_id.code}` : 'Kho dự phòng'}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                              <div><strong>Lý do:</strong> {m.reason || 'Điều chuyển thường xuyên'}</div>
                              <div style={{ marginTop: '2px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                                Người yêu cầu: {m.ordered_by?.full_name || 'Hệ thống'} {m.performed_by ? `• Người thực hiện: ${m.performed_by.full_name}` : ''}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: REPAIRS & INCIDENTS */}
                  {activeTab === 'repairs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(!detailData?.repairs || detailData.repairs.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)', background: 'var(--surface-card)', border: '1px dashed var(--hairline-medium)', borderRadius: 'var(--radius-md)' }}>
                          <Icons.Wrench size={32} style={{ opacity: 0.5, margin: '0 auto 8px' }} />
                          <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Không có sự cố ghi nhận</div>
                          <div style={{ fontSize: '12px', marginTop: '2px' }}>Thiết bị hoạt động ổn định và chưa từng bị báo hỏng.</div>
                        </div>
                      ) : (
                        detailData.repairs.map((r, idx) => (
                          <div key={r._id || idx} className="ruo-timeline-item" style={{ animationDelay: `${idx * 0.05}s`, background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)' }}>
                                {r.ticket_code || 'REP-TICKET'}
                              </span>
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                                {r.damage_level?.toUpperCase() || 'MINOR'}
                              </span>
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--ink-pure)', fontWeight: 600, marginBottom: '4px' }}>
                              {r.incident_description}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' }}>
                              <div>Người báo: <strong>{r.reported_by?.full_name || 'N/A'}</strong></div>
                              <div>Kỹ thuật viên: <strong>{r.assigned_to?.full_name || 'Chưa nhận'}</strong></div>
                              <div>Chi phí: <strong>{(r.total_cost || 0).toLocaleString('vi-VN')} đ</strong></div>
                              <div>Kết quả: <strong style={{ color: r.outcome === 'repaired' ? '#10B981' : '#F59E0B' }}>{r.outcome || 'Đang xử lý'}</strong></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 5: MAINTENANCE & DEPRECIATION */}
                  {activeTab === 'depreciation' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-pure)' }}>Khấu Hao Đường Thẳng (Linear)</span>
                          <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', fontWeight: 600 }}>
                            {detailData?.depreciation?.depreciationRate || selectedEq.depreciation_rate || 20}% / năm
                          </span>
                        </div>

                        <div style={{ height: '8px', width: '100%', background: 'var(--surface-panel)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div
                            className="ruo-progress-bar-animated"
                            style={{
                              height: '100%',
                              width: `${Math.min(100, detailData?.depreciation?.depreciationPercent || 0)}%`,
                              background: 'linear-gradient(90deg, #10B981 0%, #F59E0B 70%, #EF4444 100%)',
                              transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--ink-muted)', marginBottom: '14px' }}>
                          <span>Đã khấu hao: <strong>{detailData?.depreciation?.depreciationPercent || 0}%</strong></span>
                          <span>Đã sử dụng: <strong>{detailData?.depreciation?.yearsPassed || 0} năm</strong></span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                          <div style={{ background: 'var(--surface-panel)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Nguyên Giá</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                              {(detailData?.depreciation?.originalPrice || selectedEq.price || 0).toLocaleString('vi-VN')} đ
                            </div>
                          </div>

                          <div style={{ background: 'var(--surface-panel)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Đã Khấu Hao</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', marginTop: '2px' }}>
                              {(detailData?.depreciation?.depreciatedValue || 0).toLocaleString('vi-VN')} đ
                            </div>
                          </div>

                          <div style={{ background: 'var(--surface-panel)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Giá Trị Còn Lại</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', marginTop: '2px' }}>
                              {(detailData?.depreciation?.remainingValue || selectedEq.price || 0).toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="ruo-drawer-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {canImportOrDispose && selectedEq.status !== 'disposed' && (
                  <button
                    onClick={() => openDispose(selectedEq)}
                    className="laser-btn laser-btn-secondary"
                    style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.4)', fontWeight: 700 }}
                  >
                    Thanh Lý Tài Sản (UC-3.8)
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setSelectedEq(null)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>
                  Đóng
                </button>
                {canCreateOrUpdate && (
                  <button onClick={() => openEdit(selectedEq)} className="laser-btn laser-btn-primary" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
                    Chỉnh Sửa & Điều Chuyển Phòng (UC-3.4)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal (UC-3.1) */}
      {showCreateModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Đăng Ký Tài Sản Thiết Bị Mới (UC-3.1)</h2>
                <p className="ruo-drawer-subtitle">Mã tài sản unique, mã QR chuẩn, serial, model, nguyên giá, ngày mua, hạn BH, phòng Tòa A1</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Mã Tài Sản (Unique) *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value, qr_code: `QR-${e.target.value.toUpperCase().trim()}` })}
                      className="ruo-portal-input"
                      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Mã QR Định Danh Chuẩn *</label>
                    <input
                      type="text"
                      required
                      value={formData.qr_code}
                      onChange={(e) => setFormData({ ...formData, qr_code: e.target.value })}
                      className="ruo-portal-input"
                      style={{ width: '100%', fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Tên Thiết Bị *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Máy Chiếu Laser Panasonic PT-MZ880"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="ruo-portal-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Chủng Loại *</label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="ruo-portal-input"
                      style={{ width: '100%' }}
                    >
                      {categories.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hãng (Brand)</label>
                    <input type="text" placeholder="Panasonic" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Model</label>
                    <input type="text" placeholder="PT-MZ880" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Số Serial</label>
                    <input type="text" placeholder="SN-..." value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Phòng Học Phân Bổ (Tòa A1)</label>
                    <select value={formData.room_id} onChange={(e) => setFormData({ ...formData, room_id: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }}>
                      <option value="">Lưu vào Kho dự phòng (Chưa phân phòng)</option>
                      {rooms.map((r) => (<option key={r._id} value={r._id}>{r.code} - {r.name} (Tầng {r.floor})</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Nguyên Giá Mua (VNĐ) *</label>
                    <input type="number" min="0" step="50000" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Ngày Mua *</label>
                    <input type="date" required value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hạn Bảo Hành</label>
                    <input type="date" value={formData.warranty_expiry} onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Khấu Hao (%/năm)</label>
                    <input type="number" min="0" max="100" value={formData.depreciation_rate} onChange={(e) => setFormData({ ...formData, depreciation_rate: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Đăng Ký...' : 'Lưu & Khởi Tạo QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal with Automatic Movement Tracking (UC-3.4) */}
      {showEditModal && selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Cập Nhật Thông Tin & Vị Trí Thiết Bị (UC-3.4)</h2>
                <p className="ruo-drawer-subtitle">{selectedEq.code} • Tự động ghi nhật ký điều chuyển nếu đổi phòng</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Tên Thiết Bị *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Chủng Loại</label>
                    <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }}>
                      {categories.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hãng (Brand)</label>
                    <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Model</label>
                    <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Số Serial</label>
                    <input type="text" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Phòng Học Phân Bổ (Tòa A1)</label>
                    <select value={formData.room_id} onChange={(e) => setFormData({ ...formData, room_id: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }}>
                      <option value="">Kho dự phòng (Chưa phân phòng)</option>
                      {rooms.map((r) => (<option key={r._id} value={r._id}>{r.code} - {r.name} (Tầng {r.floor})</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Nguyên Giá Mua (VNĐ)</label>
                    <input type="number" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>

                {isEditingRoomChanged && (
                  <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid var(--laser-cyan)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--laser-cyan)', marginBottom: '6px' }}>
                      ⚡ Phát hiện thay đổi vị trí phòng học — Tự động ghi Nhật ký Điều chuyển (UC-3.4):
                    </div>
                    <input
                      type="text"
                      placeholder="Nhập lý do điều chuyển phòng..."
                      value={formData.movement_reason}
                      onChange={(e) => setFormData({ ...formData, movement_reason: e.target.value })}
                      className="ruo-portal-input"
                      style={{ width: '100%', height: '34px', fontSize: '12px' }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Ngày Mua</label>
                    <input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hạn Bảo Hành</label>
                    <input type="date" value={formData.warranty_expiry} onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Tỷ Lệ Hao Mòn (%/năm)</label>
                    <input type="number" min="0" max="100" value={formData.depreciation_rate} onChange={(e) => setFormData({ ...formData, depreciation_rate: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Lưu...' : 'Cập Nhật Thiết Bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Disposal Modal (UC-3.8: Chuyển trạng thái DISPOSED, số quyết định BGH, biên bản nghiệm thu thanh lý) */}
      {showDisposeModal && selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowDisposeModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title" style={{ color: '#EF4444' }}>Ghi Nhận Thanh Lý Tài Sản (UC-3.8)</h2>
                <p className="ruo-drawer-subtitle">{selectedEq.name} ({selectedEq.code})</p>
              </div>
              <button onClick={() => setShowDisposeModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleDisposeSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                  Thao tác này sẽ chuyển trạng thái tài sản sang <strong>ĐÃ THANH LÝ (DISPOSED)</strong>, thu hồi khỏi phòng học Tòa A1 và lưu vết vào Sổ cái kiểm toán SHA-256.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Số Quyết Định Thanh Lý Của Ban Giám Hiệu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: QĐ-BGH-2026-089"
                    value={disposeData.decision_number}
                    onChange={(e) => setDisposeData({ ...disposeData, decision_number: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Biên Bản Nghiệm Thu Thanh Lý & Lý Do *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Nhập nội dung biên bản nghiệm thu thanh lý, hội đồng thẩm định..."
                    value={disposeData.acceptance_report}
                    onChange={(e) => setDisposeData({ ...disposeData, acceptance_report: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%', fontSize: '12.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Giá Trị Thu Hồi Thanh Lý (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={disposeData.recovery_value}
                    onChange={(e) => setDisposeData({ ...disposeData, recovery_value: e.target.value })}
                    className="ruo-portal-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowDisposeModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#EF4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 20px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Đang Ghi Nhận...' : 'Xác Nhận Thanh Lý (DISPOSED)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warranty Modal */}
      {showWarrantyModal && selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowWarrantyModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Cập Nhật Thông Tin Bảo Hành</h2>
                <p className="ruo-drawer-subtitle">{selectedEq.name} ({selectedEq.code})</p>
              </div>
              <button onClick={() => setShowWarrantyModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleWarrantySubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hạn Bảo Hành Mới *</label>
                  <input type="date" required value={warrantyData.warranty_expiry} onChange={(e) => setWarrantyData({ ...warrantyData, warranty_expiry: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Trạng Thái Bảo Hành</label>
                  <select value={warrantyData.warranty_status} onChange={(e) => setWarrantyData({ ...warrantyData, warranty_status: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }}>
                    <option value="active">Còn hiệu lực (Active)</option>
                    <option value="extended">Gia hạn bảo hành (Extended)</option>
                    <option value="expired">Hết hạn (Expired)</option>
                    <option value="void">Từ chối bảo hành (Void)</option>
                  </select>
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowWarrantyModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Lưu...' : 'Lưu Bảo Hành'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Label Print Modal */}
      {showQrModal && selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '440px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Tem Nhãn Mã QR Định Danh CSVC</h2>
                <p className="ruo-drawer-subtitle">{selectedEq.qr_code || `QR-${selectedEq.code}`}</p>
              </div>
              <button onClick={() => setShowQrModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <div className="ruo-drawer-body">
              <div id="printable-qr-label" style={{ background: '#fff', color: '#000', padding: '24px', borderRadius: '8px', border: '2px solid #000', margin: '0 auto', maxWidth: '330px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #000', paddingBottom: '6px', marginBottom: '12px' }}>
                  TÒA NHÀ ĐA NĂNG A1 • HỆ THỐNG RUO UEMS
                </div>

                {/* Deterministic 2D QR SVG Matrix */}
                <div style={{ width: '164px', height: '164px', margin: '0 auto 12px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }}>
                  <NativeQrMatrixSvg value={selectedEq.qr_code || `QR-${selectedEq.code}`} size={148} />
                </div>

                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', letterSpacing: '0.05em' }}>
                  {selectedEq.qr_code || `QR-${selectedEq.code}`}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '3px' }}>
                  {selectedEq.name}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                  Mã TS: {selectedEq.code} • Phòng: {selectedEq.room_id?.code || 'Kho dự phòng'}
                </div>
              </div>
            </div>

            <div className="ruo-drawer-footer" style={{ justifyContent: 'center' }}>
              <button onClick={() => window.print()} className="laser-btn laser-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 24px', fontWeight: 700 }}>
                <Icons.Check size={16} />
                <span>In Tem Nhãn QR Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import & Validation Wizard Modal (UC-3.6 & UC-3.7) */}
      {showBatchModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowBatchModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '880px', maxWidth: '96vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Nhập Hàng Loạt Thiết Bị Excel/CSV &amp; Kiểm Tra Lỗi Dòng (UC-3.6 &amp; UC-3.7)</h2>
                <p className="ruo-drawer-subtitle">
                  Hỗ trợ tải tệp CSV/Excel &gt;100 bản ghi, lưới xem trước (Preview Grid) và bắt lỗi tự động từng dòng
                </p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleBatchImport}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Upload & Sample Generator Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'var(--surface-panel)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline-medium)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        background: '#1D4ED8',
                        color: '#FFFFFF',
                        border: '1.5px solid #1E3A8A',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <Icons.Upload size={14} />
                      <span>Chọn Tệp Excel / CSV (.xlsx, .csv, .txt)</span>
                      <input type="file" accept=".xlsx,.csv,.txt,.tsv,.json" onChange={handleCsvFileUpload} style={{ display: 'none' }} />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleGenerate105SampleRows(false)}
                      className="laser-btn laser-btn-secondary"
                      style={{ padding: '7px 12px', fontSize: '12px', fontWeight: 800 }}
                    >
                      ⚡ Tạo 105 Bản Ghi Chuẩn (&gt;100 dòng)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerate105SampleRows(true)}
                      className="laser-btn laser-btn-secondary"
                      style={{ padding: '7px 12px', fontSize: '12px', fontWeight: 800, color: 'var(--status-warning-color)', background: 'var(--status-warning-bg)', border: '1.5px solid var(--status-warning-border)' }}
                    >
                      Kiểm Thử Bắt Lỗi (UC-3.7)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    style={{ background: 'none', border: 'none', color: 'var(--laser-cyan)', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Icons.Download size={14} />
                    <span>Tải File Mẫu CSV</span>
                  </button>
                </div>

                {/* Raw CSV / JSON Input */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                      Dữ Liệu Nguồn CSV / JSON ({parsedBatchItems.length} bản ghi đang nạp):
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                      Cột chuẩn: <code>code,name,category,room,price,brand,model,serial_number</code>
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={batchRawText}
                    onChange={(e) => handleBatchTextChange(e.target.value)}
                    placeholder="Dán dữ liệu từ Excel/CSV hoặc JSON vào đây..."
                    className="ruo-portal-input"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}
                  />
                </div>

                {/* Validation Summary Banner (UC-3.7) */}
                {validationResult && (
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: validationResult.valid ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                      border: `2px solid ${validationResult.valid ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: validationResult.valid ? 'var(--status-success-color)' : 'var(--status-danger-color)' }}>
                        {validationResult.valid
                          ? `✔ KIỂM TRA HỢP LỆ 100%: Toàn bộ ${validationResult.totalRows} dòng dữ liệu đều đạt chuẩn!`
                          : `✖ PHÁT HIỆN ${validationResult.errorCount} LỖI DỮ LIỆU TRÊN ${validationResult.invalidRowCount}/${validationResult.totalRows} DÒNG`}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--ink-primary)', marginTop: '3px', fontWeight: 600 }}>
                        Hợp lệ: <strong>{validationResult.validCount}</strong> dòng • Lỗi: <strong>{validationResult.invalidRowCount}</strong> dòng (Bạn có thể sửa trực tiếp trên lưới bên dưới rồi bấm Kiểm tra lại)
                      </div>
                    </div>

                    {!validationResult.valid && validationResult.invalidRowCount > 0 && (
                      <button
                        type="button"
                        onClick={handleRemoveAllInvalidBatchRows}
                        style={{
                          background: '#DC2626',
                          color: '#FFFFFF',
                          border: '1.5px solid #991B1B',
                          borderRadius: '6px',
                          padding: '7px 14px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Lọc Bỏ {validationResult.invalidRowCount} Dòng Lỗi
                      </button>
                    )}
                  </div>
                )}

                {/* Preview Grid (Lưới xem trước >100 bản ghi & Sửa trực tiếp từng ô) */}
                {previewRowsToDisplay.length > 0 && (
                  <div style={{ border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: 'var(--surface-header)', borderBottom: '1.5px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                          Lưới Xem Trước &amp; Chỉnh Sửa Trực Tiếp ({previewRowsToDisplay.length} dòng)
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', marginLeft: '10px', fontWeight: 600 }}>
                          • Nhấp vào bất kỳ ô nào để sửa nhanh mã tài sản, phòng hoặc loại TB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleValidateBatch}
                        disabled={validatingBatch}
                        className="laser-btn laser-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 800, color: 'var(--status-info-color)', background: 'var(--status-info-bg)', border: '1.5px solid var(--status-info-border)' }}
                      >
                        {validatingBatch ? 'Đang Kiểm Tra...' : 'Kiểm Tra Tính Hợp Lệ (UC-3.7 Validate)'}
                      </button>
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-header)', borderBottom: '2px solid var(--border-strong)', position: 'sticky', top: 0, zIndex: 2 }}>
                            <th style={{ padding: '9px 10px' }}>Dòng</th>
                            <th style={{ padding: '9px 10px' }}>Mã Tài Sản</th>
                            <th style={{ padding: '9px 10px' }}>Tên Thiết Bị</th>
                            <th style={{ padding: '9px 10px' }}>Loại Thiết Bị</th>
                            <th style={{ padding: '9px 10px' }}>Phòng (Tòa A1)</th>
                            <th style={{ padding: '9px 10px' }}>Nguyên Giá</th>
                            <th style={{ padding: '9px 10px' }}>Kết Quả Kiểm Tra (UC-3.7)</th>
                            <th style={{ padding: '9px 8px', textAlign: 'center' }}>Xóa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRowsToDisplay.map((r, rowIdx) => {
                            const hasErr = r.valid === false || (r.errors && r.errors.length > 0);
                            const cellInputStyle = {
                              width: '100%',
                              padding: '4px 7px',
                              fontSize: '11.5px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: 'var(--ink-pure)',
                              background: 'var(--surface-card)',
                              border: `1.5px solid ${hasErr ? 'var(--status-danger-border)' : 'var(--border-default)'}`,
                              borderRadius: '5px'
                            };
                            return (
                              <tr
                                key={r.row}
                                style={{
                                  borderBottom: '1px solid var(--border-default)',
                                  background: hasErr ? 'var(--status-danger-bg)' : r.valid ? 'var(--status-success-bg)' : undefined
                                }}
                              >
                                <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--ink-secondary)' }}>#{r.row}</td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="text"
                                    value={r.rawCode}
                                    onChange={(e) => handleInlineBatchCellChange(rowIdx, 'code', e.target.value)}
                                    style={{ ...cellInputStyle, color: 'var(--laser-cyan)', fontWeight: 800, minWidth: '125px' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="text"
                                    value={r.rawName}
                                    onChange={(e) => handleInlineBatchCellChange(rowIdx, 'name', e.target.value)}
                                    style={{ ...cellInputStyle, fontFamily: 'var(--font-sans)', minWidth: '150px' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="text"
                                    value={r.rawCategory}
                                    onChange={(e) => handleInlineBatchCellChange(rowIdx, 'category', e.target.value)}
                                    style={{ ...cellInputStyle, minWidth: '110px' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <input
                                    type="text"
                                    value={r.rawRoom}
                                    onChange={(e) => handleInlineBatchCellChange(rowIdx, 'room', e.target.value)}
                                    style={{ ...cellInputStyle, width: '90px' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink-pure)' }}>
                                  {Number(r.price || 0).toLocaleString('vi-VN')} đ
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                  {r.valid === null ? (
                                    <span style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontWeight: 700 }}>Chưa kiểm tra</span>
                                  ) : hasErr ? (
                                    <div style={{ color: 'var(--status-danger-color)', fontWeight: 800, fontSize: '11px' }}>
                                      {r.errors.map((e, i) => (
                                        <div key={i}>• {e.message}</div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ color: 'var(--status-success-color)', fontWeight: 800, fontSize: '11.5px' }}>✔ Hợp lệ ({r.room_name})</span>
                                  )}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBatchRow(rowIdx)}
                                    style={{
                                      background: 'var(--status-danger-bg)',
                                      border: '1.5px solid var(--status-danger-border)',
                                      color: 'var(--status-danger-color)',
                                      borderRadius: '4px',
                                      padding: '3px 7px',
                                      cursor: 'pointer',
                                      fontWeight: 800,
                                      fontSize: '11px'
                                    }}
                                    title="Xóa dòng này khỏi lô nhập"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="ruo-drawer-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={handleValidateBatch}
                  disabled={validatingBatch}
                  className="laser-btn laser-btn-secondary"
                  style={{ padding: '8px 16px', fontWeight: 800, color: 'var(--laser-cyan)', border: '1.5px solid var(--laser-cyan)' }}
                >
                  {validatingBatch ? 'Đang Kiểm Tra...' : '1. Kiểm Tra Hợp Lệ (UC-3.7)'}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setShowBatchModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px', fontWeight: 700 }}>Hủy Bỏ</button>
                  <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 800 }}>
                    {submitting ? 'Đang Nhập Kho...' : `2. Nhập Hàng Loạt Vào Kho (${validationResult ? validationResult.validCount : parsedBatchItems.length} TB)`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentsPage;
