def init_scripts():
    s1 = """
    (() => {
      const orig = navigator.requestMediaKeySystemAccess;
      if (orig) {
        navigator.requestMediaKeySystemAccess = function() {
          try { window.__drmDetected = true; } catch(e) {}
          return orig.apply(this, arguments);
        };
      }
    })();
    """
    s2 = """
    (() => {
      const orig = window.fetch;
      if (orig) {
        window.fetch = function() { return orig.apply(this, arguments); };
      }
      const X = window.XMLHttpRequest;
      if (X) {
        const open = X.prototype.open;
        X.prototype.open = function() { return open.apply(this, arguments); };
      }
    })();
    """
    return [s1, s2]
