import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Tung scope against isolated real Ruo API on Android', (
    tester,
  ) async {
    const url = String.fromEnvironment(
      'RUO_TEST_API',
      defaultValue: 'http://10.0.2.2:5001/api',
    );
    const password = String.fromEnvironment('RUO_TEST_PASSWORD');
    expect(
      password,
      isNotEmpty,
      reason: 'Pass --dart-define=RUO_TEST_PASSWORD=...',
    );
    final api = RuoApi(baseUrl: url);
    addTearDown(api.dispose);
    expect(
      (await api.get('/health'))['demo'],
      true,
      reason: 'This test only runs against tool/demo-server.mjs',
    );
    Future<void> waitFor(Finder target) async {
      for (
        var attempt = 0;
        attempt < 100 && target.evaluate().isEmpty;
        attempt++
      ) {
        await tester.pump(const Duration(milliseconds: 200));
      }
      expect(target, findsWidgets);
      await tester.pumpAndSettle();
    }

    Future<void> tapText(String text) async {
      debugPrint('TAP: $text');
      final target = find.text(text).last;
      await tester.ensureVisible(target);
      await tester.tap(target);
      await tester.pumpAndSettle();
    }

    Future<void> checkpoint(String name) async {
      debugPrint('CHECKPOINT: $name');
    }

    Future<void> tab(String name) async {
      debugPrint('TAB: $name');
      await tester.tap(find.widgetWithText(NavigationDestination, name));
      await tester.pumpAndSettle();
    }

    await tester.pumpWidget(RuoApp(api: api));
    await tester.pumpAndSettle();
    await tester.pump();
    await checkpoint('01-login');
    await tester.enterText(
      find.byKey(const Key('login_identifier')),
      'admin@ruo.example',
    );
    await tester.enterText(find.byKey(const Key('login_password')), password);
    await tester.ensureVisible(find.byKey(const Key('login_submit')));
    await tester.tap(find.byKey(const Key('login_submit')));
    await waitFor(find.text('P101'));
    await checkpoint('02-cad');
    for (var floor = 2; floor <= 5; floor++) {
      await tapText('Tầng $floor');
      await waitFor(find.text('P${floor}01'));
    }
    await tapText('Tầng 1');
    await waitFor(find.text('P101'));
    await tapText('P101');
    await waitFor(find.text('Thông tin phòng & lịch sử'));
    await tapText('Thông tin phòng & lịch sử');
    await waitFor(find.text('Sửa thông tin'));
    await checkpoint('03-room-detail');
    await tapText('Ngừng sử dụng');
    await tapText('Xác nhận');
    await waitFor(find.textContaining('thiết bị').first);
    // Backend must keep occupied P101 active even when asked to deactivate.
    expect(
      (await api.get('/facilities/rooms/P101'))['room']['status'],
      'available',
    );
    await tapText('Quay lại');
    await tab('Phòng học');
    await waitFor(find.text('Thêm phòng'));
    await tapText('Thêm phòng');
    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'P108');
    await tester.enterText(fields.at(1), 'Phòng báo cáo PRM');
    await tester.enterText(fields.at(2), '40');
    await tester.enterText(fields.at(3), 'Bài thực hành của Tùng');
    await tapText('Lưu phòng');
    await waitFor(find.text('Thêm phòng'));
    var created = await api.get('/facilities/rooms/P108');
    expect(created['room']['capacity'], 40);
    // Search and edit through the actual mobile form.
    await tester.enterText(find.byType(TextField).first, 'P108');
    await tapText('Tìm');
    await waitFor(find.textContaining('P108 ·'));
    await tapText('P108 · Phòng báo cáo PRM');
    await waitFor(find.text('Sửa thông tin'));
    await tapText('Sửa thông tin');
    await tester.enterText(
      find.byType(TextField).at(1),
      'Phòng PRM đã cập nhật',
    );
    await tapText('Lưu phòng');
    await waitFor(find.text('Phòng PRM đã cập nhật'));
    await tapText('Đổi trạng thái');
    await tapText('Xác nhận');
    await waitFor(find.text('Đang bảo trì'));
    await tapText('Ngừng sử dụng');
    await tapText('Xác nhận');
    await waitFor(find.text('Ngừng sử dụng'));
    created = await api.get('/facilities/rooms/P108');
    expect(created['room']['status'], 'inactive');
    await tapText('Quay lại');
    await tab('Tổng quan');
    await waitFor(find.text('Tổng thiết bị'));
    await checkpoint('04-dashboard');
    final costs = await api.get('/dashboard/repair-cost', {
      'period': 'quarter',
    });
    expect((costs['series'] as List).length, 4);
    final health = await api.get('/dashboard/health-score');
    expect(health['equipment'], isNotEmpty);
    await tab('Báo cáo');
    await waitFor(find.text('Thiết bị chưa phân phòng'));
    await checkpoint('05-reports');
    for (final choice in {
      'Trạng thái thiết bị': 'Tổng 28 thiết bị',
      'Tần suất hỏng hóc': 'Theo loại thiết bị',
      'Sắp hết bảo hành': 'PRM-001',
      'Sự cố quá hạn SLA': 'PRM-SC-',
      'Xuất báo cáo': 'Lưu CSV (Excel)',
    }.entries) {
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tapText(choice.key);
      await waitFor(find.textContaining(choice.value));
    }
    await checkpoint('06-export');
    final csv = await api.download('/reports/export', {
      'type': 'equipment',
      'format': 'csv',
    });
    expect(csv.startsWith('\uFEFF'), true);
    expect(csv, contains('PRM-001'));
    final sessions = await api.get('/inventory-sessions');
    final html = await api.download('/reports/export', {
      'type': 'inventory',
      'format': 'print',
      'sessionId': sessions['data'][0]['_id'] as String,
    });
    expect(html, contains('<html'));
    await api.logout();
    await tester.pumpAndSettle();
    for (final role in ['lecturer', 'technician', 'facility_manager']) {
      await tester.enterText(
        find.byKey(const Key('login_identifier')),
        '$role@ruo.example',
      );
      await tester.enterText(find.byKey(const Key('login_password')), password);
      await tester.ensureVisible(find.byKey(const Key('login_submit')));
      await tester.tap(find.byKey(const Key('login_submit')));
      await waitFor(find.text('P101'));
      expect(
        find.byType(NavigationDestination),
        findsNWidgets(role == 'facility_manager' ? 4 : 2),
      );
      await tab('Phòng học');
      await waitFor(find.text('40 phòng'));
      expect(find.text('Thêm phòng'), findsNothing);
      await api.logout();
      await tester.pumpAndSettle();
    }
    expect(tester.takeException(), isNull);
  });
}
