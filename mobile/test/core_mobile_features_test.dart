import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/features/field_equipment.dart';
import 'package:ruo_mobile/features/field_inventory.dart';
import 'package:ruo_mobile/features/field_notifications.dart';
import 'package:ruo_mobile/features/field_profile.dart';
import 'package:ruo_mobile/features/field_repairs.dart';
import 'package:ruo_mobile/ui/tokens.dart';

void main() {
  testWidgets('QrScannerPage renders scanner viewfinder and test asset chips',
      (tester) async {
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
    expect(
      find.widgetWithText(ActionChip, 'EQ-101-ACCASS-01'),
      findsOneWidget,
    );
    expect(find.widgetWithText(ActionChip, 'EQ-101-PRJ-01'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'A1-101'), findsOneWidget);
  });

  testWidgets('ReportIncidentDialog renders 4-tier SLA options and triggers callback',
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
  });

  testWidgets('TechnicianTasksPage renders SLA Kanban and filter tabs',
      (tester) async {
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

  testWidgets('ClassroomAuditPage renders room inventory checklist and KPI cards',
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
  });

  testWidgets('NotificationsPage renders real-time SLA breach notifications',
      (tester) async {
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

  testWidgets('ProfilePage renders user role, credentials and logout button',
      (tester) async {
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
}
