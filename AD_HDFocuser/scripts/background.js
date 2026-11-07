/*
 * File: background.js
 * Authors: Yunxi Wang and Branden Secaira
 * Purpose: Opens the reader page when the extension button is clicked.
 */

const readerPageUrl = chrome.runtime.getURL("html/reader.html");

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: readerPageUrl });
});
