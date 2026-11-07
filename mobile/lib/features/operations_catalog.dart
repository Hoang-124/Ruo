import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/vectors.dart';

class _CatalogRecordDialog extends StatefulWidget {
  const _CatalogRecordDialog({
    required this.title,
    required this.kind,
    required this.fields,
    required this.initialValues,
    required this.isNew,
    required this.isPilotBuilding,
  });

  final String title;
  final String kind;
  final Map<String, String> fields;
  final Map<String, String> initialValues;
  final bool isNew;
  final bool isPilotBuilding;

  @override
  State<_CatalogRecordDialog> createState() => _CatalogRecordDialogState();
}

class _CatalogRecordDialogState extends State<_CatalogRecordDialog> {
  static const _numericFields = {'depreciation_rate', 'totalFloors'};
  static const _requiredFields = {'code', 'name'};
  static const _maxLengths = {
    'code': 32,
    'name': 150,
    'description': 500,
    'campusZone': 100,
    'totalFloors': 3,
    'contact_person': 120,
    'specialty': 250,
    'phone': 20,
    'email': 254,
    'address': 250,
    'depreciation_rate': 6,
  };
  static final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final _phonePattern = RegExp(r'^(?:\+?[0-9][0-9\s().-]{5,18}[0-9])?$');
  static final _codePattern = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$');

  late final _controllers = {
    for (final field in widget.fields.keys)
      field: TextEditingController(text: widget.initialValues[field] ?? ''),
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
    final body = <String, dynamic>{};
    for (final entry in _controllers.entries) {
      final text = entry.value.text.trim();
      body[entry.key] = switch (entry.key) {
        'code' => text.toUpperCase(),
        _ when _numericFields.contains(entry.key) => num.tryParse(text),
        _ => text,
      };
    }
    Navigator.pop(context, body);
  }

  String? _validate(String key, String? raw) {
    final text = (raw ?? '').trim();
    if (_requiredFields.contains(key) && text.isEmpty) {
      return 'Trường này là bắt buộc.';
    }
    if (key == 'code' && text.isNotEmpty && !_codePattern.hasMatch(text)) {
      return 'Mã chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.';
    }
    if (key == 'name' && text.isNotEmpty && text.length < 2) {
      return 'Tên cần có ít nhất 2 ký tự.';
    }
    if (key == 'email' && text.isNotEmpty && !_emailPattern.hasMatch(text)) {
      return 'Email chưa đúng định dạng.';
    }
    if (key == 'phone' && !_phonePattern.hasMatch(text)) {
      return 'Số điện thoại chưa đúng định dạng.';
    }
    if (_numericFields.contains(key)) {
      final number = num.tryParse(text);
      if (number == null) return 'Nhập giá trị số hợp lệ.';
      if (key == 'depreciation_rate' && (number < 0 || number > 100)) {
        return 'Tỷ lệ khấu hao phải từ 0 đến 100%.';
      }
      if (key == 'totalFloors' &&
          (number < 1 ||
              number > 100 ||
              number != number.round() ||
              (widget.isPilotBuilding && number != 5))) {
        return widget.isPilotBuilding
            ? 'Tòa nhà A1 có cấu trúc cố định 5 tầng.'
            : 'Số tầng phải là số nguyên từ 1 đến 100.';
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.title),
    content: SizedBox(
      width: 440,
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final entry in widget.fields.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TextFormField(
                    controller: _controllers[entry.key],
                    keyboardType: _numericFields.contains(entry.key)
                        ? const TextInputType.numberWithOptions(decimal: true)
                        : TextInputType.text,
                    maxLength:
                        entry.key == 'name' && widget.kind == 'categories'
                        ? 120
                        : _maxLengths[entry.key],
                    enabled:
                        !(entry.key == 'code' &&
                            (!widget.isNew || widget.isPilotBuilding)) &&
                        !(entry.key == 'totalFloors' && widget.isPilotBuilding),
                    decoration: InputDecoration(
                      labelText: entry.value,
                      counterText: '',
                      helperText:
                          entry.key == 'totalFloors' && widget.isPilotBuilding
                          ? 'Cấu trúc tòa nhà thí điểm'
                          : null,
                    ),
                    validator: (raw) => _validate(entry.key, raw),
                  ),
                ),
            ],
          ),
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

  dynamic _recordField(Json? record, String kind, String field) {
    if (record == null) return null;
    if (field == 'contact_person' && kind == 'suppliers') {
      return record['contact'] ?? record['contact_person'];
    }
    return record[field];
  }

  Future<void> _edit([Json? record]) async {
    final kind = _kind;
    final fields = _fields(kind);
    final initialValues = <String, String>{
      for (final field in fields.keys)
        field: value(
          _recordField(record, kind, field),
          fallback: switch ((kind, field, record == null)) {
            ('buildings', 'code', true) => 'A1',
            ('buildings', 'name', true) => 'Tòa Nhà Học Vụ A1',
            ('buildings', 'campusZone', true) => 'Khu Trung Tâm',
            ('buildings', 'totalFloors', true) => '5',
            ('categories', 'depreciation_rate', true) => '20',
            _ => '',
          },
        ),
    };
    final result = await showDialog<Json>(
      context: context,
      builder: (_) => _CatalogRecordDialog(
        title: record == null
            ? 'Thêm ${_kinds[kind]!.$1}'
            : 'Cập nhật ${_kinds[kind]!.$1}',
        kind: kind,
        fields: fields,
        initialValues: initialValues,
        isNew: record == null,
        isPilotBuilding: kind == 'buildings',
      ),
    );
    if (result == null || !mounted) return;
    await _perform(() async {
      final path = '/admin/${kind == 'repair-units' ? 'repair-units' : kind}';
      if (record == null) {
        await widget.api.send('POST', path, result);
      } else {
        final updates = Map<String, dynamic>.from(result)..remove('code');
        await widget.api.send('PUT', '$path/${record['_id']}', updates);
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
        AsyncPanel(
          key: ValueKey('catalog-$_kind-$_revision'),
          load: () => widget.api.get('/admin/$_kind'),
          builder: (data) {
            final records = asList(data[kindData.$2]);
            final canAdd = _kind != 'buildings' || records.isEmpty;
            if (records.isEmpty) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (canAdd)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: FilledButton.icon(
                        onPressed: () => _edit(),
                        icon: const Icon(Icons.add),
                        label: Text('Thêm ${kindData.$1.toLowerCase()}'),
                      ),
                    ),
                  const EmptyNotice('Chưa có dữ liệu trong danh mục.'),
                ],
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (canAdd)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: FilledButton.icon(
                      onPressed: () => _edit(),
                      icon: const Icon(Icons.add),
                      label: Text('Thêm ${kindData.$1.toLowerCase()}'),
                    ),
                  ),
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
      return '${value(item['totalFloors'], fallback: '5')} tầng · ${value(item['campusZone'], fallback: 'Khu Trung Tâm')}';
    }
    if (_kind == 'suppliers') {
      return [
            item['contact'] ?? item['contact_person'],
            item['phone'],
            item['email'],
          ]
          .map((part) => value(part, fallback: ''))
          .where((part) => part.isNotEmpty)
          .join(' · ');
    }
    if (_kind == 'repair-units') {
      return [item['specialty'], item['phone']]
          .map((part) => value(part, fallback: ''))
          .where((part) => part.isNotEmpty)
          .join(' · ');
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
