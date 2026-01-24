"use client";

import { motion } from "framer-motion";
import { Shield, ArrowRight, Chrome, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid opacity-40" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-[128px] animate-pulse delay-1000" />

            {/* Floating Shield Animation */}
            <motion.div
                className="absolute top-1/3 right-[15%] hidden xl:block"
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 5, 0]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150" />
                    <Shield className="h-32 w-32 text-primary/30 relative z-10" />
                </div>
            </motion.div>

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
                <div className="text-center space-y-8">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Badge variant="secondary" className="px-4 py-1.5 text-sm backdrop-blur-sm border border-border/50">
                            <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                            SGD + TF-IDF Powered • 89.4% Accuracy
                        </Badge>
                    </motion.div>

                    {/* Headline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="space-y-4"
                    >
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                            Real-time Protection
                            <br />
                            <span className="text-gradient">Against Phishing</span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed">
                            Shield yourself from phishing attacks with our ML-powered browser extension.
                            Analyze URLs in real-time and block threats before they reach you.
                        </p>
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Button size="lg" className="glow group text-base px-8" asChild>
                            <Link href="https://drive.google.com/file/d/15UuuVmcdvkbZdsagHqEF2nYyKjWHJFkX/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-5 w-5" />
                                Download Extension
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="text-base px-8" asChild>
                            <Link href="#how-it-works">
                                See How It Works
                            </Link>
                        </Button>
                    </motion.div>

                    {/* Browser Support */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex items-center justify-center gap-6 text-muted-foreground pt-4"
                    >
                        <div className="flex items-center gap-2">
                            <Chrome className="h-5 w-5" />
                            <span className="text-sm">Chrome</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.568 7.394c-.115.518-.42.644-.851.401l-2.352-1.733-1.135 1.093c-.125.125-.23.23-.473.23l.169-2.397 4.363-3.94c.19-.168-.041-.262-.295-.094L9.05 13.015l-2.318-.724c-.504-.158-.514-.504.105-.747l9.046-3.486c.42-.152.788.102.65.747l.001.001z" />
                            </svg>
                            <span className="text-sm">Firefox</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5.197 10.458c.335-.088.715-.176 1.14-.264-.022-.219-.044-.525-.066-.918-.022-.394-.022-.789 0-1.183.022-.394.066-.767.132-1.117.066-.35.154-.633.264-.852.11-.219.264-.394.461-.525.198-.132.439-.198.724-.198.374 0 .68.088.918.264.241.175.417.417.527.723.11.307.175.657.197 1.051.023.394.023.811 0 1.249l-.066.918c.285-.022.593-.044.918-.066.329-.022.657-.022.984 0 .329.022.636.066.918.132.022-.197.044-.437.066-.721.022-.285.022-.591 0-.918-.022-.329-.066-.657-.132-.984-.066-.329-.175-.636-.329-.918-.154-.285-.371-.525-.654-.724-.285-.197-.657-.306-1.117-.328-.461-.022-.875.044-1.249.197-.373.154-.681.373-.918.656-.241.285-.417.613-.527.983-.11.373-.175.767-.197 1.183-.022.417-.022.834 0 1.249.022.087.044.218.066.394.021.175.044.35.066.525.022.175.044.329.066.459-.417.088-.789.197-1.117.329-.329.132-.614.285-.852.461-.241.175-.417.373-.527.591-.11.219-.166.459-.166.72 0 .416.11.745.329.984.219.241.505.417.852.527.351.11.745.175 1.183.197.439.022.896.011 1.379-.033.481-.044.961-.11 1.445-.197.483-.088.918-.197 1.314-.329.394-.132.7-.285.918-.461.219-.175.329-.373.329-.593 0-.175-.044-.328-.132-.459-.088-.132-.198-.241-.329-.329-.132-.088-.285-.154-.461-.197-.175-.044-.35-.066-.525-.066-.285 0-.548.044-.787.132-.241.088-.461.197-.657.329-.197.132-.373.285-.525.461-.154.175-.285.35-.394.525-.175-.044-.373-.088-.591-.132-.219-.044-.461-.066-.721-.066-.264 0-.503.044-.724.132-.219.088-.394.219-.525.394-.132.175-.197.394-.197.657 0 .285.088.525.264.721.175.197.394.35.657.459.26.11.548.175.852.197.307.022.591.011.852-.033.263-.044.481-.11.657-.197.175-.088.285-.197.329-.329.044-.132.022-.285-.066-.461-.088-.175-.219-.329-.394-.459-.175-.132-.371-.241-.591-.329-.219-.088-.439-.154-.657-.197-.219-.044-.395-.066-.527-.066-.241 0-.439.066-.591.197-.154.132-.263.285-.329.461-.066.175-.088.35-.066.525.022.175.066.329.132.459-.088.022-.197.022-.329 0-.132-.022-.263-.066-.394-.132-.132-.066-.241-.154-.329-.264-.088-.11-.132-.241-.132-.394 0-.197.066-.35.197-.461.132-.11.285-.175.461-.197.175-.022.35 0 .525.066.175.066.329.154.459.264.132.11.241.241.329.394.088.154.132.307.132.461-.154.088-.329.175-.525.264-.197.088-.417.154-.657.197-.241.044-.503.066-.787.066-.285 0-.57-.044-.852-.132-.285-.088-.525-.219-.724-.394-.197-.175-.329-.394-.394-.657-.066-.263-.044-.57.066-.918z" />
                            </svg>
                            <span className="text-sm">Edge</span>
                        </div>
                    </motion.div>
                </div>

                {/* Stats Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8"
                >
                    {[
                        { value: "89.4%", label: "Detection Accuracy" },
                        { value: "<100ms", label: "Response Time" },
                        { value: "TF-IDF", label: "Vectorization" },
                        { value: "95.96%", label: "ROC AUC Score" },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                            className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-colors"
                        >
                            <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                                {stat.value}
                            </div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
