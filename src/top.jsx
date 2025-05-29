import React, { useState } from "react";
import logo from "./assets/file-transfer.gif";

const Header = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Function to toggle the theme
  const toggleTheme = () => {
    const body = document.body;
    body.classList.toggle("dark-mode");
    setIsDarkMode(!isDarkMode);
    // save preference
    
  };

  return (
    <header>
      <img
        src={logo}
        alt="Logo"
        style={{ height: "50px", width: "50px", borderRadius: "20%" }}
      />
      <h1>OCR Text Extraction</h1>
      <div
        className={`theme-switch ${isDarkMode ? "active" : ""}`}
        onClick={toggleTheme}
      ></div>
    </header>
  );
};

export default Header;