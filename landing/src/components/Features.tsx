"use client";

import { motion } from "framer-motion";
import {
    Shield,
    Zap,
    Bell,
    List,
    Settings,
    Globe,
    Brain,
    Lock,
    Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
    {
        icon: Shield,
        title: "Real-time Protection",
        description: "Analyzes URLs as you browse, providing instant protection against phishing attempts.",
        color: "text-cyan-400",
        bgColor: "bg-cyan-400/10",
    },
    {
        icon: Zap,
        title: "Automatic Blocking",
        description: "Instantly blocks detected phishing pages with a clear warning screen to keep you safe.",
        color: "text-yellow-400",
        bgColor: "bg-yellow-400/10",
    },
    {
        icon: Bell,
        title: "Smart Notifications",
        description: "Get non-intrusive warnings for suspicious sites without interrupting your workflow.",
        color: "text-purple-400",
        bgColor: "bg-purple-400/10",
    },
    {
        icon: List,
        title: "Whitelist Management",
        description: "Add trusted domains to bypass scanning and customize your protection preferences.",
        color: "text-green-400",
        bgColor: "bg-green-400/10",
    },
    {
        icon: Brain,
        title: "SGD + TF-IDF Model",
        description: "Powered by Stochastic Gradient Descent with TF-IDF vectorization for 89.4% detection accuracy.",
        color: "text-pink-400",
        bgColor: "bg-pink-400/10",
    },
    {
        icon: Eye,
        title: "History Tracking",
        description: "View recently blocked phishing attempts and analyze threat patterns over time.",
        color: "text-orange-400",
        bgColor: "bg-orange-400/10",
    },
    {
        icon: Globe,
        title: "Domain Recognition",
        description: "Smart recognition of popular domains to reduce false positives and improve accuracy.",
        color: "text-blue-400",
        bgColor: "bg-blue-400/10",
    },
    {
        icon: Settings,
        title: "Customizable Settings",
        description: "Adjust protection levels, notification preferences, and more to suit your needs.",
        color: "text-teal-400",
        bgColor: "bg-teal-400/10",
    },
    {
        icon: Lock,
        title: "Privacy First",
        description: "No data collection - URLs are analyzed and discarded. Your browsing stays private.",
        color: "text-red-400",
        bgColor: "bg-red-400/10",
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
        },
    },
};

export function Features() {
    return (
        <section id="features" className="py-24 lg:py-32 relative">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/30 to-transparent" />

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
                        Powerful <span className="text-gradient">Features</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Everything you need to stay protected from phishing attacks while browsing the web.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {features.map((feature, index) => (
                        <motion.div key={feature.title} variants={itemVariants}>
                            <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5">
                                <CardContent className="p-6">
                                    <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <feature.icon className={`h-6 w-6 ${feature.color}`} />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
