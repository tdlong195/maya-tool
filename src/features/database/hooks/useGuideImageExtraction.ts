import { Type } from "@google/genai";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { ai, isGeminiConfigured } from "../../../shared/services";
import type { GuideData } from "../../../shared/types/domain";
import { getGeminiErrorMessage } from "../helpers/errors";
import {
  fileToBase64,
  normalizeGender,
  supportedImageTypes,
} from "../helpers/geminiExtraction";
import type { ExtractedGuide } from "../types";

type UseGuideImageExtractionParams = {
  setGuideDraft: Dispatch<SetStateAction<GuideData>>;
  showNotice: (type: "success" | "error", message: string) => void;
};

export function useGuideImageExtraction({
  setGuideDraft,
  showNotice,
}: UseGuideImageExtractionParams) {
  const [extractingGuide, setExtractingGuide] = useState(false);

  const extractGuideFromImages = async (idCard: File, guideCard: File) => {
    if (!isGeminiConfigured()) {
      showNotice(
        "error",
        "Chưa cấu hình VITE_GEMINI_API_KEY trong file .env. Tạo .env từ .env.example rồi chạy lại npm run dev.",
      );
      return;
    }

    if (
      !supportedImageTypes.has(idCard.type) ||
      !supportedImageTypes.has(guideCard.type)
    ) {
      showNotice("error", "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }

    setExtractingGuide(true);
    try {
      const [idCardBase64, guideCardBase64] = await Promise.all([
        fileToBase64(idCard),
        fileToBase64(guideCard),
      ]);

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: `Trích xuất thông tin từ ảnh CCCD và thẻ hướng dẫn viên du lịch. Trả JSON thuần với các trường: fullName, gender, idNumber, dob, address, han_can_cuoc, guideCardNumber, guideCardExpire. Địa chỉ phải là nơi thường trú trên CCCD, không lấy quê quán.`,
              },
              { inlineData: { mimeType: idCard.type, data: idCardBase64 } },
              {
                inlineData: {
                  mimeType: guideCard.type,
                  data: guideCardBase64,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              gender: { type: Type.STRING },
              idNumber: { type: Type.STRING },
              dob: { type: Type.STRING },
              address: { type: Type.STRING },
              han_can_cuoc: { type: Type.STRING },
              guideCardNumber: { type: Type.STRING },
              guideCardExpire: { type: Type.STRING },
            },
          },
        },
      });

      const rawText = response.text || "{}";
      const jsonText =
        rawText.match(/```json\s*([\s\S]*?)```/i)?.[1] ||
        rawText.match(/```\s*([\s\S]*?)```/i)?.[1] ||
        rawText;
      const extracted = JSON.parse(jsonText.trim()) as ExtractedGuide;
      setGuideDraft((current) => ({
        ...current,
        Name: extracted.fullName || current.Name,
        Sex: normalizeGender(extracted.gender) || current.Sex,
        idNumber: extracted.idNumber || current.idNumber,
        DoB: extracted.dob || current.DoB,
        Address: extracted.address || current.Address,
        Expire: extracted.han_can_cuoc || current.Expire,
        GuideID: extracted.guideCardNumber || current.GuideID,
        GuideExpire: extracted.guideCardExpire || current.GuideExpire,
      }));
      showNotice("success", "Đã trích xuất thông tin HDV từ ảnh.");
    } catch (err) {
      console.error("Guide extraction error:", err);
      showNotice("error", getGeminiErrorMessage(err));
    } finally {
      setExtractingGuide(false);
    }
  };

  return {
    extractingGuide,
    extractGuideFromImages,
  };
}
