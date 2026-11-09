import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/tokens.dart';
import '../ui/vectors.dart';

/// Maps Building A1 room notations (`P202` <-> `A1-202`), matching `roomPod.js` & `roomValidation.js`.
String equivalentRoomCode(String raw) {
  final clean = raw.trim().toUpperCase();
  if (RegExp(r'^P[1-5]0[1-8]$').hasMatch(clean)) {
    return 'A1-${clean.substring(1)}';
  }
  if (RegExp(r'^A1-[1-5]0[1-8]$').hasMatch(clean)) {
    return 'P${clean.substring(3)}';
  }
  return clean;
}

Map<String, Json> buildCadPodIndex(List<Json> rooms) {
  final index = <String, Json>{};
  for (final room in rooms) {
    final code = value(room['code'], fallback: '').trim().toUpperCase();
    if (code.isEmpty) continue;
    index[code] = room;
  }
  return index;
}

Json? lookupCadPod(
  Map<String, Json> podIndex,
  String blueprintCode, {
  int? floor,
  int? slot,
}) {
  final clean = blueprintCode.trim().toUpperCase();
  final direct = podIndex[clean] ?? podIndex[equivalentRoomCode(clean)];
  if (direct != null) return direct;
  // On Floor 1 (`A1-PH-TB`, `A1-PTV`...) or Floor 5 (`A1-PHL`, `A1-HOP`...),
  // if the backend only contains `P101..P108` / `P501..P508` (e.g. demo fixtures),
  // bind `P{floor}0{slot}` to the corresponding architectural slot when no `A1-*` pod exists.
  if (floor != null && slot != null && slot >= 1 && slot <= 8) {
    final pCode = 'P${floor}0$slot';
    final aCode = 'A1-${floor}0$slot';
    return podIndex[pCode] ?? podIndex[aCode];
  }
  return null;
}

const floorTitles = <int, String>{
  1: 'Tầng trệt — Sân Cổng Vào, Thư viện & Giếng trời trung tâm',
  2: 'Tầng 2 — Giảng đường đa năng, Phòng Nghiên cứu & Giếng trời',
  3: 'Tầng 3 — Giảng đường, Phòng Y tế & Giếng trời thông tầng',
  4: 'Tầng 4 — Giảng đường, Phòng Đào tạo & Hội thảo',
  5: 'Tầng 5 — Phòng Học lớn, Rạp chiếu & Sảnh ban công Nam',
};

enum _DoorSide { none, left, right, top, bottom }

class _CadSlot {
  const _CadSlot({
    required this.code,
    required this.title,
    required this.rect,
    this.titleLine2,
    this.isUtility = false,
    this.isMedical = false,
    this.door = _DoorSide.none,
    this.pSlot,
  });

  final String code;
  final String title;
  final String? titleLine2;
  final Rect rect;
  final bool isUtility;
  final bool isMedical;
  final _DoorSide door;
  final int? pSlot;
}

