import React, { useState, useRef, useEffect } from "react";
import Tesseract from "tesseract.js";
import { saveAs } from "file-saver";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faLink,
  faMagic,
  faSpinner,
  faPaste,
  faShieldAlt,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";

import ocrLimitImg from '/src/assets/ocr-limit.png';
import ocrSecImg from '/src/assets/ocr-sec.png';

const OCR = ({ showNotification }) => {

  const [image, setImage] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [cloudImageUrl, setCloudImageUrl] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("eng");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const languages = [
    { code: "eng", name: "English" },
    { code: "fra", name: "French" },
    { code: "spa", name: "Spanish" },
    { code: "deu", name: "German" },
    { code: "chi_sim", name: "Chinese (Simplified)" },
    { code: "hin", name: "Hindi" },
    { code: "ara", name: "Arabic" },
    { code: "urd", name: "Urdu" },
  ];

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (event) => {
      const items = event.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
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
  }, [showNotification]);

  const handleImageUpload = (e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      showNotification("Please use the converter tab for PDFs", "error");
    } 
    else if (file.type.startsWith("image/")) {
      setImage(URL.createObjectURL(file));
      setText("");
      showNotification("Image uploaded successfully!", "success");
    } 
    else {
      showNotification("Unsupported file type", "error");
    }

    e.target.value = null;
  };

  const handleLoadCloudImage = () => {
    if (!cloudImageUrl.trim()) {
      showNotification("Please enter an image URL", "error");
      return;
    }

    // Basic URL validation
    try {
      const url = new URL(cloudImageUrl);
      if (!url.protocol.startsWith("http")) {
        showNotification("URL must start with http:// or https://", "error");
        return;
      }
    } 
    catch (e) {
      showNotification("Invalid URL format", "error");
      return;
    }

    // Create an image element to check if it loads successfully
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Helps with CORS if the server allows it

    img.onload = () => {
      setImage(cloudImageUrl);
      setText("");
      showNotification("Cloud image loaded!", "success");
    };

    img.onerror = () => {
      showNotification("Failed to load image. Check URL or CORS restrictions.", "error");
    };

    img.src = cloudImageUrl;
  };

  const handleExtractText = async () => {
    if(!image){
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
    }
    catch(err){
      console.error("OCR Error:", err);
      setText("Error extracting text. Please try another image.");
      showNotification("Error extracting text", "error");
    }
    finally{
      setLoading(false);
    }
  };

  const handleDownloadText = () => {
    if(!text){
      showNotification("No text to download", "error");
      return;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "extracted-text.txt");
    showNotification("Text downloaded!", "success");
  };

  const triggerFileInput = () => fileInputRef.current.click();

  return (
    <div className="ocr-outer-container">

      <div className="ocr-container">

        {/* FILE UPLOAD SECTION */}
        <div className="upload-section">
          
          <div className="upload-options">
            <label className="upload-card">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }} // Better than className="hidden-input"
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
              <button onClick={handleLoadCloudImage} className="primary-button">
                Load
              </button>
            </div>

            <button
              className="upload-card"
              onClick={() =>
                showNotification("Copy an image and press Ctrl+V to paste", "info")
              }
            >
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
        
        {/* TEXT EXTRACTION SECTION */}
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

      <div className="ocr-info-sections">
        
        <div className="info-card security-info">
          <div className="info-icon">
            <FontAwesomeIcon icon={faShieldAlt} size="2x" />
          </div>
          <div className="info-content">
            <h3>Your Data is Protected</h3>
            <p>
              All image processing happens directly in your browser. We never send 
              your images or extracted text to our servers, ensuring complete privacy.
            </p>
          </div>
          <div className="info-image">
            <img src={ocrSecImg} alt="OCR security illustration" />
          </div>
        </div>

        <div className="info-card limitations-info">
          <div className="info-icon">
            <FontAwesomeIcon icon={faInfoCircle} size="2x" />
          </div>
          <div className="info-content">
            <h3>OCR Limitations</h3>
            <ul>
              <li>Works best with clear, high-contrast text</li>
              <li>May struggle with handwritten text</li>
              <li>Low-resolution images may produce errors</li>
              <li>Complex layouts might affect accuracy</li>
              <li>Language support varies; some languages may not be available</li>
              <li>Text extraction may not be 100% accurate</li>
              <li>Large images may take longer to process</li>
            </ul>
          </div>
          <div className="info-image">
            <img src={ocrLimitImg} alt="OCR limitations illustration" />
          </div>
        </div>

      </div>

    </div>
    
  );

};

export default OCR;