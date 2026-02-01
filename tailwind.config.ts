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
                'ncc-red': '#D21034',
                'ncc-navy': '#002147',
                'ncc-sky': '#4B9CD3',
                'ncc-gold': '#D4AF37',
            },
            fontFamily: {
                heading: ['Oswald', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
