import 'package:flutter/material.dart';

/// Ruo UEMS V3.0 Design Tokens — synchronized with `client/src/styles/tokens.css`.
/// Light: Architectural Studio Slate (#F8FAFC / #FFFFFF) & Solar Terracotta (#EA580C).
/// Dark: Warm Obsidian & Carbon Studio (#0C0A09 / #171412) & Solar Orange (#FB923C).
class RuoTokens {
  const RuoTokens._();

  // Brand Accents (Solar Terracotta & Architectural Flame Orange)
  static const brand900 = Color(0xFF7C2D12);
  static const brand700 = Color(0xFFC2410C);
  static const brand600 = Color(0xFFEA580C);
  static const brand500 = Color(0xFFF97316);
  static const brand400 = Color(0xFFFB923C);
  static const brand100 = Color(0xFFFFEDD5);
  static const brand50 = Color(0xFFFFF7ED);

  // Light Surfaces & Ink
  static const lightBg = Color(0xFFF8FAFC);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightSurfaceSubtle = Color(0xFFF1F5F9);
  static const lightBorderSubtle = Color(0xFFE2E8F0);
  static const lightBorderDefault = Color(0xFFCBD5E1);
  static const lightInkPrimary = Color(0xFF0F172A);
  static const lightInkSecondary = Color(0xFF334155);
  static const lightInkMuted = Color(0xFF64748B);

  // Dark Surfaces & Ink (Warm Obsidian)
  static const darkBg = Color(0xFF0C0A09);
  static const darkSurface = Color(0xFF171412);
  static const darkSurfaceElevated = Color(0xFF211D1A);
  static const darkSurfaceHeader = Color(0xFF1F1A17);
  static const darkBorderSubtle = Color(0xFF2E2723);
  static const darkBorderDefault = Color(0xFF443B35);
  static const darkInkPrimary = Color(0xFFFAFAF9);
  static const darkInkSecondary = Color(0xFFE7E5E4);
  static const darkInkMuted = Color(0xFFA8A29E);

  static ThemeData theme(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final primary = dark ? brand400 : brand600;
    final bg = dark ? darkBg : lightBg;
    final surface = dark ? darkSurface : lightSurface;
    final surfaceAlt = dark ? darkSurfaceElevated : lightSurfaceSubtle;
    final border = dark ? darkBorderDefault : lightBorderDefault;
    final borderSubtle = dark ? darkBorderSubtle : lightBorderSubtle;
    final ink = dark ? darkInkPrimary : lightInkPrimary;
    final inkMuted = dark ? darkInkMuted : lightInkMuted;

    final baseScheme = ColorScheme.fromSeed(
      seedColor: brand600,
      brightness: brightness,
    );
    final scheme = baseScheme.copyWith(
      primary: primary,
      onPrimary: dark ? const Color(0xFF1C0A00) : Colors.white,
      secondary: dark ? brand500 : brand700,
      surface: surface,
      onSurface: ink,
      onSurfaceVariant: inkMuted,
      outline: border,
      outlineVariant: borderSubtle,
      error: dark ? const Color(0xFFFCA5A5) : const Color(0xFFDC2626),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: bg,
      dividerColor: borderSubtle,
      appBarTheme: AppBarTheme(
        backgroundColor: dark ? darkSurfaceHeader : lightSurface,
        foregroundColor: ink,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        shape: Border(bottom: BorderSide(color: borderSubtle, width: 1)),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: const EdgeInsets.symmetric(vertical: 5),
        color: surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: borderSubtle, width: 1),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: dark ? darkSurfaceHeader : lightSurface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: primary.withValues(alpha: dark ? 0.20 : 0.12),
        height: 68,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
            color: selected ? primary : inkMuted,
          );
        }),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: dark ? darkSurfaceElevated : lightSurface,
        labelStyle: TextStyle(color: inkMuted, fontWeight: FontWeight.w600),
        hintStyle: TextStyle(color: inkMuted.withValues(alpha: 0.75)),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: border),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: primary, width: 1.8),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surfaceAlt,
        selectedColor: primary,
        side: BorderSide(color: border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
          color: ink,
        ),
        secondaryLabelStyle: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
          color: dark ? const Color(0xFF1C0A00) : Colors.white,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: brand600,
          foregroundColor: Colors.white,
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: ink,
          minimumSize: const Size(48, 46),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          side: BorderSide(color: border),
          textStyle: const TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: const TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: borderSubtle),
        ),
      ),
    );
  }
}

