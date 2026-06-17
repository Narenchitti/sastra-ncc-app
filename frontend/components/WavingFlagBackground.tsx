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

            // 1. Draw NCC Tricolor Stripes (Equal widths of 200px each) - Official Hex Colors
            sctx.fillStyle = '#EF1C24'; // Red
            sctx.fillRect(0, 0, 200, 400);

            sctx.fillStyle = '#2C3092'; // Navy Blue
            sctx.fillRect(200, 0, 200, 400);

            sctx.fillStyle = '#00AEEF'; // Sky Blue
            sctx.fillRect(400, 0, 200, 400);
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
