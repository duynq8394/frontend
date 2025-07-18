/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF', // Màu xanh dương đậm
        secondary: '#10B981', // Màu xanh lá
        accent: '#F59E0B', // Màu cam
      },
    },
  },
  plugins: [],
}