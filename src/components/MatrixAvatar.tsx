import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AvatarState = 
    | 'idle'
    | 'thinking'
    | 'streaming'
    | 'task-created'
    | 'event-created'
    | 'error'
    | 'offline'
    | 'success';

interface MatrixAvatarProps {
    compact?: boolean;
    state?: AvatarState;
    onClick?: () => void;
}

function getStateTitle(state: AvatarState): string {
    switch (state) {
        case 'thinking': return 'AI is thinking...';
        case 'streaming': return 'AI is responding...';
        case 'task-created': return 'Task created!';
        case 'event-created': return 'Event scheduled!';
        case 'error': return 'Something went wrong';
        case 'offline': return 'Connection lost';
        case 'success': return 'Completed!';
        default: return 'AI Assistant is listening...';
    }
}

function getStateBorderColor(state: AvatarState): string {
    switch (state) {
        case 'error': return 'rgba(255, 100, 100, 0.5)';
        case 'task-created': return 'rgba(100, 255, 100, 0.5)';
        case 'event-created': return 'rgba(100, 150, 255, 0.5)';
        case 'success': return 'rgba(255, 215, 0, 0.5)';
        case 'streaming': return 'rgba(150, 200, 255, 0.4)';
        default: return 'rgba(255, 255, 255, 0.3)';
    }
}

