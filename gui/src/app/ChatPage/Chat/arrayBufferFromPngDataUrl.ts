const arrayBufferFromPngDataUrl = (dataUrl: string) => {
  const parts = dataUrl.split(",");
  if (parts.length !== 2) {
    throw new Error("Invalid data URL");
  }
  const mime = parts[0].split(":")[1].split(";")[0];
  if (mime !== "image/png") {
    throw new Error("Unexpected MIME type: " + mime);
  }
  const data = parts[1];
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer;
};

export default arrayBufferFromPngDataUrl;
