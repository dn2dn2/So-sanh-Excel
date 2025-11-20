import { GoogleGenAI } from "@google/genai";
import { ComparisonResult } from "../types";

export const analyzeChangesWithGemini = async (comparison: ComparisonResult): Promise<string> => {
  // Safer check for process.env
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

  if (!apiKey) {
    // We return a friendly string instead of throwing immediately, or throw a specific error to be caught by UI
    throw new Error("API Key không tồn tại. Vui lòng kiểm tra cấu hình.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare a concise prompt with data sample
  const changesSummary = comparison.rows
    .filter(r => r.status !== 'same')
    .slice(0, 30) // Limit to top 30 changes to avoid token limits
    .map(r => {
      const changes = Object.entries(r.cells)
        .filter(([_, cell]) => cell.status !== 'same')
        .map(([key, cell]) => {
             const oldV = String(cell.oldValue || '').slice(0, 30);
             const newV = String(cell.value || '').slice(0, 30);
             return `${key}: ${oldV} -> ${newV}`;
        })
        .join(', ');
      return `Hàng ${r.id + 1} (${r.status}): ${changes}`;
    }).join('\n');

  const prompt = `
    Bạn là một chuyên gia phân tích dữ liệu. Hãy phân tích tóm tắt các thay đổi trong file Excel.
    
    Thống kê chung:
    - Tổng số dòng xử lý: ${comparison.summary.totalRows}
    - Dòng mới thêm: ${comparison.summary.addedRows}
    - Dòng bị xóa: ${comparison.summary.removedRows}
    - Dòng có chỉnh sửa: ${comparison.summary.modifiedRows}

    Chi tiết mẫu các thay đổi (đã rút gọn):
    ${changesSummary}

    Yêu cầu:
    Hãy viết một báo cáo ngắn gọn (dưới 200 từ) bằng tiếng Việt:
    1. Tóm tắt xu hướng thay đổi chính (ví dụ: cập nhật giá, thêm nhân sự mới, sửa lỗi chính tả...).
    2. Đánh giá mức độ thay đổi (Ít/Nhiều).
    3. Liệt kê tối đa 3 điểm nổi bật nhất.
    
    Không cần chào hỏi, hãy đi thẳng vào nội dung phân tích.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Không thể tạo phân tích.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Đã xảy ra lỗi khi gọi AI. Vui lòng thử lại sau.");
  }
};