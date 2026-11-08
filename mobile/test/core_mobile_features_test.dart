import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/features/field_equipment.dart';
import 'package:ruo_mobile/features/field_inventory.dart';
import 'package:ruo_mobile/features/field_notifications.dart';
import 'package:ruo_mobile/features/field_profile.dart';
import 'package:ruo_mobile/features/field_repairs.dart';
import 'package:ruo_mobile/features/operations.dart';
import 'package:ruo_mobile/ui/common.dart';
import 'package:ruo_mobile/ui/tokens.dart';

void main() {
  testWidgets('QrScannerPage renders scanner viewfinder and test asset chips', (
    tester,
  ) async {
    final api = RuoApi(client: MockClient((_) async => throw Exception()));
    addTearDown(api.dispose);
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: QrScannerPage(api: api)),
      ),
    );
    await tester.pump();

    expect(find.text('Quét QR Định Danh Thiết Bị'), findsOneWidget);
    expect(find.byKey(const Key('btn_open_actual_camera')), findsOneWidget);
    expect(find.byKey(const Key('btn_sample_qr_codes')), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'EQ-101-ACCASS-01'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'EQ-101-PRJ-01'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'A1-101'), findsOneWidget);
  });

  testWidgets(
    'ReportIncidentDialog renders 4-tier SLA options and triggers callback',
    (tester) async {
      final api = RuoApi(client: MockClient((_) async => throw Exception()));
      addTearDown(api.dispose);

      final eq = {
        'code': 'EQ-101-ACCASS-01',
        'name': 'Điều hòa Daikin Cassette 4HP',
        'room_code': 'A1-101',
      };

      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.dark),
          home: Scaffold(
            body: ReportIncidentDialog(api: api, equipment: eq),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Báo Hỏng Thiết Bị (SLA)'), findsOneWidget);
      expect(find.text('Cấp 1 · Khẩn cấp'), findsOneWidget);
      expect(find.text('Cấp 2 · Gián đoạn'), findsOneWidget);
      expect(find.text('Cấp 3 · Suy giảm'), findsOneWidget);
      expect(find.text('Cấp 4 · Nhẹ/Định kỳ'), findsOneWidget);
      expect(find.text('Gửi báo hỏng'), findsOneWidget);
    },
  );

  testWidgets('TechnicianTasksPage renders SLA Kanban and filter tabs', (
    tester,
  ) async {
    final api = RuoApi(client: MockClient((_) async => throw Exception()));
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: TechnicianTasksPage(api: api)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Bảng Nhiệm Vụ Kỹ Thuật Viên'), findsOneWidget);
    expect(find.textContaining('Tất cả'), findsOneWidget);
    expect(find.text('Đang chờ'), findsOneWidget);
    expect(find.text('Đang sửa'), findsOneWidget);
    expect(find.text('Đã xong'), findsOneWidget);
    expect(find.text('Tiếp nhận'), findsWidgets);
  });

  testWidgets(
    'ClassroomAuditPage renders room inventory checklist and KPI cards',
    (tester) async {
      final api = RuoApi(client: MockClient((_) async => throw Exception()));
      addTearDown(api.dispose);

      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.dark),
          home: Scaffold(body: ClassroomAuditPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Kiểm Kê Phòng Học Thực Địa'), findsOneWidget);
      expect(find.text('Tổng tài sản'), findsOneWidget);
      expect(find.text('Đã quét khớp'), findsOneWidget);
      expect(find.text('Khớp tất cả'), findsOneWidget);
    },
  );

  testWidgets('NotificationsPage renders real-time SLA breach notifications', (
    tester,
  ) async {
    final api = RuoApi(client: MockClient((_) async => throw Exception()));
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: NotificationsPage(api: api)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Trung Tâm Thông Báo Thời Gian Thực'), findsOneWidget);
    expect(find.text('Khẩn cấp SLA'), findsOneWidget);
    expect(find.textContaining('Cảnh báo vi phạm SLA'), findsOneWidget);
  });

  testWidgets('ProfilePage renders user role, credentials and logout button', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = RuoApi(client: MockClient((_) async => throw Exception()));
    api.user = {
      'id': 'GV001',
      'full_name': 'Nguyễn Văn An',
      'role': 'lecturer',
      'email': 'an.nv@ruo.edu.vn',
    };
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: ProfilePage(api: api)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Nguyễn Văn An'), findsOneWidget);
    expect(find.text('an.nv@ruo.edu.vn'), findsOneWidget);
    expect(find.text('Giảng viên'), findsOneWidget);
    expect(find.byKey(const Key('profile_logout_btn')), findsOneWidget);
  });

  testWidgets('maintenance result dialog fits a narrow mobile viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = RuoApi(
      client: MockClient(
        (_) async => http.Response(
          '{"plans":[{"_id":"plan-1","title":"Kế hoạch","building":"A1","floor":1,"frequency":"monthly","room_ids":["room-1"],"checklist":["Kiểm tra tình trạng thiết bị"],"schedule":{}}],"equipment":[{"_id":"equipment-1","code":"EQ-101","name":"Điều hòa trung tâm công suất lớn dùng cho phòng thực hành tầng một","room_id":"room-1"}]}',
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        ),
      ),
    );
    api.user = {'role': 'technician'};
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.light),
        home: Scaffold(body: MaintenancePage(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ghi kết quả'));
    await tester.pumpAndSettle();

    expect(find.text('Ghi nhận kiểm tra'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  testWidgets('manager maintenance plans fill the available content width', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 915);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = RuoApi(
      client: MockClient(
        (_) async => http.Response(
          '{"plans":[{"_id":"plan-1","title":"Bảo dưỡng máy chiếu","building":"A1","floor":1,"frequency":"monthly","room_ids":[{"_id":"room-1","code":"P101"}],"category_ids":[],"schedule":{"next_due_at":"2026-11-20T00:00:00.000Z"}}],"equipment":[{"_id":"equipment-1","code":"EQ-101","name":"Máy chiếu","room_id":{"_id":"room-1","code":"P101"}}]}',
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        ),
      ),
    );
    api.user = {'role': 'facility_manager'};
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: MaintenancePage(api: api)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Tạo kế hoạch'), findsOneWidget);
    expect(find.text('Bảo dưỡng máy chiếu'), findsOneWidget);
    expect(find.text('1 phòng'), findsOneWidget);
    expect(find.text('1 thiết bị'), findsOneWidget);
    expect(tester.getSize(find.byType(Card).last).width, greaterThan(370));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'technician always sees disposal proposal action and its reason',
    (tester) async {
      Json? submitted;
      var hasCandidate = false;
      final api = RuoApi(
        client: MockClient((request) async {
          if (request.method == 'POST') {
            submitted = jsonDecode(request.body) as Json;
            return http.Response(
              '{"success":true,"message":"Đã gửi đề xuất."}',
              201,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response(
            jsonEncode({
              'candidates': hasCandidate
                  ? [
                      {
                        '_id': 'equipment-1',
                        'code': 'EQ-101',
                        'name': 'Máy chiếu',
                        'r_ratio': 65,
                        'repair_cost': 6500000,
                        'price': 10000000,
                      },
                    ]
                  : [],
              'proposals': [],
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
      api.user = {'role': 'technician'};
      addTearDown(api.dispose);

      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.dark),
          home: Scaffold(body: DisposalsPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('create_disposal_proposal')), findsOneWidget);
      await tester.tap(find.byKey(const Key('create_disposal_proposal')));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Chưa có thiết bị đủ điều kiện: cần R ≥ 60% hoặc kết luận không thể sửa.',
        ),
        findsOneWidget,
      );

      hasCandidate = true;
      await tester.tap(find.byType(IconButton).first);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('create_disposal_proposal')));
      await tester.pumpAndSettle();
      expect(find.text('Đề xuất thanh lý EQ-101'), findsOneWidget);

      await tester.enterText(
        find.byType(TextField).first,
        'Không thể sửa chữa',
      );
      await tester.tap(find.text('Gửi thẩm định'));
      await tester.pumpAndSettle();

      expect(submitted?['equipment_id'], 'equipment-1');
      expect(submitted?['reason'], 'Không thể sửa chữa');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('technician can retry a partially completed transfer', (
    tester,
  ) async {
    String? completedPath;
    final api = RuoApi(
      client: MockClient((request) async {
        if (request.method == 'PUT') {
          completedPath = request.url.path;
          return http.Response(
            '{"success":true,"message":"Đã hoàn tất."}',
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response(
          jsonEncode({
            'movements': [
              {
                '_id': 'movement-1',
                'status': 'completing',
                'type': 'transfer',
                'equipment_id': {'code': 'TV-101', 'name': 'Smart TV'},
                'from_room_id': {'code': 'P101'},
                'to_room_id': {'code': 'P102'},
                'reason': 'Điều chuyển phòng',
              },
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    );
    api.user = {'role': 'technician'};
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: TransfersPage(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Đang hoàn tất · có thể thử lại'), findsOneWidget);
    await tester.tap(find.text('Xác nhận hoàn tất'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Xác nhận lại');
    await tester.tap(find.text('Hoàn tất'));
    await tester.pumpAndSettle();

    expect(completedPath, '/api/movements/movement-1/complete');
    expect(find.text('Đã hoàn tất.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('replacement equipment receipt keeps form controllers alive', (
    tester,
  ) async {
    Json? submitted;
    final api = RuoApi(
      client: MockClient((request) async {
        if (request.method == 'PUT') {
          submitted = jsonDecode(request.body) as Json;
          return http.Response(
            '{"success":true,"message":"Đã tiếp nhận thiết bị."}',
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response(
          jsonEncode({
            'proposals': [
              {
                '_id': 'proposal-1',
                'status': 'procurement_planned',
                'equipment_id': {'code': 'OLD-101', 'name': 'Máy chiếu cũ'},
                'r_ratio': 75,
                'reason': 'Không thể sửa chữa',
              },
            ],
            'candidates': [],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    );
    api.user = {'role': 'technician'};
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: DisposalsPage(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tiếp nhận & tạo QR'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'NEW-101');
    await tester.enterText(find.byType(TextFormField).at(1), 'SN-NEW-101');
    await tester.enterText(find.byType(TextFormField).at(2), 'Sony');
    await tester.enterText(find.byType(TextFormField).at(3), 'Laser');
    await tester.enterText(find.byType(TextFormField).at(4), '25000000');
    await tester.tap(find.text('Lưu'));
    await tester.pumpAndSettle();

    expect(submitted?['code'], 'NEW-101');
    expect(submitted?['serial_number'], 'SN-NEW-101');
    expect(submitted?['price'], 25000000);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'AsyncPanel retry callback reloads without returning a Future from setState',
    (tester) async {
      var attempts = 0;
      final api = RuoApi(
        client: MockClient((_) async {
          attempts++;
          if (attempts == 1) throw Exception('Tạm thời mất kết nối');
          return http.Response(
            '{"success":true,"items":[]}',
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
      addTearDown(api.dispose);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AsyncPanel(
              load: () => api.get('/test'),
              builder: (_) => const Text('Tải thành công'),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Thử lại'), findsOneWidget);

      await tester.tap(find.text('Thử lại'));
      await tester.pumpAndSettle();

      expect(find.text('Tải thành công'), findsOneWidget);
      expect(attempts, 2);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'TechnicianTasksPage parses real MongoDB repair payload and sends valid outcome on resolve',
    (tester) async {
      String? acceptedPath;
      String? resolvedPath;
      Json? resolvedPayload;
      final api = RuoApi(
        client: MockClient((request) async {
          if (request.method == 'GET' && request.url.path == '/api/repairs') {
            return http.Response(
              jsonEncode({
                'success': true,
                'repairs': [
                  {
                    '_id': 'mongo-rep-1',
                    'ticket_code': 'REP-REAL-101',
                    'incident_description': 'Bình chữa cháy CO2 không có khí khi bóp cò',
                    'equipment_id': {
                      '_id': 'eq-co2-1',
                      'code': 'EQ-503-EXTCO2-01',
                      'name': 'Bình chữa cháy khí CO2 5kg (MT5)',
                    },
                    'room_id': {'_id': 'room-202', 'code': 'A1-202'},
                    'damage_level': 'minor',
                    'status': 'assigned',
                    'deadline': '2026-11-16T08:00:00.000Z',
                    'deadline_status': 'on_track',
                  },
                ],
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          if (request.method == 'PUT' &&
              request.url.path == '/api/repairs/mongo-rep-1/accept') {
            acceptedPath = request.url.path;
            return http.Response(
              '{"success":true}',
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          if (request.method == 'PUT' &&
              request.url.path == '/api/repairs/mongo-rep-1/resolve') {
            resolvedPath = request.url.path;
            resolvedPayload = jsonDecode(request.body) as Json;
            return http.Response(
              '{"success":true}',
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response('{}', 404);
        }),
      );
      addTearDown(api.dispose);

      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.dark),
          home: Scaffold(body: TechnicianTasksPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Bình chữa cháy CO2 không có khí khi bóp cò'),
        findsOneWidget,
      );
      expect(
        find.text('Phòng A1-202 · Mã TB: EQ-503-EXTCO2-01 · Phiếu [REP-REAL-101]'),
        findsOneWidget,
      );

      await tester.tap(find.text('Tiếp nhận'));
      await tester.pumpAndSettle();
      expect(acceptedPath, '/api/repairs/mongo-rep-1/accept');

      await tester.tap(find.text('Hoàn tất'));
      await tester.pumpAndSettle();
      expect(resolvedPath, '/api/repairs/mongo-rep-1/resolve');
      expect(resolvedPayload?['outcome'], 'repaired');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'AI #1A Incident Triage in ReportIncidentDialog analyzes symptoms and applies SLA recommendation',
    (tester) async {
      final api = RuoApi(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/ai/incident-triage')) {
            return http.Response(
              jsonEncode({
                'success': true,
                'triage': {
                  'damage_level': 'critical',
                  'suggested_sla_tier': 1,
                  'fault_label': 'Chập cháy nguồn điện máy chiếu (Nguy hiểm)',
                  'safety_warning': 'Ngắt aptomat nhánh ngay lập tức!',
                  'standardized_description':
                      '[AI Chuẩn Hóa] Máy chiếu bốc khói khét lẹt',
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response('{}', 404);
        }),
      );
      addTearDown(api.dispose);

      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.dark),
          home: Scaffold(
            body: ReportIncidentDialog(
              api: api,
              equipment: const {
                'code': 'EQ-101-PRJ-01',
                'name': 'Máy chiếu Sony Laser',
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.byKey(const Key('btn_ai_incident_triage')));
      await tester.tap(find.byKey(const Key('btn_ai_incident_triage')));
      await tester.pumpAndSettle();

      expect(
        find.text('Chập cháy nguồn điện máy chiếu (Nguy hiểm)'),
        findsOneWidget,
      );
      expect(find.text('Ngắt aptomat nhánh ngay lập tức!'), findsOneWidget);

      await tester.ensureVisible(find.byKey(const Key('btn_apply_ai_triage')));
      await tester.tap(find.byKey(const Key('btn_apply_ai_triage')));
      await tester.pumpAndSettle();
      expect(
        find.text('[AI Chuẩn Hóa] Máy chiếu bốc khói khét lẹt'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'AI #1B Copilot Sheet in TechnicianTasksPage displays diagnosis and allows Manager assignment',
    (tester) async {
      Json? assignedBody;
      final api = RuoApi(
        client: MockClient((request) async {
          if (request.method == 'GET' && request.url.path == '/api/repairs') {
            return http.Response(
              jsonEncode({
                'repairs': [
                  {
                    '_id': 'rep-202',
                    'ticket_code': 'REP-AI-202',
                    'incident_description': 'Bình chữa cháy CO2 tụt áp',
                    'status': 'reported',
                    'room_id': {'code': 'A1-202'},
                    'equipment_id': {
                      'code': 'EQ-503-EXTCO2-01',
                      'name': 'Bình chữa cháy khí CO2 5kg',
                    },
                  },
                ],
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          if (request.url.path.endsWith('/ai-copilot')) {
            return http.Response(
              jsonEncode({
                'copilot': {
                  'diagnosis': {
                    'fault_label': 'Bình chữa cháy CO2 tụt áp vạch đỏ',
                    'root_cause': 'Rò rỉ khí đẩy qua gioăng van.',
                    'troubleshooting_steps': ['1. Kiểm tra đồng hồ áp kế.'],
                  },
                  'recommended_technicians': [
                    {
                      '_id': 'KT001',
                      'full_name': 'KTV Trần Minh Tuấn (KT001)',
                      'match_score': 95,
                    },
                  ],
                  'recommended_parts': [],
                  'recommended_replacements': [],
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          if (request.method == 'PUT' &&
              request.url.path.endsWith('/repairs/rep-202/assign')) {
            assignedBody = jsonDecode(request.body) as Json;
            return http.Response(
              jsonEncode({'success': true}),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response('{}', 404);
        }),
      );
      api.user = {'role': 'facility_manager'};
      addTearDown(api.dispose);

      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.dark),
          home: Scaffold(body: TechnicianTasksPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('btn_copilot_REP-AI-202')));
      await tester.pumpAndSettle();

      expect(find.text('Bình chữa cháy CO2 tụt áp vạch đỏ'), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const Key('btn_assign_technician_submit')),
      );
      await tester.tap(find.byKey(const Key('btn_assign_technician_submit')));
      await tester.pumpAndSettle();

      expect(assignedBody?['assigned_to'], 'KT001');
      expect(
        find.textContaining('KTV phụ trách: KTV Trần Minh Tuấn (KT001)'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'OperationsPage exposes Equipments, SpareParts, Inventory AI #4A, and Governance AI #4B for admin',
    (tester) async {
      final api = RuoApi(
        client: MockClient((request) async {
          if (request.url.path.endsWith('/inventory/sessions')) {
            return http.Response(
              jsonEncode({
                'sessions': [
                  {
                    '_id': 'sess-1',
                    'name': 'Kiểm kê HK1',
                    'status': 'in_progress',
                  },
                ],
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          if (request.url.path.endsWith('/inventory/sessions/sess-1')) {
            return http.Response(
              jsonEncode({
                'data': {
                  'scope_ids': [],
                  'logs': [],
                  'progress': {
                    'completion_percent': 85,
                    'scanned_count': 17,
                    'unscanned_count': 3,
                  },
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          if (request.url.path.endsWith('/ai-analysis')) {
            return http.Response(
              jsonEncode({
                'analysis': {
                  'risk_level': 'MEDIUM',
                  'reconciliation_rate_percent': 85,
                  'missing_value_exposure_vnd': 12500000,
                  'executive_summary':
                      'Phát hiện 1 thiết bị sai vị trí phòng học cần điều chuyển.',
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response('{}', 404);
        }),
      );
      api.user = {'role': 'admin'};
      addTearDown(api.dispose);
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          theme: RuoTokens.theme(Brightness.dark),
          home: Scaffold(body: OperationsPage(api: api)),
        ),
      );
      await tester.pumpAndSettle();

      // Switch to Kho thiết bị
      await tester.tap(find.text('Kho thiết bị'));
      await tester.pumpAndSettle();
      expect(find.text('Kho Thiết Bị & Tài Sản'), findsOneWidget);

      // Switch to Kho linh kiện
      await tester.tap(find.text('Kho linh kiện'));
      await tester.pumpAndSettle();
      expect(find.text('Kho Linh Kiện & Vật Tư'), findsOneWidget);

      // Scroll chips and switch to Kiểm kê & QR -> test AI #4A
      await tester.ensureVisible(find.text('Kiểm kê & QR'));
      await tester.tap(find.text('Kiểm kê & QR'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('btn_inventory_ai_analysis')));
      await tester.pumpAndSettle();
      expect(
        find.text('Phát hiện 1 thiết bị sai vị trí phòng học cần điều chuyển.'),
        findsOneWidget,
      );

      // Switch to Kiểm toán & RBAC -> test SHA-256 & AI #4B
      await tester.ensureVisible(find.text('Kiểm toán & RBAC'));
      await tester.tap(find.text('Kiểm toán & RBAC'));
      await tester.pumpAndSettle();
      expect(
        find.text('Kiểm Toán Bảo Mật & Quản Trị RBAC'),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const Key('btn_verify_sha256_chain')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Chuỗi băm bất biến SHA-256'), findsOneWidget);

      await tester.tap(find.byKey(const Key('btn_audit_ai_anomalies')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Điểm an ninh đạt 96/100'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
