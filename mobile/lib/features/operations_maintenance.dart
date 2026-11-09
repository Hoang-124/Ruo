import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/vectors.dart';

class _MaintenancePlanDialog extends StatefulWidget {
  const _MaintenancePlanDialog({required this.rooms, required this.categories});

  final List<Json> rooms;
  final List<Json> categories;

  @override
  State<_MaintenancePlanDialog> createState() => _MaintenancePlanDialogState();
}

class _MaintenancePlanDialogState extends State<_MaintenancePlanDialog> {
  final _titleController = TextEditingController();
  late final List<int> _floors =
      widget.rooms
          .map((room) => int.tryParse('${room['floor']}'))
          .whereType<int>()
          .toSet()
          .toList()
        ..sort();
  late int _floor = _floors.first;
  String _frequency = 'monthly';
  DateTime _scheduledDate = DateTime.now();
  final Set<String> _selectedRooms = {};
  final Set<String> _selectedCategories = {};

  List<Json> get _roomsOnFloor => widget.rooms
      .where((room) => int.tryParse('${room['floor']}') == _floor)
      .toList();

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _scheduledDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (selected != null && mounted) {
      setState(() => _scheduledDate = selected);
    }
  }

  void _submit() {
    if (_titleController.text.trim().length < 3) return;
    if (_selectedRooms.isEmpty) return;
    Navigator.pop(context, {
      'title': _titleController.text.trim(),
      'building': 'A1',
      'floor': _floor,
      'room_ids': _selectedRooms.toList(),
      'category_ids': _selectedCategories.toList(),
      'frequency': _frequency,
      'start_date': DateTime.utc(
        _scheduledDate.year,
        _scheduledDate.month,
        _scheduledDate.day,
      ).toIso8601String(),
    });
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Lập kế hoạch bảo dưỡng'),
    content: SizedBox(
      width: 480,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              key: const Key('maintenance_plan_title'),
              controller: _titleController,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Tên kế hoạch'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              initialValue: _floor,
              decoration: const InputDecoration(labelText: 'Tầng tòa A1'),
              items: [
                for (final floor in _floors)
                  DropdownMenuItem(value: floor, child: Text('Tầng $floor')),
              ],
              onChanged: (value) => setState(() {
                _floor = value!;
                _selectedRooms.clear();
              }),
            ),
            const SizedBox(height: 8),
            Text(
              'Chọn một hoặc nhiều phòng',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            for (final room in _roomsOnFloor)
              CheckboxListTile(
                key: Key('maintenance-room-${room['_id']}'),
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text('${value(room['code'])} · ${value(room['name'])}'),
                value: _selectedRooms.contains(value(room['_id'])),
                onChanged: (checked) => setState(() {
                  final id = value(room['_id']);
                  if (checked == true) {
                    _selectedRooms.add(id);
                  } else {
                    _selectedRooms.remove(id);
                  }
                }),
              ),
            const SizedBox(height: 8),
            Text(
              'Loại thiết bị (để trống = tất cả)',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            for (final category in widget.categories)
              CheckboxListTile(
                key: Key('maintenance-category-${category['_id']}'),
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text(value(category['name'])),
                value: _selectedCategories.contains(value(category['_id'])),
                onChanged: (checked) => setState(() {
                  final id = value(category['_id']);
                  if (checked == true) {
                    _selectedCategories.add(id);
                  } else {
                    _selectedCategories.remove(id);
                  }
                }),
              ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _frequency,
              decoration: const InputDecoration(labelText: 'Chu kỳ'),
              items: const [
                DropdownMenuItem(value: 'monthly', child: Text('Hàng tháng')),
                DropdownMenuItem(value: 'quarterly', child: Text('Hàng quý')),
              ],
              onChanged: (value) => setState(() => _frequency = value!),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              key: const Key('maintenance_plan_date'),
              onPressed: _selectDate,
              icon: const Icon(Icons.calendar_today),
              label: Text(
                'Ngày bắt đầu: ${formatVnDate(DateTime.utc(_scheduledDate.year, _scheduledDate.month, _scheduledDate.day).toIso8601String())}',
              ),
            ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Hủy'),
      ),
      FilledButton(
        key: const Key('maintenance_plan_submit'),
        onPressed:
            _titleController.text.trim().length >= 3 &&
                _selectedRooms.isNotEmpty
            ? _submit
            : null,
        child: const Text('Tạo kế hoạch'),
      ),
    ],
  );
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
    late final List<Json> rooms;
    late final List<Json> categories;
    try {
      final responses = await Future.wait([
        widget.api.get('/facilities/rooms', {'limit': '100'}),
        widget.api.get('/equipments/categories'),
      ]);
      rooms = asList(responses[0]['rooms'])
          .where(
            (room) =>
                room['building'] == 'A1' &&
                room['status'] != 'inactive' &&
                room['room_type'] != 'warehouse',
          )
          .toList();
      categories = asList(responses[1]['categories']);
    } catch (error) {
      if (mounted) _message('Không thể tải phòng và loại thiết bị: $error');
      return;
    }
    if (!mounted) return;
    if (rooms.isEmpty) {
      _message('Chưa có phòng hoạt động trong tòa A1 để lập kế hoạch.');
      return;
    }
    final body = await showDialog<Json>(
      context: context,
      builder: (_) =>
          _MaintenancePlanDialog(rooms: rooms, categories: categories),
    );
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
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Thiết bị'),
                    items: equipment
                        .map(
                          (item) => DropdownMenuItem(
                            value: value(item['_id']),
                            child: Text(
                              '${value(item['code'])} · ${value(item['name'])}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final plan in plans)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  value(plan['title']),
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(fontWeight: FontWeight.w800),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Chip(
                                avatar: const Icon(
                                  Icons.event_repeat,
                                  size: 16,
                                ),
                                label: Text(
                                  value(plan['frequency']) == 'quarterly'
                                      ? 'Hàng quý'
                                      : 'Hàng tháng',
                                ),
                                visualDensity: VisualDensity.compact,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _PlanInfoChip(
                                icon: Icons.location_on_outlined,
                                label:
                                    '${value(plan['building'])} · Tầng ${value(plan['floor'])}',
                              ),
                              _PlanInfoChip(
                                icon: Icons.meeting_room_outlined,
                                label:
                                    '${asList(plan['room_ids']).length} phòng',
                              ),
                              _PlanInfoChip(
                                icon: Icons.devices_other_outlined,
                                label:
                                    '${_planEquipment(plan, equipment).length} thiết bị',
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              const Icon(
                                Icons.calendar_today_outlined,
                                size: 17,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Kỳ tiếp theo: ${formatVnDate(asMap(plan['schedule'])['next_due_at'])}',
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            ],
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
    final rawCategoryIds = plan['category_ids'];
    final categoryIds = (rawCategoryIds is List ? rawCategoryIds : const [])
        .map((item) => item is Map ? value(item['_id']) : value(item))
        .toSet();
    return all.where((item) {
      final room = item['room_id'];
      final roomId = room is Map ? value(room['_id']) : value(room);
      final category = item['category_id'];
      final categoryId = category is Map
          ? value(category['_id'])
          : value(category);
      return roomIds.contains(roomId) &&
          (categoryIds.isEmpty || categoryIds.contains(categoryId));
    }).toList();
  }
}

class _PlanInfoChip extends StatelessWidget {
  const _PlanInfoChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Chip(
    avatar: Icon(icon, size: 16),
    label: Text(label),
    visualDensity: VisualDensity.compact,
  );
}
