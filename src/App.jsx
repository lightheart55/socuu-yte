import React, { useState } from 'react'
import InputAPIKey from './components/InputAPIKey'
import { Activity, Clipboard, Loader2 } from 'lucide-react'

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '')
  const [reason, setReason] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCall = async () => {
    if (!apiKey) return alert('Vui lòng nhập API key trước.')
    if (!reason) return alert('Nhập lý do đến trạm.')
    setLoading(true)
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=' + apiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Tạo hướng dẫn sơ cấp cứu cho: ${reason}` }] }]
          })
        }
      )
      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi.'
      setOutput(text)
    } catch (e) {
      setOutput('Lỗi khi gọi API.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output)
    alert('Đã sao chép.')
  }

  return (
    <div className="min-h-screen bg-blue-50 text-gray-800 p-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2">
          <Activity className="text-blue-600" /> Sơ cứu Y tế
        </h1>

        <InputAPIKey onKeyChange={setApiKey} />

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do đến trạm..."
          className="w-full border p-2 rounded-md h-24 mb-3"
        />

        <button
          onClick={handleCall}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Tạo kế hoạch sơ cấp cứu'}
        </button>

        <div className="mt-4">
          <h2 className="font-semibold mb-2">Kết quả:</h2>
          <pre className="bg-gray-100 p-3 rounded-md whitespace-pre-wrap">{output}</pre>
          {output && (
            <button onClick={copyToClipboard} className="mt-2 flex items-center gap-2 text-blue-700">
              <Clipboard className="w-4 h-4" /> Sao chép
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
