(() => {
  "use strict";
  if (document.getElementById("cgb-extension-root")) return;
  const A = globalThis.ConversationBookmarkAnchors;
  const PREFIX = "cgb:v1:";
  const EXCLUDED = 'button, input, textarea, select, script, style, svg, [aria-hidden="true"], [hidden], [contenteditable="true"]';
  let conversation = A.conversationKey(location.pathname);
  let bookmarks = [];
  let selected = null;
  let panelOpen = false;
  let loadVersion = 0;
  let toastTimer;
  let selectionTimer;
  let disposed = false;
  let jumpVersion = 0;

  const host = document.createElement("div");
  host.id = "cgb-extension-root";
  host.style.cssText = "all:initial!important;position:fixed!important;inset:0!important;width:0!important;height:0!important;z-index:2147483646!important;pointer-events:none!important;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { color-scheme: light dark; }
      * { box-sizing: border-box; }
      .ui { --bg:#fff; --fg:#202925; --muted:#69746e; --line:#e5eae6; --soft:#f4f7f4; --accent:#20634a; --tint:#eaf4ec; color:var(--fg); font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif; pointer-events:auto; }
      button,input { font:inherit; }
      button { cursor:pointer; color:inherit; }
      button:focus-visible,input:focus-visible { outline:2px solid #4b936f; outline-offset:3px; }
      button:disabled { cursor:default; opacity:.45; }
      [hidden] { display:none!important; }
      .launcher { position:fixed; right:24px; bottom:100px; display:flex; align-items:center; gap:9px; padding:11px 16px; border:1px solid var(--line); border-radius:30px; background:var(--bg); box-shadow:0 4px 22px #00000014; }
      .launcher svg { width:17px; height:19px; }
      .badge { min-width:20px; padding:1px 5px; font-size:11px; border-radius:20px; background:var(--tint); color:var(--accent); }
      .panel { position:fixed; right:24px; bottom:158px; width:340px; max-width:calc(100vw - 32px); max-height:calc(100dvh - 190px); display:flex; flex-direction:column; background:var(--bg); border:1px solid var(--line); border-radius:18px; box-shadow:0 12px 50px #00000020; overflow:hidden; }
      header { padding:19px 20px 14px; display:flex; align-items:flex-start; justify-content:space-between; }
      h2 { margin:0; font-size:17px; font-weight:650; letter-spacing:.3px; }
      .subtitle { margin:4px 0 0; font-size:12px; color:var(--muted); }
      .icon { background:transparent; border:0; border-radius:6px; padding:3px 7px; color:var(--muted); font-size:18px; }
      .icon:hover { background:var(--soft); }
      .add { margin:0 20px 15px; border:0; border-radius:9px; padding:10px; background:var(--accent); color:#fff; font-weight:550; }
      .list { overflow:auto; overscroll-behavior:contain; padding:0 12px; min-height:0; }
      .empty { padding:25px 14px 32px; text-align:center; color:var(--muted); }
      .empty strong { display:block; margin-bottom:8px; color:var(--fg); font-size:14px; font-weight:550; }
      .empty p { margin:0; font-size:12px; line-height:1.8; }
      .item { padding:4px 0 9px; border-top:1px solid var(--line); }
      .jump { display:block; text-align:left; width:100%; padding:12px 9px 5px; background:transparent; border:0; border-radius:9px; }
      .jump:hover { background:var(--soft); }
      .title { display:block; font-weight:600; overflow-wrap:anywhere; }
      .quote { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:12px; color:var(--muted); margin-top:5px; overflow-wrap:anywhere; white-space:pre-wrap; }
      .meta { display:flex; align-items:center; gap:4px; padding:3px 9px 0; }
      .time { flex:1; font-size:11px; color:var(--muted); }
      .small { border:0; border-radius:5px; background:transparent; padding:3px 5px; font-size:11px; color:var(--muted); }
      .small:hover { color:var(--fg); background:var(--soft); }
      .delete:hover { color:#b34036; }
      .rename { display:flex; gap:8px; padding:10px 9px 4px; }
      input { width:100%; min-width:0; border:1px solid var(--line); border-radius:5px; background:var(--soft); color:var(--fg); padding:6px; }
      footer { border-top:1px solid var(--line); margin-top:10px; padding:12px 20px; font-size:11px; color:var(--muted); }
      .selection { position:fixed; padding:8px 13px; border:1px solid var(--line); border-radius:9px; box-shadow:0 4px 20px #0002; background:var(--accent); color:white; font-size:12px; white-space:nowrap; }
      .toast { position:fixed; bottom:35px; left:50%; transform:translateX(-50%); max-width:calc(100vw - 32px); width:max-content; padding:11px 17px; border-radius:10px; background:var(--fg); color:var(--bg); box-shadow:0 4px 20px #0002; font-size:13px; }
      .flash { position:fixed; background:#f8ca4b66; border-bottom:2px solid #dda927; border-radius:3px; pointer-events:none; }
      @media (prefers-color-scheme:dark) { .ui { --bg:#242826; --fg:#edf1ee; --muted:#a7b1aa; --line:#3b433e; --soft:#303732; --accent:#367e5c; --tint:#304f3b; } .badge { color:#b5dec4; } }
      @media (max-width:600px) { .launcher { right:16px; bottom:88px; } .panel { right:16px; bottom:144px; max-height:calc(100dvh - 170px); } }
    </style>
    <button class="ui launcher" aria-label="打开对话书签" aria-expanded="false" aria-controls="cgb-panel">
      <svg viewBox="0 0 20 22" fill="none" aria-hidden="true"><path d="M5 2h10a1 1 0 0 1 1 1v17l-6-4-6 4V3a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
      <span>书签</span><span class="badge">0</span>
    </button>
    <section id="cgb-panel" class="ui panel" aria-label="当前对话书签" hidden>
      <header><div><h2>对话书签</h2><p class="subtitle">给阅读留一个落点</p></div><button class="icon close" aria-label="关闭书签">×</button></header>
      <button class="add">＋ 标记当前阅读位置</button>
      <div class="list"></div>
      <footer>仅保存在本机 · Alt + Shift + B 添加书签<br><a class="privacy-link" target="_blank" rel="noopener noreferrer" style="color:inherit;text-underline-offset:3px">隐私政策</a></footer>
    </section>
    <button class="ui selection" hidden>＋ 添加书签</button>
    <div class="ui toast" role="status" aria-live="polite" hidden></div>
    <div class="flashes"></div>
  `;
  document.documentElement.append(host);
  const $ = (selector) => shadow.querySelector(selector);
  const launcher = $(".launcher");
  const panel = $(".panel");
  const selectionButton = $(".selection");
  $(".privacy-link").href = chrome.runtime.getURL("privacy.html");
  $(".privacy-link").addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.sendMessage({ type: "conversation-bookmarks:privacy" }).catch(error);
  });

  function notify(message) {
    const toast = $(".toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
  }
  function error() {
    notify("书签操作失败，请刷新页面后重试。");
  }
  function setOpen(open) {
    panelOpen = open;
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "收起对话书签" : "打开对话书签");
  }
  function messages() {
    const roots = [...document.querySelectorAll('[data-message-author-role="assistant"], [data-message-author-role="user"]')];
    return roots.length ? roots : [...document.querySelectorAll('main [data-testid^="conversation-turn-"]')];
  }
  function textMap(root) {
    const nodes = [];
    let text = "";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => node.parentElement?.closest(EXCLUDED) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      nodes.push({ node, start: text.length, end: text.length + node.length });
      text += node.data;
    }
    return { text, nodes };
  }
  function rangeFor(map, start, end) {
    const first = map.nodes.find((entry) => entry.end > start);
    const last = map.nodes.find((entry) => entry.end >= end && entry.start < end);
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    return range;
  }
  function identity(root, index, text) {
    const message = root.closest("[data-message-id]") || root.querySelector("[data-message-id]");
    return {
      messageId: message?.getAttribute("data-message-id") || null,
      turnId: root.closest('[data-testid^="conversation-turn-"]')?.id || null,
      role: root.getAttribute("data-message-author-role") || "message",
      index,
      lead: text.slice(0, 96)
    };
  }
  function anchorFromRange(range) {
    const roots = messages();
    const root = roots.find((item) => item.contains(range.startContainer) && item.contains(range.endContainer));
    if (!root) return null;
    const map = textMap(root);
    // Compare DOM boundary points so selections spanning inline markup remain exact.
    let start = null;
    let end = null;
    for (const entry of map.nodes) {
      if (!range.intersectsNode(entry.node)) continue;
      const from = entry.node === range.startContainer ? range.startOffset : 0;
      const to = entry.node === range.endContainer ? range.endOffset : entry.node.length;
      if (from === to) continue;
      if (start === null) start = entry.start + from;
      end = entry.start + to;
    }
    if (start === null || !map.text.slice(start, end).trim()) return null;
    return { ...A.quoteAt(map.text, start, end), ...identity(root, roots.indexOf(root), map.text) };
  }

  function captureSelection() {
    if (disposed || shadow.activeElement?.tagName === "INPUT") return;
    syncRoute();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      selected = null;
      selectionButton.hidden = true;
      return;
    }
    const range = selection.getRangeAt(0);
    const anchor = anchorFromRange(range);
    selected = anchor ? { conversation, anchor } : null;
    selectionButton.hidden = !anchor || !conversation;
    if (selectionButton.hidden) return;
    const rect = range.getBoundingClientRect();
    selectionButton.style.left = `${Math.max(12, Math.min(innerWidth - 130, rect.left + rect.width / 2 - 55))}px`;
    selectionButton.style.top = `${Math.max(12, Math.min(innerHeight - 48, rect.bottom + 8))}px`;
  }

  function viewportAnchor() {
    const roots = messages();
    let best = null;
    const preferredY = Math.min(180, innerHeight * 0.28);
    for (let i = 0; i < roots.length; i++) {
      const root = roots[i];
      const rect = root.getBoundingClientRect();
      if (rect.bottom < 70 || rect.top > innerHeight - 100 || !rect.width) continue;
      const map = textMap(root);
      for (const entry of map.nodes) {
        if (!entry.node.data.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(entry.node);
        const rects = [...range.getClientRects()];
        for (const line of rects) {
          if (line.bottom < 70 || line.top > innerHeight - 100 || !line.width) continue;
          const distance = Math.abs(line.top - preferredY);
          if (best && distance >= best.distance) continue;
          let offset = 0;
          const x = Math.max(1, line.left + Math.min(8, line.width / 2));
          const y = Math.min(innerHeight - 1, line.top + line.height / 2);
          const caret = document.caretPositionFromPoint?.(x, y);
          const legacy = !caret && document.caretRangeFromPoint?.(x, y);
          if (caret?.offsetNode === entry.node) offset = caret.offset;
          else if (legacy?.startContainer === entry.node) offset = legacy.startOffset;
          const start = entry.start + offset;
          const anchor = A.quoteAt(map.text, start, Math.min(entry.end, start + 120));
          if (anchor.exact.trim()) best = { distance, anchor: { ...anchor, ...identity(root, i, map.text) } };
        }
      }
    }
    return best?.anchor || null;
  }

  async function load() {
    const version = ++loadVersion;
    const key = conversation;
    try {
      const values = await chrome.storage.local.get(null);
      if (disposed || version !== loadVersion || key !== conversation) return;
      bookmarks = Object.entries(values)
        .filter(([storageKey, item]) => storageKey.startsWith(PREFIX) && item?.conversation === key && item?.anchor?.exact && item?.id)
        .map(([, item]) => item).sort((a, b) => a.createdAt - b.createdAt);
      render();
    } catch { error(); }
  }
  function storageKey(bookmark) { return PREFIX + bookmark.id; }
  async function saveBookmark() {
    syncRoute();
    if (!conversation) { notify("请先打开一段已保存的对话，再添加书签。"); return; }
    const anchor = selected?.conversation === conversation ? selected.anchor : viewportAnchor();
    if (!anchor) { notify("请选中对话中的一小段文字，再添加书签。"); return; }
    const existing = bookmarks.find((item) => item.anchor.messageId === anchor.messageId && item.anchor.index === anchor.index && item.anchor.start === anchor.start && item.anchor.exact === anchor.exact);
    if (existing) { setOpen(true); notify("这个位置已经有书签了。"); return; }
    const bookmark = {
      id: crypto.randomUUID(), conversation, anchor,
      title: anchor.exact.replace(/\s+/g, " ").trim().slice(0, 36),
      createdAt: Date.now()
    };
    try {
      await chrome.storage.local.set({ [storageKey(bookmark)]: bookmark });
      selectionButton.hidden = true;
      selected = null;
      window.getSelection()?.removeAllRanges();
      await load();
      notify("已添加书签，可从右侧「书签」返回。");
    } catch { error(); }
  }

  function resolve(anchor) {
    const roots = messages();
    const candidates = roots.map((root, index) => {
      const message = root.closest("[data-message-id]") || root.querySelector("[data-message-id]");
      return { root, index, id: message?.getAttribute("data-message-id"), turn: root.closest('[data-testid^="conversation-turn-"]')?.id };
    });
    const stable = candidates.filter((item) => anchor.messageId ? item.id === anchor.messageId : anchor.turnId && item.turn === anchor.turnId);
    const matches = [];
    for (const item of stable.length ? stable : candidates) {
      const role = item.root.getAttribute("data-message-author-role") || "message";
      if (role !== anchor.role) continue;
      const map = textMap(item.root);
      const found = A.locate(map.text, anchor);
      if (!found) continue;
      const leadMatches = map.text.startsWith(anchor.lead);
      if (!stable.length && !leadMatches && found.context < 24 && anchor.exact.length < 48) continue;
      matches.push({ ...item, map, found, score: found.context + (leadMatches ? 128 : 0) });
    }
    matches.sort((a, b) => b.score - a.score || Math.abs(a.index - anchor.index) - Math.abs(b.index - anchor.index));
    if (!matches.length) return null;
    const first = matches[0];
    // Without a stable identity, an ambiguous quote must not jump to a different answer.
    if (!stable.length && matches.length > 1 && first.score === matches[1].score && first.index !== anchor.index) return null;
    return rangeFor(first.map, first.found.start, first.found.end);
  }

  function reveal(range) {
    let element = range.startContainer.parentElement;
    while (element) {
      const style = getComputedStyle(element);
      if (element.scrollHeight > element.clientHeight && /(auto|scroll)/.test(style.overflowY)) {
        const box = element.getBoundingClientRect();
        const top = range.getBoundingClientRect().top;
        element.scrollBy({ top: top - box.top - Math.min(160, element.clientHeight * .28), behavior: "instant" });
      }
      element = element.parentElement;
    }
    const rect = range.getBoundingClientRect();
    if (rect.top < 70 || rect.top > innerHeight * .65) {
      window.scrollBy({ top: rect.top - Math.min(160, innerHeight * .28), behavior: "instant" });
    }
    requestAnimationFrame(() => {
      const flashes = $(".flashes");
      flashes.replaceChildren();
      for (const rect of [...range.getClientRects()].slice(0, 40)) {
        if (rect.bottom < 0 || rect.top > innerHeight) continue;
        const flash = document.createElement("div");
        flash.className = "flash";
        flash.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
        flashes.append(flash);
      }
      setTimeout(() => flashes.replaceChildren(), 1800);
    });
  }
  async function jump(bookmark) {
    syncRoute();
    if (bookmark.conversation !== conversation) return;
    const version = ++jumpVersion;
    let range = resolve(bookmark.anchor);
    if (!range) {
      notify("正在查找书签位置…");
      // Let a route transition or a streaming render finish; never use stale pixel offsets.
      for (let attempt = 0; attempt < 4 && !range; attempt++) {
        await new Promise((done) => setTimeout(done, 400));
        syncRoute();
        if (version !== jumpVersion || bookmark.conversation !== conversation) return;
        range = resolve(bookmark.anchor);
      }
    }
    if (!range) { notify("未找到原文：请先加载较早的消息；原文也可能已被编辑或切换分支。"); return; }
    clearTimeout(toastTimer);
    $(".toast").hidden = true;
    setOpen(false);
    reveal(range);
  }

  function rename(bookmark, row) {
    if (row.querySelector("form")) return;
    const form = document.createElement("form");
    form.className = "rename";
    const input = document.createElement("input");
    input.value = bookmark.title;
    input.maxLength = 80;
    input.setAttribute("aria-label", "书签名称");
    const button = document.createElement("button");
    button.className = "small";
    button.textContent = "保存";
    form.append(input, button);
    row.prepend(form);
    input.focus();
    input.select();
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.stopPropagation(); form.remove(); }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = input.value.trim();
      if (!title) { input.focus(); return; }
      try {
        // Re-read before saving so another tab's deletion is not resurrected.
        const key = storageKey(bookmark);
        const current = (await chrome.storage.local.get(key))[key];
        if (!current) { await load(); return; }
        await chrome.storage.local.set({ [key]: { ...current, title } });
        await load();
      } catch { error(); }
    });
  }
  function render() {
    $(".badge").textContent = String(bookmarks.length);
    $(".add").disabled = !conversation;
    const list = $(".list");
    list.replaceChildren();
    if (!bookmarks.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      const title = document.createElement("strong");
      title.textContent = conversation ? "从这里，接着读" : "先打开一段对话";
      const help = document.createElement("p");
      help.textContent = conversation ? "选中文字，点击「添加书签」。\n也可以用上方按钮，记住当前阅读位置。" : "发送消息并保存对话后，就可以标记位置。";
      help.style.whiteSpace = "pre-line";
      empty.append(title, help);
      list.append(empty);
    }
    for (const bookmark of bookmarks) {
      const row = document.createElement("div");
      row.className = "item";
      const button = document.createElement("button");
      button.className = "jump";
      button.title = "跳转到此书签";
      const title = document.createElement("span");
      title.className = "title";
      title.textContent = bookmark.title;
      const quote = document.createElement("span");
      quote.className = "quote";
      quote.textContent = bookmark.anchor.exact;
      button.append(title, quote);
      button.addEventListener("click", () => jump(bookmark));
      const meta = document.createElement("div");
      meta.className = "meta";
      const date = document.createElement("span");
      date.className = "time";
      date.textContent = new Date(bookmark.createdAt).toLocaleString("zh-CN", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" });
      const edit = document.createElement("button");
      edit.className = "small";
      edit.textContent = "重命名";
      edit.setAttribute("aria-label", `重命名书签：${bookmark.title}`);
      edit.addEventListener("click", () => rename(bookmark, row));
      const remove = document.createElement("button");
      remove.className = "small delete";
      remove.textContent = "删除";
      remove.setAttribute("aria-label", `删除书签：${bookmark.title}`);
      remove.addEventListener("click", async () => {
        try { await chrome.storage.local.remove(storageKey(bookmark)); await load(); }
        catch { error(); }
      });
      meta.append(date, edit, remove);
      row.append(button, meta);
      list.append(row);
    }
  }

  function syncRoute() {
    const next = A.conversationKey(location.pathname);
    if (next === conversation) return;
    conversation = next;
    jumpVersion++;
    selected = null;
    selectionButton.hidden = true;
    bookmarks = [];
    $(".flashes").replaceChildren();
    render();
    load();
  }
  launcher.addEventListener("click", () => { syncRoute(); setOpen(!panelOpen); });
  $(".close").addEventListener("click", () => { setOpen(false); launcher.focus(); });
  $(".add").addEventListener("click", saveBookmark);
  selectionButton.addEventListener("click", saveBookmark);
  shadow.addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) event.preventDefault();
  });
  document.addEventListener("selectionchange", () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(captureSelection, 120);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { setOpen(false); selectionButton.hidden = true; }
    if (event.altKey && event.shiftKey && event.code === "KeyB" && !event.ctrlKey && !event.metaKey && !event.repeat) {
      if (event.target.closest?.('input,textarea,[contenteditable="true"]') || shadow.activeElement?.tagName === "INPUT") return;
      event.preventDefault();
      captureSelection();
      saveBookmark();
    }
  });
  document.addEventListener("scroll", () => {
    selectionButton.hidden = true;
    $(".flashes").replaceChildren();
  }, { capture:true, passive:true });
  window.addEventListener("resize", () => { selectionButton.hidden = true; $(".flashes").replaceChildren(); });
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "conversation-bookmarks:toggle") { syncRoute(); setOpen(!panelOpen); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && Object.keys(changes).some((key) => key.startsWith(PREFIX))) load();
  });
  const routeTimer = setInterval(() => {
    if (!chrome.runtime?.id) { disposed = true; clearInterval(routeTimer); host.remove(); return; }
    syncRoute();
  }, 700);
  render();
  load();
})();
