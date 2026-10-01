// Runs the actual MainActivity source against narrow JVM lifecycle doubles.
// This checks callback policy, not an Android/WebView engine or real device.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (!process.env.JAVA_HOME) throw new Error('Set JAVA_HOME to a JDK before running this check.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'taptotest-text-zoom-'));
const fixtures = {
  'android/os/Bundle.java': 'package android.os; public class Bundle {}',
  'android/util/DisplayMetrics.java': 'package android.util; public class DisplayMetrics { public float density = 3; }',
  'android/content/res/Resources.java': 'package android.content.res; public class Resources { public android.util.DisplayMetrics metrics = new android.util.DisplayMetrics(); public android.util.DisplayMetrics getDisplayMetrics() { return metrics; } }',
  'android/content/res/Configuration.java': 'package android.content.res; public class Configuration { public float fontScale = 2; public int densityDpi = 440; }',
  'android/view/ViewTreeObserver.java': 'package android.view; public class ViewTreeObserver { public Runnable listener; public void addOnGlobalLayoutListener(Runnable value) { listener = value; } }',
  'android/view/View.java': `package android.view;
    public class View {
      public int width = 1080, height = 2340, x = 19, y = 23;
      public View root = this;
      public ViewTreeObserver observer = new ViewTreeObserver();
      public int getWidth() { return width; }
      public int getHeight() { return height; }
      public View getRootView() { return root; }
      public void getLocationInWindow(int[] value) { value[0] = x; value[1] = y; }
      public ViewTreeObserver getViewTreeObserver() { return observer; }
    }`,
  'androidx/core/graphics/Insets.java': 'package androidx.core.graphics; public class Insets { public int left, top, right, bottom; public Insets(int l,int t,int r,int b) { left=l;top=t;right=r;bottom=b; } }',
  'androidx/core/view/WindowInsetsCompat.java': `package androidx.core.view;
    public class WindowInsetsCompat {
      public androidx.core.graphics.Insets bars;
      public WindowInsetsCompat(androidx.core.graphics.Insets value) { bars = value; }
      public androidx.core.graphics.Insets getInsets(int type) { return bars; }
      public static class Type { public static int systemBars() { return 1; } public static int displayCutout() { return 2; } }
    }`,
  'androidx/core/view/ViewCompat.java': 'package androidx.core.view; public class ViewCompat { public static WindowInsetsCompat insets; public static WindowInsetsCompat getRootWindowInsets(android.view.View view) { return insets; } }',
  'android/webkit/WebSettings.java': 'package android.webkit; public class WebSettings { public int zoom = 200; public void setTextZoom(int value) { zoom = value; } }',
  'android/webkit/WebView.java': `package android.webkit;
    public class WebView extends android.view.View {
      public WebSettings settings = new WebSettings();
      public java.util.List<Runnable> tasks = new java.util.ArrayList<>();
      public java.util.List<String> scripts = new java.util.ArrayList<>();
      public WebSettings getSettings() { return settings; }
      public boolean post(Runnable task) { tasks.add(task); return true; }
      public void drain() { for (Runnable task : java.util.List.copyOf(tasks)) task.run(); tasks.clear(); }
      public void evaluateJavascript(String script, Object callback) { scripts.add(script); }
    }`,
  'com/getcapacitor/WebViewListener.java': 'package com.getcapacitor; public class WebViewListener { public void onPageLoaded(android.webkit.WebView view) {} }',
  'com/getcapacitor/Bridge.java': 'package com.getcapacitor; public class Bridge { public android.webkit.WebView view = new android.webkit.WebView(); public java.util.List<WebViewListener> listeners = new java.util.ArrayList<>(); public android.webkit.WebView getWebView() { return view; } public void addWebViewListener(WebViewListener listener) { listeners.add(listener); } }',
  'com/getcapacitor/BridgeActivity.java': `package com.getcapacitor;
    public class BridgeActivity {
      protected Bridge bridge;
      protected android.content.res.Resources resources = new android.content.res.Resources();
      public android.content.res.Resources getResources() { return resources; }
      protected void onCreate(android.os.Bundle state) { bridge = new Bridge(); }
      public void onResume() { if (bridge != null && bridge.view != null) bridge.view.settings.zoom = 180; }
      public void onConfigurationChanged(android.content.res.Configuration config) { if (bridge != null && bridge.view != null) bridge.view.settings.zoom = (int)(100 * config.fontScale); }
    }`,
  'io/github/junyyyong/taptotest/LifecycleCheck.java': `package io.github.junyyyong.taptotest;
    import android.content.res.Configuration;
    import android.webkit.WebView;
    import com.getcapacitor.Bridge;
    public class LifecycleCheck extends MainActivity {
      static void check(boolean ok, String message) { if (!ok) throw new AssertionError(message); }
      public static void main(String[] args) {
        LifecycleCheck a = new LifecycleCheck();
        // BridgeActivity's missing-WebView path must be tolerated.
        a.onResume(); a.onConfigurationChanged(new Configuration());
        a.onCreate(null);
        check(a.bridge.view.settings.zoom == 100, "create zoom");
        WebView view = a.bridge.view;
        view.settings.zoom = 250; view.drain();
        check(view.settings.zoom == 100, "posted create zoom");
        for (float scale : new float[]{1, 1.3f, 2, 3}) {
          Configuration c = new Configuration(); c.fontScale = scale;
          a.onConfigurationChanged(c);
          check(view.settings.zoom == 100, "configuration zoom");
          check(c.fontScale == scale && c.densityDpi == 440, "OS settings untouched");
          view.settings.zoom = 230; view.drain();
          check(view.settings.zoom == 100, "posted configuration zoom");
          a.onResume(); check(view.settings.zoom == 100, "resume zoom"); view.drain();
        }
        a.onResume(); a.bridge = new Bridge(); view.settings.zoom = 170; view.drain();
        check(view.settings.zoom == 170 && a.bridge.view.settings.zoom == 200, "stale view callback ignored");
        a.bridge.view = null; a.onResume(); a.onConfigurationChanged(new Configuration());
        LifecycleCheck b = new LifecycleCheck(); b.onCreate(null);
        WebView measured = b.bridge.view;
        measured.root = new android.view.View();
        androidx.core.view.ViewCompat.insets = new androidx.core.view.WindowInsetsCompat(new androidx.core.graphics.Insets(0,72,0,144));
        measured.drain();
        check(measured.scripts.size() == 1, "measured overlap published");
        check(measured.scripts.get(0).contains("'--android-game-inset-top','24.0000px'") && measured.scripts.get(0).contains("'--android-game-inset-bottom','48.0000px'"), "physical overlap converted by density");
        measured.observer.listener.run();
        check(measured.scripts.size() == 1, "unchanged overlap deduplicated");
        measured.y += 72; measured.height -= 216;
        measured.observer.listener.run();
        check(measured.scripts.size() == 2 && measured.scripts.get(1).contains("'--android-game-inset-top','0.0000px'") && measured.scripts.get(1).contains("'--android-game-inset-bottom','0.0000px'"), "native padding is not counted twice");
        b.bridge.listeners.get(0).onPageLoaded(measured);
        check(measured.scripts.size() == 3, "page reload republishes current overlap");
        measured.height = 0; measured.observer.listener.run();
        check(measured.scripts.size() == 3, "unmeasured view ignored");
        System.out.println("PASS: create, resume, configuration at font scales 1/1.3/2/3, deferred reapply, null bridge/view, stale callback, OS settings unchanged.");
        System.out.println("PASS: measured system-bar overlap, density conversion, native padding, duplicate suppression, page reload, zero-height view.");
        System.out.println("LIMIT: JVM doubles only; no real Android WebView or device accessibility test.");
      }
    }`,
};
for (const [name, source] of Object.entries(fixtures)) {
  const file = path.join(temp, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, source);
}
const main = 'io/github/junyyyong/taptotest/MainActivity.java';
fs.copyFileSync(path.join(root, 'android/app/src/main/java', main), path.join(temp, main));
execFileSync(path.join(process.env.JAVA_HOME, 'bin/javac'), ['-d', path.join(temp, 'classes'), ...Object.keys(fixtures).map(name => path.join(temp, name)), path.join(temp, main)], { stdio: 'inherit' });
execFileSync(path.join(process.env.JAVA_HOME, 'bin/java'), ['-cp', path.join(temp, 'classes'), 'io.github.junyyyong.taptotest.LifecycleCheck'], { stdio: 'inherit' });
console.log('Fixture output (temporary): ' + temp);
