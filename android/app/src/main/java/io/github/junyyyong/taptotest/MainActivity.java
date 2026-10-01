package io.github.junyyyong.taptotest;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private String lastGameInsets = "";
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // BridgeActivity creates its WebView synchronously inside super.onCreate.
        super.onCreate(savedInstanceState);
        applyGameTextZoom();
        // Observe rather than replace Capacitor's WindowInsets listener. Both
        // CSS-inset and native-padding paths remain owned by the framework.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getViewTreeObserver().addOnGlobalLayoutListener(this::publishGameInsets);
            bridge.addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    lastGameInsets = "";
                    publishGameInsets();
                }
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        applyGameTextZoom();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyGameTextZoom();
    }

    private void applyGameTextZoom() {
        if (bridge == null || bridge.getWebView() == null) return;
        WebView webView = bridge.getWebView();
        lastGameInsets = "";
        // Only the app's HTML text is fixed. Do not override OS fontScale,
        // display density, magnification, or the user's device settings.
        webView.getSettings().setTextZoom(100);
        // Reapply after pending WebView configuration work, without touching a
        // replacement view if the bridge was recreated in the meantime.
        webView.post(() -> {
            if (bridge != null && bridge.getWebView() == webView) {
                webView.getSettings().setTextZoom(100);
                publishGameInsets();
            }
        });
    }

    /** Actual system-bar overlap, not a density override or double padding. */
    private void publishGameInsets() {
        if (bridge == null || bridge.getWebView() == null) return;
        WebView webView = bridge.getWebView();
        WindowInsetsCompat windowInsets = ViewCompat.getRootWindowInsets(webView);
        if (windowInsets == null || webView.getWidth() == 0 || webView.getHeight() == 0) return;
        Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        android.view.View root = webView.getRootView();
        int[] webLocation = new int[2], rootLocation = new int[2];
        webView.getLocationInWindow(webLocation);
        root.getLocationInWindow(rootLocation);
        int x = webLocation[0] - rootLocation[0], y = webLocation[1] - rootLocation[1];
        float density = getResources().getDisplayMetrics().density;
        float top = Math.max(0, bars.top - y) / density;
        float left = Math.max(0, bars.left - x) / density;
        float bottom = Math.max(0, y + webView.getHeight() - (root.getHeight() - bars.bottom)) / density;
        float right = Math.max(0, x + webView.getWidth() - (root.getWidth() - bars.right)) / density;
        String values = String.format(Locale.US, "%.4f,%.4f,%.4f,%.4f", top, right, bottom, left);
        if (values.equals(lastGameInsets)) return;
        lastGameInsets = values;
        // Record before page scripts start as well as on resume/resize. The
        // root-style mutation is observed by the app's proportional canvas.
        String script = String.format(Locale.US,
            "(function(){var s=document.documentElement.style;" +
            "s.setProperty('--android-game-inset-top','%.4fpx');" +
            "s.setProperty('--android-game-inset-right','%.4fpx');" +
            "s.setProperty('--android-game-inset-bottom','%.4fpx');" +
            "s.setProperty('--android-game-inset-left','%.4fpx');})();", top, right, bottom, left);
        webView.evaluateJavascript(script, null);
    }
}
