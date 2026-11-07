import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/vectors.dart';

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
