type ToastOpts = { type?: "info" | "success" | "error"; duration?: number };

function ensureContainer() {
  if (typeof document === "undefined") return null;
  let c = document.getElementById("__simple_toast_container");
  if (!c) {
    c = document.createElement("div");
    c.id = "__simple_toast_container";
    Object.assign(c.style, {
      position: "fixed",
      top: "24px",
      right: "24px",
      left: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
      pointerEvents: "none",
      zIndex: "9999",
    });
    document.body.appendChild(c);
  }
  return c;
}

export function showToast(message: string, opts?: ToastOpts) {
  const container = ensureContainer();
  if (!container) return "";
  const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.style.pointerEvents = "auto";
  el.style.margin = "6px 0";
  el.style.padding = "10px 14px";
  el.style.borderRadius = "10px";
  el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
  el.style.maxWidth = "420px";
  el.style.width = "auto";
  el.style.display = "inline-flex";
  el.style.alignItems = "center";
  el.style.gap = "10px";
  el.style.background = "#ffffff";
  el.style.color = "#0f172a";
  el.style.border = "1px solid transparent";

  // subtle green for success (border only)
  if (opts?.type === "success") {
    el.style.border = "1px solid rgba(16, 185, 129, 0.16)"; // subtle green border
  } else if (opts?.type === "error") {
    el.style.background = "#fff1f2";
    el.style.color = "#7f1d1d";
    el.style.border = "1px solid rgba(239, 68, 68, 0.12)";
  } else {
    el.style.background = "#ffffff";
    el.style.border = "1px solid rgba(15, 23, 42, 0.04)";
  }

  // icon
  const iconSpan = document.createElement("span");
  iconSpan.style.display = "inline-flex";
  iconSpan.style.flex = "0 0 auto";
  iconSpan.style.marginLeft = "0";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const strokeColor =
    opts?.type === "success"
      ? "rgba(16,185,129,0.9)"
      : opts?.type === "error"
        ? "rgba(239,68,68,0.9)"
        : "rgba(15,23,42,0.7)";

  if (opts?.type === "success") {
    svg.innerHTML = `<path d="M20 6L9 17l-5-5" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>`;
  } else if (opts?.type === "error") {
    svg.innerHTML = `<circle cx="12" cy="12" r="9" stroke="${strokeColor}" stroke-width="2" fill="none"></circle><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>`;
  } else {
    svg.innerHTML = `<circle cx="12" cy="12" r="9" stroke="${strokeColor}" stroke-width="2" fill="none"></circle><path d="M12 8v4" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="12" cy="16" r="0.5" fill="${strokeColor}"></circle>`;
  }

  iconSpan.appendChild(svg);

  const textSpan = document.createElement("span");
  textSpan.style.flex = "1 1 auto";
  textSpan.style.wordBreak = "break-word";
  textSpan.style.fontSize = "14px";
  textSpan.style.lineHeight = "20px";
  textSpan.textContent = message;

  el.appendChild(iconSpan);
  el.appendChild(textSpan);

  container.appendChild(el);

  const duration = opts?.duration ?? 4000;
  const timer = window.setTimeout(() => {
    try {
      container.removeChild(el);
    } catch {}
  }, duration);

  return id;
}

export function clearToasts() {
  if (typeof document === "undefined") return;
  const c = document.getElementById("__simple_toast_container");
  if (c && c.parentNode) c.parentNode.removeChild(c);
}

export default showToast;
