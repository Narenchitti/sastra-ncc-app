'use client';

import React, { useEffect, useRef } from 'react';

export default function WavingFlagBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let time = 0;

        // Create the offscreen static flag texture
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = 600;
        textureCanvas.height = 400;
        const sctx = textureCanvas.getContext('2d');

        const drawStaticTexture = () => {
            if (!sctx) return;
            sctx.clearRect(0, 0, 600, 400);

            // 1. Draw NCC Tricolor Stripes (Equal widths of 200px each)
            sctx.fillStyle = '#D21034'; // Army Red
            sctx.fillRect(0, 0, 200, 400);

            sctx.fillStyle = '#0b162a'; // Navy Blue
            sctx.fillRect(200, 0, 200, 400);

            sctx.fillStyle = '#5D9BCE'; // Air Force Light Blue
            sctx.fillRect(400, 0, 200, 400);

            // 2. Draw Golden Crest in the Center (Center = 300, 200)
            const cx = 300;
            const cy = 200;

            sctx.strokeStyle = '#E0A926'; // Gold
            sctx.fillStyle = '#E0A926';
            sctx.lineWidth = 2.5;

            // Draw outer golden ring
            sctx.beginPath();
            sctx.arc(cx, cy, 62, 0, Math.PI * 2);
            sctx.stroke();

            // Draw inner golden ring
            sctx.beginPath();
            sctx.arc(cx, cy, 57, 0, Math.PI * 2);
            sctx.stroke();

            // Draw "NCC" text in serif font
            sctx.font = 'bold 32px Georgia, serif';
            sctx.textAlign = 'center';
            sctx.textBaseline = 'middle';
            sctx.fillText('N C C', cx, cy - 5);

            // Draw the two OTA dots at the bottom
            sctx.beginPath();
            sctx.arc(cx - 15, cy + 28, 3.5, 0, Math.PI * 2); // Left OTA dot
            sctx.arc(cx + 15, cy + 28, 3.5, 0, Math.PI * 2); // Right OTA dot
            sctx.fill();

            // Draw motto text detail
            sctx.font = '6px sans-serif';
            sctx.fillText('UNITY & DISCIPLINE', cx, cy + 42);

            // Draw wreath of 17 lotus flowers encircling the crest
            const wreathRadius = 78;
            for (let j = 0; j < 17; j++) {
                const angle = (j / 17) * Math.PI * 2 - Math.PI / 2;
                const lx = cx + Math.cos(angle) * wreathRadius;
                const ly = cy + Math.sin(angle) * wreathRadius;

                // Center bud of the lotus
                sctx.beginPath();
                sctx.arc(lx, ly, 4, 0, Math.PI * 2);
                sctx.fill();

                // Draw simple left & right petals
                sctx.beginPath();
                sctx.ellipse(lx - 3, ly + 1, 2, 4.5, -Math.PI / 6, 0, Math.PI * 2);
                sctx.fill();

                sctx.beginPath();
                sctx.ellipse(lx + 3, ly + 1, 2, 4.5, Math.PI / 6, 0, Math.PI * 2);
                sctx.fill();
            }
        };

        drawStaticTexture();

        const resizeCanvas = () => {
            canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
            canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Animation loop
        const render = () => {
            time += 0.85;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const flagWidth = canvas.width;
            const flagHeight = canvas.height;

            const sliceCount = 180;
            const sliceWidth = flagWidth / sliceCount;

            for (let i = 0; i < sliceCount; i++) {
                const srcX = (i / sliceCount) * textureCanvas.width;
                const srcWidth = textureCanvas.width / sliceCount;
                const destX = i * sliceWidth;

                // Flag waves rippling to the right (anchored on the left)
                const anchorMultiplier = 0.3 + 0.7 * (i / sliceCount); // Less wave at left hoist
                const angle = (i * 0.05) - (time * 0.035);
                
                // Ripple calculation with enough height overlap to avoid top/bottom black borders
                const yOffset = Math.sin(angle) * 35 * anchorMultiplier;
                const destHeight = canvas.height + 120;
                const destY = -60 + yOffset;

                // Draw texture slice
                ctx.drawImage(
                    textureCanvas,
                    srcX,
                    0,
                    srcWidth,
                    textureCanvas.height,
                    destX,
                    destY,
                    sliceWidth + 0.8, // Overlap to prevent hairline gaps
                    destHeight
                );

                // Dynamic 3D lighting/shading based on slope (cosine of angle)
                const slope = Math.cos(angle);
                if (slope > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${slope * 0.08 * anchorMultiplier})`;
                } else {
                    ctx.fillStyle = `rgba(0, 0, 0, ${-slope * 0.18 * anchorMultiplier})`;
                }
                ctx.fillRect(destX, destY, sliceWidth + 0.8, destHeight);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-100 filter saturate-[1.1] brightness-[0.88]"
        />
    );
}
