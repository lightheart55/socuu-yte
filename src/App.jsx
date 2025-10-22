import React, { useState, useCallback, useMemo } from 'react';
import { RefreshCw, Clipboard, AlertTriangle, Send, Heart, Droplet, Zap, Home, Stethoscope } from 'lucide-react';

// --- System Instruction for the main 7-point Plan Generation (Feature 1) ---
const SYSTEM_INSTRUCTION_PLAN = `
Bạn là Bác sĩ/Nhân viên y tế tại Trạm Y tế Xã/Phường. Nhiệm vụ của bạn là lập một KẾ HOẠCH SƠ CẤP CỨU NGẮN GỌN và CHÍNH XÁC dựa trên 'lý do đến trạm' của bệnh nhân.

Quy tắc Bắt buộc:
1. Văn phong: PHẢI sử dụng văn phong hành chính y tế, câu ngắn, mục rõ ràng, và thuật ngữ y tế chính xác (tiếng Việt).
2. Giả định mặc định: Nếu thiếu thông tin quan trọng (tuổi, tiền sử), bạn PHẢI GIẢ ĐỊNH MẶC ĐỊNH: 'Người lớn 18–65 tuổi, không mang thai, không suy gan/thận nặng.' và ghi rõ giả định này ở Mục 1.
3. Cấu trúc 7 Mục: PHẢI TUÂN THỦ TUYỆT ĐỐI cấu trúc 7 mục sau, bắt đầu bằng tiêu đề in đậm:

**KẾ HOẠCH SƠ CẤP CỨU NGẮN GỌN**

1) GIẢ ĐỊNH NGẮN (1 câu): Ghi các giả định bắt buộc nếu không có dữ liệu.
2) ĐÁNH GIÁ NHANH (ABC + sinh hiệu): Liệt kê các chỉ số phải đo/kiểm tra ngay: Đường thở (A), Thở (B), Tuần hoàn (C); HA, Mạch, Nhịp thở, SpO₂, Thân nhiệt, Đường máu mao mạch (Glucose).
3) XỬ TRÍ TẠI TRẠM (bước theo thứ tự, gạch đầu dòng):
   - Các can thiệp cấp cứu cần thực hiện ngay.
   - Nêu thuốc gợi ý (tên gốc) và đường dùng ngắn gọn (ví dụ: Paracetamol 500mg uống).
4) THEO DÕI (gồm chỉ số và tần suất): Những gì phải quan sát và khoảng thời gian theo dõi (ví dụ: Sinh hiệu 15 phút/lần).
5) RED FLAGS — CHUYỂN TUYẾN NGAY (liệt kê 4–6 dấu hiệu): Nếu có, hướng dẫn chuyển tuyến cấp cứu (Ví dụ: Rối loạn tri giác, HA thấp < 90/60 mmHg).
6) GHI CHO PHIẾU CHUYỂN (1–2 câu): Chẩn đoán sơ bộ; trạng thái khi chuyển (sinh hiệu); thuốc/đầu can thiệp đã cho; thời gian đề xuất chuyển; phương tiện đề xuất; người đi kèm.
7) CHỐNG CHỈ ĐỊNH / LƯU Ý NGẮN: Thuốc hoặc biện pháp cần tránh trong hoàn cảnh này.

Không hỏi thêm thông tin. Nếu cần thông tin quan trọng để thay đổi xử trí, chỉ liệt kê 2–3 thông tin cần bổ sung trong phần XỬ TRÍ TẠI TRẠM dưới dạng 'Cần bổ sung thông tin:'.
`;

// --- System Instruction and Schema for Triage Generation (Feature 2) ---
const SYSTEM_INSTRUCTION_TRIAGE = `
Bạn là chuyên gia y tế khẩn cấp. Dựa trên lý do đến trạm, hãy đưa ra đánh giá nhanh về mức độ ưu tiên cấp cứu (Triage) và 3 hành động kiểm tra/can thiệp ưu tiên nhất.
Định dạng đầu ra PHẢI là JSON theo schema được cung cấp. Không thêm bất kỳ văn bản giải thích nào khác. Sử dụng thang phân loại Triage 5 cấp độ (ví dụ: Cấp 1 - Hồi sức, Cấp 5 - Không khẩn cấp).
`;

