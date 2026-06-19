/**
 * Zencom embeddable widget loader.
 *
 * Usage (paste before </body> on any site):
 *   <script
 *     async
 *     src="https://YOUR_DOMAIN/embed.js"
 *     data-zencom-key="pk_xxxxxxxx"
 *   ></script>
 *
 * It injects a floating launcher button and a hidden iframe pointing at
 * /widget?key=PUBLICKEY on the same origin the script was served from. The
 * iframe talks to Convex directly (no Clerk auth) using the public key + a
 * visitor token it manages in its own localStorage. This loader only handles
 * the launcher chrome and open/close, communicating with the iframe via
 * postMessage.
 */
(function () {
  "use strict";

  if (window.__zencomWidgetLoaded) return;
  window.__zencomWidgetLoaded = true;

  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var publicKey =
    (currentScript && currentScript.getAttribute("data-zencom-key")) || "";

  // Derive the widget origin from the script src so the iframe and Convex URL
  // resolution stay on the same deployment.
  var origin = window.location.origin;
  if (currentScript && currentScript.src) {
    try {
      origin = new URL(currentScript.src).origin;
    } catch (err) {
      origin = window.location.origin;
      void err;
    }
  }

  if (!publicKey) {
    console.error("[Zencom] Missing data-zencom-key on the embed script.");
    return;
  }

  var OPEN_WIDTH = 400;
  var OPEN_HEIGHT = 640;
  var isOpen = false;

  // ===== PHASE 4: live config (appearance + proactive), applied once the =====
  // iframe relays it via postMessage("zencom:config"). Defaults mirror the
  // Convex widget-config defaults so the launcher looks right before config
  // arrives. Phase 7 also touches this file — keep edits inside these markers.
  var cfg = {
    primaryColor: "#4f46e5",
    radius: 16,
    marginX: 20,
    marginY: 20,
    launcherPosition: "bottom-right",
    proactiveEnabled: false,
    proactiveDelaySeconds: 8,
    proactiveMessage: "",
  };
  var proactiveTimer = null;
  var proactiveShown = false;
  // ===== END PHASE 4 =====

  // ---- Launcher button -----------------------------------------------------
  var launcher = document.createElement("button");
  launcher.setAttribute("aria-label", "Open chat");
  launcher.type = "button";
  setStyle(launcher, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "56px",
    height: "56px",
    borderRadius: "9999px",
    border: "none",
    cursor: "pointer",
    zIndex: "2147483646",
    background: "#4f46e5",
    color: "#ffffff",
    boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.15s ease, background 0.15s ease",
  });
  launcher.innerHTML = chatIcon();
  launcher.addEventListener("mouseenter", function () {
    launcher.style.transform = "scale(1.05)";
  });
  launcher.addEventListener("mouseleave", function () {
    launcher.style.transform = "scale(1)";
  });

  // ---- Unread badge --------------------------------------------------------
  var badge = document.createElement("span");
  setStyle(badge, {
    position: "fixed",
    bottom: "60px",
    right: "16px",
    minWidth: "20px",
    height: "20px",
    padding: "0 6px",
    borderRadius: "9999px",
    background: "#ef4444",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: "20px",
    textAlign: "center",
    zIndex: "2147483646",
    display: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  });

  // ---- Proactive bubble (Phase 4) -----------------------------------------
  var proactive = document.createElement("div");
  setStyle(proactive, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    maxWidth: "260px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#18181b",
    fontSize: "14px",
    lineHeight: "1.4",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
    zIndex: "2147483645",
    display: "none",
    cursor: "pointer",
  });
  proactive.innerHTML =
    '<span data-zc-msg></span><span aria-hidden="true" ' +
    'style="position:absolute;top:4px;right:8px;color:#a1a1aa;font-size:14px;">×</span>';
  proactive.addEventListener("click", function (e) {
    // The little × dismisses; clicking the body opens the chat.
    var target = e.target;
    if (target && target.getAttribute && target.getAttribute("aria-hidden")) {
      proactive.style.display = "none";
    } else {
      proactive.style.display = "none";
      open();
    }
  });

  // ---- Iframe --------------------------------------------------------------
  var iframe = document.createElement("iframe");
  iframe.title = "Zencom chat";
  iframe.src =
    origin + "/widget?key=" + encodeURIComponent(publicKey);
  iframe.allow = "clipboard-write";
  setStyle(iframe, {
    position: "fixed",
    bottom: "88px",
    right: "20px",
    width: OPEN_WIDTH + "px",
    height: OPEN_HEIGHT + "px",
    maxWidth: "calc(100vw - 40px)",
    maxHeight: "calc(100vh - 120px)",
    border: "none",
    borderRadius: "16px",
    boxShadow: "0 12px 48px rgba(0,0,0,0.32)",
    zIndex: "2147483645",
    display: "none",
    background: "transparent",
    colorScheme: "normal",
  });

  function mount() {
    document.body.appendChild(iframe);
    document.body.appendChild(badge);
    document.body.appendChild(proactive); // Phase 4
    document.body.appendChild(launcher);
  }

  if (document.body) {
    mount();
  } else {
    window.addEventListener("DOMContentLoaded", mount);
  }

  function open() {
    isOpen = true;
    iframe.style.display = "block";
    badge.style.display = "none";
    proactive.style.display = "none"; // Phase 4
    proactiveShown = true; // Phase 4: don't re-nudge after the visitor engaged
    if (proactiveTimer) {
      clearTimeout(proactiveTimer); // Phase 4
      proactiveTimer = null;
    }
    launcher.innerHTML = closeIcon();
    launcher.setAttribute("aria-label", "Close chat");
    post({ type: "zencom:open" });
  }

  function close() {
    isOpen = false;
    iframe.style.display = "none";
    launcher.innerHTML = chatIcon();
    launcher.setAttribute("aria-label", "Open chat");
    post({ type: "zencom:close" });
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  launcher.addEventListener("click", toggle);

  function post(message) {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(message, origin);
    }
  }

  // Messages from the iframe (unread count, request to close, etc.).
  window.addEventListener("message", function (event) {
    if (event.origin !== origin || !event.data || typeof event.data !== "object")
      return;
    var data = event.data;
    if (data.type === "zencom:close") {
      close();
    } else if (data.type === "zencom:open") {
      open();
    } else if (data.type === "zencom:unread") {
      var count = typeof data.count === "number" ? data.count : 0;
      if (!isOpen && count > 0) {
        badge.textContent = count > 9 ? "9+" : String(count);
        badge.style.display = "block";
      } else {
        badge.style.display = "none";
      }
    } else if (data.type === "zencom:config") {
      // ===== PHASE 4: appearance + proactive config relayed from the iframe =====
      applyConfig(data.config || {});
    }
  });

  // ===== PHASE 4: apply appearance + (re)arm the proactive nudge ============
  function applyConfig(next) {
    if (typeof next.primaryColor === "string") cfg.primaryColor = next.primaryColor;
    if (typeof next.radius === "number") cfg.radius = next.radius;
    if (typeof next.marginX === "number") cfg.marginX = next.marginX;
    if (typeof next.marginY === "number") cfg.marginY = next.marginY;
    if (next.launcherPosition === "bottom-left" || next.launcherPosition === "bottom-right")
      cfg.launcherPosition = next.launcherPosition;
    if (typeof next.proactiveEnabled === "boolean")
      cfg.proactiveEnabled = next.proactiveEnabled;
    if (typeof next.proactiveDelaySeconds === "number")
      cfg.proactiveDelaySeconds = next.proactiveDelaySeconds;
    if (typeof next.proactiveMessage === "string")
      cfg.proactiveMessage = next.proactiveMessage;

    var isLeft = cfg.launcherPosition === "bottom-left";
    var side = isLeft ? "left" : "right";
    var otherSide = isLeft ? "right" : "left";

    // Launcher.
    launcher.style.background = cfg.primaryColor;
    launcher.style.bottom = cfg.marginY + "px";
    launcher.style[side] = cfg.marginX + "px";
    launcher.style[otherSide] = "auto";

    // Iframe panel.
    iframe.style.bottom = cfg.marginY + 68 + "px";
    iframe.style[side] = cfg.marginX + "px";
    iframe.style[otherSide] = "auto";
    iframe.style.borderRadius = cfg.radius + "px";

    // Badge follows the launcher side.
    badge.style.bottom = cfg.marginY + 40 + "px";
    badge.style[side] = Math.max(0, cfg.marginX - 4) + "px";
    badge.style[otherSide] = "auto";

    // Proactive bubble side.
    proactive.style.bottom = cfg.marginY + 70 + "px";
    proactive.style[side] = cfg.marginX + "px";
    proactive.style[otherSide] = "auto";

    armProactive();
  }

  function armProactive() {
    if (proactiveTimer) {
      clearTimeout(proactiveTimer);
      proactiveTimer = null;
    }
    if (!cfg.proactiveEnabled || proactiveShown || isOpen) return;
    var delay = Math.max(1, cfg.proactiveDelaySeconds) * 1000;
    proactiveTimer = setTimeout(function () {
      if (!isOpen && !proactiveShown) {
        proactiveShown = true;
        proactive.querySelector("[data-zc-msg]").textContent =
          cfg.proactiveMessage || "👋 Need a hand? We're here.";
        proactive.style.display = "block";
      }
    }, delay);
  }
  // ===== END PHASE 4 =====

  // ---- helpers -------------------------------------------------------------
  function setStyle(el, styles) {
    for (var key in styles) {
      if (Object.prototype.hasOwnProperty.call(styles, key)) {
        el.style[key] = styles[key];
      }
    }
  }

  function chatIcon() {
    return (
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 ' +
      '2-2h14a2 2 0 0 1 2 2z"/></svg>'
    );
  }

  function closeIcon() {
    return (
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/>' +
      '<line x1="6" y1="6" x2="18" y2="18"/></svg>'
    );
  }
})();
