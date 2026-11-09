import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'tokens.dart';

/// Pure Native Inline Vector System (`CustomPainter`) — zero external icon libraries
/// and zero Material icon-font dependencies, upholding the Ruo Native Vector standard.
enum RuoIcon {
  blueprint,
  door,
  dashboard,
  chart,
  search,
  chevronDown,
  chevronLeft,
  chevronRight,
  plus,
  edit,
  refresh,
  alert,
  check,
  download,
  printer,
  logout,
  eye,
  eyeOff,
  server,
  sun,
  moon,
  wrench,
  transfer,
  zoomReset,
  qrCode,
  bell,
  clock,
  inventory,
  user,
  camera,
  menu,
}

class RuoVectorIcon extends StatelessWidget {
  const RuoVectorIcon(
    this.icon, {
    super.key,
    this.size = 20,
    this.color,
    this.strokeWidth = 1.85,
  });

  final RuoIcon icon;
  final double size;
  final Color? color;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    final resolved =
        color ??
        IconTheme.of(context).color ??
        Theme.of(context).colorScheme.onSurface;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RuoIconPainter(
          icon: icon,
          color: resolved,
          strokeWidth: strokeWidth,
        ),
      ),
    );
  }
}

class _RuoIconPainter extends CustomPainter {
  const _RuoIconPainter({
    required this.icon,
    required this.color,
    required this.strokeWidth,
  });

