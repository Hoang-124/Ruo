import 'package:flutter/services.dart';

import 'api.dart';

class NativeExports {
  static const _channel = MethodChannel('vn.ruo.mobile/documents');

  /// Opens Android SAF document picker to save UTF-8 CSV.
  /// Returns `true` when written, `false` when cancelled by the user.
  static Future<bool> saveCsv(String content, String filename) async {
    try {
      await _channel.invokeMethod('saveCsv', {
        'content': content,
        'filename': filename,
      });
      return true;
    } on PlatformException catch (e) {
      if (e.code == 'CANCELLED') return false;
      throw ApiException(0, e.message ?? 'Không thể lưu tệp CSV.');
    } on MissingPluginException {
      throw const ApiException(
        0,
        'Tính năng lưu CSV trực tiếp chỉ hỗ trợ trên thiết bị Android.',
      );
    }
  }

  static Future<void> printHtml(String content, String title) async {
    try {
      await _channel.invokeMethod('printHtml', {
        'content': content,
        'title': title,
      });
    } on PlatformException catch (e) {
      throw ApiException(0, e.message ?? 'Không mở được trình in PDF.');
    } on MissingPluginException {
      throw const ApiException(
        0,
        'Tính năng in / lưu PDF trực tiếp chỉ hỗ trợ trên thiết bị Android.',
      );
    }
  }
}
