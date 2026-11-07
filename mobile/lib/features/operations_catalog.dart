import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/vectors.dart';

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
