'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TacticalNode {
    id: string;
    name: string;
    x: number; // Percent of width (0-100)
    y: number; // Percent of height (0-100)
    type: 'base' | 'outpost' | 'radar' | 'target';
    status: 'active' | 'contested' | 'secure';
}

interface NATOUnit {
    id: string;
    label: string;
    type: 'infantry' | 'armor' | 'artillery';
    color: string;
    path: { x: number; y: number }[];
    currentPathIndex: number;
    progress: number; // 0 to 1 along current segment
    speed: number; // Increment per frame
}

interface FiringArc {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    progress: number; // 0 to 1
    color: string;
    height: number; // Max peak of trajectory curve
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

export default function TacticalBattleMap() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

    // Tactical configuration
    const nodes: TacticalNode[] = [
        { id: '1', name: 'HQ_ALPHA_SEC_I', x: 20, y: 30, type: 'base', status: 'secure' },
        { id: '2', name: 'OP_BRAVO_04', x: 45, y: 25, type: 'outpost', status: 'contested' },
        { id: '3', name: 'RADAR_DEPOT_III', x: 75, y: 35, type: 'radar', status: 'secure' },
        { id: '4', name: 'VALLEY_DELTA_X', x: 30, y: 70, type: 'target', status: 'contested' },
        { id: '5', name: 'FORWARDBASE_ECHO', x: 60, y: 75, type: 'base', status: 'secure' },
        { id: '6', name: 'CONVOY_DEST_09', x: 85, y: 70, type: 'outpost', status: 'secure' },
    ];

