import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/tokens.dart';
import '../ui/vectors.dart';
import 'cad_blueprint.dart';
import 'field_inventory.dart';
import 'field_repairs.dart';

const roomTypeNames = <String, String>{
  'lecture': 'Phòng học',
  'lab': 'Phòng thực hành',
  'office': 'Văn phòng',
  'warehouse': 'Kho',
};

const roomStatusNames = <String, String>{
  'available': 'Sẵn sàng',
  'maintenance': 'Đang bảo trì',
  'inactive': 'Ngừng sử dụng',
};

/// Extracts blocking equipment items returned by HTTP 409 `HAS_EQUIPMENT`.
List<Json> extractEquipmentBlockers(Object error) {
  if (error is ApiException) {
    return asList(error.details['equipments']);
  }
  return const [];
}

/// Mirrors the server's room rules (`roomValidation.js`) without inventing unsupported fields.
Map<String, String> validateRoomDraft(Json draft, {bool creating = true}) {
  final errors = <String, String>{};
  final code = '${draft['code'] ?? ''}'.trim().toUpperCase();
  if (creating) {
    final match = RegExp(r'^P([1-5])0([1-8])$').firstMatch(code);
    if (match == null) {
      errors['code'] = 'Mã phòng từ P101 đến P508 (mỗi tầng 01–08).';
    }
    if (match != null &&
        draft['floor'] != null &&
        '${draft['floor']}' != match.group(1)) {
      errors['floor'] = 'Tầng phải khớp với mã phòng.';
    }
  }
  final name = '${draft['name'] ?? ''}'.trim();
  if (name.isEmpty || name.length > 120) {
    errors['name'] = 'Tên phòng cần 1–120 ký tự.';
  }
  final capacityText = '${draft['capacity'] ?? ''}'.trim();
  final capacity = RegExp(r'^\d+$').hasMatch(capacityText)
      ? int.tryParse(capacityText)
      : null;
  if (capacity == null || capacity < 1 || capacity > 500) {
    errors['capacity'] = 'Sức chứa là số nguyên từ 1 đến 500.';
  }
  if (!roomTypeNames.containsKey(draft['room_type'])) {
    errors['room_type'] = 'Chọn loại phòng hợp lệ.';
  }
  if ('${draft['description'] ?? ''}'.trim().length > 500) {
    errors['description'] = 'Chức năng phòng tối đa 500 ký tự.';
  }
  return errors;
}

class RoomsPage extends StatefulWidget {
  const RoomsPage({super.key, required this.api});
  final RuoApi api;
  @override
  State<RoomsPage> createState() => _RoomsPageState();
}

class _RoomsPageState extends State<RoomsPage> {
  final _search = TextEditingController();
  String _query = '', _floor = '', _type = '', _status = '';
  int _revision = 0;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _reload() => setState(() => _revision++);

