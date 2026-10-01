/** Layout only: preserve the designed board size, but cap it at the room left
 * after the actual HUD, picture, progress and stage label have been laid out. */
export function availableBoardSide(bottom: number, top: number, footer: number): number {
  return Math.max(0, Math.floor(bottom - top - footer));
}

/** DOMRects include the canvas transform; CSS lengths/scrollTop do not. */
function canvasScale(screen: HTMLElement): number {
  // Responsive logical dimensions can be fractional. offsetHeight rounds to
  // integers and would change the board cap across otherwise identical OS
  // densities; computed height keeps the CSS/physical conversion precise.
  const height = parseFloat(getComputedStyle(screen).height);
  return height > 0 ? screen.getBoundingClientRect().height / height : 1;
}

/** Keep the original menu composition when it fits. On a short screen use
 * natural flow and scrolling, never smaller artwork or a different type size. */
export function trackTitleLayout(screen: HTMLElement): void {
  const logo = screen.querySelector<HTMLElement>(".brand-mark")!;
  const modes = screen.querySelector<HTMLElement>(".mode-list")!;
  const prompt = screen.querySelector<HTMLElement>(".title-music-prompt")!;
  const slot = screen.querySelector<HTMLElement>(".title-music-slot")!;
  let frame = 0;
  let hidden = screen.classList.contains("hidden");
  const measure = (): void => {
    frame = 0;
    if (!screen.getClientRects().length) return;
    const scroll = screen.scrollTop;
    // Read the original layout in the same frame, before applying the fallback.
    screen.classList.remove("is-space-limited");
    const hasPrompt = !prompt.classList.contains("hidden");
    const css = getComputedStyle(screen);
    const scale = canvasScale(screen);
    // title.css includes the original decorative bottom spacing in its padding;
    // the prompt may occupy that spacing, but never the OS safe area.
    const layoutHeight = parseFloat(getComputedStyle(screen.parentElement!).getPropertyValue("--layout-vh")) * 100 || innerHeight;
    const safeBottom = Math.max(0, (parseFloat(css.paddingBottom) || 0) - Math.max(layoutHeight * .025, 14));
    const bottom = screen.getBoundingClientRect().bottom - safeBottom * scale;
    const overlaps = logo.getBoundingClientRect().bottom > modes.getBoundingClientRect().top;
    const promptOverflows = hasPrompt && prompt.getBoundingClientRect().bottom + screen.scrollTop * scale > bottom;
    screen.style.setProperty("--music-footer-space", hasPrompt ? `${slot.getBoundingClientRect().height / scale + 2}px` : "0px");
    screen.classList.toggle("is-space-limited", overlaps || promptOverflows);
    screen.scrollTop = scroll;
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(measure); };
  const observer = new ResizeObserver(schedule);
  observer.observe(screen);
  observer.observe(logo);
  new MutationObserver(() => {
    const next = screen.classList.contains("hidden");
    if (hidden !== next) { hidden = next; schedule(); }
  }).observe(screen, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(schedule).observe(prompt, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  window.addEventListener("resize", schedule);
  document.fonts.addEventListener("loadingdone", schedule);
  void document.fonts.ready.then(schedule);
  schedule();
}

export function trackPickLayout(screen: HTMLElement, board: HTMLElement): void {
  let frame = 0;
  const measure = (): void => {
    frame = 0;
    if (!screen.getClientRects().length) return;
    const style = getComputedStyle(screen);
    const scale = canvasScale(screen);
    const gap = parseFloat(style.rowGap) || 0;
    let footer = 0;
    for (let item = board.nextElementSibling; item; item = item.nextElementSibling) {
      const css = getComputedStyle(item);
      if (css.display === "none" || css.position === "absolute" || css.position === "fixed") continue;
      footer += item.getBoundingClientRect().height / scale + gap
        + (parseFloat(css.marginTop) || 0) + (parseFloat(css.marginBottom) || 0);
    }
    const bottom = screen.getBoundingClientRect().bottom / scale - (parseFloat(style.paddingBottom) || 0);
    // scrollTop keeps a user's scroll from changing the board's size.
    const top = board.getBoundingClientRect().top / scale + screen.scrollTop;
    const room = availableBoardSide(bottom, top, footer);
    // Extremely short windows can scroll instead of collapsing the cards.
    const next = room > 0 ? `${room}px` : "100vw";
    if (screen.style.getPropertyValue("--board-fit") !== next) screen.style.setProperty("--board-fit", next);
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(measure); };
  const observer = new ResizeObserver(schedule);
  observer.observe(screen);
  for (const item of screen.children) {
    if (item !== board) observer.observe(item);
  }
  // Switching modes and native inset injection need not resize the viewport.
  new MutationObserver(schedule).observe(screen, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  window.addEventListener("resize", schedule);
  document.fonts.addEventListener("loadingdone", schedule);
  void document.fonts.ready.then(schedule);
  schedule();
}
