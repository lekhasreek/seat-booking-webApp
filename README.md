# Seat Booking Web Application

A modern, professional, and responsive seat booking web application for workspaces. Built with React, TypeScript, Vite, and Tailwind CSS.

## Features
- Interactive floor layout with clearly marked sections (e.g., Section A, Section B, etc.)
- Clickable sections navigate to dedicated seat arrangement pages
- Users can view and book available seats
- Clean, modern, and responsive design

## Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Start the development server:**
   ```sh
   npm run dev
   ```
3. **Open your browser:**
   Visit [http://localhost:5173](http://localhost:5173) to view the app.

## Folder Structure
- `src/components/` – Floor layout and section seat components
- `src/index.css` – Tailwind CSS entry point
- `src/App.tsx` – Main app with routing

## Customization
- Update `FloorLayout.tsx` to change sections or layout
- Update `SectionSeats.tsx` for seat arrangement logic

---

**Note:** If Tailwind CSS styles do not appear, ensure your editor is set up to process PostCSS and Tailwind, and that your environment supports the Tailwind CLI.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
