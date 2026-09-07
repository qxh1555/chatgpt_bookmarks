/* Shared text-anchor logic. No network access, DOM modifications or dependencies. */
(() => {
  "use strict";
  function conversationKey(pathname) {
    const match = pathname.match(/\/(c|share)\/([^/]+)/);
    return match ? `${match[1]}:${match[2]}` : null;
  }

  function quoteAt(text, start, end) {
    start = Math.max(0, Math.min(start, text.length));
    end = Math.min(text.length, Math.max(start + 1, end), start + 240);
    return {
      exact: text.slice(start, end),
      prefix: text.slice(Math.max(0, start - 64), start),
      suffix: text.slice(end, end + 64),
      start
    };
  }

  function commonSuffix(a, b) {
    let n = 0;
    while (n < a.length && n < b.length && a[a.length - n - 1] === b[b.length - n - 1]) n++;
    return n;
  }
  function commonPrefix(a, b) {
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    return n;
  }

  // Map whitespace-normalized offsets back to the original DOM text.
  function normalize(text) {
    let value = "";
    const offsets = [];
    for (let i = 0; i < text.length; i++) {
      const char = /\s/u.test(text[i]) ? " " : text[i];
      if (char === " " && value.endsWith(" ")) continue;
      value += char;
      offsets.push(i);
    }
    offsets.push(text.length);
    return { value, offsets };
  }

  function locate(text, anchor) {
    if (!anchor?.exact?.trim()) return null;
    let source = text;
    let exact = anchor.exact;
    let prefix = anchor.prefix || "";
    let suffix = anchor.suffix || "";
    let offsets = null;
    if (!source.includes(exact)) {
      const normalized = normalize(source);
      source = normalized.value;
      offsets = normalized.offsets;
      exact = normalize(exact).value;
      prefix = normalize(prefix).value;
      suffix = normalize(suffix).value;
    }
    let best = null;
    for (let pos = source.indexOf(exact); pos !== -1; pos = source.indexOf(exact, pos + 1)) {
      const context = commonSuffix(source.slice(0, pos), prefix) +
        commonPrefix(source.slice(pos + exact.length), suffix);
      const start = offsets ? offsets[pos] : pos;
      const end = offsets ? offsets[pos + exact.length] : pos + exact.length;
      const distance = Math.abs(start - anchor.start);
      if (!best || context > best.context || (context === best.context && distance < best.distance)) {
        best = { start, end, context, distance };
      }
    }
    return best;
  }

  const api = { conversationKey, quoteAt, locate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.ConversationBookmarkAnchors = api;
})();
