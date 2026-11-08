import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/features/operations_catalog.dart';
import 'package:ruo_mobile/ui/tokens.dart';

void main() {
  testWidgets('building catalog keeps A1 fixed to five floors', (tester) async {
    Json? submitted;
    final api = RuoApi(
      client: MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response(
            '{"buildings":[{"_id":"building-1","code":"A1","name":"Tòa nhà A1","campusZone":"Khu A","totalFloors":5}]}',
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        submitted = jsonDecode(request.body) as Json;
        return http.Response(
          '{"success":true,"building":{}}',
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    );
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: CatalogPage(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tòa nhà'));
    await tester.pumpAndSettle();

    expect(find.text('Thêm tòa nhà'), findsNothing);
    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sửa'));
    await tester.pumpAndSettle();

    final fields = tester
        .widgetList<TextFormField>(find.byType(TextFormField))
        .toList();
    expect(fields.first.controller?.text, 'A1');
    expect(fields[3].controller?.text, '5');
    expect(fields.first.enabled, isFalse);
    expect(fields[3].enabled, isFalse);
    await tester.enterText(
      find.byType(TextFormField).at(1),
      'Tòa nhà A1 - Cơ sở chính',
    );
    await tester.tap(find.text('Lưu'));
    await tester.pumpAndSettle();

    expect(submitted?.containsKey('code'), isFalse);
    expect(submitted?['totalFloors'], 5);
    expect(submitted?['name'], 'Tòa nhà A1 - Cơ sở chính');
    expect(tester.takeException(), isNull);
  });

  testWidgets('supplier edit preserves API contact field', (tester) async {
    Json? submitted;
    String? submittedPath;
    final api = RuoApi(
      client: MockClient((request) async {
        if (request.method == 'PUT') {
          submitted = jsonDecode(request.body) as Json;
          submittedPath = request.url.path;
        }
        return http.Response(
          '{"suppliers":[{"_id":"supplier-1","code":"SUP-01","name":"Nhà cung cấp","contact":"Nguyễn An","phone":"02412345678","email":"a@example.vn","address":"Hà Nội"}]}',
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    );
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: CatalogPage(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Nhà cung cấp'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sửa'));
    await tester.pumpAndSettle();

    final fields = tester
        .widgetList<TextFormField>(find.byType(TextFormField))
        .toList();
    expect(fields[2].controller?.text, 'Nguyễn An');
    await tester.tap(find.text('Lưu'));
    await tester.pumpAndSettle();

    expect(submittedPath, endsWith('/admin/suppliers/supplier-1'));
    expect(submitted?['contact_person'], 'Nguyễn An');
    expect(submitted?.containsKey('code'), isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('category update omits immutable unsupported code field', (
    tester,
  ) async {
    Json? submitted;
    final api = RuoApi(
      client: MockClient((request) async {
        if (request.method == 'PUT') {
          submitted = jsonDecode(request.body) as Json;
          if (submitted!.containsKey('code')) {
            return http.Response(
              '{"success":false,"message":"Trường này không được hỗ trợ."}',
              400,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response(
            '{"success":true,"category":{}}',
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response(
          '{"categories":[{"_id":"category-1","code":"CAT-01","name":"Máy chiếu","description":"","depreciation_rate":20}]}',
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    );
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: CatalogPage(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sửa'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextFormField).at(1),
      'Máy chiếu giảng đường',
    );
    await tester.tap(find.text('Lưu'));
    await tester.pumpAndSettle();

    expect(submitted?['name'], 'Máy chiếu giảng đường');
    expect(submitted?.containsKey('code'), isFalse);
    expect(find.text('Trường này không được hỗ trợ.'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('repair unit creation validates and submits valid contact data', (
    tester,
  ) async {
    Json? submitted;
    final api = RuoApi(
      client: MockClient((request) async {
        if (request.method == 'POST') {
          submitted = jsonDecode(request.body) as Json;
          return http.Response(
            '{"success":true,"repairUnit":{}}',
            201,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        return http.Response(
          '{"repairUnits":[]}',
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }),
    );
    addTearDown(api.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: RuoTokens.theme(Brightness.dark),
        home: Scaffold(body: CatalogPage(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Đơn vị sửa chữa'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Thêm đơn vị sửa chữa'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'REP-01');
    await tester.enterText(find.byType(TextFormField).at(1), 'Đơn vị sửa chữa');
    await tester.tap(find.text('Lưu'));
    await tester.pumpAndSettle();

    expect(submitted?['code'], 'REP-01');
    expect(submitted?['name'], 'Đơn vị sửa chữa');
    expect(tester.takeException(), isNull);
  });
}
