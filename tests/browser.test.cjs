/* End-to-end tests use an isolated browser profile and a local ChatGPT-shaped fixture.
 * No requests reach ChatGPT, and no existing browser profile is opened.
 * Set PLAYWRIGHT_MODULE_PATH and BROWSER_EXECUTABLE if needed.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.html'), 'utf8');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cgb-test-'));

(async () => {
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    channel: 'chromium', headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    viewport: { width:1280, height:800 },
    args: process.env.EXTENSION_CDP === '1'
      ? ['--enable-unsafe-extension-debugging']
      : [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  const errors = [];
  try {
    await context.route('https://chatgpt.com/**', (route) => route.fulfill({contentType:'text/html', body:fixture}));
    const page = await context.newPage();
    if (process.env.EXTENSION_CDP === '1') {
      const cdp = await context.browser().newBrowserCDPSession();
      await cdp.send('Extensions.loadUnpacked', {path:root});
      await cdp.detach();
    }
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('https://chatgpt.com/c/test-a');
    const ui = page.locator('#cgb-extension-root');
    await ui.waitFor({state:'attached', timeout:15000});
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout:10000});
    console.log('PASS: real unpacked extension loaded:', worker.url());
    let capturedSelection = false;
    if (process.env.CAPTURE_STORE === '1') fs.mkdirSync(path.join(root,'store','screenshots'),{recursive:true});

    async function selectTarget(target = '#target') {
      await page.locator(target).evaluate((element) => {
        element.scrollIntoView({block:'center'});
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      await ui.locator('.selection').waitFor({state:'visible'});
      if (process.env.CAPTURE_STORE === '1' && !capturedSelection) {
        await page.screenshot({path:path.join(root,'store','screenshots','01-add-bookmark.png')});
        capturedSelection = true;
      }
      await ui.locator('.selection').click();
    }
    await selectTarget();
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.badge').textContent === '1');
    await ui.locator('.launcher').click();
    assert.equal(await ui.locator('.item').count(), 1);
    assert.match(await ui.locator('.quote').textContent(), /你真正读到的那句话/);
    console.log('PASS: selected text across inline formatting saved');

    await ui.getByRole('button', {name:/重命名书签/}).click();
    await ui.getByRole('textbox', {name:'书签名称'}).fill('读到这里 · 定位方法');
    await ui.getByRole('button', {name:'保存', exact:true}).click();
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.title')?.textContent === '读到这里 · 定位方法');
    await page.reload();
    await ui.locator('.launcher').click();
    await ui.getByRole('button', {name:/读到这里 · 定位方法/}).first().waitFor();
    assert.equal(await ui.locator('.title').textContent(), '读到这里 · 定位方法');
    console.log('PASS: bookmark and custom name survive refresh');

    await page.evaluate(() => {
      const extra = document.createElement('p');
      extra.style.height = '800px';
      extra.textContent = '追加的前文使原来的像素位置发生变化。';
      document.querySelector('#target').before(extra);
      document.querySelector('main').scrollTop = 100000;
    });
    await ui.locator('.jump').click();
    await page.waitForFunction(() => {
      const rect = document.querySelector('#target').getBoundingClientRect();
      return rect.top > 65 && rect.top < 350;
    });
    console.log('PASS: exact jump in nested scroll container after content shifts');

    await ui.locator('.launcher').click();
    await page.screenshot({path:path.join(root,'tests','preview.png')});
    if (process.env.CAPTURE_STORE === '1') await page.screenshot({path:path.join(root,'store','screenshots','02-return-to-passage.png')});
    const privacyOpened = context.waitForEvent('page');
    await ui.locator('.privacy-link').click();
    const privacy = await privacyOpened;
    await privacy.waitForLoadState();
    assert.match(privacy.url(), /chrome-extension:\/\/[^/]+\/privacy\.html$/);
    assert.equal(await privacy.getByRole('heading', {name:'隐私政策',exact:true}).count(), 1);
    await privacy.close();
    console.log('PASS: packaged privacy policy opens from the extension');
    await page.emulateMedia({colorScheme:'dark'});
    await page.screenshot({path:path.join(root,'tests','preview-dark.png')});
    await page.emulateMedia({colorScheme:'light'});

    await page.evaluate(() => history.pushState({}, '', '/c/test-b'));
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.badge').textContent === '0');
    await selectTarget('#ending');
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.badge').textContent === '1');
    await page.evaluate(() => history.pushState({}, '', '/c/test-a'));
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.title')?.textContent === '读到这里 · 定位方法');
    console.log('PASS: SPA navigation keeps each conversation separate');

    const second = await context.newPage();
    await second.goto('https://chatgpt.com/c/test-a');
    await second.locator('#cgb-extension-root .launcher').click();
    await second.locator('#cgb-extension-root .title').waitFor();
    await ui.getByRole('button', {name:/删除书签/}).click();
    await second.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.badge').textContent === '0');
    await second.close();
    console.log('PASS: deletion propagates to another tab');

    await page.locator('#target').evaluate((element) => element.scrollIntoView({block:'center'}));
    await page.keyboard.press('Alt+Shift+B');
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.badge').textContent === '1');
    console.log('PASS: keyboard shortcut bookmarks current viewport without a selection');

    await ui.locator('.delete').click();
    await selectTarget();
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.badge').textContent === '1');
    await page.locator('#target').evaluate((element) => { element.textContent = '原来的内容已经被编辑删除。'; });
    await ui.locator('.jump').click();
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.toast').textContent.includes('未找到原文'));
    console.log('PASS: missing original text shows a useful message');

    await page.evaluate(() => history.pushState({}, '', '/'));
    await page.waitForFunction(() => document.querySelector('#cgb-extension-root').shadowRoot.querySelector('.add').disabled);
    assert.equal(await ui.locator('.item').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: unsaved chats are guarded; no page errors');
  } finally {
    await context.close();
    const tempRoot = path.resolve(os.tmpdir()) + path.sep;
    const resolvedProfile = path.resolve(profile);
    if (resolvedProfile.startsWith(tempRoot) && path.basename(resolvedProfile).startsWith('cgb-test-')) {
      fs.rmSync(resolvedProfile, {recursive:true, force:true});
    }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
