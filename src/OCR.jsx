import React, { useState, useRef, useEffect } from "react";
import Tesseract from "tesseract.js";
import { saveAs } from "file-saver";
import * as mammoth from "mammoth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faLink,
  faFileWord,
  faFilePowerpoint,
  faFilePdf,
  faFileImage,
  faFileAlt,
  faSpinner,
  faMagic,
  faExchangeAlt,
  faPaste,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { PDFDocument } from "pdf-lib";
import { Packer } from "docx";
import PptxGenJS from "pptxgenjs";
import "./OCR.css";

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';



const FileMorph = () => {
  const [image, setImage] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [cloudImageUrl, setCloudImageUrl] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("eng");
  const [activeTab, setActiveTab] = useState("ocr");
  const [fileToConvert, setFileToConvert] = useState(null);
  const [targetFormat, setTargetFormat] = useState("pptx");
  const [conversionStatus, setConversionStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef(null);
  const conversionInputRef = useRef(null);

  const languages = [
    { code: "eng", name: "English" },
    { code: "fra", name: "French" },
    { code: "spa", name: "Spanish" },
    { code: "deu", name: "German" },
    { code: "chi_sim", name: "Chinese (Simplified)" },
    { code: "hin", name: "Hindi" },
    { code: "ara", name: "Arabic" },
  ];

  // Show notification
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle paste from clipboard
  useEffect(() => {

    const handlePaste = async (event) => {
      if (activeTab !== "ocr"){
        return;
      }
      
      const items = event.clipboardData.items;
      for(let i=0 ; i<items.length ; i++){
        
        if(items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          const imageUrl = URL.createObjectURL(blob);
          setImage(imageUrl);
          setText("");
          showNotification("Image pasted from clipboard!", "success");
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      handlePdfUpload(file);
    } else if (file.type.startsWith("image/")) {
      setImage(URL.createObjectURL(file));
      setText("");
      showNotification("Image uploaded successfully!", "success");
    } else {
      showNotification("Unsupported file type", "error");
    }
  };

  const handleLoadCloudImage = () => {
    if (!cloudImageUrl) {
      showNotification("Please enter an image URL", "error");
      return;
    }

    // Basic URL validation
    try {
      new URL(cloudImageUrl);
      setImage(cloudImageUrl);
      setText("");
      showNotification("Cloud image loaded!", "success");
    } catch (e) {
      showNotification("Invalid URL", "error");
    }
  };

  const handleExtractText = async () => {
    if (!image) {
      showNotification("Please upload an image first", "error");
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const { data } = await Tesseract.recognize(image, selectedLanguage, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      setText(data.text);
      showNotification("Text extracted successfully!", "success");
    } catch (err) {
      console.error("OCR Error:", err);
      setText("Error extracting text. Please try another image.");
      showNotification("Error extracting text", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadText = () => {
    if (!text) {
      showNotification("No text to download", "error");
      return;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "extracted-text.txt");
    showNotification("Text downloaded!", "success");
  };

  const handleFileConversion = async () => {
    if (!fileToConvert) {
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
    } catch (error) {
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
      else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
              file.name.endsWith('.docx')) {
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
    } catch (error) {
      console.error("Error extracting text from file:", error);
      throw error; // Re-throw to handle in the calling function
    }
  }

  const triggerFileInput = () => fileInputRef.current.click();
  const triggerConversionInput = () => conversionInputRef.current.click();

  const handleConversionFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

  return (
    <div className="file-morph-app">
    
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">File Morph</h1>
          <nav className="app-nav">
            <button
              className={`nav-button ${activeTab === "ocr" ? "active" : ""}`}
              onClick={() => setActiveTab("ocr")}
            >
              <FontAwesomeIcon icon={faFileImage} /> OCR
            </button>
            <button
              className={`nav-button ${activeTab === "convert" ? "active" : ""}`}
              onClick={() => setActiveTab("convert")}
            >
              <FontAwesomeIcon icon={faExchangeAlt} /> Convert
            </button>
          </nav>
        </div>
      </header>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <main className="app-main">
        {activeTab === "ocr" ? (
          <div className="ocr-container">
            <div className="upload-section">
              <div className="upload-options">
                <label className="upload-card" onClick={triggerFileInput}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden-input"
                  />
                  <FontAwesomeIcon icon={faUpload} size="2x" />
                  <span>Upload Image</span>
                </label>

                <div className="url-upload-card">
                  <FontAwesomeIcon icon={faLink} size="2x" />
                  <input
                    type="text"
                    placeholder="Enter image URL"
                    value={cloudImageUrl}
                    onChange={(e) => setCloudImageUrl(e.target.value)}
                    className="url-input"
                  />
                  <button
                    onClick={handleLoadCloudImage}
                    className="primary-button"
                  >
                    Load
                  </button>
                </div>

                <button className="upload-card" onClick={() => showNotification("Copy an image and press Ctrl+V to paste", "info")}>
                  <FontAwesomeIcon icon={faPaste} size="2x" />
                  <span>Paste Image</span>
                </button>
              </div>

              {image && (
                <div className="image-preview">
                  <img src={image} alt="Uploaded content" />
                  <button 
                    className="clear-button" 
                    onClick={() => {
                      setImage(null);
                      setText("");
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="extraction-section">
              <div className="controls">
                <div className="language-selector">
                  <label>Language:</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExtractText}
                  disabled={loading || !image}
                  className={`action-button ${loading ? "loading" : ""}`}
                >
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> {progress}%
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faMagic} /> Extract Text
                    </>
                  )}
                </button>
              </div>

              {text && (
                <div className="results">
                  <div className="results-header">
                    <h3>Extracted Text</h3>
                    <div className="result-actions">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(text);
                          showNotification("Text copied to clipboard!", "success");
                        }}
                        className="secondary-button"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleDownloadText}
                        className="secondary-button"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={text}
                    readOnly
                    className="text-output"
                    placeholder="Extracted text will appear here..."
                  />
                </div>
              )}
            </div>
          </div>
        )
        :(
          <div className="conversion-container">
            
            <div className="conversion-source">
              <h3>Convert Files</h3>
              <label className="file-upload-card" onClick={triggerConversionInput}>
                <input
                  ref={conversionInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.ppt"
                  onChange={handleConversionFileChange}
                  className="hidden-input"
                />
                <FontAwesomeIcon icon={faUpload} size="2x" />
                <span>
                  {fileToConvert
                    ? fileToConvert.name
                    : "Select PDF or DOCX file"}
                </span>
              </label>
              
              {fileToConvert && (
                <div className="file-info">
                  <p>Selected: {fileToConvert.name}</p>
                  <button 
                    className="secondary-button small"
                    onClick={() => setFileToConvert(null)}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="conversion-target">
              <div className="format-selector">
                <label>Convert to:</label>
                <div className="format-options">
                  <button
                    className={`format-option ${
                      targetFormat === "pptx" ? "selected" : ""
                    }`}
                    onClick={() => setTargetFormat("pptx")}
                  >
                    <FontAwesomeIcon icon={faFilePowerpoint} />
                    <span>PowerPoint</span>
                  </button>
                  <button
                    className={`format-option ${
                      targetFormat === "docx" ? "selected" : ""
                    }`}
                    onClick={() => setTargetFormat("docx")}
                  >
                    <FontAwesomeIcon icon={faFileWord} />
                    <span>Word</span>
                  </button>
                  <button
                    className={`format-option ${
                      targetFormat === "pdf" ? "selected" : ""
                    }`}
                    onClick={() => setTargetFormat("pdf")}
                  >
                    <FontAwesomeIcon icon={faFilePdf} />
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleFileConversion}
                disabled={!fileToConvert || conversionStatus === "converting"}
                className="primary-button convert-button"
              >
                {conversionStatus === "converting" ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Converting...
                  </>
                ) : (
                  "Convert File"
                )}
              </button>

              {conversionStatus === "converted" && (
                <div className="conversion-success">
                  <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
                  <p>Conversion complete!</p>
                </div>
              )}
            </div>
          
          </div>
        )}
      </main>
    </div>
  );
};

export default FileMorph;