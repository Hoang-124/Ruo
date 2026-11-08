import 'package:flutter/material.dart';

import '../core/api.dart';
import '../core/exports.dart';
import '../ui/common.dart';
import '../ui/tokens.dart';
import '../ui/vectors.dart';

num reportNumber(dynamic input) =>
    input is num ? input : num.tryParse('$input') ?? 0;

String healthDescription(Json equipment) {
  final mtbf = equipment['mtbfDays'];
  if (equipment['ageDays'] == null) return 'Chưa đủ dữ liệu tuổi thiết bị';
  if (mtbf == null) return 'Chưa ghi nhận sự cố · MTBF chưa xác định';
  return 'MTBF ${reportNumber(mtbf).toStringAsFixed(1)} ngày';
}

String overdueDuration(dynamic minutes) {
  final total = reportNumber(minutes).ceil().clamp(0, 999999999);
  if (total < 60) return '$total phút';
  if (total < 1440) return '${total ~/ 60} giờ ${total % 60} phút';
  return '${total ~/ 1440} ngày ${(total % 1440) ~/ 60} giờ';
}

int reportYear(DateTime date) =>
    date.toUtc().add(const Duration(hours: 7)).year;

int sumReportCounts(List<Json> rows) =>
    rows.fold(0, (total, row) => total + reportNumber(row['count']).toInt());

String statusSharePercent(num count, int total) {
  if (total <= 0) return '0.0%';
  return '${((count / total) * 100).toStringAsFixed(1)}%';
}

Color _healthColor(num score) {
  if (score >= 80) return const Color(0xFF10B981);
  if (score >= 50) return const Color(0xFFF59E0B);
  return const Color(0xFFEF4444);
}

Widget _space([double size = 12]) => SizedBox(height: size);

Widget _select<T>(
  String label,
  T selected,
  Map<T, String> options,
  ValueChanged<T> changed,
) {
  return DropdownButtonFormField<T>(
    key: ValueKey('select-$label-$selected'),
    initialValue: selected,
    icon: const RuoVectorIcon(RuoIcon.chevronDown, size: 16),
    decoration: InputDecoration(labelText: label),
    isExpanded: true,
    items: options.entries
        .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
        .toList(),
    onChanged: (value) {
      if (value != null) changed(value);
    },
  );
}

