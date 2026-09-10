type SectionDescription = {
  id: string;
  rect: { x: number; y: number; width: number; height: number };
  text: string;
};

/** Install the inert, origin-bound bridge used by the builder's live picker. */
export function installAnnotationBridge(): void {
  if (window.parent === window) return;

  let embedderOrigin: string;
  try {
    embedderOrigin = new URL(document.referrer).origin;
  } catch {
    return;
  }
  if (!embedderOrigin || embedderOrigin === "null") return;

  let enabled = false;
  let outline: HTMLDivElement | null = null;

  const sectionAt = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLElement>("[data-section]") : null;

  const describe = (element: HTMLElement): SectionDescription => {
    const rect = element.getBoundingClientRect();
    return {
      id: element.dataset.section ?? "",
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      text: (element.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120),
    };
  };

  const sections = () => Array.from(document.querySelectorAll<HTMLElement>("[data-section]"))
    .map(describe).filter((entry) => entry.id);

  const send = (type: string, payload: object) =>
    window.parent.postMessage({ type, ...payload }, embedderOrigin);

  const getOutline = () => {
    if (outline) return outline;
    outline = document.createElement("div");
    outline.dataset.ionOutline = "";
    outline.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #2563eb;border-radius:4px;background:rgba(37,99,235,.08);display:none";
    document.body.appendChild(outline);
    return outline;
  };

  document.addEventListener("mousemove", (event) => {
    if (!enabled) return;
    const element = sectionAt(event.target);
    const box = getOutline();
    if (!element) { box.style.display = "none"; return; }
    const rect = element.getBoundingClientRect();
    Object.assign(box.style, { display: "block", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  }, true);

  document.addEventListener("click", (event) => {
    if (!enabled) return;
    const element = sectionAt(event.target);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    send("ion:section:click", describe(element));
  }, true);

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== embedderOrigin) return;
    const data = event.data as { type?: unknown } | null;
    if (!data || typeof data !== "object") return;
    if (data.type === "ion:ping") {
      send("ion:pong", { sections: sections().map((entry) => entry.id) });
    } else if (data.type === "ion:annotate:enable") {
      enabled = true;
      document.documentElement.style.cursor = "crosshair";
      send("ion:sections", { sections: sections() });
    } else if (data.type === "ion:annotate:disable") {
      enabled = false;
      document.documentElement.style.cursor = "";
      if (outline) outline.style.display = "none";
    }
  });
}

