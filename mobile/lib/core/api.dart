import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

typedef Json = Map<String, dynamic>;

class ApiException implements Exception {
  final int status;
  final String message;
  final Json details;
  const ApiException(this.status, this.message, [this.details = const {}]);
  @override
  String toString() => message;
}

class RuoApi extends ChangeNotifier {
  RuoApi({
    http.Client? client,
    String baseUrl = 'http://10.0.2.2:5000/api',
    this.preferences,
  })  : _client = client ?? http.Client(),
        _baseUrl = normalizeUrl(baseUrl);
  final http.Client _client;
  final SharedPreferences? preferences;
  String _baseUrl;
  String? _token;
  String? _refreshToken;
  Future<void>? _refreshing;
  int _session = 0;
  Json? user;
  String get baseUrl => _baseUrl;
  bool get isAdmin => user?['role'] == 'admin';
  bool get canReport => isAdmin || user?['role'] == 'facility_manager';
  bool get signedIn => _token != null && user != null;
  bool get mustChangePassword => user?['force_change_pw'] == true;

  static String normalizeUrl(String input) {
    final raw = input.trim().replaceFirst(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(raw);
    if (uri == null ||
        !['http', 'https'].contains(uri.scheme) ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment) {
      throw const ApiException(
        0,
        'URL máy chủ cần có dạng https://ten-may-chu/api.',
      );
    }
    return raw.endsWith('/api') ? raw : '$raw/api';
  }

  void configure(String url) {
    final normalized = normalizeUrl(url);
    if (_baseUrl != normalized) {
      clearSession();
      _baseUrl = normalized;
    }
  }

  void clearSession() {
    _session++;
    _token = null;
    _refreshToken = null;
    user = null;
    preferences?.remove('auth_token');
    preferences?.remove('refresh_token');
    preferences?.remove('auth_user');
    notifyListeners();
  }

  bool tryRestoreSession() {
    if (preferences == null) return false;
    final token = preferences!.getString('auth_token');
    final refreshToken = preferences!.getString('refresh_token');
    final userRaw = preferences!.getString('auth_user');
    if (token != null &&
        token.isNotEmpty &&
        refreshToken != null &&
        refreshToken.isNotEmpty &&
        userRaw != null &&
        userRaw.isNotEmpty) {
      try {
        final decoded = jsonDecode(userRaw);
        if (decoded is Json) {
          _token = token;
          _refreshToken = refreshToken;
          user = decoded;
          notifyListeners();
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  Future<http.Response> _http(
    String method,
    String path, {
    Json? body,
    Map<String, String>? query,
    bool auth = true,
  }) async {
    if (!path.startsWith('/') ||
        path.startsWith('//') ||
        path.contains('://')) {
      throw const ApiException(0, 'Đường dẫn API không hợp lệ.');
    }
    final request = http.Request(
      method,
      Uri.parse('$_baseUrl$path').replace(queryParameters: query),
    );
    request.headers.addAll({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    });
    if (auth && _token != null) {
      request.headers['Authorization'] = 'Bearer $_token';
    }
    if (body != null) request.body = jsonEncode(body);
    try {
      return await _client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(const Duration(seconds: 25));
    } on TimeoutException {
      throw const ApiException(
        0,
        'Máy chủ phản hồi quá lâu. Kiểm tra kết nối và thử lại.',
      );
    } on http.ClientException {
      throw const ApiException(
        0,
        'Không kết nối được máy chủ. Kiểm tra URL, Wi-Fi và backend Ruo.',
      );
    }
  }

  Json _decode(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (_) {
      decoded = null;
    }
    final json = decoded is Json ? decoded : <String, dynamic>{};
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        json['success'] == false) {
      throw ApiException(
        response.statusCode,
        json['message']?.toString() ??
            'Không thể xử lý yêu cầu (${response.statusCode}).',
        json,
      );
    }
    if (decoded is! Json) {
      throw const ApiException(0, 'Máy chủ trả dữ liệu không hợp lệ.');
    }
    return json;
  }

  Future<void> login(String identifier, String password) async {
    final generation = _session;
    final result = _decode(
      await _http(
        'POST',
        '/auth/login',
        body: {'identifier': identifier.trim(), 'password': password},
        auth: false,
      ),
    );
    if (generation != _session) return;
    if (result['token'] is! String ||
        result['refreshToken'] is! String ||
        result['user'] is! Json) {
      throw const ApiException(0, 'Phản hồi đăng nhập thiếu thông tin phiên.');
    }
    _token = result['token'];
    _refreshToken = result['refreshToken'];
    user = result['user'];
    if (preferences != null) {
      await preferences!.setString('auth_token', _token!);
      await preferences!.setString('refresh_token', _refreshToken!);
      await preferences!.setString('auth_user', jsonEncode(user!));
    }
    notifyListeners();
  }

  Future<void> _refresh() async {
    if (_refreshToken == null) {
      throw const ApiException(
        401,
        'Phiên đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }
    final generation = _session;
    try {
      final result = _decode(
        await _http(
          'POST',
          '/auth/refresh-token',
          body: {'refreshToken': _refreshToken},
          auth: false,
        ),
      );
      if (generation != _session) {
        throw const ApiException(401, 'Phiên đã thay đổi.');
      }
      if (result['token'] is! String || result['refreshToken'] is! String) {
        throw const ApiException(401, 'Không thể gia hạn phiên.');
      }
      _token = result['token'];
      _refreshToken = result['refreshToken'];
    } on ApiException catch (e) {
      if (generation == _session && (e.status == 401 || e.status == 403)) {
        clearSession();
      }
      rethrow;
    }
  }

  Future<http.Response> _authorized(
    String method,
    String path, {
    Json? body,
    Map<String, String>? query,
  }) async {
    final generation = _session;
    final tokenUsed = _token;
    var response = await _http(method, path, body: body, query: query);
    if (generation != _session) {
      throw const ApiException(401, 'Phiên đã thay đổi.');
    }
    if (response.statusCode == 401 && signedIn) {
      if (tokenUsed == _token) {
        _refreshing ??= _refresh().whenComplete(() => _refreshing = null);
        await _refreshing;
      }
      if (generation != _session) {
        throw const ApiException(401, 'Vui lòng đăng nhập lại.');
      }
      final retryBody = path == '/auth/logout' && body != null
          ? {...body, 'refreshToken': _refreshToken}
          : body;
      response = await _http(method, path, body: retryBody, query: query);
    }
    if (generation != _session) {
      throw const ApiException(401, 'Phiên đã thay đổi.');
    }
    if (response.statusCode == 401) clearSession();
    return response;
  }

  Future<Json> get(String path, [Map<String, String>? query]) async =>
      _decode(await _authorized('GET', path, query: query));
  Future<Json> send(String method, String path, [Json? body]) async =>
      _decode(await _authorized(method, path, body: body));
  Future<String> download(String path, Map<String, String> query) async {
    final response = await _authorized('GET', path, query: query);
    if (response.statusCode != 200) _decode(response);
    final bytes = response.bodyBytes;
    final hasBom =
        bytes.length >= 3 &&
        bytes[0] == 0xef &&
        bytes[1] == 0xbb &&
        bytes[2] == 0xbf;
    return '${hasBom ? '\uFEFF' : ''}${utf8.decode(bytes)}';
  }

  Future<void> logout() async {
    try {
      if (_refreshToken != null) {
        await send('POST', '/auth/logout', {
          'refreshToken': _refreshToken,
          'allDevices': false,
        });
      }
    } finally {
      clearSession();
    }
  }

  @override
  void dispose() {
    _client.close();
    super.dispose();
  }
}
