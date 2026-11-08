import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/vectors.dart';

class InventoryPage extends StatefulWidget {
  const InventoryPage({super.key, required this.api});
  final RuoApi api;

  @override
  State<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends State<InventoryPage> {
  int _revision = 0;
  String _scanMode = 'auto';
  Json? _activeSession;
  String? _scanRoomId;
  bool _aiLoading = false;
  Json? _aiAnalysis;
  String? _aiError;
  final _qr = TextEditingController();
  final _note = TextEditingController();
  String get _role => value(widget.api.user?['role'], fallback: '');
  bool get _canScan => _role == 'technician' || _role == 'facility_manager';
  bool get _canCreate => _role == 'admin' || _role == 'facility_manager';
  bool get _canReconcile => _role == 'admin' || _role == 'facility_manager';

  @override
  void dispose() {
    _qr.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _createSession() async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Tạo đợt kiểm kê'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Tên đợt kiểm kê'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isEmpty) return;
              Navigator.pop(dialogContext, controller.text.trim());
            },
            child: const Text('Tạo'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (name == null) return;
    await _run(
      () => widget.api.send('POST', '/inventory/sessions', {
        'name': name,
        'scope_type': 'building',
      }),
    );
  }

  Future<void> _scan() async {
    final sessionId = value(_activeSession?['_id'], fallback: '');
    if (sessionId.isEmpty || _qr.text.trim().isEmpty) {
      _message('Chọn đợt kiểm kê và nhập/quét mã thiết bị trước.');
      return;
    }
    final saved = await _run(
      () => widget.api.send('POST', '/inventory/sessions/$sessionId/scan', {
        'qr_code': _qr.text.trim(),
        if (_scanRoomId != null) 'scanned_room_id': _scanRoomId,
        'is_damaged': _scanMode == 'damaged',
        'is_missing': _scanMode == 'missing',
        'note': _note.text.trim(),
      }),
    );
    if (saved) {
      _qr.clear();
      _note.clear();
    }
  }