class StatusTone {
  const StatusTone({
    required this.fg,
    required this.bg,
    required this.border,
    required this.solid,
  });
  final Color fg;
  final Color bg;
  final Color border;
  final Color solid;

  static StatusTone forStatus(String status, Brightness brightness) {
    final dark = brightness == Brightness.dark;
    return switch (status) {
      'available' || 'in_use' || 'resolved' || 'completed' || 'approved' =>
        dark
            ? const StatusTone(
                fg: Color(0xFF6EE7B7),
                bg: Color(0x8C065F46),
                border: Color(0xFF10B981),
                solid: Color(0xFF10B981),
              )
            : const StatusTone(
                fg: Color(0xFF065F46),
                bg: Color(0xFFD1FAE5),
                border: Color(0xFF059669),
                solid: Color(0xFF059669),
              ),
      'maintenance' ||
      'repairing' ||
      'in_progress' ||
      'assigned' ||
      'major' =>
        dark
            ? const StatusTone(
                fg: Color(0xFFFDBA74),
                bg: Color(0x8C7C2D12),
                border: Color(0xFFF97316),
                solid: Color(0xFFEA580C),
              )
            : const StatusTone(
                fg: Color(0xFF9A3412),
                bg: Color(0xFFFFEDD5),
                border: Color(0xFFEA580C),
                solid: Color(0xFFEA580C),
              ),
      'in_stock' || 'pending' || 'awaiting_approval' || 'minor' => dark
          ? const StatusTone(
              fg: Color(0xFFFDE68A),
              bg: Color(0x8C78350F),
              border: Color(0xFFF59E0B),
              solid: Color(0xFFD97706),
            )
          : const StatusTone(
              fg: Color(0xFFB45309),
              bg: Color(0xFFFEF3C7),
              border: Color(0xFFD97706),
              solid: Color(0xFFD97706),
            ),
      'pending_disposal' => dark
          ? const StatusTone(
              fg: Color(0xFFDDD6FE),
              bg: Color(0x8C4C1D95),
              border: Color(0xFF8B5CF6),
              solid: Color(0xFF7C3AED),
            )
          : const StatusTone(
              fg: Color(0xFF5B21B6),
              bg: Color(0xFFEDE9FE),
              border: Color(0xFF7C3AED),
              solid: Color(0xFF7C3AED),
            ),
      'broken' ||
      'reported' ||
      'critical' ||
      'overdue' ||
      'lost' ||
      'rejected' ||
      'unrepairable' =>
        dark
            ? const StatusTone(
                fg: Color(0xFFFCA5A5),
                bg: Color(0x8C7F1D1D),
                border: Color(0xFFEF4444),
                solid: Color(0xFFDC2626),
              )
            : const StatusTone(
                fg: Color(0xFF991B1B),
                bg: Color(0xFFFEE2E2),
                border: Color(0xFFDC2626),
                solid: Color(0xFFDC2626),
              ),
      _ => dark
          ? const StatusTone(
              fg: Color(0xFFE7E5E4),
              bg: Color(0xA644403C),
              border: Color(0xFFA8A29E),
              solid: Color(0xFF78716C),
            )
          : const StatusTone(
              fg: Color(0xFF334155),
              bg: Color(0xFFF1F5F9),
              border: Color(0xFF94A3B8),
              solid: Color(0xFF64748B),
            ),
    };
  }
}

