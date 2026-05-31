export function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="border-b border-gray-100 pb-2">
      <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
        {label}
      </span>
      <p className="text-lg font-medium">{value || "---"}</p>
    </div>
  );
}
