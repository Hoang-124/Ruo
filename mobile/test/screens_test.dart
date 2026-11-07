import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/features/cad_blueprint.dart';
import 'package:ruo_mobile/features/rooms.dart';
import 'package:ruo_mobile/main.dart';
import 'package:ruo_mobile/ui/tokens.dart';

const room = {
  '_id': 'r1',
  'code': 'P101',
  'name': 'Phòng thực hành',
  'status': 'available',
  'effectiveStatus': 'available',
  'capacity': 50,
  'floor': 1,
  'room_type': 'lab',
};

http.Response reply(Object body, [int status = 200]) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

void main() {
  testWidgets(
    'successful login replaces the login screen with the 2D CAD workspace',
    (tester) async {
      final api = RuoApi(
        client: MockClient(
          (r) async => r.url.path.endsWith('/login')
              ? reply({
                  'token': 't',
                  'refreshToken': 'r',
                  'user': {'id': 'a', 'role': 'admin'},
                })
              : reply({
                  'rooms': [room],
                }),
        ),
      );
      addTearDown(api.dispose);
      await tester.pumpWidget(RuoApp(api: api));
      await tester.enterText(
        find.byKey(const Key('login_identifier')),
        'admin',
      );
      await tester.enterText(
        find.byKey(const Key('login_password')),
        'password',
      );
      await tester.ensureVisible(find.byKey(const Key('login_submit')));
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pumpAndSettle();
      expect(api.signedIn, true);
      expect(find.byType(FloorPlanCanvas), findsOneWidget);
      expect(find.text('P101'), findsOneWidget);
      expect(find.byKey(const Key('login_submit')), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  for (final role in ['admin', 'facility_manager', 'lecturer', 'technician']) {
    testWidgets(
      '$role gets exactly the permitted navigation and room actions',
      (tester) async {
        final api = RuoApi(
          client: MockClient((r) async {
            if (r.url.path.endsWith('/login')) {
              return reply({
                'token': 't',
                'refreshToken': 'r',
                'user': {'id': role, 'role': role},
              });
            }
            return reply({
              'rooms': [room],
            });
          }),
        );
        addTearDown(api.dispose);
        await api.login('x', 'y');
        await tester.pumpWidget(RuoApp(api: api));
        await tester.pumpAndSettle();
        final expectedDestinations = switch (role) {
          'admin' || 'facility_manager' => 7,
          'technician' => 6,
          'lecturer' => 5,
          _ => 5,
        };
        expect(
          find.byType(NavigationDestination),
          findsNWidgets(expectedDestinations),
        );
        await tester.tap(
          find.widgetWithText(NavigationDestination, 'Phòng học'),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('Thêm phòng'),
          role == 'admin' ? findsOneWidget : findsNothing,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'rejected deactivation shows backend reason, blocker equipment list and closes dialog safely',
    (tester) async {
      Json? sent;
      final api = RuoApi(
        client: MockClient((r) async {
          if (r.url.path.endsWith('/login')) {
            return reply({
              'token': 't',
              'refreshToken': 'r',
              'user': {'id': 'a', 'role': 'admin'},
            });
          }
          if (r.method == 'PUT') {
            sent = jsonDecode(r.body) as Json;
            return reply({
              'message': 'Phòng còn thiết bị',
              'code': 'HAS_EQUIPMENT',
              'equipments': [
                {
                  '_id': 'e1',
                  'code': 'PRM-001',
                  'name': 'Máy chiếu laser',
                  'status': 'in_use',
                },
              ],
            }, 409);
          }
          return reply({'room': room});
        }),
      );
      addTearDown(api.dispose);
      await api.login('x', 'y');
      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.light),
          home: RoomDetailPage(api: api, code: 'P101'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ngừng sử dụng').last);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Kiểm thử');
      await tester.tap(find.text('Xác nhận'));
      await tester.pumpAndSettle();
      expect(sent?['reason'], 'Kiểm thử');
      expect(find.text('Phòng còn thiết bị'), findsOneWidget);
      expect(find.textContaining('PRM-001'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('theme toggle switches cleanly between Light and Dark mode', (
    tester,
  ) async {
    final api = RuoApi(
      client: MockClient(
        (_) async => reply({
          'rooms': [room],
        }),
      ),
    );
    addTearDown(api.dispose);
    await tester.pumpWidget(RuoApp(api: api));
    final initialBrightness = Theme.of(
      tester.element(find.byKey(const Key('login_submit'))),
    ).brightness;
    await tester.tap(find.byKey(const Key('theme_toggle')));
    await tester.pumpAndSettle();
    final toggledBrightness = Theme.of(
      tester.element(find.byKey(const Key('login_submit'))),
    ).brightness;
    expect(toggledBrightness, isNot(initialBrightness));
    expect(tester.takeException(), isNull);
  });

  testWidgets('failed login stays on login with server error', (tester) async {
    final api = RuoApi(
      client: MockClient(
        (r) async => reply({'message': 'Sai thông tin đăng nhập'}, 401),
      ),
    );
    addTearDown(api.dispose);
    await tester.pumpWidget(RuoApp(api: api));
    await tester.enterText(find.byKey(const Key('login_identifier')), 'wrong');
    await tester.enterText(find.byKey(const Key('login_password')), 'wrong');
    await tester.ensureVisible(find.byKey(const Key('login_submit')));
    await tester.tap(find.byKey(const Key('login_submit')));
    await tester.pumpAndSettle();
    expect(find.text('Sai thông tin đăng nhập'), findsOneWidget);
    expect(api.signedIn, false);
  });

  testWidgets(
    'login auto-switches from port 5000 to running demo server on port 5001',
    (tester) async {
      final api = RuoApi(
        baseUrl: 'http://10.0.2.2:5000/api',
        client: MockClient((r) async {
          if (r.url.port == 5000) {
            throw http.ClientException('Connection refused');
          }
          if (r.url.path.endsWith('/health')) {
            return reply({'success': true, 'demo': true});
          }
          if (r.url.path.endsWith('/login')) {
            return reply({
              'token': 't',
              'refreshToken': 'r',
              'user': {'id': 'lec', 'role': 'lecturer'},
            });
          }
          return reply({
            'rooms': [room],
          });
        }),
      );
      addTearDown(api.dispose);
      await tester.pumpWidget(RuoApp(api: api));
      await tester.enterText(
        find.byKey(const Key('login_identifier')),
        'lecturer@ruo.example',
      );
      await tester.enterText(
        find.byKey(const Key('login_password')),
        'Demo-Prm-2026!',
      );
      await tester.ensureVisible(find.byKey(const Key('login_submit')));
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pumpAndSettle();
      expect(api.signedIn, true);
      expect(api.baseUrl, 'http://10.0.2.2:5001/api');
      expect(find.text('P101'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
