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

            // 2. Draw Golden Crest in the Center (Center = 300, 200)
            const cx = 300;
            const cy = 200;

            sctx.strokeStyle = '#E0A926'; // Gold
            sctx.fillStyle = '#E0A926';

            // Draw outer golden ring
            sctx.lineWidth = 2.2;
            sctx.beginPath();
            sctx.arc(cx, cy, 60, 0, Math.PI * 2);
            sctx.stroke();

            // Draw inner golden ring
            sctx.lineWidth = 2.2;
            sctx.beginPath();
            sctx.arc(cx, cy, 55, 0, Math.PI * 2);
            sctx.stroke();

            // Draw "NCC" text in serif font
            sctx.font = 'bold 30px Georgia, serif';
            sctx.textAlign = 'center';
            sctx.textBaseline = 'middle';
            sctx.fillText('N C C', cx, cy - 4);

            // Draw the two dots at the bottom of the circle
            sctx.beginPath();
            sctx.arc(cx - 13, cy + 25, 2.5, 0, Math.PI * 2);
            sctx.arc(cx + 13, cy + 25, 2.5, 0, Math.PI * 2);
            sctx.fill();

            // Helper to draw a high-fidelity detailed lotus flower pointing outwards
            const drawLotus = (lx: number, ly: number, angle: number) => {
                sctx.save();
                sctx.translate(lx, ly);
                sctx.rotate(angle);

                sctx.fillStyle = '#E0A926'; // Gold
                sctx.strokeStyle = '#9a7010'; // Darker outline for definition
                sctx.lineWidth = 0.6;

                const size = 7.5;

                // Center petal (vertical teardrop)
                sctx.beginPath();
                sctx.moveTo(0, -size);
                sctx.quadraticCurveTo(-size * 0.35, -size * 0.3, 0, 0);
                sctx.quadraticCurveTo(size * 0.35, -size * 0.3, 0, -size);
                sctx.fill();
                sctx.stroke();

                // Inner left petal
                sctx.beginPath();
                sctx.moveTo(0, 0);
                sctx.quadraticCurveTo(-size * 0.65, -size * 0.7, -size * 0.5, -size * 0.25);
                sctx.quadraticCurveTo(-size * 0.3, 0, 0, 0);
                sctx.fill();
                sctx.stroke();

                // Inner right petal
                sctx.beginPath();
                sctx.moveTo(0, 0);
                sctx.quadraticCurveTo(size * 0.65, -size * 0.7, size * 0.5, -size * 0.25);
                sctx.quadraticCurveTo(size * 0.3, 0, 0, 0);
                sctx.fill();
                sctx.stroke();

                // Outer left petal
                sctx.beginPath();
                sctx.moveTo(0, 0);
                sctx.quadraticCurveTo(-size * 0.9, -size * 0.35, -size * 0.75, 0);
                sctx.quadraticCurveTo(-size * 0.4, size * 0.1, 0, 0);
                sctx.fill();
                sctx.stroke();

                // Outer right petal
                sctx.beginPath();
                sctx.moveTo(0, 0);
                sctx.quadraticCurveTo(size * 0.9, -size * 0.35, size * 0.75, 0);
                sctx.quadraticCurveTo(size * 0.4, size * 0.1, 0, 0);
                sctx.fill();
                sctx.stroke();

                // Base sepal
                sctx.beginPath();
                sctx.arc(0, 1, size * 0.25, 0, Math.PI * 2);
                sctx.fill();
                sctx.stroke();

                sctx.restore();
            };

            // 3. Draw curved banner (scroll) at the bottom
            sctx.fillStyle = '#181E36'; // Semi-dark Navy Blue fill for scroll readability
            sctx.strokeStyle = '#E0A926'; // Gold border
            sctx.lineWidth = 1.8;

            const rInner = 84;
            const rOuter = 98;
            const startAngle = 52 * Math.PI / 180;
            const endAngle = 128 * Math.PI / 180;

            sctx.beginPath();
            sctx.arc(cx, cy, rOuter, startAngle, endAngle, false);
            
            // Right end fold/V-cut
            const rx1 = cx + Math.cos(endAngle) * rOuter;
            const ry1 = cy + Math.sin(endAngle) * rOuter;
            const rx2 = cx + Math.cos(endAngle) * rInner;
            const ry2 = cy + Math.sin(endAngle) * rInner;
            const rMidX = (rx1 + rx2) / 2 - Math.cos(endAngle) * 5;
            const rMidY = (ry1 + ry2) / 2 - Math.sin(endAngle) * 5;
            sctx.lineTo(rMidX, rMidY);
            sctx.lineTo(rx2, ry2);

            sctx.arc(cx, cy, rInner, endAngle, startAngle, true);

            // Left end fold/V-cut
            const lx1 = cx + Math.cos(startAngle) * rInner;
            const ly1 = cy + Math.sin(startAngle) * rInner;
            const lx2 = cx + Math.cos(startAngle) * rOuter;
            const ly2 = cy + Math.sin(startAngle) * rOuter;
            const lMidX = (lx1 + lx2) / 2 - Math.cos(startAngle) * 5;
            const lMidY = (ly1 + ly2) / 2 - Math.sin(startAngle) * 5;
            sctx.lineTo(lMidX, lMidY);
            sctx.lineTo(lx2, ly2);

            sctx.closePath();
            sctx.fill();
            sctx.stroke();

            // 4. Draw hanging swallowtail ribbons from the scroll bottom
            sctx.fillStyle = '#E0A926';
            sctx.strokeStyle = '#9a7010';
            sctx.lineWidth = 0.6;

            const drawHangingRibbon = (startX: number, startY: number, width: number, length: number) => {
                sctx.beginPath();
                sctx.moveTo(startX, startY);
                sctx.lineTo(startX + width, startY);
                sctx.lineTo(startX + width, startY + length);
                sctx.lineTo(startX + width / 2, startY + length - 4); // Swallowtail V-cut
                sctx.lineTo(startX, startY + length);
                sctx.closePath();
                sctx.fill();
                sctx.stroke();
            };

            const ribbonAngleL = 84 * Math.PI / 180;
            const ribbonAngleR = 96 * Math.PI / 180;
            const rxL = cx + Math.cos(ribbonAngleL) * rOuter;
            const ryL = cy + Math.sin(ribbonAngleL) * rOuter;
            const rxR = cx + Math.cos(ribbonAngleR) * rOuter;
            const ryR = cy + Math.sin(ribbonAngleR) * rOuter;

            drawHangingRibbon(rxL - 4, ryL, 8, 25);
            drawHangingRibbon(rxR - 4, ryR, 8, 25);

            // 5. Draw text "UNITY & DISCIPLINE" curved along the scroll
            sctx.fillStyle = '#E0A926'; // Gold
            sctx.font = 'bold 7.5px sans-serif';
            sctx.textAlign = 'center';
            sctx.textBaseline = 'middle';

            const mottoText = 'UNITY & DISCIPLINE';
            const charCount = mottoText.length;
            const arcLength = endAngle - startAngle;
            const textRadius = (rInner + rOuter) / 2;

            for (let i = 0; i < charCount; i++) {
                const charAngle = startAngle + (i + 0.5) * (arcLength / charCount);
                const charX = cx + Math.cos(charAngle) * textRadius;
                const charY = cy + Math.sin(charAngle) * textRadius;

                sctx.save();
                sctx.translate(charX, charY);
                sctx.rotate(charAngle - Math.PI / 2); // Keep text upright along the curve
                sctx.fillText(mottoText[i], 0, 0);
                sctx.restore();
            }

            // 6. Draw wreath of 17 lotus flowers encircling the crest in a horseshoe shape (open at top)
            const wreathRadius = 75;
            for (let j = -8; j <= 8; j++) {
                // j = 0 is bottom center, j = -8 is top-left, j = 8 is top-right
                const angleStep = 14.5 * Math.PI / 180;
                const angle = Math.PI / 2 + j * angleStep;
                
                const lx = cx + Math.cos(angle) * wreathRadius;
                const ly = cy + Math.sin(angle) * wreathRadius;

                // Rotate lotus to point radially outward
                drawLotus(lx, ly, angle + Math.PI / 2);
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
