import { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "../../../shared/components";

type CarServiceResultProps = {
  result: string;
};

export function CarServiceResult({ result }: CarServiceResultProps) {
  const [copied, setCopied] = useState(false);

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 space-y-5 border-t border-slate-100 pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            Kết quả
          </div>
          <h3 className="mt-1 text-xl font-bold text-slate-950">
            Kết quả trích xuất
          </h3>
        </div>
        <Button
          icon={copied ? CheckCircle2 : Copy}
          onClick={copyResult}
          variant={copied ? "success" : "secondary"}
        >
          {copied ? "Đã copy!" : "Copy nội dung"}
        </Button>
      </div>
      <div className="prose prose-sm max-w-none rounded-2xl border border-slate-200 bg-slate-50 p-5 leading-relaxed text-slate-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
      </div>
    </motion.div>
  );
}
