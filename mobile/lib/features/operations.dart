import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/vectors.dart';

class OperationsPage extends StatefulWidget {
  const OperationsPage({super.key, required this.api});
  final RuoApi api;

  @override
  State<OperationsPage> createState() => _OperationsPageState();
}

class _OperationsPageState extends State<OperationsPage> {
  late String _section;

  String get _role => value(widget.api.user?['role'], fallback: '');

  List<(String, String)> get _sections {
    final sections = <(String, String)>[];
    if (_role == 'admin') sections.add(('catalog', 'Danh mục'));
    if (_role != 'lecturer') sections.add(('transfers', 'Điều chuyển'));
    if (_role == 'technician' || _role == 'facility_manager') {
      sections.add(('maintenance', 'Bảo dưỡng'));
    }
    if (_role != 'lecturer') sections.add(('disposals', 'Thanh lý'));
    sections.add(('inventory', 'Kiểm kê & QR'));
    return sections;
  }

  @override
  void initState() {
    super.initState();
    _section = _sections.first.$1;
  }

  @override
  Widget build(BuildContext context) {
    final sections = _sections;
    if (!sections.any((item) => item.$1 == _section)) {
      _section = sections.first.$1;
    }
    return Column(
      children: [
        SizedBox(
          height: 58,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            scrollDirection: Axis.horizontal,
            itemCount: sections.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final item = sections[index];
              return ChoiceChip(
                label: Text(item.$2),
                selected: _section == item.$1,
                onSelected: (_) => setState(() => _section = item.$1),
              );
            },
          ),
        ),
        Expanded(
          child: switch (_section) {
            'catalog' => CatalogPage(api: widget.api),
            'transfers' => TransfersPage(api: widget.api),
            'maintenance' => MaintenancePage(api: widget.api),
            'disposals' => DisposalsPage(api: widget.api),
            _ => InventoryPage(api: widget.api),
          },
        ),
      ],
    );
  }
}

class CatalogPage extends StatefulWidget {
  const CatalogPage({super.key, required this.api});
  final RuoApi api;

  @override
  State<CatalogPage> createState() => _CatalogPageState();
}

class _CatalogPageState extends State<CatalogPage> {
  String _kind = 'categories';
  int _revision = 0;

  static const _kinds = <String, (String, String)>{
    'categories': ('Loại thiết bị', 'categories'),
    'buildings': ('Tòa nhà', 'buildings'),
    'suppliers': ('Nhà cung cấp', 'suppliers'),
    'repair-units': ('Đơn vị sửa chữa', 'repairUnits'),
  };

  Map<String, String> _fields(String kind) => switch (kind) {
    'categories' => {
      'code': 'Mã danh mục',
      'name': 'Tên danh mục',
      'description': 'Mô tả',
      'depreciation_rate': 'Khấu hao (%/năm)',
    },
    'buildings' => {
      'code': 'Mã tòa nhà',
      'name': 'Tên tòa nhà',
      'campusZone': 'Khuôn viên',
      'totalFloors': 'Số tầng',
      'description': 'Mô tả',
    },
    'suppliers' => {
      'code': 'Mã nhà cung cấp',
      'name': 'Tên nhà cung cấp',
      'contact_person': 'Người liên hệ',
      'phone': 'Điện thoại',
      'email': 'Email',
      'address': 'Địa chỉ',
    },
    _ => {
      'code': 'Mã đơn vị',
      'name': 'Tên đơn vị',
      'specialty': 'Chuyên môn',
      'contact_person': 'Người liên hệ',
      'phone': 'Điện thoại',
      'email': 'Email',
      'address': 'Địa chỉ',
    },
  };

