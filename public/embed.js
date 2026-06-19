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
    }
  });

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
