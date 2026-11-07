import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/tokens.dart';
import '../ui/vectors.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({
    super.key,
    required this.api,
    this.onToggleTheme,
  });

  final RuoApi api;
  final ValueChanged<Brightness>? onToggleTheme;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final brightness = Theme.of(context).brightness;
    final dark = brightness == Brightness.dark;

    final user = api.user ?? {};
    final fullName = value(user['full_name'], fallback: 'Cán bộ Đại học');
    final role = value(user['role'], fallback: 'lecturer');
    final email = value(user['email'], fallback: 'canbo@ruo.edu.vn');
    final code = value(user['code'] ?? user['id'], fallback: 'CB-2026');

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
        const SectionTitle(
          'Hồ Sơ Cán Bộ & Hệ Thống',
          eyebrow: 'TÀI KHOẢN NGƯỜI DÙNG',
          subtitle: 'Thông tin phiên làm việc, quyền hạn & cài đặt',
        ),
        const SizedBox(height: 18),
        // User profile card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: scheme.outlineVariant),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [RuoTokens.brand900, RuoTokens.brand600],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: RuoTokens.brand500.withValues(alpha: 0.35),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Center(
                  child: RuoVectorIcon(
                    RuoIcon.user,
                    size: 34,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                fullName,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                email,
                style: TextStyle(
                  fontSize: 13,
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: scheme.primary.withValues(alpha: 0.3)),
                ),
                child: Text(
                  roleLabel(role),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: scheme.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        // Technical System Details
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Column(
            children: [
              _infoRow(context, 'Mã cán bộ', code),
              const Divider(height: 18),
              _infoRow(context, 'Máy chủ API', api.baseUrl),
              const Divider(height: 18),
              _infoRow(context, 'Phiên bản ứng dụng', 'v4.2.0-core-suite'),
              const Divider(height: 18),
              _infoRow(context, 'Bảo mật phiên', 'Single-Flight Token Rotation'),
              const Divider(height: 18),
              _infoRow(context, 'Đồ họa', 'Native CustomPainter (Zero Font Icons)'),
            ],
          ),
        ),
        const SizedBox(height: 20),
        // Theme toggle card
        if (onToggleTheme != null)
          ListTile(
            tileColor: scheme.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: scheme.outlineVariant),
            ),
            leading: RuoVectorIcon(
              dark ? RuoIcon.sun : RuoIcon.moon,
              size: 20,
              color: scheme.primary,
            ),
            title: Text(
              dark ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
            ),
            trailing: const RuoVectorIcon(RuoIcon.chevronRight, size: 16),
            onTap: () => onToggleTheme!(brightness),
          ),
        const SizedBox(height: 20),
        // Logout button
        FilledButton.icon(
          key: const Key('profile_logout_btn'),
          onPressed: () async {
            final agreed = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Xác nhận đăng xuất?'),
                content: const Text(
                  'Phiên làm việc sẽ được xóa sạch trên thiết bị. Bạn có thể đăng nhập lại bất kỳ lúc nào.',
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('Ở lại'),
                  ),
                  FilledButton(
                    key: const Key('profile_logout_confirm'),
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Xác nhận đăng xuất'),
                  ),
                ],
              ),
            );
            if (agreed == true) {
              await api.logout();
            }
          },
          icon: const RuoVectorIcon(
            RuoIcon.logout,
            size: 18,
            color: Colors.white,
          ),
          style: FilledButton.styleFrom(
            backgroundColor: RuoTokens.rose600,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          label: const Text(
            'Đăng xuất khỏi thiết bị',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
          ),
        ),
      ],
    ),
  );
  }

  Widget _infoRow(BuildContext context, String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}
