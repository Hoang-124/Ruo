import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/api.dart';
import 'features/operations.dart';
import 'features/reports.dart';
import 'features/rooms.dart';
import 'ui/common.dart';
import 'ui/tokens.dart';
import 'ui/vectors.dart';

String get _defaultLocalHost =>
    (!kIsWeb && defaultTargetPlatform == TargetPlatform.android)
        ? '10.0.2.2'
        : '127.0.0.1';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final preferences = await SharedPreferences.getInstance();
  const configured = String.fromEnvironment('RUO_API_URL', defaultValue: '');
  final api = RuoApi(
    baseUrl: configured.isNotEmpty
        ? configured
        : preferences.getString('server_url') ??
              'http://$_defaultLocalHost:5000/api',
  );
  runApp(RuoApp(api: api, preferences: preferences));
}

ThemeMode _decodeThemeMode(String? raw) => switch (raw) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };

String _encodeThemeMode(ThemeMode mode) => switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };

class RuoApp extends StatefulWidget {
  const RuoApp({super.key, required this.api, this.preferences});
  final RuoApi api;
  final SharedPreferences? preferences;

  @override
  State<RuoApp> createState() => _RuoAppState();
}

class _RuoAppState extends State<RuoApp> {
  late ThemeMode _themeMode;

  @override
  void initState() {
    super.initState();
    _themeMode = _decodeThemeMode(widget.preferences?.getString('theme_mode'));
  }

  void _cycleTheme(Brightness currentBrightness) {
    final next = currentBrightness == Brightness.dark
        ? ThemeMode.light
        : ThemeMode.dark;
    setState(() => _themeMode = next);
    widget.preferences?.setString('theme_mode', _encodeThemeMode(next));
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: widget.api,
        builder: (context, _) => MaterialApp(
          key: ValueKey(
            '${widget.api.signedIn}-${widget.api.user?['id']}-${widget.api.mustChangePassword}',
          ),
          debugShowCheckedModeBanner: false,
          title: 'Ruo · Cơ sở vật chất',
          theme: RuoTokens.theme(Brightness.light),
          darkTheme: RuoTokens.theme(Brightness.dark),
          themeMode: _themeMode,
          home: !widget.api.signedIn
              ? LoginPage(
                  api: widget.api,
                  preferences: widget.preferences,
                  onToggleTheme: _cycleTheme,
                )
              : widget.api.mustChangePassword
                  ? PasswordPage(api: widget.api)
                  : Workspace(
                      api: widget.api,
                      onToggleTheme: _cycleTheme,
                    ),
        ),
      );
}

