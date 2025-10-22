# socuu-yte

Vite + React single-file app packaged from user-provided code.
Includes an on-page API key input stored in localStorage.

## Quick start

1. Install dependencies:
```
npm install
```

2. Run in development:
```
npm run dev
```

3. Build:
```
npm run build
```

4. Preview production:
```
npm run preview
```

## How to set API key

Open the app in your browser. At top there is a field `Nhập API key tại đây`. Paste your Google Generative Language API key and click `Lưu`. The key is stored in `localStorage` under `API_KEY`.

The app uses the key directly in the client to call:
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=API_KEY`

**Security note:** Storing API keys in client-side localStorage exposes them publicly. For production, create a server-side proxy that stores the key in a secure environment variable and forwards requests.

## Deploy to GitHub and Vercel

1. Create a new GitHub repo and push all files.
2. In Vercel, import the GitHub repo.
3. Set build command: `npm run build`.
4. Set output directory (not required for Vite; Vercel will detect).
5. For production keep in mind to move the API key to a server side secret or proxy.