const TRIAGE_SCHEMA = {
    type: "OBJECT",
    properties: {
        triageLevel: { type: "STRING", description: "Mức độ cấp cứu (ví dụ: Cấp 1, Cấp 2, Cấp 3, Cấp 4, Cấp 5)" },
        priority: { type: "STRING", description: "Tên mức độ ưu tiên (ví dụ: Hồi sức, Cấp cứu, Khẩn cấp, Bán khẩn cấp, Không khẩn cấp)" },
        summary: { type: "STRING", description: "Tóm tắt ngắn 1 câu về tình trạng và mức độ nguy hiểm" },
        immediateActions: {
            type: "ARRAY",
            description: "3 hành động kiểm tra/can thiệp ưu tiên nhất cần thực hiện ngay",
            items: { type: "STRING" }
        }
    },
    propertyOrdering: ["triageLevel", "priority", "summary", "immediateActions"]
};

// --- System Instruction for Home Care Instructions (Feature 3) ---
const SYSTEM_INSTRUCTION_HOME_CARE = `
Bạn là Nhân viên y tế/Bác sĩ tại Trạm Y tế Xã. Nhiệm vụ của bạn là soạn thảo một bản Hướng dẫn Chăm sóc Tại nhà ngắn gọn, rõ ràng, và dễ hiểu dành cho bệnh nhân hoặc người nhà.
Cấu trúc PHẢI bao gồm 4 mục chính (ghi bằng tiêu đề in đậm):
1.  **CÁCH SỬ DỤNG THUỐC ĐÃ CẤP** (Tên gốc, liều dùng, tần suất).
2.  **CHĂM SÓC KHÔNG DÙNG THUỐC** (Ví dụ: nghỉ ngơi, chườm lạnh, bù nước).
3.  **CHẾ ĐỘ ĂN UỐNG VÀ SINH HOẠT**.
4.  **DẤU HIỆU CẦN ĐƯA TRỞ LẠI TRẠM NGAY** (Liệt kê 3-4 dấu hiệu nguy hiểm).
Văn phong: Gần gũi, động viên, sử dụng ngôn ngữ phổ thông, không dùng thuật ngữ y tế chuyên sâu (ví dụ: thay "Hạ sốt bằng Paracetamol" thành "Uống thuốc hạ sốt (Paracetamol)").
`;

// --- System Instruction and Schema for Differential Diagnosis (Feature 4) ---
const SYSTEM_INSTRUCTION_DIFFERENTIAL = `
Bạn là một chuyên gia y tế chẩn đoán. Dựa trên 'lý do đến trạm' của bệnh nhân (triệu chứng/chấn thương), hãy tạo ra 3-4 chẩn đoán phân biệt có thể xảy ra nhất.
Định dạng đầu ra PHẢI là JSON theo schema được cung cấp. Không thêm bất kỳ văn bản giải thích nào khác.
`;

const DIFFERENTIAL_SCHEMA = {
    type: "OBJECT",
    properties: {
        differentialDiagnosis: {
            type: "ARRAY",
            description: "Danh sách các chẩn đoán phân biệt có thể xảy ra",
            items: {
                type: "OBJECT",
                properties: {
                    diagnosis: { type: "STRING", description: "Tên chẩn đoán (tiếng Việt)" },
                    likelihood: { type: "STRING", description: "Mức độ ưu tiên/khả năng (ví dụ: Rất cao, Trung bình, Thấp)" },
                    rationale: { type: "STRING", description: "Lý do ngắn gọn dựa trên triệu chứng" }
                },
                propertyOrdering: ["diagnosis", "likelihood", "rationale"]
            }
        }
    },
    propertyOrdering: ["differentialDiagnosis"]
};

// Helper function to handle exponential backoff for API calls
const fetchWithRetry = async (url, options, maxRetries = 5) => {
    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            lastError = error;
            const delay = Math.pow(2, i) * 1000;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`API failed after ${maxRetries} retries. Last error: ${lastError.message}`);
};

