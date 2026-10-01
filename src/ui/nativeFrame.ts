/** Normalize Android display density, but let the canvas follow the window's
 * aspect ratio. 390×844 is a reference, not a fixed portrait rectangle. */
export const NATIVE_FRAME = { width: 390, height: 844, minHeight: 640 } as const;

export interface FrameInsets { top: number; right: number; bottom: number; left: number }

export function fitNativeFrame(width: number, height: number, insets: FrameInsets) {
  const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const left = safe(insets.left), top = safe(insets.top);
  const availableWidth = Math.max(0, safe(width) - left - safe(insets.right));
  const availableHeight = Math.max(0, safe(height) - top - safe(insets.bottom));
  // A short/wide window gains logical width instead of clipping the column or
  // making 7×7 tiles too small. Density cancels out of both logical dimensions.
  const scale = Math.min(availableWidth / NATIVE_FRAME.width, availableHeight / NATIVE_FRAME.minHeight);
  return {
    scale,
    x: left,
    y: top,
    width: scale > 0 ? availableWidth / scale : 0,
    height: scale > 0 ? availableHeight / scale : 0,
    insets: {
      top: scale > 0 ? top / scale : 0,
      right: scale > 0 ? safe(insets.right) / scale : 0,
      bottom: scale > 0 ? safe(insets.bottom) / scale : 0,
      left: scale > 0 ? left / scale : 0,
    },
  };
}

/** No OS density/fontScale override, viewport-meta rewrite, or storage change. */
export function trackNativeFrame(enabled: boolean): void {
  if (!enabled || !CSS.supports("container-type", "size")) return;
  const app = document.getElementById("app")!;
  app.classList.add("is-native-frame");
  let frame = 0;
  const measure = (): void => {
    frame = 0;
    const viewport = window.visualViewport;
    if (viewport && viewport.scale > 1.01) return;
    const css = getComputedStyle(document.documentElement);
    const inset = (side: string) => {
      // MainActivity reports actual overlap with this WebView. This also
      // covers older SystemBars paths that publish zero before native padding.
      const measured = parseFloat(css.getPropertyValue(`--android-game-inset-${side}`));
      return Number.isFinite(measured) ? measured : parseFloat(css.getPropertyValue(`--app-safe-${side}`)) || 0;
    };
    const fit = fitNativeFrame(viewport?.width ?? innerWidth, viewport?.height ?? innerHeight, {
      top: inset("top"), right: inset("right"), bottom: inset("bottom"), left: inset("left"),
    });
    app.style.setProperty("--frame-scale", String(fit.scale));
    app.style.setProperty("--frame-left", `${fit.x}px`);
    app.style.setProperty("--frame-top", `${fit.y}px`);
    app.style.setProperty("--frame-width", `${fit.width}px`);
    app.style.setProperty("--frame-height", `${fit.height}px`);
    app.style.setProperty("--app-h", `${fit.height}px`);
    app.style.setProperty("--layout-vw", `${fit.width / 100}px`);
    app.style.setProperty("--layout-vh", `${fit.height / 100}px`);
    for (const side of ["top", "right", "bottom", "left"] as const) {
      app.style.setProperty(`--frame-safe-${side}`, `${fit.insets[side]}px`);
    }
    app.style.setProperty("--frame-full-width", `${fit.width + fit.insets.left + fit.insets.right}px`);
    app.style.setProperty("--frame-full-height", `${fit.height + fit.insets.top + fit.insets.bottom}px`);
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(measure); };
  // Capacitor can inject native insets after the first page render, including
  // zero when native padding already owns that side. Never combine both paths.
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  new ResizeObserver(schedule).observe(document.body);
  window.addEventListener("resize", schedule);
  window.addEventListener("pageshow", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  measure();
}
