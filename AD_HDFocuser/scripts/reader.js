/*
 * File: reader.js
 * Authors: Yunxi Wang and Branden Secaira
 * Purpose: Handles document loading and reader controls.
 */
// PDF.js documentation:
// https://mozilla.github.io/pdf.js/getting_started/
import * as pdfjsLib from "./pdfjs/pdf.mjs";

// set the worker source for PDF.js to the correct path in the extension.
pdfjsLib.GlobalWorkerOptions.workerSrc =
    chrome.runtime.getURL("scripts/pdfjs/pdf.worker.mjs");

//all the variables for the reader page
const websiteInput = document.getElementById('websiteInput');
const extractBtn = document.getElementById('extractBtn');
const displayText = document.getElementById('displayText');
const pdfInput = document.getElementById("pdfInput");
const readerStatus = document.getElementById("readerStatus");
const documentSource = document.getElementById("documentSource");
const documentTitle = document.getElementById("documentTitle");
const documentAuthor = document.getElementById("documentAuthor");
const textSize = document.getElementById("textSize");
const textSizeValue = document.getElementById("textSizeValue");
const lineSpacing = document.getElementById("lineSpacing");
const lineSpacingValue = document.getElementById("lineSpacingValue");
const bionicToggle = document.getElementById("bionicToggle");
const lineFocusToggle = document.getElementById("lineFocusToggle");

// Keep track of which reading features are enabled.
let bionicReading = false;
let lineFocusEnabled = false;

//Variables for Sentence Focus and Reading Mask.
const sentenceFocusToggle = document.getElementById("sentenceFocusToggle");
const readingMaskToggle = document.getElementById("maskToggle");

let sentenceFocusEnabled = false;
let readingMaskEnabled = false;

// Change the document text size when the slider moves.
textSize.addEventListener("input", function () {

    // Get the current slider value.
    const currentSize = textSize.value;

    // Change the font size of the extracted document.
    displayText.style.fontSize = currentSize + "px";

    // Update the displayed number.
    textSizeValue.textContent = currentSize + "px";
});

// Change the spacing between lines when the slider moves.
lineSpacing.addEventListener("input", function () {

    // Get the current line spacing value.
    const currentSpacing = lineSpacing.value;

    // Change the line spacing of the extracted document.
    displayText.style.lineHeight = currentSpacing;

    // Update the displayed number.
    lineSpacingValue.textContent = currentSpacing;
});

// Add Bionic Reading formatting to a piece of text.
function addBionicFormatting(element, text) {

    // Separate the words while keeping their spaces.
    //regular expression usage derived from https://www.w3schools.com/js/js_regexp_quantifiers.asp
    //regular expression usage here and afterwards is to make sure we identify all possible letters or
    //punctuation to detect what MIGHT be sentences or words. I added special accented characters just in case
    //a text might have those and so the code does not break if it encounters those. 
    const words = text.split(/(\s+)/);

    words.forEach(function (word) {

        // Leave spaces unchanged.
        if (word.trim() === "") {
            element.appendChild(document.createTextNode(word));
            return;
        }

        // Separate punctuation from the letters.
        const wordMatch = word.match(/^([^A-Za-zÀ-ÿ]*)([A-Za-zÀ-ÿ]+)(.*)$/);

        if (wordMatch) {

            const beginning = wordMatch[1];
            const letters = wordMatch[2];
            const ending = wordMatch[3];

            // Bold the first half of the word.
            const boldLength = Math.ceil(letters.length / 2);

            // Create the bold portion.
            const boldPart = document.createElement("strong");
            boldPart.className = "bionic-bold";
            boldPart.textContent = letters.substring(0, boldLength);

            // Add punctuation before the word.
            element.appendChild(document.createTextNode(beginning));

            // Add the bold portion.
            element.appendChild(boldPart);

            // Add the remaining letters and punctuation.
            element.appendChild(document.createTextNode(
                letters.substring(boldLength) + ending
            ));

        } else {

            element.appendChild(document.createTextNode(word));
        }
    });
}

