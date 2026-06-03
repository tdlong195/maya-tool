export const buildCarServicePrompt = (tourProgramText: string) => `Dựa trên nội dung chương trình tour sau, hãy trích xuất các thông tin liên quan đến dịch vụ xe ô tô.
Yêu cầu:
- Chỉ trích xuất các ngày diễn ra tại Việt Nam.
- Nếu một ngày có cả tiễn sân bay và đón sân bay, tách riêng thành 2 dòng.
- Trình bày dưới dạng bảng Markdown với các cột: Thành phố, Ngày tháng năm, Giờ đón, Lịch trình, Điểm đón, Điểm trả.
- Nếu có số lượng khách hoặc yêu cầu đặc biệt về xe, liệt kê thêm ở phần ghi chú.
- Trả về Markdown, không thêm giải thích.

Nội dung chương trình:
${tourProgramText}`;
