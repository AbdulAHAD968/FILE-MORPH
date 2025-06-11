// currently this is not being used, I replaced it with
// ILOVEPDF API for file conversion, using the same UI components

const handleFileConversion = async () => {
    
    // if no file is selected, show an error notification
    if(!fileToConvert){
        showNotification("Please select a file to convert", "error");
        return;
    }

    setConversionStatus("converting");

    try {
        let convertedBlob;
        const fileExtension = fileToConvert.name.split('.').pop().toLowerCase();
        const fileData = await fileToConvert.arrayBuffer();

        if (targetFormat === "pptx" && (fileExtension === "pdf" || fileExtension === "docx")) {
            const pptx = new PptxGenJS();
            
            // Extract content based on file type
            if (fileExtension === "pdf") {
                const loadingTask = pdfjsLib.getDocument(await fileToConvert.arrayBuffer());
                const pdf = await loadingTask.promise;
            
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const slide = pptx.addSlide();
                    
                    slide.addText(
                    textContent.items.map(item => item.str).join(' '),
                    { x: 0.5, y: 0.5, w: 9, h: 6.5, fontSize: 12 }
                    );
                    
                    // Optionally add page number
                    slide.addText(
                    `Page ${i}`,
                    { x: "90%", y: "90%", fontSize: 10, color: "666666" }
                    );
                }
            } 
            else { // DOCX
                const text = await extractTextFromDocx(await fileToConvert.arrayBuffer());
                const paragraphs = text.split('\n').filter(p => p.trim());
            
                paragraphs.forEach((para, index) => {
                    const slide = pptx.addSlide();
                    slide.addText(para, { 
                    x: 0.5, 
                    y: 0.5, 
                    w: 9, 
                    h: 6.5, 
                    fontSize: 14,
                    bullet: paragraphs.length > 1 // Add bullets if multiple paragraphs
                    });
                });
            }

            const pptxBlob = await pptx.write("blob");
            convertedBlob = new Blob([pptxBlob], {
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            });
        }
        else if (targetFormat === "pdf") {
            const pdfDoc = await PDFDocument.create();
        
            const page = pdfDoc.addPage([600, 800]);
            
            const text = await extractTextFromFile(fileToConvert);
            
            const lines = [];
            const maxWidth = 500;
            const fontSize = 12;
            let currentLine = "";
            
            text.split(' ').forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = fontSize * testLine.length * 0.5; // Approximate
            
                if (testWidth > maxWidth) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
                });
                if (currentLine){
                    lines.push(currentLine);
                }
                
                let y = 750;
                lines.forEach(line => {
                if (y < 50) {
                    y = 750;
                    page = pdfDoc.addPage([600, 800]);
                }
                page.drawText(line, { x: 50, y, size: fontSize });
                y -= (fontSize + 5);
            });
            
            const pdfBytes = await pdfDoc.save();
            convertedBlob = new Blob([pdfBytes], { type: "application/pdf" });
        }
        else if (targetFormat === "docx"){

            const { Document, Paragraph, TextRun, Packer } = await import("docx");
            
            // Extract text from source file
            const text = await extractTextFromFile(fileToConvert);
            
            // Create a proper DOCX document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                    new Paragraph({
                        children: [
                        new TextRun({
                            text: text,
                            size: 24, // Half-points (24 = 12pt)
                        }),
                        ],
                    }),
                    ],
                }],
            });

            const buffer = await Packer.toBuffer(doc);
            convertedBlob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            });
        }

        const url = URL.createObjectURL(convertedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `converted.${targetFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setConversionStatus("converted");
        showNotification("File converted and downloaded!", "success");
    } 
    catch (err) {
        console.error("Conversion Error:", err);
        setConversionStatus("error");
        showNotification("Conversion failed", "error");
    }
};

// Helper function to extract text from DOCX
async function extractTextFromDocx(arrayBuffer) {
    try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value; // Returns the extracted text
    } 
    catch (error) {
        console.error("Error extracting text from DOCX:", error);
        return "Could not extract text from DOCX file";
    }
}

// Helper function to extract text from various files
async function extractTextFromFile(file) {
    try {
        if (file.type === "application/pdf") {
            const loadingTask = pdfjsLib.getDocument(await file.arrayBuffer());
            const pdf = await loadingTask.promise;
            let fullText = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + "\n";
            }
            return fullText;
        }
        else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith('.docx')) {
            return await extractTextFromDocx(await file.arrayBuffer());
        }
        else if (file.type.startsWith('text/')) {
            return await file.text();
        }
        else if (file.type.startsWith('image/')) {
            // Use Tesseract.js for OCR if it's an image
            const result = await Tesseract.recognize(file);
            return result.data.text;
        }
        else {
            throw new Error("Unsupported file type for text extraction");
        }
    } 
    catch (error) {
        console.error("Error extracting text from file:", error);
        throw error; // Re-throw to handle in the calling function
    }
}

const triggerFileInput = () => fileInputRef.current.click();
const triggerConversionInput = () => conversionInputRef.current.click();

const handleConversionFileChange = (e) => {
    const file = e.target.files[0];
    if (!file){
        return;
    }

    const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ["pdf", "docx", "pptx"];

    if (validTypes.includes(file.type) || validExtensions.includes(fileExtension)) {
        setFileToConvert(file);
        showNotification("File selected for conversion", "success");
    } else {
        showNotification("Unsupported file type for conversion", "error");
    }
};
