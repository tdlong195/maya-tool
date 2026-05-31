import { saveAs } from "file-saver";

export { saveAs };

export const downloadBlob = (blob: Blob, filename: string) => {
  saveAs(blob, filename);
};
