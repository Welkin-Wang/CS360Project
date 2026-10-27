const websiteInput = document.getElementById('websiteInput');
const extractBtn = document.getElementById('extractBtn');
const displayText = document.getElementById('displayText');

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
