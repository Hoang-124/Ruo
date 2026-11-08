import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import 'operations_catalog.dart';
import 'operations_disposals.dart';
import 'operations_extra.dart';
import 'operations_inventory.dart';
import 'operations_maintenance.dart';
import 'operations_transfers.dart';

export 'operations_catalog.dart';
export 'operations_disposals.dart';
export 'operations_extra.dart';
export 'operations_inventory.dart';
export 'operations_maintenance.dart';
export 'operations_transfers.dart';

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
    if (_role != 'lecturer') {
      sections.add(('equipments', 'Kho thiết bị'));
      sections.add(('spare_parts', 'Kho linh kiện'));
      sections.add(('transfers', 'Điều chuyển'));
    }
    if (_role == 'technician' || _role == 'facility_manager') {
      sections.add(('maintenance', 'Bảo dưỡng'));
    }
    if (_role != 'lecturer') sections.add(('disposals', 'Thanh lý'));
    sections.add(('inventory', 'Kiểm kê & QR'));
    if (_role == 'admin' || _role == 'facility_manager') {
      sections.add(('governance', 'Kiểm toán & RBAC'));
    }
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
            'equipments' => EquipmentsDirectoryPage(api: widget.api),
            'spare_parts' => SparePartsMobilePage(api: widget.api),
            'transfers' => TransfersPage(api: widget.api),
            'maintenance' => MaintenancePage(api: widget.api),
            'disposals' => DisposalsPage(api: widget.api),
            'governance' => AdminGovernanceMobilePage(api: widget.api),
            _ => InventoryPage(api: widget.api),
          },
        ),
      ],
    );
  }
}
