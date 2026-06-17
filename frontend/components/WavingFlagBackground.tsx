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

            // 1. Draw official Indian flag horizontal tricolor stripes
            sctx.fillStyle = '#FF9933'; // Saffron
            sctx.fillRect(0, 0, 600, 133.33);

            sctx.fillStyle = '#FFFFFF'; // White
            sctx.fillRect(0, 133.33, 600, 133.34);

            sctx.fillStyle = '#138808'; // India Green
            sctx.fillRect(0, 266.67, 600, 133.33);

            // 2. Draw Navy Blue Ashoka Chakra in the center (Center = 300, 200)
            const cx = 300;
            const cy = 200;
            const chakraRadius = 45;

            sctx.strokeStyle = '#000080'; // Navy Blue
            sctx.fillStyle = '#000080';

            // Outer ring of Chakra
            sctx.lineWidth = 2.5;
            sctx.beginPath();
            sctx.arc(cx, cy, chakraRadius, 0, Math.PI * 2);
            sctx.stroke();

            // Inner hub (center circle)
            sctx.beginPath();
            sctx.arc(cx, cy, 6, 0, Math.PI * 2);
            sctx.fill();

            // 24 spokes
            sctx.lineWidth = 1.2;
            for (let i = 0; i < 24; i++) {
                const angle = (i * 360 / 24) * Math.PI / 180;
                const sx = cx + Math.cos(angle) * 6;
                const sy = cy + Math.sin(angle) * 6;
                const ex = cx + Math.cos(angle) * (chakraRadius - 2);
                const ey = cy + Math.sin(angle) * (chakraRadius - 2);

                sctx.beginPath();
                sctx.moveTo(sx, sy);
                sctx.lineTo(ex, ey);
                sctx.stroke();
            }

            // 24 small rim dots/half-circles
            for (let i = 0; i < 24; i++) {
                const angle = ((i + 0.5) * 360 / 24) * Math.PI / 180;
                const px = cx + Math.cos(angle) * (chakraRadius - 4);
                const py = cy + Math.sin(angle) * (chakraRadius - 4);

                sctx.beginPath();
                sctx.arc(px, py, 2.2, 0, Math.PI * 2);
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