// Rebuild the extracted text with the enabled reading features.
function renderTextFeatures() {

    // Find all paragraphs, headings, and captions.
    const textElements = displayText.querySelectorAll("p, h3, figcaption");

    textElements.forEach(function (element) {

        // Save the original text before formatting it.
        if (element.dataset.originalText === undefined) {
            element.dataset.originalText = element.textContent;
        }

        // Get the original text.
        const originalText = element.dataset.originalText;

        // Clear the current formatting.
        element.replaceChildren();

        // Check whether Sentence Focus is enabled.
        if (sentenceFocusEnabled) {

            // Separate the text into individual sentences.
            const sentences = originalText.match(
                /[^.!?]+[.!?]+["'’”)]*\s*|[^.!?]+$/g
            ) || [originalText];

            sentences.forEach(function (sentence) {

                // Create a separate span for each sentence.
                const sentenceSpan = document.createElement("span");
                sentenceSpan.className = "focus-sentence";

                // Apply Bionic Reading if it is enabled.
                if (bionicReading) {
                    addBionicFormatting(sentenceSpan, sentence);
                } else {
                    sentenceSpan.textContent = sentence;
                }

                // Add the sentence to the paragraph.
                element.appendChild(sentenceSpan);
            });

        } else {

            // Apply Bionic Reading without Sentence Focus.
            if (bionicReading) {
                addBionicFormatting(element, originalText);
            } else {

                // Restore the original text.
                element.textContent = originalText;
            }
        }
    });
}

function applyBionicReading() {
    renderTextFeatures();
}

//Turn Bionic Reading on and off.
bionicToggle.addEventListener("click", function () {

    //Switch between enabled and disabled.
    bionicReading = !bionicReading;

    //Update the button's pressed state.
    bionicToggle.setAttribute("aria-pressed", String(bionicReading));

    //Refresh the extracted text.
    renderTextFeatures();
});

//Turn Sentence Focus on and off.
sentenceFocusToggle.addEventListener("click", function () {

    //Switch between enabled and disabled.
    sentenceFocusEnabled = !sentenceFocusEnabled;

    // Update the button's pressed state.
    sentenceFocusToggle.setAttribute(
        "aria-pressed",
        String(sentenceFocusEnabled)
    );

    if (sentenceFocusEnabled) {

        // Turn off Line Focus if it is currently enabled.
        if (lineFocusEnabled) {
            lineFocusEnabled = false;

            lineFocusToggle.setAttribute("aria-pressed", "false");
            displayText.classList.remove("line-focus-active");
        }

        // Add the Sentence Focus class.
        displayText.classList.add("sentence-focus-active");

    } else {

        //Remove the Sentence Focus class.
        displayText.classList.remove("sentence-focus-active");
    }

    // Rebuild the text with the current formatting.
    renderTextFeatures();
});


// Detect when the user clicks on a sentence.
displayText.addEventListener("click", function (event) {

    // Do nothing if Sentence Focus is disabled.
    if (!sentenceFocusEnabled) {
        return;
    }

    // Find the sentence that was clicked.
    const selectedSentence = event.target.closest(".focus-sentence");

    // Make sure the selected sentence belongs to the document.
    if (!selectedSentence || !displayText.contains(selectedSentence)) {
        return;
    }

    // Find the previously selected sentences.
    const previousSentences = displayText.querySelectorAll(".sentence-focused");

    // Remove the previous highlights.
    previousSentences.forEach(function (sentence) {
        sentence.classList.remove("sentence-focused");
    });

    // Highlight the newly selected sentence.
    selectedSentence.classList.add("sentence-focused");
});

// Turn Line Focus on and off.
lineFocusToggle.addEventListener("click", function () {

    // Switch between enabled and disabled.
    lineFocusEnabled = !lineFocusEnabled;

    // Update the button's pressed state.
    lineFocusToggle.setAttribute("aria-pressed", String(lineFocusEnabled));

    if (lineFocusEnabled) {

        // Add the class that greys out the extracted text.
        displayText.classList.add("line-focus-active");

    } else {

        // Remove the greyed-out appearance.
        displayText.classList.remove("line-focus-active");

        // Remove the previous highlighted selection.
        const selectedLines = displayText.querySelectorAll(".line-focused");

        selectedLines.forEach(function (element) {
            element.classList.remove("line-focused");
        });
    }
});


// Detect when the user clicks on extracted text.
displayText.addEventListener("click", function (event) {

    // Do nothing if Line Focus is disabled.
    if (!lineFocusEnabled) {
        return;
    }

    // Find the paragraph, heading, or caption that was clicked.
    const selectedLine = event.target.closest("p, h3, figcaption");

    // Make sure the selected element belongs to the document.
    if (!selectedLine || !displayText.contains(selectedLine)) {
        return;
    }

    // Find the previously highlighted text.
    const previousSelection = displayText.querySelectorAll(".line-focused");

    // Remove the previous highlight.
    previousSelection.forEach(function (element) {
        element.classList.remove("line-focused");
    });

    // Highlight the newly selected text.
    selectedLine.classList.add("line-focused");
});

// Separate extracted website text into individual lines.
function renderPlainText(pureText) {

    // Remove the previous document.
    displayText.replaceChildren();

    // Separate the text using newline characters.
    const textLines = pureText.split(/\r?\n/);

    // Go through each extracted line.
    textLines.forEach(function (line) {

        // Ignore empty lines.
        if (line.trim() === "") {
            return;
        }

        // Create a paragraph for the extracted line.
        const paragraph = document.createElement("p");

        // Put the extracted text inside the paragraph.
        paragraph.textContent = line;

        // Add the paragraph to the reader.
        displayText.appendChild(paragraph);
    });

    // Apply any reading features that are already enabled.
    refreshReaderFeatures();
}


// Refresh the reading features after loading a document.
function refreshReaderFeatures() {

    // Apply Bionic Reading if it is enabled.
    if (bionicReading) {
        applyBionicReading();
    }

    // Keep Line Focus enabled if it is already active.
    if (lineFocusEnabled) {
        displayText.classList.add("line-focus-active");
    }
}

// Convert PDF.js image coordinates into exact page image candidates.
function createImageCandidates(imageCoordinates, pageNumber) {
    const candidates = [];

    // A page without recorded image coordinates has no candidates.
    if (!imageCoordinates) {
        return candidates;
    }

    // PDF.js stores each image as three corners: x0, y0, x1, y1, x2, y2.
    for (
        let index = 0;
        index + 5 < imageCoordinates.length && candidates.length < 20;
        index += 6
    ) {
        const x0 = imageCoordinates[index];
        const y0 = imageCoordinates[index + 1];
        const x1 = imageCoordinates[index + 2];
        const y1 = imageCoordinates[index + 3];
        const x2 = imageCoordinates[index + 4];
        const y2 = imageCoordinates[index + 5];

        // Calculate the missing fourth corner of the image rectangle.
        const x3 = x1 + x2 - x0;
        const y3 = y1 + y2 - y0;

        // Use all four corners to find the image's outer boundary.
        const left = Math.max(0, Math.min(1, x0, x1, x2, x3));
        const top = Math.max(0, Math.min(1, y0, y1, y2, y3));
        const right = Math.max(0, Math.min(1, Math.max(x0, x1, x2, x3)));
        const bottom = Math.max(0, Math.min(1, Math.max(y0, y1, y2, y3)));

        // Ignore coordinates that do not create a visible rectangle.
        if (left >= right || top >= bottom) {
            continue;
        }

        // Store normalized coordinates as integers from 0 to 1000.
        candidates.push({
            id: `page-${pageNumber}-image-${candidates.length}`,
            page: pageNumber,
            bbox: {
                left: Math.round(left * 1000),
                top: Math.round(top * 1000),
                right: Math.round(right * 1000),
                bottom: Math.round(bottom * 1000)
            }
        });
    }

    return candidates;
}

// Accept only AI figures that reference IDs created by this program.
function isValidFigure(figure, imageCandidatesById, blockIds, textItemsById) {
    return (
        figure &&
        typeof figure.imageId === "string" &&
        imageCandidatesById.has(figure.imageId) &&
        typeof figure.insertAfterBlockId === "string" &&
        blockIds.has(figure.insertAfterBlockId) &&
        Array.isArray(figure.captionTextItemIds) &&
        figure.captionTextItemIds.every(function (id) {
            return textItemsById.has(id);
        })
    );
}

// Render each figure page once, then crop using PDF.js coordinates.
async function createFigureImage(
    pdfDocument,
    imageCandidate,
    pageCanvasCache,
    altText
) {
    // Reuse the rendered page when it contains more than one figure.
    let pageCanvas = pageCanvasCache.get(imageCandidate.page);

    if (!pageCanvas) {
        const pdfPage = await pdfDocument.getPage(imageCandidate.page);

        try {
            const viewport = pdfPage.getViewport({ scale: 1.25 });
            pageCanvas = document.createElement("canvas");
            pageCanvas.width = Math.ceil(viewport.width);
            pageCanvas.height = Math.ceil(viewport.height);

            const pageContext = pageCanvas.getContext("2d");
            if (!pageContext) {
                throw new Error("Canvas context is unavailable.");
            }

            await pdfPage.render({
                canvasContext: pageContext,
                viewport: viewport
            }).promise;

            pageCanvasCache.set(imageCandidate.page, pageCanvas);
        } finally {
            pdfPage.cleanup();
        }
    }

    // Convert the 0-1000 boundary back into canvas pixels.
    const box = imageCandidate.bbox;
    const cropLeft = Math.floor(box.left / 1000 * pageCanvas.width);
    const cropTop = Math.floor(box.top / 1000 * pageCanvas.height);
    const cropRight = Math.ceil(box.right / 1000 * pageCanvas.width);
    const cropBottom = Math.ceil(box.bottom / 1000 * pageCanvas.height);
    const cropWidth = cropRight - cropLeft;
    const cropHeight = cropBottom - cropTop;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;

    const cropContext = cropCanvas.getContext("2d");
    if (!cropContext) {
        throw new Error("Crop canvas context is unavailable.");
    }

    // Copy only the selected image area into a smaller canvas.
    cropContext.drawImage(
        pageCanvas,
        cropLeft,
        cropTop,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
    );

    // Turn the cropped canvas into an image that can be displayed safely.
    const image = document.createElement("img");
    image.src = cropCanvas.toDataURL("image/png");
    image.alt = typeof altText === "string"
        ? altText.slice(0, 300)
        : "Document figure";

    return image;
}
extractBtn.addEventListener('click', async () => {
    let urlValue = websiteInput.value.trim();

    //check the link first before submitting
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

        // Extract the text from the webpage.
        const pureText = doc.body.innerText;

        // Separate the text into individual paragraphs.
        renderPlainText(pureText);

    } catch (error) {
        displayText.innerText = "Error: Could not load the website text.";
    }
    //Try and catch derived from https://www.w3schools.com/js/js_errors_intro.asp
    /*These both are to catch any errors involving inproper 
    links so that the extension does not break if something is wrong */
});


