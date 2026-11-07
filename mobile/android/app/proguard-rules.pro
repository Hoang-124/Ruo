# Keep ML Kit Code Scanner internal classes from being stripped or aggressively optimized by R8
-keep class com.google.android.gms.internal.mlkit_code_scanner.** { *; }
-keep class com.google.mlkit.vision.codescanner.** { *; }
-keep class com.google.mlkit.vision.barcode.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode_bundled.** { *; }
-keepclassmembers class * extends com.google.android.gms.internal.mlkit_vision_barcode_bundled.zzeh { <fields>; }
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.**

# Mobile Scanner
-keep class dev.steenbakker.mobile_scanner.** { *; }
-dontwarn dev.steenbakker.mobile_scanner.**