Widget _yearPicker(int year, ValueChanged<int> changed) => Row(
      children: [
        OutlinedButton.icon(
          onPressed: year > 2000 ? () => changed(year - 1) : null,
          icon: const RuoVectorIcon(RuoIcon.chevronLeft, size: 15),
          label: const Text('Năm trước'),
        ),
        Expanded(
          child: Text(
            '$year',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
        ),
        OutlinedButton.icon(
          onPressed: year < 2100 ? () => changed(year + 1) : null,
          icon: const RuoVectorIcon(RuoIcon.chevronRight, size: 15),
          label: const Text('Năm sau'),
        ),
      ],
    );

Widget _pager(Json data, int page, ValueChanged<int> changed) {
  final totalPages = reportNumber(data['totalPages']).toInt().clamp(1, 999999);
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Row(
      children: [
        OutlinedButton(
          onPressed: page > 1 ? () => changed(page - 1) : null,
          child: const Text('Trước'),
        ),
        Expanded(
          child: Text(
            'Trang $page / $totalPages\n${value(data['total'], fallback: '0')} kết quả',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
        ),
        OutlinedButton(
          onPressed: page < totalPages ? () => changed(page + 1) : null,
          child: const Text('Sau'),
        ),
      ],
    ),
  );
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, required this.api});
  final RuoApi api;
  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  int year = reportYear(DateTime.now());
  String period = 'month';
  int healthPage = 1;
  int refresh = 0;

  @override
  Widget build(BuildContext context) {
    if (!widget.api.canReport) {
      return const Padding(
        padding: EdgeInsets.all(20),
        child: EmptyNotice(
          'Dashboard dành cho Quản lý CSVC và Admin. Bạn vẫn có thể xem sơ đồ và danh sách phòng.',
          icon: RuoIcon.dashboard,
        ),
      );
    }
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        SectionTitle(
          'Tổng quan tài sản',
          eyebrow: 'DASHBOARD VẬN HÀNH CSVC (UC-8.1 → UC-8.3)',
          subtitle: 'Chỉ số trực tiếp từ hệ thống Ruo',
          trailing: IconButton(
            tooltip: 'Làm mới số liệu',
            onPressed: () => setState(() => refresh++),
            icon: RuoVectorIcon(
              RuoIcon.refresh,
              size: 18,
              color: scheme.primary,
            ),
          ),
        ),
        AsyncPanel(
          key: ValueKey('kpi-$refresh'),
          load: () => widget.api.get('/dashboard/kpi'),
          builder: (data) {
            final m = asMap(data['metrics']);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _Metric(
                      'Tổng thiết bị',
                      value(m['totalEquipment']),
                      accent: RuoTokens.brand600,
                    ),
                    _Metric(
                      'Đang sử dụng',
                      value(m['inUseEquipment']),
                      accent: const Color(0xFF10B981),
                    ),
                    _Metric(
                      'Tỷ lệ hoạt động',
                      '${value(m['operatingRate'])}%',
                      accent: const Color(0xFF059669),
                    ),
                    _Metric(
                      'Trong kho',
                      value(m['inStockEquipment'], fallback: '0'),
                      accent: const Color(0xFFD97706),
                    ),
                    _Metric(
                      'Thiết bị hỏng',
                      value(m['brokenEquipment']),
                      accent: const Color(0xFFDC2626),
                    ),
                    _Metric(
                      'Đang sửa',
                      value(m['repairingEquipment']),
                      accent: RuoTokens.brand500,
                    ),
                    _Metric(
                      'Ca sửa quá hạn',
                      value(m['overdueRepairs']),
                      accent: const Color(0xFFEF4444),
                    ),
                    _Metric(
                      'Chờ thanh lý',
                      value(m['pendingDisposals'], fallback: '0'),
                      accent: const Color(0xFF7C3AED),
                    ),
                  ],
                ),
                _space(10),
                DataCard(
                  title: 'Giá trị kho',
                  subtitle: money(m['warehouseValue']),
                  child: Text(
                    'Thiết bị lưu kho: ${money(m['equipmentStockValue'])}\nLinh kiện dự phòng: ${money(m['sparePartsValue'])} · Ca sửa đang mở: ${value(m['openRepairs'], fallback: '0')}',
                    style: const TextStyle(fontSize: 12.5, height: 1.45),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Cập nhật ${formatVnDateTime(data['generatedAt'])} · ${value(m['totalRooms'])} phòng',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
              ],
            );
          },
        ),
        _space(24),
        const SectionTitle(
          'Chi phí sửa chữa',
          eyebrow: 'XU HƯỚNG CHI PHÍ (UC-8.2)',
          subtitle: 'Chi phí dịch vụ sửa chữa và linh kiện cấp phát tách riêng',
        ),
        _yearPicker(year, (v) => setState(() => year = v)),
        _space(10),
        _select('Kỳ báo cáo', period, const {
          'month': 'Theo tháng',
          'quarter': 'Theo quý',
        }, (v) => setState(() => period = v)),
        _space(),
        AsyncPanel(
          key: ValueKey('cost-$year-$period-$refresh'),
          load: () => widget.api.get('/dashboard/repair-cost', {
            'year': '$year',
            'period': period,
          }),
          builder: (data) {
            final rows = asList(data['series']);
            final totals = asMap(data['totals']);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DataCard(
                  title: 'Tổng năm $year',
                  subtitle: money(totals['totalCost']),
                  child: Text(
                    'Sửa chữa: ${money(totals['repairCost'])} · Linh kiện: ${money(totals['partsCost'])}',
                    style: const TextStyle(fontSize: 12.5),
                  ),
                ),
                if (reportNumber(data['unpricedItems']) > 0)
                  const EmptyNotice(
                    'Có linh kiện lịch sử chưa ghi giá. Tổng chi phí có thể chưa đầy đủ.',
                    icon: RuoIcon.alert,
                  ),
                if (rows.isNotEmpty) _CostChart(rows: rows),
                if (rows.isEmpty)
                  const EmptyNotice('Chưa có số liệu chi phí trong kỳ.'),
              ],
            );
          },
        ),
        _space(24),
        const SectionTitle(
          'Sức khỏe thiết bị',
          eyebrow: 'CHỈ SỐ HEALTH SCORE & MTBF (UC-8.3)',
          subtitle: 'Đánh giá dựa trên tuổi theo ngày lịch và tần suất sự cố',
        ),
        AsyncPanel(
          key: ValueKey('health-$healthPage-$refresh'),
          load: () => widget.api.get('/dashboard/health-score', {
            'page': '$healthPage',
            'limit': '20',
          }),
          builder: (data) {
            final summary = asMap(data['summary']);
            final items = asList(data['equipment']);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DataCard(
                  title:
                      'Điểm trung bình: ${value(summary['averageHealthScore'])}/100',
                  subtitle:
                      '${value(summary['atRiskCount'])} thiết bị cần chú ý (<50đ) · ${value(summary['unknownAgeCount'])} chưa rõ tuổi',
                ),
                if (items.isEmpty)
                  const EmptyNotice('Chưa có thiết bị để đánh giá.'),
                for (final e in items)
                  Builder(
                    builder: (context) {
                      final score = reportNumber(e['healthScore']);
                      final barColor = _healthColor(score);
                      return DataCard(
                        title: '${value(e['code'])} · ${value(e['name'])}',
                        subtitle: healthDescription(e),
                        trailing: StatusBadge(value(e['status'])),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Điểm ${value(e['healthScore'])}/100',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: barColor,
                                    fontFeatures: const [
                                      FontFeature.tabularFigures(),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${value(e['failureCount'], fallback: '0')} sự cố',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: scheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(999),
                              child: LinearProgressIndicator(
                                value: (score / 100).clamp(0.0, 1.0).toDouble(),
                                minHeight: 7,
                                color: barColor,
                                backgroundColor: scheme.outlineVariant
                                    .withValues(alpha: 0.45),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                _pager(data, healthPage, (v) => setState(() => healthPage = v)),
                Text(
                  'MTBF ở đây dùng tuổi theo ngày lịch, không phải số giờ vận hành đo thực tế. Thiết bị chưa có sự cố không được ghi MTBF = 0.',
                  style: TextStyle(
                    fontSize: 12,
                    color: scheme.onSurfaceVariant,
                    height: 1.4,
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

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.metric, {required this.accent});
  final String label;
  final String metric;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: 158,
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 3.5,
                    height: 13,
                    decoration: BoxDecoration(
                      color: accent,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                metric,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.5,
                  color: scheme.onSurface,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CostChart extends StatelessWidget {
  const _CostChart({required this.rows});
  final List<Json> rows;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final maxValue = rows.fold<num>(
      1,
      (m, r) =>
          reportNumber(r['totalCost']) > m ? reportNumber(r['totalCost']) : m,
    );
    const repairColor = RuoTokens.brand600;
    const partsColor = Color(0xFF0EA5E9);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 14,
              runSpacing: 6,
              children: const [
                _LegendSwatch(color: repairColor, label: 'Dịch vụ sửa chữa'),
                _LegendSwatch(color: partsColor, label: 'Linh kiện xuất kho'),
              ],
            ),
            const SizedBox(height: 12),
            ...rows.map((r) {
              final repair = (reportNumber(r['repairCost']) / maxValue).clamp(
                0.0,
                1.0,
              );
              final parts = (reportNumber(r['partsCost']) / maxValue).clamp(
                0.0,
                1.0,
              );
              return Semantics(
                label:
                    '${value(r['label'])}, sửa chữa ${money(r['repairCost'])}, linh kiện ${money(r['partsCost'])}',
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            value(r['label']),
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            money(r['totalCost']),
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: Container(
                          height: 10,
                          color: scheme.outlineVariant.withValues(alpha: 0.35),
                          child: LayoutBuilder(
                            builder: (context, constraints) => Row(
                              children: [
                                Container(
                                  height: 10,
                                  width: constraints.maxWidth * repair,
                                  color: repairColor,
                                ),
                                Container(
                                  height: 10,
                                  width: constraints.maxWidth * parts,
                                  color: partsColor,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Sửa ${money(r['repairCost'])} · Linh kiện ${money(r['partsCost'])}',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _LegendSwatch extends StatelessWidget {
  const _LegendSwatch({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ],
      );
}

class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key, required this.api});
  final RuoApi api;
  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  String report = 'room';
  int year = reportYear(DateTime.now());
  int days = 30;
  int page = 1;
  int refresh = 0;
  String severity = 'all';
  String exportType = 'equipment';
  String? sessionId;
  bool exporting = false;
  String? exportMessage;

  static const _options = {
    'room': 'Phân bổ theo phòng',
    'status': 'Trạng thái thiết bị',
    'frequency': 'Tần suất hỏng hóc',
    'warranty': 'Sắp hết bảo hành',
    'overdue': 'Sự cố quá hạn SLA',
    'export': 'Xuất báo cáo',
  };

  Future<Json> _load() {
    return switch (report) {
      'room' => widget.api.get('/reports/by-room'),
      'status' => widget.api.get('/reports/by-status'),
      'frequency' => widget.api.get('/reports/repair-frequency', {
          'year': '$year',
        }),
      'warranty' => widget.api.get('/reports/warranty-expiring', {
          'days': '$days',
          'page': '$page',
          'limit': '20',
        }),
      'overdue' => widget.api.get('/reports/overdue-repairs', {
          'severity': severity,
          'page': '$page',
          'limit': '20',
        }),
      _ => throw StateError('Báo cáo không hợp lệ'),
    };
  }

  Future<void> _export(bool pdf) async {
    if (exportType == 'inventory' && sessionId == null) {
      setState(() => exportMessage = 'Vui lòng chọn đợt kiểm kê.');
      return;
    }
    setState(() {
      exporting = true;
      exportMessage = null;
    });
    try {
      final query = {
        'type': exportType,
        'format': pdf ? 'print' : 'csv',
        if (exportType == 'inventory') 'sessionId': sessionId!,
      };
      final content = await widget.api.download('/reports/export', query);
      if (!mounted) return;
      final title =
          'Ruo_${exportType}_${DateTime.now().toIso8601String().split('T').first}';
      if (pdf) {
        await NativeExports.printHtml(content, title);
        if (mounted) {
          setState(
            () => exportMessage =
                'Đã mở hộp thoại in. Chọn “Lưu dưới dạng PDF” để xuất file.',
          );
        }
      } else {
        final saved = await NativeExports.saveCsv(content, '$title.csv');
        if (mounted) {
          setState(
            () => exportMessage = saved
                ? 'Đã lưu báo cáo CSV thành công. Có thể mở trực tiếp bằng Excel.'
                : 'Đã hủy thao tác lưu tệp CSV.',
          );
        }
      }
    } catch (error) {
      if (mounted) {
        setState(() => exportMessage = 'Không xuất được báo cáo: $error');
      }
    } finally {
      if (mounted) setState(() => exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.api.canReport) {
      return const Padding(
        padding: EdgeInsets.all(20),
        child: EmptyNotice(
          'Báo cáo chỉ dành cho Quản lý CSVC và Admin.',
          icon: RuoIcon.chart,
        ),
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        const SectionTitle(
          'Báo cáo',
          eyebrow: 'PHÂN TÍCH & KẾT XUẤT DỮ LIỆU (UC-8.4 → UC-8.9)',
          subtitle: 'Phân tích phân bổ, trạng thái, bảo hành, SLA và xuất file',
        ),
        _space(6),
        _select(
          'Loại báo cáo',
          report,
          _options,
          (v) => setState(() {
            report = v;
            page = 1;
            exportMessage = null;
          }),
        ),
        _space(),
        if (report == 'frequency')
          _yearPicker(year, (v) => setState(() => year = v)),
        if (report == 'warranty')
          _select(
            'Khoảng thời gian',
            days,
            const {
              0: 'Đã hết hạn / Hôm nay',
              30: 'Trong 30 ngày',
              60: 'Trong 60 ngày',
              90: 'Trong 90 ngày',
              365: 'Trong 365 ngày',
            },
            (v) => setState(() {
              days = v;
              page = 1;
            }),
          ),
        if (report == 'overdue')
          _select(
            'Mức độ sự cố',
            severity,
            const {
              'all': 'Tất cả',
              'minor': 'Nhẹ',
              'major': 'Nặng',
              'critical': 'Nghiêm trọng',
            },
            (v) => setState(() {
              severity = v;
              page = 1;
            }),
          ),
        if (report != 'export') ...[
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => setState(() => refresh++),
              icon: const RuoVectorIcon(RuoIcon.refresh, size: 15),
              label: const Text('Làm mới'),
            ),
          ),
          AsyncPanel(
            key: ValueKey('$report-$year-$days-$severity-$page-$refresh'),
            load: _load,
            builder: _result,
          ),
        ] else
          ..._exportControls(),
      ],
    );
  }

  List<Widget> _exportControls() => [
        _select(
          'Dữ liệu cần xuất',
          exportType,
          const {
            'equipment': 'Danh sách tài sản',
            'inventory': 'Kết quả một đợt kiểm kê',
          },
          (v) => setState(() {
            exportType = v;
            sessionId = null;
            exportMessage = null;
          }),
        ),
        _space(),
        if (exportType == 'inventory')
          AsyncPanel(
            key: const ValueKey('export-sessions'),
            load: () => widget.api.get('/inventory-sessions'),
            builder: (data) {
              final sessions = asList(data['data']);
              if (sessions.isEmpty) {
                return const EmptyNotice('Chưa có đợt kiểm kê để xuất.');
              }
              final validSession =
                  sessions.any((s) => value(s['_id']) == sessionId)
                  ? sessionId!
                  : '';
              return _select<String>('Chọn đợt kiểm kê', validSession, {
                '': 'Chưa chọn',
                for (final s in sessions)
                  value(s['_id']):
                      '${value(s['name'])} · ${formatVnDate(s['date'])}',
              }, (v) => setState(() => sessionId = v.isEmpty ? null : v));
            },
          ),
        _space(),
        const DataCard(
          title: 'Định dạng xuất chuẩn tiếng Việt',
          subtitle: 'CSV UTF-8 có BOM cho Microsoft Excel & bản in PDF A4',
          child: Text(
            'CSV giữ nguyên dấu tiếng Việt khi mở bằng Excel. Khi nhấn “In / Lưu PDF”, chọn máy in “Save as PDF / Lưu dưới dạng PDF” trên Android.',
            style: TextStyle(fontSize: 12.5, height: 1.45),
          ),
        ),
        _space(),
        FilledButton.icon(
          onPressed: exporting ? null : () => _export(false),
          icon: const RuoVectorIcon(
            RuoIcon.download,
            size: 17,
            color: Colors.white,
          ),
          label: Text(exporting ? 'Đang chuẩn bị…' : 'Lưu CSV (Excel)'),
        ),
        _space(10),
        OutlinedButton.icon(
          onPressed: exporting ? null : () => _export(true),
          icon: const RuoVectorIcon(RuoIcon.printer, size: 17),
          label: const Text('In / Lưu PDF'),
        ),
        if (exportMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: DataCard(
              title: 'Trạng thái xuất',
              child: Text(exportMessage!, semanticsLabel: exportMessage),
            ),
          ),
      ];

  Widget _result(Json data) => switch (report) {
        'room' => _rooms(data),
        'status' => _statuses(data),
        'frequency' => _frequency(data),
        'warranty' => _warranty(data),
        'overdue' => _overdue(data),
        _ => const SizedBox.shrink(),
      };

  Widget _rooms(Json data) {
    final rows = asList(data['rooms']);
    final unassigned = asMap(data['unassigned']);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${rows.length} phòng · ${sumReportCounts(rows)} thiết bị được phân bổ',
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        _space(8),
        DataCard(
          title: 'Thiết bị chưa phân phòng',
          subtitle:
              '${value(unassigned['count'])} thiết bị · ${money(unassigned['value'])}',
          trailing: const StatusBadge('in_stock'),
        ),
        if (rows.isEmpty) const EmptyNotice('Chưa có dữ liệu phòng.'),
        for (final r in rows)
          DataCard(
            title: '${value(r['code'])} · ${value(r['name'])}',
            subtitle: 'Tầng ${value(r['floor'])}',
            trailing: StatusBadge(value(r['status'])),
            child: Text(
              '${value(r['count'])} thiết bị · ${value(r['brokenCount'])} hỏng · Giá trị ${money(r['value'])}',
              style: const TextStyle(fontSize: 12.5),
            ),
          ),
        const SizedBox(height: 6),
        Text(
          'Không gồm tài sản đã thanh lý hoặc thất lạc.',
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _statuses(Json data) {
    final scheme = Theme.of(context).colorScheme;
    final brightness = Theme.of(context).brightness;
    final rows = asList(data['groups']);
    final total = sumReportCounts(rows);
    final totalVal = rows.fold<num>(
      0,
      (sum, r) => sum + reportNumber(r['value']),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DataCard(
          title: 'Tổng $total thiết bị',
          subtitle: 'Tổng nguyên giá: ${money(totalVal)}',
        ),
        _space(6),
        if (rows.isEmpty) const EmptyNotice('Chưa có dữ liệu trạng thái.'),
        for (final r in rows)
          Builder(
            builder: (context) {
              final st = value(r['status']);
              final count = reportNumber(r['count']);
              final share = statusSharePercent(count, total);
              final tone = StatusTone.forStatus(st, brightness);
              return DataCard(
                title: statusLabel(st),
                subtitle:
                    '${value(r['count'])} thiết bị ($share) · ${money(r['value'])}',
                trailing: StatusBadge(st),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: total == 0
                        ? 0
                        : (count / total).clamp(0.0, 1.0).toDouble(),
                    minHeight: 8,
                    color: tone.solid,
                    backgroundColor: scheme.outlineVariant.withValues(
                      alpha: 0.40,
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _frequency(Json data) {
    final summary = asMap(data['summary']);
    final categories = asList(data['byCategory']);
    final rooms = asList(data['byRoom']);

    Widget group(String heading, List<Json> rows) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionTitle(heading),
            if (rows.isEmpty)
              const EmptyNotice('Không có sự cố trong năm đã chọn.'),
            for (final r in rows)
              DataCard(
                title: '${value(r['code'])} · ${value(r['name'])}',
                subtitle:
                    '${value(r['failureCount'])} sự cố / ${value(r['affectedEquipment'])} thiết bị',
                child: Text(
                  'Trung bình ${value(r['incidentsPerEquipment'])} sự cố / thiết bị',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
          ],
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DataCard(
          title: 'Năm $year',
          subtitle:
              '${value(summary['failureCount'])} sự cố · ${value(summary['affectedEquipment'])} thiết bị bị ảnh hưởng',
        ),
        if (reportNumber(summary['legacyRoomCount']) > 0)
          const EmptyNotice(
            'Một số ca sửa cũ dùng vị trí hiện tại do chưa lưu phòng lịch sử.',
            icon: RuoIcon.alert,
          ),
        group('Theo loại thiết bị', categories),
        _space(),
        group('Theo phòng', rooms),
      ],
    );
  }

  Widget _warranty(Json data) {
    final rows = asList(data['equipment']);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (rows.isEmpty)
          const EmptyNotice(
            'Không có thiết bị sắp hết bảo hành trong khoảng đã chọn.',
          ),
        for (final r in rows)
          Builder(
            builder: (context) {
              final supplier = asMap(r['supplier_id']);
              final category = asMap(r['category_id']);
              final rem = reportNumber(r['daysRemaining']).toInt();
              final urgentTone = rem <= 7
                  ? 'critical'
                  : (rem <= 30 ? 'major' : 'minor');
              return DataCard(
                title: '${value(r['code'])} · ${value(r['name'])}',
                subtitle:
                    'Hết hạn ${formatVnDate(r['warranty_expiry'])} · ${value(category['name'])}',
                trailing: StatusBadge(
                  urgentTone,
                  labelOverride: rem <= 0 ? 'Hôm nay' : 'Còn $rem ngày',
                ),
                child: Text(
                  'Phòng: ${value(asMap(r['room_id'])['code'])}\nNhà cung cấp: ${value(supplier['name'])}\nLiên hệ: ${value(supplier['phone'])} · ${value(supplier['email'])}',
                  style: const TextStyle(fontSize: 12.5, height: 1.45),
                ),
              );
            },
          ),
        _pager(data, page, (v) => setState(() => page = v)),
      ],
    );
  }

  Widget _overdue(Json data) {
    final rows = asList(data['repairs']);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (rows.isEmpty)
          const EmptyNotice('Không có ca sửa quá hạn theo bộ lọc này.'),
        for (final r in rows)
          Builder(
            builder: (context) {
              final assignee = value(
                asMap(r['assigned_to'])['full_name'],
                fallback: value(
                  asMap(r['repair_unit_id'])['name'],
                  fallback: 'Chưa phân công',
                ),
              );
              final level = value(r['damage_level']);
              return DataCard(
                title: value(r['ticket_code']),
                subtitle:
                    'Quá hạn ${overdueDuration(r['overdueMinutes'])} · ${statusLabel(value(r['status']))}',
                trailing: StatusBadge(level),
                child: Text(
                  '${value(asMap(r['equipment_id'])['name'])} (${value(asMap(r['equipment_id'])['code'])})\nPhòng ${value(asMap(r['room_id'])['code'])} · Phụ trách: $assignee\nHạn SLA: ${formatVnDateTime(r['deadline'])}\n${value(r['incident_description'])}',
                  style: const TextStyle(fontSize: 12.5, height: 1.45),
                ),
              );
            },
          ),
        _pager(data, page, (v) => setState(() => page = v)),
      ],
    );
  }
}
