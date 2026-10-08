const APP_URL = chrome.runtime.getURL('src/app/index.html')
const READ_MENU_ID = 'read-in-lingomingo'

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: APP_URL })
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: READ_MENU_ID,
    title: 'Read in Lingomingo',
    contexts: ['page', 'selection'],
  })
})

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== READ_MENU_ID || !info.pageUrl) return
  const url = `${APP_URL}#/reader?url=${encodeURIComponent(info.pageUrl)}`
  chrome.tabs.create({ url })
})
