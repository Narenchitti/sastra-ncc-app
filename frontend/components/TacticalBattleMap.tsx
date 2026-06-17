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
}

interface FiringArc {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    progress: number;
    color: string;
    height: number;
}

interface ImpactRipple {
    id: string;
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    label: string;
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
        { id: 'h1', name: 'PEAK_ALPHA_283', x: 25, y: 35, peak: 283, radius: 190, speedMult: 1.0 },
        { id: 'h2', name: 'PEAK_BRAVO_291', x: 72, y: 30, peak: 291, radius: 240, speedMult: 0.8 },
        { id: 'h3', name: 'ELEV_CHARLIE_200', x: 45, y: 75, peak: 200, radius: 170, speedMult: 1.2 },
        { id: 'h4', name: 'SEC_DELTA_250', x: 80, y: 80, peak: 250, radius: 200, speedMult: 0.9 },
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

        let activeArcs: FiringArc[] = [];
        let activeRipples: ImpactRipple[] = [];

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

        // Click handler to shoot target and create explosion
        const handleWindowClick = (e: MouseEvent) => {
            // Prevent custom click effect on inputs, buttons, and links
            const target = e.target as HTMLElement;
            if (
                !target ||
                target.closest('button') ||
                target.closest('a') ||
                target.closest('input') ||
                target.closest('textarea') ||
                target.closest('select') ||
                target.closest('label') ||
                target.getAttribute('role') === 'button' ||
                target.classList.contains('cursor-pointer')
            ) {
                playSynthSound('beep');
                return;
            }

            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);

            const clickX = e.clientX;
            const clickY = e.clientY;

            // Find closest hill peak
            let closestHill = hills[0];
            let minDist = Infinity;
            hills.forEach((hill) => {
                const hillX = (hill.x / 100) * w;
                const hillY = (hill.y / 100) * h;
                const dist = Math.hypot(clickX - hillX, clickY - hillY);
                if (dist < minDist) {
                    minDist = dist;
                    closestHill = hill;
                }
            });

            const startX = (closestHill.x / 100) * w;
            const startY = (closestHill.y / 100) * h;

            playSynthSound('laser');

            activeArcs.push({
                id: Math.random().toString(),
                startX: startX,
                startY: startY,
                endX: clickX,
                endY: clickY,
                progress: 0,
                color: '#50C878', // Tactical Green
                height: Math.min(130, Math.hypot(clickX - startX, clickY - startY) * 0.35),
            });
        };

        window.addEventListener('click', handleWindowClick);

        // Main animation draw loop
        const draw = () => {
            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);

            time += 0.003;
            routeDashOffset += 0.3;

            ctx.clearRect(0, 0, w, h);

            // 1. DRAW CAMOUFLAGE GRADIENT BACKGROUNDS
            ctx.fillStyle = '#080b06';
            ctx.fillRect(0, 0, w, h);

            const camoBlobs = [
                { x: w * 0.2, y: h * 0.3, r: Math.min(w, h) * 0.38, color: 'rgba(28, 45, 18, 0.8)' },
                { x: w * 0.75, y: h * 0.25, r: Math.min(w, h) * 0.48, color: 'rgba(38, 62, 25, 0.75)' },
                { x: w * 0.45, y: h * 0.75, r: Math.min(w, h) * 0.42, color: 'rgba(48, 80, 32, 0.65)' },
                { x: w * 0.1, y: h * 0.8, r: Math.min(w, h) * 0.32, color: 'rgba(38, 62, 25, 0.7)' },
                { x: w * 0.85, y: h * 0.8, r: Math.min(w, h) * 0.38, color: 'rgba(28, 45, 18, 0.75)' },
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
            ctx.strokeStyle = 'rgba(74, 93, 35, 0.12)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 12]);

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
                for (let l = 1; l <= 11; l++) {
                    const R_base = hill.radius * (l / 11);
                    
                    // Style rings differently from outer to inner peaks
                    if (l === 11) {
                        ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)'; // Peak center marker
                    } else if (l % 3 === 0) {
                        ctx.strokeStyle = 'rgba(80, 220, 100, 0.65)'; // Highlight contour line
                        ctx.lineWidth = 1.5;
                    } else {
                        ctx.strokeStyle = 'rgba(80, 220, 100, 0.3)'; // Normal contour line
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
                    if (l % 3 === 0 && l < 11) {
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
                ctx.fillStyle = 'rgba(80, 200, 120, 0.45)';
                ctx.font = '7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`▲ ${hill.name}`, cx, cy - 6);

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

            // 7. DRAW ACTIVE FIRING PROJECTILE ARCS
            activeArcs.forEach((arc, idx) => {
                arc.progress += 0.007;

                if (arc.progress >= 1) {
                    playSynthSound('explosion');
                    activeRipples.push({
                        id: Math.random().toString(),
                        x: arc.endX,
                        y: arc.endY,
                        radius: 1,
                        maxRadius: 45 + Math.random() * 25,
                        alpha: 0.6,
                        label: `IMPACT_LAT_${(10.77 + Math.random() * 0.01).toFixed(4)}`,
                    });
                    activeArcs.splice(idx, 1);
                    return;
                }

                ctx.save();
                ctx.strokeStyle = 'rgba(80, 200, 120, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 5]);

                const midX = (arc.startX + arc.endX) / 2;
                const midY = (arc.startY + arc.endY) / 2 - arc.height;

                ctx.beginPath();
                ctx.moveTo(arc.startX, arc.startY);
                ctx.quadraticCurveTo(midX, midY, arc.endX, arc.endY);
                ctx.stroke();

                const t = arc.progress;
                const bulletX = (1 - t) * (1 - t) * arc.startX + 2 * (1 - t) * t * midX + t * t * arc.endX;
                const bulletY = (1 - t) * (1 - t) * arc.startY + 2 * (1 - t) * t * midY + t * t * arc.endY;

                ctx.fillStyle = '#50C878';
                ctx.shadowColor = '#50C878';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(bulletX, bulletY, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // 8. DRAW ACTIVE IMPACT EXPLOSION RIPPLES
            activeRipples.forEach((ripple, idx) => {
                ripple.radius += 1.3;
                ripple.alpha = 1 - ripple.radius / ripple.maxRadius;

                if (ripple.alpha <= 0) {
                    activeRipples.splice(idx, 1);
                    return;
                }

                ctx.save();
                ctx.strokeStyle = `rgba(220, 38, 38, ${ripple.alpha * 0.65})`;
                ctx.lineWidth = 1.2;

                ctx.beginPath();
                ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                ctx.stroke();

                if (ripple.radius > 15) {
                    ctx.strokeStyle = `rgba(212, 175, 55, ${ripple.alpha * 0.45})`;
                    ctx.beginPath();
                    ctx.arc(ripple.x, ripple.y, ripple.radius - 12, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.fillStyle = `rgba(220, 38, 38, ${ripple.alpha})`;
                ctx.font = '7.5px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`* TRG LOCK: ${ripple.label} *`, ripple.x, ripple.y - ripple.radius - 4);
                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('click', handleWindowClick);
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
            <canvas ref={canvasRef} className="block w-full h-full opacity-70 mix-blend-screen" />
        </div>
    );
}
