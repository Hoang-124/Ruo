import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ruo_mobile/core/api.dart';

http.Response jsonResponse(Object data, [int status = 200]) => http.Response(
  jsonEncode(data),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
const session = {
  'token': 'old',
  'refreshToken': 'refresh-old',
  'user': {'id': 'admin', 'role': 'admin', 'full_name': 'Tùng'},
};

void main() {
  test('CSV download preserves exactly one UTF-8 BOM for Excel', () async {
    final api = RuoApi(
      client: MockClient(
        (r) async => http.Response.bytes(
          utf8.encode('\uFEFFMã,Tên\r\nP101,Phòng học'),
          200,
        ),
      ),
    );
    addTearDown(api.dispose);
    final csv = await api.download('/reports/export', {'format': 'csv'});
    expect(utf8.encode(csv).take(3), [0xef, 0xbb, 0xbf]);
    expect(csv, '\uFEFFMã,Tên\r\nP101,Phòng học');
  });
  test(
    'normalizes API URL and rejects credentials, query and non-HTTP schemes',
    () {
      expect(
        RuoApi.normalizeUrl(' http://localhost:5000/ '),
        'http://localhost:5000/api',
      );
      for (final input in [
        'file:///tmp',
        'http://user:pass@host',
        'https://host?token=abc',
        '//host',
      ]) {
        expect(() => RuoApi.normalizeUrl(input), throwsA(isA<ApiException>()));
      }
    },
  );
  test('concurrent expired requests share one refresh and retry using rotated token', () async {
    var refreshes = 0;
    var requests = 0;
    final refreshStarted = Completer<void>();
    final allowRefresh = Completer<void>();
    final api = RuoApi(
      client: MockClient((request) async {
        if (request.url.path.endsWith('/login')) return jsonResponse(session);
        if (request.url.path.endsWith('/refresh-token')) {
          refreshes++;
          refreshStarted.complete();
          await allowRefresh.future;
          return jsonResponse({'token': 'new', 'refreshToken': 'refresh-new'});
        }
        requests++;
        return request.headers['Authorization'] == 'Bearer new'
            ? jsonResponse({'rooms': []})
            : jsonResponse({'message': 'expired'}, 401);
      }),
    );
    addTearDown(api.dispose);
    await api.login('ADMIN', 'password');
    final first = api.get('/facilities/rooms');
    await refreshStarted.future;
    final second = api.get('/dashboard/kpi');
    await Future<void>.delayed(Duration.zero);
    allowRefresh.complete();
    await Future.wait([first, second]);
    expect(refreshes, 1);
    expect(requests, 4);
  });
  test('logout after access expiry revokes the NEW refresh token', () async {
    String? revoked;
    final api = RuoApi(
      client: MockClient((r) async {
        if (r.url.path.endsWith('/login')) return jsonResponse(session);
        if (r.url.path.endsWith('/refresh-token')) {
          return jsonResponse({'token': 'new', 'refreshToken': 'refresh-new'});
        }
        if (r.headers['Authorization'] != 'Bearer new') {
          return jsonResponse({'message': 'expired'}, 401);
        }
        revoked = (jsonDecode(r.body) as Map)['refreshToken'] as String?;
        return jsonResponse({'success': true});
      }),
    );
    addTearDown(api.dispose);
    await api.login('ADMIN', 'password');
    await api.logout();
    expect(revoked, 'refresh-new');
    expect(api.signedIn, false);
  });
  test('locked account during refresh clears the local session', () async {
    final api = RuoApi(
      client: MockClient((r) async {
        if (r.url.path.endsWith('/login')) return jsonResponse(session);
        return jsonResponse({
          'message': 'locked',
        }, r.url.path.endsWith('/refresh-token') ? 403 : 401);
      }),
    );
    addTearDown(api.dispose);
    await api.login('ADMIN', 'password');
    await expectLater(
      api.get('/facilities/rooms'),
      throwsA(isA<ApiException>()),
    );
    expect(api.signedIn, false);
  });
  test('late login cannot resurrect a session after server changes', () async {
    final pending = Completer<http.Response>();
    final api = RuoApi(client: MockClient((_) => pending.future));
    addTearDown(api.dispose);
    final login = api.login('ADMIN', 'password');
    api.configure('https://another.example/api');
    pending.complete(jsonResponse(session));
    await login;
    expect(api.signedIn, false);
  });
  test('409 details and Unicode errors remain readable; offline failure is friendly', () async {
    final api = RuoApi(
      client: MockClient((r) async {
        if (r.url.path.endsWith('/offline')) {
          throw http.ClientException('socket');
        }
        return jsonResponse({
          'message': 'Phòng còn thiết bị',
          'code': 'HAS_EQUIPMENT',
        }, 409);
      }),
    );
    addTearDown(api.dispose);
    await expectLater(
      api.send('PUT', '/rooms/1/deactivate'),
      throwsA(
        isA<ApiException>()
            .having((e) => e.status, 'status', 409)
            .having((e) => e.details['code'], 'code', 'HAS_EQUIPMENT')
            .having((e) => e.message, 'message', 'Phòng còn thiết bị'),
      ),
    );
    await expectLater(
      api.get('/offline'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message,
          'message',
          contains('Không kết nối'),
        ),
      ),
    );
  });
}
