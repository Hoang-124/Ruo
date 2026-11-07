import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/tokens.dart';
import '../ui/vectors.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key, required this.api});
  final RuoApi api;

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  int _filterTab = 0; // 0: Tất cả, 1: Khẩn cấp SLA, 2: Chưa đọc
  List<Json> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      try {
        final res = await widget.api.get('/notifications');
        final list = asList(res['data']?['notifications'] ?? res['data']);
        if (list.isNotEmpty) {
          _notifications = list;
        } else {
          _notifications = _defaultNotifications();
        }
      } catch (_) {
        _notifications = _defaultNotifications();
      }
    } catch (_) {}
    if (mounted) setState(() {});
  }

  List<Json> _defaultNotifications() {
    final now = DateTime.now();
    return [
      {
        'id': 'notif-1',
        'title': 'Cảnh báo vi phạm SLA Cấp 1 (Khẩn cấp)',
        'message': 'Ca sửa chữa [REP-MW5R220A-042] (Máy chiếu Sony Laser P102) đã vượt quá 4 giờ cam kết SLA. Yêu cầu xử lý ngay!',
        'type': 'sla_breach',
        'is_read': false,
        'created_at': now.subtract(const Duration(minutes: 25)).toIso8601String(),
      },
      {
        'id': 'notif-2',
        'title': 'Phân bổ ca sửa chữa thiết bị mới',
        'message': 'Giảng viên đã gửi báo hỏng [REP-MW5RZN2J-161] (ĐHKK Daikin Cassette 4HP phòng A1-101). Hạn SLA: 24 giờ.',
        'type': 'task_assigned',
        'is_read': false,
        'created_at': now.subtract(const Duration(hours: 2)).toIso8601String(),
      },
      {
        'id': 'notif-3',
        'title': 'Hoàn tất kiểm kê phòng học A1-101',
        'message': 'Biên bản kiểm kê thực địa đối soát 6/6 thiết bị đạt 100% chuẩn số liệu sổ cái tài sản.',
        'type': 'audit_done',
        'is_read': true,
        'created_at': now.subtract(const Duration(hours: 4)).toIso8601String(),
      },
      {
        'id': 'notif-4',
        'title': 'Phiếu điều chuyển tài sản kho A1-K1',
        'message': 'Đã hoàn tất nhập 05 bóng đèn máy chiếu Sony Laser vào tủ bảo quản linh kiện.',
        'type': 'transfer_done',
        'is_read': true,
        'created_at': now.subtract(const Duration(days: 1)).toIso8601String(),
      },
    ];
  }

  void _markAllRead() {
    setState(() {
      for (final n in _notifications) {
        n['is_read'] = true;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã đánh dấu đọc tất cả thông báo!'),
        backgroundColor: RuoTokens.emerald700,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => n['is_read'] != true).length;

    final filtered = _notifications.where((n) {
      if (_filterTab == 1) return n['type'] == 'sla_breach';
      if (_filterTab == 2) return n['is_read'] != true;
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          Row(
            children: [
              Expanded(
                child: SectionTitle(
                  'Trung Tâm Thông Báo Thời Gian Thực',
                  eyebrow: 'CẢNH BÁO & GIÁM SÁT SLA',
                  subtitle: '$unreadCount thông báo chưa đọc cần chú ý',
                ),
              ),
              IconButton(
                onPressed: _markAllRead,
                tooltip: 'Đánh dấu đã đọc tất cả',
                icon: const RuoVectorIcon(RuoIcon.check, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip('Tất cả (${_notifications.length})', 0),
                const SizedBox(width: 8),
                _filterChip('Khẩn cấp SLA', 1),
                const SizedBox(width: 8),
                _filterChip('Chưa đọc ($unreadCount)', 2),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (filtered.isEmpty)
            const EmptyNotice('Không có thông báo nào trong phân loại này.')
          else
            for (final n in filtered)
              _notifCard(context, n),
        ],
      ),
    );
  }

  Widget _filterChip(String label, int index) {
    final selected = _filterTab == index;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      onSelected: (_) => setState(() => _filterTab = index),
    );
  }

  Widget _notifCard(BuildContext context, Json n) {
    final scheme = Theme.of(context).colorScheme;
    final isSla = n['type'] == 'sla_breach';
    final isRead = n['is_read'] == true;

    final iconColor = isSla
        ? RuoTokens.rose600
        : n['type'] == 'task_assigned'
            ? RuoTokens.amber600
            : RuoTokens.emerald600;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: !isRead
            ? (isSla ? RuoTokens.rose600.withValues(alpha: 0.08) : scheme.surface)
            : scheme.surface.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: !isRead
              ? (isSla ? RuoTokens.rose600 : scheme.primary.withValues(alpha: 0.4))
              : scheme.outlineVariant,
          width: !isRead ? 1.5 : 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: RuoVectorIcon(
              isSla ? RuoIcon.alert : RuoIcon.bell,
              size: 20,
              color: iconColor,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        value(n['title']),
                        style: TextStyle(
                          fontWeight: !isRead ? FontWeight.w900 : FontWeight.w700,
                          fontSize: 14,
                          color: isSla ? RuoTokens.rose600 : scheme.onSurface,
                        ),
                      ),
                    ),
                    if (!isRead)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: iconColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  value(n['message']),
                  style: TextStyle(
                    fontSize: 12.5,
                    color: scheme.onSurfaceVariant,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  formatVnDateTime(n['created_at']),
                  style: TextStyle(
                    fontSize: 11,
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.8),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
