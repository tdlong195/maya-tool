import { ThinkingLevel } from "@google/genai";
import { useState } from "react";
import mammoth from "mammoth";
import { ai } from "../../../shared/services/gemini";
import { buildCarServicePrompt } from "../helpers/carServicePrompt";

export function useCarServiceProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (fileToProcess: File) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const extracted = await mammoth.extractRawText({
        arrayBuffer: await fileToProcess.arrayBuffer(),
      });
      const text = extracted.value;
      if (!text.trim()) {
        throw new Error("Không thể trích xuất nội dung từ file.");
      }

      const response = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: buildCarServicePrompt(text) }] }],
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });

      let fullText = "";
      for await (const chunk of response) {
        fullText += chunk.text;
        setResult(fullText);
      }
    } catch (err) {
      console.error("Car service processing error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi xử lý file dịch vụ xe.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const acceptFile = (nextFile?: File) => {
    if (!nextFile) return;
    if (!nextFile.name.endsWith(".doc") && !nextFile.name.endsWith(".docx")) {
      setError("Vui lòng tải lên file .doc hoặc .docx");
      return;
    }
    setFile(nextFile);
    processFile(nextFile);
  };

  return {
    acceptFile,
    error,
    file,
    isDragging,
    isProcessing,
    result,
    setIsDragging,
  };
}
