import React, { useState, useEffect } from 'react'

export default function InputAPIKey({ onKeyChange }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '')

  useEffect(() => {
    if (apiKey) onKeyChange(apiKey)
  }, [apiKey])

  const handleSave = () => {
    localStorage.setItem('apiKey', apiKey)
    onKeyChange(apiKey)
    alert('API key đã được lưu.')
  }

  return (
    <div className="flex flex-col mb-4">
      <label className="text-sm font-semibold mb-1">Nhập Google API Key:</label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Nhập khóa API tại đây"
        className="border p-2 rounded-md mb-2"
      />
      <button onClick={handleSave} className="bg-blue-600 text-white px-3 py-1 rounded-md">
        Lưu API Key
      </button>
    </div>
  )
}
