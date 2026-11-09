import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ruo_mobile/core/api.dart';
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
      expect(find.byType(CadPage), findsOneWidget);
      expect(find.byType(FloorPlanCanvas), findsOneWidget);
      expect(find.text('P101'), findsOneWidget);
      expect(find.byKey(const Key('cad_view_mode_toggle')), findsOneWidget);

      // Verify toggling between CAD Blueprint mode and Room Pod list mode
      await tester.tap(find.text('Danh sách phòng'));
      await tester.pumpAndSettle();
      expect(find.byType(FloorPlanCanvas), findsNothing);
      expect(find.text('P101'), findsOneWidget);

      await tester.tap(find.text('Sơ đồ 2D CAD'));
      await tester.pumpAndSettle();
      expect(find.byType(FloorPlanCanvas), findsOneWidget);
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
        expect(
          find.byType(NavigationDestination),
          findsNWidgets(4),
        );
        expect(find.byKey(const Key('workspace_drawer_button')), findsOneWidget);
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

  testWidgets(
    'room details displays recorded preventive maintenance separately from repairs',
    (tester) async {
      final api = RuoApi(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/maint-history')) {
            return reply({
              'maintenanceHistory': [
                {
                  '_id': 'maintenance-1',
                  'plan_id': {'title': 'Bảo dưỡng TV hàng tháng'},
                  'equipment_id': {
                    'code': 'TV-101',
                    'name': 'Smart TV phòng học',
                  },
                  'check_date': '2026-11-07T10:00:00.000Z',
                  'checked_by': {'full_name': 'Nguyễn Văn Kỹ thuật'},
                  'status': 'passed',
                  'checklist_results': [
                    {'item': 'Kiểm tra hình ảnh', 'passed': true, 'notes': ''},
                    {
                      'item': 'Kiểm tra cổng HDMI',
                      'passed': false,
                      'notes': 'Cổng HDMI 2 lỏng',
                    },
                  ],
                  'notes': 'Đã vệ sinh màn hình',
                  'repair_id': {'ticket_code': 'REP-101'},
                },
              ],
              'repairHistory': [],
            });
          }
          return reply({
            'room': room,
            'equipments': [],
            'maintenanceHistory': [],
            'movementHistory': [],
            'summary': {
              'equipmentCount': 0,
              'needsAttention': 0,
              'openRepairs': 0,
            },
          });
        }),
      );
      addTearDown(api.dispose);

      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.dark),
          home: RoomDetailPage(api: api, code: 'P101'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Lịch sử bảo dưỡng định kỳ'), findsOneWidget);
      expect(find.text('Bảo dưỡng TV hàng tháng'), findsOneWidget);
      expect(
        find.textContaining('TV-101 · Smart TV phòng học'),
        findsOneWidget,
      );
      expect(find.textContaining('Kiểm tra hình ảnh'), findsOneWidget);
      expect(find.textContaining('Cổng HDMI 2 lỏng'), findsOneWidget);
      expect(find.textContaining('Nguyễn Văn Kỹ thuật'), findsOneWidget);
      expect(find.textContaining('REP-101'), findsOneWidget);
      expect(find.text('Lịch sử sửa chữa'), findsOneWidget);
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
