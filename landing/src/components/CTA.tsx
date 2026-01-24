"use client";

import { motion } from "framer-motion";
import { Shield, Download, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CTA() {
    const benefits = [
        "Free and open source",
        "No data collection",
        "Sub-100ms response time",
        "89.4% detection accuracy",
    ];

    return (
        <section id="download" className="py-24 lg:py-32 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-500/20 rounded-full blur-[100px]" />

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-2xl" />

                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="relative inline-block mb-6"
                    >
                        <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full scale-150" />
                        <div className="relative bg-gradient-to-br from-primary to-cyan-400 rounded-2xl p-4">
                            <Shield className="h-12 w-12 text-white" />
                        </div>
                    </motion.div>

                    {/* Content */}
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                        Start Protecting Yourself <span className="text-gradient">Today</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                        Join thousands of users who browse safely with PhishBlock.
                        Install the extension in seconds and stay protected from phishing attacks.
                    </p>

                    {/* Benefits */}
                    <div className="flex flex-wrap justify-center gap-4 mb-10">
                        {benefits.map((benefit, index) => (
                            <motion.div
                                key={benefit}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                                <CheckCircle className="h-4 w-4 text-primary" />
                                {benefit}
                            </motion.div>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Button size="lg" className="glow group text-base px-8 min-w-[200px]" asChild>
                            <Link href="https://drive.google.com/file/d/15UuuVmcdvkbZdsagHqEF2nYyKjWHJFkX/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-5 w-5" />
                                Download Extension
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="text-base px-8 min-w-[200px]" asChild>
                            <Link href="https://github.com/your-repo/phish-block" target="_blank" rel="noopener noreferrer">
                                View on GitHub
                            </Link>
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
