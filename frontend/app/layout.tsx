import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

// Load Fonts
const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const oswald = Oswald({ subsets: ["latin"], variable: '--font-oswald' });

export const metadata: Metadata = {
    title: "SASTRA NCC Boys Contingent",
    description: "Unity and Discipline. The Premier Youth Wing of SASTRA Deemed University.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                {/* Font Awesome CDN */}
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            </head>
            <body className={`${inter.variable} ${oswald.variable} font-sans`}>{children}</body>
        </html>
    );
}
