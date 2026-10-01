/** Android-only design canvas. Display-size changes must scale the whole
 * composition, not choose a different layout for individual elements. */
export const NATIVE_FRAME = { width: 390, height: 844 } as const;

export interface FrameInsets { top: number; right: number; bottom: number; left: number }

export function fitNativeFrame(width: number, height: number, insets: FrameInsets) {
  const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const left = safe(insets.left), top = safe(insets.top);
  const availableWidth = Math.max(0, safe(width) - left - safe(insets.right));
  const availableHeight = Math.max(0, safe(height) - top - safe(insets.bottom));
  const scale = Math.min(availableWidth / NATIVE_FRAME.width, availableHeight / NATIVE_FRAME.height);
  return {
    scale,
    x: left + (availableWidth - NATIVE_FRAME.width * scale) / 2,
    y: top + (availableHeight - NATIVE_FRAME.height * scale) / 2,
  };
}

/** No OS density/fontScale override, viewport-meta rewrite, or storage change. */
export function trackNativeFrame(enabled: boolean): void {
  if (!enabled || !CSS.supports("container-type", "size")) return;
  const app = document.getElementById("app")!;
  app.classList.add("is-native-frame");
  app.style.setProperty("--app-h", `${NATIVE_FRAME.height}px`);
  app.style.setProperty("--layout-vw", `${NATIVE_FRAME.width / 100}px`);
  app.style.setProperty("--layout-vh", `${NATIVE_FRAME.height / 100}px`);
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
