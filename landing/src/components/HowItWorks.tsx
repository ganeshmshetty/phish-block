"use client";

import { motion } from "framer-motion";
import {
    MousePointer,
    Cpu,
    CheckCircle,
    ShieldAlert,
    ArrowRight
} from "lucide-react";

const steps = [
    {
        step: 1,
        icon: MousePointer,
        title: "You Browse",
        description: "Navigate the web as usual. PhishBlock monitors every URL you visit in real-time.",
        color: "from-cyan-500 to-blue-500",
    },
    {
        step: 2,
        icon: Cpu,
        title: "ML Analysis",
        description: "Our SGD classifier with TF-IDF vectorization analyzes URL patterns, domain structure, and text features.",
        color: "from-purple-500 to-pink-500",
    },
    {
        step: 3,
        icon: CheckCircle,
        title: "Safe Sites Pass",
        description: "Legitimate websites load normally with zero interference. No slowdowns, no interruptions.",
        color: "from-green-500 to-emerald-500",
    },
    {
        step: 4,
        icon: ShieldAlert,
        title: "Threats Blocked",
        description: "Phishing attempts are instantly blocked with a warning page. You stay protected, always.",
        color: "from-red-500 to-orange-500",
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 lg:py-32 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/10 rounded-full blur-[128px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />

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
                        How It <span className="text-gradient">Works</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Protection in milliseconds. Here&apos;s how PhishBlock keeps you safe while browsing.
                    </p>
                </motion.div>

                {/* Steps */}
                <div className="relative">
                    {/* Connection Line - Desktop */}
                    <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-red-500 opacity-20 -translate-y-1/2" />

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.step}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="relative"
                            >
                                {/* Step Card */}
                                <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 h-full hover:border-primary/50 transition-all group">
                                    {/* Step Number */}
                                    <div className={`absolute -top-4 left-6 w-8 h-8 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                                        {step.step}
                                    </div>

                                    {/* Icon */}
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${step.color} opacity-10 absolute top-6 right-6`} />
                                    <step.icon className={`h-7 w-7 mt-4 mb-4 bg-gradient-to-r ${step.color} bg-clip-text`} style={{ color: index === 0 ? '#22d3ee' : index === 1 ? '#a855f7' : index === 2 ? '#22c55e' : '#f97316' }} />

                                    {/* Content */}
                                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                                        {step.title}
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>

                                {/* Arrow - Desktop */}
                                {index < steps.length - 1 && (
                                    <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                                        <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Technical Details */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mt-20 bg-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-8 lg:p-12"
                >
                    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                        <div>
                            <h3 className="text-2xl font-bold mb-4">TF-IDF Vectorization</h3>
                            <p className="text-muted-foreground mb-6">
                                Our model uses TF-IDF (Term Frequency-Inverse Document Frequency) to analyze URL text patterns:
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    "URL Tokenization",
                                    "N-gram Analysis",
                                    "Term Frequency",
                                    "Document Frequency",
                                    "Pattern Matching",
                                    "Domain Analysis",
                                    "Path Structure",
                                    "Phishing Keywords",
                                ].map((feature) => (
                                    <div key={feature} className="flex items-center gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl blur-2xl" />
                            <div className="relative bg-background/50 rounded-xl p-6 border border-border/50 font-mono text-sm">
                                <div className="text-muted-foreground mb-2"># API Response Example</div>
                                <pre className="text-xs lg:text-sm overflow-x-auto">
                                    {`{
  "url": "https://suspicious-site.xyz/login",
  "is_phishing": true,
  "confidence": 0.8542,
  "risk_level": "critical",
  "is_popular_domain": false,
  "recommendation": "WARNING: Strong phishing indicators detected"
}`}
                                </pre>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
