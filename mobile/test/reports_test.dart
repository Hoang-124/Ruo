import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/core/exports.dart';
import 'package:ruo_mobile/features/reports.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('unknown and failure-free MTBF are not rendered as zero', () {
    expect(
      healthDescription({'ageDays': null, 'mtbfDays': null}),
      contains('Chưa đủ dữ liệu'),
    );
    expect(
      healthDescription({'ageDays': 200, 'mtbfDays': null, 'failureCount': 0}),
      contains('chưa xác định'),
    );
    expect(
      healthDescription({'ageDays': 200, 'mtbfDays': 100}),
      'MTBF 100.0 ngày',
    );
  });

  test('overdue duration preserves minute/hour/day boundaries', () {
    expect(overdueDuration(0), '0 phút');
    expect(overdueDuration(59), '59 phút');
    expect(overdueDuration(60), '1 giờ 0 phút');
    expect(overdueDuration(1501), '1 ngày 1 giờ');
    expect(overdueDuration(-1), '0 phút');
  });

  test('status totals and share percentages handle zero and mixed groups', () {
    expect(sumReportCounts([]), 0);
    expect(statusSharePercent(5, 0), '0.0%');
    expect(statusSharePercent(7, 28), '25.0%');
    expect(
      sumReportCounts([
        {'count': 5},
        {'count': 0},
        {'count': 2},
      ]),
      7,
    );
  });

  test('default year follows Vietnam timezone at UTC year boundary', () {
    expect(reportYear(DateTime.utc(2025, 12, 31, 16, 59)), 2025);
    expect(reportYear(DateTime.utc(2025, 12, 31, 17)), 2026);
  });

  test('NativeExports handles user cancellation cleanly and wraps save errors', () async {
    const channel = MethodChannel('vn.ruo.mobile/documents');
    addTearDown(
      () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null),
    );

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      throw PlatformException(code: 'CANCELLED', message: 'Đã hủy lưu tệp.');
    });
    expect(await NativeExports.saveCsv('a,b', 'test.csv'), false);

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      throw PlatformException(code: 'SAVE', message: 'Không thể ghi tệp.');
    });
    await expectLater(
      NativeExports.saveCsv('a,b', 'test.csv'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message,
          'message',
          'Không thể ghi tệp.',
        ),
      ),
    );
  });
}
