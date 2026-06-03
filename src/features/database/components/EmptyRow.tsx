type EmptyRowProps = {
  colSpan: number;
};

export function EmptyRow({ colSpan }: EmptyRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16 text-center text-slate-500">
        Chưa có dữ liệu hoặc không tìm thấy kết quả phù hợp.
      </td>
    </tr>
  );
}
