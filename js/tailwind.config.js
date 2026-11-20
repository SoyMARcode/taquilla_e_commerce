/* Configuración de Tailwind (Play CDN) compartida por todas las vistas */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: '#0F0F14',
        panel: '#15151C',
        surface: '#1A1A22',
        surface2: '#24242E',
        line: '#2E2E3A',
        line2: '#3A3A48',
        fg: '#F5F5F7',
        soft: '#C9C9D4',
        muted: '#A3A3B2',
        dim: '#8E8E9E',
        placeholder: '#7C7C8C',
        brand: { DEFAULT: '#FF6B3D', light: '#FF8A63', lighter: '#FFB199', ink: '#14110F' },
        violet: { DEFAULT: '#3A2A78', light: '#5B47B8', pale: '#DCD6FF' },
        warn: { bg: '#2A1C17', line: '#4A2C20', fg: '#FFD3C2' },
        success: { DEFAULT: '#34D399', bg: '#0F2A20', fg: '#A7F3D0' },
        danger: { DEFAULT: '#F87171', bg: '#2A1214', fg: '#FECACA' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
    },
  },
};
