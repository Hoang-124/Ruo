import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/vectors.dart';

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
