/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          violet: '#7c3aed', // Violeta principal
          green: '#10b981',  // Verde para acciones
          light: '#f9fafb',  // Gris muy claro para el fondo
          white: '#ffffff',
        }
      }
    },
  },
  plugins: [],
}