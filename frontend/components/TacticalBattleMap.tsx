'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Hill {
    id: string;
    name: string;
    x: number; // Percent of canvas width (0 - 100)
    y: number; // Percent of canvas height (0 - 100)
    peak: number; // Peak elevation in meters (e.g., 283)
    radius: number; // Size of the hill base
    speedMult: number; // Speed offset for animation
    opacityMult?: number; // Opacity scaler for minor background hills
}



interface PatrolRoute {
    points: { x: number; y: number }[]; // Coordinates in percentage
    color: string;
}

export default function TacticalBattleMap() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mousePosRef = useRef({ x: 0, y: 0 });

    // Primary topographic elevation centers (Hills) matching the military references
    const hills: Hill[] = [
        // Primary prominent peaks
        { id: 'h1', name: 'PEAK_ALPHA_283', x: 25, y: 35, peak: 283, radius: 190, speedMult: 1.0, opacityMult: 1.0 },
        { id: 'h2', name: 'PEAK_BRAVO_291', x: 72, y: 30, peak: 291, radius: 240, speedMult: 0.8, opacityMult: 1.0 },
        { id: 'h3', name: 'ELEV_CHARLIE_200', x: 45, y: 75, peak: 200, radius: 170, speedMult: 1.2, opacityMult: 1.0 },
        { id: 'h4', name: 'SEC_DELTA_250', x: 80, y: 80, peak: 250, radius: 200, speedMult: 0.9, opacityMult: 1.0 },
        // Secondary minor/faint contour fills (Hybrid approach)
        { id: 'm1', name: 'RIDGE_I', x: 8, y: 65, peak: 140, radius: 155, speedMult: 1.1, opacityMult: 0.22 },
        { id: 'm2', name: 'PLATEAU_II', x: 50, y: 15, peak: 180, radius: 165, speedMult: 0.7, opacityMult: 0.22 },
        { id: 'm3', name: 'RIDGE_III', x: 95, y: 52, peak: 160, radius: 185, speedMult: 1.3, opacityMult: 0.22 },
        { id: 'm4', name: 'VALLEY_IV', x: 12, y: 95, peak: 120, radius: 145, speedMult: 1.0, opacityMult: 0.22 },
    ];

    // Scrolling patrol routes
    const routes: PatrolRoute[] = [
        {
            points: [
                { x: 10, y: 20 },
                { x: 25, y: 35 },
                { x: 45, y: 30 },
                { x: 55, y: 55 },
                { x: 45, y: 75 },
                { x: 80, y: 80 },
            ],
            color: 'rgba(212, 175, 55, 0.45)', // Gold
        },
        {
            points: [
                { x: 90, y: 15 },
                { x: 72, y: 30 },
                { x: 55, y: 55 },
                { x: 30, y: 80 },
            ],
            color: 'rgba(80, 200, 120, 0.4)', // Neon Green
        }
    ];

    // Mouse movement listener for parallax and vertical depth tracking
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (typeof window === 'undefined') return;
            mousePosRef.current = {
                x: e.clientX,
                y: e.clientY,
            };
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Canvas animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let routeDashOffset = 0;
        let time = 0;
        let lastTime = performance.now();
        const fpsInterval = 1000 / 30; // 30 FPS ceiling

        // Handle scaling for high-DPI displays
        const handleResize = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = containerRef.current?.clientWidth || window.innerWidth;
            const height = containerRef.current?.clientHeight || window.innerHeight;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.scale(dpr, dpr);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        // Web Audio API Synthesizer for Retro Military HUD Sounds
        const playSynthSound = (type: 'laser' | 'explosion' | 'beep') => {
            if (typeof window === 'undefined') return;
            const isMuted = localStorage.getItem('ncc_sound_muted') === 'true';
            if (isMuted) return;

            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);

                if (type === 'laser') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.22);
                    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.22);
                } else if (type === 'explosion') {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(90, audioCtx.currentTime);
                    osc.frequency.linearRampToValueAtTime(10, audioCtx.currentTime + 0.4);
                    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.4);
                } else if (type === 'beep') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(650, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.08);
                }
            } catch (err) {
                // Ignore autoplay block errors
            }
        };

        // Main animation draw loop
        const draw = () => {
            animationFrameId = requestAnimationFrame(draw);

            const now = performance.now();
            const elapsed = now - lastTime;

            if (elapsed < fpsInterval) return;

            // Adjust lastTime to align with elapsed modulo interval
            lastTime = now - (elapsed % fpsInterval);

            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);

            time += 0.0006;
            routeDashOffset += 0.07;

            ctx.clearRect(0, 0, w, h);

            // 1. DRAW CAMOUFLAGE GRADIENT BACKGROUNDS
            const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, '#060c04');
            bgGrad.addColorStop(0.5, '#0b1809');
            bgGrad.addColorStop(1, '#050b03');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            const camoBlobs = [
                { x: w * 0.2, y: h * 0.3, r: Math.min(w, h) * 0.45, color: 'rgba(28, 55, 18, 0.88)' },
                { x: w * 0.75, y: h * 0.25, r: Math.min(w, h) * 0.55, color: 'rgba(38, 72, 25, 0.85)' },
                { x: w * 0.45, y: h * 0.75, r: Math.min(w, h) * 0.5, color: 'rgba(48, 90, 32, 0.78)' },
                { x: w * 0.1, y: h * 0.8, r: Math.min(w, h) * 0.38, color: 'rgba(38, 72, 25, 0.82)' },
                { x: w * 0.85, y: h * 0.8, r: Math.min(w, h) * 0.45, color: 'rgba(28, 55, 18, 0.85)' },
            ];

            camoBlobs.forEach((blob) => {
                const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
                grad.addColorStop(0, blob.color);
                grad.addColorStop(1, 'rgba(8, 11, 6, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
                ctx.fill();
            });

            // 2. DRAW HUD COORDINATES IN TOP-LEFT (Topography metadata)
            ctx.save();
            ctx.fillStyle = 'rgba(80, 200, 120, 0.45)';
            ctx.font = '8px monospace';
            ctx.fillText(`LAT: 10°45'27" N`, 16, 24);
            ctx.fillText(`LNG: 79°01'33" E`, 16, 36);
            ctx.fillText(`GST: ${new Date().toLocaleTimeString()}`, 16, 48);
            ctx.fillText(`ELV: 283m // SASTRA_CAMPUS`, 16, 60);
            ctx.restore();

            // 3. DRAW TACTICAL GRID OVERLAY (Grid ticks)
            ctx.save();
            ctx.strokeStyle = 'rgba(80, 220, 100, 0.35)'; // More prominent green grid lines
            ctx.lineWidth = 0.8;
            ctx.setLineDash([2, 8]);

            const gridSize = 100;
            for (let x = 0; x < w; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y < h; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            ctx.restore();

            // 4. DRAW SMOOTH CONTUR LINES WITH LABELS (Wavy rings wrapping centers)
            hills.forEach((hill) => {
                const cx = (hill.x / 100) * w;
                const cy = (hill.y / 100) * h;

                // Adjust animation frequencies per hill
                const phase3 = time * 2.5 * hill.speedMult;
                const phase7 = time * 4.2 * hill.speedMult;
                const phase11 = time * 6.1 * hill.speedMult;

                ctx.save();
                ctx.lineWidth = 1.0;

                // Render 10 contour elevation levels
                const alphaMult = hill.opacityMult ?? 1.0;
                for (let l = 1; l <= 11; l++) {
                    const R_base = hill.radius * (l / 11);
                    
                    // Style rings differently from outer to inner peaks
                    if (l === 11) {
                        ctx.strokeStyle = `rgba(212, 175, 55, ${0.65 * alphaMult})`; // Peak center marker
                    } else if (l % 3 === 0) {
                        ctx.strokeStyle = `rgba(80, 220, 100, ${0.65 * alphaMult})`; // Highlight contour line
                        ctx.lineWidth = 1.5;
                    } else {
                        ctx.strokeStyle = `rgba(80, 220, 100, ${0.3 * alphaMult})`; // Normal contour line
                        ctx.lineWidth = 1.0;
                    }

                    ctx.beginPath();
                    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.04) {
                        // Math formula creating highly realistic, natural wavy topography contours
                        const wobble = 1 + 
                            0.065 * Math.sin(3 * a + phase3) + 
                            0.035 * Math.cos(7 * a + phase7) + 
                            0.018 * Math.sin(11 * a + phase11);
                        
                        const r = R_base * wobble;
                        const px = cx + Math.cos(a) * r;
                        const py = cy + Math.sin(a) * r;

                        if (a === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();

                    // Render elevation text labels along contour lines
                    if (l % 3 === 0 && l < 11 && alphaMult > 0.4) {
                        const labelAngle = Math.PI * 0.25 + (l * 0.04);
                        const labelWobble = 1 + 
                            0.065 * Math.sin(3 * labelAngle + phase3) + 
                            0.035 * Math.cos(7 * labelAngle + phase7) + 
                            0.018 * Math.sin(11 * labelAngle + phase11);
                        
                        const labelR = R_base * labelWobble;
                        const lx = cx + Math.cos(labelAngle) * labelR;
                        const ly = cy + Math.sin(labelAngle) * labelR;

                        ctx.save();
                        // Cut/clear out background behind text
                        ctx.fillStyle = '#080b06';
                        ctx.fillRect(lx - 11, ly - 6, 22, 12);

                        // Render altitude font (military gold)
                        ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
                        ctx.font = '7.5px monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        const elevationText = Math.round((hill.peak * (l / 11)));
                        ctx.fillText(elevationText.toString(), lx, ly);
                        ctx.restore();
                    }
                }

                // Peak coordinates marker text label
                if (alphaMult > 0.4) {
                    ctx.fillStyle = 'rgba(80, 200, 120, 0.45)';
                    ctx.font = '7px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(`▲ ${hill.name}`, cx, cy - 6);
                }

                ctx.restore();
            });

            // 5. DRAW PATROL DASHTRACKS (Scrolling paths)
            routes.forEach((route) => {
                ctx.save();
                ctx.strokeStyle = route.color;
                ctx.lineWidth = 1.2;
                ctx.setLineDash([5, 8]);
                ctx.lineDashOffset = -routeDashOffset;

                ctx.beginPath();
                const startX = (route.points[0].x / 100) * w;
                const startY = (route.points[0].y / 100) * h;
                ctx.moveTo(startX, startY);

                for (let i = 1; i < route.points.length; i++) {
                    const px = (route.points[i].x / 100) * w;
                    const py = (route.points[i].y / 100) * h;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
                ctx.restore();
            });

            // 6. DRAW VERTICAL DEPTH GAUGE SCALE (Left Ruler)
            ctx.save();
            const rulerX = 50;
            const startY = h * 0.15;
            const endY = h * 0.85;

            ctx.strokeStyle = 'rgba(80, 200, 120, 0.28)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(rulerX, startY);
            ctx.lineTo(rulerX, endY);
            ctx.stroke();

            // Render gauge ruler ticks
            for (let y = startY; y <= endY; y += 8) {
                const isMajor = Math.round(y - startY) % 40 === 0;
                ctx.beginPath();
                ctx.moveTo(rulerX, y);
                ctx.lineTo(rulerX - (isMajor ? 8 : 4), y);
                ctx.stroke();

                if (isMajor) {
                    ctx.fillStyle = 'rgba(80, 200, 120, 0.4)';
                    ctx.font = '7px monospace';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    const depthVal = Math.round((y * 0.65) + 30);
                    ctx.fillText(depthVal.toString(), rulerX - 12, y);
                }
            }

            // Draw tracking pointer following Y coordinates of mouse
            const currentPointerY = Math.max(startY, Math.min(endY, mousePosRef.current.y));
            ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
            ctx.beginPath();
            ctx.moveTo(rulerX, currentPointerY);
            ctx.lineTo(rulerX + 6, currentPointerY - 4);
            ctx.lineTo(rulerX + 6, currentPointerY + 4);
            ctx.closePath();
            ctx.fill();

            // Elevation telemetry next to pointer
            ctx.font = '7.5px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const depthMetric = Math.round(currentPointerY * 0.65 + 30);
            ctx.fillText(`ELV: ${depthMetric}m`, rulerX + 10, currentPointerY);
            ctx.restore();

            // 7. DRAW AMBIENT SCAN PULSES FROM HILL PEAKS
            hills.forEach((hill) => {
                if (hill.opacityMult && hill.opacityMult < 0.3) return; // skip minor ridges
                const cx = (hill.x / 100) * w;
                const cy = (hill.y / 100) * h;

                // Radar scan pulses cycle from radius 0 to 140px based on time
                const tPulse = (time * 65 * hill.speedMult) % 180;
                const maxRadius = 140;
                
                if (tPulse < maxRadius) {
                    const alpha = (1 - tPulse / maxRadius) * 0.12; // very soft and subtle
                    ctx.save();
                    ctx.strokeStyle = `rgba(80, 200, 120, ${alpha})`;
                    ctx.lineWidth = 1.0;
                    ctx.beginPath();
                    ctx.arc(cx, cy, tPulse, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            });

        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
            <canvas ref={canvasRef} className="block w-full h-full opacity-55 mix-blend-screen" />
        </div>
    );
}
