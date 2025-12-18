import { GoogleGenAI } from "@google/genai";
import { Source } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Streams the protocol search result.
 * @param diseaseName The query/disease name.
 * @param onChunk Callback function that receives the ACCUMULATED text so far.
 * @returns Promise<Source[]> The list of sources found during generation.
 */
export const searchProtocol = async (
  diseaseName: string,
  onChunk: (text: string) => void
): Promise<Source[]> => {
  if (!diseaseName.trim()) {
    throw new Error("Vui lòng nhập tên bệnh.");
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: `Đóng vai: Hội đồng Chuyên gia Y khoa (Medical Expert Board).
      Nhiệm vụ: Soạn thảo Phác đồ điều trị CHUYÊN SÂU (In-depth Protocol) cho bệnh lý: "${diseaseName}".
      
      QUY TẮC ĐỊNH DẠNG BẢNG (TABLE FORMATTING RULES) - RẤT QUAN TRỌNG:
      1.  **Luôn để một dòng trống** trước khi bắt đầu bảng và sau khi kết thúc bảng.
      2.  Hàng tiêu đề phải được ngăn cách với nội dung bằng hàng gạch nối theo đúng chuẩn Markdown: \`|---|---|---|\`.
      3.  **TUYỆT ĐỐI KHÔNG dùng danh sách (bullet points/gạch đầu dòng) bên trong ô của Bảng**. Thay vào đó, hãy dùng dấu phẩy hoặc số thứ tự dạng text (1. 2.) trên cùng dòng.
      4.  Không để ô trống, hãy điền "-" nếu không có dữ liệu.

      YÊU CẦU NỘI DUNG & ĐỘ SÂU (Markdown):
      1.  **Tổng quan & Cơ chế Bệnh sinh (Pathophysiology)**:
          *   Giải thích cơ chế ở mức độ tế bào/phân tử.
          *   Sử dụng **in đậm** cho các thuật ngữ y khoa quan trọng.
      2.  **Chẩn đoán Xác định & Phân độ (Diagnosis & Staging)**:
          *   Tiêu chuẩn vàng (Gold Standard).
          *   **Bảng Phân độ lâm sàng** (ví dụ: NYHA, GOLD...) - *Trình bày dạng Bảng*.
          *   Cận lâm sàng cần làm và ý nghĩa chỉ số.
      3.  **Chẩn đoán Phân biệt (Differential Diagnosis)**:
          *   Trình bày dạng **Bảng so sánh** các bệnh lý dễ nhầm lẫn (Triệu chứng vs Cận lâm sàng).
      4.  **Điều trị (Treatment) - Phần quan trọng nhất**:
          *   **Nguyên tắc chung**: Mục tiêu điều trị cụ thể.
          *   **Phác đồ thuốc chi tiết**: Bắt buộc dùng **Bảng (Table)** với các cột: 
              | Nhóm/Tên thuốc | Liều dùng (Tấn công/Duy trì) | Cơ chế & Evidence (Class I/II) | Chỉnh liều (Gan/Thận/Thai) |
          *   **Lưu ý dược lý**: Tương tác thuốc quan trọng, tác dụng phụ cần theo dõi.
      5.  **Lưu đồ xử trí (Algorithm) / Hình ảnh**: 
          *   Tìm kiếm và chèn URL hình ảnh sơ đồ phác đồ, X-quang, ECG... bằng cú pháp \`![Mô tả](URL)\`.
          *   Mô tả lưu đồ xử trí từng bước (Step-by-step) nếu không có ảnh.
          *   *Nếu không tìm thấy hình ảnh phù hợp, hãy mô tả lưu đồ bằng lời thay vì chèn link lỗi.*
      6.  **Tiên lượng & Theo dõi (Prognosis & Follow-up)**:
          *   Tiêu chuẩn xuất viện.
          *   Lịch tái khám và xét nghiệm kiểm tra.

      NGUỒN THAM KHẢO (References): Ưu tiên guideline mới nhất từ Bộ Y tế VN, ACC/AHA, ESC, ADA, KDIGO, NICE (2023-2025).
      Văn phong: Học thuật, chính xác, sử dụng thuật ngữ chuyên ngành (kèm tiếng Anh nếu cần).`,
      config: {
        tools: [{ googleSearch: {} }],
        // Max output tokens set to max limit for Flash to ensure complete protocols
        maxOutputTokens: 8192,
      },
    });

    let fullText = '';
    const sources: Source[] = [];
    const seenUris = new Set<string>();

    try {
      for await (const chunk of responseStream) {
        try {
            // Safely access text to prevent crash if a chunk is blocked/empty
            const textChunk = chunk.text;
            if (textChunk) {
                fullText += textChunk;
                onChunk(fullText);
            }

            // Extract Grounding Metadata (Sources)
            const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks) {
                groundingChunks.forEach((c: any) => {
                if (c.web && c.web.uri && c.web.title) {
                    if (!seenUris.has(c.web.uri)) {
                    seenUris.add(c.web.uri);
                    sources.push({
                        title: c.web.title,
                        uri: c.web.uri
                    });
                    }
                }
                });
            }
        } catch (innerError) {
             console.warn("Error processing stream chunk (likely safety block):", innerError);
             // Do not rethrow; allow the stream to continue or finish with what we have
        }
      }
    } catch (loopError) {
         console.warn("Stream loop interrupted:", loopError);
         // If we have content, return what we have instead of failing completely
         if (!fullText) throw loopError;
    }

    if (!fullText) {
       return [];
    }

    return sources;

  } catch (error: any) {
    console.error("Gemini Streaming Error:", error);
    throw new Error(error.message || "Đã xảy ra lỗi khi tra cứu phác đồ.");
  }
};

