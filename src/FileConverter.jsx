import React, { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faFileWord,
  faFilePowerpoint,
  faFilePdf,
  faFileExcel,
  faFileImage,
  faExchangeAlt,
  faSpinner,
  faCheckCircle,
  faInfoCircle,
  faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";

const FileConverter = ({ showNotification }) => {
  const [fileToConvert, setFileToConvert] = useState(null);
  const [targetFormat, setTargetFormat] = useState("docx");
  const [conversionStatus, setConversionStatus] = useState("idle");
  const [supportedConversions, setSupportedConversions] = useState([]);
  const conversionInputRef = useRef(null);

  const ILovePDF_API_PUBLIC_KEY = "project_public_9174f892b6ec83a024f3dae2017dc220_Tf1esb22500f0c006a484d008748328a1aa39";
  const ILovePDF_API_URL = "https://api.ilovepdf.com/v1";

  const formatIcons = {
    docx: faFileWord,
    pptx: faFilePowerpoint,
    pdf: faFilePdf,
    xlsx: faFileExcel,
    jpg: faFileImage,
    pdfa: faFilePdf,
    doc: faFileWord,
    ppt: faFilePowerpoint,
    xls: faFileExcel,
    odt: faFileWord,
    odp: faFilePowerpoint,
    ods: faFileExcel
  };

  const formatNames = {
    docx: "Word",
    pptx: "PowerPoint",
    pdf: "PDF",
    xlsx: "Excel",
    jpg: "JPG Image",
    pdfa: "PDF/A",
    doc: "Word (Legacy)",
    ppt: "PowerPoint (Legacy)",
    xls: "Excel (Legacy)",
    odt: "OpenDocument Text",
    odp: "OpenDocument Presentation",
    ods: "OpenDocument Spreadsheet"
  };

  const getTool = (fromExt, toExt) => {
    const officeFiles = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods"];
    const pdfToImage = ["jpg"];
    
    if (officeFiles.includes(fromExt) && toExt === "pdf") {
      return "officepdf";
    }
    if (fromExt === "pdf" && pdfToImage.includes(toExt)) {
      return "pdfjpg";
    }
    if (fromExt === "pdf" && toExt === "pdfa") {
      return "pdfa";
    }
    if (officeFiles.includes(fromExt) && officeFiles.includes(toExt)) {
      return "officepdf"; // iLovePDF can handle some office-to-office conversions
    }
    return null;
  };

  useEffect(() => {
    if (fileToConvert) {
      const fromExt = fileToConvert.name.split(".").pop().toLowerCase();
      const possibleConversions = [];
      
      // Check all possible target formats
      const allFormats = Object.keys(formatIcons);
      allFormats.forEach(toExt => {
        if (getTool(fromExt, toExt)) {
          possibleConversions.push(toExt);
        }
      });
      
      setSupportedConversions(possibleConversions);
      
      // Reset target format if current selection isn't supported
      if (!possibleConversions.includes(targetFormat) && possibleConversions.length > 0) {
        setTargetFormat(possibleConversions[0]);
      }
    } else {
      setSupportedConversions([]);
    }
  }, [fileToConvert]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileToConvert(file);
    showNotification(`File ${file.name} ready for conversion`, "success");
  };

  const triggerConversionInput = () => conversionInputRef.current.click();

  const getToken = async () => {
    const res = await fetch(`${ILovePDF_API_URL}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ public_key: ILovePDF_API_PUBLIC_KEY }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Token fetch failed: ${errorText}`);
    }

    const data = await res.json();
    return data.token;
  };

  const handleConvert = async () => {
    if (!fileToConvert) {
      showNotification("Please select a file first", "error");
      return;
    }

    setConversionStatus("converting");

    try {
      const token = await getToken();
      const fromExt = fileToConvert.name.split(".").pop().toLowerCase();
      const toExt = targetFormat;
      const tool = getTool(fromExt, toExt);

      if (!tool) {
        throw new Error("This conversion is not supported");
      }

      // 1. Start Task
      const startRes = await fetch(`https://api.ilovepdf.com/v1/start/${tool}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!startRes.ok) throw new Error("Failed to start task");
      const { task, server } = await startRes.json();

      // 2. Upload File
      const formData = new FormData();
      formData.append("file", fileToConvert);
      formData.append("task", task);

      const uploadRes = await fetch(`https://${server}/v1/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("File upload failed");

      const uploadData = await uploadRes.json();
      const serverFilename = uploadData.server_filename;
      if (!serverFilename) {
        throw new Error("No server_filename received from upload");
      }

      // 3. Process
      const processRes = await fetch(`https://${server}/v1/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task,
          tool,
          files: [{
            server_filename: serverFilename,
            filename: fileToConvert.name,
          }],
        }),
      });

      if (!processRes.ok) throw new Error("Process failed");

      // 4. Download
      const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!downloadRes.ok) throw new Error("Download failed");

      const blob = await downloadRes.blob();
      saveAs(blob, `converted.${targetFormat}`);

      showNotification("Conversion successful!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Conversion failed: " + err.message, "error");
    } finally {
      setConversionStatus("idle");
    }
  };

  return (
    <div className="converter-container">
      <div className="converter-main">
        <div className="converter-card upload-section" onClick={triggerConversionInput}>
          <input
            type="file"
            accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.pdf"
            ref={conversionInputRef}
            onChange={handleFileUpload}
            className="hidden-input"
          />
          <div className="upload-icon">
            <FontAwesomeIcon icon={faUpload} size="3x" />
          </div>
          <h3>Select File to Convert</h3>
          <p>Click to browse or drag and drop</p>
          {fileToConvert && (
            <div className="file-preview">
              <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
              <span>{fileToConvert.name}</span>
              <div className="file-type-badge">
                {fileToConvert.name.split('.').pop().toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <div className="converter-card options-section">
          <div className="format-selector">
            <h3>Convert To:</h3>
            {supportedConversions.length > 0 ? (
              <div className="format-grid">
                {supportedConversions.map(format => (
                  <div
                    key={format}
                    className={`format-option ${targetFormat === format ? "active" : ""}`}
                    onClick={() => setTargetFormat(format)}
                  >
                    <FontAwesomeIcon icon={formatIcons[format]} className="format-icon" />
                    <span>{formatNames[format]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-formats-message">
                {fileToConvert ? (
                  <>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <p>No supported conversions for this file type</p>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <p>Select a file to see conversion options</p>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            className="convert-button"
            onClick={handleConvert}
            disabled={!fileToConvert || conversionStatus === "converting" || supportedConversions.length === 0}
          >
            {conversionStatus === "converting" ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Converting...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faExchangeAlt} /> Convert Now
              </>
            )}
          </button>
        </div>
      </div>

      <div className="info-sections">
        <div className="info-card warning-card">
          <div className="card-header">
            <FontAwesomeIcon icon={faExclamationTriangle} className="warning-icon" />
            <h3>Data Privacy Notice</h3>
          </div>
          <div className="card-content">
            <p>
              <strong>Important:</strong> Files are processed on external servers. For sensitive documents:
            </p>
            <ul>
              <li>Files are automatically deleted after processing</li>
              <li>HTTPS encryption is used for all transfers</li>
              <li>Maximum file retention: 2 hours</li>
              <li>Consider offline tools for confidential documents</li>
            </ul>
          </div>
        </div>

        <div className="info-card limitations-card">
          <div className="card-header">
            <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
            <h3>Supported Conversions</h3>
          </div>
          <div className="card-content">
            <p>We support these conversion paths:</p>
            <ul>
              <li><strong>Office to PDF:</strong> Word, Excel, PowerPoint (all versions)</li>
              <li><strong>PDF to JPG:</strong> Extract images from PDFs</li>
              <li><strong>PDF to PDF/A:</strong> Archival standard PDF</li>
              <li><strong>Between Office formats:</strong> Limited conversion</li>
            </ul>
            <div className="thanks-note">
              Using iLovePDF API - 50MB max file size, watermark on free tier.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileConverter;