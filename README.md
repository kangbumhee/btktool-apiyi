<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` file in the root directory and add:
   ```
   VITE_NANO_BANANA_API_KEY=your_nano_banana_api_key_here
   VITE_GROQ_API_KEY=your_groq_api_key_here
   VITE_IMGBB_API_KEY=your_imgbb_api_key_here
   VITE_TAVILY_API_KEY=your_tavily_api_key_here
   ```
   
   ⚠️ 중요: .env.local 파일은 절대 GitHub에 커밋하지 마세요! API 키가 노출됩니다.
3. Run the app:
   `npm run dev`