/**
 * Checks for drug interactions using Gemini.
 * @param drugListStr The comma-separated list of drugs.
 * @returns Promise<string> The analysis text.
 */
export const checkDrugInteractions = async (drugListStr: string): Promise<string> => {
  if (!drugListStr.trim()) {
    throw new Error("Vui lòng nhập danh sách thuốc.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Đóng vai: Dược sĩ lâm sàng chuyên nghiệp.
      Nhiệm vụ: Kiểm tra và phân tích tương tác thuốc cho danh sách sau: "${drugListStr}".
      
      QUY TẮC ĐỊNH DẠNG BẢNG (TABLE FORMATTING RULES):
      1.  **Luôn để một dòng trống** trước khi bắt đầu bảng và sau khi kết thúc bảng.
      2.  Hàng tiêu đề phải được ngăn cách với nội dung bằng hàng gạch nối theo đúng chuẩn Markdown: \`|---|---|---|\`.
      3.  **TUYỆT ĐỐI KHÔNG dùng danh sách (bullet points)** bên trong ô của Bảng. Hãy dùng dấu phẩy.
      
      Yêu cầu trả lời (Markdown):
      1.  **Tổng quan**: Tóm tắt ngắn gọn có tương tác nào đáng chú ý không.
      2.  **Chi tiết tương tác** (Nếu có):
          *   Trình bày dạng **Bảng (Table)** với các cột: | Cặp thuốc | Mức độ (Nặng/Trung bình/Nhẹ) | Cơ chế & Hậu quả | Xử trí |
      3.  **Khuyến nghị lâm sàng**: Lời khuyên cụ thể, hành động được cho bác sĩ.
      4.  **Lưu ý thực phẩm/lối sống**: (Nếu có liên quan).

      Trình bày khoa học, dễ đọc. Nếu không có tương tác đáng kể, hãy khẳng định rõ ràng.`,
      config: {
        maxOutputTokens: 4096,
        // Using search tool for up-to-date interaction data is recommended
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text || "Không tìm thấy dữ liệu phản hồi.";
  } catch (error: any) {
    console.error("Interaction Check Error:", error);
    throw new Error(error.message || "Lỗi khi kiểm tra tương tác thuốc.");
  }
};