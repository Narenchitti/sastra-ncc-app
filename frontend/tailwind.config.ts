import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Official NCC Flag & Indian Army palette
                'ncc-red': '#D21034',
                'ncc-navy': '#002147',
                'ncc-sky': '#4B9CD3',
                'ncc-gold': '#D4AF37',
                'ncc-dark': '#0a0f1a',
                'ncc-olive': '#4A5D23',    // Army olive
                'ncc-khaki': '#C3B091',    // Army khaki
            },
            fontFamily: {
                heading: ['var(--font-oswald)', 'sans-serif'],
                body: ['var(--font-inter)', 'sans-serif'],
                mono: ['Fira Code', 'Courier New', 'Courier', 'monospace'],
            },
            animation: {
                'fade-up': 'fadeUp 0.8s ease-out both',
                'fade-in': 'fadeIn 0.8s ease-out both',
                'slide-left': 'slideLeft 0.8s ease-out both',
                'slide-right': 'slideRight 0.8s ease-out both',
                'float': 'float 4s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
                'scroll-bounce': 'scroll-bounce 2s ease-in-out infinite',
            },
            backgroundImage: {
                'gradient-ncc': 'linear-gradient(135deg, #002147 0%, #D21034 50%, #D4AF37 100%)',
                'gradient-hero': 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,33,71,0.9))',
                'gradient-dark': 'linear-gradient(180deg, #0a0f1a 0%, #002147 100%)',
            },
        },
    },
    plugins: [],
};
export default config;
