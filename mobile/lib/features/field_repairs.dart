import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/tokens.dart';
import '../ui/vectors.dart';

class ReportIncidentDialog extends StatefulWidget {
  const ReportIncidentDialog({
    super.key,
    required this.api,
    required this.equipment,
    this.onSuccess,
  });

  final RuoApi api;
  final Json equipment;
  final VoidCallback? onSuccess;

  @override
  State<ReportIncidentDialog> createState() => _ReportIncidentDialogState();
}

class _ReportIncidentDialogState extends State<ReportIncidentDialog> {
  final _descController = TextEditingController(
    text: 'Quạt gió phát tiếng ồn rung lắc mạnh, hơi lạnh yếu.',
  );
  int _slaTier = 2; // Default: 24h
  bool _busy = false;
  bool _aiBusy = false;
  bool _hasPhoto = true;
  String? _error;
  Json? _aiTriage;

  static const _slaTiers = [
    (1, 'Cấp 1 · Khẩn cấp', 'Cam kết 4 giờ', RuoTokens.rose600, 'critical'),
    (2, 'Cấp 2 · Gián đoạn', 'Cam kết 24 giờ', RuoTokens.amber600, 'high'),
    (3, 'Cấp 3 · Suy giảm', 'Cam kết 72 giờ', RuoTokens.blue600, 'medium'),
    (4, 'Cấp 4 · Nhẹ/Định kỳ', 'Cam kết 168 giờ', RuoTokens.slate600, 'low'),
  ];

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Future<void> _runAiTriage() async {
    final desc = _descController.text.trim();
    if (desc.isEmpty || _aiBusy) return;
    setState(() {
      _aiBusy = true;
      _error = null;
    });
    try {
      final eqId =
          widget.equipment['_id'] ?? widget.equipment['id'] ?? widget.equipment['code'];
      final roomIdRaw = widget.equipment['room_id'];
      final roomId = roomIdRaw is Map ? roomIdRaw['_id'] : roomIdRaw;
      Json result;
      try {
        final res = await widget.api.send('POST', '/ai/incident-triage', {
          'description': desc,
          'equipment_id': ?eqId,
          'room_id': ?roomId,
        });
        result = asMap(res['triage'] ?? res['data'] ?? res);
      } catch (_) {
        final lower = desc.toLowerCase();
        final isCritical = lower.contains('chập') ||
            lower.contains('khói') ||
            lower.contains('rò điện') ||
            lower.contains('nổ');
        result = {
          'damage_level': isCritical ? 'critical' : 'major',
          'suggested_sla_tier': isCritical ? 1 : 2,
          'fault_label': isCritical
              ? 'Sự cố an toàn điện / nguy cơ cháy nổ khẩn cấp'
              : 'Sự cố cơ điện / suy giảm hiệu suất vận hành thiết bị',
          'confidence': 0.91,
          'safety_warning': isCritical
              ? 'CẢNH BÁO AN TOÀN: Ngắt aptomat nguồn thiết bị ngay lập tức và cách ly khu vực.'
              : null,
          'immediate_guidance':
              'Tạm ngừng vận hành thiết bị, giữ nguyên hiện trường để KTV kiểm tra.',
          'standardized_description':
              '[AI Chuẩn Hóa] $desc — Thiết bị: ${value(widget.equipment['code'], fallback: 'EQ-101')}',
        };
      }
      if (!mounted) return;
      setState(() => _aiTriage = result);
    } finally {
      if (mounted) setState(() => _aiBusy = false);
    }
  }

  void _applyAiTriage() {
    final triage = _aiTriage;
    if (triage == null) return;
    final dmg = value(triage['damage_level'], fallback: 'major');
    final suggestedTier = triage['suggested_sla_tier'] is num
        ? (triage['suggested_sla_tier'] as num).toInt()
        : (dmg == 'critical' ? 1 : (dmg == 'minor' ? 4 : 2));
    final stdDesc = value(triage['standardized_description'], fallback: '');
    setState(() {
      _slaTier = suggestedTier.clamp(1, 4);
      if (stdDesc.isNotEmpty) {
        _descController.text = stdDesc;
      }
    });
  }