//https://github.com/mozilla/pdf.js/blob/master/docs/contents/examples/index.md
//how to navigare through the pdf.js library and extract text from a pdf file
pdfInput.addEventListener("change", async function () {
    const selectedPdfFile = pdfInput.files[0];
    //file validation
    if (!selectedPdfFile) {
        return;
    }

    //check if the selected file is a PDF by checking its MIME type and file extension
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
        //an array that will save data for each page, the data is the text and the position of the text on the page
        const extractedPdfPages = [];
        let totalTextItemCount = 0;

        //extracting texts per page. The same tutorial comes from pdf js
        for (let pageNumber = 1; pageNumber <= loadedPdf.numPages; pageNumber++)
        {
            readerStatus.textContent =`Extracting page ${pageNumber} of ${loadedPdf.numPages}...`;

            const pdfPage = await loadedPdf.getPage(pageNumber);

            // Create the page coordinate system using viewport
            //so we will use the viewport to get the position of the text on the page and
            //use it to align the text with the image of the page later on
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

            // Render once so PDF.js can record embedded image positions.
            const imageCanvas = document.createElement("canvas");
            imageCanvas.width = Math.ceil(pageViewport.width);
            imageCanvas.height = Math.ceil(pageViewport.height);

            const imageContext = imageCanvas.getContext("2d");
            if (!imageContext) {
                throw new Error("Canvas context is unavailable.");
            }

            //use pdf.js 's build-in render function to render the page and record the image positions
            const imageRenderTask = pdfPage.render({
                canvasContext: imageContext,
                viewport: pageViewport,
                recordImages: true
            });

            await imageRenderTask.promise;

            //also use the build-in attribute of the render function to get the image coordinates
            const pageImageCandidates = createImageCandidates(
                pdfPage.imageCoordinates,
                pageNumber
            );
            
            totalTextItemCount += pageTextItems.length;

            // Store the completed page data.
            extractedPdfPages.push({
                page: pageNumber,
                width: Math.round(pageViewport.width),
                height: Math.round(pageViewport.height),
                textItems: pageTextItems,
                // AI can select these IDs but cannot change their positions.
                imageCandidates: pageImageCandidates
            });

            pdfPage.cleanup();
        }
        readerStatus.textContent = "Analyzing PDF layout...";

        // Prepare the PDF and extracted structure to be sent later.
        const pdfFormData = new FormData();
        pdfFormData.append("pdf", selectedPdfFile);
        pdfFormData.append(
            "pdfStructure",
            JSON.stringify(extractedPdfPages)
        );

        // Send both parts to the backend
        const serverResponse = await fetch(
            "http://localhost:3000/analyze-pdf",
            {
                method: "POST",
                body: pdfFormData
            }
        );

        const serverResult = await serverResponse.json();

        if (!serverResponse.ok) {
            throw new Error(serverResult.error);
        }

        console.log("Backend response:", serverResult);

        // Connect each ID to its original PDF text item.
        const textItemsById = new Map();

        for (const page of extractedPdfPages) {
            for (const textItem of page.textItems) {
                textItemsById.set(textItem.id, textItem);
            }
        }

        // Connect each local image ID to its exact PDF.js position.
        const imageCandidatesById = new Map();
        for (const page of extractedPdfPages) {
            for (const candidate of page.imageCandidates) {
                imageCandidatesById.set(candidate.id, candidate);
            }
        }

        // Validate semantic blocks returned by AI.
        const allowedBlockTypes = new Set([
            "title",
            "subtitle",
            "heading",
            "paragraph",
            "caption",
            "footer"
        ]);
        const aiBlocks = serverResult.analysis.blocks;
        const seenBlockIds = new Set();
        const orderedTextIds = [];
        let blocksAreValid = Array.isArray(aiBlocks) && aiBlocks.length > 0;

        // Check the type and IDs of every block returned by AI.
        if (blocksAreValid) {
            for (const block of aiBlocks) {
                if (
                    !block ||
                    typeof block.id !== "string" ||
                    seenBlockIds.has(block.id) ||
                    !allowedBlockTypes.has(block.type) ||
                    !Array.isArray(block.textItemIds) ||
                    block.textItemIds.length === 0
                ) {
                    blocksAreValid = false;
                    break;
                }

                seenBlockIds.add(block.id);
                orderedTextIds.push(...block.textItemIds);
            }
        }

        // Every extracted text item must appear once and only once.
        const uniqueTextIds = new Set(orderedTextIds);
        blocksAreValid = blocksAreValid &&
            orderedTextIds.length === textItemsById.size &&
            uniqueTextIds.size === orderedTextIds.length &&
            orderedTextIds.every(function (id) {
                return typeof id === "string" && textItemsById.has(id);
            });

        // Fall back to PDF.js order when the AI structure is incomplete.
        const safeBlocks = blocksAreValid
            ? aiBlocks
            : [{
                id: "fallback-content",
                type: "paragraph",
                textItemIds: Array.from(textItemsById.keys())
            }];

        if (!blocksAreValid) {
            console.warn("Invalid AI blocks. Using PDF.js order.");
        }

        const blockIds = new Set(safeBlocks.map(function (block) {
            return block.id;
        }));

        // Validate selected figures and their insertion blocks.
        const aiFigures = Array.isArray(serverResult.analysis.figures)
            ? serverResult.analysis.figures.slice(0, 10)
            : [];
        const seenImageIds = new Set();

        // Remove invalid and duplicate image selections.
        const safeFigures = aiFigures.filter(function (figure) {
            const valid = isValidFigure(
                figure,
                imageCandidatesById,
                blockIds,
                textItemsById
            ) && !seenImageIds.has(figure.imageId);

            if (valid) {
                seenImageIds.add(figure.imageId);
            }
            return valid;
        });

        if (safeFigures.length !== aiFigures.length) {
            console.warn("One or more invalid figures were ignored.");
        }

        const figuresByBlockId = new Map();
        const captionIdSet = new Set();

        // Group figures by where they should appear in the reading order.
        for (const figure of safeFigures) {
            const figures = figuresByBlockId.get(figure.insertAfterBlockId) || [];
            figures.push(figure);
            figuresByBlockId.set(figure.insertAfterBlockId, figures);

            for (const captionId of figure.captionTextItemIds) {
                captionIdSet.add(captionId);
            }
        }

        // Join a block's text while leaving its figure caption separate.
        const getText = function (ids) {
            return ids
                .filter(function (id) {
                    return !captionIdSet.has(id);
                })
                .map(function (id) {
                    return textItemsById.get(id).text;
                })
                .join(" ")
                .trim();
        };

        const titleBlock = safeBlocks.find(function (block) {
            return block.type === "title";
        });
        const titleFromBlock = titleBlock
            ? titleBlock.textItemIds.map(function (id) {
                return textItemsById.get(id).text;
            }).join(" ")
            : "";
        // Prefer the AI title, then the title block, then the file name.
        const resolvedDocumentTitle =
            typeof serverResult.analysis.title === "string" &&
            serverResult.analysis.title.trim() !== ""
                ? serverResult.analysis.title.trim()
                : titleFromBlock || selectedPdfFile.name;

        displayText.replaceChildren();
        const pageCanvasCache = new Map();

        // Turn each semantic block into a simple HTML element.
        for (const block of safeBlocks) {
            const blockText = getText(block.textItemIds);

            if (
                blockText !== "" &&
                block.type !== "title" &&
                block.type !== "footer"
            ) {
                const elementName = block.type === "heading" ? "h3" : "p";
                const blockElement = document.createElement(elementName);
                blockElement.textContent = blockText;
                blockElement.dataset.blockId = block.id;

                if (block.type === "subtitle") {
                    blockElement.className = "document-subtitle";
                } else if (block.type === "caption") {
                    blockElement.className = "document-caption";
                }

                displayText.appendChild(blockElement);
            }

            // Insert selected figures immediately after their related block.
            const figuresAfterBlock = figuresByBlockId.get(block.id) || [];
            for (const figure of figuresAfterBlock) {
                const captionText = figure.captionTextItemIds
                    .map(function (id) {
                        return textItemsById.get(id).text;
                    })
                    .join(" ")
                    .trim();

                try {
                    const imageCandidate = imageCandidatesById.get(figure.imageId);
                    const figureElement = document.createElement("figure");
                    figureElement.className = "document-figure";

                    const image = await createFigureImage(
                        loadedPdf,
                        imageCandidate,
                        pageCanvasCache,
                        figure.alt
                    );
                    figureElement.appendChild(image);

                    if (captionText !== "") {
                        const captionElement = document.createElement("figcaption");
                        captionElement.textContent = captionText;
                        figureElement.appendChild(captionElement);
                    }

                    displayText.appendChild(figureElement);
                } catch (error) {
                    console.warn("Figure could not be rendered:", error);

                    if (captionText !== "") {
                        const fallbackCaption = document.createElement("p");
                        fallbackCaption.className = "document-caption";
                        fallbackCaption.textContent = captionText;
                        displayText.appendChild(fallbackCaption);
                    }
                }
            }
        }

        // Apply the enabled reading features to the newly extracted PDF.
        refreshReaderFeatures();
        // Update the UI with the PDF metadata and extracted text.
        documentSource.textContent =`Local PDF - ${loadedPdf.numPages} pages`;
        documentTitle.textContent = resolvedDocumentTitle;
        // Author metadata is not processed yet.
        documentAuthor.textContent = "";

        // Show and log the extraction result.
        readerStatus.textContent =
            `Rendered ${safeBlocks.length} content blocks and ` +
            `${safeFigures.length} figures.`;

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

// Create the top and bottom Reading Mask overlays.
const topMask = document.createElement("div");
const bottomMask = document.createElement("div");

// Give both elements the Reading Mask CSS class.
topMask.className = "reading-mask-overlay";
bottomMask.className = "reading-mask-overlay";

// Add the overlays to the webpage.
document.body.appendChild(topMask);
document.body.appendChild(bottomMask);

// Position the Reading Mask around the line being hovered over.
function updateReadingMask(event) {

    // Do nothing if Reading Mask is disabled.
    if (!readingMaskEnabled) {
        return;
    }

    // Find the paragraph, heading, or caption being hovered over.
    const hoveredElement = event.target.closest("p, h3, figcaption");

    // Make sure the element belongs to the extracted document.
    if (!hoveredElement || !displayText.contains(hoveredElement)) {
        hideReadingMask();
        return;
    }

    // Create a range containing the text inside the element.
    const textRange = document.createRange();
    textRange.selectNodeContents(hoveredElement);

    // Get the positions of the individual rendered text lines.
    const textLines = Array.from(textRange.getClientRects());

    // Find the visual line underneath the mouse.
    const selectedLine = textLines.find(function (line) {

        return (
            event.clientY >= line.top &&
            event.clientY <= line.bottom
        );
    });

    // Hide the mask if no line was found.
    if (!selectedLine) {
        hideReadingMask();
        return;
    }

    // Get the boundaries of the extracted document.
    const documentBounds = displayText.getBoundingClientRect();

    // Make sure the selected line is inside the document.
    const lineTop = Math.max(selectedLine.top, documentBounds.top);
    const lineBottom = Math.min(selectedLine.bottom, documentBounds.bottom);

    if (lineTop >= lineBottom) {
        hideReadingMask();
        return;
    }

    // Position the top overlay above the selected line.
    topMask.style.left = documentBounds.left + "px";
    topMask.style.width = documentBounds.width + "px";
    topMask.style.top = documentBounds.top + "px";
    topMask.style.height = (lineTop - documentBounds.top) + "px";

    // Position the bottom overlay below the selected line.
    bottomMask.style.left = documentBounds.left + "px";
    bottomMask.style.width = documentBounds.width + "px";
    bottomMask.style.top = lineBottom + "px";
    bottomMask.style.height = (documentBounds.bottom - lineBottom) + "px";

    // Display both overlays.
    topMask.style.display = "block";
    bottomMask.style.display = "block";
}


// Hide both Reading Mask overlays.
function hideReadingMask() {

    topMask.style.display = null;
    bottomMask.style.display = null;
}

// Turn Reading Mask on and off.
readingMaskToggle.addEventListener("click", function () {

    // Switch between enabled and disabled.
    readingMaskEnabled = !readingMaskEnabled;

    // Update the button's pressed state.
    readingMaskToggle.setAttribute(
        "aria-pressed",
        String(readingMaskEnabled)
    );

    if (!readingMaskEnabled) {

        // Hide the overlays when Reading Mask is disabled.
        hideReadingMask();
    }
});


// Detect when the mouse moves over extracted text.
displayText.addEventListener("mousemove", function (event) {

    updateReadingMask(event);
});


// Hide the mask when the mouse leaves the document.
displayText.addEventListener("mouseleave", function () {

    hideReadingMask();
});


// Hide the mask when the document scrolls.
window.addEventListener("scroll", function () {

    hideReadingMask();
});