  Future<void> _openRoom(Json room) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            RoomDetailPage(api: widget.api, code: value(room['code'])),
      ),
    );
    if (mounted) _reload();
  }

  Future<void> _create() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => RoomFormPage(api: widget.api)),
    );
    if (mounted && changed == true) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        const SectionTitle(
          'Phòng học',
          eyebrow: 'DANH MỤC KHÔNG GIAN · TÒA A1',
          subtitle:
              'Tra cứu phòng học, phòng thực hành, kho và thiết bị bố trí',
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _search,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            labelText: 'Tìm tên hoặc mã phòng',
            prefixIcon: Padding(
              padding: const EdgeInsets.all(13),
              child: RuoVectorIcon(
                RuoIcon.search,
                size: 18,
                color: scheme.onSurfaceVariant,
              ),
            ),
            suffixIcon: Padding(
              padding: const EdgeInsets.only(right: 6),
              child: TextButton(
                onPressed: () => setState(() => _query = _search.text.trim()),
                child: const Text('Tìm'),
              ),
            ),
          ),
          onSubmitted: (text) => setState(() => _query = text.trim()),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _Filter(
              label: 'Tầng',
              selected: _floor,
              entries: {for (var i = 1; i <= 5; i++) '$i': 'Tầng $i'},
              onChanged: (s) => setState(() => _floor = s),
            ),
            _Filter(
              label: 'Loại phòng',
              selected: _type,
              entries: roomTypeNames,
              onChanged: (s) => setState(() => _type = s),
            ),
            _Filter(
              label: 'Trạng thái',
              selected: _status,
              entries: roomStatusNames,
              onChanged: (s) => setState(() => _status = s),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            if (widget.api.isAdmin)
              FilledButton.icon(
                onPressed: _create,
                icon: const RuoVectorIcon(
                  RuoIcon.plus,
                  size: 16,
                  color: Colors.white,
                ),
                label: const Text('Thêm phòng'),
              ),
            OutlinedButton.icon(
              onPressed: _reload,
              icon: const RuoVectorIcon(RuoIcon.refresh, size: 16),
              label: const Text('Làm mới'),
            ),
            if ([_query, _floor, _type, _status].any((s) => s.isNotEmpty))
              TextButton(
                onPressed: () {
                  _search.clear();
                  setState(() {
                    _query = '';
                    _floor = '';
                    _type = '';
                    _status = '';
                  });
                },
                child: const Text('Xóa bộ lọc'),
              ),
          ],
        ),
        const SizedBox(height: 16),
        AsyncPanel(
          key: ValueKey('$_query/$_floor/$_type/$_status/$_revision'),
          load: () => widget.api.get('/facilities/rooms', {
            if (_query.isNotEmpty) 'q': _query,
            if (_floor.isNotEmpty) 'floor': _floor,
            if (_type.isNotEmpty) 'room_type': _type,
            if (_status.isNotEmpty) 'status': _status,
          }),
          builder: (data) {
            final rooms = asList(data['rooms']);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${rooms.length} phòng',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 10),
                if (rooms.isEmpty)
                  const EmptyNotice(
                    'Không có phòng phù hợp. Thử thay đổi bộ lọc.',
                    icon: RuoIcon.door,
                  ),
                for (final room in rooms)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: DataCard(
                      title: '${value(room['code'])} · ${value(room['name'])}',
                      subtitle:
                          'Tầng ${value(room['floor'])} · ${roomTypeNames[room['room_type']] ?? value(room['room_type'])} · ${value(room['capacity'])} chỗ',
                      trailing: StatusBadge(value(room['status'])),
                      onTap: () => _openRoom(room),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _Filter extends StatelessWidget {
  const _Filter({
    required this.label,
    required this.selected,
    required this.entries,
    required this.onChanged,
  });
  final String label, selected;
  final Map<String, String> entries;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 164,
    child: DropdownButtonFormField<String>(
      key: ValueKey('$label:$selected'),
      initialValue: selected,
      isExpanded: true,
      icon: const RuoVectorIcon(RuoIcon.chevronDown, size: 16),
      decoration: InputDecoration(labelText: label),
      items: [
        const DropdownMenuItem(value: '', child: Text('Tất cả')),
        for (final e in entries.entries)
          DropdownMenuItem(value: e.key, child: Text(e.value)),
      ],
      onChanged: (s) => onChanged(s ?? ''),
    ),
  );
}

class CadPage extends StatefulWidget {
  const CadPage({super.key, required this.api});
  final RuoApi api;
  @override
  State<CadPage> createState() => _CadPageState();
}

class _CadPageState extends State<CadPage> {
  int _floor = 1, _revision = 0;

  Future<void> _preview(Json room) async {
    final equipments = asList(room['equipments']);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(sheetContext).height * .68,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 4, 24, 28),
            children: [
              SectionTitle(
                '${value(room['code'])} · ${value(room['name'])}',
                eyebrow: 'THẺ TƯƠNG TÁC Ô PHÒNG (UC-2.7)',
                subtitle:
                    '${value(room['capacity'])} chỗ · ${roomTypeNames[room['room_type']] ?? value(room['room_type'])}',
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  StatusBadge(
                    value(
                      room['effectiveStatus'],
                      fallback: value(room['status']),
                    ),
                  ),
                  _StatChip(
                    '${value(room['equipmentCount'], fallback: '0')} thiết bị',
                  ),
                  _StatChip(
                    '${value(room['brokenCount'], fallback: '0')} cần xử lý',
                  ),
                  _StatChip(
                    '${value(room['openReportCount'], fallback: '0')} phiếu mở',
                  ),
                ],
              ),
              const SizedBox(height: 18),
              if (equipments.isEmpty)
                const EmptyNotice('Phòng chưa có thiết bị đang sử dụng.'),
              for (final item in equipments)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: DataCard(
                    title: value(item['name']),
                    subtitle: '${value(item['code'])} · Chạm để báo hỏng SLA',
                    trailing: StatusBadge(value(item['status'])),
                    onTap: () {
                      showDialog<void>(
                        context: context,
                        builder: (_) => ReportIncidentDialog(
                          api: widget.api,
                          equipment: {
                            ...item,
                            'room_code': value(room['code']),
                          },
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () {
                        Navigator.pop(sheetContext);
                        _openDetail(room);
                      },
                      icon: const RuoVectorIcon(
                        RuoIcon.door,
                        size: 16,
                        color: Colors.white,
                      ),
                      label: const Text('Chi tiết phòng'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(sheetContext);
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => Scaffold(
                              appBar: AppBar(
                                title: Text(
                                  'Kiểm kê phòng ${value(room['code'])}',
                                ),
                              ),
                              body: ClassroomAuditPage(
                                api: widget.api,
                                initialRoomCode: value(room['code']),
                              ),
                            ),
                          ),
                        );
                      },
                      icon: const RuoVectorIcon(RuoIcon.inventory, size: 16),
                      label: const Text('Kiểm kê'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openDetail(Json room) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            RoomDetailPage(api: widget.api, code: value(room['code'])),
      ),
    );
    if (mounted) setState(() => _revision++);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        SectionTitle(
          'Giám sát phòng theo tầng · Tòa A1',
          eyebrow: 'ĐIỀU HÀNH KHÔNG GIAN · 5 TẦNG',
          subtitle:
              floorTitles[_floor] ??
              'Chọn tầng 1–5 · Chạm vào thẻ phòng để xem thiết bị & báo hỏng nhanh',
          trailing: IconButton(
            tooltip: 'Cập nhật trạng thái phòng',
            onPressed: () => setState(() => _revision++),
            icon: RuoVectorIcon(
              RuoIcon.refresh,
              size: 18,
              color: scheme.primary,
            ),
          ),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 1; i <= 5; i++)
              ChoiceChip(
                label: Text('Tầng $i'),
                selected: _floor == i,
                showCheckmark: false,
                onSelected: (_) => setState(() => _floor = i),
              ),
          ],
        ),
        const SizedBox(height: 14),
        AsyncPanel(
          key: ValueKey('cad/$_floor/$_revision'),
          load: () => widget.api.get('/facilities/cad-canvas', {
            'buildingCode': 'A1',
            'floorNumber': '$_floor',
          }),
          builder: (data) {
            final rooms = asList(data['rooms'])
              ..sort((a, b) => value(a['code']).compareTo(value(b['code'])));
            final alerts = asMap(data['floorAlerts']);
            final current = asMap(alerts['$_floor']);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 16,
                  ),
                  decoration: BoxDecoration(
                    color: dark ? const Color(0xFF1E293B) : const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: dark
                          ? RuoTokens.brand400.withValues(alpha: 0.45)
                          : RuoTokens.brand300,
                      width: 1.4,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: RuoTokens.brand600.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const RuoVectorIcon(
                          RuoIcon.door,
                          size: 22,
                          color: RuoTokens.brand600,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'TẦNG $_floor · TÒA NHÀ A1',
                              style: TextStyle(
                                color: scheme.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.1,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${rooms.length} phòng hoạt động · ${value(current['openReportCount'], fallback: '0')} phiếu sự cố đang mở',
                              style: TextStyle(
                                color: scheme.onSurface,
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (current['hasAlert'] == true)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: RuoTokens.rose600.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: RuoTokens.rose600),
                          ),
                          child: Text(
                            '${value(current['alertRoomCount'], fallback: '1')} cảnh báo',
                            style: const TextStyle(
                              color: RuoTokens.rose600,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                if (rooms.isEmpty)
                  const EmptyNotice(
                    'Chưa có phòng được khai báo trên tầng này.',
                  ),
                if (rooms.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: dark
                          ? RuoTokens.darkSurface
                          : RuoTokens.lightSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: scheme.outlineVariant),
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            'DANH SÁCH PHÒNG TẦNG $_floor · CHẠM ĐỂ XEM THIẾT BỊ & THAO TÁC',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        for (
                          var row = 0;
                          row < (rooms.length / 2).ceil();
                          row++
                        )
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: _RoomPod(
                                    room: rooms[row * 2],
                                    onTap: () => _preview(rooms[row * 2]),
                                  ),
                                ),
                                Container(
                                  width: 14,
                                  height: 142,
                                  alignment: Alignment.center,
                                  child: Container(
                                    width: 1.5,
                                    height: 112,
                                    color: scheme.outlineVariant,
                                  ),
                                ),
                                Expanded(
                                  child: row * 2 + 1 < rooms.length
                                      ? _RoomPod(
                                          room: rooms[row * 2 + 1],
                                          onTap: () =>
                                              _preview(rooms[row * 2 + 1]),
                                        )
                                      : const SizedBox.shrink(),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                const SizedBox(height: 12),
                const Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    StatusBadge('available'),
                    StatusBadge('maintenance'),
                    StatusBadge('inactive'),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'Trạng thái hiển thị phản ánh tình trạng phòng và thiết bị hỏng/đang sửa. Phòng ngừng sử dụng luôn giữ trạng thái ngừng sử dụng.',
                  style: TextStyle(
                    fontSize: 12,
                    color: scheme.onSurfaceVariant,
                    height: 1.4,
                  ),
                ),
                if (alerts.entries.any(
                  (e) => asMap(e.value)['hasAlert'] == true,
                ))
                  Padding(
                    padding: const EdgeInsets.only(top: 14),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final e in alerts.entries)
                          if (asMap(e.value)['hasAlert'] == true)
                            ActionChip(
                              avatar: const RuoVectorIcon(
                                RuoIcon.alert,
                                size: 15,
                                color: RuoTokens.brand500,
                              ),
                              label: Text(
                                'Tầng ${e.key}: ${value(asMap(e.value)['alertRoomCount'])} phòng cần chú ý',
                              ),
                              onPressed: () => setState(
                                () => _floor = int.tryParse(e.key) ?? _floor,
                              ),
                            ),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _RoomPod extends StatelessWidget {
  const _RoomPod({required this.room, required this.onTap});
  final Json room;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final effective = value(
      room['effectiveStatus'],
      fallback: value(room['status'], fallback: 'available'),
    );
    final broken = room['brokenCount'] is num
        ? (room['brokenCount'] as num).toInt()
        : 0;
    final hasAlert = room['hasAlert'] == true || broken > 0;

    return Semantics(
      button: true,
      label:
          'Phòng ${value(room['code'])}, ${value(room['equipmentCount'], fallback: '0')} thiết bị',
      child: Material(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            constraints: const BoxConstraints(minHeight: 144),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(
                color: hasAlert
                    ? RuoTokens.brand500.withValues(alpha: 0.65)
                    : scheme.outlineVariant,
                width: hasAlert ? 1.4 : 1.0,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        value(room['code']),
                        style: TextStyle(
                          fontSize: 17.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.3,
                          color: scheme.onSurface,
                        ),
                      ),
                    ),
                    if (hasAlert)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: broken > 0
                              ? const Color(0xFFEF4444)
                              : RuoTokens.brand500,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  value(room['name']),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: scheme.onSurfaceVariant,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${value(room['equipmentCount'], fallback: '0')} TB · ${value(room['brokenCount'], fallback: '0')} cần xử lý',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                StatusBadge(effective),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class RoomDetailPage extends StatefulWidget {
  const RoomDetailPage({super.key, required this.api, required this.code});
  final RuoApi api;
  final String code;
  @override
  State<RoomDetailPage> createState() => _RoomDetailPageState();
}

class _RoomDetailPageState extends State<RoomDetailPage> {
  int _revision = 0;
  bool _busy = false;
  String? _error;
  List<Json> _blockers = const [];

  Future<void> _edit(Json room) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RoomFormPage(api: widget.api, room: room),
      ),
    );
    if (mounted && changed == true) {
      setState(() {
        _error = null;
        _blockers = const [];
        _revision++;
      });
    }
  }

  Future<void> _status(Json room, {bool deactivate = false}) async {
    var note = '';
    String selected = deactivate
        ? 'inactive'
        : (room['status'] == 'available' ? 'maintenance' : 'available');
    final decision = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: Text(
            deactivate
                ? 'Ngừng sử dụng ${value(room['code'])}?'
                : 'Đổi trạng thái phòng',
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!deactivate)
                  DropdownButtonFormField<String>(
                    initialValue: selected,
                    isExpanded: true,
                    icon: const RuoVectorIcon(RuoIcon.chevronDown, size: 16),
                    decoration: const InputDecoration(
                      labelText: 'Trạng thái mới',
                    ),
                    items: [
                      for (final e in roomStatusNames.entries)
                        if (e.key != room['status'])
                          DropdownMenuItem(value: e.key, child: Text(e.value)),
                    ],
                    onChanged: (s) => update(() => selected = s ?? selected),
                  ),
                const SizedBox(height: 12),
                const Text(
                  'Phòng chỉ được ngừng sử dụng sau khi toàn bộ thiết bị đang hiện diện đã được điều chuyển ra ngoài.',
                ),
                const SizedBox(height: 12),
                TextField(
                  onChanged: (text) => note = text.trim(),
                  maxLength: 500,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Lý do (không bắt buộc)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Xác nhận'),
            ),
          ],
        ),
      ),
    );
    if (decision != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
      _blockers = const [];
    });
    try {
      final path =
          '/facilities/rooms/${room['_id']}/${deactivate ? 'deactivate' : 'status'}';
      final result = await widget.api.send('PUT', path, {
        'reason': note,
        if (!deactivate) 'status': selected,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            value(result['message'], fallback: 'Đã cập nhật phòng.'),
          ),
        ),
      );
      setState(() => _revision++);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = '$e';
          _blockers = extractEquipmentBlockers(e);
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leadingWidth: 96,
        leading: TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Quay lại'),
        ),
        title: Text(
          widget.code,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          if (_busy)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: LinearProgressIndicator(),
            ),
          if (_error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: scheme.error.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: scheme.error.withValues(alpha: 0.45)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RuoVectorIcon(
                        RuoIcon.alert,
                        size: 18,
                        color: scheme.error,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: TextStyle(
                            color: scheme.error,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_blockers.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      'Thiết bị cần điều chuyển (${_blockers.length}):',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: scheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 6),
                    for (final b in _blockers)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: scheme.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: scheme.outlineVariant),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${value(b['code'])} · ${value(b['name'])}',
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              StatusBadge(
                                b['pendingMovement'] != null
                                    ? 'pending'
                                    : value(b['status']),
                                labelOverride: b['pendingMovement'] != null
                                    ? 'Đang chờ điều chuyển'
                                    : null,
                              ),
                            ],
                          ),
                        ),
                      ),
                    Text(
                      'Theo phân quyền RACI: Quản lý CSVC tạo phiếu điều chuyển thiết bị sang phòng khác hoặc kho trước khi ngừng sử dụng.',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          AsyncPanel(
            key: ValueKey(_revision),
            load: () => widget.api.get(
              '/facilities/rooms/${Uri.encodeComponent(widget.code)}',
            ),
            builder: (data) {
              final room = asMap(data['room']);
              final summary = asMap(data['summary']);
              final equipments = asList(data['equipments']);
              final areaRaw = '${room['area'] ?? ''}'.trim();
              final deptRaw = '${room['department'] ?? ''}'.trim();
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SectionTitle(
                    value(room['name']),
                    eyebrow:
                        'TÒA ${value(room['building'], fallback: 'A1')} · TẦNG ${value(room['floor'])}',
                    subtitle:
                        roomTypeNames[room['room_type']] ??
                        value(room['room_type']),
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: StatusBadge(value(room['status'])),
                  ),
                  const SizedBox(height: 14),
                  DataCard(
                    title:
                        '${value(room['capacity'])} chỗ${areaRaw.isNotEmpty ? ' · $areaRaw m²' : ''}',
                    subtitle: deptRaw.isNotEmpty ? deptRaw : null,
                    child: Text(
                      value(
                        room['description'],
                        fallback: 'Chưa có mô tả chức năng.',
                      ),
                    ),
                  ),
                  if (widget.api.isAdmin)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          FilledButton.icon(
                            onPressed: _busy ? null : () => _edit(room),
                            icon: const RuoVectorIcon(
                              RuoIcon.edit,
                              size: 16,
                              color: Colors.white,
                            ),
                            label: const Text('Sửa thông tin'),
                          ),
                          OutlinedButton.icon(
                            onPressed: _busy ? null : () => _status(room),
                            icon: const RuoVectorIcon(
                              RuoIcon.refresh,
                              size: 16,
                            ),
                            label: const Text('Đổi trạng thái'),
                          ),
                          if (room['status'] != 'inactive')
                            TextButton(
                              onPressed: _busy
                                  ? null
                                  : () => _status(room, deactivate: true),
                              child: const Text('Ngừng sử dụng'),
                            ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),
                  SectionTitle(
                    'Thiết bị trong phòng',
                    subtitle:
                        '${value(summary['equipmentCount'], fallback: '0')} thiết bị · ${value(summary['needsAttention'], fallback: '0')} cần chú ý · ${value(summary['openRepairs'], fallback: '0')} ca sửa đang mở',
                  ),
                  if (equipments.isEmpty)
                    const EmptyNotice('Chưa có thiết bị trong phòng này.'),
                  for (final equipment in equipments)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: DataCard(
                        title: value(equipment['name']),
                        subtitle:
                            '${value(equipment['code'])} · ${value(asMap(equipment['category_id'])['name'])} · ${money(equipment['price'])}',
                        trailing: StatusBadge(value(equipment['status'])),
                        child: SelectableText(
                          'Serial: ${value(equipment['serial_number'])} · QR: ${value(equipment['qr_code'])}',
                          style: TextStyle(
                            fontSize: 12,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  const SectionTitle(
                    'Lịch sử bảo dưỡng định kỳ',
                    subtitle:
                        'Các kết quả checklist đã được ghi nhận cho phòng.',
                  ),
                  AsyncPanel(
                    key: ValueKey('maintenance-history-$_revision'),
                    load: () => widget.api.get(
                      '/facilities/rooms/${Uri.encodeComponent(widget.code)}/maint-history',
                    ),
                    builder: (history) {
                      final records = asList(history['maintenanceHistory']);
                      if (records.isEmpty) {
                        return const EmptyNotice(
                          'Chưa có kết quả bảo dưỡng định kỳ được ghi nhận.',
                          icon: RuoIcon.check,
                        );
                      }
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final record in records)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: DataCard(
                                title: value(
                                  asMap(record['plan_id'])['title'],
                                  fallback: 'Bảo dưỡng định kỳ',
                                ),
                                subtitle:
                                    '${value(asMap(record['equipment_id'])['code'])} · ${value(asMap(record['equipment_id'])['name'])} · ${formatVnDate(record['check_date'], fallback: '—')}',
                                trailing: StatusBadge(
                                  value(record['status']),
                                  labelOverride: record['status'] == 'passed'
                                      ? 'Đạt'
                                      : record['status'] == 'failed'
                                      ? 'Phát hiện lỗi'
                                      : null,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    for (final result in asList(
                                      record['checklist_results'],
                                    ))
                                      Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 4,
                                        ),
                                        child: Text(
                                          '${result['passed'] == true ? '✓' : '✕'} ${value(result['item'])}${value(result['notes'], fallback: '').isEmpty ? '' : ' — ${result['notes']}'}',
                                        ),
                                      ),
                                    if (value(
                                      record['notes'],
                                      fallback: '',
                                    ).isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 4),
                                        child: Text(
                                          'Ghi chú: ${record['notes']}',
                                        ),
                                      ),
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        'Người kiểm tra: ${value(asMap(record['checked_by'])['full_name'])}',
                                      ),
                                    ),
                                    if (asMap(record['repair_id']).isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 4),
                                        child: Text(
                                          'Phiếu sửa chữa phát sinh: ${value(asMap(record['repair_id'])['ticket_code'])}',
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  SectionTitle(
                    'Lịch sử sửa chữa',
                    subtitle:
                        'Tối đa ${value(data['historyLimit'], fallback: '20')} sự kiện gần nhất',
                  ),
                  if (asList(data['maintenanceHistory']).isEmpty)
                    const EmptyNotice(
                      'Chưa có lịch sử sửa chữa.',
                      icon: RuoIcon.wrench,
                    ),
                  for (final item in asList(data['maintenanceHistory']))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: DataCard(
                        title: value(item['ticket_code']),
                        subtitle:
                            '${value(asMap(item['equipment_id'])['name'])} · ${formatVnDate(item['reported_at'], fallback: '—')}',
                        trailing: StatusBadge(value(item['status'])),
                        child: Text(
                          '${value(item['incident_description'])}\nPhụ trách: ${value(asMap(item['assigned_to'])['full_name'], fallback: value(asMap(item['repair_unit_id'])['name'], fallback: 'Chưa phân công'))} · Chi phí: ${money(item['total_cost'])}',
                          style: const TextStyle(fontSize: 12.5, height: 1.45),
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  const SectionTitle('Lịch sử điều chuyển'),
                  if (asList(data['movementHistory']).isEmpty)
                    const EmptyNotice(
                      'Chưa có lịch sử điều chuyển.',
                      icon: RuoIcon.transfer,
                    ),
                  for (final item in asList(data['movementHistory']))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: DataCard(
                        title: value(asMap(item['equipment_id'])['name']),
                        subtitle:
                            '${value(asMap(item['from_room_id'])['code'], fallback: 'Kho / bên ngoài')} → ${value(asMap(item['to_room_id'])['code'], fallback: 'Kho / bên ngoài')} · ${formatVnDate(item['created_at'], fallback: '—')}',
                        trailing: StatusBadge(value(item['status'])),
                        child: Text(
                          value(item['reason']),
                          style: const TextStyle(fontSize: 12.5),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class RoomFormPage extends StatefulWidget {
  const RoomFormPage({super.key, required this.api, this.room});
  final RuoApi api;
  final Json? room;
  @override
  State<RoomFormPage> createState() => _RoomFormPageState();
}

class _RoomFormPageState extends State<RoomFormPage> {
  late final TextEditingController _code, _name, _capacity, _description;
  late String _type;
  late int _floor;
  String _lastSyncedCode = '';
  Map<String, String> _errors = {};
  String? _error;
  bool _saving = false;
  bool get creating => widget.room == null;

  @override
  void initState() {
    super.initState();
    _code = TextEditingController(text: '${widget.room?['code'] ?? ''}');
    _name = TextEditingController(text: '${widget.room?['name'] ?? ''}');
    _capacity = TextEditingController(
      text: '${widget.room?['capacity'] ?? ''}',
    );
    _description = TextEditingController(
      text: '${widget.room?['description'] ?? ''}',
    );
    final rawType = '${widget.room?['room_type'] ?? 'lecture'}';
    _type = roomTypeNames.containsKey(rawType) ? rawType : 'lecture';
    final rawFloor = widget.room?['floor'];
    _floor = rawFloor is num
        ? rawFloor.toInt().clamp(1, 5)
        : (int.tryParse('$rawFloor') ?? 1).clamp(1, 5);
    _lastSyncedCode = _code.text.trim().toUpperCase();
    _code.addListener(_syncFloorFromCode);
  }

  void _syncFloorFromCode() {
    if (!creating) return;
    final clean = _code.text.trim().toUpperCase();
    if (clean == _lastSyncedCode) return;
    _lastSyncedCode = clean;
    final match = RegExp(r'^P([1-5])').firstMatch(clean);
    if (match != null) {
      final parsed = int.parse(match.group(1)!);
      if (parsed != _floor && mounted) {
        setState(() => _floor = parsed);
      }
    }
  }

  @override
  void dispose() {
    _code.removeListener(_syncFloorFromCode);
    for (final c in [_code, _name, _capacity, _description]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !widget.api.isAdmin) return;
    final draft = <String, dynamic>{
      'code': _code.text,
      'floor': _floor,
      'name': _name.text,
      'capacity': _capacity.text,
      'room_type': _type,
      'description': _description.text,
    };
    final errors = validateRoomDraft(draft, creating: creating);
    setState(() {
      _errors = errors;
      _error = null;
    });
    if (errors.isNotEmpty) return;

    final code = _code.text.trim().toUpperCase();
    final trimmedName = _name.text.trim();
    final parsedCapacity = int.parse(_capacity.text.trim());
    final trimmedDesc = _description.text.trim();

    if (!creating) {
      final unchanged =
          trimmedName == '${widget.room?['name'] ?? ''}'.trim() &&
          _type == '${widget.room?['room_type'] ?? ''}' &&
          parsedCapacity == widget.room?['capacity'] &&
          trimmedDesc == '${widget.room?['description'] ?? ''}'.trim();
      if (unchanged) {
        Navigator.pop(context, false);
        return;
      }
    }

    final body = <String, dynamic>{
      'name': trimmedName,
      'room_type': _type,
      'capacity': parsedCapacity,
      'description': trimmedDesc,
      if (creating) ...{'code': code, 'building': 'A1', 'floor': _floor},
    };
    setState(() => _saving = true);
    try {
      await widget.api.send(
        creating ? 'POST' : 'PUT',
        creating
            ? '/facilities/rooms'
            : '/facilities/rooms/${widget.room!['_id']}',
        body,
      );
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) {
        final serverErrors = asMap(e.details['errors']);
        setState(() {
          _error = e.message;
          if (serverErrors.isNotEmpty) {
            _errors = {
              ..._errors,
              for (final entry in serverErrors.entries)
                entry.key: '${entry.value}',
            };
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // IMPORTANT: Keep exact 4 TextField widgets in order:
    // 0: code, 1: name, 2: capacity, 3: description.
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leadingWidth: 88,
        leading: TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: const Text('Hủy'),
        ),
        title: Text(creating ? 'Thêm phòng' : 'Sửa phòng'),
      ),
      body: !widget.api.isAdmin
          ? const Center(
              child: Text('Chỉ quản trị viên được sửa danh mục phòng.'),
            )
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: scheme.primary.withValues(alpha: 0.35),
                        ),
                      ),
                      child: Text(
                        'TÒA NHÀ A1 · CỐ ĐỊNH',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: scheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Mỗi tầng (1–5) quản lý phòng 01–08. Mã phòng, tòa nhà và tầng không thay đổi sau khi tạo.',
                  style: TextStyle(
                    fontSize: 13,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: _code,
                  enabled: creating && !_saving,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    labelText: 'Mã phòng',
                    hintText: 'P101',
                    errorText: _errors['code'],
                  ),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<int>(
                  key: ValueKey('room-floor-$_floor'),
                  initialValue: _floor,
                  isExpanded: true,
                  icon: const RuoVectorIcon(RuoIcon.chevronDown, size: 16),
                  decoration: InputDecoration(
                    labelText: 'Tầng (1–5)',
                    errorText: _errors['floor'],
                  ),
                  items: [
                    for (var f = 1; f <= 5; f++)
                      DropdownMenuItem(value: f, child: Text('Tầng $f')),
                  ],
                  onChanged: (!creating || _saving)
                      ? null
                      : (f) => setState(() => _floor = f ?? _floor),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _name,
                  enabled: !_saving,
                  maxLength: 120,
                  decoration: InputDecoration(
                    labelText: 'Tên phòng',
                    errorText: _errors['name'],
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  isExpanded: true,
                  icon: const RuoVectorIcon(RuoIcon.chevronDown, size: 16),
                  decoration: InputDecoration(
                    labelText: 'Loại phòng',
                    errorText: _errors['room_type'],
                  ),
                  items: [
                    for (final e in roomTypeNames.entries)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  onChanged: _saving
                      ? null
                      : (s) => setState(() => _type = s ?? _type),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _capacity,
                  enabled: !_saving,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Sức chứa (1–500)',
                    errorText: _errors['capacity'],
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _description,
                  enabled: !_saving,
                  maxLength: 500,
                  maxLines: 4,
                  decoration: InputDecoration(
                    labelText: 'Chức năng phòng',
                    errorText: _errors['description'],
                  ),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: scheme.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Đang lưu…' : 'Lưu phòng'),
                ),
              ],
            ),
    );
  }
}