  Future<void> _edit([Json? record]) async {
    final fields = _fields(_kind);
    final controllers = <String, TextEditingController>{
      for (final field in fields.keys)
        field: TextEditingController(text: value(record?[field], fallback: '')),
    };
    final formKey = GlobalKey<FormState>();
    final result = await showDialog<Json>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(
          record == null
              ? 'Thêm ${_kinds[_kind]!.$1}'
              : 'Cập nhật ${_kinds[_kind]!.$1}',
        ),
        content: SizedBox(
          width: 440,
          child: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final entry in fields.entries)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: TextFormField(
                        controller: controllers[entry.key],
                        keyboardType:
                            const {
                              'depreciation_rate',
                              'totalFloors',
                            }.contains(entry.key)
                            ? TextInputType.number
                            : TextInputType.text,
                        enabled: !(record != null && entry.key == 'code'),
                        decoration: InputDecoration(labelText: entry.value),
                        validator: (raw) {
                          final text = (raw ?? '').trim();
                          if (record == null &&
                              const {'code', 'name'}.contains(entry.key) &&
                              text.isEmpty) {
                            return 'Trường này là bắt buộc.';
                          }
                          if (entry.key == 'email' &&
                              text.isNotEmpty &&
                              !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                                  .hasMatch(text)) {
                            return 'Email chưa đúng định dạng.';
                          }
                          if (const {
                                'depreciation_rate',
                                'totalFloors',
                              }.contains(entry.key) &&
                              text.isNotEmpty &&
                              num.tryParse(text) == null) {
                            return 'Nhập giá trị số hợp lệ.';
                          }
                          return null;
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () {
              if (!formKey.currentState!.validate()) return;
              final body = <String, dynamic>{};
              for (final entry in controllers.entries) {
                final text = entry.value.text.trim();
                if (const {
                  'depreciation_rate',
                  'totalFloors',
                }.contains(entry.key)) {
                  body[entry.key] = num.tryParse(text);
                } else {
                  body[entry.key] = text;
                }
              }
              Navigator.pop(dialogContext, body);
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    for (final controller in controllers.values) {
      controller.dispose();
    }
    if (result == null || !mounted) return;
    await _perform(() async {
      final path = '/admin/${_kind == 'repair-units' ? 'repair-units' : _kind}';
      if (record == null) {
        await widget.api.send('POST', path, result);
      } else {
        await widget.api.send('PUT', '$path/${record['_id']}', result);
      }
    });
  }

  Future<void> _delete(Json record) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Xóa danh mục?'),
        content: Text(
          'Bạn chắc chắn muốn xóa ${value(record['name'])}? Nếu dữ liệu đang được sử dụng, hệ thống sẽ từ chối.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (approved != true) return;
    await _perform(
      () => widget.api.send('DELETE', '/admin/$_kind/${record['_id']}'),
    );
  }

  Future<void> _perform(Future<void> Function() action) async {
    try {
      await action();
      if (!mounted) return;
      setState(() => _revision++);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Đã lưu thay đổi.')));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final kindData = _kinds[_kind]!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
      children: [
        SectionTitle(
          kindData.$1,
          eyebrow: 'MASTER DATA · ADMIN',
          subtitle: 'Quản lý danh mục được dùng trong hệ thống Ruo.',
          trailing: IconButton(
            tooltip: 'Tải lại',
            onPressed: () => setState(() => _revision++),
            icon: const RuoVectorIcon(RuoIcon.refresh, size: 19),
          ),
        ),
        Wrap(
          spacing: 8,
          children: [
            for (final entry in _kinds.entries)
              ChoiceChip(
                label: Text(entry.value.$1),
                selected: _kind == entry.key,
                onSelected: (_) => setState(() => _kind = entry.key),
              ),
          ],
        ),
        const SizedBox(height: 10),
        Align(
          alignment: Alignment.centerLeft,
          child: FilledButton.icon(
            onPressed: () => _edit(),
            icon: const Icon(Icons.add),
            label: Text('Thêm ${kindData.$1.toLowerCase()}'),
          ),
        ),
        const SizedBox(height: 8),
        AsyncPanel(
          key: ValueKey('catalog-$_kind-$_revision'),
          load: () => widget.api.get('/admin/$_kind'),
          builder: (data) {
            final records = asList(data[kindData.$2]);
            if (records.isEmpty) {
              return const EmptyNotice('Chưa có dữ liệu trong danh mục.');
            }
            return Column(
              children: [
                for (final record in records)
                  Card(
                    child: ListTile(
                      title: Text(
                        value(record['name'], fallback: value(record['code'])),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        '${value(record['code'])} · ${_secondary(record)}',
                      ),
                      isThreeLine: false,
                      trailing: PopupMenuButton<String>(
                        onSelected: (choice) {
                          if (choice == 'edit') _edit(record);
                          if (choice == 'delete') _delete(record);
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(value: 'edit', child: Text('Sửa')),
                          PopupMenuItem(value: 'delete', child: Text('Xóa')),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  String _secondary(Json item) {
    if (_kind == 'categories') {
      return 'Khấu hao ${value(item['depreciation_rate'], fallback: '20')}%/năm';
    }
    if (_kind == 'buildings') {
      return '${value(item['totalFloors'], fallback: '5')} tầng · ${value(item['campusZone'], fallback: 'Khu A')}';
    }
    return value(
      item['phone'],
      fallback: value(
        item['email'],
        fallback: value(item['specialty'], fallback: '—'),
      ),
    );
  }
}

class TransfersPage extends StatefulWidget {
  const TransfersPage({super.key, required this.api});
  final RuoApi api;

  @override
  State<TransfersPage> createState() => _TransfersPageState();
}

class _TransfersPageState extends State<TransfersPage> {
  int _revision = 0;
  bool _showPending = true;
  String get _role => value(widget.api.user?['role'], fallback: '');
  bool get _canRequest => _role == 'technician' || _role == 'facility_manager';
  bool get _canApprove => _role == 'facility_manager';
  bool get _canComplete => _role == 'technician';

  Future<void> _refresh() async {
    if (mounted) setState(() => _revision++);
  }

  Future<void> _create() async {
    try {
      final responses = await Future.wait([
        widget.api.get('/equipments', {'limit': '100'}),
        widget.api.get('/facilities/rooms', {'limit': '100'}),
      ]);
      final equipments = asList(responses[0]['equipments']);
      final rooms = asList(responses[1]['rooms']);
      if (!mounted) return;
      if (equipments.isEmpty || rooms.isEmpty) {
        _message('Cần có thiết bị và phòng đích để lập phiếu.');
        return;
      }
      final reason = TextEditingController();
      String equipmentId = value(equipments.first['_id']);
      String roomId = value(rooms.first['_id']);
      final body = await showDialog<Json>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: const Text('Tạo phiếu điều chuyển'),
            content: SizedBox(
              width: 440,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: equipmentId,
                      decoration: const InputDecoration(labelText: 'Thiết bị'),
                      items: equipments
                          .map(
                            (item) => DropdownMenuItem(
                              value: value(item['_id']),
                              child: Text(
                                '${value(item['code'])} · ${value(item['name'])}',
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) =>
                          setDialogState(() => equipmentId = value!),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: roomId,
                      decoration: const InputDecoration(
                        labelText: 'Phòng đích',
                      ),
                      items: rooms
                          .map(
                            (item) => DropdownMenuItem(
                              value: value(item['_id']),
                              child: Text(
                                '${value(item['code'])} · ${value(item['name'])}',
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) =>
                          setDialogState(() => roomId = value!),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: reason,
                      minLines: 2,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Lý do (3–500 ký tự)',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Hủy'),
              ),
              FilledButton(
                onPressed: () {
                  if (reason.text.trim().length < 3) return;
                  Navigator.pop(dialogContext, {
                    'equipment_id': equipmentId,
                    'to_room_id': roomId,
                    'reason': reason.text.trim(),
                  });
                },
                child: const Text('Gửi duyệt'),
              ),
            ],
          ),
        ),
      );
      reason.dispose();
      if (body == null || !mounted) return;
      await _run(() => widget.api.send('POST', '/movements', body));
    } catch (error) {
      if (mounted) _message(error.toString());
    }
  }

  Future<void> _decision(Json movement, {required bool approve}) async {
    var reason = '';
    if (!approve) {
      final controller = TextEditingController();
      final result = await showDialog<String>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Từ chối điều chuyển'),
          content: TextField(
            controller: controller,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Lý do (3–500 ký tự)'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () {
                if (controller.text.trim().length < 3) return;
                Navigator.pop(dialogContext, controller.text.trim());
              },
              child: const Text('Từ chối'),
            ),
          ],
        ),
      );
      controller.dispose();
      if (result == null) return;
      reason = result;
    } else {
      final okay = await _confirm('Phê duyệt phiếu điều chuyển này?');
      if (!okay) return;
    }
    await _run(
      () => widget.api.send(
        'PUT',
        '/movements/${movement['_id']}/${approve ? 'approve' : 'reject'}',
        approve ? {} : {'reason': reason},
      ),
    );
  }

  Future<void> _complete(Json movement) async {
    final controller = TextEditingController();
    final notes = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Xác nhận hoàn tất'),
        content: TextField(
          controller: controller,
          maxLength: 500,
          decoration: const InputDecoration(labelText: 'Ghi chú hoàn tất'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Hoàn tất'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (notes == null) return;
    await _run(
      () => widget.api.send('PUT', '/movements/${movement['_id']}/complete', {
        'notes': notes,
      }),
    );
  }

  Future<bool> _confirm(String text) async =>
      await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          content: Text(text),
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
      ) ??
      false;

  Future<void> _run(Future<Json> Function() action) async {
    try {
      final result = await action();
      if (!mounted) return;
      await _refresh();
      _message(value(result['message'], fallback: 'Đã cập nhật phiếu.'));
    } catch (error) {
      if (mounted) _message(error.toString());
    }
  }

  void _message(String message) =>
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
      children: [
        SectionTitle(
          'Điều chuyển thiết bị',
          eyebrow: 'TRANSFER · UC-4.1 → UC-4.5',
          subtitle: 'Tạo phiếu, phê duyệt, xác nhận và tra cứu lịch sử.',
          trailing: IconButton(
            tooltip: 'Tải lại',
            onPressed: _refresh,
            icon: const RuoVectorIcon(RuoIcon.refresh, size: 19),
          ),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (_canRequest)
              FilledButton.icon(
                onPressed: _create,
                icon: const Icon(Icons.add),
                label: const Text('Tạo phiếu'),
              ),
            if (_canApprove)
              OutlinedButton.icon(
                onPressed: () => setState(() {
                  _showPending = !_showPending;
                  _revision++;
                }),
                icon: Icon(
                  _showPending ? Icons.history : Icons.pending_actions,
                ),
                label: Text(_showPending ? 'Xem lịch sử' : 'Hàng chờ duyệt'),
              ),
          ],
        ),
        const SizedBox(height: 8),
        AsyncPanel(
          key: ValueKey('movements-$_revision-$_showPending'),
          load: () => widget.api.get(
            _canApprove && _showPending ? '/movements/pending' : '/movements',
            _canApprove && _showPending ? null : {'type': 'transfer'},
          ),
          builder: (data) {
            final records = asList(data['movements']);
            if (records.isEmpty) {
              return const EmptyNotice('Không có phiếu điều chuyển phù hợp.');
            }
            return Column(
              children: [
                for (final movement in records)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${_nested(movement['equipment_id'], 'code')} · ${_nested(movement['equipment_id'], 'name')}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              StatusBadge(
                                value(movement['status'], fallback: 'pending'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 7),
                          Text(
                            '${_nested(movement['from_room_id'], 'code', fallback: 'Kho')} → ${_nested(movement['to_room_id'], 'code', fallback: 'Chưa rõ')}\n${value(movement['reason'], fallback: 'Không có lý do')}',
                          ),
                          if (_canApprove &&
                              movement['status'] == 'awaiting_approval')
                            Wrap(
                              spacing: 8,
                              children: [
                                FilledButton(
                                  onPressed: () =>
                                      _decision(movement, approve: true),
                                  child: const Text('Duyệt'),
                                ),
                                OutlinedButton(
                                  onPressed: () =>
                                      _decision(movement, approve: false),
                                  child: const Text('Từ chối'),
                                ),
                              ],
                            ),
                          if (_canComplete && movement['status'] == 'approved')
                            Align(
                              alignment: Alignment.centerRight,
                              child: FilledButton.icon(
                                onPressed: () => _complete(movement),
                                icon: const Icon(Icons.check),
                                label: const Text('Xác nhận hoàn tất'),
                              ),
                            ),
                          if (movement['reject_reason'] != null &&
                              value(
                                movement['reject_reason'],
                                fallback: '',
                              ).isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                'Lý do từ chối: ${movement['reject_reason']}',
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
      ],
    );
  }

  String _nested(dynamic object, String key, {String fallback = '—'}) =>
      object is Map ? value(object[key], fallback: fallback) : fallback;
}

class MaintenancePage extends StatefulWidget {
  const MaintenancePage({super.key, required this.api});
  final RuoApi api;

  @override
  State<MaintenancePage> createState() => _MaintenancePageState();
}

class _MaintenancePageState extends State<MaintenancePage> {
  int _revision = 0;
  String get _role => value(widget.api.user?['role'], fallback: '');

  Future<void> _createPlan() async {
    final title = TextEditingController();
    var floor = 1;
    var frequency = 'monthly';
    final body = await showDialog<Json>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Lập kế hoạch bảo dưỡng'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: title,
                decoration: const InputDecoration(labelText: 'Tên kế hoạch'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                initialValue: floor,
                decoration: const InputDecoration(labelText: 'Tầng tòa A1'),
                items: [
                  for (var i = 1; i <= 5; i++)
                    DropdownMenuItem(value: i, child: Text('Tầng $i')),
                ],
                onChanged: (value) => setDialogState(() => floor = value!),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: frequency,
                decoration: const InputDecoration(labelText: 'Chu kỳ'),
                items: const [
                  DropdownMenuItem(value: 'monthly', child: Text('Hàng tháng')),
                  DropdownMenuItem(value: 'quarterly', child: Text('Hàng quý')),
                ],
                onChanged: (value) => setDialogState(() => frequency = value!),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () {
                if (title.text.trim().length < 3) return;
                Navigator.pop(dialogContext, {
                  'title': title.text.trim(),
                  'building': 'A1',
                  'floor': floor,
                  'frequency': frequency,
                  'start_date': DateTime.now().toIso8601String(),
                });
              },
              child: const Text('Tạo kế hoạch'),
            ),
          ],
        ),
      ),
    );
    title.dispose();
    if (body == null) return;
    await _run(() => widget.api.send('POST', '/maintenance/plans', body));
  }

  Future<void> _logResult(Json plan, List<Json> equipment) async {
    if (equipment.isEmpty) {
      _message('Chưa có thiết bị thuộc phạm vi kế hoạch.');
      return;
    }
    final rawChecklist = plan['checklist'];
    final checklist = rawChecklist is List ? rawChecklist : const [];
    if (checklist.isEmpty) {
      _message('Kế hoạch chưa có checklist để ghi nhận.');
      return;
    }
    var selectedEquipment = value(equipment.first['_id']);
    final passed = <String, bool>{for (final item in checklist) '$item': true};
    final notes = <String, TextEditingController>{
      for (final item in checklist) '$item': TextEditingController(),
    };
    final extraNotes = TextEditingController();
    final result = await showDialog<Json>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Ghi nhận kiểm tra'),
          content: SizedBox(
            width: 480,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: selectedEquipment,
                    decoration: const InputDecoration(labelText: 'Thiết bị'),
                    items: equipment
                        .map(
                          (item) => DropdownMenuItem(
                            value: value(item['_id']),
                            child: Text(
                              '${value(item['code'])} · ${value(item['name'])}',
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (value) =>
                        setDialogState(() => selectedEquipment = value!),
                  ),
                  for (final item in checklist)
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('$item'),
                      subtitle: !passed['$item']!
                          ? TextField(
                              controller: notes['$item'],
                              decoration: const InputDecoration(
                                labelText: 'Ghi rõ dấu hiệu hư hỏng',
                              ),
                            )
                          : null,
                      value: passed['$item']!,
                      onChanged: (value) =>
                          setDialogState(() => passed['$item'] = value),
                    ),
                  TextField(
                    controller: extraNotes,
                    decoration: const InputDecoration(
                      labelText: 'Ghi chú chung',
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () {
                for (final item in checklist) {
                  if (!passed['$item']! &&
                      notes['$item']!.text.trim().isEmpty) {
                    return;
                  }
                }
                Navigator.pop(dialogContext, {
                  'equipment_id': selectedEquipment,
                  'checklist_results': [
                    for (final item in checklist)
                      {
                        'item': '$item',
                        'passed': passed['$item'],
                        'notes': notes['$item']!.text.trim(),
                      },
                  ],
                  'notes': extraNotes.text.trim(),
                });
              },
              child: const Text('Lưu kết quả'),
            ),
          ],
        ),
      ),
    );
    for (final controller in notes.values) {
      controller.dispose();
    }
    extraNotes.dispose();
    if (result == null) return;
    await _run(
      () => widget.api.send(
        'PUT',
        '/maintenance/plans/${plan['_id']}/log',
        result,
      ),
    );
  }

  Future<void> _run(Future<Json> Function() action) async {
    try {
      final response = await action();
      if (!mounted) return;
      setState(() => _revision++);
      _message(value(response['message'], fallback: 'Đã lưu.'));
    } catch (error) {
      if (mounted) _message(error.toString());
    }
  }

  void _message(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
    children: [
      SectionTitle(
        'Bảo dưỡng định kỳ',
        eyebrow: 'PREVENTIVE · UC-7.3 → UC-7.6',
        subtitle: 'Lịch kế hoạch theo tầng, chu kỳ và checklist thiết bị.',
        trailing: IconButton(
          onPressed: () => setState(() => _revision++),
          icon: const RuoVectorIcon(RuoIcon.refresh, size: 19),
        ),
      ),
      if (_role == 'facility_manager')
        Align(
          alignment: Alignment.centerLeft,
          child: FilledButton.icon(
            onPressed: _createPlan,
            icon: const Icon(Icons.add),
            label: const Text('Tạo kế hoạch'),
          ),
        ),
      const SizedBox(height: 8),
      AsyncPanel(
        key: ValueKey('maintenance-$_revision'),
        load: () => widget.api.get('/maintenance/plans'),
        builder: (data) {
          final plans = asList(data['plans']);
          final equipment = asList(data['equipment']);
          if (plans.isEmpty) {
            return const EmptyNotice('Chưa có kế hoạch bảo dưỡng.');
          }
          return Column(
            children: [
              for (final plan in plans)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          value(plan['title']),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${value(plan['building'])} · Tầng ${value(plan['floor'])} · ${value(plan['frequency']) == 'quarterly' ? 'Hàng quý' : 'Hàng tháng'}',
                        ),
                        Text(
                          'Đến hạn: ${formatVnDate(asMap(plan['schedule'])['next_due_at'])}',
                        ),
                        if (_role == 'technician')
                          Align(
                            alignment: Alignment.centerRight,
                            child: OutlinedButton.icon(
                              onPressed: () => _logResult(
                                plan,
                                _planEquipment(plan, equipment),
                              ),
                              icon: const Icon(Icons.checklist),
                              label: const Text('Ghi kết quả'),
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
    ],
  );

  List<Json> _planEquipment(Json plan, List<Json> all) {
    final rawRoomIds = plan['room_ids'];
    final roomIds = (rawRoomIds is List ? rawRoomIds : const [])
        .map((item) => item is Map ? value(item['_id']) : value(item))
        .toSet();
    return all.where((item) {
      final room = item['room_id'];
      final roomId = room is Map ? value(room['_id']) : value(room);
      return roomIds.contains(roomId);
    }).toList();
  }
}

class DisposalsPage extends StatefulWidget {
  const DisposalsPage({super.key, required this.api});
  final RuoApi api;

  @override
  State<DisposalsPage> createState() => _DisposalsPageState();
}

class _DisposalsPageState extends State<DisposalsPage> {
  int _revision = 0;
  String get _role => value(widget.api.user?['role'], fallback: '');

  Future<void> _propose(Json equipment) async {
    final reason = TextEditingController();
    final recovery = TextEditingController(text: '0');
    final body = await showDialog<Json>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Đề xuất thanh lý ${value(equipment['code'])}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Chỉ số R: ${value(equipment['r_ratio'])}%'),
            TextField(
              controller: reason,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Lý do đề xuất'),
            ),
            TextField(
              controller: recovery,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Giá trị thu hồi'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () {
              if (reason.text.trim().isEmpty ||
                  (num.tryParse(recovery.text.trim()) ?? -1) < 0) {
                return;
              }
              Navigator.pop(dialogContext, {
                'equipment_id': equipment['_id'],
                'reason': reason.text.trim(),
                'recovery_value': num.parse(recovery.text.trim()),
                if (equipment['unrepairable_repair_id'] != null)
                  'repair_id': equipment['unrepairable_repair_id'],
              });
            },
            child: const Text('Gửi thẩm định'),
          ),
        ],
      ),
    );
    reason.dispose();
    recovery.dispose();
    if (body == null) return;
    await _run(() => widget.api.send('POST', '/disposals', body));
  }

  Future<Json?> _form(
    String title,
    List<(String, String, String)> fields,
  ) async {
    final controllers = {
      for (final item in fields) item.$1: TextEditingController(),
    };
    final formKey = GlobalKey<FormState>();
    const requiredFields = {
      'reject_reason',
      'decision_number',
      'replacement_name',
      'budget',
      'code',
      'price',
    };
    final result = await showDialog<Json>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final field in fields)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: TextFormField(
                      controller: controllers[field.$1],
                      keyboardType: field.$3 == 'number'
                          ? const TextInputType.numberWithOptions(decimal: true)
                          : TextInputType.text,
                      decoration: InputDecoration(labelText: field.$2),
                      validator: (raw) {
                        final text = (raw ?? '').trim();
                        if (requiredFields.contains(field.$1) && text.isEmpty) {
                          return 'Vui lòng nhập thông tin này.';
                        }
                        if (field.$3 == 'number' && text.isNotEmpty) {
                          final number = num.tryParse(text);
                          if (number == null ||
                              number < 0 ||
                              (field.$1 == 'price' && number == 0)) {
                            return 'Nhập giá trị số hợp lệ.';
                          }
                        }
                        return null;
                      },
                    ),
                  ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () {
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(dialogContext, {
                for (final field in fields)
                  field.$1: field.$3 == 'number'
                      ? num.tryParse(controllers[field.$1]!.text.trim())
                      : controllers[field.$1]!.text.trim(),
              });
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    for (final controller in controllers.values) {
      controller.dispose();
    }
    return result;
  }

  Future<void> _act(Json proposal, String action) async {
    final id = value(proposal['_id']);
    Json? body;
    switch (action) {
      case 'hc-approve':
        final note = await _form('Thẩm định CSVC', [
          ('review_note', 'Ghi chú thẩm định', 'text'),
        ]);
        if (note == null) return;
        body = note;
        break;
      case 'hc-reject':
      case 'reject':
        final note = await _form('Lý do từ chối', [
          ('reject_reason', 'Lý do', 'text'),
        ]);
        if (note == null) return;
        body = note;
        break;
      case 'bgh-approve':
        body = await _form('Quyết định BGH', [
          ('decision_number', 'Số quyết định', 'text'),
        ]);
        if (body == null) return;
        break;
      case 'procurement':
        body = await _form('Dự trù thiết bị thay thế', [
          ('replacement_name', 'Tên thiết bị thay thế', 'text'),
          ('budget', 'Ngân sách', 'number'),
          ('note', 'Ghi chú', 'text'),
        ]);
        if (body == null) return;
        break;
      case 'receipt':
        body = await _form('Tiếp nhận thiết bị mới', [
          ('code', 'Mã tài sản mới', 'text'),
          ('serial_number', 'Serial', 'text'),
          ('brand', 'Hãng', 'text'),
          ('model', 'Model', 'text'),
          ('price', 'Nguyên giá', 'number'),
        ]);
        if (body == null) return;
        break;
    }
    await _run(
      () => widget.api.send('PUT', '/disposals/$id/$action', body ?? {}),
    );
  }

  Future<void> _run(Future<Json> Function() action) async {
    try {
      final response = await action();
      if (!mounted) return;
      setState(() => _revision++);
      _message(value(response['message'], fallback: 'Đã cập nhật hồ sơ.'));
    } catch (error) {
      if (mounted) _message(error.toString());
    }
  }

  void _message(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
    children: [
      SectionTitle(
        'Quy trình thanh lý',
        eyebrow: 'RACI DISPOSAL · UC-7.7 → UC-7.11',
        subtitle: 'Đề xuất, thẩm định, phê duyệt, dự trù và tiếp nhận.',
        trailing: IconButton(
          onPressed: () => setState(() => _revision++),
          icon: const RuoVectorIcon(RuoIcon.refresh, size: 19),
        ),
      ),
      AsyncPanel(
        key: ValueKey('disposals-$_revision'),
        load: () => widget.api.get('/disposals'),
        builder: (data) {
          final candidates = asList(data['candidates']);
          final proposals = asList(data['proposals']);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_role == 'technician' || _role == 'facility_manager') ...[
                const Text(
                  'Thiết bị đủ điều kiện đề xuất',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                if (candidates.isEmpty)
                  const EmptyNotice(
                    'Không có thiết bị đạt điều kiện R ≥ 60% hoặc kết luận không thể sửa.',
                  )
                else
                  for (final item in candidates)
                    Card(
                      child: ListTile(
                        title: Text(
                          '${value(item['code'])} · ${value(item['name'])}',
                        ),
                        subtitle: Text(
                          'R ${value(item['r_ratio'])}% · Chi phí sửa ${money(item['repair_cost'])}',
                        ),
                        trailing: IconButton(
                          tooltip: 'Đề xuất thanh lý',
                          onPressed: () => _propose(item),
                          icon: const Icon(Icons.send_outlined),
                        ),
                      ),
                    ),
              ],
              const SizedBox(height: 14),
              const Text(
                'Hồ sơ thanh lý',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              if (proposals.isEmpty)
                const EmptyNotice('Chưa có hồ sơ thanh lý.')
              else
                for (final proposal in proposals) _proposalCard(proposal),
            ],
          );
        },
      ),
    ],
  );

  Widget _proposalCard(Json proposal) {
    final equipment = asMap(proposal['equipment_id']);
    final status = value(proposal['status'], fallback: 'proposed');
    final actions = <(String, String)>[];
    if (_role == 'facility_manager' && status == 'proposed') {
      actions.add(('hc-approve', 'Thẩm định'));
      actions.add(('hc-reject', 'Từ chối'));
    }
    if (_role == 'admin' && status == 'hc_approved') {
      actions.add(('bgh-approve', 'BGH phê duyệt'));
      actions.add(('reject', 'Từ chối'));
    }
    if (_role == 'facility_manager' && status == 'bgh_approved') {
      actions.add(('procurement', 'Lập dự trù'));
    }
    if (_role == 'technician' && status == 'procurement_planned') {
      actions.add(('receipt', 'Tiếp nhận & tạo QR'));
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${value(equipment['code'])} · ${value(equipment['name'])}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                StatusBadge(status),
              ],
            ),
            Text(
              'R ${value(proposal['r_ratio'])}% · ${value(proposal['reason'])}',
            ),
            if (value(proposal['decision_number'], fallback: '').isNotEmpty)
              Text('Quyết định: ${proposal['decision_number']}'),
            if (actions.isNotEmpty)
              Wrap(
                spacing: 8,
                children: [
                  for (final action in actions)
                    OutlinedButton(
                      onPressed: () => _act(proposal, action.$1),
                      child: Text(action.$2),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

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
              ],
            ),
          ],
        );
      },
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