// --- PARSING HELPERS for Plan (Feature 1) ---
const parsePlan = (planText) => {
    if (!planText) return [];
    // Split by the pattern \n followed by a number and parenthesis (e.g., \n1) )
    const sections = planText.split(/\n\s*(?=\d+\) )/);
    return sections.filter(s => s.trim() !== '').map((section, index) => {
        // Use a more robust regex to capture the number, title, and content
        const match = section.match(/^(\d+\) [^\n:]+):?\s*(.*)/s);
        if (match) {
            const [_, title, content] = match;
            return { id: index, title: title.trim(), content: content.trim() };
        }
        // Handle the main title if it exists
        if (section.startsWith('**KẾ HOẠCH')) {
            return null; // Skip main title
        }
        return { id: index, title: 'Nội dung', content: section.trim() };
    }).filter(s => s !== null);
};

// --- PARSING HELPERS for Home Care (Feature 3) ---
const parseHomeCare = (homeCareText) => {
    if (!homeCareText) return [];
    // Use regex to split by the bold titles (e.g., **TITLE**)
    const sections = homeCareText.split(/(\*\*[^**]+\*\*)/).filter(s => s.trim());
    const result = [];
    for (let i = 0; i < sections.length; i += 2) {
        if (sections[i + 1]) {
            result.push({
                id: i / 2,
                title: sections[i].replace(/\*\*|:/g, '').trim(),
                content: sections[i+1].trim()
            });
        }
    }
    return result;
};


