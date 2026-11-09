import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/api.dart';
import 'features/operations.dart';
import 'features/field_equipment.dart';
import 'features/field_inventory.dart';
import 'features/field_notifications.dart';
import 'features/field_profile.dart';
import 'features/field_repairs.dart';
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
  final savedUrl = preferences.getString('server_url');
  final initialUrl = (savedUrl != null && savedUrl.isNotEmpty)
      ? savedUrl
      : (configured.isNotEmpty
            ? configured
            : 'http://$_defaultLocalHost:5000/api');
  final api = RuoApi(baseUrl: initialUrl, preferences: preferences);
  api.tryRestoreSession();
  runApp(RuoApp(api: api, preferences: preferences));
}

ThemeMode _decodeThemeMode(String? raw) => switch (raw) {
  'dark' => ThemeMode.dark,
  _ => ThemeMode.light,
};

String _encodeThemeMode(ThemeMode mode) => switch (mode) {
  ThemeMode.dark => 'dark',
  _ => 'light',
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
          : Workspace(api: widget.api, onToggleTheme: _cycleTheme),
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
                    const SizedBox(height: 14),
                    Text(
                      'ĐĂNG NHẬP NHANH (MÔI TRƯỜNG DEMO)',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.9,
                        color: scheme.primary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ActionChip(
                          avatar: const RuoVectorIcon(RuoIcon.user, size: 14),
                          label: const Text('GV001 (Giảng viên)'),
                          onPressed: () {
                            _identifier.text = 'GV001';
                            _password.text = 'Ruo@2026';
                            _login();
                          },
                        ),
                        ActionChip(
                          avatar: const RuoVectorIcon(RuoIcon.wrench, size: 14),
                          label: const Text('KT001 (Kỹ thuật viên)'),
                          onPressed: () {
                            _identifier.text = 'KT001';
                            _password.text = 'Ruo@2026';
                            _login();
                          },
                        ),
                        ActionChip(
                          avatar: const RuoVectorIcon(
                            RuoIcon.dashboard,
                            size: 14,
                          ),
                          label: const Text('QL001 (Quản lý)'),
                          onPressed: () {
                            _identifier.text = 'QL001';
                            _password.text = 'Ruo@2026';
                            _login();
                          },
                        ),
                        ActionChip(
                          avatar: const RuoVectorIcon(
                            RuoIcon.blueprint,
                            size: 14,
                          ),
                          label: const Text('AD001 (Quản trị)'),
                          onPressed: () {
                            _identifier.text = 'AD001';
                            _password.text = 'Ruo@2026';
                            _login();
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
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
                      child: Text(
                        _busy ? 'Đang đăng nhập…' : 'ĐĂNG NHẬP VÀO HỆ THỐNG',
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

  void _navigateToTab(int index) {
    setState(() => _tab = index);
  }

  void _pushPage(String title, Widget page) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text(title)),
          body: page,
        ),
      ),
    );
  }

  Widget _drawerSectionHeader(BuildContext context, String title) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.0,
          color: scheme.primary,
        ),
      ),
    );
  }

  Widget _drawerItem(
    BuildContext context, {
    required RuoIcon icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color? titleColor,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      leading: RuoVectorIcon(
        icon,
        size: 20,
        color: titleColor ?? scheme.onSurfaceVariant,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w700,
          color: titleColor ?? scheme.onSurface,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 11,
          color: scheme.onSurfaceVariant,
        ),
      ),
      onTap: onTap,
      dense: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final dark = brightness == Brightness.dark;
    final scheme = Theme.of(context).colorScheme;

    final role = widget.api.user?['role']?.toString();
    final isLecturer = role == 'lecturer';
    final isTechnician = role == 'technician';

    // Ergonomic 4 Bottom Tabs per role (Material Design 3 standard)
    final tabs = <(String, RuoIcon, Widget)>[
      if (isTechnician) ...[
        ('SLA Sửa Chữa', RuoIcon.wrench, TechnicianTasksPage(api: widget.api)),
        ('Tầng & Phòng', RuoIcon.blueprint, CadPage(api: widget.api)),
        ('Phòng học', RuoIcon.door, RoomsPage(api: widget.api)),
        (
          'Hồ sơ',
          RuoIcon.user,
          ProfilePage(api: widget.api, onToggleTheme: widget.onToggleTheme),
        ),
      ] else if (isLecturer) ...[
        ('Tầng & Phòng', RuoIcon.blueprint, CadPage(api: widget.api)),
        ('Quét QR', RuoIcon.qrCode, QrScannerPage(api: widget.api)),
        ('Phòng học', RuoIcon.door, RoomsPage(api: widget.api)),
        (
          'Hồ sơ',
          RuoIcon.user,
          ProfilePage(api: widget.api, onToggleTheme: widget.onToggleTheme),
        ),
      ] else ...[
        ('Tầng & Phòng', RuoIcon.blueprint, CadPage(api: widget.api)),
        ('Phòng học', RuoIcon.door, RoomsPage(api: widget.api)),
        ('Báo cáo', RuoIcon.chart, ReportsPage(api: widget.api)),
        (
          'Hồ sơ',
          RuoIcon.user,
          ProfilePage(api: widget.api, onToggleTheme: widget.onToggleTheme),
        ),
      ],
    ];
    final safeTab = _tab.clamp(0, tabs.length - 1);

    return Scaffold(
      drawer: Drawer(
        child: SafeArea(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                decoration: BoxDecoration(
                  color: dark ? RuoTokens.darkSurface : RuoTokens.lightSurface,
                  border: Border(
                    bottom: BorderSide(
                      color: scheme.outlineVariant.withValues(alpha: 0.5),
                    ),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const RuoLogoMark(size: 38),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'RUO CAMPUS',
                              style: TextStyle(
                                fontSize: 16.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2.0,
                                color: scheme.onSurface,
                              ),
                            ),
                            Text(
                              'QUẢN LÝ CƠ SỞ VẬT CHẤT',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.8,
                                color: scheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      widget.api.user?['full_name']?.toString() ??
                          'Cán bộ trường',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
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
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.api.user?['department']?.toString() ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _drawerSectionHeader(context, 'ĐIỀU HÀNH & HIỆN TRƯỜNG'),
              _drawerItem(
                context,
                icon: RuoIcon.blueprint,
                title: 'Mặt bằng CAD 5 tầng',
                subtitle: 'Sơ đồ tòa nhà A1, giếng trời & phòng',
                onTap: () {
                  Navigator.pop(context);
                  final idx =
                      tabs.indexWhere((t) => t.$2 == RuoIcon.blueprint);
                  if (idx >= 0) _navigateToTab(idx);
                },
              ),
              _drawerItem(
                context,
                icon: RuoIcon.door,
                title: 'Danh mục phòng học',
                subtitle: '91 phòng, sức chứa & loại phòng',
                onTap: () {
                  Navigator.pop(context);
                  final idx = tabs.indexWhere((t) => t.$2 == RuoIcon.door);
                  if (idx >= 0) _navigateToTab(idx);
                },
              ),
              _drawerItem(
                context,
                icon: RuoIcon.qrCode,
                title: 'Trạm quét mã QR',
                subtitle: 'Quét camera & tra cứu thiết bị',
                onTap: () {
                  Navigator.pop(context);
                  final idx = tabs.indexWhere((t) => t.$2 == RuoIcon.qrCode);
                  if (idx >= 0) {
                    _navigateToTab(idx);
                  } else {
                    _pushPage(
                      'Quét QR Định Danh Thiết Bị',
                      QrScannerPage(api: widget.api),
                    );
                  }
                },
              ),
              _drawerItem(
                context,
                icon: RuoIcon.wrench,
                title: 'SLA Tiếp nhận & Sửa chữa',
                subtitle: 'Nhiệm vụ bảo trì hiện trường',
                onTap: () {
                  Navigator.pop(context);
                  final idx = tabs.indexWhere((t) => t.$2 == RuoIcon.wrench);
                  if (idx >= 0) {
                    _navigateToTab(idx);
                  } else {
                    _pushPage(
                      'Nhiệm Vụ Kỹ Thuật Viên',
                      TechnicianTasksPage(api: widget.api),
                    );
                  }
                },
              ),
              _drawerItem(
                context,
                icon: RuoIcon.inventory,
                title: 'Kiểm kê phòng học',
                subtitle: 'Đối soát thiết bị tại chỗ',
                onTap: () {
                  Navigator.pop(context);
                  _pushPage(
                    'Kiểm Kê Phòng Học',
                    ClassroomAuditPage(api: widget.api),
                  );
                },
              ),
              _drawerItem(
                context,
                icon: RuoIcon.chart,
                title: 'Báo cáo sự cố toàn trường',
                subtitle: 'Thống kê phiếu & thời hạn xử lý',
                onTap: () {
                  Navigator.pop(context);
                  final idx = tabs.indexWhere((t) => t.$2 == RuoIcon.chart);
                  if (idx >= 0) {
                    _navigateToTab(idx);
                  } else {
                    _pushPage('Báo Cáo Sự Cố', ReportsPage(api: widget.api));
                  }
                },
              ),
              if (['admin', 'facility_manager', 'technician']
                  .contains(widget.api.user?['role'])) ...[
                _drawerSectionHeader(context, 'NGHIỆP VỤ QUẢN TRỊ CSVC'),
                _drawerItem(
                  context,
                  icon: RuoIcon.transfer,
                  title: 'Nghiệp vụ CSVC tổng hợp',
                  subtitle: 'Điều chuyển, kiểm kê, thanh lý & danh mục',
                  onTap: () {
                    Navigator.pop(context);
                    _pushPage(
                      'Nghiệp Vụ Cơ Sở Vật Chất',
                      OperationsPage(api: widget.api),
                    );
                  },
                ),
              ],
              _drawerSectionHeader(context, 'HỆ THỐNG & CÁ NHÂN'),
              _drawerItem(
                context,
                icon: RuoIcon.bell,
                title: 'Trung tâm thông báo',
                subtitle: 'Cảnh báo sự cố & điều chuyển',
                onTap: () {
                  Navigator.pop(context);
                  _pushPage(
                    'Trung tâm thông báo',
                    NotificationsPage(api: widget.api),
                  );
                },
              ),
              _drawerItem(
                context,
                icon: dark ? RuoIcon.sun : RuoIcon.moon,
                title: dark ? 'Chế độ Sáng' : 'Chế độ Tối',
                subtitle: dark ? 'Đổi sang nền sáng' : 'Đổi sang nền tối obsidian',
                onTap: () {
                  if (widget.onToggleTheme != null) {
                    widget.onToggleTheme!(brightness);
                  }
                },
              ),
              _drawerItem(
                context,
                icon: RuoIcon.logout,
                title: 'Đăng xuất an toàn',
                subtitle: 'Xóa phiên đăng nhập trên thiết bị',
                titleColor: RuoTokens.rose600,
                onTap: () async {
                  Navigator.pop(context);
                  final agreed = await showDialog<bool>(
                    context: context,
                    builder: (c) => AlertDialog(
                      title: const Text('Đăng xuất?'),
                      content: const Text(
                        'Phiên đăng nhập trên thiết bị này sẽ được đóng lại.',
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
                  if (agreed == true && mounted) {
                    await widget.api.logout();
                  }
                },
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
      appBar: AppBar(
        titleSpacing: 0,
        leading: Builder(
          builder: (ctx) => IconButton(
            key: const Key('workspace_drawer_button'),
            tooltip: 'Menu hệ thống',
            onPressed: () => Scaffold.of(ctx).openDrawer(),
            icon: RuoVectorIcon(
              RuoIcon.menu,
              size: 22,
              color: scheme.onSurface,
            ),
          ),
        ),
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
          IconButton(
            tooltip: 'Thông báo',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: const Text('Trung tâm thông báo')),
                    body: NotificationsPage(api: widget.api),
                  ),
                ),
              );
            },
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                RuoVectorIcon(
                  RuoIcon.bell,
                  size: 20,
                  color: scheme.onSurfaceVariant,
                ),
                Positioned(
                  top: -2,
                  right: -2,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: RuoTokens.rose600,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
          ),
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
            decoration: const InputDecoration(labelText: 'Mật khẩu hiện tại'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: newPassword,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Mật khẩu mới',
              helperText: 'Ít nhất 8 ký tự, hoa, thường, số và ký tự đặc biệt.',
            ),
          ),
          if (message != null)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                message!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: busy
                ? null
                : () async {
                    setState(() => busy = true);
                    try {
                      await widget.api.send('POST', '/auth/change-password', {
                        'oldPassword': oldPassword.text,
                        'newPassword': newPassword.text,
                      });
                      widget.api.clearSession();
                    } catch (e) {
                      if (mounted) setState(() => message = e.toString());
                    } finally {
                      if (mounted) setState(() => busy = false);
                    }
                  },
            child: Text(busy ? 'Đang lưu…' : 'Đổi mật khẩu và đăng nhập lại'),
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
