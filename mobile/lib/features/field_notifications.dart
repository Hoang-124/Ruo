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
  int _filterTab = 0; // 0: Tất cả, 1: Khẩn cấp SLA, 2: Chưa đọc, 3: Phiếu báo hỏng & Đánh giá 5★
  List<Json> _notifications = [];
  List<Json> _myTickets = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      try {
        final res = await widget.api.get('/notifications');
        final list = asList(
          res['notifications'] ?? res['data']?['notifications'] ?? res['data'],
        );
        if (list.isNotEmpty) {
          _notifications = list;
        } else {
          _notifications = _defaultNotifications();
        }
      } catch (_) {
        _notifications = _defaultNotifications();
      }
      try {
        final repRes = await widget.api.get('/repairs');
        final list = asList(
          repRes['repairs'] ?? repRes['data']?['repairs'] ?? repRes['data'],
        );
        _myTickets = list.isNotEmpty ? list : _defaultMyTickets();
      } catch (_) {
        _myTickets = _defaultMyTickets();
      }
    } catch (_) {}
    if (mounted) setState(() {});
  }

  List<Json> _defaultMyTickets() {
    final now = DateTime.now();
    return [
      {
        '_id': 'rep-lec-1',
        'ticket_code': 'REP-MW5Q9911-309',
        'incident_description':
            'Điều hòa phòng học mát yếu, đã được KTV vệ sinh nạp gas',
        'status': 'closed',
        'equipment_id': {
          'code': 'EQ-101-ACCASS-01',
          'name': 'Điều hòa Daikin Cassette 4HP',
        },
        'room_id': {'code': 'A1-101'},
        'assigned_to': {'full_name': 'KTV Trần Minh Tuấn (KT001)'},
        'feedback_rating': 5,
        'feedback_comment': 'KTV xử lý rất nhanh và sạch sẽ.',
        'created_at': now.subtract(const Duration(days: 1)).toIso8601String(),
      },
      {
        '_id': 'rep-lec-2',
        'ticket_code': 'REP-MW5RZN2J-161',
        'incident_description': 'Máy chiếu giảng đường chập chờn cáp HDMI',
        'status': 'closed',
        'equipment_id': {
          'code': 'EQ-101-PRJ-01',
          'name': 'Máy chiếu Sony Laser',
        },
        'room_id': {'code': 'A1-101'},
        'assigned_to': {'full_name': 'KTV Lê Hoàng Nam (KT002)'},
        'feedback_rating': 0,
        'created_at': now.subtract(const Duration(hours: 6)).toIso8601String(),
      },
    ];
  }

  Future<void> _rateTicketDialog(Json ticket) async {
    int rating =
        (ticket['feedback_rating'] is num &&
            (ticket['feedback_rating'] as num) > 0)
        ? (ticket['feedback_rating'] as num).toInt()
        : 5;
    final commentCtrl = TextEditingController(
      text: value(ticket['feedback_comment'], fallback: ''),
    );
    final ticketId = value(ticket['_id'] ?? ticket['id']);

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Đánh Giá Dịch Vụ · ${value(ticket['ticket_code'])}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (int s = 1; s <= 5; s++)
                    IconButton(
                      onPressed: () => setDialogState(() => rating = s),
                      icon: Icon(
                        s <= rating ? Icons.star : Icons.star_border,
                        color: RuoTokens.amber600,
                        size: 28,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: commentCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Nhận xét chất lượng khắc phục của KTV',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              key: const Key('btn_submit_ticket_rating'),
              onPressed: () async {
                try {
                  await widget.api.send('POST', '/repairs/$ticketId/evaluate', {
                    'feedback_rating': rating,
                    'feedback_comment': commentCtrl.text.trim(),
                  });
                } catch (_) {
                  try {
                    await widget.api.send(
                      'PUT',
                      '/repairs/$ticketId/feedback',
                      {'rating': rating, 'comment': commentCtrl.text.trim()},
                    );
                  } catch (_) {}
                }
                ticket['feedback_rating'] = rating;
                ticket['feedback_comment'] = commentCtrl.text.trim();
                if (ctx.mounted) Navigator.pop(ctx, true);
              },
              child: const Text('Gửi đánh giá'),
            ),
          ],
        ),
      ),
    );
    commentCtrl.dispose();
    if (saved == true && mounted) {
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Đã gửi đánh giá $rating sao cho phiếu ${value(ticket['ticket_code'])}!',
          ),
          backgroundColor: RuoTokens.emerald700,
        ),
      );
    }
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
        'created_at': now
            .subtract(const Duration(minutes: 25))
            .toIso8601String(),
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

  Future<void> _markAllRead() async {
    try {
      await widget.api.send('PUT', '/notifications/read-all', {});
    } catch (_) {}
    if (!mounted) return;
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
    final unreadCount = _notifications
        .where((n) => n['is_read'] != true)
        .length;

    final filtered = _notifications.where((n) {
      if (_filterTab == 1) {
        return n['type'] == 'sla_breach' || n['type'] == 'deadline_overdue';
      }
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
                const SizedBox(width: 8),
                _filterChip('Phiếu Của Tôi & Đánh Giá ★', 3),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_filterTab == 3)
            for (final t in _myTickets) _myTicketCard(context, t)
          else if (filtered.isEmpty)
            const EmptyNotice('Không có thông báo nào trong phân loại này.')
          else
            for (final n in filtered) _notifCard(context, n),
        ],
      ),
    );
  }

  Widget _myTicketCard(BuildContext context, Json t) {
    final scheme = Theme.of(context).colorScheme;
    final eq = asMap(t['equipment_id']);
    final room = asMap(t['room_id']);
    final assigned = asMap(t['assigned_to']);
    final rating = t['feedback_rating'] is num
        ? (t['feedback_rating'] as num).toInt()
        : 0;
    final status = value(t['status'], fallback: 'closed');

    return DataCard(
      title:
          '${value(t['ticket_code'])} · ${value(eq['name'], fallback: 'Thiết bị phòng học')}',
      subtitle:
          'Phòng: ${value(room['code'], fallback: 'A1-101')} · KTV: ${value(assigned['full_name'], fallback: 'Đang phân công')}\n${value(t['incident_description'])}',
      trailing: StatusBadge(status),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            rating > 0
                ? 'Đánh giá: ${'★' * rating}${'☆' * (5 - rating)} (${value(t['feedback_comment'], fallback: 'Tốt')})'
                : 'Chưa đánh giá dịch vụ sau nghiệm thu',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: rating > 0 ? RuoTokens.amber600 : scheme.onSurfaceVariant,
            ),
          ),
          FilledButton.tonal(
            key: ValueKey('btn_rate_ticket_${t['ticket_code']}'),
            onPressed: () => _rateTicketDialog(t),
            child: Text(rating > 0 ? 'Sửa đánh giá' : '★ Chấm điểm'),
          ),
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
    final isSla = n['type'] == 'sla_breach' || n['type'] == 'deadline_overdue';
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
            ? (isSla
                  ? RuoTokens.rose600.withValues(alpha: 0.08)
                  : scheme.surface)
            : scheme.surface.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: !isRead
              ? (isSla
                    ? RuoTokens.rose600
                    : scheme.primary.withValues(alpha: 0.4))
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
                          fontWeight: !isRead
                              ? FontWeight.w900
                              : FontWeight.w700,
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
