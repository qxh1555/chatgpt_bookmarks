const copyButton = document.getElementById('copy-address');
copyButton.addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText('chrome://extensions');
    copyButton.textContent = '已复制';
    status.textContent = '在 Chrome 地址栏粘贴并打开。';
  } catch {
    status.textContent = '请手动复制上方地址，在 Chrome 地址栏打开。';
  }
});