    // Mouse movement listener for subtle parallax
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (typeof window === 'undefined') return;
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 35,
                y: (e.clientY / window.innerHeight - 0.5) * 35,
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Live terminal log generator
    useEffect(() => {
        const logTemplates = [
            'SAT_LINK: Uplink established with INSAT-3DR.',
            'TELEMETRY: Loading tactical map grid Sector_4.',
            'SYSTEM: AIR_DEFENSE_RADAR is scanning active sectors.',
            'TACTICAL: Friendly armored convoy ALPHA dispatched on Path_Green.',
            'ALERT: Unidentified aerial trajectory detected in sector Bravo-2.',
            'SYS: Calibrating GPS locks... Accuracy: +/- 1.4m.',
            'UNIT: Platoon Charlie established defensive perimeter at OP_BRAVO.',
            'COMM: Frequency hopping cipher active (AES-256).',
            'WAR_ROOM: Tactical threat assessment completed. Status: STABLE.',
        ];

        // Seed logs
        setTerminalLogs([
            'SYS: SYSTEM_BOOT_SEQUENCE_OK',
            'SYS: NET_SHIELD: STABLE',
            'SYS: TACTICAL_GRID: ENGAGED',
        ]);

        const interval = setInterval(() => {
            setTerminalLogs((prev) => {
                const nextLog = logTemplates[Math.floor(Math.random() * logTemplates.length)];
                // Keep last 4 logs
                return [...prev.slice(-3), `[${new Date().toLocaleTimeString()}] ${nextLog}`];
            });
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    // Canvas animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let radarAngle = 0;

        // Initialize state variables for animation
        let activeUnits: NATOUnit[] = [
            {
                id: 'u1',
                label: 'PLTN_ALPHA',
                type: 'armor',
                color: '#D4AF37', // Gold
                path: [
                    { x: 20, y: 30 },
                    { x: 45, y: 25 },
                    { x: 75, y: 35 },
                ],
                currentPathIndex: 0,
                progress: 0,
                speed: 0.0012,
            },
            {
                id: 'u2',
                label: 'RECON_BRAVO',
                type: 'infantry',
                color: '#4A5D23', // Olive
                path: [
                    { x: 30, y: 70 },
                    { x: 60, y: 75 },
                    { x: 85, y: 70 },
                ],
                currentPathIndex: 0,
                progress: 0,
                speed: 0.0018,
            },
            {
                id: 'u3',
                label: 'ARTY_SEC_3',
                type: 'artillery',
                color: '#38bdf8', // Tactical Blue
                path: [
                    { x: 20, y: 30 },
                    { x: 30, y: 70 },
                ],
                currentPathIndex: 0,
                progress: 0,
                speed: 0.0008,
            },
        ];

        let activeArcs: FiringArc[] = [];
        let activeRipples: ImpactRipple[] = [];

        // Resize handler
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

            // Find closest base node
            let closestNode = nodes[0];
            let minDist = Infinity;
            nodes.forEach((node) => {
                const nodeX = (node.x / 100) * w;
                const nodeY = (node.y / 100) * h;
                const dist = Math.hypot(clickX - nodeX, clickY - nodeY);
                if (dist < minDist) {
                    minDist = dist;
                    closestNode = node;
                }
            });

            const startX = (closestNode.x / 100) * w;
            const startY = (closestNode.y / 100) * h;

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

        // Combat fire generator (periodically triggers artillery arcs)
        const triggerCombatFire = () => {
            // Pick a random source node and target node
            const sourceIndex = Math.floor(Math.random() * nodes.length);
            let targetIndex = Math.floor(Math.random() * nodes.length);
            while (targetIndex === sourceIndex) {
                targetIndex = Math.floor(Math.random() * nodes.length);
            }

            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);

            const source = nodes[sourceIndex];
            const target = nodes[targetIndex];

            const startCoords = { x: (source.x / 100) * w, y: (source.y / 100) * h };
            const endCoords = { x: (target.x / 100) * w, y: (target.y / 100) * h };

            // Only fire if reasonable distance
            const dist = Math.hypot(endCoords.x - startCoords.x, endCoords.y - startCoords.y);
            if (dist > 100) {
                const color = Math.random() > 0.6 ? '#dc2626' : '#D4AF37'; // Tactical Red or Gold
                activeArcs.push({
                    id: Math.random().toString(),
                    startX: startCoords.x,
                    startY: startCoords.y,
                    endX: endCoords.x,
                    endY: endCoords.y,
                    progress: 0,
                    color,
                    height: 50 + Math.random() * 100, // height of arc peak
                });
            }
        };

        // Trigger combat fire occasionally
        const combatInterval = setInterval(triggerCombatFire, 4500);

        // Main animation draw loop
        const draw = () => {
            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);

            ctx.clearRect(0, 0, w, h);

            // Apply slight mouse movement parallax (offsets based on states)
            const offsetX = mousePos.x;
            const offsetY = mousePos.y;

            // 1. DRAW SUBTLE MILITARY COORDINATES GRID
            ctx.save();
            ctx.strokeStyle = 'rgba(74, 93, 35, 0.16)'; // Muted military green
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 12]);

            const gridSize = 100;
            const startX = Math.floor(offsetX % gridSize) - gridSize;
            const startY = Math.floor(offsetY % gridSize) - gridSize;

            for (let x = startX; x < w + gridSize; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();

                // Draw small vertical index ticks
                ctx.fillStyle = 'rgba(74, 93, 35, 0.45)';
                ctx.font = '8px monospace';
                if (Math.round(x) % (gridSize * 2) === 0) {
                    ctx.fillText(`LNG ${(79.13 + (x / 20000)).toFixed(4)}E`, x + 5, 12);
                }
            }

            for (let y = startY; y < h + gridSize; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();

                // Draw small horizontal index ticks
                ctx.fillStyle = 'rgba(74, 93, 35, 0.45)';
                ctx.font = '8px monospace';
                if (Math.round(y) % (gridSize * 2) === 0) {
                    ctx.fillText(`LAT ${(10.42 + (y / 20000)).toFixed(4)}N`, 8, y - 4);
                }
            }
            ctx.restore();

            // Draw crosshair '+' markers at grid intersections
            ctx.save();
            ctx.strokeStyle = 'rgba(74, 93, 35, 0.24)';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            for (let x = startX + gridSize; x < w; x += gridSize * 2) {
                for (let y = startY + gridSize; y < h; y += gridSize * 2) {
                    ctx.beginPath();
                    // Horizontal
                    ctx.moveTo(x - 5, y);
                    ctx.lineTo(x + 5, y);
                    // Vertical
                    ctx.moveTo(x, y - 5);
                    ctx.lineTo(x, y + 5);
                    ctx.stroke();
                }
            }
            ctx.restore();

            // 2. DRAW ELEVATION CONTOURS (Subtle battlefield terrain topography)
            ctx.save();
            ctx.strokeStyle = 'rgba(74, 93, 35, 0.14)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([20, 15]);

            // Draw three elevation contour rings around center areas
            const drawContour = (cx: number, cy: number, rx: number, ry: number, stages: number) => {
                for (let i = 0; i < stages; i++) {
                    const currentRx = rx * (0.6 + i * 0.35);
                    const currentRy = ry * (0.6 + i * 0.35);
                    ctx.beginPath();
                    // Add slight irregular wobbles for terrain look
                    for (let a = 0; a <= Math.PI * 2; a += 0.05) {
                        const rWobble = 1 + Math.sin(a * 5) * 0.04;
                        const x = cx + Math.cos(a) * currentRx * rWobble + offsetX * 0.3;
                        const y = cy + Math.sin(a) * currentRy * rWobble + offsetY * 0.3;
                        if (a === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            };
            drawContour(w * 0.35, h * 0.45, 140, 100, 3);
            drawContour(w * 0.72, h * 0.65, 180, 120, 2);
            ctx.restore();

            // 3. DRAW ROTATING RADAR SWEEP (Centered at Radar base node)
            const radarBase = nodes.find((n) => n.type === 'radar');
            if (radarBase) {
                const rCoords = {
                    x: (radarBase.x / 100) * w + offsetX * 0.5,
                    y: (radarBase.y / 100) * h + offsetY * 0.5,
                };
                const radarRadius = Math.min(w, h) * 0.35;

                // Radar Sweep Arc
                ctx.save();
                ctx.beginPath();
                ctx.arc(rCoords.x, rCoords.y, radarRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(74, 93, 35, 0.12)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Nested rings
                ctx.beginPath();
                ctx.arc(rCoords.x, rCoords.y, radarRadius * 0.6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(rCoords.x, rCoords.y, radarRadius * 0.3, 0, Math.PI * 2);
                ctx.stroke();

                // Radar Sweeper sector gradient
                radarAngle += 0.005; // Radar rotation speed
                ctx.translate(rCoords.x, rCoords.y);
                ctx.rotate(radarAngle);

                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radarRadius);
                grad.addColorStop(0, 'rgba(74, 93, 35, 0.18)');
                grad.addColorStop(0.8, 'rgba(74, 93, 35, 0.08)');
                grad.addColorStop(1, 'rgba(74, 93, 35, 0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                // Sweep covers 45 degrees
                ctx.arc(0, 0, radarRadius, 0, Math.PI / 4);
                ctx.closePath();
                ctx.fill();

                // Sweeper edge line
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.26)'; // Faint gold sweeper edge
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(radarRadius, 0);
                ctx.stroke();

                ctx.restore();
            }

            // 4. DRAW STRATEGIC NODES (Military bases, outposts)
            nodes.forEach((node) => {
                const nX = (node.x / 100) * w + offsetX * 0.5;
                const nY = (node.y / 100) * h + offsetY * 0.5;

                ctx.save();

                // Outer reticle indicator
                ctx.lineWidth = 1;
                if (node.status === 'contested') {
                    ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)'; // Red glow for contested
                    ctx.fillStyle = 'rgba(220, 38, 38, 0.06)';
                } else {
                    ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)'; // Gold outline
                    ctx.fillStyle = 'rgba(212, 175, 55, 0.06)';
                }

                // Draw symbol shape based on type
                ctx.beginPath();
                if (node.type === 'base') {
                    // Octagon base shape
                    for (let i = 0; i < 8; i++) {
                        const angle = (i * Math.PI) / 4;
                        const x = nX + Math.cos(angle) * 12;
                        const y = nY + Math.sin(angle) * 12;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Inner dot
                    ctx.fillStyle = node.status === 'contested' ? 'rgba(220, 38, 38, 0.65)' : 'rgba(212, 175, 55, 0.65)';
                    ctx.beginPath();
                    ctx.arc(nX, nY, 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (node.type === 'radar') {
                    // Triangle radar tower
                    ctx.moveTo(nX, nY - 12);
                    ctx.lineTo(nX + 10, nY + 8);
                    ctx.lineTo(nX - 10, nY + 8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Sweeper waves
                    ctx.beginPath();
                    ctx.arc(nX, nY, 16, Math.PI * 1.2, Math.PI * 1.8);
                    ctx.stroke();
                } else {
                    // Diamond outpost/target shape
                    ctx.moveTo(nX, nY - 10);
                    ctx.lineTo(nX + 10, nY);
                    ctx.lineTo(nX, nY + 10);
                    ctx.lineTo(nX - 10, nY);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }

                // Node text telemetry logs
                ctx.fillStyle = node.status === 'contested' ? 'rgba(220, 38, 38, 0.65)' : 'rgba(212, 175, 55, 0.65)';
                ctx.font = '8.5px monospace';
                ctx.fillText(node.name, nX + 16, nY - 2);

                // Small grid tag
                ctx.fillStyle = 'rgba(74, 93, 35, 0.5)';
                ctx.font = '7.5px monospace';
                ctx.fillText(`SEC_${node.x.toFixed(0)}:${node.y.toFixed(0)}`, nX + 16, nY + 7);

                ctx.restore();
            });

            // 5. DRAW ACTIVE MOVING UNITS (NATO styles & paths)
            activeUnits.forEach((unit) => {
                // Determine current path segment
                const startPoint = unit.path[unit.currentPathIndex];
                const endPoint = unit.path[unit.currentPathIndex + 1];

                if (!endPoint) {
                    // Loop path back
                    unit.currentPathIndex = 0;
                    unit.progress = 0;
                    return;
                }

                // Interpolate position
                const startCoords = {
                    x: (startPoint.x / 100) * w + offsetX * 0.5,
                    y: (startPoint.y / 100) * h + offsetY * 0.5,
                };
                const endCoords = {
                    x: (endPoint.x / 100) * w + offsetX * 0.5,
                    y: (endPoint.y / 100) * h + offsetY * 0.5,
                };

                const currentX = startCoords.x + (endCoords.x - startCoords.x) * unit.progress;
                const currentY = startCoords.y + (endCoords.y - startCoords.y) * unit.progress;

                // Update progress
                unit.progress += unit.speed;
                if (unit.progress >= 1) {
                    unit.progress = 0;
                    unit.currentPathIndex++;
                }

                // Draw path line (Dotted connection vector)
                ctx.save();
                ctx.strokeStyle = 'rgba(74, 93, 35, 0.2)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                ctx.moveTo(startCoords.x, startCoords.y);
                ctx.lineTo(endCoords.x, endCoords.y);
                ctx.stroke();
                ctx.restore();

                // Draw NATO Vector Symbol Box
                ctx.save();
                ctx.translate(currentX, currentY);

                // Box boundaries
                ctx.strokeStyle = unit.color === '#D4AF37' ? 'rgba(212, 175, 55, 0.5)' : 'rgba(74, 93, 35, 0.5)';
                ctx.fillStyle = 'rgba(12, 16, 8, 0.7)'; // solid background to hide grid underneath
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.rect(-10, -8, 20, 16);
                ctx.fill();
                ctx.stroke();

                // NATO contents
                ctx.strokeStyle = unit.color === '#D4AF37' ? 'rgba(212, 175, 55, 0.55)' : 'rgba(74, 93, 35, 0.55)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (unit.type === 'infantry') {
                    // Crossed infantry lines (X)
                    ctx.moveTo(-10, -8);
                    ctx.lineTo(10, 8);
                    ctx.moveTo(10, -8);
                    ctx.lineTo(-10, 8);
                } else if (unit.type === 'armor') {
                    // Armored track (oval)
                    ctx.arc(0, 0, 4, 0, Math.PI * 2);
                } else if (unit.type === 'artillery') {
                    // Artillery dot
                    ctx.arc(0, 0, 2, 0, Math.PI * 2);
                }
                ctx.stroke();

                // Telemetry tag next to unit
                ctx.fillStyle = 'rgba(212, 175, 55, 0.55)';
                ctx.font = '7.5px monospace';
                ctx.fillText(unit.label, 14, -2);
                ctx.fillStyle = 'rgba(74, 93, 35, 0.6)';
                ctx.fillText(`DIR: ${(unit.progress * 360).toFixed(0)}°`, 14, 6);

                ctx.restore();
            });

            // 6. DRAW FIRING ARCS (Combat trajectory simulations)
            activeArcs.forEach((arc, idx) => {
                arc.progress += 0.007; // Speed of trajectory shell

                if (arc.progress >= 1) {
                    playSynthSound('explosion');
                    // Remove arc and register impact ripple
                    activeRipples.push({
                        id: Math.random().toString(),
                        x: arc.endX,
                        y: arc.endY,
                        radius: 1,
                        maxRadius: 40 + Math.random() * 30,
                        alpha: 0.5,
                        label: `IMPACT_VAL_${Math.floor(100 + Math.random() * 900)}`,
                    });
                    activeArcs.splice(idx, 1);
                    return;
                }

                // Draw parabolic path
                ctx.save();
                ctx.strokeStyle = arc.color === '#dc2626' ? 'rgba(220, 38, 38, 0.28)' : 'rgba(212, 175, 55, 0.28)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 5]);

                // Calculate bezier control point for height
                const midX = (arc.startX + arc.endX) / 2;
                const midY = (arc.startY + arc.endY) / 2 - arc.height;

                ctx.beginPath();
                ctx.moveTo(arc.startX, arc.startY);
                ctx.quadraticCurveTo(midX, midY, arc.endX, arc.endY);
                ctx.stroke();

                // Interpolate bullet position along quadratic bezier curve
                const t = arc.progress;
                const bulletX = (1 - t) * (1 - t) * arc.startX + 2 * (1 - t) * t * midX + t * t * arc.endX;
                const bulletY = (1 - t) * (1 - t) * arc.startY + 2 * (1 - t) * t * midY + t * t * arc.endY;

                // Faint trace path
                ctx.fillStyle = arc.color;
                ctx.shadowColor = arc.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(bulletX, bulletY, 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });

            // 7. DRAW IMPACT RIPPLES (Explosions/Concentric rings)
            activeRipples.forEach((ripple, idx) => {
                ripple.radius += 1.2;
                ripple.alpha = 1 - ripple.radius / ripple.maxRadius;

                if (ripple.alpha <= 0) {
                    activeRipples.splice(idx, 1);
                    return;
                }

                ctx.save();
                ctx.strokeStyle = `rgba(220, 38, 38, ${ripple.alpha * 0.65})`;
                ctx.lineWidth = 1.5;

                // Outer ripple
                ctx.beginPath();
                ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                ctx.stroke();

                // Secondary internal ripple
                if (ripple.radius > 15) {
                    ctx.strokeStyle = `rgba(212, 175, 55, ${ripple.alpha * 0.45})`;
                    ctx.beginPath();
                    ctx.arc(ripple.x, ripple.y, ripple.radius - 12, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Impact tag details
                ctx.fillStyle = `rgba(220, 38, 38, ${ripple.alpha})`;
                ctx.font = '8px monospace';
                ctx.fillText(`* ${ripple.label} *`, ripple.x - 30, ripple.y - ripple.radius - 4);

                ctx.restore();
            });

            // Loop again
            animationFrameId = requestAnimationFrame(draw);
        };

        // Start drawing
        draw();

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId);
            clearInterval(combatInterval);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('click', handleWindowClick);
        };
    }, [mousePos]);

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
            {/* Main simulation Canvas */}
            <canvas ref={canvasRef} className="block w-full h-full opacity-65 mix-blend-screen" />
        </div>
    );
}
