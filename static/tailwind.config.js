/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'visits': {
          'approved': '#22c55e',
          'pending': '#f59e0b', 
          'rejected': '#ef4444',
          'default': '#6366f1'
        }
      }
    },
  },
  plugins: [],
} 