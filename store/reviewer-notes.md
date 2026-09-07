# 审核测试说明 / Reviewer instructions

版本：1.0.1

本扩展无需自己的账号、订阅、API Key 或付费功能。已保存的 ChatGPT 对话通常需要用户登录 ChatGPT；没有提供或共享他人的账号凭据。

1. 安装扩展，在 Chrome 中打开 https://chatgpt.com 并使用自己的可用账号进入一段已保存的聊天。
2. 可使用无个人信息的测试问题：「请用中文分 10 段解释有效阅读的方法，每段至少 100 字。」等待完成；确认地址中出现 `/c/`。
3. 在同一条回答里选中一句话，点击选区附近「＋ 添加书签」。
4. 打开右下角「书签」，验证新条目、重命名和删除。
5. 在回复末尾或新增一条提问后，点击之前的书签，确认跳回原文并高亮。
6. 刷新页面，确认书签仍在；切换到另一对话，确认各自列表独立。
7. 不选中文字，使用「标记当前阅读位置」或 Alt + Shift + B；输入框内该快捷键不触发。
8. 从面板的「隐私政策」链接查看随包提供的政策。所有定位与存储均在本机，扩展无网络上传。

临时对话、新聊天尚未形成持久地址、跨多条消息的选区不支持创建持久书签。原文被编辑/移除/切换分支，或者早期消息尚未载入时，扩展可能提示未找到原文，不会仅按旧页面像素位置盲跳。

English: Install the extension, open a saved ChatGPT conversation using your own account, select text within one message and click “添加书签” (Add bookmark). Open “书签” (Bookmarks) at the bottom right, rename a bookmark, scroll away and click it to return to the highlighted passage. Reload to verify persistence and switch conversations to verify isolation. No extension-specific account or payment is required. No reviewer credentials are supplied. Data stays in local extension storage. Temporary/unsaved chats and text that has been removed or is not loaded are not supported.

## 验证记录

自动化测试在独立配置中加载真实扩展，使用本地模拟对话验证核心交互。真实登录会话的完整人工回归仍需在可操作的已登录浏览器中完成；不得将模拟测试声称为真实 ChatGPT 登录会话测试。