List<_CadSlot> _slotsForFloor(int floor) {
  if (floor == 1) {
    return const [
      _CadSlot(
        code: 'A1-PH-TB',
        title: 'PH TB',
        rect: Rect.fromLTWH(24, 18, 140, 210),
        door: _DoorSide.right,
        pSlot: 1,
      ),
      _CadSlot(
        code: 'A1-PTV',
        title: 'THƯ VIỆN TRUNG TÂM',
        rect: Rect.fromLTWH(236, 18, 488, 96),
        door: _DoorSide.bottom,
        pSlot: 2,
      ),
      _CadSlot(
        code: 'A1-K1',
        title: 'KHO 1',
        rect: Rect.fromLTWH(728, 18, 102, 96),
        isUtility: true,
        door: _DoorSide.bottom,
        pSlot: 3,
      ),
      _CadSlot(
        code: 'A1-K2',
        title: 'KHO 2',
        rect: Rect.fromLTWH(834, 18, 102, 96),
        isUtility: true,
        door: _DoorSide.bottom,
        pSlot: 4,
      ),
      _CadSlot(
        code: 'A1-WC-NU',
        title: 'NVS NỮ',
        rect: Rect.fromLTWH(796, 162, 140, 66),
        isUtility: true,
        door: _DoorSide.left,
      ),
      _CadSlot(
        code: 'A1-KHO-TAY',
        title: 'KHO TÂY',
        rect: Rect.fromLTWH(24, 324, 140, 66),
        isUtility: true,
        door: _DoorSide.right,
        pSlot: 5,
      ),
      _CadSlot(
        code: 'A1-WC-NAM',
        title: 'NVS NAM',
        rect: Rect.fromLTWH(796, 324, 140, 66),
        isUtility: true,
        door: _DoorSide.left,
      ),
      _CadSlot(
        code: 'A1-PTH2',
        title: 'PTH 2',
        rect: Rect.fromLTWH(24, 394, 208, 138),
        door: _DoorSide.top,
        pSlot: 6,
      ),
      _CadSlot(
        code: 'A1-CV',
        title: 'SÂN CỔNG VÀO',
        rect: Rect.fromLTWH(236, 394, 488, 92),
        pSlot: 7,
      ),
      _CadSlot(
        code: 'A1-PH-DN',
        title: 'PH ĐN',
        rect: Rect.fromLTWH(728, 394, 208, 138),
        door: _DoorSide.top,
        pSlot: 8,
      ),
    ];
  }

  if (floor == 5) {
    return const [
      _CadSlot(
        code: 'A1-501',
        title: 'PHÒNG SINH HOẠT',
        rect: Rect.fromLTWH(24, 18, 236, 91),
        door: _DoorSide.bottom,
        pSlot: 1,
      ),
      _CadSlot(
        code: 'A1-507',
        title: 'PH 507',
        rect: Rect.fromLTWH(264, 18, 116, 91),
        door: _DoorSide.bottom,
        pSlot: 7,
      ),
      _CadSlot(
        code: 'A1-PHL',
        title: 'PHÒNG HỌC LỚN',
        rect: Rect.fromLTWH(384, 18, 336, 91),
        door: _DoorSide.bottom,
        pSlot: 2,
      ),
      _CadSlot(
        code: 'A1-HOP',
        title: 'PHÒNG HỌP',
        rect: Rect.fromLTWH(724, 18, 112, 70),
        door: _DoorSide.bottom,
        pSlot: 5,
      ),
      _CadSlot(
        code: 'A1-PGV',
        title: 'PHÒNG',
        titleLine2: 'GIÁO VIÊN',
        rect: Rect.fromLTWH(840, 18, 96, 91),
        door: _DoorSide.left,
        pSlot: 6,
      ),
      _CadSlot(
        code: 'A1-503',
        title: 'PH 503',
        rect: Rect.fromLTWH(24, 113, 140, 115),
        door: _DoorSide.right,
        pSlot: 3,
      ),
      _CadSlot(
        code: 'A1-XTC',
        title: 'XƯỞNG THỦ CÔNG',
        rect: Rect.fromLTWH(796, 113, 140, 45),
        door: _DoorSide.left,
      ),
      _CadSlot(
        code: 'A1-WC-NU-T5',
        title: 'NVS NỮ',
        rect: Rect.fromLTWH(796, 162, 140, 66),
        isUtility: true,
        door: _DoorSide.left,
      ),
      _CadSlot(
        code: 'A1-504',
        title: 'RẠP CHIẾU PHIM',
        rect: Rect.fromLTWH(24, 324, 140, 115),
        door: _DoorSide.right,
        pSlot: 4,
      ),
      _CadSlot(
        code: 'A1-WC-NAM-T5',
        title: 'NVS NAM',
        rect: Rect.fromLTWH(796, 324, 140, 66),
        isUtility: true,
        door: _DoorSide.left,
      ),
      _CadSlot(
        code: 'A1-KHO-T5',
        title: 'PHÒNG KHO',
        rect: Rect.fromLTWH(796, 394, 140, 45),
        isUtility: true,
        door: _DoorSide.left,
      ),
      _CadSlot(
        code: 'A1-SBC',
        title: 'SẢNH BAN CÔNG',
        rect: Rect.fromLTWH(24, 443, 912, 89),
        door: _DoorSide.top,
        pSlot: 8,
      ),
    ];
  }

  // Floors 2, 3, 4 shared `#`-corridor & Central Atrium grid
  final p = '$floor';
  final northCenter = switch (floor) {
    2 => const ('A1-NC-01', 'PHÒNG NGHIÊN CỨU 1'),
    3 => const ('A1-NC-T3', 'PHÒNG NGHIÊN CỨU 1'),
    _ => const ('A1-PĐT', 'PHÒNG ĐÀO TẠO'),
  };

  List<_CadSlot> pair(
    String a,
    String b,
    double x,
    double yTop,
    double w,
    _DoorSide door, {
    int? pA,
    int? pB,
  }) => [
    _CadSlot(
      code: 'A1-$p$a',
      title: 'PH $p$a',
      rect: Rect.fromLTWH(x, yTop, w, 45),
      door: door,
      pSlot: pA,
    ),
    _CadSlot(
      code: 'A1-$p$b',
      title: 'PH $p$b',
      rect: Rect.fromLTWH(x, yTop + 49, w, 45),
      door: door,
      pSlot: pB,
    ),
  ];

  return [
    ...pair('01', '02', 24, 18, 140, _DoorSide.right, pA: 1, pB: 2),
    _CadSlot(
      code: 'A1-${p}03',
      title: 'PH ${p}03',
      rect: const Rect.fromLTWH(24, 162, 140, 66),
      door: _DoorSide.right,
      pSlot: 3,
    ),
    _CadSlot(
      code: 'A1-${p}04',
      title: 'PH ${p}04',
      rect: const Rect.fromLTWH(24, 324, 140, 66),
      door: _DoorSide.right,
      pSlot: 4,
    ),
    ...pair('05', '06', 24, 438, 140, _DoorSide.right, pA: 5, pB: 6),
    ...pair('07', '08', 236, 18, 120, _DoorSide.left, pA: 7, pB: 8),
    ...pair('15', '16', 236, 438, 120, _DoorSide.left),
    _CadSlot(
      code: northCenter.$1,
      title: northCenter.$2,
      rect: const Rect.fromLTWH(364, 18, 232, 70),
      door: _DoorSide.bottom,
    ),
    if (floor == 3) ...[
      const _CadSlot(
        code: 'A1-YT-T3',
        title: 'PHÒNG Y TẾ',
        rect: Rect.fromLTWH(364, 462, 114, 70),
        isUtility: true,
        isMedical: true,
        door: _DoorSide.top,
      ),
      const _CadSlot(
        code: 'A1-319',
        title: 'PHÒNG HỌC',
        rect: Rect.fromLTWH(482, 462, 114, 70),
        door: _DoorSide.top,
      ),
    ] else
      _CadSlot(
        code: floor == 2 ? 'A1-NC-02' : 'A1-PHT',
        title: floor == 2 ? 'PHÒNG NGHIÊN CỨU 2' : 'PHÒNG HỘI THẢO',
        rect: const Rect.fromLTWH(364, 462, 232, 70),
        door: _DoorSide.top,
      ),
    ...pair('09', '10', 604, 18, 120, _DoorSide.right),
    ...pair('17', '18', 604, 438, 120, _DoorSide.right),
    ...pair('11', '12', 796, 18, 140, _DoorSide.left),
    _CadSlot(
      code: 'A1-WC-NU-T$p',
      title: 'NVS NỮ',
      rect: const Rect.fromLTWH(796, 162, 140, 66),
      isUtility: true,
      door: _DoorSide.left,
    ),
    _CadSlot(
      code: 'A1-WC-NAM-T$p',
      title: 'NVS NAM',
      rect: const Rect.fromLTWH(796, 324, 140, 66),
      isUtility: true,
      door: _DoorSide.left,
    ),
    ...pair('13', '14', 796, 438, 140, _DoorSide.left),
  ];
}

