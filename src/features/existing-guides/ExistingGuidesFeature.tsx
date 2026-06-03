/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { GuideEditorModal } from "../../shared/components";
import { ai, appDatabase, localDatabase } from "../../shared/services";
import type { GuideData } from "../../shared/types/domain";
import { isExpired, removeAccents } from "../../shared/utils";

export function ExistingGuidesFeature() {
  const tourInfoRef = useRef<HTMLDivElement>(null);
  const guideListInputRef = useRef<HTMLInputElement>(null);

  const [guideList, setGuideList] = useState<GuideData[]>(() =>
    localDatabase.getGuides(),
  );
  const [isDraggingGuideList, setIsDraggingGuideList] = useState(false);
  const [guideSearch, setGuideSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [selectedGuides, setSelectedGuides] = useState<GuideData[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tourProgramText, setTourProgramText] = useState("");
  const [tourCode, setTourCode] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [tourType, setTourType] = useState<"classic" | "cruise">("classic");
  const [guideTourPrograms, setGuideTourPrograms] = useState<{ [key: string]: string }>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [isAddGuideOpen, setIsAddGuideOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ show: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 5000);
  };

  const scrollToTourInfo = () => {
    if (isScrolledDown) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    tourInfoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    appDatabase
      .getGuides()
      .then(setGuideList)
      .catch((err) => {
        console.error("Failed to load guides:", err);
        showToast("Không tải được dữ liệu HDV từ database.", "error");
      });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!tourInfoRef.current) {
        setIsScrolledDown(false);
        return;
      }
      const rect = tourInfoRef.current.getBoundingClientRect();
      setIsScrolledDown(rect.top < 150);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [selectedGuides.length]);

  useEffect(() => {
    if (!isAddGuideOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAddGuideOpen]);

  const handleSaveNewGuide = (guide: GuideData) => {
    const next = [guide, ...guideList];
    setGuideList(next);
    appDatabase.saveGuides(next).catch((err) => {
      console.error("Failed to save guide:", err);
      showToast("Không lưu được HDV vào database.", "error");
    });
    setIsAddGuideOpen(false);
    showToast("Đã thêm HDV vào Database.");
  };

  const handleExportTourOrder = async () => {
    if (!tourCode.trim()) {
      setError("Vui lòng nhập Tour Code.");
      return;
    }

    if (tourType === "classic" && selectedGuides.length > 1) {
      const missingProgram = selectedGuides.some(
        (g) => !(guideTourPrograms[g.Id] || "").trim(),
      );
      if (missingProgram) {
        setError("Vui lòng nhập chương trình tour cho tất cả HDV.");
        return;
      }
    } else {
      if (!tourProgramText.trim()) {
        setError("Vui lòng nhập chương trình tour.");
        return;
      }
    }

    setIsExporting(true);
    setError(null);

    try {
      const fetchArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
        const res = await fetch(url);
        if (!res.ok)
          throw new Error(
            `Không thể tìm thấy file template tại ${url}. Hãy đảm bảo file đã được lưu trong folder public/templates/`,
          );
        return await res.arrayBuffer();
      };

      const processProgram = async (text: string) => {
        let final = text;
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Dịch nội dung chương trình tour sau sang tiếng Việt. Nếu nội dung đã là tiếng Việt, hãy giữ nguyên và chỉ sửa lỗi chính tả nếu có. ĐẶC BIỆT: Hãy loại bỏ tất cả các cụm từ "(Details)" hoặc "(Chi tiết)" nếu chúng xuất hiện ở cuối các đoạn văn hoặc cuối các ngày. Trả về kết quả là văn bản thuần túy, không thêm bất kỳ giải thích nào khác.\n\nNội dung:\n${text}`,
          });
          if (response.text) {
            final = response.text.trim();
          }
        } catch (err) {
          console.error("Translation error:", err);
        }
        return final
          .replace(/\(Details\)/gi, "")
          .replace(/\(Chi tiết\)/gi, "")
          .trim();
      };

      const now = new Date();
      const day = now.getDate().toString().padStart(2, "0");
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear().toString();

      const tourOrderContent = await fetchArrayBuffer(
        "/lenhdieutour_template.docx",
      );

      if (tourType === "classic" && selectedGuides.length > 1) {
        // Multiple files mode
        for (let i = 0; i < selectedGuides.length; i++) {
          const guide = selectedGuides[i];
          const rawProgram = guideTourPrograms[guide.Id] || "";
          const finalProgram = await processProgram(rawProgram);

          const tourOrderData = {
            day,
            month,
            year,
            guest_count: guestCount || "...",
            start_date: startDate
              ? new Date(startDate).toLocaleDateString("vi-VN")
              : "...",
            end_date: endDate
              ? new Date(endDate).toLocaleDateString("vi-VN")
              : "...",
            program: finalProgram,
            guides: [
              {
                stt: 1,
                name: guide.Name,
                phone: guide.sdt || "...",
                guide_id: guide.GuideID || guide.Id,
                expire: guide.GuideExpire || "...",
              },
            ],
          };

          const tourOrderZip = new PizZip(tourOrderContent);
          const tourOrderDoc = new Docxtemplater(tourOrderZip, {
            paragraphLoop: true,
            linebreaks: true,
          });
          tourOrderDoc.render(tourOrderData);
          const tourOrderBlob = tourOrderDoc.getZip().generate({
            type: "blob",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });

          // Add delay between downloads
          if (i > 0)
            await new Promise((resolve) => setTimeout(resolve, i * 500));
          saveAs(tourOrderBlob, `5 Lenh dieu tour - ${guide.Name}.docx`);
        }
      } else {
        // Single file mode
        const finalProgram = await processProgram(tourProgramText);
        const tourOrderData = {
          day,
          month,
          year,
          guest_count: guestCount || "...",
          start_date: startDate
            ? new Date(startDate).toLocaleDateString("vi-VN")
            : "...",
          end_date: endDate
            ? new Date(endDate).toLocaleDateString("vi-VN")
            : "...",
          program: finalProgram,
          guides: selectedGuides.map((guide, index) => ({
            stt: index + 1,
            name: guide.Name,
            phone: guide.sdt || "...",
            guide_id: guide.GuideID || guide.Id,
            expire: guide.GuideExpire || "...",
          })),
        };

        const tourOrderZip = new PizZip(tourOrderContent);
        const tourOrderDoc = new Docxtemplater(tourOrderZip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        tourOrderDoc.render(tourOrderData);
        const tourOrderBlob = tourOrderDoc.getZip().generate({
          type: "blob",
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
        saveAs(tourOrderBlob, `5 Lenh dieu tour.docx`);
      }

      // 3. Generate Contracts - Fetching from public folder
      try {
        const contractContent = await fetchArrayBuffer(
          "/hopdong_template.docx",
        );

        for (let i = 0; i < selectedGuides.length; i++) {
          const guide = selectedGuides[i];
          const contractZip = new PizZip(contractContent);
          const contractDoc = new Docxtemplater(contractZip, {
            paragraphLoop: true,
            linebreaks: true,
          });

          const contractData = {
            ngay: day,
            thang: month,
            nam: year,
            fullName:
              (guide.Sex.toLowerCase() === "m" ? "Ông " : "Bà ") + guide.Name,
            gender: guide.Sex || "...",
            address: guide.Address || "...",
            idNumber: guide.idNumber || "...",
            han_can_cuoc: guide.Expire || "...",
            dob: guide.DoB || "...",
            sdt: guide.sdt || "...",
            guideCardNumber: guide.GuideID || "...",
            guideCardExpire: guide.GuideExpire || "...",
            stk: guide.stk || "...",
            startDate: startDate
              ? new Date(startDate).toLocaleDateString("vi-VN")
              : "...",
            endDate: endDate
              ? new Date(endDate).toLocaleDateString("vi-VN")
              : "...",
          };

          contractDoc.render(contractData);
          const contractBlob = contractDoc.getZip().generate({
            type: "blob",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });

          // Add delay between downloads to prevent browser blocking
          await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
          saveAs(
            contractBlob,
            `1 Hop dong - ${guide.Name.replace(/\s+/g, " ")}.docx`,
          );
        }
      } catch (contractErr) {
        console.warn("Contract template not found or error:", contractErr);
        // We still processed the tour order, so we don't throw error here if contract fails
      }

      // 4. Generate Advance Payment & Liquidation Excel
      try {
        const advanceTemplateContent = await fetchArrayBuffer(
          "/tamung_template.xlsx",
        );
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(advanceTemplateContent);

        const templateSheet = workbook.getWorksheet(1);
        if (templateSheet) {
          for (let i = 0; i < selectedGuides.length; i++) {
            const guide = selectedGuides[i];
            const sheetName = guide.Name.substring(0, 31).replace(
              /[\[\]\?\*\\\/]/g,
              "",
            );

            // ALWAYS create a NEW worksheet to maintain the template pristine for the next iteration
            const currentSheet = workbook.addWorksheet(sheetName);

            // Copy sheet global properties & page setup (Crucial for printing and format)
            if (templateSheet.properties) {
              currentSheet.properties = templateSheet.properties;
            }
            if (templateSheet.pageSetup) {
              currentSheet.pageSetup = templateSheet.pageSetup;
            }
            if (templateSheet.views) {
              currentSheet.views = templateSheet.views;
            }

            // Copy column properties
            if (templateSheet.columns) {
              currentSheet.columns = templateSheet.columns.map((col) => {
                return {
                  header: col.header,
                  key: col.key,
                  width: col.width,
                  style: col.style,
                  hidden: col.hidden,
                  outlineLevel: col.outlineLevel,
                };
              });
            }

            // Copy rows and styles
            templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
              const newRow = currentSheet.getRow(rowNumber);
              newRow.height = row.height;
              // Copy row style if exists
              try {
                if ((row as any).style) {
                  (newRow as any).style = (row as any).style;
                }
              } catch (e) {
                console.warn("Row style copy error:", e);
              }

              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const newCell = newRow.getCell(colNumber);
                newCell.value = cell.value;
                // Copy style directly to preserve all formatting including fonts
                if (cell.style) {
                  newCell.style = cell.style;
                }
              });
            });

            // Copy merges
            const model = (templateSheet as any).model;
            if (model && model.merges) {
              model.merges.forEach((merge: string) => {
                currentSheet.mergeCells(merge);
              });
            }

            // Replace placeholders in the NEW sheet
            currentSheet.eachRow((row) => {
              row.eachCell((cell) => {
                if (cell.value && typeof cell.value === "string") {
                  let val = cell.value;
                  if (val.includes("{hdv_name}")) {
                    val = val.replace(/{hdv_name}/g, guide.Name);
                  }
                  if (val.includes("{stk_hdv}")) {
                    val = val.replace(/{stk_hdv}/g, guide.stk || "...");
                  }
                  if (val.includes("{tour_code}")) {
                    val = val.replace(/{tour_code}/g, tourCode);
                  }
                  cell.value = val;
                }
              });
            });
          }

          // Delete the original template sheet so it doesn't appear in the final file
          workbook.removeWorksheet(templateSheet.id);

          const buffer = await workbook.xlsx.writeBuffer();
          const advanceBlob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          await new Promise((resolve) => setTimeout(resolve, 500));
          saveAs(advanceBlob, `4 Tạm ứng - Quyết toán tour.xlsx`);
        }
      } catch (advanceErr) {
        console.error("Advance Excel error:", advanceErr);
      }

      setIsExporting(false);
      showToast("Xuất hồ sơ guide thành công!");
    } catch (err: any) {
      console.error("Export error:", err);
      setError(`Lỗi khi xuất file: ${err.message}`);
      setIsExporting(false);
      showToast("Lỗi khi xuất hồ sơ guide", "error");
    }
  };

  const handleGuideListUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as GuideData[];
      setGuideList(json);
      appDatabase.saveGuides(json).catch((err) => {
        console.error("Failed to save uploaded guides:", err);
        showToast("Không lưu được danh sách HDV vào database.", "error");
      });
      setError(null);
    };
    reader.readAsBinaryString(file);
  };

  const toggleGuideSelection = (guide: GuideData) => {
    setSelectedGuides((prev) => {
      const isSelected = prev.some((g) => g.Id === guide.Id);
      if (isSelected) {
        setGuideTourPrograms((p) => {
          const newP = { ...p };
          delete newP[guide.Id];
          return newP;
        });
        return prev.filter((g) => g.Id !== guide.Id);
      } else {
        const guideExpired = guide.GuideExpire && isExpired(guide.GuideExpire);
        const cccdExpired = guide.Expire && isExpired(guide.Expire);

        // if (guideExpired && cccdExpired) {
        //   alert("HDV này có CCCD và thẻ HDV đã hết hạn. Vui lòng cập nhật lại");
        // } else if (cccdExpired) {
        //   alert(
        //     "HDV này có thông tin căn cước công dân đã hết hạn. Vui lòng cập nhật lại.",
        //   );
        // } else if (guideExpired) {
        //   alert(
        //     "HDV này có thông tin thẻ HDV đã hết hạn. Vui lòng cập nhật lại.",
        //   );
        // }

        return [...prev, guide];
      }
    });
  };

  const hasRequiredTourProgram =
    tourType === "classic" && selectedGuides.length > 1
      ? selectedGuides.every((guide) =>
        (guideTourPrograms[guide.Id] || "").trim(),
      )
      : tourProgramText.trim();

  const isTourFormComplete =
    selectedGuides.length > 0 &&
    tourCode.trim() &&
    startDate &&
    endDate &&
    guestCount &&
    parseInt(guestCount) > 0 &&
    hasRequiredTourProgram;

  return (
    <>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-2xl text-sm border border-red-100"
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
            <motion.div
              key="existing-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {guideList.length === 0 ? (
                <div
                  className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-8 text-center shadow-sm transition-all outline-none focus:ring-4 focus:ring-primary/10 ${
                    isDraggingGuideList
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingGuideList(true);
                  }}
                  onDragLeave={() => setIsDraggingGuideList(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingGuideList(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleGuideListUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => guideListInputRef.current?.click()}
                  tabIndex={0}
                >
                  <input
                    type="file"
                    ref={guideListInputRef}
                    className="hidden"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleGuideListUpload(e.target.files[0]);
                        e.target.value = ""; // Reset to allow selecting the same file again
                      }
                    }}
                  />
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-105">
                    <Upload size={32} />
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-slate-950">
                    Tải lên danh sách HDV
                  </h2>
                  <p className="mx-auto max-w-md text-sm leading-6 text-slate-500">
                    Kéo thả file Excel (.xlsx) hoặc CSV chứa thông tin hướng dẫn
                    viên để bắt đầu.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                      <div className="flex flex-col gap-3 md:flex-row">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Nhập tên HDV..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-primary/10"
                            value={guideSearch}
                            onChange={(e) => setGuideSearch(e.target.value)}
                          />
                          <Users
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                          />
                        </div>
                        <select
                          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-primary/10"
                          value={cityFilter}
                          onChange={(e) => setCityFilter(e.target.value)}
                        >
                          <option value="">Tất cả thành phố</option>
                          {Array.from(new Set(guideList.map((g) => g.City)))
                            .filter(Boolean)
                            .map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                          {(guideSearch || cityFilter) && (
                            <button
                              onClick={() => {
                                setGuideSearch("");
                                setCityFilter("");
                              }}
                              className="h-11 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
                            >
                              Xóa lọc
                            </button>
                          )}
                          {selectedGuides.length > 0 && (
                            <button
                              onClick={() => setSelectedGuides([])}
                              className="h-11 rounded-xl border border-amber-200/50 bg-amber-100 px-4 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-200"
                            >
                              Xoá guides đã chọn
                            </button>
                          )}
                        </div>
                      </div>

                      {(guideSearch || cityFilter) && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-primary font-bold">
                          <CheckCircle2 size={14} />
                          Tìm thấy{" "}
                          {
                            guideList.filter((g) => {
                              const searchLower = removeAccents(
                                guideSearch.toLowerCase(),
                              );
                              const nameLower = removeAccents(
                                (g.Name || "").toLowerCase(),
                              );
                              const matchesSearch =
                                !guideSearch ||
                                nameLower.includes(searchLower) ||
                                g.Id?.toString().includes(guideSearch);
                              const matchesCity =
                                !cityFilter || g.City === cityFilter;
                              return matchesSearch && matchesCity;
                            }).length
                          }{" "}
                          hướng dẫn viên
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      {!guideSearch && !cityFilter ? (
                        <div className="p-12 text-center">
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                            <Users className="text-gray-300" size={32} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-950">
                            Sẵn sàng tìm kiếm
                          </h3>
                          <p className="text-sm text-slate-500">
                            Vui lòng nhập tên, ID hoặc chọn thành phố để lọc
                            danh sách HDV.
                          </p>
                          <button
                            onClick={() => setIsAddGuideOpen(true)}
                            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
                          >
                            <UserPlus size={18} />
                            Thêm mới HDV
                          </button>
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                              <th className="px-6 py-4 font-semibold">ID</th>
                              <th className="px-6 py-4 font-semibold">
                                Thành phố
                              </th>
                              <th className="px-6 py-4 font-semibold">
                                Họ và tên
                              </th>
                              <th className="px-6 py-4 font-semibold">
                                Số điện thoại
                              </th>
                              <th className="px-6 py-4 font-semibold">CCCD</th>
                              <th className="px-6 py-4 font-semibold">
                                Thẻ HDV
                              </th>
                              <th className="px-6 py-4 font-semibold">
                                Hành động
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {guideList
                              .filter((g) => {
                                const searchLower = removeAccents(
                                  guideSearch.toLowerCase(),
                                );
                                const nameLower = removeAccents(
                                  (g.Name || "").toLowerCase(),
                                );
                                const matchesSearch =
                                  !guideSearch ||
                                  nameLower.includes(searchLower) ||
                                  g.Id?.toString().includes(guideSearch);
                                const matchesCity =
                                  !cityFilter || g.City === cityFilter;
                                return matchesSearch && matchesCity;
                              })
                              .map((guide, idx) => {
                                const isSelected = selectedGuides.some(
                                  (g) => g.Id === guide.Id,
                                );
                                const guideExpired =
                                  guide.GuideExpire &&
                                  isExpired(guide.GuideExpire);
                                const cccdExpired =
                                  guide.Expire && isExpired(guide.Expire);
                                const isRowExpired =
                                  guideExpired || cccdExpired;

                                return (
                                  <tr
                                    key={idx}
                                    className={`hover:bg-primary/5 transition-colors cursor-pointer ${isSelected ? "bg-primary/10" : ""
                                      } ${isRowExpired ? "bg-red-50/80 text-red-900 border-l-4 border-l-red-500" : ""}`}
                                    onClick={() => toggleGuideSelection(guide)}
                                  >
                                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? "bg-primary border-primary" : "border-slate-200 bg-white"}`}
                                        >
                                          {isSelected && (
                                            <CheckCircle2
                                              size={14}
                                              className="text-white"
                                            />
                                          )}
                                        </div>
                                        {guide.Id}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                      <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                                        {guide.City}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold">
                                      {guide.Name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                      {guide.sdt}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                      <div className="flex flex-col">
                                        <span className="font-mono">
                                          {guide.idNumber}
                                        </span>
                                        <span
                                          className={`text-[10px] ${isExpired(guide.Expire) ? "text-red-500 font-bold" : "opacity-50"}`}
                                        >
                                          Hết hạn: {guide.Expire}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                      <div className="flex flex-col">
                                        <span className="font-mono">
                                          {guide.GuideID}
                                        </span>
                                        <span
                                          className={`text-[10px] ${isExpired(guide.GuideExpire) ? "text-red-500 font-bold" : "opacity-50"}`}
                                        >
                                          Hết hạn: {guide.GuideExpire}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                      <button
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isSelected
                                          ? "bg-amber-100 text-amber-800 border border-amber-200/50 hover:bg-amber-200"
                                          : "bg-white border border-primary/20 text-primary hover:bg-primary hover:text-white"
                                          }`}
                                      >
                                        {isSelected ? "Bỏ chọn" : "Chọn"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            {guideList.filter((g) => {
                              const searchLower = removeAccents(
                                guideSearch.toLowerCase(),
                              );
                              const nameLower = removeAccents(
                                (g.Name || "").toLowerCase(),
                              );
                              const matchesSearch =
                                !guideSearch ||
                                nameLower.includes(searchLower) ||
                                g.Id?.toString().includes(guideSearch);
                              const matchesCity =
                                !cityFilter || g.City === cityFilter;
                              return matchesSearch && matchesCity;
                            }).length === 0 && (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="px-6 py-20 text-center text-gray-500"
                                  >
                                    <div className="flex flex-col items-center gap-4">
                                      <div>
                                        Không tìm thấy hướng dẫn viên nào khớp với tìm
                                        kiếm.
                                      </div>
                                      <button
                                        onClick={() => setIsAddGuideOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20"
                                      >
                                        <UserPlus size={18} />
                                        Thêm mới HDV
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {selectedGuides.length > 0 && (
                      <div
                        ref={tourInfoRef}
                        className="flex items-center justify-between bg-secondary px-5 py-4 text-white shadow-inner"
                      >
                        <div>
                          <p className="text-xs opacity-80 uppercase tracking-widest font-bold">
                            Đã chọn {selectedGuides.length} hướng dẫn viên
                          </p>
                          <h3 className="mt-1 max-w-2xl truncate text-lg font-bold">
                            {selectedGuides.map((g) => g.Name).join(", ")}
                          </h3>
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {selectedGuides.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-slate-200 bg-slate-50/70 p-5"
                        >
                          <div className="mx-auto max-w-3xl">
                            {!isTourFormComplete && (
                                <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                  <AlertCircle size={20} />
                                  <span className="font-bold">
                                    Vui lòng điền đầy đủ các thông tin bên dưới.
                                  </span>
                                </div>
                              )}

                            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Số lượng khách
                                  <span className="text-red-700">(*)</span>
                                </label>
                                <input
                                  type="number"
                                  placeholder="Số lượng khách"
                                  className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 ${!guestCount || parseInt(guestCount) <= 0
                                    ? "border-red-500 border-2 text-gray-400"
                                    : "border-black/10"
                                    }`}
                                  value={guestCount}
                                  min={0}
                                  onChange={(e) =>
                                    setGuestCount(e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Ngày bắt đầu
                                  <span className="text-red-700">(*)</span>
                                </label>
                                <input
                                  type="date"
                                  className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-primary/10 ${!startDate
                                    ? "border-red-500 border-2 text-gray-400"
                                    : "border-slate-200"
                                    }`}
                                  value={startDate}
                                  onChange={(e) => {
                                    if (endDate && e.target.value > endDate) {
                                      alert(
                                        "Ngày bắt đầu không được muộn hơn ngày kết thúc.",
                                      );
                                      setStartDate("");
                                      return;
                                    }
                                    setStartDate(e.target.value);
                                  }}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Ngày kết thúc
                                  <span className="text-red-600">(*)</span>
                                </label>
                                <input
                                  type="date"
                                  className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 transition-all focus:outline-none focus:ring-4 focus:ring-primary/10 ${!endDate
                                    ? "border-red-500 border-2 text-gray-400"
                                    : "border-slate-200"
                                    }`}
                                  value={endDate}
                                  onChange={(e) => {
                                    if (
                                      startDate &&
                                      e.target.value < startDate
                                    ) {
                                      alert(
                                        "Ngày kết thúc không được sớm hơn ngày bắt đầu.",
                                      );
                                      setEndDate("");
                                      return;
                                    }
                                    setEndDate(e.target.value);
                                  }}
                                />
                              </div>
                            </div>

                            <div className="mb-5 space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Tour Code
                                <span className="text-red-600">(*)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="Nhập mã tour (ví dụ: HAN-SGN-01...)"
                                className={`h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 ${!tourCode.trim()
                                  ? "border-red-500 border-2"
                                  : "border-black/10"
                                  }`}
                                value={tourCode}
                                onChange={(e) => setTourCode(e.target.value)}
                              />
                            </div>

                            <div className="mb-5 space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                Loại tour
                              </label>
                              <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="radio"
                                    name="tourType"
                                    value="classic"
                                    checked={tourType === "classic"}
                                    onChange={() => setTourType("classic")}
                                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                  />
                                  <span
                                    className={`text-sm transition-colors ${tourType === "classic" ? "text-primary font-bold" : "text-gray-500 group-hover:text-gray-700"}`}
                                  >
                                    Classic
                                  </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="radio"
                                    name="tourType"
                                    value="cruise"
                                    checked={tourType === "cruise"}
                                    onChange={() => setTourType("cruise")}
                                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                  />
                                  <span
                                    className={`text-sm transition-colors ${tourType === "cruise" ? "text-primary font-bold" : "text-gray-500 group-hover:text-gray-700"}`}
                                  >
                                    Tàu biển
                                  </span>
                                </label>
                              </div>
                            </div>

                            {tourType === "classic" &&
                              selectedGuides.length > 1 ? (
                              <div className="mb-5 space-y-5">
                                {selectedGuides.map((guide) => (
                                  <div key={guide.Id} className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                      Chương trình tour cho{" "}
                                      <span className="text-red-600 font-black">
                                        {guide.Name}
                                      </span>
                                      <span className="text-red-600">(*)</span>
                                    </label>
                                    <textarea
                                      placeholder={`Nhập lịch trình tour riêng cho ${guide.Name}...`}
                                      className={`min-h-[140px] w-full resize-y rounded-2xl border bg-white px-4 py-3 font-sans text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-primary/10 ${!(
                                        guideTourPrograms[guide.Id] || ""
                                      ).trim()
                                        ? "border-red-500 border-2"
                                        : "border-black/10"
                                        }`}
                                      value={guideTourPrograms[guide.Id] || ""}
                                      onChange={(e) =>
                                        setGuideTourPrograms((prev) => ({
                                          ...prev,
                                          [guide.Id]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mb-5 space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Chi tiết chương trình tour
                                  <span className="text-red-600">(*)</span>
                                </label>
                                <textarea
                                  placeholder="Nhập lịch trình tour tại đây (ví dụ: Ngày 1: Hà Nội - Hạ Long...)"
                                  className={`min-h-[180px] w-full resize-y rounded-2xl border bg-white px-4 py-3 font-sans text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-primary/10 ${!tourProgramText.trim()
                                    ? "border-red-500 border-2"
                                    : "border-black/10"
                                    }`}
                                  value={tourProgramText}
                                  onChange={(e) =>
                                    setTourProgramText(e.target.value)
                                  }
                                />
                              </div>
                            )}

                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-6 flex justify-center"
                            >
                              <button
                                disabled={isExporting || !isTourFormComplete}
                                className="inline-flex h-12 items-center gap-3 rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={handleExportTourOrder}
                              >
                                {isExporting ? (
                                  <>
                                    <Loader2
                                      size={20}
                                      className="animate-spin"
                                    />
                                    Đang xử lý...
                                  </>
                                ) : (
                                  <>
                                    <Download size={20} />
                                    Xuất lệnh điều tour & Hợp đồng (
                                    {selectedGuides.length})
                                  </>
                                )}
                              </button>
                            </motion.div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </motion.div>
      <AnimatePresence>
        {selectedGuides.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTourInfo}
            className="fixed bottom-4 right-6 z-50 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-white shadow-xl shadow-secondary/20 transition-colors hover:bg-secondary/90"
          >
            {isScrolledDown ? (
              <ArrowUp className="w-6 h-6 relative z-10" />
            ) : (
              <ArrowDown className="w-6 h-6 relative z-10" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      {isAddGuideOpen && (
        <GuideEditorModal
          title="Thêm mới HDV"
          existingGuides={guideList}
          onClose={() => setIsAddGuideOpen(false)}
          onSave={handleSaveNewGuide}
        />
      )}
    </>
  );
}
