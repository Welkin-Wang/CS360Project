/*
 * File: index.js
 * Authors: Yunxi Wang and Branden Secaira
 * Purpose: Runs the backend server for the AD/HD Focuser.
 */

import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const port = 3000;
// Keep the uploaded PDF in memory.
const upload = multer({
    storage: multer.memoryStorage()
});
//https://expressjs.com/en/guide/using-middleware/
//allow the extension to access the backend server.
app.use(cors());
//routing derived from https://expressjs.com/en/guide/routing/
app.get("/health", function (request, response) {
    response.json({
        status: "ok"
    });
});

//place pdf file into buffer memory for processing it later with AI
app.post("/analyze-pdf", upload.single("pdf"), function (request, response) {
    if (!request.file) {
        response.status(400).json({
            error: "No PDF was uploaded."
        });
        return;
    }

    if (request.file.mimetype !== "application/pdf") {
        response.status(400).json({
            error: "The uploaded file must be a PDF."
        });
        return;
    }

    response.json({
        message: "PDF received successfully.",
        fileName: request.file.originalname,
        fileSize: request.file.size,
        fileType: request.file.mimetype
    });
});

app.listen(port, function () {
    console.log(`Server running at http://localhost:${port}`);
});