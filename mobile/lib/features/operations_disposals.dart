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

class _DisposalProposalDialog extends StatefulWidget {
  const _DisposalProposalDialog({required this.equipment});

  final Json equipment;

  @override
  State<_DisposalProposalDialog> createState() =>
      _DisposalProposalDialogState();
}

class _DisposalProposalDialogState extends State<_DisposalProposalDialog> {
  final _reason = TextEditingController();
  final _recovery = TextEditingController(text: '0');

  @override
  void dispose() {
    _reason.dispose();
    _recovery.dispose();
    super.dispose();
  }

  void _submit() {
    final reason = _reason.text.trim();
    final recovery = num.tryParse(_recovery.text.trim());
    if (reason.isEmpty || recovery == null || recovery < 0) return;

    Navigator.pop(context, {
      'equipment_id': widget.equipment['_id'],
      'reason': reason,
      'recovery_value': recovery,
      if (widget.equipment['unrepairable_repair_id'] != null)
        'repair_id': widget.equipment['unrepairable_repair_id'],
    });
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text('Đề xuất thanh lý ${value(widget.equipment['code'])}'),
    content: SizedBox(
      width: 440,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Chỉ số R: ${value(widget.equipment['r_ratio'])}%'),
            TextField(
              controller: _reason,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Lý do đề xuất'),
            ),
            TextField(
              controller: _recovery,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Giá trị thu hồi'),
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
      FilledButton(onPressed: _submit, child: const Text('Gửi thẩm định')),
    ],
  );
}

class _DisposalWorkflowFormDialog extends StatefulWidget {
  const _DisposalWorkflowFormDialog({
    required this.title,
    required this.fields,
  });

  final String title;
  final List<(String, String, String)> fields;

  @override
  State<_DisposalWorkflowFormDialog> createState() =>
      _DisposalWorkflowFormDialogState();
}

class _DisposalWorkflowFormDialogState
    extends State<_DisposalWorkflowFormDialog> {
  static const _requiredFields = {
    'reject_reason',
    'decision_number',
    'replacement_name',
    'budget',
    'code',
    'price',
  };

  late final _controllers = {
    for (final field in widget.fields) field.$1: TextEditingController(),
  };
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.pop(context, {
      for (final field in widget.fields)
        field.$1: field.$3 == 'number'
            ? num.tryParse(_controllers[field.$1]!.text.trim())
            : _controllers[field.$1]!.text.trim(),
    });
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.title),
    content: Form(
      key: _formKey,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final field in widget.fields)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: TextFormField(
                  controller: _controllers[field.$1],
                  keyboardType: field.$3 == 'number'
                      ? const TextInputType.numberWithOptions(decimal: true)
                      : TextInputType.text,
                  decoration: InputDecoration(labelText: field.$2),
                  validator: (raw) {
                    final text = (raw ?? '').trim();
                    if (_requiredFields.contains(field.$1) && text.isEmpty) {
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
        onPressed: () => Navigator.pop(context),
        child: const Text('Hủy'),
      ),
      FilledButton(onPressed: _save, child: const Text('Lưu')),
    ],
  );
}

class _DisposalsPageState extends State<DisposalsPage> {
  int _revision = 0;
  String get _role => value(widget.api.user?['role'], fallback: '');

  Future<void> _startProposal(List<Json> candidates) async {
    if (candidates.isEmpty) {
      _message(
        'Chưa có thiết bị đủ điều kiện: cần R ≥ 60% hoặc kết luận không thể sửa.',
      );
      return;
    }
    if (candidates.length == 1) {
      await _propose(candidates.first);
      return;
    }

    final selected = await showDialog<Json>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Chọn thiết bị đề xuất thanh lý'),
        content: SizedBox(
          width: 440,
          child: ListView(
            shrinkWrap: true,
            children: [
              for (final item in candidates)
                ListTile(
                  title: Text(
                    '${value(item['code'])} · ${value(item['name'])}',
                  ),
                  subtitle: Text(
                    'R ${value(item['r_ratio'])}% · Chi phí sửa ${money(item['repair_cost'])}',
                  ),
                  onTap: () => Navigator.pop(dialogContext, item),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Hủy'),
          ),
        ],
      ),
    );
    if (selected != null) await _propose(selected);
  }

  Future<void> _propose(Json equipment) async {
    final body = await showDialog<Json>(
      context: context,
      builder: (_) => _DisposalProposalDialog(equipment: equipment),
    );
    if (body == null) return;
    await _run(() => widget.api.send('POST', '/disposals', body));
  }

  Future<Json?> _form(
    String title,
    List<(String, String, String)> fields,
  ) async {
    return showDialog<Json>(
      context: context,
      builder: (_) => _DisposalWorkflowFormDialog(title: title, fields: fields),
    );
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
              if (_role == 'technician' || _role == 'facility_manager')
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: FilledButton.icon(
                      key: const Key('create_disposal_proposal'),
                      onPressed: () => _startProposal(candidates),
                      icon: const Icon(Icons.add_circle_outline),
                      label: const Text('Tạo đề xuất thanh lý'),
                    ),
                  ),
                ),
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
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: ListTile(
                          title: Text(
                            '${value(item['code'])} · ${value(item['name'])}',
                          ),
                          subtitle: Text(
                            'R ${value(item['r_ratio'])}% · Chi phí sửa ${money(item['repair_cost'])}',
                          ),
                          trailing: OutlinedButton.icon(
                            onPressed: () => _propose(item),
                            icon: const Icon(Icons.send_outlined),
                            label: const Text('Đề xuất'),
                          ),
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