/// Unified 2D Architectural Floor Plan Palette (`--cad-*` in `tokens.css`).
class CadPalette {
  const CadPalette({
    required this.canvasBg,
    required this.shellStroke,
    required this.shellInner,
    required this.windowStroke,
    required this.corridorBg,
    required this.corridorStroke,
    required this.corridorDash,
    required this.corridorInk,
    required this.voidBg,
    required this.voidStroke,
    required this.voidDash,
    required this.wallFill,
    required this.wallStroke,
    required this.stairBg,
    required this.stairLanding,
    required this.stairTread,
    required this.roomBg,
    required this.roomBorder,
    required this.roomAccent,
    required this.roomSelectedBg,
    required this.utilityBg,
    required this.utilityBorder,
    required this.utilityAccent,
    required this.inkPure,
    required this.inkSecondary,
  });

  final Color canvasBg;
  final Color shellStroke;
  final Color shellInner;
  final Color windowStroke;
  final Color corridorBg;
  final Color corridorStroke;
  final Color corridorDash;
  final Color corridorInk;
  final Color voidBg;
  final Color voidStroke;
  final Color voidDash;
  final Color wallFill;
  final Color wallStroke;
  final Color stairBg;
  final Color stairLanding;
  final Color stairTread;
  final Color roomBg;
  final Color roomBorder;
  final Color roomAccent;
  final Color roomSelectedBg;
  final Color utilityBg;
  final Color utilityBorder;
  final Color utilityAccent;
  final Color inkPure;
  final Color inkSecondary;

  static CadPalette of(Brightness brightness) {
    if (brightness == Brightness.dark) {
      return const CadPalette(
        canvasBg: Color(0xFF120F0D),
        shellStroke: Color(0xFFF5F5F4),
        shellInner: Color(0xFF443B35),
        windowStroke: Color(0xFFFB923C),
        corridorBg: Color(0xFF1A1613),
        corridorStroke: Color(0xFF3A312B),
        corridorDash: Color(0x59A8A29E),
        corridorInk: Color(0xFFA8A29E),
        voidBg: Color(0xFF151210),
        voidStroke: Color(0xFF3A312B),
        voidDash: Color(0x73FB923C),
        wallFill: Color(0xFF3A312B),
        wallStroke: Color(0xFF695B52),
        stairBg: Color(0xFF1F1A17),
        stairLanding: Color(0xFF2B2420),
        stairTread: Color(0xFF574C44),
        roomBg: Color(0xFF231E1B),
        roomBorder: Color(0xFF4D4038),
        roomAccent: Color(0xFFFB923C),
        roomSelectedBg: Color(0xFF332218),
        utilityBg: Color(0xFF1B1715),
        utilityBorder: Color(0xFF3A312B),
        utilityAccent: Color(0xFF8C827A),
        inkPure: Color(0xFFFFFFFF),
        inkSecondary: Color(0xFFE7E5E4),
      );
    }
    return const CadPalette(
      canvasBg: Color(0xFFF1F5F9),
      shellStroke: Color(0xFF0F172A),
      shellInner: Color(0xFFCBD5E1),
      windowStroke: Color(0xFFEA580C),
      corridorBg: Color(0xFFE2E8F0),
      corridorStroke: Color(0xFFCBD5E1),
      corridorDash: Color(0x7A64748B),
      corridorInk: Color(0xFF475569),
      voidBg: Color(0xFFF8FAFC),
      voidStroke: Color(0xFFCBD5E1),
      voidDash: Color(0x6BEA580C),
      wallFill: Color(0xFFCBD5E1),
      wallStroke: Color(0xFF64748B),
      stairBg: Color(0xFFF1F5F9),
      stairLanding: Color(0xFFE2E8F0),
      stairTread: Color(0xFF94A3B8),
      roomBg: Color(0xFFFFFFFF),
      roomBorder: Color(0xFFCBD5E1),
      roomAccent: Color(0xFFEA580C),
      roomSelectedBg: Color(0xFFFFF7ED),
      utilityBg: Color(0xFFF8FAFC),
      utilityBorder: Color(0xFFCBD5E1),
      utilityAccent: Color(0xFF64748B),
      inkPure: Color(0xFF0F172A),
      inkSecondary: Color(0xFF334155),
    );
  }
}