export const MatrixAvatar = ({ compact = false, state = 'idle', onClick }: MatrixAvatarProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size based on mode
        const size = compact ? { width: 120, height: 150 } : { width: 400, height: 500 };
        canvas.width = size.width;
        canvas.height = size.height;

        // Matrix rain characters
        const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
        const fontSize = 10;
        const columns = canvas.width / fontSize;
        const drops: number[] = Array(Math.floor(columns)).fill(1);

        // Adjust animation speed based on state
        const speedMultiplier = state === 'streaming' ? 1.5 : 
                                state === 'thinking' ? 1.2 : 
                                state === 'offline' ? 0.5 : 1;

        let animationFrameId: number;

        const draw = () => {
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];

                // Color based on state
                let colorStart = "rgba(255, 255, 255, 0.9)";
                let colorEnd = "rgba(200, 200, 200, 0.5)";

                if (state === 'error') {
                    colorStart = "rgba(255, 100, 100, 0.9)";
                    colorEnd = "rgba(200, 50, 50, 0.5)";
                } else if (state === 'task-created') {
                    colorStart = "rgba(100, 255, 100, 0.9)";
                    colorEnd = "rgba(50, 200, 50, 0.5)";
                } else if (state === 'event-created') {
                    colorStart = "rgba(100, 150, 255, 0.9)";
                    colorEnd = "rgba(50, 100, 200, 0.5)";
                } else if (state === 'success') {
                    colorStart = "rgba(255, 215, 0, 0.9)";
                    colorEnd = "rgba(255, 180, 0, 0.5)";
                }

                const gradient = ctx.createLinearGradient(0, drops[i] * fontSize - fontSize, 0, drops[i] * fontSize);
                gradient.addColorStop(0, colorStart);
                gradient.addColorStop(1, colorEnd);
                ctx.fillStyle = gradient;

                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > (0.975 / speedMultiplier)) {
                    drops[i] = 0;
                }
                drops[i] += speedMultiplier;
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [compact, state]);

    const svgSize = compact ? { width: 120, height: 150 } : { width: 400, height: 500 };

    // Determine animation parameters based on state
    const getEyeAnimation = () => {
        switch (state) {
            case 'streaming':
                return {
                    ry: [25, 3, 25],
                    duration: 1.5,
                };
            case 'thinking':
                return {
                    ry: [25, 8, 25],
                    duration: 2,
                };
            case 'offline':
                return {
                    ry: [25, 20, 25],
                    duration: 6,
                };
            default:
                return {
                    ry: [25, 5, 25],
                    duration: 4,
                };
        }
    };

    const getFaceGlow = () => {
        switch (state) {
            case 'error':
                return "rgba(255, 100, 100, 0.4)";
            case 'task-created':
                return "rgba(100, 255, 100, 0.4)";
            case 'event-created':
                return "rgba(100, 150, 255, 0.4)";
            case 'success':
                return "rgba(255, 215, 0, 0.4)";
            case 'streaming':
                return "rgba(150, 200, 255, 0.3)";
            default:
                return "rgba(255, 255, 255, 0.2)";
        }
    };

    const getMouthAnimation = () => {
        if (state === 'success' || state === 'task-created' || state === 'event-created') {
            return {
                d: [
                    "M 170 320 Q 200 340 230 320",
                    "M 170 315 Q 200 345 230 315",
                    "M 170 320 Q 200 340 230 320",
                ],
                duration: 2,
            };
        }
        return {
            d: [
                "M 170 320 Q 200 340 230 320",
                "M 170 325 Q 200 335 230 325",
                "M 170 320 Q 200 340 230 320",
            ],
            duration: 4,
        };
    };

    const eyeAnim = getEyeAnimation();
    const faceGlow = getFaceGlow();
    const mouthAnim = getMouthAnimation();

    return (
        <motion.div
            className={`overflow-hidden ${
                compact 
                    ? "fixed bottom-[5.5rem] right-[50%] translate-x-[50%] md:translate-x-0 md:right-12 w-[120px] h-[150px] pointer-events-auto cursor-pointer group z-30" 
                    : "absolute inset-0 flex items-center justify-center pointer-events-none"
            }`}
            initial={false}
            animate={{
                opacity: compact ? 0.7 : (state === 'offline' ? 0.4 : 1),
            }}
            whileHover={compact ? { opacity: 0.9, scale: 1.02 } : undefined}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            onClick={compact && onClick ? onClick : undefined}
            title={compact ? (onClick ? "Click to view AI memory" : getStateTitle(state)) : undefined}
        >
            {/* Compact mode backdrop */}
            {compact && (
                <motion.div
                    className="absolute inset-0 bg-background/40 backdrop-blur-sm rounded-2xl group-hover:bg-background/50 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ 
                        opacity: 1
                    }}
                    transition={{ duration: 0.5 }}
                />
            )}
            <motion.div
                initial={false}
                animate={compact ? {
                    scale: state === 'success' || state === 'task-created' || state === 'event-created' 
                        ? [1, 1.1, 1] 
                        : state === 'streaming' || state === 'thinking'
                        ? [1, 1.03, 1]
                        : [1, 1.05, 1],
                    opacity: [1, 0.8, 1]
                } : {
                    scale: 1,
                    opacity: 1
                }}
                transition={compact ? {
                    duration: state === 'success' || state === 'task-created' || state === 'event-created' ? 1.5 : 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                } : {
                    duration: 0.6,
                    ease: "easeOut"
                }}
                className="relative"
            >
                {/* Matrix Rain Background */}
                <canvas
                    ref={canvasRef}
                    className={compact ? "absolute inset-0 opacity-30" : "absolute inset-0 opacity-20"}
                    style={{
                        maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
                        WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
                    }}
                />

                {/* Animated Face SVG */}
                <motion.svg
                    width={svgSize.width}
                    height={svgSize.height}
                    viewBox="0 0 400 500"
                    className="relative z-10"
                    initial={false}
                    animate={{ opacity: compact ? 0.25 : 0.15 }}
                    transition={{ duration: 0.5 }}
                >
                    <defs>
                        <linearGradient id="faceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#cccccc" stopOpacity="0.1" />
                        </linearGradient>

                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        <clipPath id="faceClip">
                            <ellipse cx="200" cy="250" rx="120" ry="160" />
                        </clipPath>
                    </defs>

                    {/* Face outline with state-based glow */}
                    <motion.ellipse
                        cx="200"
                        cy="250"
                        rx="120"
                        ry="160"
                        fill="none"
                        stroke={faceGlow}
                        strokeWidth={state === 'streaming' || state === 'thinking' ? "3" : "2"}
                        filter="url(#glow)"
                        animate={{
                            strokeOpacity: state === 'streaming' 
                                ? [0.5, 0.8, 0.5] 
                                : state === 'thinking'
                                ? [0.3, 0.6, 0.3]
                                : [0.3, 0.5, 0.3],
                        }}
                        transition={{
                            duration: state === 'streaming' ? 1.5 : state === 'thinking' ? 2 : 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />

                    {/* Digital grid pattern - faster when active */}
                    <g clipPath="url(#faceClip)">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <motion.line
                                key={`h-${i}`}
                                x1="80"
                                y1={90 + i * 20}
                                x2="320"
                                y2={90 + i * 20}
                                stroke="#ffffff"
                                strokeWidth="0.5"
                                opacity="0.15"
                                animate={{
                                    opacity: state === 'streaming' 
                                        ? [0.1, 0.3, 0.1]
                                        : [0.05, 0.2, 0.05],
                                }}
                                transition={{
                                    duration: state === 'streaming' ? 1 : state === 'thinking' ? 1.5 : 2,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                    ease: "easeInOut",
                                }}
                            />
                        ))}
                        {Array.from({ length: 15 }).map((_, i) => (
                            <motion.line
                                key={`v-${i}`}
                                x1={80 + i * 16}
                                y1="90"
                                x2={80 + i * 16}
                                y2="410"
                                stroke="#cccccc"
                                strokeWidth="0.5"
                                opacity="0.1"
                                animate={{
                                    opacity: [0.05, 0.15, 0.05],
                                }}
                                transition={{
                                    duration: 2.5,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                    ease: "easeInOut",
                                }}
                            />
                        ))}
                    </g>

                    {/* Left Eye - adaptive based on state */}
                    <g>
                        <motion.ellipse
                            cx="160"
                            cy="220"
                            rx="20"
                            ry={eyeAnim.ry[0] as number}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            opacity="0.4"
                            filter="url(#glow)"
                            animate={{
                                ry: eyeAnim.ry,
                            }}
                            transition={{
                                duration: eyeAnim.duration,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                        <motion.circle
                            cx="160"
                            cy="220"
                            r="8"
                            fill="#ffffff"
                            opacity="0.6"
                            animate={{
                                scale: state === 'streaming' 
                                    ? [1, 1.4, 1]
                                    : state === 'thinking'
                                    ? [1, 1.3, 1]
                                    : [1, 1.2, 1],
                                opacity: state === 'streaming' 
                                    ? [0.6, 1, 0.6]
                                    : [0.6, 0.8, 0.6],
                            }}
                            transition={{
                                duration: state === 'streaming' ? 1 : state === 'thinking' ? 1.5 : 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                        {/* Scanning line - faster when active */}
                        <motion.line
                            x1="140"
                            y1="220"
                            x2="180"
                            y2="220"
                            stroke="#ffffff"
                            strokeWidth="1"
                            opacity="0.7"
                            animate={{
                                y1: [200, 240, 200],
                                y2: [200, 240, 200],
                            }}
                            transition={{
                                duration: state === 'streaming' ? 1 : state === 'thinking' ? 1.5 : 2,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                        />
                    </g>

                    {/* Right Eye - same adaptive logic */}
                    <g>
                        <motion.ellipse
                            cx="240"
                            cy="220"
                            rx="20"
                            ry={eyeAnim.ry[0] as number}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            opacity="0.4"
                            filter="url(#glow)"
                            animate={{
                                ry: eyeAnim.ry,
                            }}
                            transition={{
                                duration: eyeAnim.duration,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2,
                            }}
                        />
                        <motion.circle
                            cx="240"
                            cy="220"
                            r="8"
                            fill="#ffffff"
                            opacity="0.6"
                            animate={{
                                scale: state === 'streaming' 
                                    ? [1, 1.4, 1]
                                    : state === 'thinking'
                                    ? [1, 1.3, 1]
                                    : [1, 1.2, 1],
                                opacity: state === 'streaming' 
                                    ? [0.6, 1, 0.6]
                                    : [0.6, 0.8, 0.6],
                            }}
                            transition={{
                                duration: state === 'streaming' ? 1 : state === 'thinking' ? 1.5 : 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2,
                            }}
                        />
                        {/* Scanning line - faster when active */}
                        <motion.line
                            x1="220"
                            y1="220"
                            x2="260"
                            y2="220"
                            stroke="#ffffff"
                            strokeWidth="1"
                            opacity="0.7"
                            animate={{
                                y1: [200, 240, 200],
                                y2: [200, 240, 200],
                            }}
                            transition={{
                                duration: state === 'streaming' ? 1 : state === 'thinking' ? 1.5 : 2,
                                repeat: Infinity,
                                ease: "linear",
                                delay: 0.3,
                            }}
                        />
                    </g>

                    {/* Nose */}
                    <motion.path
                        d="M 200 240 L 200 280"
                        stroke="#ffffff"
                        strokeWidth="2"
                        fill="none"
                        opacity="0.3"
                        animate={{
                            opacity: [0.2, 0.4, 0.2],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                    <motion.path
                        d="M 200 280 L 185 285 M 200 280 L 215 285"
                        stroke="#cccccc"
                        strokeWidth="1.5"
                        fill="none"
                        opacity="0.3"
                    />

                    {/* Mouth - smiles on success/task/event */}
                    <motion.path
                        d={mouthAnim.d[0]}
                        stroke="#ffffff"
                        strokeWidth="2"
                        fill="none"
                        opacity="0.4"
                        filter="url(#glow)"
                        animate={{
                            d: mouthAnim.d,
                        }}
                        transition={{
                            duration: mouthAnim.duration,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />

                    {/* Digital artifacts/glitches */}
                    {Array.from({ length: 12 }).map((_, i) => (
                        <motion.circle
                            key={`particle-${i}`}
                            cx={120 + Math.random() * 160}
                            cy={150 + Math.random() * 200}
                            r={1 + Math.random() * 2}
                            fill="#ffffff"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: [0, 0.6, 0],
                                scale: [0.5, 1.5, 0.5],
                            }}
                            transition={{
                                duration: 2 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                                ease: "easeInOut",
                            }}
                        />
                    ))}

                    {/* State indicator particles - celebration for tasks/events/success */}
                    {(state === 'task-created' || state === 'event-created' || state === 'success') && (
                        <g>
                            {Array.from({ length: 20 }).map((_, i) => (
                                <motion.circle
                                    key={`celebration-${i}`}
                                    cx={160 + Math.random() * 80}
                                    cy={200 + Math.random() * 100}
                                    r={2 + Math.random() * 3}
                                    fill={state === 'task-created' ? "#00ff00" : 
                                          state === 'event-created' ? "#0099ff" : "#ffd700"}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{
                                        opacity: [0, 0.8, 0],
                                        scale: [0, 1.5, 0],
                                        y: [0, -30],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: i * 0.1,
                                        ease: "easeOut",
                                    }}
                                />
                            ))}
                        </g>
                    )}

                    {/* Scanning effect */}
                    <motion.rect
                        x="80"
                        y="150"
                        width="240"
                        height="2"
                        fill="url(#faceGradient)"
                        opacity="0.3"
                        filter="url(#glow)"
                        animate={{
                            y: [150, 350, 150],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />

                    {/* Additional digital elements */}
                    <motion.text
                        x="200"
                        y="420"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#ffffff"
                        opacity="0.2"
                        fontFamily="monospace"
                        animate={{
                            opacity: [0.1, 0.3, 0.1],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        AI ASSISTANT
                    </motion.text>

                    {/* Corner brackets */}
                    <motion.g
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        fill="none"
                        opacity="0.3"
                        animate={{
                            opacity: [0.2, 0.4, 0.2],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        {/* Top-left */}
                        <path d="M 80 100 L 80 90 L 90 90" />
                        {/* Top-right */}
                        <path d="M 310 90 L 320 90 L 320 100" />
                        {/* Bottom-left */}
                        <path d="M 80 400 L 80 410 L 90 410" />
                        {/* Bottom-right */}
                        <path d="M 310 410 L 320 410 L 320 400" />
                    </motion.g>
                </motion.svg>
            </motion.div>
        </motion.div>
    );
};

