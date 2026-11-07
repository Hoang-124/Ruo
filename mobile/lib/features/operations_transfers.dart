import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/vectors.dart';

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
