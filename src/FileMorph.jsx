import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileImage,
  faExchangeAlt,
} from "@fortawesome/free-solid-svg-icons";
import OCR from "./OCR.jsx";
import FileConverter from "./FileConverter.jsx";
import "./OCR.css";
import "./base-page.css";
import "./FileConverter.css";

const FileMorph = () => {
  const [activeTab, setActiveTab] = useState("ocr");
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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
          <OCR showNotification={showNotification} />
        ) 
        :(
          <FileConverter showNotification={showNotification} />
        )}
      </main>
      
    </div>
  );
};

export default FileMorph;