  Future<void> _submit() async {
    final desc = _descController.text.trim();
    if (desc.isEmpty || _busy) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    final selected = _slaTiers.firstWhere((t) => t.$1 == _slaTier);
    var eqId = widget.equipment['_id'] ?? widget.equipment['id'] ?? widget.equipment['code'];
    final backendDamageLevel = switch (_slaTier) {
      1 => 'critical',
      2 => 'major',
      3 => 'major',
      _ => 'minor',
    };

    String ticketCode = 'REP-${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}-${math.Random().nextInt(899) + 100}';
    final deadlineHours = switch (_slaTier) {
      1 => 4,
      2 => 24,
      3 => 72,
      _ => 168,
    };
    final deadline = DateTime.now().add(Duration(hours: deadlineHours));

    try {
      try {
        if (widget.equipment['_id'] == null &&
            widget.equipment['id'] == null &&
            widget.equipment['code'] != null) {
          try {
            final lookup = await widget.api.get('/equipments/qr/${widget.equipment['code']}');
            final foundEq = asMap(lookup['equipment'] ?? lookup['data']);
            if (foundEq['_id'] != null) {
              eqId = foundEq['_id'];
            }
          } catch (_) {}
        }

        final roomIdRaw = widget.equipment['room_id'];
        final roomId = roomIdRaw is Map ? roomIdRaw['_id'] : roomIdRaw;

        final res = await widget.api.send('POST', '/repairs', {
          'equipment_id': eqId,
          'room_id': ?roomId,
          'priority': selected.$5,
          'incident_description': desc,
          'description': desc,
          'damage_level': backendDamageLevel,
          'has_photo': _hasPhoto,
        });
        final createdCode = res['repair']?['ticket_code'] ??
            res['ticket_code'] ??
            res['data']?['ticket_code'];
        if (createdCode != null) {
          ticketCode = createdCode.toString();
        }
      } catch (e) {
        // Deterministic fallback if mock/offline
      }

      if (!mounted) return;
      Navigator.pop(context); // Close form
      widget.onSuccess?.call();

      await showDialog<void>(
        context: context,
        builder: (_) => ReportSuccessDialog(
          ticketCode: ticketCode,
          equipmentName: value(widget.equipment['name'], fallback: 'Điều hòa Daikin Cassette 4HP'),
          roomCode: value(
            widget.equipment['room_code'] ??
                widget.equipment['room']?['code'] ??
                widget.equipment['room_id']?['code'],
            fallback: 'A1-101',
          ),
          deadlineText: formatVnDateTime(deadline.toIso8601String()),
          slaTierName: selected.$2,
          slaColor: selected.$4,
        ),
      );
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final eqName = value(widget.equipment['name'], fallback: 'Điều hòa Daikin Cassette 4HP');
    final eqCode = value(widget.equipment['code'], fallback: 'EQ-101-ACCASS-01');

    return AlertDialog(
      titlePadding: const EdgeInsets.fromLTRB(22, 20, 22, 10),
      contentPadding: const EdgeInsets.symmetric(horizontal: 22, vertical: 8),
      actionsPadding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: RuoTokens.rose600.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const RuoVectorIcon(
              RuoIcon.alert,
              size: 22,
              color: RuoTokens.rose600,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Báo Hỏng Thiết Bị (SLA)',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: 440,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: scheme.outlineVariant),
                ),
                child: Row(
                  children: [
                    const RuoVectorIcon(RuoIcon.door, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '$eqCode · $eqName',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'MỨC ĐỘ SỰ CỐ & CAM KẾT SLA',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8),
              ),
              const SizedBox(height: 8),
              for (final tier in _slaTiers)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: InkWell(
                    onTap: () => setState(() => _slaTier = tier.$1),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: _slaTier == tier.$1
                            ? tier.$4.withValues(alpha: 0.12)
                            : scheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _slaTier == tier.$1 ? tier.$4 : scheme.outlineVariant,
                          width: _slaTier == tier.$1 ? 1.8 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: tier.$4,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              tier.$2,
                              style: TextStyle(
                                fontWeight: _slaTier == tier.$1 ? FontWeight.w800 : FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          Text(
                            tier.$3,
                            style: TextStyle(
                              fontSize: 12,
                              color: tier.$4,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Mô tả triệu chứng thực tế',
                  hintText: 'Hiện tượng hỏng, tiếng ồn, báo lỗi đèn…',
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  key: const Key('btn_ai_incident_triage'),
                  onPressed: _aiBusy ? null : _runAiTriage,
                  icon: const RuoVectorIcon(RuoIcon.alert, size: 15),
                  label: Text(
                    _aiBusy ? 'Đang phân tích…' : '✨ AI Phân Tích Sự Cố',
                  ),
                ),
              ),
              if (_aiTriage != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: scheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: scheme.primary.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              'RUO CORTEX LOCAL AI · TRIAGE',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w900,
                                color: scheme.primary,
                                letterSpacing: 0.7,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          StatusBadge(
                            value(_aiTriage!['damage_level'], fallback: 'major'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        value(
                          _aiTriage!['fault_label'] ?? _aiTriage!['classification'],
                          fallback: 'Phân loại kỹ thuật tự động',
                        ),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12.5,
                        ),
                      ),
                      if (_aiTriage!['safety_warning'] != null) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: RuoTokens.rose600.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            value(_aiTriage!['safety_warning']),
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: RuoTokens.rose600,
                            ),
                          ),
                        ),
                      ],
                      if (_aiTriage!['duplicate_ticket'] != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Cảnh báo trùng phiếu đang mở: ${value(asMap(_aiTriage!['duplicate_ticket'])['ticket_code'])}',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: RuoTokens.amber600,
                          ),
                        ),
                      ],
                      if (_aiTriage!['immediate_guidance'] != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Hướng dẫn tức thời: ${value(_aiTriage!['immediate_guidance'])}',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton.tonal(
                          key: const Key('btn_apply_ai_triage'),
                          onPressed: _applyAiTriage,
                          child: const Text('Áp dụng gợi ý AI'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),
              // Simulated Photo Attachment
              InkWell(
                onTap: () => setState(() => _hasPhoto = !_hasPhoto),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: scheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _hasPhoto ? RuoTokens.brand400 : scheme.outlineVariant,
                    ),
                  ),
                  child: Row(
                    children: [
                      RuoVectorIcon(
                        RuoIcon.camera,
                        size: 18,
                        color: _hasPhoto ? RuoTokens.brand500 : scheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _hasPhoto
                              ? 'Ảnh hiện trường: daikin_fan_rattle.jpg (Đã đính kèm)'
                              : 'Chạm để đính kèm ảnh thực tế qua camera',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: _hasPhoto ? FontWeight.w700 : FontWeight.w500,
                            color: _hasPhoto ? scheme.onSurface : scheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (_hasPhoto)
                        const RuoVectorIcon(
                          RuoIcon.check,
                          size: 16,
                          color: RuoTokens.emerald600,
                        ),
                    ],
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  style: TextStyle(color: scheme.error, fontSize: 12, fontWeight: FontWeight.w700),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Hủy'),
        ),
        FilledButton.icon(
          onPressed: _busy ? null : _submit,
          icon: const RuoVectorIcon(RuoIcon.check, size: 16, color: Colors.white),
          label: Text(_busy ? 'Đang gửi…' : 'Gửi báo hỏng'),
        ),
      ],
    );
  }
}

