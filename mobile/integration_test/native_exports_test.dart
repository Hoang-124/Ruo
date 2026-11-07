// Interactive smoke check: use Android's dialogs to save CSV and PDF files.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/core/exports.dart';
import 'package:ruo_mobile/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Android CSV picker and PDF print service', (tester) async {
    final api = RuoApi(baseUrl: 'http://10.0.2.2:5001/api');
    addTearDown(api.dispose);
    expect((await api.get('/health'))['demo'], true);
    await api.login(
      'admin@ruo.example',
      const String.fromEnvironment('RUO_TEST_PASSWORD'),
    );
    await tester.pumpWidget(RuoApp(api: api));
    await tester.pumpAndSettle();
    final csv = await api.download('/reports/export', {
      'type': 'equipment',
      'format': 'csv',
    });
    debugPrint('NATIVE: save CSV to Downloads as ruo-prm-native.csv');
    await NativeExports.saveCsv(csv, 'ruo-prm-native.csv');
    debugPrint('NATIVE: CSV saved successfully');
    final html = await api.download('/reports/export', {
      'type': 'equipment',
      'format': 'print',
    });
    await NativeExports.printHtml(html, 'ruo-prm-native');
    debugPrint(
      'NATIVE: PDF dialog opened; allowing 60 seconds to save and inspect',
    );
    await Future<void>.delayed(const Duration(seconds: 60));
    expect(tester.takeException(), isNull);
  }, timeout: const Timeout(Duration(minutes: 5)));
}
