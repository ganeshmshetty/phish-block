"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";

const stats = [
    {
        value: 89.42,
        suffix: "%",
        label: "Accuracy",
        description: "Overall detection accuracy on test dataset",
    },
    {
        value: 89.62,
        suffix: "%",
        label: "Precision",
        description: "Correctly identified phishing sites",
    },
    {
        value: 88.94,
        suffix: "%",
        label: "Recall",
        description: "Phishing attempts caught",
    },
    {
        value: 95.96,
        suffix: "%",
        label: "ROC AUC",
        description: "Model discrimination ability",
    },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
    const [displayValue, setDisplayValue] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (isInView) {
            const duration = 2000;
            const startTime = Date.now();
            const startValue = 0;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function (easeOutCubic)
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = startValue + (value - startValue) * eased;

                setDisplayValue(current);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }
    }, [isInView, value]);

    return (
        <span ref={ref} className="text-4xl md:text-5xl lg:text-6xl font-bold text-gradient">
            {displayValue.toFixed(2)}{suffix}
        </span>
    );
}

export function Stats() {
    return (
        <section id="stats" className="py-24 lg:py-32 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[150px]" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                        Model <span className="text-gradient">Performance</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Our SGD classifier with TF-IDF vectorization delivers industry-leading detection rates.
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
                                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                                <h3 className="text-xl font-semibold mt-4 mb-2">{stat.label}</h3>
                                <p className="text-sm text-muted-foreground">{stat.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Additional Info */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-16 grid md:grid-cols-3 gap-6"
                >
                    {[
                        {
                            title: "Fast Inference",
                            value: "<100ms",
                            description: "Response time per URL analysis",
                        },
                        {
                            title: "Batch Support",
                            value: "100",
                            description: "URLs analyzed per batch request",
                        },
                        {
                            title: "F1 Score",
                            value: "89.28%",
                            description: "Balanced precision-recall metric",
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center hover:border-primary/30 transition-colors"
                        >
                            <div className="text-2xl font-bold text-primary mb-1">{item.value}</div>
                            <div className="font-medium mb-1">{item.title}</div>
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
