const { test } = require('node:test');
const assert = require('node:assert/strict');
const { conversationKey, quoteAt, locate } = require('../anchors.js');

test('conversation identity survives project/GPT prefixes and ignores query strings', () => {
  assert.equal(conversationKey('/c/abc'), 'c:abc');
  assert.equal(conversationKey('/g/g-123/project/c/abc'), 'c:abc');
  assert.equal(conversationKey('/share/abc'), 'share:abc');
  assert.equal(conversationKey('/'), null);
  assert.equal(conversationKey('/g/g-123'), null);
});

test('an anchor survives new content inserted before and after the selected passage', () => {
  const text = '上文介绍。这里是需要记住的位置。后文解释。';
  const start = text.indexOf('这里');
  const anchor = quoteAt(text, start, start + 12);
  const changed = '新插入的开头。' + text + '继续生成的内容。';
  const result = locate(changed, anchor);
  assert.equal(changed.slice(result.start, result.end), anchor.exact);
  assert.equal(result.start, changed.indexOf('这里'));
});

test('context disambiguates identical quotes even when their old position moves', () => {
  const text = '第一部分：重点。第二部分：重点。第三部分结束。';
  const start = text.lastIndexOf('重点');
  const anchor = quoteAt(text, start, start + 2);
  const changed = '插入'.repeat(100) + text;
  assert.equal(locate(changed, anchor).start, changed.lastIndexOf('重点'));
});

test('whitespace changes return valid offsets in the actual text', () => {
  const anchor = quoteAt('before alpha beta after', 7, 17);
  const changed = 'before alpha\n  \t beta after';
  const result = locate(changed, anchor);
  assert.equal(changed.slice(result.start, result.end), 'alpha\n  \t beta');
});

test('deleted or edited original text does not fall back to a stale position', () => {
  const anchor = quoteAt('开头，原文片段，结尾', 3, 7);
  assert.equal(locate('开头，完全不同，结尾', anchor), null);
});

test('blank anchors cannot match everything; large selections are capped', () => {
  assert.equal(locate('anything', {exact:'  '}), null);
  assert.equal(quoteAt('中'.repeat(1000), 10, 900).exact.length, 240);
});

test('emoji and mixed-script selections preserve DOM UTF-16 offsets', () => {
  const text = '开头📖书签 hello 世界😊结尾';
  const start = text.indexOf('📖');
  const anchor = quoteAt(text, start, text.indexOf('结尾'));
  const result = locate('追加' + text, anchor);
  assert.equal(('追加' + text).slice(result.start, result.end), anchor.exact);
});
