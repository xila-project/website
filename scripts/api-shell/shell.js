// The script that the build adds to every rustdoc page, in the page head.
//
// A direct visit to an API page is sent to the frame page of the site, which
// shows the page under the site header. Inside the frame, the page keeps the
// address bar and the title of the wrapper in agreement with its own URL, and
// keeps the rustdoc theme in agreement with the site theme.
//
// The site (Starlight) stores "light", "dark" or an empty value (follow the
// system) in `starlight-theme`. Rustdoc stores `rustdoc-use-system-theme` and
// `rustdoc-theme`. Rustdoc's storage script reads them synchronously in the
// page head, so this script runs before it. The site and the frame are on the
// same origin, so a theme change on the site reaches this page as a storage
// event, and a theme chosen in the rustdoc settings is copied back to the
// site when the page is left.
(function () {
  var API_ROOT = "/api/"; // keep in sync with scripts/api-shell.mjs
  var FRAME_PAGE = "/reference/api/"; // keep in sync with scripts/reference-path.mjs
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

  // The path of this page under /api/, for example "host/xila/index.html".
  // The browser normalises location.pathname; the checks stay so that a
  // change in the serving setup cannot point the wrapper elsewhere.
  function apiPath() {
    if (!location.pathname.startsWith(API_ROOT)) return null;
    var path = location.pathname.slice(API_ROOT.length);
    var decoded;
    try {
      decoded = decodeURIComponent(path);
    } catch (error) {
      return null;
    }
    if (!/^(host|guest)\//.test(decoded)) return null;
    if (/(^|\/)\.\.(\/|$)/.test(decoded)) return null;
    return path;
  }

  // The URL of the frame page for this page, with the fragment inside the
  // path parameter: /reference/api/?path=host/xila/index.html#method.spawn
  function frameUrl(path) {
    var url = new URL(FRAME_PAGE, location.origin);
    url.searchParams.set("path", path + location.hash);
    return url;
  }

  // The frame page only: a page of the site that frames an API page for
  // another reason keeps its own URL and title.
  function framePageParent() {
    try {
      return parent.location.pathname === FRAME_PAGE;
    } catch (error) {
      return false; // The parent is on another origin.
    }
  }

  var path = apiPath();
  if (window.top === window.self) {
    // Not framed: show this page in the frame page of the site instead.
    if (path !== null) location.replace(frameUrl(path));
  } else if (path !== null && framePageParent()) {
    // Framed. The frame records its own history entries, so Back and Forward
    // step through the API pages inside the frame, and every load re-syncs
    // the wrapper. The wrapper therefore only mirrors the current position
    // with replaceState: reload and sharing of the wrapper URL keep the
    // position, without adding entries to the history of the site.
    function sync() {
      try {
        parent.history.replaceState(null, "", frameUrl(path));
        parent.document.title = document.title;
      } catch (error) {
        // The wrapper is on another origin: nothing to synchronise.
      }
    }
    sync();
    addEventListener("hashchange", sync);
    addEventListener("pageshow", sync);

    // A link that leaves the API, for example to the standard library
    // documentation, opens in the top window: in the frame, the address bar
    // would keep the last API page.
    addEventListener(
      "click",
      function (event) {
        var link = event.target.closest && event.target.closest("a[href]");
        if (!link || link.target) return;
        if (
          link.origin !== location.origin ||
          !link.pathname.startsWith(API_ROOT)
        )
          link.target = "_top";
      },
      true,
    );
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

  // Applies the stored rustdoc theme to the page without a reload. The
  // storage script of rustdoc defines window.switchTheme.
  function applyRustdocTheme() {
    if (typeof window.switchTheme !== "function") return;
    if (read("rustdoc-use-system-theme") !== "false") {
      var dark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      window.switchTheme(dark ? "dark" : "light", false);
    } else {
      window.switchTheme(read("rustdoc-theme") || "light", false);
    }
  }

  siteToRustdoc();

  // A page restored from the back-forward cache runs no head script again:
  // rustdoc then reapplies its theme, after this listener.
  addEventListener("pageshow", function (event) {
    if (event.persisted) siteToRustdoc();
  });

  // The theme toggle of the site header writes `starlight-theme`; this frame
  // receives it as a storage event, because both are on the same origin.
  addEventListener("storage", function (event) {
    if (event.key === null || event.key === SITE_KEY) {
      siteToRustdoc();
      applyRustdocTheme();
    }
  });

  addEventListener("pagehide", function () {
    var mode = rustdocMode();
    write(SITE_KEY, mode === "auto" ? "" : mode);
  });
})();
