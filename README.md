<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9235d95a-59d5-4765-b5ae-01af1cdc1deb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in `.env.local` to your Gemini API key.
   Browser-exposed `VITE_*` keys are visible in the built frontend; use a backend proxy for production secrecy.
3. Run the app:
   `npm run dev`