const App = () => {
    const [reason, setReason] = useState('');
    const [plan, setPlan] = useState('');
    const [triageResult, setTriageResult] = useState(null);
    const [homeCareInstructions, setHomeCareInstructions] = useState('');
    const [differentialResult, setDifferentialResult] = useState(null); 
    
    // State variables for loading status (already exist)
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);
    const [isLoadingTriage, setIsLoadingTriage] = useState(false);
    const [isLoadingHomeCare, setIsLoadingHomeCare] = useState(false);
    const [isLoadingDifferential, setIsLoadingDifferential] = useState(false);
    
    const [error, setError] = useState(null);

    const parsedPlan = useMemo(() => parsePlan(plan), [plan]);
    const parsedHomeCare = useMemo(() => parseHomeCare(homeCareInstructions), [homeCareInstructions]);

    const handleAPICall = useCallback(async (type) => {
        if (!reason.trim()) {
            setError('Vui lòng nhập "Lý do đến trạm" để bắt đầu.');
            return;
        }

        setError(null);
        let setLoadState, setContent, systemInstruction, isJson = false, schema = null;
        
        if (type === 'plan') {
            setLoadState = setIsLoadingPlan;
            setContent = setPlan;
            systemInstruction = SYSTEM_INSTRUCTION_PLAN;
        } else if (type === 'triage') {
            setLoadState = setIsLoadingTriage;
            setContent = setTriageResult;
            systemInstruction = SYSTEM_INSTRUCTION_TRIAGE;
            isJson = true;
            schema = TRIAGE_SCHEMA;
        } else if (type === 'homecare') {
            setLoadState = setIsLoadingHomeCare;
            setContent = setHomeCareInstructions;
            systemInstruction = SYSTEM_INSTRUCTION_HOME_CARE;
        } else if (type === 'differential') { 
            setLoadState = setIsLoadingDifferential;
            setContent = setDifferentialResult;
            systemInstruction = SYSTEM_INSTRUCTION_DIFFERENTIAL;
            isJson = true;
            schema = DIFFERENTIAL_SCHEMA;
        } else {
            return;
        }

        setLoadState(true);
        setContent(null); // Clear previous result

        const apiKey = "";
        const modelName = "gemini-2.5-flash-preview-09-2025";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const userQuery = `Lý do đến trạm: "${reason.trim()}"`;

        let payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
        };

        if (isJson) {
            payload.generationConfig = {
                responseMimeType: "application/json",
                responseSchema: schema
            };
        }

        try {
            const response = await fetchWithRetry(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            const candidate = result.candidates?.[0];

            if (isJson) {
                const jsonText = candidate?.content?.parts?.[0]?.text;
                if (jsonText) {
                    try {
                        const parsedJson = JSON.parse(jsonText);
                        if (type === 'triage') setTriageResult(parsedJson);
                        if (type === 'differential') setDifferentialResult(parsedJson); 
                    } catch (e) {
                        console.error('JSON Parse Error:', e);
                        setError(`Lỗi phân tích kết quả ${type === 'triage' ? 'Triage' : 'Chẩn đoán Phân biệt'}. Vui lòng thử lại.`);
                    }
                } else {
                    setError('Không thể tạo kết quả JSON. Vui lòng thử lại.');
                }
            } else {
                const generatedText = candidate?.content?.parts?.[0]?.text || 'Không thể tạo nội dung. Vui lòng thử lại.';
                const cleanedText = generatedText.replace(/^```\w*\n|```$/g, '').trim();
                setContent(cleanedText);
            }

        } catch (err) {
            console.error('API Error:', err);
            setError(`Đã xảy ra lỗi API: ${err.message}`);
        } finally {
            setLoadState(false);
        }
    }, [reason]);

    const generatePlan = () => handleAPICall('plan');
    const generateTriage = () => handleAPICall('triage');
    const generateHomeCare = () => handleAPICall('homecare');
    const generateDifferential = () => handleAPICall('differential'); 

    const copyToClipboard = (text, name) => {
        if (text) {
            const tempTextArea = document.createElement('textarea');
            // Use the raw plan text for copy operation
            const textToCopy = (name === "Kế hoạch Sơ cấp cứu") ? plan : 
                               (name === "Hướng dẫn Chăm sóc Tại nhà") ? homeCareInstructions :
                               JSON.stringify(text, null, 2);
                               
            tempTextArea.value = textToCopy;
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextArea);

            alert(`Đã sao chép ${name} vào clipboard!`);
        }
    };

    const getTriageColor = (level) => {
        switch (level) {
            case 'Cấp 1': return 'bg-red-600 text-white';
            case 'Cấp 2': return 'bg-orange-500 text-white';
            case 'Cấp 3': return 'bg-yellow-400 text-gray-800';
            case 'Cấp 4': return 'bg-green-500 text-white';
            case 'Cấp 5': return 'bg-blue-500 text-white';
            default: return 'bg-gray-400 text-white';
        }
    };

    const getLikelihoodColor = (likelihood) => {
        const normalized = likelihood.toLowerCase().trim();
        if (normalized.includes('rất cao')) return 'bg-red-200 text-red-800 border-red-300';
        if (normalized.includes('cao')) return 'bg-orange-200 text-orange-800 border-orange-300';
        if (normalized.includes('trung bình')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        if (normalized.includes('thấp')) return 'bg-green-100 text-green-800 border-green-300';
        return 'bg-gray-100 text-gray-800 border-gray-300';
    };
    
    const isAnyLoading = isLoadingPlan || isLoadingTriage || isLoadingHomeCare || isLoadingDifferential;

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <style jsx="true">{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
                .card-shadow { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
                .content-list li::marker { content: '• '; font-size: 1.2em; color: #3b82f6; }
                .content-list ul { margin-left: 1.5rem; }
            `}</style>
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold text-sky-800 flex items-center justify-center">
                        <Heart className="w-8 h-8 mr-3 text-red-500" />
                        CÔNG CỤ HỖ TRỢ CHẨN ĐOÁN VÀ CẤP CỨU TRẠM Y TẾ
                    </h1>
                    <p className="text-gray-600 mt-2">Sử dụng trí tuệ nhân tạo để lập kế hoạch, phân loại cấp cứu và chẩn đoán.</p>
                </header>

                {/* Input Area */}
                <div className="bg-white p-6 rounded-xl card-shadow mb-8 border border-sky-100">
                    <label htmlFor="reason-input" className="block text-lg font-semibold text-gray-700 mb-3 flex items-center">
                        <Droplet className="w-5 h-5 mr-2 text-sky-600" />
                        Lý do đến trạm (Triệu chứng / Chấn thương)
                    </label>
                    <textarea
                        id="reason-input"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 transition duration-150 ease-in-out resize-y min-h-[120px]"
                        placeholder="Ví dụ: Bệnh nhân bị sốt cao 39.5°C kèm đau đầu và nôn ói. Hoặc: Bị té xe, chấn thương cẳng chân phải, đang chảy máu."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows="4"
                        disabled={isAnyLoading}
                    ></textarea>

                    {/* Action Buttons: 2x2 grid on medium+ screens */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <button
                            onClick={generateTriage}
                            disabled={isAnyLoading}
                            className={`py-3 px-1 rounded-lg font-bold text-white transition duration-200 ease-in-out flex items-center justify-center text-xs sm:text-sm shadow-md
                                ${isLoadingTriage ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'}`}
                        >
                            {isLoadingTriage ? (
                                <span className="flex items-center">
                                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                                    Đang xử lý...
                                </span>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-1.5" />
                                    ✨ Triage
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={generateDifferential}
                            disabled={isAnyLoading}
                            className={`py-3 px-1 rounded-lg font-bold text-white transition duration-200 ease-in-out flex items-center justify-center text-xs sm:text-sm shadow-md
                                ${isLoadingDifferential ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'}`}
                        >
                            {isLoadingDifferential ? (
                                <span className="flex items-center">
                                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                                    Đang xử lý...
                                </span>
                            ) : (
                                <>
                                    <Stethoscope className="w-4 h-4 mr-1.5" />
                                    ✨ Chẩn đoán PB
                                </>
                            )}
                        </button>

                         <button
                            onClick={generateHomeCare}
                            disabled={isAnyLoading}
                            className={`py-3 px-1 rounded-lg font-bold text-white transition duration-200 ease-in-out flex items-center justify-center text-xs sm:text-sm shadow-md
                                ${isLoadingHomeCare ? 'bg-teal-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800'}`}
                        >
                            {isLoadingHomeCare ? (
                                <span className="flex items-center">
                                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                                    Đang xử lý...
                                </span>
                            ) : (
                                <>
                                    <Home className="w-4 h-4 mr-1.5" />
                                    ✨ HD Tại nhà
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={generatePlan}
                            disabled={isAnyLoading}
                            className={`py-3 px-1 rounded-lg font-bold text-white transition duration-200 ease-in-out flex items-center justify-center text-xs sm:text-sm shadow-md
                                ${isLoadingPlan ? 'bg-sky-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'}`}
                        >
                            {isLoadingPlan ? (
                                <span className="flex items-center">
                                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                                    Đang xử lý...
                                </span>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-1.5" />
                                    Lập KẾ HOẠCH
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
                            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}
                </div>
                
                {/* Differential Diagnosis Output Area (New Feature 4) - Already JSON, minor styling tweaks */}
                <div className="bg-white p-6 rounded-xl card-shadow border border-purple-100 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <Stethoscope className="w-5 h-5 mr-2 text-purple-600" />
                        ✨ GỢI Ý CHẨN ĐOÁN PHÂN BIỆT
                    </h2>
                    {differentialResult && differentialResult.differentialDiagnosis ? (
                        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                            <ul className="space-y-4">
                                {differentialResult.differentialDiagnosis.map((item, index) => (
                                    <li key={index} className="p-3 border-l-4 border-purple-400 bg-white rounded-lg shadow-md">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">
                                            <span className="font-bold text-purple-800 text-base">{item.diagnosis}</span>
                                            <span className={`text-xs font-semibold px-2 py-0.5 mt-1 sm:mt-0 rounded-full border ${getLikelihoodColor(item.likelihood)}`}>
                                                {item.likelihood}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 italic mt-1">
                                            <span className="font-semibold text-purple-700">Lý do:</span> {item.rationale}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                            <div className="text-right mt-3">
                                <button
                                    onClick={() => copyToClipboard(differentialResult, "Kết quả Chẩn đoán Phân biệt")}
                                    className="p-1.5 bg-purple-200 text-purple-700 rounded-full hover:bg-purple-300 transition duration-150 text-xs font-medium"
                                    title="Sao chép kết quả (JSON)"
                                >
                                    <Clipboard className="w-4 h-4 inline-block mr-1" />
                                    Sao chép (JSON)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            Nhấn nút "✨ Chẩn đoán Phân biệt" để nhận gợi ý chẩn đoán dựa trên triệu chứng.
                        </div>
                    )}
                </div>

                {/* Triage Output Area (Feature 2) - Already JSON, minor styling tweaks */}
                <div className="bg-white p-6 rounded-xl card-shadow border border-sky-100 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-indigo-600" />
                        ✨ ĐÁNH GIÁ TRIAGE NHANH
                    </h2>
                    {triageResult ? (
                        <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-3 border-b border-indigo-300">
                                <p className="text-lg font-bold text-indigo-800">{triageResult.summary}</p>
                                <div className={`mt-2 sm:mt-0 px-3 py-1 rounded-full font-bold text-sm ${getTriageColor(triageResult.triageLevel)}`}>
                                    {triageResult.triageLevel}: {triageResult.priority}
                                </div>
                            </div>
                            <h3 className="font-semibold text-gray-700 mb-2 border-l-4 border-indigo-400 pl-2">3 Hành động Ưu tiên:</h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-700 pl-4">
                                {triageResult.immediateActions.map((action, index) => (
                                    <li key={index} className="text-sm font-medium">{action}</li>
                                ))}
                            </ol>
                            <div className="text-right mt-3">
                                <button
                                    onClick={() => copyToClipboard(triageResult, "Kết quả Triage")}
                                    className="p-1.5 bg-indigo-200 text-indigo-700 rounded-full hover:bg-indigo-300 transition duration-150 text-xs font-medium"
                                    title="Sao chép kết quả Triage (JSON)"
                                >
                                    <Clipboard className="w-4 h-4 inline-block mr-1" />
                                    Sao chép (JSON)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            Nhấn nút "✨ Triage" để nhận đánh giá ưu tiên sơ bộ.
                        </div>
                    )}
                </div>

                {/* Home Care Output Area (Feature 3) - Structured HTML */}
                <div className="bg-white p-6 rounded-xl card-shadow border border-sky-100 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <Home className="w-5 h-5 mr-2 text-teal-600" />
                        ✨ HƯỚNG DẪN CHĂM SÓC TẠI NHÀ
                    </h2>
                    {homeCareInstructions ? (
                        <div className="border border-gray-200 p-4 rounded-lg bg-teal-50 relative">
                            <ol className="space-y-4">
                                {parsedHomeCare.map((section) => (
                                    <li key={section.id} className="text-sm">
                                        <h3 className="font-bold text-teal-800 text-base mb-1 border-b border-teal-200 pb-1">{section.title}</h3>
                                        <div className="text-gray-700 content-list whitespace-pre-wrap">{section.content}</div>
                                    </li>
                                ))}
                            </ol>
                            <button
                                onClick={() => copyToClipboard(homeCareInstructions, "Hướng dẫn Chăm sóc Tại nhà")}
                                className="absolute top-2 right-2 p-2 bg-teal-200 text-teal-600 rounded-full hover:bg-teal-300 transition duration-150"
                                title="Sao chép bản gốc"
                            >
                                <Clipboard className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            Nhấn nút "✨ HD Tại nhà" để tạo bản hướng dẫn đơn giản cho bệnh nhân/người nhà.
                        </div>
                    )}
                </div>

                {/* Plan Output Area (Feature 1) - Structured HTML */}
                <div className="bg-white p-6 rounded-xl card-shadow border border-sky-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <Clipboard className="w-5 h-5 mr-2 text-gray-600" />
                        KẾT QUẢ: Kế hoạch Sơ cấp cứu (7 Mục)
                    </h2>
                    {plan ? (
                        <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 relative">
                            <ol className="space-y-4">
                                {parsedPlan.map((section) => (
                                    <li key={section.id} className="text-sm">
                                        <h3 className="font-bold text-sky-800 text-base mb-1 border-l-4 border-sky-400 pl-2">{section.title}</h3>
                                        <div className="text-gray-700 content-list whitespace-pre-wrap pl-2">{section.content}</div>
                                    </li>
                                ))}
                            </ol>
                            <button
                                onClick={() => copyToClipboard(plan, "Kế hoạch Sơ cấp cứu")}
                                className="absolute top-2 right-2 p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition duration-150"
                                title="Sao chép bản gốc"
                            >
                                <Clipboard className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            Nhấn nút "Lập KẾ HOẠCH" để tạo kế hoạch chi tiết 7 mục.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
