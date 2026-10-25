// 工具栏图标切换悬浮窗；DNR 剥除目标页 CSP 响应头（放行 content script 对本地 relay 的直连 fetch）

// 工具栏图标点击：切换悬浮窗，成功后剥 CSP
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return
  chrome.tabs.sendMessage(tab.id, { type: 'toggle-panel' }).then(() => {
    allowLocalLlm(tab.id)
  }, () => {
    // 没有 content script（未刷新页面/内部页面），角标提示刷新
    const tabId = tab.id
    chrome.action.setBadgeText({ text: '刷新', tabId })
    chrome.action.setBadgeBackgroundColor({ color: '#d93026', tabId })
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }), 5000)
  })
})

// 对指定 tab 剥除 Content-Security-Policy 响应头（仅该 tab 生效，关 tab 自动清理）
function allowLocalLlm(tabId) {
  chrome.declarativeNetRequest
    .updateSessionRules({
      removeRuleIds: [tabId],
      addRules: [
        {
          id: tabId, // session rule id 与 tabId 一一对应
          priority: 1,
          condition: { tabIds: [tabId], resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'] },
          action: {
            type: 'modifyHeaders',
            responseHeaders: [{ header: 'Content-Security-Policy', operation: 'remove' }],
          },
        },
      ],
    })
    .catch(() => {})
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] }).catch(() => {})
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'open-options') {
    chrome.runtime.openOptionsPage()
  }
  // execute_js CSP 兜底：content script 的 eval 被页面 CSP 拦时走 debugger 注入（不受 CSP 限制）
  if (msg?.type === 'dsh-exec-js' && sender.tab?.id) {
    const target = { tabId: sender.tab.id }
    ;(async () => {
      try {
        await chrome.debugger.attach(target, '1.3')
        const r = await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
          expression: `(async () => { ${msg.code} })()`,
          awaitPromise: true,
          returnByValue: true,
        })
        const ex = r?.exceptionDetails
        sendResponse(
          ex
            ? { ok: false, message: `❌ ${ex.exception?.description || ex.text || '执行异常'}` }
            : { ok: true, message: `✅ Executed JavaScript. Result: ${JSON.stringify(r?.result?.value)}` },
        )
      } catch (e) {
        sendResponse({ ok: false, message: `❌ ${e?.message ?? e}` })
      } finally {
        chrome.debugger.detach(target).catch(() => {})
      }
    })()
    return true
  }
})
