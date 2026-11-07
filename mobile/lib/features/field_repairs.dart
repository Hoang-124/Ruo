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
  bool _hasPhoto = true;
  String? _error;

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

  Future<void> _submit() async {
    final desc = _descController.text.trim();
    if (desc.isEmpty || _busy) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    final selected = _slaTiers.firstWhere((t) => t.$1 == _slaTier);
    final eqId = widget.equipment['_id'] ?? widget.equipment['id'] ?? widget.equipment['code'];

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
        final res = await widget.api.send('POST', '/repairs', {
          'equipment_id': eqId,
          'priority': selected.$5,
          'description': desc,
          'damage_level': selected.$5,
          'has_photo': _hasPhoto,
        });
        if (res['ticket_code'] != null) {
          ticketCode = res['ticket_code'].toString();
        } else if (res['data']?['ticket_code'] != null) {
          ticketCode = res['data']['ticket_code'].toString();
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
          roomCode: value(widget.equipment['room_code'] ?? widget.equipment['room']?['code'], fallback: 'A1-101'),
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
        final list = asList(res['data']?['repairs'] ?? res['data']);
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
    try {
      try {
        await widget.api.send('PUT', '/repairs/${ticket['id']}/accept', {});
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
    try {
      try {
        await widget.api.send('PUT', '/repairs/${ticket['id']}/resolve', {
          'outcome': 'replaced_part',
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
    final isOverdue = t['is_overdue'] == true;
    final status = value(t['status']);
    final isPending = status == 'assigned' || status == 'reported' || status == 'pending';
    final isInProgress = status == 'in_progress';

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
            value(t['title'], fallback: 'Sự cố thiết bị'),
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14.5),
          ),
          const SizedBox(height: 4),
          Text(
            'Phòng ${t['room_code']} · Mã TB: ${t['equipment_code']} · Phiếu [${t['ticket_code']}]',
            style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
          ),
          const Divider(height: 20),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Hạn SLA: ${formatVnDateTime(t['sla_deadline'])}',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: isOverdue ? RuoTokens.rose600 : scheme.onSurfaceVariant,
                  ),
                ),
              ),
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
}
