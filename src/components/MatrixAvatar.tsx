import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export const MatrixAvatar = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        canvas.width = 400;
        canvas.height = 500;

        // Matrix rain characters
        const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
        const fontSize = 10;
        const columns = canvas.width / fontSize;
        const drops: number[] = Array(Math.floor(columns)).fill(1);

        let animationFrameId: number;

        const draw = () => {
            // Semi-transparent black to create fade effect
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];

                // Gradient from white to gray
                const gradient = ctx.createLinearGradient(0, drops[i] * fontSize - fontSize, 0, drops[i] * fontSize);
                gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
                gradient.addColorStop(1, "rgba(200, 200, 200, 0.5)");
                ctx.fillStyle = gradient;

                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative"
            >
                {/* Matrix Rain Background */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 opacity-20"
                    style={{
                        maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
                        WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
                    }}
                />

                {/* Animated Face SVG */}
                <motion.svg
                    width="400"
                    height="500"
                    viewBox="0 0 400 500"
                    className="relative z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    transition={{ duration: 1.5 }}
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

                    {/* Face outline */}
                    <motion.ellipse
                        cx="200"
                        cy="250"
                        rx="120"
                        ry="160"
                        fill="none"
                        stroke="url(#faceGradient)"
                        strokeWidth="2"
                        filter="url(#glow)"
                        animate={{
                            strokeOpacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />

                    {/* Digital grid pattern on face */}
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
                                    opacity: [0.05, 0.2, 0.05],
                                }}
                                transition={{
                                    duration: 2,
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

                    {/* Left Eye */}
                    <g>
                        <motion.ellipse
                            cx="160"
                            cy="220"
                            rx="20"
                            ry="25"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            opacity="0.4"
                            filter="url(#glow)"
                            animate={{
                                ry: [25, 5, 25],
                            }}
                            transition={{
                                duration: 4,
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
                                scale: [1, 1.2, 1],
                                opacity: [0.6, 0.8, 0.6],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                        {/* Scanning line effect */}
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
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                        />
                    </g>

                    {/* Right Eye */}
                    <g>
                        <motion.ellipse
                            cx="240"
                            cy="220"
                            rx="20"
                            ry="25"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            opacity="0.4"
                            filter="url(#glow)"
                            animate={{
                                ry: [25, 5, 25],
                            }}
                            transition={{
                                duration: 4,
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
                                scale: [1, 1.2, 1],
                                opacity: [0.6, 0.8, 0.6],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2,
                            }}
                        />
                        {/* Scanning line effect */}
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
                                duration: 2,
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

                    {/* Mouth */}
                    <motion.path
                        d="M 170 320 Q 200 340 230 320"
                        stroke="#ffffff"
                        strokeWidth="2"
                        fill="none"
                        opacity="0.4"
                        filter="url(#glow)"
                        animate={{
                            d: [
                                "M 170 320 Q 200 340 230 320",
                                "M 170 325 Q 200 335 230 325",
                                "M 170 320 Q 200 340 230 320",
                            ],
                        }}
                        transition={{
                            duration: 4,
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
        </div>
    );
};

