let currentTool = 'laser';

const tabId = parseInt(new URLSearchParams(window.location.search).get('tabId'), 10);

async function sendState() {
    const color = document.getElementById('color-picker').value;
    const size = document.getElementById('size-slider').value;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: false });
    if (tabId) {
        chrome.tabs.sendMessage(tabId, {
            action: 'update_tool',
            tool: currentTool,
            color: color,
            size: parseInt(size, 10)
        }).catch(() => {});
    }
}

const toolButtons = ['laser', 'pen', 'line', 'arrow', 'rect', 'circle', 'eraser'];

toolButtons.forEach(tool => {
    const btn = document.getElementById(`btn-${tool}`);
    if (btn) {
        btn.addEventListener('click', () => {
            toolButtons.forEach(t => {
                const b = document.getElementById(`btn-${t}`);
                if (b) b.classList.remove('active');
            });
            btn.classList.add('active');
            currentTool = tool;
            sendState();
        });
    }
});

document.getElementById('color-picker').addEventListener('input', sendState);
document.getElementById('size-slider').addEventListener('input', sendState);

document.getElementById('btn-clear').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: false });
    if (tabId) {
        chrome.tabs.sendMessage(tabId, { action: 'clear' }).catch(() => {});
    }
});

sendState();

window.addEventListener('beforeunload', () => {
    if (tabId) {
        chrome.tabs.sendMessage(tabId, { action: 'destroy'}).catch(() => {});
    }
});