class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.api,
    this.preferences,
    this.onToggleTheme,
  });
  final RuoApi api;
  final SharedPreferences? preferences;
  final ValueChanged<Brightness>? onToggleTheme;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _form = GlobalKey<FormState>();
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  late final _url = TextEditingController(text: widget.api.baseUrl);
  bool _busy = false, _visible = false, _showServer = false;
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    _url.dispose();
    super.dispose();
  }

  static String? _alternateLocalEmulatorUrl(String raw) {
    final uri = Uri.tryParse(raw.trim().replaceFirst(RegExp(r'/+$'), ''));
    if (uri == null ||
        uri.scheme != 'http' ||
        !const ['10.0.2.2', '127.0.0.1', 'localhost'].contains(uri.host) ||
        uri.path != '/api') {
      return null;
    }
    if (uri.port == 5000) return 'http://${uri.host}:5001/api';
    if (uri.port == 5001) return 'http://${uri.host}:5000/api';
    return null;
  }

  Future<void> _login() async {
    if (!_form.currentState!.validate() || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      widget.api.configure(_url.text);
      try {
        await widget.api.login(_identifier.text, _password.text);
      } on ApiException catch (e) {
        final original = widget.api.baseUrl;
        final alt = _alternateLocalEmulatorUrl(original);
        if (e.status == 0 && alt != null) {
          try {
            widget.api.configure(alt);
            final health = await widget.api.get('/health');
            if (health['success'] == true) {
              _url.text = alt;
              await widget.api.login(_identifier.text, _password.text);
            } else {
              widget.api.configure(original);
              rethrow;
            }
          } catch (_) {
            if (!widget.api.signedIn) {
              widget.api.configure(original);
            }
            rethrow;
          }
        } else {
          rethrow;
        }
      }
      await widget.preferences?.setString('server_url', widget.api.baseUrl);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final dark = brightness == Brightness.dark;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const RuoLogoMark(size: 50),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'RUO',
                                style: TextStyle(
                                  fontSize: 30,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 3.5,
                                  color: scheme.onSurface,
                                ),
                              ),
                              Text(
                                'QUẢN LÝ CƠ SỞ VẬT CHẤT ĐẠI HỌC',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.8,
                                  color: scheme.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (widget.onToggleTheme != null)
                          IconButton(
                            key: const Key('theme_toggle'),
                            tooltip: dark ? 'Chế độ sáng' : 'Chế độ tối',
                            onPressed: () => widget.onToggleTheme!(brightness),
                            icon: RuoVectorIcon(
                              dark ? RuoIcon.sun : RuoIcon.moon,
                              size: 20,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    Text(
                      'Không gian học tập,\ntrong tầm tay.',
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                            height: 1.18,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Mặt bằng A1 5 tầng · Danh mục phòng · Dashboard & Báo cáo',
                      style: TextStyle(
                        fontSize: 13.5,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 26),
                    TextFormField(
                      key: const Key('login_identifier'),
                      controller: _identifier,
                      decoration: const InputDecoration(
                        labelText: 'Email hoặc mã cán bộ',
                      ),
                      autofillHints: const [AutofillHints.username],
                      validator: (v) => v == null || v.trim().isEmpty
                          ? 'Nhập email hoặc mã cán bộ.'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      key: const Key('login_password'),
                      controller: _password,
                      obscureText: !_visible,
                      autofillHints: const [AutofillHints.password],
                      decoration: InputDecoration(
                        labelText: 'Mật khẩu',
                        suffixIcon: Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: TextButton.icon(
                            onPressed: () =>
                                setState(() => _visible = !_visible),
                            icon: RuoVectorIcon(
                              _visible ? RuoIcon.eyeOff : RuoIcon.eye,
                              size: 16,
                              color: scheme.primary,
                            ),
                            label: Text(_visible ? 'Ẩn' : 'Hiện'),
                          ),
                        ),
                      ),
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Nhập mật khẩu.' : null,
                      onFieldSubmitted: (_) => _login(),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: scheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: scheme.outlineVariant),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () =>
                                setState(() => _showServer = !_showServer),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                              child: Row(
                                children: [
                                  RuoVectorIcon(
                                    RuoIcon.server,
                                    size: 17,
                                    color: scheme.primary,
                                  ),
                                  const SizedBox(width: 10),
                                  const Expanded(
                                    child: Text(
                                      'Kết nối máy chủ',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13.5,
                                      ),
                                    ),
                                  ),
                                  RuoVectorIcon(
                                    RuoIcon.chevronDown,
                                    size: 16,
                                    color: scheme.onSurfaceVariant,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          if (_showServer)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  TextFormField(
                                    controller: _url,
                                    onChanged: (_) => setState(() {}),
                                    decoration: const InputDecoration(
                                      labelText: 'URL API',
                                    ),
                                    keyboardType: TextInputType.url,
                                    validator: (v) {
                                      try {
                                        RuoApi.normalizeUrl(v ?? '');
                                        return null;
                                      } catch (e) {
                                        return e.toString();
                                      }
                                    },
                                  ),
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      ChoiceChip(
                                        label: const Text('Backend (:5000)'),
                                        selected: _url.text.trim().contains(
                                          ':5000',
                                        ),
                                        showCheckmark: false,
                                        onSelected: (_) => setState(
                                          () => _url.text =
                                              'http://$_defaultLocalHost:5000/api',
                                        ),
                                      ),
                                      ChoiceChip(
                                        label: const Text('Demo (:5001)'),
                                        selected: _url.text.trim().contains(
                                          ':5001',
                                        ),
                                        showCheckmark: false,
                                        onSelected: (_) => setState(
                                          () => _url.text =
                                              'http://$_defaultLocalHost:5001/api',
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Máy ảo Android dùng 10.0.2.2. Điện thoại thật dùng IP LAN của PC chạy Ruo cùng Wi-Fi.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: scheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (_error != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: scheme.error.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: scheme.error.withValues(alpha: 0.45),
                          ),
                        ),
                        child: Text(
                          _error!,
                          style: TextStyle(
                            color: scheme.error,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    FilledButton(
                      key: const Key('login_submit'),
                      onPressed: _busy ? null : _login,
                      child: Text(_busy ? 'Đang đăng nhập…' : 'Đăng nhập'),
                    ),
                    const SizedBox(height: 22),
                    Text(
                      'Ruo Mobile · Học phần PRM\nPhạm vi thực hiện: Tùng (Cơ sở vật chất, CAD 2D & Báo cáo)',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class Workspace extends StatefulWidget {
  const Workspace({super.key, required this.api, this.onToggleTheme});
  final RuoApi api;
  final ValueChanged<Brightness>? onToggleTheme;

  @override
  State<Workspace> createState() => _WorkspaceState();
}

class _WorkspaceState extends State<Workspace> {
  int _tab = 0;
  bool _loggingOut = false;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final dark = brightness == Brightness.dark;
    final scheme = Theme.of(context).colorScheme;

    final tabs = <(String, RuoIcon, Widget)>[
      ('Mặt bằng', RuoIcon.blueprint, CadPage(api: widget.api)),
      ('Phòng học', RuoIcon.door, RoomsPage(api: widget.api)),
      if (widget.api.canReport) ...[
        ('Tổng quan', RuoIcon.dashboard, DashboardPage(api: widget.api)),
        ('Báo cáo', RuoIcon.chart, ReportsPage(api: widget.api)),
      ],
      if (['admin', 'facility_manager', 'technician']
          .contains(widget.api.user?['role']))
        ('Nghiệp vụ', RuoIcon.transfer, OperationsPage(api: widget.api)),
    ];
    final safeTab = _tab.clamp(0, tabs.length - 1);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            const RuoLogoMark(size: 34),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'RUO',
                        style: TextStyle(
                          fontSize: 16.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.2,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: scheme.primary.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          roleLabel(widget.api.user?['role']),
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: scheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    widget.api.user?['full_name']?.toString() ??
                        'Cơ sở vật chất',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (widget.onToggleTheme != null)
            IconButton(
              key: const Key('workspace_theme_toggle'),
              tooltip: dark ? 'Chế độ sáng' : 'Chế độ tối',
              onPressed: () => widget.onToggleTheme!(brightness),
              icon: RuoVectorIcon(
                dark ? RuoIcon.sun : RuoIcon.moon,
                size: 19,
                color: scheme.onSurfaceVariant,
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: TextButton.icon(
              onPressed: _loggingOut
                  ? null
                  : () async {
                      final agreed = await showDialog<bool>(
                        context: context,
                        builder: (c) => AlertDialog(
                          title: const Text('Đăng xuất?'),
                          content: const Text(
                            'Bạn có thể đăng nhập lại bằng tài khoản Ruo.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(c, false),
                              child: const Text('Ở lại'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(c, true),
                              child: const Text('Đăng xuất'),
                            ),
                          ],
                        ),
                      );
                      if (agreed != true || !mounted) return;
                      setState(() => _loggingOut = true);
                      try {
                        await widget.api.logout();
                      } catch (_) {
                        /* Local session was cleared in finally. */
                      } finally {
                        if (mounted) setState(() => _loggingOut = false);
                      }
                    },
              icon: RuoVectorIcon(
                RuoIcon.logout,
                size: 16,
                color: scheme.primary,
              ),
              label: const Text('Thoát'),
            ),
          ),
        ],
      ),
      body: SafeArea(child: tabs[safeTab].$3),
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeTab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          for (final item in tabs)
            NavigationDestination(
              icon: RuoVectorIcon(
                item.$2,
                size: 21,
                color: scheme.onSurfaceVariant,
              ),
              selectedIcon: RuoVectorIcon(
                item.$2,
                size: 21,
                strokeWidth: 2.15,
                color: scheme.primary,
              ),
              label: item.$1,
            ),
        ],
      ),
    );
  }
}

class PasswordPage extends StatefulWidget {
  const PasswordPage({super.key, required this.api});
  final RuoApi api;
  @override
  State<PasswordPage> createState() => _PasswordPageState();
}

class _PasswordPageState extends State<PasswordPage> {
  final oldPassword = TextEditingController(),
      newPassword = TextEditingController();
  String? message;
  bool busy = false;

  @override
  void dispose() {
    oldPassword.dispose();
    newPassword.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Đổi mật khẩu bắt buộc')),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'Tài khoản dùng mật khẩu tạm thời. Đổi mật khẩu trước khi truy cập dữ liệu.',
              ),
              const SizedBox(height: 20),
              TextField(
                controller: oldPassword,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Mật khẩu hiện tại',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: newPassword,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Mật khẩu mới',
                  helperText:
                      'Ít nhất 8 ký tự, hoa, thường, số và ký tự đặc biệt.',
                ),
              ),
              if (message != null)
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    message!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: busy
                    ? null
                    : () async {
                        setState(() => busy = true);
                        try {
                          await widget.api.send(
                            'POST',
                            '/auth/change-password',
                            {
                              'oldPassword': oldPassword.text,
                              'newPassword': newPassword.text,
                            },
                          );
                          widget.api.clearSession();
                        } catch (e) {
                          if (mounted) setState(() => message = e.toString());
                        } finally {
                          if (mounted) setState(() => busy = false);
                        }
                      },
                child: Text(
                  busy ? 'Đang lưu…' : 'Đổi mật khẩu và đăng nhập lại',
                ),
              ),
              TextButton(
                onPressed: widget.api.clearSession,
                child: const Text('Về đăng nhập'),
              ),
            ],
          ),
        ),
      );
}
