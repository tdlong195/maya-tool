import { Car } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { FeatureCard, FileDropzone, NoticeBanner } from "../../shared/components";
import { CarServiceResult } from "./components/CarServiceResult";
import { useCarServiceProcessor } from "./hooks/useCarServiceProcessor";

export function CarServiceFeature() {
  const {
    acceptFile,
    error,
    file,
    isDragging,
    isProcessing,
    result,
    setIsDragging,
  } = useCarServiceProcessor();

  return (
    <motion.div
      key="car-service-mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <FeatureCard eyebrow="Dịch vụ xe" icon={Car} title="Dịch vụ xe oto">
        <FileDropzone
          accept=".doc,.docx"
          file={file}
          helperText="Hỗ trợ file .doc, .docx"
          icon={Car}
          inputId="car-service-file"
          isDragging={isDragging}
          isProcessing={isProcessing}
          onDragStateChange={setIsDragging}
          onFile={acceptFile}
          placeholder="Kéo thả file chương trình tour"
          processingLabel="Đang xử lý file..."
        />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <NoticeBanner className="mt-5" tone="error">
                {error}
              </NoticeBanner>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && <CarServiceResult result={result} />}
        </AnimatePresence>
      </FeatureCard>
    </motion.div>
  );
}
