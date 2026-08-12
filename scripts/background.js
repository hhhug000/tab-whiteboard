chrome.action.onClicked.addListener(async (tab) => {
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/content.js']
    });

    const win = await chrome.windows.get(tab.windowId);
    const width = 460;
    const height = 65;
    const left = win.left + Math.round((win.width - width) / 2);
    const top = win.top + win.height - height - 60;

    const controlsWin = chrome.windows.create({
        url: `pages/controls.html?tabId=${tab.id}`,
        type: 'popup',
        width: 460,
        height: 65
    });

    if (controlsWin.id) {
        await chrome.windows.update(controlsWin.id, {
            top: Math.max(0, top),
            left: Math.max(0, left)
        });
    }
});