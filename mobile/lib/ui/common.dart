import 'package:flutter/material.dart';

import '../core/api.dart';
import 'tokens.dart';
import 'vectors.dart';

Json asMap(dynamic input) =>
    input is Map ? Map<String, dynamic>.from(input) : {};

List<Json> asList(dynamic input) =>
    input is List ? input.whereType<Map>().map(asMap).toList() : [];

String value(dynamic input, {String fallback = '—'}) =>
    input == null || input.toString().trim().isEmpty
        ? fallback
        : input.toString();

String money(dynamic input) {
  final number = input is num ? input : num.tryParse('$input');
  if (number == null) return '—';
  final formatted = number.round().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]}.',
      );
  return '$formatted ₫';
}

String formatVnDate(dynamic raw, {String fallback = 'Chưa xác định'}) {
  if (raw == null || '$raw'.trim().isEmpty) return fallback;
  final parsed = DateTime.tryParse('$raw');
  if (parsed == null) return fallback;
  final vn = parsed.toUtc().add(const Duration(hours: 7));
  final d = vn.day.toString().padLeft(2, '0');
  final m = vn.month.toString().padLeft(2, '0');
  return '$d/$m/${vn.year}';
}

String formatVnDateTime(dynamic raw, {String fallback = 'Chưa xác định'}) {
  if (raw == null || '$raw'.trim().isEmpty) return fallback;
  final parsed = DateTime.tryParse('$raw');
  if (parsed == null) return fallback;
  final vn = parsed.toUtc().add(const Duration(hours: 7));
  final d = vn.day.toString().padLeft(2, '0');
  final m = vn.month.toString().padLeft(2, '0');
  final hh = vn.hour.toString().padLeft(2, '0');
  final mm = vn.minute.toString().padLeft(2, '0');
  return '$hh:$mm · $d/$m/${vn.year}';
}

String roleLabel(dynamic role) => switch ('$role') {
      'admin' => 'Quản trị viên',
      'facility_manager' => 'Quản lý CSVC',
      'technician' => 'Kỹ thuật viên',
      'lecturer' => 'Giảng viên',
      _ => value(role, fallback: 'Thành viên'),
    };

String statusLabel(String status) =>
    const {
      'available': 'Sẵn sàng',
      'maintenance': 'Đang bảo trì',
      'inactive': 'Ngừng sử dụng',
      'lecture': 'Phòng học',
      'lab': 'Phòng thực hành',
      'office': 'Văn phòng',
      'warehouse': 'Kho',
      'in_use': 'Đang sử dụng',
      'in_stock': 'Trong kho',
      'broken': 'Hư hỏng',
      'repairing': 'Đang sửa chữa',
      'pending_disposal': 'Chờ thanh lý',
      'disposed': 'Đã thanh lý',
      'lost': 'Thất lạc',
      'reported': 'Đã báo hỏng',
      'assigned': 'Đã giao việc',
      'in_progress': 'Đang sửa chữa',
      'resolved': 'Đã xử lý',
      'closed': 'Đã đóng',
      'completed': 'Hoàn tất',
      'reconciled': 'Đã đối soát',
      'minor': 'Nhẹ',
      'major': 'Nặng',
      'critical': 'Nghiêm trọng',
      'awaiting_approval': 'Chờ CSVC duyệt',
      'pending': 'Đang chờ',
      'approved': 'Đã duyệt',
      'rejected': 'Từ chối',
      'cancelled': 'Đã hủy',
      'unrepairable': 'Không thể sửa',
    }[status] ??
    status;

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key, this.labelOverride});
  final String status;
  final String? labelOverride;

  @override
  Widget build(BuildContext context) {
    final tone = StatusTone.forStatus(status, Theme.of(context).brightness);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: tone.bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.border.withValues(alpha: 0.55)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6.5,
            height: 6.5,
            decoration: BoxDecoration(color: tone.solid, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            labelOverride ?? statusLabel(status),
            style: TextStyle(
              color: tone.fg,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(
    this.title, {
    super.key,
    this.subtitle,
    this.eyebrow,
    this.trailing,
  });
  final String title;
  final String? subtitle;
  final String? eyebrow;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 12, 0, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (eyebrow != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(
                          color: scheme.primary.withValues(alpha: 0.30),
                        ),
                      ),
                      child: Text(
                        eyebrow!,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                          color: scheme.primary,
                        ),
                      ),
                    ),
                  ),
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                      ),
                ),
                if (subtitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      subtitle!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                  ),
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class EmptyNotice extends StatelessWidget {
  const EmptyNotice(this.message, {super.key, this.icon = RuoIcon.blueprint});
  final String message;
  final RuoIcon icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          RuoVectorIcon(icon, size: 22, color: scheme.onSurfaceVariant),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 13.5,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class DataCard extends StatelessWidget {
  const DataCard({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    this.child,
    this.onTap,
  });
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget? child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                    ),
                  ),
                  if (trailing != null) ...[
                    const SizedBox(width: 8),
                    trailing!,
                  ] else if (onTap != null) ...[
                    const SizedBox(width: 6),
                    RuoVectorIcon(
                      RuoIcon.chevronRight,
                      size: 18,
                      color: scheme.onSurfaceVariant,
                    ),
                  ],
                ],
              ),
              if (subtitle != null)
                Padding(
                  padding: const EdgeInsets.only(top: 5),
                  child: Text(
                    subtitle!,
                    style: TextStyle(
                      fontSize: 13,
                      color: scheme.onSurfaceVariant,
                      height: 1.4,
                    ),
                  ),
                ),
              if (child != null)
                Padding(padding: const EdgeInsets.only(top: 10), child: child!),
            ],
          ),
        ),
      ),
    );
  }
}

class AsyncPanel extends StatefulWidget {
  const AsyncPanel({super.key, required this.load, required this.builder});
  final Future<Json> Function() load;
  final Widget Function(Json) builder;
  @override
  State<AsyncPanel> createState() => _AsyncPanelState();
}

class _AsyncPanelState extends State<AsyncPanel> {
  late Future<Json> future;
  @override
  void initState() {
    super.initState();
    future = widget.load();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Json>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2.6)),
            );
          }
          if (snapshot.hasError) {
            return Column(
              children: [
                EmptyNotice(
                  snapshot.error.toString(),
                  icon: RuoIcon.alert,
                ),
                const SizedBox(height: 6),
                OutlinedButton.icon(
                  onPressed: () => setState(() => future = widget.load()),
                  icon: const RuoVectorIcon(RuoIcon.refresh, size: 16),
                  label: const Text('Thử lại'),
                ),
              ],
            );
          }
          return widget.builder(snapshot.data!);
        },
      );
}