  final RuoIcon icon;
  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24.0;
    canvas.save();
    canvas.scale(s, s);
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth / s
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final fill = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    switch (icon) {
      case RuoIcon.blueprint:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(3, 3, 18, 18),
            const Radius.circular(3),
          ),
          p,
        );
        canvas.drawLine(const Offset(3, 9.5), const Offset(21, 9.5), p);
        canvas.drawLine(const Offset(9.5, 9.5), const Offset(9.5, 21), p);
        canvas.drawLine(const Offset(15, 3), const Offset(15, 9.5), p);
      case RuoIcon.door:
        canvas.drawPath(
          Path()
            ..moveTo(5, 20)
            ..lineTo(5, 5)
            ..quadraticBezierTo(5, 3.5, 6.5, 3.5)
            ..lineTo(15.5, 3.5)
            ..quadraticBezierTo(17, 3.5, 17, 5)
            ..lineTo(17, 20),
          p,
        );
        canvas.drawLine(const Offset(3, 20), const Offset(21, 20), p);
        canvas.drawCircle(const Offset(13.8, 12), 1.1, fill);
      case RuoIcon.dashboard:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(3, 3, 8, 9),
            const Radius.circular(2),
          ),
          p,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(13, 3, 8, 5),
            const Radius.circular(2),
          ),
          p,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(13, 10, 8, 11),
            const Radius.circular(2),
          ),
          p,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(3, 14, 8, 7),
            const Radius.circular(2),
          ),
          p,
        );
      case RuoIcon.chart:
        canvas.drawLine(const Offset(4, 20), const Offset(20, 20), p);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(5.5, 11, 3.2, 9),
            const Radius.circular(1),
          ),
          p,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(10.4, 6, 3.2, 14),
            const Radius.circular(1),
          ),
          p,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(15.3, 9, 3.2, 11),
            const Radius.circular(1),
          ),
          p,
        );
      case RuoIcon.search:
        canvas.drawCircle(const Offset(11, 11), 6.5, p);
        canvas.drawLine(const Offset(16, 16), const Offset(20.5, 20.5), p);
      case RuoIcon.chevronDown:
        canvas.drawPath(
          Path()
            ..moveTo(6.5, 9.5)
            ..lineTo(12, 15)
            ..lineTo(17.5, 9.5),
          p,
        );
      case RuoIcon.chevronLeft:
        canvas.drawPath(
          Path()
            ..moveTo(14.5, 6)
            ..lineTo(8.5, 12)
            ..lineTo(14.5, 18),
          p,
        );
      case RuoIcon.chevronRight:
        canvas.drawPath(
          Path()
            ..moveTo(9.5, 6)
            ..lineTo(15.5, 12)
            ..lineTo(9.5, 18),
          p,
        );
      case RuoIcon.plus:
        canvas.drawLine(const Offset(12, 5), const Offset(12, 19), p);
        canvas.drawLine(const Offset(5, 12), const Offset(19, 12), p);
      case RuoIcon.edit:
        canvas.drawPath(
          Path()
            ..moveTo(15.5, 4.5)
            ..lineTo(19.5, 8.5)
            ..lineTo(8.5, 19.5)
            ..lineTo(4.5, 19.5)
            ..lineTo(4.5, 15.5)
            ..close(),
          p,
        );
      case RuoIcon.refresh:
        canvas.drawPath(
          Path()
            ..moveTo(21, 12)
            ..arcToPoint(
              const Offset(18.7, 5.7),
              radius: const Radius.circular(9),
              clockwise: true,
              largeArc: true,
            )
            ..lineTo(21, 8),
          p,
        );
        canvas.drawPath(
          Path()
            ..moveTo(21, 3)
            ..lineTo(21, 8)
            ..lineTo(16, 8),
          p,
        );
      case RuoIcon.alert:
        canvas.drawPath(
          Path()
            ..moveTo(12, 4)
            ..lineTo(20.5, 19)
            ..lineTo(3.5, 19)
            ..close(),
          p,
        );
        canvas.drawLine(const Offset(12, 9.5), const Offset(12, 13.8), p);
        canvas.drawCircle(const Offset(12, 16.5), 0.9, fill);
      case RuoIcon.check:
        canvas.drawCircle(const Offset(12, 12), 8.5, p);
        canvas.drawPath(
          Path()
            ..moveTo(8.3, 12.2)
            ..lineTo(10.9, 14.8)
            ..lineTo(15.8, 9.6),
          p,
        );
      case RuoIcon.download:
        canvas.drawLine(const Offset(12, 4), const Offset(12, 15), p);
        canvas.drawPath(
          Path()
            ..moveTo(8, 11.2)
            ..lineTo(12, 15.2)
            ..lineTo(16, 11.2),
          p,
        );
        canvas.drawPath(
          Path()
            ..moveTo(4.5, 17)
            ..lineTo(4.5, 19.5)
            ..lineTo(19.5, 19.5)
            ..lineTo(19.5, 17),
          p,
        );
      case RuoIcon.printer:
        canvas.drawRect(const Rect.fromLTWH(7, 4, 10, 4.5), p);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(4, 8.5, 16, 7.5),
            const Radius.circular(2),
          ),
          p,
        );
        canvas.drawRect(const Rect.fromLTWH(7, 14, 10, 6), p);
      case RuoIcon.logout:
        canvas.drawPath(
          Path()
            ..moveTo(10, 4.5)
            ..lineTo(5.5, 4.5)
            ..lineTo(5.5, 19.5)
            ..lineTo(10, 19.5),
          p,
        );
        canvas.drawLine(const Offset(10, 12), const Offset(20, 12), p);
        canvas.drawPath(
          Path()
            ..moveTo(16, 8)
            ..lineTo(20, 12)
            ..lineTo(16, 16),
          p,
        );
      case RuoIcon.eye:
        canvas.drawPath(
          Path()
            ..moveTo(2.5, 12)
            ..quadraticBezierTo(12, 4.5, 21.5, 12)
            ..quadraticBezierTo(12, 19.5, 2.5, 12),
          p,
        );
        canvas.drawCircle(const Offset(12, 12), 2.6, p);
      case RuoIcon.eyeOff:
        canvas.drawPath(
          Path()
            ..moveTo(2.5, 12)
            ..quadraticBezierTo(12, 4.5, 21.5, 12)
            ..quadraticBezierTo(12, 19.5, 2.5, 12),
          p,
        );
        canvas.drawLine(const Offset(4, 4), const Offset(20, 20), p);
      case RuoIcon.server:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(4, 4.5, 16, 6),
            const Radius.circular(2),
          ),
          p,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(4, 13.5, 16, 6),
            const Radius.circular(2),
          ),
          p,
        );
        canvas.drawCircle(const Offset(7.5, 7.5), 0.9, fill);
        canvas.drawCircle(const Offset(7.5, 16.5), 0.9, fill);
      case RuoIcon.sun:
        canvas.drawCircle(const Offset(12, 12), 4.2, p);
        for (var i = 0; i < 8; i++) {
          final a = i * math.pi / 4;
          canvas.drawLine(
            Offset(12 + math.cos(a) * 6.8, 12 + math.sin(a) * 6.8),
            Offset(12 + math.cos(a) * 9.2, 12 + math.sin(a) * 9.2),
            p,
          );
        }
      case RuoIcon.moon:
        canvas.drawPath(
          Path()
            ..moveTo(21, 12.8)
            ..arcToPoint(
              const Offset(11.2, 3),
              radius: const Radius.circular(9),
              clockwise: true,
              largeArc: true,
            )
            ..arcToPoint(
              const Offset(21, 12.8),
              radius: const Radius.circular(7),
              clockwise: false,
            )
            ..close(),
          p,
        );
      case RuoIcon.wrench:
        canvas.drawPath(
          Path()
            ..moveTo(14.5, 6.5)
            ..arcToPoint(
              const Offset(17.5, 9.5),
              radius: const Radius.circular(4),
            )
            ..lineTo(9, 18)
            ..arcToPoint(
              const Offset(6, 15),
              radius: const Radius.circular(2.2),
            )
            ..close(),
          p,
        );
      case RuoIcon.transfer:
        canvas.drawLine(const Offset(4, 9), const Offset(19, 9), p);
        canvas.drawPath(
          Path()
            ..moveTo(15.5, 5.5)
            ..lineTo(19.5, 9)
            ..lineTo(15.5, 12.5),
          p,
        );
        canvas.drawLine(const Offset(20, 15), const Offset(5, 15), p);
        canvas.drawPath(
          Path()
            ..moveTo(8.5, 11.5)
            ..lineTo(4.5, 15)
            ..lineTo(8.5, 18.5),
          p,
        );
      case RuoIcon.zoomReset:
        canvas.drawPath(
          Path()
            ..moveTo(4, 9)
            ..lineTo(4, 4)
            ..lineTo(9, 4)
            ..moveTo(15, 4)
            ..lineTo(20, 4)
            ..lineTo(20, 9)
            ..moveTo(20, 15)
            ..lineTo(20, 20)
            ..lineTo(15, 20)
            ..moveTo(9, 20)
            ..lineTo(4, 20)
            ..lineTo(4, 15),
          p,
        );
      case RuoIcon.qrCode:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(3, 3, 7, 7),
            const Radius.circular(1.5),
          ),
          p,
        );
        canvas.drawRect(const Rect.fromLTWH(5.2, 5.2, 2.6, 2.6), fill);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(14, 3, 7, 7),
            const Radius.circular(1.5),
          ),
          p,
        );
        canvas.drawRect(const Rect.fromLTWH(16.2, 5.2, 2.6, 2.6), fill);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(3, 14, 7, 7),
            const Radius.circular(1.5),
          ),
          p,
        );
        canvas.drawRect(const Rect.fromLTWH(5.2, 16.2, 2.6, 2.6), fill);
        canvas.drawRect(const Rect.fromLTWH(14, 14, 3, 3), fill);
        canvas.drawRect(const Rect.fromLTWH(18, 14, 3, 3), fill);
        canvas.drawRect(const Rect.fromLTWH(14, 18, 3, 3), fill);
        canvas.drawRect(const Rect.fromLTWH(18, 18, 3, 3), fill);
        canvas.drawRect(const Rect.fromLTWH(11, 4, 2, 5), fill);
        canvas.drawRect(const Rect.fromLTWH(11, 15, 2, 5), fill);
      case RuoIcon.bell:
        // Lucide / Apple SF Symbols bell geometry
        final bellBody = Path()
          ..moveTo(6, 8)
          ..arcToPoint(
            const Offset(18, 8),
            radius: const Radius.circular(6),
            clockwise: true,
          )
          ..cubicTo(18, 14.5, 21, 17, 21, 17)
          ..lineTo(3, 17)
          ..cubicTo(3, 17, 6, 14.5, 6, 8)
          ..close();
        canvas.drawPath(bellBody, p);

        final clapper = Path()
          ..moveTo(10.3, 20)
          ..arcToPoint(
            const Offset(13.7, 20),
            radius: const Radius.circular(2),
            clockwise: false,
          );
        canvas.drawPath(clapper, p);
      case RuoIcon.clock:
        canvas.drawCircle(const Offset(12, 12), 8.5, p);
        canvas.drawLine(const Offset(12, 12), const Offset(12, 7.5), p);
        canvas.drawLine(const Offset(12, 12), const Offset(15.5, 12), p);
      case RuoIcon.inventory:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(4, 3, 16, 18),
            const Radius.circular(2),
          ),
          p,
        );
        canvas.drawLine(const Offset(8, 8), const Offset(16, 8), p);
        canvas.drawLine(const Offset(8, 12), const Offset(16, 12), p);
        canvas.drawLine(const Offset(8, 16), const Offset(13, 16), p);
      case RuoIcon.user:
        canvas.drawCircle(const Offset(12, 8), 4, p);
        canvas.drawPath(
          Path()
            ..moveTo(4.5, 20)
            ..quadraticBezierTo(5, 14.5, 12, 14.5)
            ..quadraticBezierTo(19, 14.5, 19.5, 20),
          p,
        );
      case RuoIcon.camera:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(3, 7, 18, 13),
            const Radius.circular(2.5),
          ),
          p,
        );
        canvas.drawPath(
          Path()
            ..moveTo(8, 7)
            ..lineTo(9.5, 4.5)
            ..lineTo(14.5, 4.5)
            ..lineTo(16, 7),
          p,
        );
        canvas.drawCircle(const Offset(12, 13.5), 3.5, p);
      case RuoIcon.menu:
        canvas.drawLine(const Offset(4, 6), const Offset(20, 6), p);
        canvas.drawLine(const Offset(4, 12), const Offset(20, 12), p);
        canvas.drawLine(const Offset(4, 18), const Offset(20, 18), p);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _RuoIconPainter old) =>
      old.icon != icon || old.color != color || old.strokeWidth != strokeWidth;
}

