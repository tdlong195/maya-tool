/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Type } from "@google/genai";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ai } from "../../shared/services/gemini";
import type { ExtractedData } from "../../shared/types/domain";

export function GuideContractFeature() {
  const [idCard, setIdCard] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [guideCard, setGuideCard] = useState<File | null>(null);
  const [guidePreview, setGuidePreview] = useState<string | null>(null);
  const [sdt, setSdt] = useState("");
  const [stk, setStk] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingId, setIsDraggingId] = useState(false);
  const [isDraggingGuide, setIsDraggingGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedData | null>(null);
  const [copied, setCopied] = useState(false);

  const idInputRef = useRef<HTMLInputElement>(null);
  const guideInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
    previewSetter?: (s: string | null) => void,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setter(file);
      if (previewSetter && file.type.startsWith("image/")) {
        previewSetter(URL.createObjectURL(file));
      }
      setError(null);
      e.target.value = ""; // Reset to allow selecting the same file again
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    setter: (f: File | null) => void,
    dragSetter: (b: boolean) => void,
    previewSetter?: (s: string | null) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragSetter(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setter(file);
      if (previewSetter && file.type.startsWith("image/")) {
        previewSetter(URL.createObjectURL(file));
      }
      setError(null);
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent,
    setter: (f: File | null) => void,
    previewSetter?: (s: string | null) => void,
  ) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1 || items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) {
          setter(file);
          if (previewSetter && file.type.startsWith("image/")) {
            previewSetter(URL.createObjectURL(file));
          }
          setError(null);
          return;
        }
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processContract = async () => {
    if (!idCard || !guideCard) {
      setError("Vui lòng tải lên đầy đủ 2 ảnh thẻ.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Extract data from images using Gemini
      const idCardBase64 = await fileToBase64(idCard);
      const guideCardBase64 = await fileToBase64(guideCard);

      const prompt = `
        Hãy trích xuất thông tin từ 2 ảnh sau:
        Ảnh 1: Căn cước công dân (CCCD).
        Ảnh 2: Thẻ hướng dẫn viên du lịch.

        Yêu cầu trả về JSON với các trường sau:
        - fullName: Họ và tên (từ CCCD hoặc thẻ HDV)
        - gender: Giới tính (M hoặc F)
        - idNumber: Số CCCD
        - dob: Ngày tháng năm sinh (định dạng dd/mm/yyyy)
        - address: ĐỊA CHỈ THƯỜNG TRÚ. Đây là trường QUAN TRỌNG NHẤT. Trên CCCD, hãy tìm mục ghi là "Nơi thường trú" hoặc "Thường trú". Hãy lấy ĐẦY ĐỦ địa chỉ bao gồm số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố. TUYỆT ĐỐI không lấy mục "Quê quán".
        - han_can_cuoc: Ngày hết hạn của CCCD (định dạng dd/mm/yyyy)
        - guideCardNumber: Số thẻ hướng dẫn viên
        - guideCardExpire: Ngày hết hạn thẻ HDV (định dạng dd/mm/yyyy)
        
        Nếu không tìm thấy thông tin nào, hãy để trống.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: idCard.type, data: idCardBase64 } },
              {
                inlineData: { mimeType: guideCard.type, data: guideCardBase64 },
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

      let extractedData: ExtractedData;
      try {
        extractedData = JSON.parse(response.text || "{}") as ExtractedData;
      } catch (e) {
        console.error("JSON Parse Error:", e, response.text);
        setError("Lỗi khi đọc dữ liệu từ AI. Vui lòng thử lại.");
        setIsProcessing(false);
        return;
      }

      setExtractedInfo({
        ...extractedData,
        gender:
          extractedData.gender?.toLowerCase().includes("nam") ||
            extractedData.gender === "M"
            ? "M"
            : extractedData.gender?.toLowerCase().includes("nữ") ||
              extractedData.gender === "F"
              ? "F"
              : extractedData.gender,
        sdt,
        stk,
      });
    } catch (err) {
      console.error("General Error:", err);
      setError("Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearNewGuide = () => {
    setIdCard(null);
    setIdPreview(null);
    setGuideCard(null);
    setGuidePreview(null);
    setSdt("");
    setStk("");
    setExtractedInfo(null);
    setError(null);
  };

  const copyToClipboard = () => {
    if (!extractedInfo) return;

    const rowData = [
      extractedInfo.fullName || "",
      extractedInfo.address || "",
      extractedInfo.dob || "",
      extractedInfo.gender || "",
      extractedInfo.idNumber || "",
      extractedInfo.han_can_cuoc || "",
      extractedInfo.guideCardNumber || "",
      extractedInfo.guideCardExpire || "",
      extractedInfo.sdt || "",
      extractedInfo.stk || "",
    ].join("\t");

    navigator.clipboard.writeText(rowData).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
            <motion.div
              key="new-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* ID Card Upload */}
                <div
                  className={`bg-white p-6 rounded-3xl shadow-sm border transition-all flex flex-col items-center text-center relative overflow-hidden group outline-none focus:ring-2 focus:ring-amber-500/20 ${isDraggingId ? "border-amber-500 bg-amber-50 ring-4 ring-amber-500/10" : "border-black/5"}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingId(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingId(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingId(false);
                  }}
                  onDrop={(e) =>
                    handleDrop(e, setIdCard, setIsDraggingId, setIdPreview)
                  }
                  onPaste={(e) => handlePaste(e, setIdCard, setIdPreview)}
                  tabIndex={0}
                >
                  {idPreview ? (
                    <div className="absolute inset-0 w-full h-full">
                      <img
                        src={idPreview}
                        alt="ID Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => idInputRef.current?.click()}
                          className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/30"
                        >
                          Thay đổi ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${isDraggingId ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600"}`}
                      >
                        <ImageIcon size={24} />
                      </div>
                      <h3 className="font-medium mb-2">Ảnh CCCD</h3>
                      <button
                        onClick={() => idInputRef.current?.click()}
                        className={`w-full py-3 px-4 rounded-xl border-2 border-dashed transition-all ${idCard ? "border-emerald-500 bg-emerald-50 text-emerald-700" : isDraggingId ? "border-amber-500 bg-amber-100/50" : "border-gray-200 hover:border-amber-400"}`}
                      >
                        {idCard ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle2 size={18} /> {idCard.name}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Upload size={18} />{" "}
                            {isDraggingId
                              ? "Thả ảnh vào đây"
                              : "Chọn hoặc kéo thả"}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                  <input
                    type="file"
                    ref={idInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange(e, setIdCard, setIdPreview)
                    }
                  />
                </div>

                {/* Guide Card Upload */}
                <div
                  className={`bg-white p-6 rounded-3xl shadow-sm border transition-all flex flex-col items-center text-center relative overflow-hidden group outline-none focus:ring-2 focus:ring-emerald-500/20 ${isDraggingGuide ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10" : "border-black/5"}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingGuide(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingGuide(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingGuide(false);
                  }}
                  onDrop={(e) =>
                    handleDrop(
                      e,
                      setGuideCard,
                      setIsDraggingGuide,
                      setGuidePreview,
                    )
                  }
                  onPaste={(e) => handlePaste(e, setGuideCard, setGuidePreview)}
                  tabIndex={0}
                >
                  {guidePreview ? (
                    <div className="absolute inset-0 w-full h-full">
                      <img
                        src={guidePreview}
                        alt="Guide Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => guideInputRef.current?.click()}
                          className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/30"
                        >
                          Thay đổi ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${isDraggingGuide ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"}`}
                      >
                        <ImageIcon size={24} />
                      </div>
                      <h3 className="font-medium mb-2">Thẻ Hướng Dẫn Viên</h3>
                      <button
                        onClick={() => guideInputRef.current?.click()}
                        className={`w-full py-3 px-4 rounded-xl border-2 border-dashed transition-all ${guideCard ? "border-emerald-500 bg-emerald-50 text-emerald-700" : isDraggingGuide ? "border-emerald-500 bg-emerald-100/50" : "border-gray-200 hover:border-emerald-400"}`}
                      >
                        {guideCard ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle2 size={18} /> {guideCard.name}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Upload size={18} />{" "}
                            {isDraggingGuide
                              ? "Thả ảnh vào đây"
                              : "Chọn hoặc kéo thả"}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                  <input
                    type="file"
                    ref={guideInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange(e, setGuideCard, setGuidePreview)
                    }
                  />
                </div>
              </div>

              {/* Manual Inputs Section */}
              <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-secondary/5 border border-black/5 mb-8">
                <h2 className="text-xl font-serif italic text-secondary mb-6">
                  Thông tin bổ sung
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-slate-400 font-bold ml-1">
                      Số điện thoại (sdt)
                    </label>
                    <input
                      type="text"
                      value={sdt}
                      onChange={(e) => setSdt(e.target.value)}
                      placeholder="Nhập số điện thoại..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-slate-400 font-bold ml-1">
                      Số tài khoản (stk)
                    </label>
                    <input
                      type="text"
                      value={stk}
                      onChange={(e) => setStk(e.target.value)}
                      placeholder="Nhập số tài khoản..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={processContract}
                    disabled={isProcessing || !idCard || !guideCard}
                    className="bg-primary text-white px-12 py-4 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3 shadow-2xl shadow-primary/30"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin" /> Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Sparkles size={22} className="text-accent" />
                        Trích xuất thông tin HDV
                      </>
                    )}
                  </button>

                  {(idCard || guideCard || extractedInfo || sdt || stk) && (
                    <button
                      onClick={handleClearNewGuide}
                      className="bg-white text-red-600 border border-red-200 px-8 py-4 rounded-full font-medium text-lg hover:bg-red-50 active:scale-95 transition-all flex items-center gap-3 shadow-md"
                    >
                      <Trash2 size={20} /> Xoá tất cả
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm"
                    >
                      <AlertCircle size={16} /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Results Section */}
              <AnimatePresence>
                {extractedInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 bg-white p-8 rounded-[2rem] shadow-lg border border-black/5 overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                      <div>
                        <h2 className="text-2xl font-serif italic">
                          Thông tin HDV đã trích xuất
                        </h2>
                        <p className="text-sm text-gray-500">
                          Kết quả từ AI và thông tin nhập tay
                        </p>
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-lg active:scale-95 ${copied
                          ? "bg-emerald-500 text-white shadow-emerald-500/20"
                          : "bg-primary text-white hover:bg-opacity-90 shadow-primary/20"
                          }`}
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 size={18} />
                            Đã copy!
                          </>
                        ) : (
                          <>
                            <Copy size={18} />
                            Copy hàng dữ liệu
                          </>
                        )}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                          <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                            <th className="px-4 py-3 font-bold">Name</th>
                            <th className="px-4 py-3 font-bold">Address</th>
                            <th className="px-4 py-3 font-bold">DoB</th>
                            <th className="px-4 py-3 font-bold">Sex</th>
                            <th className="px-4 py-3 font-bold">Số căn cước</th>
                            <th className="px-4 py-3 font-bold">
                              Hạn căn cước
                            </th>
                            <th className="px-4 py-3 font-bold">Số thẻ HDV</th>
                            <th className="px-4 py-3 font-bold">Hạn thẻ HDV</th>
                            <th className="px-4 py-3 font-bold">SDT</th>
                            <th className="px-4 py-3 font-bold">STK</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-sm font-bold">
                              {extractedInfo.fullName}
                            </td>
                            <td
                              className="px-4 py-4 text-sm max-w-[200px] truncate"
                              title={extractedInfo.address}
                            >
                              {extractedInfo.address}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {extractedInfo.dob}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {extractedInfo.gender}
                            </td>
                            <td className="px-4 py-4 text-sm font-mono">
                              {extractedInfo.idNumber}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {extractedInfo.han_can_cuoc}
                            </td>
                            <td className="px-4 py-4 text-sm font-mono">
                              {extractedInfo.guideCardNumber}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {extractedInfo.guideCardExpire}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {extractedInfo.sdt}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {extractedInfo.stk}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
  );
}
