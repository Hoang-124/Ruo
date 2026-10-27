import React, { useCallback, useRef, useState } from 'react';
import { inventoryApi, reportApi } from '../../lib/api';
import { Button, Card } from '../../components/ui/Primitives';
import { Icons } from '../../components/common/SvgIcons';
import { reportDate, ReportState, useReport } from './reportShared';

function InventoryChoice({ refreshKey, sessionId, onChange }) {
  const sessions = useReport(useCallback(() => inventoryApi.getSessions(), []), refreshKey);
  return <ReportState report={sessions} label="danh sách đợt kiểm kê">
    {sessions.data && <>
      <label>Đợt kiểm kê <select value={sessionId} onChange={event => onChange(event.target.value)}>
        <option value="">Chọn đợt kiểm kê</option>
        {sessions.data.data.map(session => <option key={session._id} value={session._id}>{session.name} · {reportDate(session.date)}</option>)}
      </select></label>
      {sessions.data.data.length === 0 && <p>Chưa có đợt kiểm kê để xuất báo cáo.</p>}
    </>}
  </ReportState>;
}

export function ExportReport({ refreshKey }) {
  const [type, setType] = useState('equipment');
  const [sessionId, setSessionId] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [ready, setReady] = useState(false);
  const frame = useRef(null);
  const disabled = Boolean(pending) || (type === 'inventory' && !sessionId);
  const clearPreview = () => { setPreview(''); setReady(false); setError(''); };
  const generate = async format => {
    setPending(format); clearPreview();
    try {
      const params = { type, ...(type === 'inventory' ? { sessionId } : {}) };
      if (format === 'print') {
        setPreview(await reportApi.getPrintReport(params));
      } else {
        const blob = await reportApi.exportFile(params);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `ruo_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (failure) { setError(failure.message || 'Không xuất được báo cáo.'); }
    finally { setPending(''); }
  };
  const print = () => {
    try { frame.current.contentWindow.focus(); frame.current.contentWindow.print(); }
    catch { setError('Trình duyệt không mở được hộp thoại in. Vui lòng tải lại bản xem trước.'); }
  };
  return <Card title="Xuất báo cáo" subtitle="Báo cáo tài sản và kiểm kê có tiêu đề trường đại học">
    <fieldset className="reports-export-options" disabled={Boolean(pending)}>
      <legend>Phạm vi xuất</legend>
      <div className="dashboard-report-toolbar">
        <label>Loại dữ liệu <select value={type} onChange={event => { setType(event.target.value); clearPreview(); }}>
          <option value="equipment">Toàn bộ tài sản</option><option value="inventory">Một đợt kiểm kê</option>
        </select></label>
        {type === 'inventory' && <InventoryChoice refreshKey={refreshKey} sessionId={sessionId} onChange={value => { setSessionId(value); clearPreview(); }} />}
      </div>
    </fieldset>
    <div className="dashboard-report-toolbar">
      <Button icon={Icons.Download} disabled={disabled} loading={pending === 'csv'} onClick={() => generate('csv')}>Tải CSV (Excel)</Button>
      <Button variant="secondary" icon={Icons.FileText} disabled={disabled} loading={pending === 'print'} onClick={() => generate('print')}>Xem bản in / PDF</Button>
    </div>
    <p className="dashboard-report-note">CSV mở bằng Excel, mã hóa UTF-8. Để tạo PDF, mở bản in rồi chọn “Lưu dưới dạng PDF” trong hộp thoại in. Báo cáo tài sản lấy toàn bộ danh mục; báo cáo kiểm kê gồm kết quả đã ghi nhận và thiết bị chưa kiểm tra trong phạm vi đợt.</p>
    {error && <p role="alert">{error}</p>}
    {preview && <div className="reports-print-preview">
      <Button disabled={!ready} onClick={print}>In / Lưu PDF</Button>
      <iframe ref={frame} title="Bản xem trước báo cáo" sandbox="allow-same-origin allow-modals" srcDoc={preview} onLoad={() => setReady(true)} />
    </div>}
  </Card>;
}