  Future<void> _reconcile() async {
    final sessionId = value(_activeSession?['_id'], fallback: '');
    if (sessionId.isEmpty) return;
    final agreed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Chốt đối soát?'),
        content: const Text(
          'Thiết bị trong phạm vi chưa được quét sẽ được ghi nhận là thiếu.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Chốt sổ'),
          ),
        ],
      ),
    );
    if (agreed != true) return;
    await _run(
      () => widget.api.send(
        'PUT',
        '/inventory/sessions/$sessionId/reconcile',
        {},
      ),
    );
  }

  Future<void> _exportReport() async {
    final sessionId = value(_activeSession?['_id'], fallback: '');
    if (sessionId.isEmpty) return;
    try {
      final response = await widget.api.get(
        '/inventory/sessions/$sessionId/export',
      );
      final report = asMap(response['report']);
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (context) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: ListView(
              shrinkWrap: true,
              children: [
                Text(
                  value(report['report_code'], fallback: 'Biên bản kiểm kê'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Text(
                  'Trạng thái: ${value(asMap(report['session'])['status'])}',
                ),
                const SizedBox(height: 12),
                for (final entry in asMap(report['summary']).entries)
                  ListTile(
                    dense: true,
                    title: Text(_inventoryLabel(entry.key)),
                    trailing: Text('${entry.value}'),
                  ),
                const SizedBox(height: 8),
                Text(
                  'SHA-256: ${value(asMap(report['digital_signature'])['hash'])}',
                ),
              ],
            ),
          ),
        ),
      );
    } catch (error) {
      if (mounted) _message(error.toString());
    }
  }

  Future<void> _lookupQr() async {
    final query = _qr.text.trim();
    if (query.isEmpty) {
      _message('Nhập mã QR hoặc mã tài sản để tra cứu.');
      return;
    }
    try {
      final response = await widget.api.get(
        '/equipments/qr/${Uri.encodeComponent(query)}',
      );
      final equipment = asMap(response['equipment']);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(
            '${value(equipment['code'])} · ${value(equipment['name'])}',
          ),
          content: Text(
            'QR: ${value(equipment['qr_code'])}\nTrạng thái: ${value(equipment['status'])}\nVị trí: ${_roomName(equipment['room_id'])}',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Đóng'),
            ),
          ],
        ),
      );
    } catch (error) {
      if (mounted) _message(error.toString());
    }
  }

  Future<bool> _run(Future<Json> Function() action) async {
    try {
      final response = await action();
      if (!mounted) return false;
      setState(() => _revision++);
      _message(
        value(response['message'], fallback: 'Đã cập nhật đợt kiểm kê.'),
      );
      return true;
    } catch (error) {
      if (mounted) _message(error.toString());
      return false;
    }
  }

  void _message(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
    children: [
      SectionTitle(
        'Kiểm kê & QR',
        eyebrow: 'INVENTORY · UC-3.10 → UC-3.11',
        subtitle: 'Quét bằng đầu đọc QR hoặc nhập mã; đối soát và xem báo cáo.',
        trailing: IconButton(
          onPressed: () => setState(() => _revision++),
          icon: const RuoVectorIcon(RuoIcon.refresh, size: 19),
        ),
      ),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          if (_canCreate)
            FilledButton.icon(
              onPressed: _createSession,
              icon: const Icon(Icons.add),
              label: const Text('Tạo đợt kiểm kê'),
            ),
          OutlinedButton.icon(
            onPressed: _lookupQr,
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Tra cứu QR'),
          ),
        ],
      ),
      const SizedBox(height: 10),
      AsyncPanel(
        key: ValueKey('inventory-sessions-$_revision'),
        load: () => widget.api.get('/inventory/sessions'),
        builder: (data) {
          final sessions = asList(data['data']).isNotEmpty
              ? asList(data['data'])
              : asList(data['sessions']);
          if (sessions.isEmpty) {
            return const EmptyNotice('Chưa có đợt kiểm kê.');
          }
          if (_activeSession == null ||
              !sessions.any((item) => item['_id'] == _activeSession?['_id'])) {
            _activeSession = sessions.first;
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButtonFormField<String>(
                key: ValueKey('session-${_activeSession?['_id']}-$_revision'),
                initialValue: value(_activeSession?['_id']),
                decoration: const InputDecoration(labelText: 'Đợt kiểm kê'),
                items: sessions
                    .map(
                      (item) => DropdownMenuItem(
                        value: value(item['_id']),
                        child: Text(
                          '${value(item['name'])} · ${statusLabel(value(item['status']))}',
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (id) {
                  setState(() {
                    _activeSession = sessions.firstWhere(
                      (item) => item['_id'] == id,
                    );
                  });
                },
              ),
              const SizedBox(height: 8),
              _sessionDetails(_activeSession!),
            ],
          );
        },
      ),
    ],
  );

  Widget _sessionDetails(Json session) {
    final sessionId = value(session['_id']);
    return AsyncPanel(
      key: ValueKey('inventory-detail-$sessionId-$_revision'),
      load: () => widget.api.get('/inventory/sessions/$sessionId'),
      builder: (response) {
        final details = asMap(response['data']);
        final rooms = asList(details['scope_ids']);
        final logs = asList(details['logs']);
        final progress = asMap(details['progress']);
        final closed = ['completed', 'reconciled'].contains(session['status']);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tiến độ ${value(progress['completion_percent'], fallback: '0')}%',
                    ),
                    Text(
                      '${value(progress['scanned_count'], fallback: '0')} đã quét · ${value(progress['unscanned_count'], fallback: '0')} chưa quét',
                    ),
                    if (_canScan && !closed) ...[
                      const SizedBox(height: 12),
                      if (rooms.isNotEmpty)
                        DropdownButtonFormField<String>(
                          initialValue: _scanRoomId ?? _roomId(rooms.first),
                          decoration: const InputDecoration(
                            labelText: 'Phòng đang kiểm kê',
                          ),
                          items: rooms
                              .map(
                                (room) => DropdownMenuItem(
                                  value: _roomId(room),
                                  child: Text(
                                    '${value(room['code'])} · ${value(room['name'])}',
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (id) => setState(() => _scanRoomId = id),
                        ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _qr,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _scan(),
                        decoration: const InputDecoration(
                          labelText: 'Mã QR / mã tài sản',
                          prefixIcon: Icon(Icons.qr_code_2),
                        ),
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _scanMode,
                        decoration: const InputDecoration(
                          labelText: 'Kết quả kiểm tra',
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'auto',
                            child: Text('Tự đối chiếu vị trí'),
                          ),
                          DropdownMenuItem(
                            value: 'damaged',
                            child: Text('Phát hiện hư hỏng'),
                          ),
                          DropdownMenuItem(
                            value: 'missing',
                            child: Text('Ghi nhận thất lạc'),
                          ),
                        ],
                        onChanged: (mode) =>
                            setState(() => _scanMode = mode ?? 'auto'),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _note,
                        decoration: const InputDecoration(
                          labelText: 'Ghi chú / tình trạng hỏng',
                        ),
                      ),
                      const SizedBox(height: 8),
                      FilledButton.icon(
                        onPressed: _scan,
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Text('Ghi nhận quét'),
                      ),
                    ],
                    if (logs.isNotEmpty) ...[
                      const Divider(height: 24),
                      for (final log in logs.take(8))
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            '${_equipmentCode(log['equipment_id'])} · ${_equipmentName(log['equipment_id'])}',
                          ),
                          subtitle: Text(_roomName(log['scanned_room_id'])),
                          trailing: StatusBadge(
                            value(log['status'], fallback: 'matched'),
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (_canReconcile && !closed)
                  FilledButton.tonalIcon(
                    onPressed: _reconcile,
                    icon: const Icon(Icons.fact_check),
                    label: const Text('Chốt đối soát'),
                  ),
                OutlinedButton.icon(
                  onPressed: _exportReport,
                  icon: const Icon(Icons.description_outlined),
                  label: const Text('Xem biên bản'),
                ),
                OutlinedButton.icon(
                  key: const Key('btn_inventory_ai_analysis'),
                  onPressed: _aiLoading
                      ? null
                      : () => _runAiInventoryAnalysis(sessionId),
                  icon: const RuoVectorIcon(RuoIcon.alert, size: 15),
                  label: Text(
                    _aiLoading
                        ? 'Đang phân tích…'
                        : '✨ AI Phân Tích Lệch Kiểm Kê',
                  ),
                ),
              ],
            ),
            if (_aiError != null)
              AiErrorNotice(_aiError!, key: const Key('ai_inventory_error')),
            if (_aiAnalysis != null) ...[
              const SizedBox(height: 12),
              _buildAiInventoryCard(_aiAnalysis!),
            ],
          ],
        );
      },
    );
  }

  Future<void> _runAiInventoryAnalysis(String sessionId) async {
    if (sessionId.isEmpty) return;
    setState(() {
      _aiLoading = true;
      _aiError = null;
    });
    try {
      final res = await widget.api.send(
        'POST',
        '/inventory/sessions/$sessionId/ai-analyze',
        {},
      );
      final analysis = asMap(res['analysis'] ?? res['data'] ?? res);
      if (!mounted) return;
      setState(() {
        _aiAnalysis = analysis.isEmpty ? null : analysis;
        _aiError = analysis.isEmpty
            ? aiFailureMessage(const ApiException(0, 'Máy chủ không trả về kết quả.'))
            : null;
      });
    } catch (error) {
      // Never show a fabricated "98.5% matched" audit when the analysis failed.
      if (!mounted) return;
      setState(() {
        _aiAnalysis = null;
        _aiError = aiFailureMessage(error);
      });
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Widget _buildAiInventoryCard(Json analysis) {
    final scheme = Theme.of(context).colorScheme;
    final risk = value(analysis['risk_level'], fallback: 'LOW').toUpperCase();
    final metrics = asMap(analysis['metrics']);
    final rate = value(
      analysis['reconciliation_rate_percent'] ??
          metrics['completion_percent'] ??
          analysis['health_score'],
      fallback: '100',
    );
    final missingVnd = money(
      analysis['missing_value_exposure_vnd'] ??
          metrics['missing_value_vnd'] ??
          0,
    );
    final summary = value(
      analysis['executive_summary'],
      fallback: 'Đã hoàn tất phân tích đối soát kiểm kê thông minh.',
    );
    final zombies = asList(analysis['zombie_disposed_assets']).isNotEmpty
        ? asList(analysis['zombie_disposed_assets'])
        : asList(analysis['zombie_assets']);
    final hotspots = asList(analysis['room_hotspots']).isNotEmpty
        ? asList(analysis['room_hotspots'])
        : asList(analysis['hotspots_by_room']);
    final transfers = asList(analysis['transfer_recommendations']).isNotEmpty
        ? asList(analysis['transfer_recommendations'])
        : asList(analysis['wrong_location_flows']);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'RUO CORTEX LOCAL AI · INVENTORY (#4A)',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                    color: scheme.primary,
                    letterSpacing: 0.6,
                  ),
                ),
                StatusBadge(risk.toLowerCase(), labelOverride: 'RỦI RO: $risk'),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              summary,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Tỷ lệ khớp: $rate% · Giá trị thiếu hụt: $missingVnd',
              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
            ),
            if (zombies.isNotEmpty) ...[
              const SizedBox(height: 8),
              for (final z in zombies)
                Text(
                  '⚠️ Cảnh báo tài sản đã thanh lý được quét lại: ${value(z['code'])} (${value(z['name'])})',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Colors.redAccent,
                  ),
                ),
            ],
            if (hotspots.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text(
                'Điểm nóng lệch kiểm kê theo phòng:',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
              ),
              for (final h in hotspots)
                Text(
                  '• Phòng ${value(h['room_code'])}: Lệch ${value(h['discrepancy_count'])} thiết bị',
                  style: const TextStyle(fontSize: 12),
                ),
            ],
            if (transfers.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text(
                'Đề xuất tạo phiếu điều chuyển hợp thức hóa:',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
              ),
              for (final tr in transfers)
                Text(
                  '• ${value(tr['equipment_code'])}: ${value(tr['from_room'])} → ${value(tr['to_room'])}',
                  style: const TextStyle(fontSize: 12),
                ),
            ],
          ],
        ),
      ),
    );
  }

  String _inventoryLabel(String key) =>
      const {
        'matched': 'Khớp vị trí',
        'wrong_location': 'Sai vị trí',
        'missing': 'Thiếu / thất lạc',
        'damaged': 'Hỏng hóc',
        'unscanned': 'Chưa quét',
        'total_logged': 'Tổng lượt ghi nhận',
      }[key] ??
      key;

  String _roomId(Json room) {
    final id = room['_id'];
    return value(id, fallback: '');
  }

  String _roomName(dynamic room) => room is Map
      ? value(room['code'], fallback: value(room['name']))
      : 'Kho dự phòng';

  String _equipmentCode(dynamic equipment) =>
      equipment is Map ? value(equipment['code']) : value(equipment);

  String _equipmentName(dynamic equipment) =>
      equipment is Map ? value(equipment['name']) : '';
}