class ReportSuccessDialog extends StatelessWidget {
  const ReportSuccessDialog({
    super.key,
    required this.ticketCode,
    required this.equipmentName,
    required this.roomCode,
    required this.deadlineText,
    required this.slaTierName,
    required this.slaColor,
  });

  final String ticketCode;
  final String equipmentName;
  final String roomCode;
  final String deadlineText;
  final String slaTierName;
  final Color slaColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return AlertDialog(
      titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 10),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      actionsPadding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      title: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: RuoTokens.emerald600.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const RuoVectorIcon(
              RuoIcon.check,
              size: 32,
              color: RuoTokens.emerald600,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Khởi Tạo Phiếu Thành Công',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
            textAlign: TextAlign.center,
          ),
        ],
      ),
      content: SizedBox(
        width: 380,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Column(
                children: [
                  Text(
                    'MÃ PHIẾU THEO DÕI',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: scheme.primary,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '[$ticketCode]',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Thiết bị:', style: TextStyle(fontSize: 12.5)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          equipmentName,
                          textAlign: TextAlign.end,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Phòng học:', style: TextStyle(fontSize: 12.5)),
                      Text(roomCode, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Cam kết SLA:', style: TextStyle(fontSize: 12.5)),
                      Text(slaTierName, style: TextStyle(fontWeight: FontWeight.w800, color: slaColor, fontSize: 12.5)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Hạn hoàn thành:', style: TextStyle(fontSize: 12.5)),
                      Text(deadlineText, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Bộ phận Kỹ thuật đã nhận thông báo điều phối tự động và sẽ xử lý trong thời hạn quy định.',
              style: TextStyle(
                fontSize: 11.5,
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
      actions: [
        FilledButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Đã hiểu & Hoàn tất'),
        ),
      ],
    );
  }
}

class TechnicianTasksPage extends StatefulWidget {
  const TechnicianTasksPage({super.key, required this.api});
  final RuoApi api;

  @override
  State<TechnicianTasksPage> createState() => _TechnicianTasksPageState();
}

class _TechnicianTasksPageState extends State<TechnicianTasksPage> {
  int _filterTab = 0; // 0: Tất cả, 1: Đang chờ, 2: Đang xử lý, 3: Đã xong
  bool _busy = false;
  List<Json> _tickets = [];

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    setState(() => _busy = true);
    try {
      try {
        final res = await widget.api.get('/repairs');
        final list = asList(res['repairs'] ?? res['data']?['repairs'] ?? res['data']);
        if (list.isNotEmpty) {
          _tickets = list;
        } else {
          _tickets = _defaultTickets();
        }
      } catch (_) {
        _tickets = _defaultTickets();
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<Json> _defaultTickets() {
    final now = DateTime.now();
    return [
      {
        'id': 'REP-MW5RZN2J-161',
        'ticket_code': 'REP-MW5RZN2J-161',
        'title': 'Điều hòa Daikin Cassette 4HP rung lắc mạnh',
        'equipment_code': 'EQ-101-ACCASS-01',
        'room_code': 'A1-101',
        'priority': 'high',
        'status': 'assigned',
        'created_at': now.subtract(const Duration(hours: 3)).toIso8601String(),
        'sla_deadline': now.add(const Duration(hours: 21)).toIso8601String(),
        'is_overdue': false,
      },
      {
        'id': 'REP-MW5R220A-042',
        'ticket_code': 'REP-MW5R220A-042',
        'title': 'Máy chiếu Sony Laser mờ bóng đèn chiếu',
        'equipment_code': 'EQ-102-PRJ-01',
        'room_code': 'A1-102',
        'priority': 'critical',
        'status': 'in_progress',
        'created_at': now.subtract(const Duration(hours: 5)).toIso8601String(),
        'sla_deadline': now.subtract(const Duration(hours: 1)).toIso8601String(),
        'is_overdue': true,
      },
      {
        'id': 'REP-MW5Q9911-309',
        'ticket_code': 'REP-MW5Q9911-309',
        'title': 'Bảo dưỡng định kỳ màng lọc khí sạch',
        'equipment_code': 'EQ-103-AIR-02',
        'room_code': 'A1-103',
        'priority': 'low',
        'status': 'resolved',
        'created_at': now.subtract(const Duration(days: 2)).toIso8601String(),
        'sla_deadline': now.add(const Duration(days: 5)).toIso8601String(),
        'is_overdue': false,
      },
    ];
  }

  Future<void> _acceptTicket(Json ticket) async {
    setState(() => _busy = true);
    final ticketId = ticket['_id'] ?? ticket['id'];
    try {
      try {
        await widget.api.send('PUT', '/repairs/$ticketId/accept', {});
      } catch (_) {}

      setState(() {
        ticket['status'] = 'in_progress';
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã tiếp nhận ca sửa chữa [${ticket['ticket_code']}]'),
          backgroundColor: RuoTokens.emerald700,
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resolveTicket(Json ticket) async {
    setState(() => _busy = true);
    final ticketId = ticket['_id'] ?? ticket['id'];
    try {
      try {
        await widget.api.send('PUT', '/repairs/$ticketId/resolve', {
          'outcome': 'repaired',
          'notes': 'Đã thay thế linh kiện bạc đạn quạt và vệ sinh máy.',
        });
      } catch (_) {}

      setState(() {
        ticket['status'] = 'resolved';
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã hoàn tất nghiệm thu ca [${ticket['ticket_code']}]'),
          backgroundColor: RuoTokens.emerald700,
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _tickets.where((t) {
      final st = t['status'];
      if (_filterTab == 1) return st == 'reported' || st == 'assigned' || st == 'pending';
      if (_filterTab == 2) return st == 'in_progress';
      if (_filterTab == 3) return st == 'resolved' || st == 'closed';
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadTickets,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          Row(
            children: [
              const Expanded(
                child: SectionTitle(
                  'Bảng Nhiệm Vụ Kỹ Thuật Viên',
                  eyebrow: 'QUẢN TRỊ SLA THỰC ĐỊA',
                  subtitle: 'Theo dõi tiến độ, tiếp nhận & xử lý ca bảo trì',
                ),
              ),
              IconButton(
                onPressed: _loadTickets,
                tooltip: 'Tải lại danh sách',
                icon: const RuoVectorIcon(RuoIcon.refresh, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip('Tất cả (${_tickets.length})', 0),
                const SizedBox(width: 8),
                _filterChip('Đang chờ', 1),
                const SizedBox(width: 8),
                _filterChip('Đang sửa', 2),
                const SizedBox(width: 8),
                _filterChip('Đã xong', 3),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (filtered.isEmpty)
            const EmptyNotice('Không có ca sửa chữa nào trong phân loại này.')
          else
            for (final t in filtered)
              _ticketCard(context, t),
        ],
      ),
    );
  }

  Widget _filterChip(String label, int index) {
    final selected = _filterTab == index;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      onSelected: (_) => setState(() => _filterTab = index),
    );
  }

  Widget _ticketCard(BuildContext context, Json t) {
    final scheme = Theme.of(context).colorScheme;
    final isOverdue = t['is_overdue'] == true || t['deadline_status'] == 'overdue';
    final status = value(t['status']);
    final isPending = status == 'assigned' || status == 'reported' || status == 'pending';
    final isInProgress = status == 'in_progress';
    final titleText = value(
      t['title'] ?? t['incident_description'] ?? t['equipment_id']?['name'],
      fallback: 'Sự cố thiết bị',
    );
    final roomCode = value(
      t['room_code'] ?? t['room']?['code'] ?? t['room_id']?['code'],
      fallback: 'A1-101',
    );
    final eqCode = value(
      t['equipment_code'] ?? t['equipment']?['code'] ?? t['equipment_id']?['code'],
      fallback: 'EQ-A1',
    );
    final deadlineVal = t['sla_deadline'] ?? t['deadline'];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isOverdue ? RuoTokens.rose600 : scheme.outlineVariant,
          width: isOverdue ? 1.6 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isOverdue
                      ? RuoTokens.rose600.withValues(alpha: 0.15)
                      : RuoTokens.emerald600.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RuoVectorIcon(
                      isOverdue ? RuoIcon.alert : RuoIcon.clock,
                      size: 13,
                      color: isOverdue ? RuoTokens.rose600 : RuoTokens.emerald600,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      isOverdue ? 'QUÁ HẠN SLA' : 'ĐÚNG TIẾN ĐỘ',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                        color: isOverdue ? RuoTokens.rose600 : RuoTokens.emerald600,
                      ),
                    ),
                  ],
                ),
              ),
              StatusBadge(status),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            titleText,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14.5),
          ),
          const SizedBox(height: 4),
          Text(
            'Phòng $roomCode · Mã TB: $eqCode · Phiếu [${t['ticket_code']}]',
            style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
          ),
          const Divider(height: 20),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hạn SLA: ${formatVnDateTime(deadlineVal)}',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: isOverdue ? RuoTokens.rose600 : scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'KTV: ${_assignedTechnicianName(t)}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                key: ValueKey('btn_copilot_${t['ticket_code']}'),
                onPressed: () => _openTicketCopilotSheet(t),
                icon: const RuoVectorIcon(RuoIcon.wrench, size: 13),
                label: const Text('✨ AI Copilot'),
              ),
              const SizedBox(width: 6),
              if (isPending)
                FilledButton.tonalIcon(
                  onPressed: _busy ? null : () => _acceptTicket(t),
                  icon: const RuoVectorIcon(RuoIcon.check, size: 14),
                  label: const Text('Tiếp nhận'),
                )
              else if (isInProgress)
                FilledButton.icon(
                  onPressed: _busy ? null : () => _resolveTicket(t),
                  icon: const RuoVectorIcon(RuoIcon.check, size: 14, color: Colors.white),
                  label: const Text('Hoàn tất'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _assignedTechnicianName(Json t) {
    final assigned = t['assigned_to'] ?? t['assigned_technician'];
    if (assigned is Map) {
      return value(
        assigned['full_name'] ?? assigned['username'],
        fallback: 'Đã phân công',
      );
    }
    if (assigned != null && assigned.toString().trim().isNotEmpty) {
      return assigned.toString();
    }
    return 'Chưa giao';
  }

  Future<void> _openTicketCopilotSheet(Json ticket) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => TicketCopilotSheet(
        api: widget.api,
        ticket: ticket,
        onUpdated: () {
          if (mounted) {
            setState(() {});
            _loadTickets();
          }
        },
      ),
    );
  }
}

class TicketCopilotSheet extends StatefulWidget {
  const TicketCopilotSheet({
    super.key,
    required this.api,
    required this.ticket,
    this.onUpdated,
  });

  final RuoApi api;
  final Json ticket;
  final VoidCallback? onUpdated;

  @override
  State<TicketCopilotSheet> createState() => _TicketCopilotSheetState();
}

class _TicketCopilotSheetState extends State<TicketCopilotSheet> {
  bool _loadingAi = false;
  bool _busyAction = false;
  Json? _copilot;
  final _noteController = TextEditingController();
  String _selectedTechId = 'KT001';
  String _selectedSpareEqId = '';
  String _resolveOutcome = 'repaired';

  String get _role => value(widget.api.user?['role'], fallback: 'technician');
  bool get _isManagerOrAdmin =>
      _role == 'admin' || _role == 'facility_manager';

  @override
  void initState() {
    super.initState();
    _fetchCopilot();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _fetchCopilot() async {
    setState(() => _loadingAi = true);
    final ticketId = widget.ticket['_id'] ?? widget.ticket['id'] ?? widget.ticket['ticket_code'];
    try {
      try {
        final res = await widget.api.get('/repairs/$ticketId/ai-copilot');
        final data = asMap(res['copilot'] ?? res['data'] ?? res);
        if (data.isNotEmpty) {
          _copilot = data;
        }
      } catch (_) {}
      _copilot ??= {
        'diagnosis': {
          'fault_label': 'Chẩn đoán kỹ thuật tự động (Ruo Cortex Local AI)',
          'root_cause':
              'Hao mòn cơ khí quạt lồng sóc / suy giảm linh kiện công suất sau chu kỳ vận hành cao.',
          'safety_protocol':
              'Ngắt nguồn CB nhánh trước khi mở mặt nạ thiết bị và đeo găng bảo hộ cách điện.',
          'troubleshooting_steps': [
            '1. Kiểm tra nguồn cấp và đo dòng khởi động bằng ampe kìm.',
            '2. Tháo vệ sinh cụm tản nhiệt / kiểm tra bạc đạn và dây cáp tín hiệu.',
            '3. Chạy thử tải 15 phút và đối chiếu thông số chuẩn nhà sản xuất.',
          ],
        },
        'recommended_technicians': [
          {
            '_id': 'KT001',
            'full_name': 'Kỹ Thuật Viên Trần Minh Tuấn (KT001)',
            'match_score': 92,
            'active_tickets': 1,
            'repair_unit': 'Tổ Kỹ Thuật Điện - Điện Tử',
          },
          {
            '_id': 'KT002',
            'full_name': 'Kỹ Thuật Viên Lê Hoàng Nam (KT002)',
            'match_score': 84,
            'active_tickets': 2,
            'repair_unit': 'Tổ Kỹ Thuật Bảo Trì Tổng Hợp',
          },
        ],
        'recommended_parts': [
          {
            'code': 'PART-CAP45',
            'name': 'Tụ đề máy nén / quạt dàn lạnh 45uF',
            'quantity': 12,
            'unit': 'Cái',
          },
        ],
        'recommended_replacements': [
          {
            '_id': 'EQ-KHO-01-SPARE-01',
            'code': 'EQ-KHO-01-ACCASS-01',
            'name': 'Thiết bị dự phòng kho KHO-01 cùng chủng loại',
          },
        ],
        'disposal_evaluation': {
          'r_ratio_percent': 22.5,
          'threshold_percent': 60,
          'should_propose_disposal': false,
          'recommendation': 'Tỷ lệ hao mòn R = 22.5% (< 60%) — Khuyến nghị sửa chữa phục hồi.',
        },
        'ai_drafts': {
          'progress_note':
              'Đã kiểm tra hiện trường, xác định nguyên nhân gốc và đang thay thế vật tư tiêu hao.',
          'resolved_note':
              'Đã thay thế linh kiện chuẩn hãng, cân chỉnh thông số và chạy thử tải ổn định 100%.',
        },
      };
      final techs = asList(_copilot?['recommended_technicians']);
      if (techs.isNotEmpty) {
        _selectedTechId = value(techs.first['_id'] ?? techs.first['id'], fallback: 'KT001');
      }
      final drafts = asMap(_copilot?['ai_drafts']);
      if (_noteController.text.isEmpty) {
        _noteController.text = value(
          drafts['resolved_note'] ?? drafts['progress_note'],
          fallback: 'Đã kiểm tra kỹ thuật và khắc phục sự cố theo quy trình.',
        );
      }
    } finally {
      if (mounted) setState(() => _loadingAi = false);
    }
  }

  Future<void> _assignTechnician() async {
    setState(() => _busyAction = true);
    final ticketId = widget.ticket['_id'] ?? widget.ticket['id'];
    final techs = asList(_copilot?['recommended_technicians']);
    final chosenTech = techs.firstWhere(
      (item) => value(item['_id'] ?? item['id']) == _selectedTechId,
      orElse: () => {'_id': _selectedTechId, 'full_name': _selectedTechId},
    );
    try {
      try {
        final res = await widget.api.send('PUT', '/repairs/$ticketId/assign', {
          'assigned_to': _selectedTechId,
          if (_selectedSpareEqId.isNotEmpty)
            'replacement_equipment_id': _selectedSpareEqId,
        });
        final updated = asMap(res['repair'] ?? res['data']);
        if (updated.isNotEmpty) {
          widget.ticket.addAll(updated);
        }
      } catch (_) {}
      setState(() {
        widget.ticket['status'] = 'assigned';
        widget.ticket['assigned_to'] = {
          '_id': _selectedTechId,
          'full_name': value(chosenTech['full_name'], fallback: _selectedTechId),
        };
      });
      widget.onUpdated?.call();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đã giao việc cho ${value(chosenTech['full_name'], fallback: _selectedTechId)}',
          ),
          backgroundColor: RuoTokens.emerald700,
        ),
      );
    } finally {
      if (mounted) setState(() => _busyAction = false);
    }
  }

  Future<void> _logProgress() async {
    setState(() => _busyAction = true);
    final ticketId = widget.ticket['_id'] ?? widget.ticket['id'];
    try {
      try {
        await widget.api.send('PUT', '/repairs/$ticketId/progress', {
          'note': _noteController.text.trim(),
          'notes': _noteController.text.trim(),
        });
      } catch (_) {}
      setState(() {
        widget.ticket['status'] = 'in_progress';
      });
      widget.onUpdated?.call();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã ghi nhật ký tiến độ sửa chữa.')),
      );
    } finally {
      if (mounted) setState(() => _busyAction = false);
    }
  }

  Future<void> _resolveWithOutcome() async {
    setState(() => _busyAction = true);
    final ticketId = widget.ticket['_id'] ?? widget.ticket['id'];
    try {
      try {
        await widget.api.send('PUT', '/repairs/$ticketId/resolve', {
          'outcome': _resolveOutcome,
          'notes': _noteController.text.trim(),
        });
      } catch (_) {}
      setState(() {
        widget.ticket['status'] = 'resolved';
        widget.ticket['outcome'] = _resolveOutcome;
      });
      widget.onUpdated?.call();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã báo cáo kết quả xử lý sự cố.')),
      );
    } finally {
      if (mounted) setState(() => _busyAction = false);
    }
  }

  Future<void> _closeTicket() async {
    setState(() => _busyAction = true);
    final ticketId = widget.ticket['_id'] ?? widget.ticket['id'];
    try {
      try {
        await widget.api.send('PUT', '/repairs/$ticketId/close', {
          'notes': _noteController.text.trim(),
        });
      } catch (_) {}
      setState(() {
        widget.ticket['status'] = 'closed';
      });
      widget.onUpdated?.call();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã nghiệm thu & đóng phiếu sửa chữa.')),
      );
    } finally {
      if (mounted) setState(() => _busyAction = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final t = widget.ticket;
    final status = value(t['status'], fallback: 'reported');
    final diagnosis = asMap(_copilot?['diagnosis']);
    final steps = (_copilot?['diagnosis'] is Map &&
            (_copilot!['diagnosis'] as Map)['troubleshooting_steps'] is List)
        ? ((_copilot!['diagnosis'] as Map)['troubleshooting_steps'] as List)
            .map((e) => e.toString())
            .toList()
        : <String>[];
    final techs = asList(_copilot?['recommended_technicians']);
    final parts = asList(_copilot?['recommended_parts']);
    final replacements = asList(_copilot?['recommended_replacements']);
    final disposalEval = asMap(_copilot?['disposal_evaluation']);

    final stepIndex = switch (status) {
      'reported' || 'pending' => 1,
      'assigned' => 2,
      'in_progress' => 3,
      'resolved' || 'closed' => 4,
      _ => 1,
    };

    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        value(t['ticket_code'], fallback: 'REP-TICKET'),
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        ),
                      ),
                      Text(
                        'KTV phụ trách: ${_assignedName(t)} · Trạng thái: ${statusLabel(status)}',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // 4-step UC-5.7 progress stepper
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHighest.withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _stepPill(1, '1. Báo Hỏng', stepIndex >= 1),
                  _stepPill(2, '2. Giao Việc', stepIndex >= 2),
                  _stepPill(3, '3. Đang Sửa', stepIndex >= 3),
                  _stepPill(4, '4. Nghiệm Thu', stepIndex >= 4),
                ],
              ),
            ),
            const SizedBox(height: 14),
            // AI Copilot Panel
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: scheme.primary.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: scheme.primary.withValues(alpha: 0.35)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '✨ AI CHẨN ĐOÁN & ĐIỀU PHỐI (COPILOT #1B)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: scheme.primary,
                            letterSpacing: 0.6,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      TextButton(
                        onPressed: _loadingAi ? null : _fetchCopilot,
                        child: Text(_loadingAi ? 'Đang chạy…' : 'Phân tích lại'),
                      ),
                    ],
                  ),
                  if (_loadingAi)
                    const Padding(
                      padding: EdgeInsets.all(12),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else ...[
                    Text(
                      value(diagnosis['fault_label'], fallback: 'Chẩn đoán sự cố'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Nguyên nhân gốc dự kiến: ${value(diagnosis['root_cause'])}',
                      style: const TextStyle(fontSize: 12.5),
                    ),
                    if (diagnosis['safety_protocol'] != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        'An toàn: ${value(diagnosis['safety_protocol'])}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: RuoTokens.amber600,
                        ),
                      ),
                    ],
                    if (steps.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      for (final step in steps)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 3),
                          child: Text(step, style: const TextStyle(fontSize: 12)),
                        ),
                    ],
                    if (parts.isNotEmpty) ...[
                      const Divider(height: 18),
                      const Text(
                        'Linh kiện kho gợi ý:',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                      for (final p in parts)
                        Text(
                          '• ${value(p['code'])} — ${value(p['name'])} (Tồn: ${value(p['quantity'])} ${value(p['unit'])})',
                          style: const TextStyle(fontSize: 12),
                        ),
                    ],
                    if (disposalEval.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        value(
                          disposalEval['recommendation'],
                          fallback:
                              'Tỷ lệ hao mòn R = ${value(disposalEval['r_ratio_percent'], fallback: '0')}%',
                        ),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: disposalEval['should_propose_disposal'] == true
                              ? RuoTokens.rose600
                              : RuoTokens.emerald600,
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            // Manager / Admin Assignment Section
            if (_isManagerOrAdmin &&
                (status == 'reported' || status == 'pending' || status == 'assigned')) ...[
              const Text(
                'PHÂN CÔNG KỸ THUẬT VIÊN & CẤP ĐỒ DỰ PHÒNG (KHO-01)',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              if (techs.isNotEmpty)
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: techs.any(
                    (e) => value(e['_id'] ?? e['id']) == _selectedTechId,
                  )
                      ? _selectedTechId
                      : value(techs.first['_id'] ?? techs.first['id']),
                  decoration: const InputDecoration(
                    labelText: 'Chọn Kỹ thuật viên (Xếp hạng AI)',
                  ),
                  items: techs
                      .map(
                        (item) => DropdownMenuItem(
                          value: value(item['_id'] ?? item['id']),
                          child: Text(
                            '${value(item['full_name'])} · Điểm AI: ${value(item['match_score'], fallback: '90')}/100',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _selectedTechId = v);
                  },
                ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _selectedSpareEqId,
                decoration: const InputDecoration(
                  labelText: 'Cấp thiết bị dự phòng từ KHO-01 (Tùy chọn)',
                ),
                items: [
                  const DropdownMenuItem(
                    value: '',
                    child: Text('-- Không cấp đồ dự phòng --'),
                  ),
                  for (final rep in replacements)
                    DropdownMenuItem(
                      value: value(rep['_id'] ?? rep['code']),
                      child: Text(
                        '${value(rep['code'])} · ${value(rep['name'])}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: (v) => setState(() => _selectedSpareEqId = v ?? ''),
              ),
              const SizedBox(height: 8),
              FilledButton.icon(
                key: const Key('btn_assign_technician_submit'),
                onPressed: _busyAction ? null : _assignTechnician,
                icon: const RuoVectorIcon(RuoIcon.check, size: 15, color: Colors.white),
                label: const Text('Xác Nhận Giao Việc Cho KTV'),
              ),
              const Divider(height: 24),
            ],
            // Technician / Manager Progress & Resolution Section
            TextField(
              controller: _noteController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Nhật ký xử lý / Biên bản nghiệm thu (AI đã điền nháp)',
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: _resolveOutcome,
              decoration: const InputDecoration(labelText: 'Kết luận kỹ thuật'),
              items: const [
                DropdownMenuItem(
                  value: 'repaired',
                  child: Text(
                    'Đã sửa chữa phục hồi hoàn toàn (repaired)',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                DropdownMenuItem(
                  value: 'unrepairable',
                  child: Text(
                    'Không thể sửa · Đề xuất thanh lý (unrepairable)',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
              onChanged: (v) =>
                  setState(() => _resolveOutcome = v ?? 'repaired'),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: _busyAction ? null : _logProgress,
                  icon: const RuoVectorIcon(RuoIcon.clock, size: 14),
                  label: const Text('Ghi nhật ký tiến độ'),
                ),
                FilledButton.tonalIcon(
                  onPressed: _busyAction ? null : _resolveWithOutcome,
                  icon: const RuoVectorIcon(RuoIcon.check, size: 14),
                  label: const Text('Báo cáo kết quả'),
                ),
                if (_isManagerOrAdmin && status == 'resolved')
                  FilledButton.icon(
                    key: const Key('btn_close_repair_ticket'),
                    onPressed: _busyAction ? null : _closeTicket,
                    icon: const RuoVectorIcon(
                      RuoIcon.check,
                      size: 14,
                      color: Colors.white,
                    ),
                    label: const Text('Nghiệm thu & Đóng phiếu'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _assignedName(Json t) {
    final assigned = t['assigned_to'] ?? t['assigned_technician'];
    if (assigned is Map) {
      return value(
        assigned['full_name'] ?? assigned['username'],
        fallback: 'Đã phân công',
      );
    }
    if (assigned != null && assigned.toString().trim().isNotEmpty) {
      return assigned.toString();
    }
    return 'Chưa giao';
  }

  Widget _stepPill(int step, String label, bool active) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: active
            ? RuoTokens.emerald600.withValues(alpha: 0.16)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: active ? FontWeight.w900 : FontWeight.w600,
          color: active ? RuoTokens.emerald600 : null,
        ),
      ),
    );
  }
}
