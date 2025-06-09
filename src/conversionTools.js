export function getTool(fromExt, toExt) {
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
  return null; // unsupported
}
