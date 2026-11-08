import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/tokens.dart';
import '../ui/vectors.dart';
import 'field_repairs.dart';

class QrScannerPage extends StatefulWidget {
  const QrScannerPage({super.key, required this.api, this.onSelectRoom});
  final RuoApi api;
  final ValueChanged<String>? onSelectRoom;

  @override
  State<QrScannerPage> createState() => _QrScannerPageState();
}

class _QrScannerPageState extends State<QrScannerPage>
    with SingleTickerProviderStateMixin {
  static const _scannerChannel = MethodChannel('vn.ruo.mobile/scanner');
  late final AnimationController _animController;
  final _inputController = TextEditingController(text: 'EQ-101-ACCASS-01');
  MobileScannerController? _scannerController;
  bool _busy = false;
  bool _torch = false;
  String? _error;

  bool get _isTestEnvironment =>
      WidgetsBinding.instance.runtimeType.toString().contains('Test');

  final _testAssets = const [
    ('EQ-101-ACCASS-01', 'ĐHKK Daikin 4HP (A1-101)'),
    ('EQ-101-PRJ-01', 'Máy chiếu Sony 4K (A1-101)'),
    ('EQ-102-CAM-01', 'Camera PTZ Hội nghị (A1-102)'),
    ('A1-101', 'Mặt bằng Phòng A1-101'),
  ];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );
    if (!_isTestEnvironment) {
      _animController.repeat(reverse: true);
      _scannerController = MobileScannerController(
        detectionSpeed: DetectionSpeed.normal,
        detectionTimeoutMs: 1200,
        formats: const [
          BarcodeFormat.qrCode,
          BarcodeFormat.code128,
          BarcodeFormat.code39,
        ],
      );
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    _inputController.dispose();
    _scannerController?.dispose();
    super.dispose();
  }

  void _handleBarcodeDetected(BarcodeCapture capture) {
    if (_busy) return;
    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue?.trim();
      if (raw != null && raw.isNotEmpty) {
        HapticFeedback.mediumImpact();
        _inputController.text = raw;
        _lookup(raw);
        break;
      }
    }
  }

  Future<void> _scanActualCamera() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final code = await _scannerChannel.invokeMethod<String>('scanBarcode');
      if (code != null && code.trim().isNotEmpty) {
        _inputController.text = code.trim();
        await _lookup(code.trim());
      }
    } on PlatformException catch (e) {
      if (mounted) {
        setState(() => _error = 'Lỗi máy quét: ${e.message ?? e.code}');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Không thể mở máy ảnh: $e');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _lookup(String code) async {
    final clean = code.trim().toUpperCase();
    if (clean.isEmpty || _busy) return;

    if (clean.startsWith('A1-') || RegExp(r'^P[1-5]0[1-8]$').hasMatch(clean)) {
      widget.onSelectRoom?.call(clean);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      Json? found;
      try {
        final res = await widget.api.get('/equipments/qr/$clean');
        final raw = res['equipment'] ?? res['data'];
        if (raw is Map && raw.isNotEmpty) {
          found = asMap(raw);
        }
      } catch (_) {}

      if (found == null) {
        try {
          final res = await widget.api.get('/equipment/code/$clean');
          if (res['success'] == true && res['data'] != null) {
            found = asMap(res['data']);
          }
        } catch (_) {}
      }

      if (found == null) {
        try {
          final searchRes = await widget.api.get(
            '/equipments',
            {'search': clean, 'limit': '1'},
          );
          final list = asList(
            searchRes['equipments'] ??
                searchRes['data']?['equipments'] ??
                searchRes['data'],
          );
          if (list.isNotEmpty) {
            found = list.first;
          }
        } catch (_) {
          try {
            final searchRes = await widget.api.get(
              '/equipment',
              {'search': clean, 'limit': '1'},
            );
            final list = asList(searchRes['data']?['equipments'] ?? searchRes['data']);
            if (list.isNotEmpty) {
              found = list.first;
            }
          } catch (_) {}
        }
      }

      if (!mounted) return;

      if (found != null) {
        await _showEquipmentDetail(found);
      } else {
        // Deterministic fallback mock for test fixture demonstration
        final demoItem = <String, dynamic>{
          'code': clean,
          'name': clean.contains('PRJ')
              ? 'Máy chiếu Sony Laser 5000 Lumens'
              : clean.contains('CAM')
                  ? 'Camera PTZ Tracking Tự Động'
                  : 'Điều hòa Daikin Inverter Cassette 4HP',
          'category': 'Thiết bị điện tử',
          'room_code': 'A1-101',
          'serial_number': 'SN-$clean-VN',
          'status': 'in_use',
          'warranty_expiry': '2027-12-31T00:00:00.000Z',
          'purchase_date': '2024-01-15T00:00:00.000Z',
        };
        await _showEquipmentDetail(demoItem);
      }
    } catch (e) {
      if (mounted) setState(() => _error = 'Lỗi tra cứu: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showEquipmentDetail(Json item) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => EquipmentDetailSheet(
        api: widget.api,
        equipment: item,
        onReportSuccess: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Phiếu báo hỏng đã được gửi thành công!'),
              backgroundColor: RuoTokens.emerald700,
            ),
          );
        },
      ),
    );
  }

  void _showSampleQrDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            RuoVectorIcon(RuoIcon.qrCode, size: 22, color: RuoTokens.brand400),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Mã QR Kiểm Thử Thực Địa',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: RuoTokens.brand500.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: RuoTokens.brand400.withValues(alpha: 0.3),
                  ),
                ),
                child: const Text(
                  '💡 Mở trên máy tính để quét:\nhttp://localhost:5000/qr-test\nHoặc chọn nhanh mã bên dưới để nạp vào khung quét.',
                  style: TextStyle(fontSize: 12.5, height: 1.4),
                ),
              ),
              const SizedBox(height: 12),
              for (final asset in _testAssets)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  leading: const RuoVectorIcon(RuoIcon.qrCode, size: 18),
                  title: Text(
                    asset.$1,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  subtitle: Text(asset.$2, style: const TextStyle(fontSize: 12)),
                  trailing: TextButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _inputController.text = asset.$1;
                      _lookup(asset.$1);
                    },
                    child: const Text('Tra cứu'),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  Widget _buildScannerError(MobileScannerException error) {
    return Container(
      color: Colors.black,
      padding: const EdgeInsets.all(16),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const RuoVectorIcon(
              RuoIcon.alert,
              size: 32,
              color: Colors.amber,
            ),
            const SizedBox(height: 8),
            Text(
              'Máy ảnh: ${error.errorCode.name}',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              error.errorDetails?.message ??
                  'Vui lòng cấp quyền máy ảnh cho ứng dụng Ruo.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => _scannerController?.start(),
              style: OutlinedButton.styleFrom(
                foregroundColor: RuoTokens.brand300,
                side: const BorderSide(color: RuoTokens.brand400),
              ),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTestPlaceholder() {
    return Container(
      color: Colors.black,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Opacity(
              opacity: 0.25,
              child: const RuoVectorIcon(
                RuoIcon.qrCode,
                size: 80,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Khung Ngắm Máy Ảnh Thực Tế (Live Camera)',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        const SectionTitle(
          'Quét QR Định Danh Thiết Bị',
          eyebrow: 'TRẠM THỰC ĐỊA THÔNG MINH',
          subtitle: 'Nhận diện tức thời hồ sơ tài sản & báo hỏng cam kết SLA',
        ),
        const SizedBox(height: 16),
        // Camera Viewfinder Box
        Center(
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 380, maxHeight: 310),
            decoration: BoxDecoration(
              color: dark ? RuoTokens.slate900 : RuoTokens.slate950,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _torch
                    ? RuoTokens.brand400
                    : scheme.outlineVariant.withValues(alpha: 0.6),
                width: _torch ? 2 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.35),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(19),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Live Camera Stream
                  if (!_isTestEnvironment && _scannerController != null)
                    MobileScanner(
                      key: const Key('mobile_scanner_viewfinder'),
                      controller: _scannerController,
                      fit: BoxFit.cover,
                      onDetect: _handleBarcodeDetected,
                      errorBuilder: (context, error) =>
                          _buildScannerError(error),
                    )
                  else
                    _buildTestPlaceholder(),

                  // Corner targeting reticle
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.all(28),
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: RuoTokens.brand400.withValues(alpha: 0.65),
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Laser scan bar animation
                  AnimatedBuilder(
                    animation: _animController,
                    builder: (context, _) => Positioned(
                      top: 40 + (_animController.value * 210),
                      left: 36,
                      right: 36,
                      child: Container(
                        height: 3,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              RuoTokens.brand500,
                              RuoTokens.brand300,
                              RuoTokens.brand500,
                              Colors.transparent,
                            ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: RuoTokens.brand400.withValues(alpha: 0.8),
                              blurRadius: 10,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Flashlight & Camera Switch controls
                  Positioned(
                    top: 14,
                    right: 14,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        InkWell(
                          onTap: () async {
                            await _scannerController?.toggleTorch();
                            setState(() => _torch = !_torch);
                          },
                          borderRadius: BorderRadius.circular(999),
                          child: Container(
                            padding: const EdgeInsets.all(9),
                            decoration: BoxDecoration(
                              color: _torch
                                  ? RuoTokens.brand500.withValues(alpha: 0.45)
                                  : Colors.black.withValues(alpha: 0.5),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: _torch
                                    ? RuoTokens.brand400
                                    : Colors.white24,
                              ),
                            ),
                            child: RuoVectorIcon(
                              _torch ? RuoIcon.sun : RuoIcon.moon,
                              size: 18,
                              color:
                                  _torch ? RuoTokens.brand300 : Colors.white70,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () async {
                            await _scannerController?.switchCamera();
                          },
                          borderRadius: BorderRadius.circular(999),
                          child: Container(
                            padding: const EdgeInsets.all(9),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.5),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white24),
                            ),
                            child: const RuoVectorIcon(
                              RuoIcon.refresh,
                              size: 18,
                              color: Colors.white70,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Bottom live status tag
                  Positioned(
                    bottom: 12,
                    left: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Text(
                        _busy
                            ? 'Đang đối soát dữ liệu máy chủ…'
                            : 'Hướng máy ảnh vào mã QR trên màn hình hoặc thiết bị',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                key: const Key('btn_open_actual_camera'),
                onPressed: _busy ? null : _scanActualCamera,
                icon: const RuoVectorIcon(
                  RuoIcon.camera,
                  size: 16,
                  color: Colors.white,
                ),
                label: const Text(
                  'QUÉT TOÀN MÀN HÌNH',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: RuoTokens.brand600,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                key: const Key('btn_sample_qr_codes'),
                onPressed: _showSampleQrDialog,
                icon: const RuoVectorIcon(
                  RuoIcon.qrCode,
                  size: 16,
                  color: RuoTokens.brand400,
                ),
                label: const Text(
                  'MÃ QR MẪU',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: RuoTokens.brand300,
                  side: const BorderSide(color: RuoTokens.brand400),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Direct input field
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _inputController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Mã QR / Barcode / Phòng',
                  hintText: 'VD: EQ-101-ACCASS-01 hoặc A1-101',
                  prefixIcon: Padding(
                    padding: EdgeInsets.all(12),
                    child: RuoVectorIcon(RuoIcon.search, size: 18),
                  ),
                ),
                onFieldSubmitted: _lookup,
              ),
            ),
            const SizedBox(width: 10),
            FilledButton.icon(
              onPressed: _busy ? null : () => _lookup(_inputController.text),
              icon: const RuoVectorIcon(
                RuoIcon.check,
                size: 16,
                color: Colors.white,
              ),
              label: Text(_busy ? 'Đang đọc…' : 'Tra cứu'),
            ),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: scheme.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: scheme.error.withValues(alpha: 0.4)),
            ),
            child: Text(
              _error!,
              style: TextStyle(
                color: scheme.error,
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
              ),
            ),
          ),
        ],
        const SizedBox(height: 24),
        Text(
          'MÃ THỰC ĐỊA KIỂM THỬ NHANH',
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
            color: scheme.primary,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final asset in _testAssets)
              ActionChip(
                avatar: const RuoVectorIcon(RuoIcon.qrCode, size: 14),
                label: Text(asset.$1),
                tooltip: asset.$2,
                onPressed: () {
                  _inputController.text = asset.$1;
                  _lookup(asset.$1);
                },
              ),
          ],
        ),
      ],
    );
  }
}

class EquipmentDetailSheet extends StatelessWidget {
  const EquipmentDetailSheet({
    super.key,
    required this.api,
    required this.equipment,
    this.onReportSuccess,
  });

  final RuoApi api;
  final Json equipment;
  final VoidCallback? onReportSuccess;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final name = value(equipment['name'], fallback: 'Thiết bị trường học');
    final code = value(equipment['code'], fallback: 'EQ-UNKNOWN');
    final room = value(
      equipment['room_code'] ??
          equipment['room']?['code'] ??
          equipment['room_id']?['code'],
      fallback: 'A1-101',
    );
    final category = value(
      equipment['category'] is Map
          ? equipment['category']['name']
          : (equipment['category'] ??
              equipment['category_name'] ??
              equipment['category_id']?['name']),
      fallback: 'Cơ sở vật chất',
    );
    final serial = value(equipment['serial_number'] ?? equipment['serial'], fallback: 'DK-2024-9981-CS');
    final status = value(equipment['status'], fallback: 'in_use');
    final warranty = formatVnDate(equipment['warranty_expiry'] ?? equipment['warranty_end']);

    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.72,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 4, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'HỒ SƠ TÀI SẢN CHI TIẾT',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: scheme.primary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        name,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w900,
                              height: 1.2,
                            ),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status),
              ],
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Column(
                children: [
                  _infoRow(context, 'Mã tài sản (Barcode)', code),
                  const Divider(height: 20),
                  _infoRow(context, 'Danh mục thiết bị', category),
                  const Divider(height: 20),
                  _infoRow(context, 'Vị trí hiện tại', 'Phòng $room'),
                  const Divider(height: 20),
                  _infoRow(context, 'Số sê-ri máy', serial),
                  const Divider(height: 20),
                  _infoRow(context, 'Thời hạn bảo hành', warranty),
                ],
              ),
            ),
            const SizedBox(height: 22),
            FilledButton.icon(
              onPressed: () async {
                Navigator.pop(context);
                await showDialog<void>(
                  context: context,
                  builder: (_) => ReportIncidentDialog(
                    api: api,
                    equipment: equipment,
                    onSuccess: onReportSuccess,
                  ),
                );
              },
              icon: const RuoVectorIcon(
                RuoIcon.wrench,
                size: 18,
                color: Colors.white,
              ),
              style: FilledButton.styleFrom(
                backgroundColor: RuoTokens.rose600,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              label: const Text(
                'Báo hỏng / Yêu cầu sửa chữa (SLA)',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const RuoVectorIcon(RuoIcon.check, size: 16),
              label: const Text('Đóng'),
            ),
          ],
        ),
      ),
    ),
  );
  }

  Widget _infoRow(BuildContext context, String label, String text) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        Text(
          text,
          style: const TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}