/// Bespoke Architectural Logo Mark ported from `client/src/components/common/RuoLogo.jsx`.
class RuoLogoMark extends StatelessWidget {
  const RuoLogoMark({super.key, this.size = 44});
  final double size;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: size,
    height: size,
    child: const CustomPaint(painter: _RuoLogoPainter()),
  );
}

class _RuoLogoPainter extends CustomPainter {
  const _RuoLogoPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 56.0;
    canvas.save();
    canvas.scale(s, s);

    const frame = Rect.fromLTWH(3, 3, 50, 50);
    final framePaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [RuoTokens.brand900, RuoTokens.brand600, RuoTokens.brand500],
      ).createShader(frame);
    canvas.drawRRect(
      RRect.fromRectAndRadius(frame, const Radius.circular(14)),
      framePaint,
    );

    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.14)
      ..strokeWidth = 1;
    canvas.drawLine(const Offset(10, 28), const Offset(46, 28), gridPaint);
    canvas.drawLine(const Offset(28, 10), const Offset(28, 46), gridPaint);
    canvas.drawLine(const Offset(19, 10), const Offset(19, 46), gridPaint);
    canvas.drawLine(const Offset(37, 10), const Offset(37, 46), gridPaint);

    // 1. Left vertical pillar of "R"
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(15, 13, 8, 30),
        const Radius.circular(2),
      ),
      Paint()..color = Colors.white,
    );

    // 2. Top architectural arch of "R"
    final arch = Path()
      ..moveTo(23, 13)
      ..lineTo(33, 13)
      ..arcToPoint(
        const Offset(33, 29),
        radius: const Radius.circular(8),
        clockwise: true,
      )
      ..lineTo(23, 29)
      ..lineTo(23, 23.5)
      ..lineTo(32.5, 23.5)
      ..arcToPoint(
        const Offset(32.5, 18.5),
        radius: const Radius.circular(2.5),
        clockwise: false,
      )
      ..lineTo(23, 18.5)
      ..close();
    canvas.drawPath(
      arch,
      Paint()..color = Colors.white.withValues(alpha: 0.96),
    );

    // 3. Cantilever diagonal strut in golden amber
    final strut = Path()
      ..moveTo(27.5, 26.5)
      ..lineTo(38.5, 42.2)
      ..lineTo(31.2, 42.2)
      ..lineTo(22.5, 30.5)
      ..lineTo(22.5, 26.5)
      ..close();
    final goldPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.bottomLeft,
        end: Alignment.topRight,
        colors: [Color(0xFFFDE68A), Color(0xFFFEF08A)],
      ).createShader(const Rect.fromLTWH(22, 20, 18, 24));
    canvas.drawPath(strut, goldPaint);
    canvas.drawCircle(const Offset(32.5, 21), 2.5, goldPaint);

    // 4. CAD corner chamfer
    final cornerPaint = Paint()
      ..color = const Color(0xFFFDBA74)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(45, 11), const Offset(45, 17), cornerPaint);
    canvas.drawLine(const Offset(45, 11), const Offset(39, 11), cornerPaint);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