/// Interactive 2D Architectural Blueprint of Building A1 (Floors 1–5)
/// drawn with pure native Dart `CustomPainter` + pinch-zoom `InteractiveViewer`.
class FloorPlanCanvas extends StatefulWidget {
  const FloorPlanCanvas({
    super.key,
    required this.floor,
    required this.rooms,
    required this.onSelectRoom,
  });

  final int floor;
  final List<Json> rooms;
  final ValueChanged<Json> onSelectRoom;

  @override
  State<FloorPlanCanvas> createState() => _FloorPlanCanvasState();
}

class _FloorPlanCanvasState extends State<FloorPlanCanvas> {
  final TransformationController _transform = TransformationController();
  String? _selectedCode;

  @override
  void didUpdateWidget(covariant FloorPlanCanvas oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.floor != widget.floor) {
      _transform.value = Matrix4.identity();
      _selectedCode = null;
    }
  }

  @override
  void dispose() {
    _transform.dispose();
    super.dispose();
  }

  void _handleTap(
    Offset localPos,
    Size renderedSize,
    Map<String, Json> podIndex,
    List<_CadSlot> slots,
  ) {
    const viewX = 14.0, viewY = 10.0, viewW = 932.0, viewH = 530.0;
    final cadX = viewX + (localPos.dx / renderedSize.width) * viewW;
    final cadY = viewY + (localPos.dy / renderedSize.height) * viewH;
    final hit = Offset(cadX, cadY);

    for (final slot in slots) {
      if (slot.rect.contains(hit)) {
        final live = lookupCadPod(
          podIndex,
          slot.code,
          floor: widget.floor,
          slot: slot.pSlot,
        );
        if (live != null) {
          setState(() => _selectedCode = value(live['code']));
          widget.onSelectRoom(live);
        } else if (mounted) {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              SnackBar(
                duration: const Duration(seconds: 2),
                content: Text(
                  '${slot.title} (${slot.code}): không gian phụ trợ / chưa khai báo trên hệ thống.',
                ),
              ),
            );
        }
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final palette = CadPalette.of(brightness);
    final podIndex = buildCadPodIndex(widget.rooms);
    final slots = _slotsForFloor(widget.floor);

    return Container(
      decoration: BoxDecoration(
        color: palette.canvasBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: palette.roomBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 6),
            child: Row(
              children: [
                const RuoVectorIcon(
                  RuoIcon.blueprint,
                  size: 15,
                  color: RuoTokens.brand500,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'BẢN VẼ MẶT BẰNG KIẾN TRÚC 2D · TÒA A1 (CHẠM PHÒNG / PHÓNG TO 2 NGÓN)',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                      color: palette.corridorInk,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  tooltip: 'Đặt lại khung nhìn',
                  visualDensity: VisualDensity.compact,
                  onPressed: () => _transform.value = Matrix4.identity(),
                  icon: RuoVectorIcon(
                    RuoIcon.zoomReset,
                    size: 16,
                    color: palette.corridorInk,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final maxW = constraints.maxWidth;
                final h = math.min(maxW * 530 / 932, 280.0);
                final w = h * 932 / 530;
                final size = Size(w, h);
                return Center(
                  child: SizedBox(
                    width: w,
                    height: h,
                    child: InteractiveViewer(
                      transformationController: _transform,
                      minScale: 1.0,
                      maxScale: 3.0,
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTapUp: (details) => _handleTap(
                          details.localPosition,
                          size,
                          podIndex,
                          slots,
                        ),
                        child: CustomPaint(
                          size: size,
                          painter: _FloorBlueprintPainter(
                            floor: widget.floor,
                            slots: slots,
                            podIndex: podIndex,
                            palette: palette,
                            selectedCode: _selectedCode,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FloorBlueprintPainter extends CustomPainter {
  const _FloorBlueprintPainter({
    required this.floor,
    required this.slots,
    required this.podIndex,
    required this.palette,
    required this.selectedCode,
  });

  final int floor;
  final List<_CadSlot> slots;
  final Map<String, Json> podIndex;
  final CadPalette palette;
  final String? selectedCode;

  void _drawText(
    Canvas canvas,
    String text,
    Offset center, {
    required double fontSize,
    required Color color,
    FontWeight weight = FontWeight.w800,
    double? maxWidth,
  }) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: weight,
          color: color,
          letterSpacing: -0.1,
        ),
      ),
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: maxWidth ?? double.infinity);
    tp.paint(
      canvas,
      Offset(center.dx - tp.width / 2, center.dy - tp.height / 2),
    );
  }

  void _drawDashedLine(
    Canvas canvas,
    Offset a,
    Offset b,
    Paint paint,
    double dash,
    double gap,
  ) {
    final dx = b.dx - a.dx;
    final dy = b.dy - a.dy;
    final dist = math.sqrt(dx * dx + dy * dy);
    if (dist <= 0) return;
    final ux = dx / dist;
    final uy = dy / dist;
    var pos = 0.0;
    while (pos < dist) {
      final end = math.min(pos + dash, dist);
      canvas.drawLine(
        Offset(a.dx + ux * pos, a.dy + uy * pos),
        Offset(a.dx + ux * end, a.dy + uy * end),
        paint,
      );
      pos += dash + gap;
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    const viewX = 14.0, viewY = 10.0, viewW = 932.0, viewH = 530.0;
    canvas.save();
    canvas.scale(size.width / viewW, size.height / viewH);
    canvas.translate(-viewX, -viewY);

    // 1. Background & Outer CAD Double Shell
    canvas.drawRect(
      const Rect.fromLTWH(viewX, viewY, viewW, viewH),
      Paint()..color = palette.canvasBg,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(16, 12, 928, 526),
        const Radius.circular(6),
      ),
      Paint()
        ..color = palette.shellStroke
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.2,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(20, 16, 920, 518),
        const Radius.circular(5),
      ),
      Paint()
        ..color = palette.shellInner
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.9,
    );

    // Solar Terracotta window mullions
    final winPaint = Paint()
      ..color = palette.windowStroke.withValues(alpha: 0.85)
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;
    for (final wy in [60.0, 190.0, 360.0, 470.0]) {
      canvas.drawLine(Offset(16, wy), Offset(16, wy + 40), winPaint);
      canvas.drawLine(Offset(944, wy), Offset(944, wy + 40), winPaint);
    }
    for (final wx in [70.0, 290.0, 456.0, 620.0, 845.0]) {
      canvas.drawLine(Offset(wx, 12), Offset(wx + 42, 12), winPaint);
      if (floor != 1) {
        canvas.drawLine(Offset(wx, 538), Offset(wx + 42, 538), winPaint);
      }
    }

    // 2. Corridor Network
    final corridorFill = Paint()..color = palette.corridorBg;
    final corridorStroke = Paint()
      ..color = palette.corridorStroke
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    if (floor == 1) {
      final path = Path()
        ..moveTo(168, 18)
        ..lineTo(232, 18)
        ..lineTo(232, 118)
        ..lineTo(936, 118)
        ..lineTo(936, 158)
        ..lineTo(792, 158)
        ..lineTo(792, 390)
        ..lineTo(728, 390)
        ..lineTo(728, 158)
        ..lineTo(232, 158)
        ..lineTo(232, 390)
        ..lineTo(168, 390)
        ..close();
      canvas.drawPath(path, corridorFill);
      canvas.drawPath(path, corridorStroke);
    } else if (floor == 5) {
      final loop = Path()
        ..fillType = PathFillType.evenOdd
        ..addRect(const Rect.fromLTWH(168, 113, 624, 326))
        ..addRect(const Rect.fromLTWH(232, 158, 496, 236));
      canvas.drawPath(loop, corridorFill);
      canvas.drawPath(loop, corridorStroke);
    } else {
      final cross = Path()
        ..fillType = PathFillType.evenOdd
        ..moveTo(168, 18)
        ..lineTo(232, 18)
        ..lineTo(232, 118)
        ..lineTo(728, 118)
        ..lineTo(728, 18)
        ..lineTo(792, 18)
        ..lineTo(792, 118)
        ..lineTo(936, 118)
        ..lineTo(936, 158)
        ..lineTo(792, 158)
        ..lineTo(792, 394)
        ..lineTo(936, 394)
        ..lineTo(936, 434)
        ..lineTo(792, 434)
        ..lineTo(792, 532)
        ..lineTo(728, 532)
        ..lineTo(728, 434)
        ..lineTo(232, 434)
        ..lineTo(232, 532)
        ..lineTo(168, 532)
        ..lineTo(168, 434)
        ..lineTo(24, 434)
        ..lineTo(24, 394)
        ..lineTo(168, 394)
        ..lineTo(168, 158)
        ..lineTo(24, 158)
        ..lineTo(24, 118)
        ..lineTo(168, 118)
        ..close()
        ..addRect(const Rect.fromLTWH(232, 158, 496, 236));
      canvas.drawPath(cross, corridorFill);
      canvas.drawPath(cross, corridorStroke);
    }

    _drawText(
      canvas,
      'HÀNH LANG TRỤC BẮC',
      const Offset(480, 138),
      fontSize: 10.5,
      color: palette.corridorInk,
    );
    if (floor != 1) {
      _drawText(
        canvas,
        'HÀNH LANG TRỤC NAM',
        const Offset(480, 415),
        fontSize: 10.5,
        color: palette.corridorInk,
      );
    }

    // 3. Central Atrium Void (Giếng Trời Trung Tâm)
    const atrium = Rect.fromLTWH(236, 162, 488, 228);
    canvas.drawRRect(
      RRect.fromRectAndRadius(atrium, const Radius.circular(6)),
      Paint()..color = palette.voidBg,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(atrium, const Radius.circular(6)),
      Paint()
        ..color = palette.voidStroke
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );
    final dashPaint = Paint()
      ..color = palette.corridorDash
      ..strokeWidth = 1.1;
    _drawDashedLine(
      canvas,
      const Offset(242, 168),
      const Offset(718, 384),
      dashPaint,
      5,
      5,
    );
    _drawDashedLine(
      canvas,
      const Offset(718, 168),
      const Offset(242, 384),
      dashPaint,
      5,
      5,
    );
    final atriumBadge = RRect.fromRectAndRadius(
      const Rect.fromLTWH(376, 258, 208, 36),
      const Radius.circular(8),
    );
    canvas.drawRRect(atriumBadge, Paint()..color = palette.roomBg);
    canvas.drawRRect(
      atriumBadge,
      Paint()
        ..color = palette.roomBorder
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.3,
    );
    _drawText(
      canvas,
      'GIẾNG TRỜI TRUNG TÂM',
      const Offset(480, 276),
      fontSize: 12,
      color: palette.inkPure,
    );

    // 4. Symmetric West & East Stairwells
    void drawStairwell(double x, String label) {
      final box = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, 232, 140, 88),
        const Radius.circular(4),
      );
      canvas.drawRRect(box, Paint()..color = palette.stairBg);
      canvas.drawRRect(
        box,
        Paint()
          ..color = palette.wallStroke
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.5,
      );
      final treadPaint = Paint()
        ..color = palette.stairTread
        ..strokeWidth = 1;
      for (var i = 0; i < 8; i++) {
        final tx = x + 36 + i * 11.0;
        canvas.drawLine(Offset(tx, 236), Offset(tx, 266), treadPaint);
        canvas.drawLine(Offset(tx, 286), Offset(tx, 316), treadPaint);
      }
      _drawText(
        canvas,
        label,
        Offset(x + 70, 276),
        fontSize: 10,
        color: palette.inkSecondary,
      );
    }

    drawStairwell(24, 'THANG TÂY ▲');
    drawStairwell(796, 'THANG ĐÔNG ▲');

    // Floor 1 Main Gates (`✦ CỔNG CHÍNH ✦`)
    if (floor == 1) {
      for (final gate in const [
        (Rect.fromLTWH(236, 490, 114, 42), 'CỔNG PHỤ', false),
        (Rect.fromLTWH(356, 490, 248, 42), '✦ CỔNG CHÍNH ✦', true),
        (Rect.fromLTWH(610, 490, 114, 42), 'CỔNG PHỤ', false),
      ]) {
        final r = RRect.fromRectAndRadius(gate.$1, const Radius.circular(6));
        canvas.drawRRect(
          r,
          Paint()..color = gate.$3 ? palette.roomSelectedBg : palette.utilityBg,
        );
        canvas.drawRRect(
          r,
          Paint()
            ..color = gate.$3 ? palette.roomAccent : palette.utilityBorder
            ..style = PaintingStyle.stroke
            ..strokeWidth = gate.$3 ? 2.0 : 1.3,
        );
        _drawText(
          canvas,
          gate.$2,
          gate.$1.center,
          fontSize: gate.$3 ? 12 : 10.5,
          color: gate.$3 ? palette.roomAccent : palette.inkSecondary,
        );
      }
    }

    // 5. Render Every Room Cell + UC-2.7 RoomPodCard Chips + Alert Dots
    for (final slot in slots) {
      final pod = lookupCadPod(
        podIndex,
        slot.code,
        floor: floor,
        slot: slot.pSlot,
      );
      final liveCode = pod != null ? value(pod['code']) : slot.code;
      final isSelected = selectedCode != null && selectedCode == liveCode;
      final effectiveStatus = pod != null
          ? value(
              pod['effectiveStatus'],
              fallback: value(pod['status'], fallback: 'available'),
            )
          : null;
      final eqCount = pod != null
          ? (pod['equipmentCount'] is num
                ? (pod['equipmentCount'] as num).toInt()
                : 0)
          : 0;
      final brokenCount = pod != null
          ? (pod['brokenCount'] is num
                ? (pod['brokenCount'] as num).toInt()
                : 0)
          : 0;
      final openReports = pod != null
          ? (pod['openReportCount'] is num
                ? (pod['openReportCount'] as num).toInt()
                : 0)
          : 0;
      final hasAlert =
          pod != null &&
          (pod['hasAlert'] == true ||
              brokenCount > 0 ||
              openReports > 0 ||
              effectiveStatus == 'maintenance');
      final isReportAlert =
          brokenCount > 0 ||
          openReports > 0 ||
          pod?['alertSeverity'] == 'report';

      final fill = isSelected
          ? palette.roomSelectedBg
          : slot.isUtility
          ? palette.utilityBg
          : palette.roomBg;
      final border = isSelected
          ? palette.roomAccent
          : effectiveStatus == 'inactive'
          ? palette.utilityAccent
          : effectiveStatus == 'maintenance'
          ? const Color(0xFFF59E0B)
          : slot.isUtility
          ? palette.utilityBorder
          : palette.roomBorder;
      final accent = slot.isUtility && pod == null
          ? palette.utilityAccent
          : effectiveStatus == 'inactive'
          ? palette.utilityAccent
          : effectiveStatus == 'available' && pod != null
          ? const Color(0xFF10B981)
          : palette.roomAccent;

      final rr = RRect.fromRectAndRadius(slot.rect, const Radius.circular(5));
      canvas.drawRRect(rr, Paint()..color = fill);
      canvas.drawRRect(
        rr,
        Paint()
          ..color = border
          ..style = PaintingStyle.stroke
          ..strokeWidth = isSelected ? 2.6 : 1.5,
      );

      // Left category / status bar
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            slot.rect.left + 4,
            slot.rect.top + 5,
            4,
            math.max(10, slot.rect.height - 10),
          ),
          const Radius.circular(2),
        ),
        Paint()..color = accent,
      );

      // Alert dot (top-right)
      if (hasAlert) {
        final dotCenter = Offset(slot.rect.right - 11, slot.rect.top + 11);
        final dotColor = isReportAlert
            ? const Color(0xFFE5484D)
            : const Color(0xFFF59E0B);
        canvas.drawCircle(
          dotCenter,
          7.2,
          Paint()..color = dotColor.withValues(alpha: 0.24),
        );
        canvas.drawCircle(dotCenter, 4.2, Paint()..color = dotColor);
      }

      // Medical cross on A1-YT-T3
      if (slot.isMedical) {
        final cx = slot.rect.right - (hasAlert ? 25.0 : 12.0);
        final cy = slot.rect.top + 11.0;
        final medPaint = Paint()..color = palette.roomAccent;
        canvas.drawRect(
          Rect.fromCenter(center: Offset(cx, cy), width: 2.6, height: 8.5),
          medPaint,
        );
        canvas.drawRect(
          Rect.fromCenter(center: Offset(cx, cy), width: 8.5, height: 2.6),
          medPaint,
        );
      }

      // Room Title (uses live code when mapped to P101..P508 on generic slots)
      final displayTitle =
          pod != null && RegExp(r'^P[1-5]0[1-8]$').hasMatch(liveCode)
          ? liveCode
          : slot.title;
      final compact = slot.rect.height < 56;
      final fontSize = compact ? 10.8 : (slot.rect.width < 130 ? 11.5 : 12.5);
      final titleY = pod != null && slot.rect.height >= 64
          ? slot.rect.center.dy - 7
          : slot.rect.center.dy;

      if (slot.titleLine2 != null &&
          (pod == null || !RegExp(r'^P[1-5]0[1-8]$').hasMatch(liveCode))) {
        _drawText(
          canvas,
          displayTitle,
          Offset(slot.rect.center.dx + 2, titleY - 6),
          fontSize: fontSize,
          color: palette.inkPure,
          maxWidth: slot.rect.width - 18,
        );
        _drawText(
          canvas,
          slot.titleLine2!,
          Offset(slot.rect.center.dx + 2, titleY + 8),
          fontSize: fontSize,
          color: palette.inkPure,
          maxWidth: slot.rect.width - 18,
        );
      } else {
        _drawText(
          canvas,
          displayTitle,
          Offset(slot.rect.center.dx + 2, titleY),
          fontSize: fontSize,
          color: palette.inkPure,
          maxWidth: slot.rect.width - 18,
        );
      }

      // UC-2.7 Inline Pod Chip (`n TB` + red `m hỏng`)
      if (pod != null) {
        final shortCode = liveCode.replaceFirst(RegExp(r'^A1-'), '');
        final fullPod = slot.rect.height >= 68 && slot.rect.width >= 115;
        final mainLabel = fullPod ? '$shortCode · $eqCount TB' : '$eqCount TB';
        final mainW = (mainLabel.length * 5.8 + 12).clamp(
          34.0,
          slot.rect.width - 12,
        );
        final chipY = slot.rect.bottom - 20;
        final mainRect = RRect.fromRectAndRadius(
          Rect.fromLTWH(slot.rect.right - 6 - mainW, chipY, mainW, 15),
          const Radius.circular(7.5),
        );
        final podBorderColor = switch (effectiveStatus) {
          'available' => const Color(0xFF10B981),
          'maintenance' => const Color(0xFFF59E0B),
          _ => const Color(0xFF8A93A3),
        };
        canvas.drawRRect(mainRect, Paint()..color = palette.roomBg);
        canvas.drawRRect(
          mainRect,
          Paint()
            ..color = podBorderColor
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.2,
        );
        _drawText(
          canvas,
          mainLabel,
          mainRect.outerRect.center,
          fontSize: 9.2,
          color: palette.inkPure,
          maxWidth: mainW - 4,
        );

        if (brokenCount > 0 && slot.rect.width >= 96) {
          final brokenLabel = fullPod ? '$brokenCount hỏng' : '!$brokenCount';
          final brokenW = (brokenLabel.length * 5.8 + 10).clamp(24.0, 58.0);
          final brokenLeft = mainRect.left - 4 - brokenW;
          if (brokenLeft > slot.rect.left + 8) {
            final brokenRect = RRect.fromRectAndRadius(
              Rect.fromLTWH(brokenLeft, chipY, brokenW, 15),
              const Radius.circular(7.5),
            );
            canvas.drawRRect(
              brokenRect,
              Paint()..color = const Color(0xFFE5484D),
            );
            _drawText(
              canvas,
              brokenLabel,
              brokenRect.outerRect.center,
              fontSize: 9.0,
              color: Colors.white,
            );
          }
        }
      }
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _FloorBlueprintPainter old) =>
      old.floor != floor ||
      old.podIndex != podIndex ||
      old.palette.canvasBg != palette.canvasBg ||
      old.selectedCode != selectedCode;
}
