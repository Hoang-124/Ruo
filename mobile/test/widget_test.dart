import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/main.dart';

void main() {
  testWidgets('Ruo app starts on the login screen', (tester) async {
    final api = RuoApi(client: MockClient((_) async => throw Exception()));
    addTearDown(api.dispose);

    await tester.pumpWidget(RuoApp(api: api));

    expect(find.byKey(const Key('login_identifier')), findsOneWidget);
    expect(find.byKey(const Key('login_password')), findsOneWidget);
    expect(find.byKey(const Key('login_submit')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
