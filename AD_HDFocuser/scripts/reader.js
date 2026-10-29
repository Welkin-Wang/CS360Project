// PDF.js documentation:
// https://mozilla.github.io/pdf.js/getting_started/
import * as pdfjsLib from "./pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    chrome.runtime.getURL("scripts/pdfjs/pdf.worker.mjs");

const websiteInput = document.getElementById('websiteInput');
const extractBtn = document.getElementById('extractBtn');
const displayText = document.getElementById('displayText');
const pdfInput = document.getElementById("pdfInput");
const readerStatus = document.getElementById("readerStatus");
const documentSource = document.getElementById("documentSource");
const documentTitle = document.getElementById("documentTitle");
const documentAuthor = document.getElementById("documentAuthor");
extractBtn.addEventListener('click', async () => {
    let urlValue = websiteInput.value.trim();

    //Check the link first before submitting
    if (urlValue === "") {
        displayText.innerText = "Please enter a link first!";
        return;
    }

    try {
        //Fetch the webpage content
        //Fetch derived from https://www.w3schools.com/jsref/api_fetch.asp
        /*Fetch allows us to download the file of the website itself so that we can extract 
        the text from it later*/
        const response = await fetch(urlValue);
        const htmlText = await response.text();

        //Convert the text into an HTML object we can read
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        //Just grab the body text of the webpage and display it
        // (This gets all the words on the page without complex filtering)
        const pureText = doc.body.innerText;
        displayText.innerText = pureText;

    } catch (error) {
        displayText.innerText = "Error: Could not load the website text.";
    }
    //Try and catch derived from https://www.w3schools.com/js/js_errors_intro.asp
    /*These both are to catch any errors involving inproper 
    links so that the extension does not break if something is wrong */
});

//https://github.com/mozilla/pdf.js/blob/master/docs/contents/examples/index.md
pdfInput.addEventListener("change", async function () {
    const selectedPdfFile = pdfInput.files[0];
    //file validation
    if (!selectedPdfFile) {
        return;
    }

    const isPdf = selectedPdfFile.type === "application/pdf" ||selectedPdfFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
        readerStatus.textContent = "Please select a PDF file.";
        displayText.textContent = "";
        return;
    }

    readerStatus.textContent = "Opening PDF...";
    displayText.textContent = "";

    try {
        //https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer
        // Read the PDF as raw bytes.
        const pdfBufferPromise = selectedPdfFile.arrayBuffer();
        const rawPdfBuffer = await pdfBufferPromise;
        const pdfByteArray = new Uint8Array(rawPdfBuffer);

        const pdfLoadingTask = pdfjsLib.getDocument({data: pdfByteArray});

        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
        const loadedPdf = await pdfLoadingTask.promise;
        //an array that will save data for each page
        const extractedPdfPages = [];
        let totalTextItemCount = 0;

        //extracting texts per page. The same tutorial comes from pdf js
        for (let pageNumber = 1; pageNumber <= loadedPdf.numPages; pageNumber++)
        {
            readerStatus.textContent =`Extracting page ${pageNumber} of ${loadedPdf.numPages}...`;

            const pdfPage = await loadedPdf.getPage(pageNumber);

            // Create the page coordinate system.
            const pageViewport = pdfPage.getViewport({
                scale: 1
            });

            const pageTextContent = await pdfPage.getTextContent();
            const pageTextItems = [];

            // Skip non-text and blank items.
            for (let itemIndex = 0; itemIndex < pageTextContent.items.length; itemIndex++)
            {
                const textItem = pageTextContent.items[itemIndex];

                if (!("str" in textItem) || textItem.str.trim() === "") {
                    continue;
                }

                //extract position from the viewport
                const viewportPoint = pageViewport.convertToViewportPoint(
                    textItem.transform[4],//horizontal
                    textItem.transform[5]//vertical
                );

                // Convert PDF coordinates to viewport coordinates.
                const textPositionX = viewportPoint[0];
                const textPositionY = viewportPoint[1];

                // Store the text and its position.
                pageTextItems.push({
                    id: `page-${pageNumber}-text-${itemIndex}`,
                    page: pageNumber,
                    text: textItem.str,
                    x: Math.round(textPositionX),
                    y: Math.round(textPositionY),
                    width: Math.round(textItem.width),
                    height: Math.round(textItem.height)
                });
            }

            totalTextItemCount += pageTextItems.length;

            // Store the completed page data.
            extractedPdfPages.push({
                page: pageNumber,
                width: Math.round(pageViewport.width),
                height: Math.round(pageViewport.height),
                textItems: pageTextItems
            });

            pdfPage.cleanup();
        }

        documentSource.textContent =`Local PDF - ${loadedPdf.numPages} pages`;
        documentTitle.textContent = selectedPdfFile.name;
        // Author metadata is not processed yet.
        documentAuthor.textContent = "";

        // Show and log the extraction result.
        readerStatus.textContent =`Collected ${totalTextItemCount} text items from ${loadedPdf.numPages} pages.`;

        console.log("Extracted page count:", extractedPdfPages.length);
        console.log("First page text items:", extractedPdfPages[0].textItems);

        
    } catch (error) {
        console.error("PDF opening failed:", error);

        readerStatus.textContent = "The PDF could not be opened.";
        displayText.textContent = "";
    }
});

//themeToggle from project 0
document.addEventListener("DOMContentLoaded", function() { /*Function for changing the theme with the button*/
    const themeToggleBtn = document.getElementById("themeToggle");

    //https://www.w3schools.com/js/js_htmldom_eventlistener.asp
    //Source of understanding event listeners for the changing from day to night theme for the switch theme requirement
    themeToggleBtn.addEventListener("click", function() {
        const isDark = document.body.classList.contains("light-theme");

        document.body.classList.toggle("light-theme", !isDark);
        document.body.classList.toggle("dark-theme", isDark);

        themeToggleBtn.setAttribute("aria-pressed", String(isDark));
        themeToggleBtn.textContent = isDark ? "Day Mode" : "Night Mode";
        //https://www.w3schools.com/jsref/prop_element_classlist.asp
        //Source of understanding class lists and tinkering with them
    });
});
