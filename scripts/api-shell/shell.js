// The script of the Xila shell on the API pages. It runs in the page head.
//
// It keeps the site theme and the rustdoc theme in agreement.
// The site (Starlight) stores "light", "dark" or an empty value (follow the
// system) in `starlight-theme`. Rustdoc stores `rustdoc-use-system-theme`
// and `rustdoc-theme`. Rustdoc's storage script reads them synchronously in
// the page head, so this script runs before it. A theme chosen in rustdoc's
// settings is copied back to the site when the visitor leaves the page.
(function () {
  var SITE_KEY = "starlight-theme";
  var DARK_THEMES = ["dark", "ayu"];

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Storage is not available, for example in a private window.
    }
  }

  function siteMode() {
    var value = read(SITE_KEY);
    return value === "light" || value === "dark" ? value : "auto";
  }

  function rustdocMode() {
    if (read("rustdoc-use-system-theme") !== "false") return "auto";
    return DARK_THEMES.indexOf(read("rustdoc-theme")) >= 0 ? "dark" : "light";
  }

  // Change rustdoc only when its mode disagrees with the site, so that a
  // dark rustdoc theme such as "ayu" stays selected on a dark site.
  function siteToRustdoc() {
    var mode = siteMode();
    if (mode === rustdocMode()) return;
    if (mode === "auto") {
      write("rustdoc-use-system-theme", "true");
    } else {
      write("rustdoc-use-system-theme", "false");
      write("rustdoc-theme", mode);
    }
  }

  siteToRustdoc();

  // A page restored from the back-forward cache runs no head script again:
  // rustdoc then reapplies its theme, after this listener.
  addEventListener("pageshow", function (event) {
    if (event.persisted) siteToRustdoc();
  });

  addEventListener("pagehide", function () {
    var mode = rustdocMode();
    write(SITE_KEY, mode === "auto" ? "" : mode);
  });

  // The menu of the bar on small screens closes on a click outside it and
  // on the Escape key, as the menus of the site header do.
  function closeMenu(event) {
    var menu = document.querySelector(".xila-shell-menu[open]");
    if (!menu) return;
    if (event.type === "keydown") {
      if (event.key !== "Escape") return;
      menu.open = false;
      menu.querySelector("summary").focus();
    } else if (!menu.contains(event.target)) {
      menu.open = false;
    }
  }
  addEventListener("pointerdown", closeMenu);
  addEventListener("keydown", closeMenu);
})();
