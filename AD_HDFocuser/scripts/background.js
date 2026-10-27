const readerPageUrl = chrome.runtime.getURL("html/reader.html");

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: readerPageUrl });
});
