package vn.ruo.ruo_mobile

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var pendingResult: MethodChannel.Result? = null
    private var pendingCsv: String? = null
    private var printView: WebView? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "vn.ruo.mobile/documents").setMethodCallHandler { call, result ->
            when (call.method) {
                "saveCsv" -> {
                    if (pendingResult != null) { result.error("BUSY", "Một tệp đang chờ lưu.", null); return@setMethodCallHandler }
                    pendingCsv = call.argument<String>("content") ?: ""
                    pendingResult = result
                    val name = (call.argument<String>("filename") ?: "ruo-report.csv").replace(Regex("[^a-zA-Z0-9._-]"), "_")
                    try {
                        startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "text/csv"
                            putExtra(Intent.EXTRA_TITLE, name)
                        }, 301)
                    } catch (e: Exception) { pendingResult = null; pendingCsv = null; result.error("SAVE", "Không mở được trình lưu tệp.", null) }
                }
                "printHtml" -> {
                    val html = call.argument<String>("content") ?: ""
                    val title = call.argument<String>("title") ?: "Báo cáo Ruo"
                    printView?.destroy()
                    val view = WebView(this)
                    printView = view
                    view.settings.javaScriptEnabled = false
                    view.settings.allowFileAccess = false
                    view.settings.allowContentAccess = false
                    view.settings.blockNetworkLoads = true
                    var completed = false
                    view.webViewClient = object : WebViewClient() {
                        override fun onPageFinished(webView: WebView, url: String) {
                            if (completed) return
                            completed = true
                            try {
                                val manager = getSystemService(PRINT_SERVICE) as PrintManager
                                manager.print(title, webView.createPrintDocumentAdapter(title), null)
                                result.success(null)
                            } catch (e: Exception) { result.error("PRINT", "Không mở được trình in PDF.", null) }
                        }
                    }
                    view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
                }
                else -> result.notImplemented()
            }
        }
    }

    @Deprecated("Platform result callback retained for the document picker")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 301) return
        val result = pendingResult ?: return
        val csv = pendingCsv ?: ""
        pendingResult = null
        pendingCsv = null
        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            result.error("CANCELLED", "Đã hủy lưu tệp.", null)
            return
        }
        try {
            val stream = contentResolver.openOutputStream(data.data!!)
                ?: throw IllegalStateException("No output stream")
            stream.use { it.write(csv.toByteArray(Charsets.UTF_8)) }
            result.success(null)
        } catch (e: Exception) { result.error("SAVE", "Không thể ghi tệp vào vị trí đã chọn.", null) }
    }
    override fun onDestroy() {
        pendingResult?.error("CANCELLED", "Màn hình đã đóng.", null)
        pendingResult = null
        printView?.destroy()
        printView = null
        super.onDestroy()
    }
}
