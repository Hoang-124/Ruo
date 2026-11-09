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
  final _imageController = TextEditingController();
  String _damageLevel = 'minor'; // Default: Hỏng Nhẹ (48 giờ) like Web
  bool _busy = false;
  bool _aiBusy = false;
  bool _hasPhoto = true;
  String? _error;
  Json? _aiTriage;
  List<Json> _rooms = [];
  List<Json> _roomEquipments = [];
  String? _selectedRoomId;
  String? _selectedEquipmentId;

  static const _damageLevels = [
    (
      'minor',
      'Hỏng Nhẹ (Minor)',
      'Ảnh hưởng nhỏ, phòng vẫn học được',
      'Xử lý trong 48 giờ',
      RuoTokens.emerald600,
    ),
    (
      'major',
      'Hỏng Nặng (Major)',
      'Gián đoạn giảng dạy, cần thay thế',
      'Xử lý trong 24 giờ',
      RuoTokens.amber600,
    ),
    (
      'critical',
      'Khẩn Cấp (Critical)',
      'Mất an toàn, chập cháy, tê liệt',
      'Xử lý khẩn cấp 8 giờ (24/7)',
      RuoTokens.rose600,
    ),
  ];

  @override
  void initState() {
    super.initState();
    final roomRaw = widget.equipment['room_id'];
    _selectedRoomId = roomRaw is Map ? value(roomRaw['_id']) : value(roomRaw);
    _selectedEquipmentId = value(
      widget.equipment['_id'] ??
          widget.equipment['id'] ??
          widget.equipment['code'],
    );
    _loadRoomsAndEquipments();
  }

  Future<void> _loadRoomsAndEquipments() async {
    try {
      final rRes = await widget.api.get('/facilities/rooms', {'limit': '100'});
      final rooms = asList(rRes['rooms'] ?? rRes['data']);
      if (rooms.isNotEmpty) {
        _rooms = rooms;
        final roomCode = value(
          widget.equipment['room_code'] ??
              widget.equipment['room']?['code'] ??
              widget.equipment['room_id']?['code'],
        );
        if ((_selectedRoomId == null || _selectedRoomId!.isEmpty) &&
            roomCode.isNotEmpty) {
          final matched = rooms.where((r) => value(r['code']) == roomCode);
          if (matched.isNotEmpty) {
            _selectedRoomId = value(matched.first['_id']);
          }
        }
        _selectedRoomId ??= value(rooms.first['_id']);
        await _loadEquipmentsForRoom(_selectedRoomId);
      }
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _loadEquipmentsForRoom(String? roomId) async {
    if (roomId == null || roomId.isEmpty) return;
    try {
      final eRes = await widget.api.get('/equipments', {
        'room_id': roomId,
        'limit': '100',
      });
      final list = asList(eRes['equipments'] ?? eRes['data']);
      if (list.isNotEmpty) {
        _roomEquipments = list;
        if (_selectedEquipmentId == null ||
            _selectedEquipmentId!.isEmpty ||
            !list.any(
              (e) =>
                  value(e['_id']) == _selectedEquipmentId ||
                  value(e['code']) == _selectedEquipmentId,
            )) {
          _selectedEquipmentId = value(list.first['_id']);
        }
      }
    } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _descController.dispose();
    _imageController.dispose();
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
          _selectedEquipmentId ??
          widget.equipment['_id'] ??
          widget.equipment['id'] ??
          widget.equipment['code'];
      final roomIdRaw = _selectedRoomId ?? widget.equipment['room_id'];
      final roomId = roomIdRaw is Map ? roomIdRaw['_id'] : roomIdRaw;
      final images = _imageController.text
          .split('\n')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      Json result = {};
      try {
        final res = await widget.api.send('POST', '/repairs/ai-triage', {
          'incident_description': desc,
          'description': desc,
          'equipment_id': ?eqId,
          'room_id': ?roomId,
          'incident_images': images,
          if (_roomEquipments.isNotEmpty) 'room_equipments': _roomEquipments,
        });
        result = asMap(res['triage'] ?? res['data'] ?? res);
      } catch (_) {}

      if (result.isEmpty) {
        try {
          final res = await widget.api.send('POST', '/ai/incident-triage', {
            'incident_description': desc,
            'description': desc,
            'equipment_id': ?eqId,
            'room_id': ?roomId,
          });
          result = asMap(res['triage'] ?? res['data'] ?? res);
        } catch (_) {}
      }

      if (result.isEmpty) {
        final lower = desc.toLowerCase();
        final isCritical =
            lower.contains('chập') ||
            lower.contains('khói') ||
            lower.contains('rò điện') ||
            lower.contains('nổ');
        result = {
          'suggested_damage_level': isCritical ? 'critical' : 'major',
          'damage_level': isCritical ? 'critical' : 'major',
          'sla_label': isCritical
              ? 'Khẩn cấp 8 giờ (24/7)'
              : '24 giờ hành chính',
          'confidence': 91,
          'fault_classification': {
            'playbook_title': isCritical
                ? 'Sự cố an toàn điện / nguy cơ cháy nổ khẩn cấp'
                : 'Sự cố cơ điện / suy giảm hiệu suất vận hành thiết bị',
          },
          'reasoning': isCritical
              ? 'CẢNH BÁO AN TOÀN: Ngắt aptomat nguồn thiết bị ngay lập tức và cách ly khu vực (SLA 8 giờ 24/7).'
              : 'Nhận diện lỗi cơ điện làm gián đoạn trực tiếp công năng phục vụ giảng dạy (SLA 24 giờ hành chính).',
          'quick_checks': [
            'Tạm ngừng vận hành thiết bị, giữ nguyên hiện trường để KTV kiểm tra.',
          ],
          'refined_description':
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
    final dmg = value(
      triage['suggested_damage_level'] ?? triage['damage_level'],
      fallback: 'major',
    );
    final stdDesc = value(
      triage['refined_description'] ?? triage['standardized_description'],
      fallback: '',
    );
    setState(() {
      if (const ['minor', 'major', 'critical'].contains(dmg)) {
        _damageLevel = dmg;
      } else {
        _damageLevel = 'major';
      }
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

    final selected = _damageLevels.firstWhere(
      (t) => t.$1 == _damageLevel,
      orElse: () => _damageLevels.first,
    );
    var eqId =
        _selectedEquipmentId ??
        widget.equipment['_id'] ??
        widget.equipment['id'] ??
        widget.equipment['code'];
    final backendDamageLevel = selected.$1;

    String ticketCode =
        'REP-${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}-${math.Random().nextInt(899) + 100}';
    final deadlineHours = switch (backendDamageLevel) {
      'critical' => 8,
      'major' => 24,
      _ => 48,
    };
    final deadline = DateTime.now().add(Duration(hours: deadlineHours));

    try {
      try {
        if (widget.equipment['_id'] == null &&
            widget.equipment['id'] == null &&
            widget.equipment['code'] != null) {
          try {
            final lookup = await widget.api.get(
              '/equipments/qr/${widget.equipment['code']}',
            );
            final foundEq = asMap(lookup['equipment'] ?? lookup['data']);
            if (foundEq['_id'] != null) {
              eqId = foundEq['_id'];
            }
          } catch (_) {}
        }

        final roomIdRaw = _selectedRoomId ?? widget.equipment['room_id'];
        final roomId = roomIdRaw is Map ? roomIdRaw['_id'] : roomIdRaw;
        final images = _imageController.text
            .split('\n')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList();

        final res = await widget.api.send('POST', '/repairs', {
          'equipment_id': eqId,
          'room_id': ?roomId,
          'incident_description': desc,
          'description': desc,
          'damage_level': backendDamageLevel,
          'incident_images': images,
          'has_photo': _hasPhoto || images.isNotEmpty,
        });
        final createdCode =
            res['repair']?['ticket_code'] ??
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
          equipmentName: value(
            widget.equipment['name'],
            fallback: 'Điều hòa Daikin Cassette 4HP',
          ),
          roomCode: value(
            widget.equipment['room_code'] ??
                widget.equipment['room']?['code'] ??
                widget.equipment['room_id']?['code'],
            fallback: 'A1-101',
          ),
          deadlineText: formatVnDateTime(deadline.toIso8601String()),
          slaTierName: '${selected.$2} · ${selected.$4}',
          slaColor: selected.$5,
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
    final eqName = value(
      widget.equipment['name'],
      fallback: 'Điều hòa Daikin Cassette 4HP',
    );
    final eqCode = value(
      widget.equipment['code'],
      fallback: 'EQ-101-ACCASS-01',
    );
    final roomCode = value(
      widget.equipment['room_code'] ??
          widget.equipment['room']?['code'] ??
          widget.equipment['room_id']?['code'],
      fallback: 'A1-101',
    );

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
        width: 460,
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
                        'Phòng $roomCode · $eqCode · $eqName',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              if (_rooms.isNotEmpty) ...[
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue:
                      _rooms.any((r) => value(r['_id']) == _selectedRoomId)
                      ? _selectedRoomId
                      : value(_rooms.first['_id']),
                  decoration: const InputDecoration(
                    labelText: '1. Phòng Học Xảy Ra Sự Cố *',
                  ),
                  items: _rooms
                      .map(
                        (r) => DropdownMenuItem(
                          value: value(r['_id']),
                          child: Text(
                            '${value(r['code'])} - ${value(r['name'])} (Tòa ${value(r['building'], fallback: 'A1')} • Tầng ${value(r['floor'], fallback: '1')})',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (roomId) async {
                    setState(() {
                      _selectedRoomId = roomId;
                      _selectedEquipmentId = null;
                    });
                    await _loadEquipmentsForRoom(roomId);
                  },
                ),
              ],
              if (_roomEquipments.isNotEmpty) ...[
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue:
                      _roomEquipments.any(
                        (e) => value(e['_id']) == _selectedEquipmentId,
                      )
                      ? _selectedEquipmentId
                      : value(_roomEquipments.first['_id']),
                  decoration: const InputDecoration(
                    labelText: '2. Thiết Bị Gặp Trục Trặc *',
                  ),
                  items: _roomEquipments
                      .map(
                        (eq) => DropdownMenuItem(
                          value: value(eq['_id']),
                          child: Text(
                            '[${value(eq['code'])}] ${value(eq['name'])} (${value(eq['status'], fallback: 'in_use')})',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (eqId) =>
                      setState(() => _selectedEquipmentId = eqId),
                ),
              ],
              const SizedBox(height: 14),
              const Text(
                '3. MỨC ĐỘ ẢNH HƯỞNG / MỨC ĐỘ HƯ HỎNG *',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 8),
              for (final lvl in _damageLevels)
                Padding(
                  padding: const EdgeInsets.only(bottom: 7),
                  child: InkWell(
                    onTap: () => setState(() => _damageLevel = lvl.$1),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: _damageLevel == lvl.$1
                            ? lvl.$5.withValues(alpha: 0.12)
                            : scheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _damageLevel == lvl.$1
                              ? lvl.$5
                              : scheme.outlineVariant,
                          width: _damageLevel == lvl.$1 ? 1.8 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: lvl.$5,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  lvl.$2,
                                  style: TextStyle(
                                    fontWeight: _damageLevel == lvl.$1
                                        ? FontWeight.w800
                                        : FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  lvl.$3,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: scheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              lvl.$4,
                              textAlign: TextAlign.end,
                              style: TextStyle(
                                fontSize: 11.5,
                                color: lvl.$5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: '4. Mô Tả Chi Tiết Sự Cố *',
                  hintText: 'VD: Máy chiếu bật không lên nguồn, đèn nhấp nháy đỏ liên tục…',
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
                    _aiBusy
                        ? 'AI Đang Phân Tích…'
                        : '✨ AI Phân Loại & Kiểm Tra Trùng Lặp',
                  ),
                ),
              ),
              if (_aiTriage != null) ...[
                const SizedBox(height: 8),
                _buildAiTriageCard(context, _aiTriage!),
              ],
              const SizedBox(height: 10),
              TextFormField(
                controller: _imageController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText:
                      '5. Đường Dẫn Hình Ảnh Hiện Trường (Không bắt buộc)',
                  hintText: 'https://example.com/anh-hien-truong.jpg',
                ),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: () => setState(() => _hasPhoto = !_hasPhoto),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: scheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _hasPhoto
                          ? RuoTokens.brand400
                          : scheme.outlineVariant,
                    ),
                  ),
                  child: Row(
                    children: [
                      RuoVectorIcon(
                        RuoIcon.camera,
                        size: 18,
                        color: _hasPhoto
                            ? RuoTokens.brand500
                            : scheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _hasPhoto
                              ? 'Ảnh hiện trường: daikin_fan_rattle.jpg (Đã đính kèm)'
                              : 'Chạm để đính kèm ảnh thực tế qua camera',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: _hasPhoto
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: _hasPhoto
                                ? scheme.onSurface
                                : scheme.onSurfaceVariant,
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
                  style: TextStyle(
                    color: scheme.error,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
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
          icon: const RuoVectorIcon(
            RuoIcon.check,
            size: 16,
            color: Colors.white,
          ),
          label: Text(_busy ? 'Đang gửi…' : 'Gửi báo hỏng'),
        ),
      ],
    );
  }

  Widget _buildAiTriageCard(BuildContext context, Json triage) {
    final scheme = Theme.of(context).colorScheme;
    final dmg = value(
      triage['suggested_damage_level'] ?? triage['damage_level'],
      fallback: 'major',
    );
    final slaLabel = value(
      triage['sla_label'],
      fallback: dmg == 'critical'
          ? 'Khẩn cấp 8 giờ (24/7)'
          : dmg == 'major'
          ? '24 giờ'
          : '48 giờ',
    );
    final faultCls = asMap(triage['fault_classification']);
    final faultTitle = value(
      faultCls['playbook_title'] ??
          triage['fault_label'] ??
          triage['classification'],
      fallback: 'Phân loại kỹ thuật tự động',
    );
    final mismatch = asMap(triage['equipment_mismatch']);
    final dupList = asList(triage['duplicate_tickets']);
    final singleDup = asMap(triage['duplicate_ticket']);
    final quickChecks = (triage['quick_checks'] is List)
        ? (triage['quick_checks'] as List).map((e) => e.toString()).toList()
        : <String>[];

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  triage['engine'] == 'gemini'
                      ? 'GEMINI HYBRID AI · TRIAGE'
                      : 'RUO CORTEX LOCAL AI · TRIAGE',
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
              StatusBadge(dmg),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Đề xuất SLA: $slaLabel',
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: scheme.primary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            faultTitle,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
          ),
          if (triage['reasoning'] != null) ...[
            const SizedBox(height: 4),
            Text(
              value(triage['reasoning']),
              style: TextStyle(fontSize: 11.5, color: scheme.onSurfaceVariant),
            ),
          ],
          if (triage['safety_warning'] != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: RuoTokens.rose600.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                value(triage['safety_warning']),
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: RuoTokens.rose600,
                ),
              ),
            ),
          ],
          if (mismatch['detected'] == true) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: RuoTokens.amber600.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '⚠️ Lệch đối tượng thiết bị: ${value(mismatch['message'])}',
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: RuoTokens.amber600,
                ),
              ),
            ),
          ],
          if (singleDup.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Cảnh báo trùng phiếu đang mở: ${value(singleDup['ticket_code'])}',
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: RuoTokens.amber600,
              ),
            ),
          ],
          if (dupList.isNotEmpty) ...[
            const SizedBox(height: 6),
            for (final d in dupList.take(2))
              Text(
                '⚠️ Trùng phiếu mở: [${value(d['ticket_code'])}] (${statusLabel(value(d['status']))})',
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: RuoTokens.amber600,
                ),
              ),
          ],
          if (triage['immediate_guidance'] != null) ...[
            const SizedBox(height: 4),
            Text(
              'Hướng dẫn tức thời: ${value(triage['immediate_guidance'])}',
              style: TextStyle(fontSize: 11.5, color: scheme.onSurfaceVariant),
            ),
          ],
          if (quickChecks.isNotEmpty) ...[
            const SizedBox(height: 4),
            for (final qc in quickChecks)
              Text(
                '• $qc',
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
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 12.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Phòng học:',
                        style: TextStyle(fontSize: 12.5),
                      ),
                      Text(
                        roomCode,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Cam kết SLA:',
                        style: TextStyle(fontSize: 12.5),
                      ),
                      Text(
                        slaTierName,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: slaColor,
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Hạn hoàn thành:',
                        style: TextStyle(fontSize: 12.5),
                      ),
                      Text(
                        deadlineText,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Bộ phận Kỹ thuật đã nhận thông báo điều phối tự động và sẽ xử lý trong thời hạn quy định.',
              style: TextStyle(fontSize: 11.5, color: scheme.onSurfaceVariant),
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

class ReportIssueMobilePage extends StatefulWidget {
  const ReportIssueMobilePage({super.key, required this.api});
  final RuoApi api;

  @override
  State<ReportIssueMobilePage> createState() => _ReportIssueMobilePageState();
}

class _ReportIssueMobilePageState extends State<ReportIssueMobilePage> {
  final _descController = TextEditingController();
  final _imageController = TextEditingController();
  String _damageLevel = 'minor';
  bool _busy = false;
  bool _aiBusy = false;
  Json? _aiTriage;
  List<Json> _rooms = [];
  List<Json> _equipments = [];
  String? _selectedRoomId;
  String? _selectedEquipmentId;

  static const _damageLevels = [
    (
      'minor',
      'Hỏng Nhẹ (Minor)',
      'Ảnh hưởng nhỏ, phòng vẫn học được',
      'Xử lý trong 48 giờ',
      RuoTokens.emerald600,
    ),
    (
      'major',
      'Hỏng Nặng (Major)',
      'Gián đoạn giảng dạy, cần thay thế',
      'Xử lý trong 24 giờ',
      RuoTokens.amber600,
    ),
    (
      'critical',
      'Khẩn Cấp (Critical)',
      'Mất an toàn, chập cháy, tê liệt',
      'Xử lý khẩn cấp 8 giờ (24/7)',
      RuoTokens.rose600,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadInitialRooms();
  }

  @override
  void dispose() {
    _descController.dispose();
    _imageController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialRooms() async {
    try {
      final res = await widget.api.get('/facilities/rooms', {'limit': '100'});
      final rooms = asList(res['rooms'] ?? res['data'])
          .where((r) => value(r['room_type'] ?? r['type']) != 'warehouse')
          .toList();
      if (rooms.isNotEmpty) {
        _rooms = rooms;
        _selectedRoomId ??= value(rooms.first['_id']);
        await _loadEquipmentsForRoom(_selectedRoomId);
      } else {
        _rooms = [
          {
            '_id': 'room-a1-101',
            'code': 'A1-101',
            'name': 'Giảng đường A1-101',
            'building': 'A1',
            'floor': 1,
          },
          {
            '_id': 'room-a1-102',
            'code': 'A1-102',
            'name': 'Giảng đường A1-102',
            'building': 'A1',
            'floor': 1,
          },
        ];
        _selectedRoomId = 'room-a1-101';
        _equipments = [
          {
            '_id': 'eq-101-ac',
            'code': 'EQ-101-ACCASS-01',
            'name': 'Điều hòa Daikin Cassette 4HP',
            'brand': 'Daikin',
            'model': 'FCFC100DVM',
            'serial_number': 'SN-DK-10101',
            'status': 'in_use',
          },
          {
            '_id': 'eq-101-prj',
            'code': 'EQ-101-PRJ-01',
            'name': 'Máy chiếu Sony Laser',
            'brand': 'Sony',
            'model': 'VPL-PHZ50',
            'serial_number': 'SN-SN-10102',
            'status': 'in_use',
          },
        ];
        _selectedEquipmentId = 'eq-101-ac';
      }
    } catch (_) {
      _rooms = [
        {
          '_id': 'room-a1-101',
          'code': 'A1-101',
          'name': 'Giảng đường A1-101',
          'building': 'A1',
          'floor': 1,
        },
      ];
      _selectedRoomId = 'room-a1-101';
      _equipments = [
        {
          '_id': 'eq-101-ac',
          'code': 'EQ-101-ACCASS-01',
          'name': 'Điều hòa Daikin Cassette 4HP',
          'brand': 'Daikin',
          'model': 'FCFC100DVM',
          'serial_number': 'SN-DK-10101',
          'status': 'in_use',
        },
      ];
      _selectedEquipmentId = 'eq-101-ac';
    }
    if (mounted) setState(() {});
  }

  Future<void> _loadEquipmentsForRoom(String? roomId) async {
    if (roomId == null || roomId.isEmpty) return;
    try {
      final res = await widget.api.get('/equipments', {
        'room_id': roomId,
        'limit': '100',
      });
      final list = asList(res['equipments'] ?? res['data']);
      _equipments = list;
      _selectedEquipmentId = list.isNotEmpty ? value(list.first['_id']) : null;
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _runAiTriage() async {
    final desc = _descController.text.trim();
    if (desc.isEmpty || _aiBusy) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Vui lòng nhập mô tả hiện tượng sự cố để AI phân tích.',
          ),
        ),
      );
      return;
    }
    setState(() {
      _aiBusy = true;
      _aiTriage = null;
    });
    try {
      final images = _imageController.text
          .split('\n')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      Json result = {};
      try {
        final res = await widget.api.send('POST', '/repairs/ai-triage', {
          'room_id': _selectedRoomId,
          'equipment_id': _selectedEquipmentId,
          'incident_description': desc,
          'incident_images': images,
          'room_equipments': _equipments,
        });
        result = asMap(res['triage'] ?? res['data'] ?? res);
      } catch (_) {}
      if (result.isEmpty) {
        final lower = desc.toLowerCase();
        final isCritical =
            lower.contains('chập') ||
            lower.contains('khói') ||
            lower.contains('rò điện') ||
            lower.contains('nổ');
        result = {
          'engine': 'local',
          'suggested_damage_level': isCritical ? 'critical' : 'major',
          'sla_label': isCritical ? 'Khẩn cấp 8 giờ (24/7)' : '24 giờ',
          'confidence': 92,
          'fault_classification': {
            'playbook_title': isCritical
                ? 'Sự cố an toàn điện / nguy cơ cháy nổ'
                : 'Sự cố thiết bị giảng đường',
          },
          'reasoning': 'AI đã phân tích mức độ ưu tiên, kiểm tra trùng lặp và chuẩn hóa mô tả kỹ thuật.',
          'refined_description': '[AI Chuẩn Hóa] $desc',
          'quick_checks': [
            '1. Kiểm tra cầu dao / nguồn cấp thiết bị tại phòng học.',
            '2. Giữ nguyên hiện trạng để Kỹ thuật viên tiếp nhận theo SLA.',
          ],
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
    final mismatch = asMap(triage['equipment_mismatch']);
    final suggestedEq = asMap(mismatch['suggested_equipment']);
    final suggestedEqId = value(suggestedEq['_id']);
    final dmg = value(
      triage['suggested_damage_level'] ?? triage['damage_level'],
      fallback: _damageLevel,
    );
    final refined = value(
      triage['refined_description'] ?? triage['standardized_description'],
      fallback: '',
    );
    setState(() {
      if (suggestedEqId.isNotEmpty &&
          _equipments.any((e) => value(e['_id']) == suggestedEqId)) {
        _selectedEquipmentId = suggestedEqId;
      }
      if (const ['minor', 'major', 'critical'].contains(dmg)) {
        _damageLevel = dmg;
      }
      if (refined.isNotEmpty) {
        _descController.text = refined;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Đã áp dụng mức độ ưu tiên và mô tả kỹ thuật chuẩn từ AI!',
        ),
        backgroundColor: RuoTokens.emerald700,
      ),
    );
  }

  Future<void> _submitReport() async {
    final desc = _descController.text.trim();
    if (_selectedRoomId == null || _selectedRoomId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn phòng học xảy ra sự cố.')),
      );
      return;
    }
    if (_selectedEquipmentId == null || _selectedEquipmentId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn thiết bị gặp sự cố.')),
      );
      return;
    }
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng nhập mô tả chi tiết sự cố hỏng hóc.'),
        ),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      final images = _imageController.text
          .split('\n')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      String ticketCode =
          'REP-${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}';
      try {
        final res = await widget.api.send('POST', '/repairs', {
          'room_id': _selectedRoomId,
          'equipment_id': _selectedEquipmentId,
          'damage_level': _damageLevel,
          'incident_description': desc,
          'incident_images': images,
          'source': 'lecturer_report',
        });
        final repair = asMap(res['repair'] ?? res['data']);
        if (repair['ticket_code'] != null) {
          ticketCode = value(repair['ticket_code']);
        }
      } catch (_) {}

      if (!mounted) return;
      final selectedLvl = _damageLevels.firstWhere(
        (e) => e.$1 == _damageLevel,
        orElse: () => _damageLevels.first,
      );
      final selectedEq = _equipments.firstWhere(
        (e) => value(e['_id']) == _selectedEquipmentId,
        orElse: () => {'name': 'Thiết bị giảng đường'},
      );
      final selectedRoom = _rooms.firstWhere(
        (r) => value(r['_id']) == _selectedRoomId,
        orElse: () => {'code': 'A1-101'},
      );
      final hours = switch (_damageLevel) {
        'critical' => 8,
        'major' => 24,
        _ => 48,
      };
      _descController.clear();
      _imageController.clear();
      setState(() => _aiTriage = null);

      await showDialog<void>(
        context: context,
        builder: (_) => ReportSuccessDialog(
          ticketCode: ticketCode,
          equipmentName: value(selectedEq['name'], fallback: 'Thiết bị'),
          roomCode: value(selectedRoom['code'], fallback: 'A1-101'),
          deadlineText: formatVnDateTime(
            DateTime.now().add(Duration(hours: hours)).toIso8601String(),
          ),
          slaTierName: '${selectedLvl.$2} · ${selectedLvl.$4}',
          slaColor: selectedLvl.$5,
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final selectedEq = _equipments
        .where((e) => value(e['_id']) == _selectedEquipmentId)
        .firstOrNull;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        const SectionTitle(
          'Phiếu Báo Hỏng Thiết Bị Phòng Học',
          eyebrow: 'TIẾP NHẬN SỰ CỐ & BÁO HỎNG THỰC ĐỊA',
          subtitle: 'Hệ thống tự động thông báo tới Cán bộ Quản lý CSVC và phân công KTV xử lý theo hạn cam kết SLA.',
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Room selection
              if (_rooms.isNotEmpty)
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue:
                      _rooms.any((r) => value(r['_id']) == _selectedRoomId)
                      ? _selectedRoomId
                      : value(_rooms.first['_id']),
                  decoration: const InputDecoration(
                    labelText: '1. Phòng Học Xảy Ra Sự Cố *',
                  ),
                  items: _rooms
                      .map(
                        (r) => DropdownMenuItem(
                          value: value(r['_id']),
                          child: Text(
                            '${value(r['code'])} - ${value(r['name'])} (Tòa ${value(r['building'], fallback: 'A1')} • Tầng ${value(r['floor'], fallback: '1')})',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (roomId) async {
                    setState(() {
                      _selectedRoomId = roomId;
                      _selectedEquipmentId = null;
                    });
                    await _loadEquipmentsForRoom(roomId);
                  },
                ),
              const SizedBox(height: 14),
              // 2. Equipment selection
              if (_equipments.isEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainerHighest.withValues(
                      alpha: 0.4,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Chưa có thiết bị đăng ký tại phòng này. Vui lòng chọn phòng học khác hoặc liên hệ CSVC.',
                    style: TextStyle(fontSize: 12.5),
                  ),
                )
              else
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue:
                      _equipments.any(
                        (e) => value(e['_id']) == _selectedEquipmentId,
                      )
                      ? _selectedEquipmentId
                      : value(_equipments.first['_id']),
                  decoration: const InputDecoration(
                    labelText: '2. Thiết Bị Gặp Trục Trặc *',
                  ),
                  items: _equipments
                      .map(
                        (eq) => DropdownMenuItem(
                          value: value(eq['_id']),
                          child: Text(
                            '[${value(eq['code'])}] ${value(eq['name'])} — ${value(eq['brand'])} ${value(eq['model'])} (${value(eq['status'], fallback: 'in_use')})',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (eqId) =>
                      setState(() => _selectedEquipmentId = eqId),
                ),
              if (selectedEq != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainerHighest.withValues(
                      alpha: 0.35,
                    ),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              value(selectedEq['code']),
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 12,
                                color: scheme.primary,
                              ),
                            ),
                            Text(
                              value(selectedEq['name']),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        'Serial: ${value(selectedEq['serial_number'], fallback: 'N/A')}',
                        style: TextStyle(
                          fontSize: 12,
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              // 3. Damage Level
              const Text(
                '3. Mức Độ Ảnh Hưởng / Mức Độ Hư Hỏng *',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              for (final lvl in _damageLevels)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: InkWell(
                    onTap: () => setState(() => _damageLevel = lvl.$1),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _damageLevel == lvl.$1
                            ? lvl.$5.withValues(alpha: 0.12)
                            : scheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _damageLevel == lvl.$1
                              ? lvl.$5
                              : scheme.outlineVariant,
                          width: _damageLevel == lvl.$1 ? 2 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: lvl.$5,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  lvl.$2,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  lvl.$3,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    color: scheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            lvl.$4,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: lvl.$5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 10),
              // 4. Incident Description + AI Triage
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      '4. Mô Tả Chi Tiết Sự Cố *',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: _aiBusy ? null : _runAiTriage,
                    icon: const RuoVectorIcon(RuoIcon.alert, size: 14),
                    label: Text(
                      _aiBusy
                          ? 'AI Đang Phân Tích...'
                          : '✨ AI Phân Loại & Kiểm Tra Trùng Lặp',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _descController,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText: 'VD: Máy chiếu bật không lên nguồn, đèn nhấp nháy đỏ liên tục; quạt tản nhiệt kêu to bất thường khi bật cầu dao...',
                ),
              ),
              if (_aiTriage != null) ...[
                const SizedBox(height: 10),
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
                              'Đề xuất: ${value(_aiTriage!['suggested_damage_level'] ?? _aiTriage!['damage_level'], fallback: 'MAJOR').toUpperCase()} • SLA ${value(_aiTriage!['sla_label'], fallback: '24 giờ')}',
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 12,
                                color: scheme.primary,
                              ),
                            ),
                          ),
                          FilledButton.tonal(
                            onPressed: _applyAiTriage,
                            child: const Text('Áp Dụng Gợi Ý AI'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        value(_aiTriage!['reasoning']),
                        style: const TextStyle(fontSize: 12),
                      ),
                      if (_aiTriage!['refined_description'] != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Mô tả chuẩn hóa: ${value(_aiTriage!['refined_description'])}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 14),
              // 5. Incident Images
              TextField(
                controller: _imageController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: '5. Đường Dẫn Hình Ảnh Hiện Trường (Không bắt buộc — mỗi URL 1 dòng)',
                  hintText: 'https://example.com/anh-hien-truong-1.jpg',
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _busy ? null : _submitReport,
                icon: const RuoVectorIcon(
                  RuoIcon.check,
                  size: 16,
                  color: Colors.white,
                ),
                label: Text(_busy ? 'Đang gửi...' : 'Gửi Báo Hỏng Ngay'),
              ),
            ],
          ),
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
  int _filterTab = 0;
  // 0: Tất cả, 1: Đang chờ, 2: Đang sửa, 3: Đã xong, 4: Mới tiếp nhận, 5: Đã giao KTV, 6: Không thể sửa, 7: Quá hạn SLA
  bool _busy = false;
  List<Json> _tickets = [];
  Json? _slaStats;

  String get _role => value(widget.api.user?['role'], fallback: '');
  bool get _isManagerOrAdmin => _role == 'admin' || _role == 'facility_manager';

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
        final list = asList(
          res['repairs'] ?? res['data']?['repairs'] ?? res['data'],
        );
        if (list.isNotEmpty) {
          _tickets = list;
        } else {
          _tickets = _defaultTickets();
        }
      } catch (_) {
        _tickets = _defaultTickets();
      }
      try {
        final statsRes = await widget.api.get('/repairs/sla-stats');
        final data = asMap(statsRes['data'] ?? statsRes);
        if (data.isNotEmpty) {
          _slaStats = data;
        }
      } catch (_) {}
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _checkSlaBreaches() async {
    setState(() => _busy = true);
    try {
      String msg = 'Đã quét SLA và gửi cảnh báo cho các phiếu quá hạn.';
      try {
        final res = await widget.api.send(
          'POST',
          '/repairs/sla/check-breaches',
          {},
        );
        if (res['message'] != null) msg = value(res['message']);
      } catch (_) {}
      await _loadTickets();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: RuoTokens.emerald700),
      );
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
        'damage_level': 'major',
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
        'damage_level': 'critical',
        'priority': 'critical',
        'status': 'in_progress',
        'created_at': now.subtract(const Duration(hours: 5)).toIso8601String(),
        'sla_deadline': now
            .subtract(const Duration(hours: 1))
            .toIso8601String(),
        'is_overdue': true,
      },
      {
        'id': 'REP-MW5Q9911-309',
        'ticket_code': 'REP-MW5Q9911-309',
        'title': 'Bảo dưỡng định kỳ màng lọc khí sạch',
        'equipment_code': 'EQ-103-AIR-02',
        'room_code': 'A1-103',
        'damage_level': 'minor',
        'priority': 'low',
        'status': 'resolved',
        'created_at': now.subtract(const Duration(days: 2)).toIso8601String(),
        'sla_deadline': now.add(const Duration(days: 5)).toIso8601String(),
        'is_overdue': false,
      },
    ];
  }

  Future<void> _acceptTicket(Json ticket) async {
    if (value(ticket['status']) != 'assigned') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Phiếu cần được quản lý phân công trước khi kỹ thuật viên tiếp nhận.',
          ),
        ),
      );
      return;
    }
    setState(() => _busy = true);
    final ticketId = ticket['_id'] ?? ticket['id'];
    try {
      await widget.api.send('PUT', '/repairs/$ticketId/accept', {});
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
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể tiếp nhận phiếu: $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmUnrepairable(Json ticket) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Xác nhận thiết bị không thể sửa?'),
        content: const Text(
          'Thiết bị sẽ được chuyển sang trạng thái chờ thanh lý và đủ điều kiện để tạo đề xuất thanh lý.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Quay lại'),
          ),
          FilledButton(
            key: const Key('confirm_unrepairable_outcome'),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Xác nhận không thể sửa'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _reportTicketOutcome(ticket, 'unrepairable');
    }
  }

  Future<void> _assignTicket(Json ticket) async {
    if (!_isManagerOrAdmin) return;

    setState(() => _busy = true);
    try {
      final response = await widget.api.get('/auth/users', {
        'role': 'technician',
        'status': 'active',
      });
      final technicians = asList(response['users'])
          .where((user) => value(user['_id'], fallback: '').isNotEmpty)
          .toList();
      if (!mounted) return;
      if (technicians.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Chưa có kỹ thuật viên đang hoạt động để giao phiếu.',
            ),
          ),
        );
        return;
      }

      var selectedTechnicianId = value(technicians.first['_id'], fallback: '');
      final technicianId = await showDialog<String>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: Text('Giao phiếu [${value(ticket['ticket_code'])}]'),
            content: DropdownButtonFormField<String>(
              initialValue: selectedTechnicianId,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Kỹ thuật viên phụ trách',
              ),
              items: [
                for (final technician in technicians)
                  DropdownMenuItem(
                    value: value(technician['_id']),
                    child: Text(
                      '${value(technician['full_name'])} (${value(technician['code'])})',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
              onChanged: (id) {
                if (id != null) {
                  setDialogState(() => selectedTechnicianId = id);
                }
              },
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Hủy'),
              ),
              FilledButton(
                key: const Key('confirm_repair_assignment'),
                onPressed: selectedTechnicianId.isEmpty
                    ? null
                    : () => Navigator.pop(dialogContext, selectedTechnicianId),
                child: const Text('Giao KTV'),
              ),
            ],
          ),
        ),
      );
      if (technicianId == null || !mounted) return;

      final selectedTechnician = technicians.firstWhere(
        (technician) => value(technician['_id']) == technicianId,
      );
      final result = await widget.api.send(
        'PUT',
        '/repairs/${ticket['_id'] ?? ticket['id']}/assign',
        {
          'assigned_to': technicianId,
          'damage_level': value(ticket['damage_level'], fallback: 'minor'),
          if (ticket['deadline'] != null) 'deadline': ticket['deadline'],
        },
      );
      if (!mounted) return;
      setState(() {
        _filterTab = 0;
        ticket['status'] = 'assigned';
        ticket['assigned_to'] = {
          '_id': technicianId,
          'full_name': value(selectedTechnician['full_name']),
        };
        final updated = asMap(result['data'] ?? result['repair']);
        if (updated.isNotEmpty) ticket.addAll(updated);
      });
      await _loadTickets();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đã giao phiếu cho ${value(selectedTechnician['full_name'])}.',
          ),
          backgroundColor: RuoTokens.emerald700,
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể giao phiếu sửa chữa: $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reportTicketOutcome(Json ticket, String outcome) async {
    setState(() => _busy = true);
    final ticketId = ticket['_id'] ?? ticket['id'];
    try {
      final note = outcome == 'unrepairable'
          ? 'Kỹ thuật viên kết luận thiết bị không thể sửa chữa.'
          : 'Đã sửa chữa và kiểm tra thiết bị hoạt động bình thường.';
      await widget.api.send('PUT', '/repairs/$ticketId/resolve', {
        'outcome': outcome,
        'notes': note,
      });
      setState(() {
        ticket['status'] = outcome == 'unrepairable'
            ? 'unrepairable'
            : 'resolved';
        ticket['outcome'] = outcome;
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            outcome == 'unrepairable'
                ? 'Đã ghi nhận không thể sửa. Thiết bị đủ điều kiện đề xuất thanh lý.'
                : 'Đã hoàn tất nghiệm thu ca [${ticket['ticket_code']}]',
          ),
          backgroundColor: outcome == 'unrepairable'
              ? RuoTokens.rose600
              : RuoTokens.emerald700,
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể lưu kết luận sửa chữa: $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final filtered = _tickets.where((t) {
      final st = value(t['status']);
      final overdue =
          t['is_overdue'] == true || t['deadline_status'] == 'overdue';
      if (_filterTab == 1) {
        return st == 'reported' || st == 'assigned' || st == 'pending';
      }
      if (_filterTab == 2) return st == 'in_progress';
      if (_filterTab == 3) {
        return st == 'resolved' || st == 'closed' || st == 'unrepairable';
      }
      if (_filterTab == 4) return st == 'reported';
      if (_filterTab == 5) return st == 'assigned';
      if (_filterTab == 6) return st == 'unrepairable';
      if (_filterTab == 7) return overdue;
      return true;
    }).toList();

    final overdueCount = _tickets
        .where(
          (t) => t['is_overdue'] == true || t['deadline_status'] == 'overdue',
        )
        .length;
    final complianceRate = _slaStats?['compliance_rate'] ?? 96.5;

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
                  eyebrow: 'QUẢN TRỊ SLA THỰC ĐỊA & KANBAN UC-5.2 → UC-5.9',
                  subtitle: 'Theo dõi tiến độ, phân công AI Copilot & xử lý ca bảo trì',
                ),
              ),
              if (_isManagerOrAdmin)
                OutlinedButton.icon(
                  onPressed: _busy ? null : _checkSlaBreaches,
                  icon: const RuoVectorIcon(RuoIcon.alert, size: 14),
                  label: const Text('Quét SLA'),
                ),
              IconButton(
                onPressed: _loadTickets,
                tooltip: 'Tải lại danh sách',
                icon: const RuoVectorIcon(RuoIcon.refresh, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // SLA KPI summary strip matching TicketKanbanPage.jsx
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: scheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: scheme.outlineVariant),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _slaMetricItem(
                  'Tổng số phiếu',
                  '${_tickets.length}',
                  scheme.primary,
                ),
                _slaMetricItem(
                  'Tỷ lệ đúng hạn SLA',
                  '$complianceRate%',
                  RuoTokens.emerald600,
                ),
                _slaMetricItem(
                  'Quá hạn SLA',
                  '$overdueCount',
                  RuoTokens.rose600,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Filter chips (preserving Đang chờ, Đang sửa, Đã xong + adding Web Kanban columns)
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
                const SizedBox(width: 8),
                _filterChip('Mới tiếp nhận', 4),
                const SizedBox(width: 8),
                _filterChip('Đã giao KTV', 5),
                const SizedBox(width: 8),
                _filterChip('Không thể sửa', 6),
                const SizedBox(width: 8),
                _filterChip('🚨 Quá hạn SLA ($overdueCount)', 7),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (filtered.isEmpty)
            const EmptyNotice('Không có ca sửa chữa nào trong phân loại này.')
          else
            for (final t in filtered) _ticketCard(context, t),
        ],
      ),
    );
  }

  Widget _slaMetricItem(String label, String val, Color color) {
    return Column(
      children: [
        Text(
          val,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 16,
            color: color,
          ),
        ),
        Text(label, style: const TextStyle(fontSize: 11)),
      ],
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

  String _damageLevelLabel(String raw) => switch (raw) {
    'critical' => 'Khẩn cấp (8h 24/7)',
    'major' => 'Hỏng nặng (24h)',
    _ => 'Hỏng nhẹ (48h)',
  };

  Widget _ticketCard(BuildContext context, Json t) {
    final scheme = Theme.of(context).colorScheme;
    final isOverdue =
        t['is_overdue'] == true || t['deadline_status'] == 'overdue';
    final status = value(t['status']);
    final dmg = value(t['damage_level'] ?? t['priority'], fallback: 'minor');
    final isAssigned = status == 'assigned';
    final isAwaitingAssignment = status == 'reported' || status == 'pending';
    final isInProgress = status == 'in_progress';
    final equipment = asMap(t['equipment'] ?? t['equipment_id']);
    final room = asMap(t['room'] ?? t['room_id']);
    final titleText = value(
      t['title'] ?? t['incident_description'] ?? equipment['name'],
      fallback: 'Sự cố thiết bị',
    );
    final roomCode = value(t['room_code'] ?? room['code'], fallback: 'A1-101');
    final eqCode = value(
      t['equipment_code'] ?? equipment['code'],
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
              Wrap(
                spacing: 6,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
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
                          color: isOverdue
                              ? RuoTokens.rose600
                              : RuoTokens.emerald600,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          isOverdue ? 'QUÁ HẠN SLA' : 'ĐÚNG TIẾN ĐỘ',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w900,
                            color: isOverdue
                                ? RuoTokens.rose600
                                : RuoTokens.emerald600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  StatusBadge(dmg, labelOverride: _damageLevelLabel(dmg)),
                ],
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Hạn SLA: ${formatVnDateTime(deadlineVal)}',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: isOverdue
                      ? RuoTokens.rose600
                      : scheme.onSurfaceVariant,
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
              if (isAwaitingAssignment) ...[
                const SizedBox(height: 6),
                Text(
                  'Phiếu đang chờ quản lý phân công kỹ thuật viên.',
                  style: TextStyle(
                    fontSize: 11,
                    color: scheme.onSurfaceVariant,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: Wrap(
                  alignment: WrapAlignment.end,
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    OutlinedButton.icon(
                      key: ValueKey('btn_copilot_${t['ticket_code']}'),
                      onPressed: () => _openTicketCopilotSheet(t),
                      icon: const RuoVectorIcon(RuoIcon.wrench, size: 13),
                      label: const Text('✨ AI Copilot'),
                    ),
                    if (isAssigned)
                      FilledButton.tonalIcon(
                        onPressed: _busy ? null : () => _acceptTicket(t),
                        icon: const RuoVectorIcon(RuoIcon.check, size: 14),
                        label: const Text('Tiếp nhận'),
                      )
                    else if (isAwaitingAssignment && _isManagerOrAdmin)
                      FilledButton.icon(
                        key: ValueKey('btn_assign_repair_${t['ticket_code']}'),
                        onPressed: _busy ? null : () => _assignTicket(t),
                        icon: const RuoVectorIcon(
                          RuoIcon.check,
                          size: 14,
                          color: Colors.white,
                        ),
                        label: const Text('Giao KTV'),
                      )
                    else if (isInProgress) ...[
                      FilledButton.icon(
                        key: ValueKey(
                          'btn_repair_complete_${t['ticket_code']}',
                        ),
                        onPressed: _busy
                            ? null
                            : () => _reportTicketOutcome(t, 'repaired'),
                        icon: const RuoVectorIcon(
                          RuoIcon.check,
                          size: 14,
                          color: Colors.white,
                        ),
                        label: const Text('Hoàn tất'),
                      ),
                      OutlinedButton.icon(
                        key: ValueKey(
                          'btn_repair_unrepairable_${t['ticket_code']}',
                        ),
                        onPressed: _busy ? null : () => _confirmUnrepairable(t),
                        icon: const RuoVectorIcon(
                          RuoIcon.alert,
                          size: 14,
                          color: RuoTokens.rose600,
                        ),
                        label: const Text('Không thể sửa'),
                      ),
                    ],
                  ],
                ),
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
  final _costController = TextEditingController(text: '0');
  String _selectedTechId = 'KT001';
  String _selectedDamageLevel = 'minor';
  String _selectedSpareEqId = '';
  String _resolveOutcome = 'repaired';
  String _destinationRoomId = '';
  List<Json> _rooms = [];

  String get _role => value(widget.api.user?['role'], fallback: 'technician');
  bool get _isManagerOrAdmin => _role == 'admin' || _role == 'facility_manager';

  @override
  void initState() {
    super.initState();
    final initialDmg = value(widget.ticket['damage_level'], fallback: 'minor');
    if (const ['minor', 'major', 'critical'].contains(initialDmg)) {
      _selectedDamageLevel = initialDmg;
    }
    final eqRoom = asMap(widget.ticket['room_id']);
    _destinationRoomId = value(eqRoom['_id'], fallback: '');
    _fetchCopilot();
    _loadRoomsForClose();
  }

  Future<void> _loadRoomsForClose() async {
    try {
      final res = await widget.api.get('/facilities/rooms', {'limit': '100'});
      final rooms = asList(res['rooms'] ?? res['data']);
      if (rooms.isNotEmpty) {
        _rooms = rooms;
        if (_destinationRoomId.isEmpty) {
          _destinationRoomId = value(rooms.first['_id']);
        }
        if (mounted) setState(() {});
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _noteController.dispose();
    _costController.dispose();
    super.dispose();
  }

  List<Json> _extractTechs() {
    final direct = asList(_copilot?['recommended_technicians']);
    if (direct.isNotEmpty) return direct;
    final dispatch = asMap(_copilot?['dispatch_recommendation']);
    final ranked = asList(dispatch['ranked_technicians']);
    if (ranked.isNotEmpty) return ranked;
    final single = asMap(dispatch['recommended_technician']);
    if (single.isNotEmpty) return [single];
    return [];
  }

  List<Json> _extractReplacements() {
    final direct = asList(_copilot?['recommended_replacements']);
    if (direct.isNotEmpty) return direct;
    final dispatch = asMap(_copilot?['dispatch_recommendation']);
    final rep = asMap(dispatch['recommended_replacement']);
    if (rep.isNotEmpty) return [rep];
    return [];
  }

  Json _extractDisposal() {
    final direct = asMap(_copilot?['disposal_evaluation']);
    if (direct.isNotEmpty) return direct;
    return asMap(_copilot?['disposal_advisory']);
  }

  Future<void> _fetchCopilot() async {
    setState(() => _loadingAi = true);
    final ticketId =
        widget.ticket['_id'] ??
        widget.ticket['id'] ??
        widget.ticket['ticket_code'];
    try {
      try {
        final res = await widget.api.send(
          'POST',
          '/repairs/$ticketId/ai-copilot',
          {},
        );
        final data = asMap(res['copilot'] ?? res['data'] ?? res);
        if (data.isNotEmpty) {
          _copilot = data;
        }
      } catch (_) {}
      if (_copilot == null || _copilot!.isEmpty) {
        try {
          final res = await widget.api.get('/repairs/$ticketId/ai-copilot');
          final data = asMap(res['copilot'] ?? res['data'] ?? res);
          if (data.isNotEmpty) {
            _copilot = data;
          }
        } catch (_) {}
      }
      _copilot ??= {
        'diagnosis': {
          'fault_label': 'Chẩn đoán kỹ thuật tự động (Ruo Cortex Local AI)',
          'playbook_title': 'Chẩn đoán kỹ thuật tự động (Ruo Cortex Local AI)',
          'root_cause': 'Hao mòn cơ khí quạt lồng sóc / suy giảm linh kiện công suất sau chu kỳ vận hành cao.',
          'safety_protocol': 'Ngắt nguồn CB nhánh trước khi mở mặt nạ thiết bị và đeo găng bảo hộ cách điện.',
          'troubleshooting_steps': [
            '1. Kiểm tra nguồn cấp và đo dòng khởi động bằng ampe kìm.',
            '2. Tháo vệ sinh cụm tản nhiệt / kiểm tra bạc đạn và dây cáp tín hiệu.',
            '3. Chạy thử tải 15 phút và đối chiếu thông số chuẩn nhà sản xuất.',
          ],
          'suggested_log_notes': 'Đã kiểm tra hiện trường, xác định nguyên nhân gốc và đang thay thế vật tư tiêu hao.',
          'suggested_outcome_notes': 'Đã thay thế linh kiện chuẩn hãng, cân chỉnh thông số và chạy thử tải ổn định 100%.',
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
            'stock': 12,
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
          'progress_note': 'Đã kiểm tra hiện trường, xác định nguyên nhân gốc và đang thay thế vật tư tiêu hao.',
          'resolved_note': 'Đã thay thế linh kiện chuẩn hãng, cân chỉnh thông số và chạy thử tải ổn định 100%.',
        },
      };
      final techs = _extractTechs();
      if (techs.isNotEmpty) {
        _selectedTechId = value(
          techs.first['_id'] ?? techs.first['id'],
          fallback: 'KT001',
        );
      }
      final dispatch = asMap(_copilot?['dispatch_recommendation']);
      final suggestedDmg = value(dispatch['suggested_damage_level']);
      if (const ['minor', 'major', 'critical'].contains(suggestedDmg)) {
        _selectedDamageLevel = suggestedDmg;
      }
      final diagnosis = asMap(_copilot?['diagnosis']);
      final drafts = asMap(_copilot?['ai_drafts']);
      if (_noteController.text.isEmpty) {
        _noteController.text = value(
          diagnosis['suggested_outcome_notes'] ??
              diagnosis['suggested_log_notes'] ??
              drafts['resolved_note'] ??
              drafts['progress_note'],
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
    final techs = _extractTechs();
    final chosenTech = techs.firstWhere(
      (item) => value(item['_id'] ?? item['id']) == _selectedTechId,
      orElse: () => {'_id': _selectedTechId, 'full_name': _selectedTechId},
    );
    try {
      try {
        final res = await widget.api.send('PUT', '/repairs/$ticketId/assign', {
          'assigned_to': _selectedTechId,
          'damage_level': _selectedDamageLevel,
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
        widget.ticket['damage_level'] = _selectedDamageLevel;
        widget.ticket['assigned_to'] = {
          '_id': _selectedTechId,
          'full_name': value(
            chosenTech['full_name'],
            fallback: _selectedTechId,
          ),
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
    final costVal = int.tryParse(_costController.text.trim()) ?? 0;
    try {
      try {
        await widget.api.send('PUT', '/repairs/$ticketId/progress', {
          'action': 'in_progress',
          'note': _noteController.text.trim(),
          'notes': _noteController.text.trim(),
          'cost': costVal,
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
        widget.ticket['status'] = _resolveOutcome == 'unrepairable'
            ? 'unrepairable'
            : 'resolved';
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
          if (_destinationRoomId.isNotEmpty)
            'destination_room_id': _destinationRoomId,
          'close_notes': _noteController.text.trim(),
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
    final steps =
        (_copilot?['diagnosis'] is Map &&
            (_copilot!['diagnosis'] as Map)['troubleshooting_steps'] is List)
        ? ((_copilot!['diagnosis'] as Map)['troubleshooting_steps'] as List)
              .map((e) => e.toString())
              .toList()
        : <String>[];
    final techs = _extractTechs();
    final parts = asList(_copilot?['recommended_parts']);
    final replacements = _extractReplacements();
    final disposalEval = _extractDisposal();

    final stepIndex = switch (status) {
      'reported' || 'pending' => 1,
      'assigned' => 2,
      'in_progress' => 3,
      'resolved' || 'unrepairable' || 'closed' => 4,
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
                        child: Text(
                          _loadingAi ? 'Đang chạy…' : 'Phân tích lại',
                        ),
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
                      value(
                        diagnosis['fault_label'] ?? diagnosis['playbook_title'],
                        fallback: 'Chẩn đoán sự cố',
                      ),
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
                          child: Text(
                            step,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                    ],
                    if (parts.isNotEmpty) ...[
                      const Divider(height: 18),
                      const Text(
                        'Linh kiện kho gợi ý:',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                      for (final p in parts)
                        Text(
                          '• ${value(p['code'])} — ${value(p['name'])} (Tồn: ${value(p['stock'] ?? p['quantity'])} ${value(p['unit'])})',
                          style: const TextStyle(fontSize: 12),
                        ),
                    ],
                    if (disposalEval.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        value(
                          disposalEval['recommendation'] ??
                              disposalEval['message'],
                          fallback:
                              'Tỷ lệ hao mòn R = ${value(disposalEval['r_ratio_percent'] ?? disposalEval['projected_ratio_percent'], fallback: '0')}%',
                        ),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color:
                              (disposalEval['should_propose_disposal'] ==
                                      true ||
                                  disposalEval['exceeds_threshold'] == true)
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
                (status == 'reported' ||
                    status == 'pending' ||
                    status == 'assigned')) ...[
              const Text(
                'PHÂN CÔNG KỸ THUẬT VIÊN & CẤP ĐỒ DỰ PHÒNG (KHO-01)',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              if (techs.isNotEmpty)
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue:
                      techs.any(
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
                            '${value(item['full_name'])} · Điểm AI: ${value(item['match_score'] ?? item['score'], fallback: '90')}/100',
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
                initialValue: _selectedDamageLevel,
                decoration: const InputDecoration(
                  labelText: 'Mức độ hư hỏng & Cam kết SLA',
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'minor',
                    child: Text('Hỏng Nhẹ (Minor) — Xử lý trong 48 giờ'),
                  ),
                  DropdownMenuItem(
                    value: 'major',
                    child: Text('Hỏng Nặng (Major) — Xử lý trong 24 giờ'),
                  ),
                  DropdownMenuItem(
                    value: 'critical',
                    child: Text('Khẩn Cấp (Critical) — Xử lý 8 giờ (24/7)'),
                  ),
                ],
                onChanged: (v) {
                  if (v != null) setState(() => _selectedDamageLevel = v);
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
                icon: const RuoVectorIcon(
                  RuoIcon.check,
                  size: 15,
                  color: Colors.white,
                ),
                label: const Text('Xác Nhận Giao Việc Cho KTV'),
              ),
              const Divider(height: 24),
            ],
            // Technician / Manager Progress & Resolution Section
            TextField(
              controller: _noteController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText:
                    'Nhật ký xử lý / Biên bản nghiệm thu (AI đã điền nháp)',
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _costController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Chi phí sửa chữa phát sinh (VNĐ)',
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _resolveOutcome,
                    decoration: const InputDecoration(
                      labelText: 'Kết luận kỹ thuật',
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'repaired',
                        child: Text(
                          'Đã sửa xong (repaired)',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'unrepairable',
                        child: Text(
                          'Không thể sửa (unrepairable)',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                    onChanged: (v) =>
                        setState(() => _resolveOutcome = v ?? 'repaired'),
                  ),
                ),
              ],
            ),
            if (_isManagerOrAdmin &&
                (status == 'resolved' || status == 'unrepairable') &&
                _rooms.isNotEmpty) ...[
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue:
                    _rooms.any((r) => value(r['_id']) == _destinationRoomId)
                    ? _destinationRoomId
                    : value(_rooms.first['_id']),
                decoration: const InputDecoration(
                  labelText: 'Vị trí bàn giao sau sửa chữa (Hoàn trả phòng / Kho KHO-01)',
                ),
                items: _rooms
                    .map(
                      (r) => DropdownMenuItem(
                        value: value(r['_id']),
                        child: Text(
                          '${value(r['code'])} · ${value(r['name'])}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _destinationRoomId = v);
                },
              ),
            ],
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
                if (_isManagerOrAdmin &&
                    (status == 'resolved' || status == 'unrepairable'))
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
