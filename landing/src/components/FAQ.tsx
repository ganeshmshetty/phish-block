"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
    {
        question: "How does PhishBlock detect phishing URLs?",
        answer: "PhishBlock uses an SGD (Stochastic Gradient Descent) classifier with TF-IDF vectorization, trained on thousands of phishing and legitimate URLs. It analyzes URL patterns, domain structure, and text features to determine if a URL is likely a phishing attempt.",
    },
    {
        question: "Does PhishBlock collect my browsing data?",
        answer: "Absolutely not. PhishBlock is designed with privacy in mind. URLs are analyzed in real-time and immediately discarded. We don't collect, store, or share any of your browsing data. All caching is done locally on your device.",
    },
    {
        question: "What browsers are supported?",
        answer: "PhishBlock works with Chrome, Firefox, and Chromium-based browsers like Edge and Brave. The extension uses Manifest V3 for maximum compatibility and security.",
    },
    {
        question: "Can I whitelist trusted domains?",
        answer: "Yes! You can add trusted domains to your whitelist through the extension settings. These domains will bypass the phishing scan, reducing false positives for sites you trust.",
    },
    {
        question: "What happens when a phishing site is detected?",
        answer: "When PhishBlock detects a phishing URL, it immediately blocks the page and displays a warning screen explaining the threat. You can choose to proceed anyway (at your own risk) or navigate away safely.",
    },
    {
        question: "Is PhishBlock free to use?",
        answer: "Yes, PhishBlock is completely free and open source under the MIT license. You can use it for personal or commercial purposes without any cost.",
    },
    {
        question: "How accurate is the detection?",
        answer: "Our SGD + TF-IDF model achieves 89.42% accuracy, 89.62% precision, and 88.94% recall on our test dataset. The ROC AUC score of 95.96% indicates excellent discrimination between phishing and legitimate URLs.",
    },
    {
        question: "Does it slow down my browsing?",
        answer: "No. PhishBlock is optimized for speed with sub-100ms response times. The analysis happens in the background without any noticeable impact on your browsing experience.",
    },
];

function FAQItem({ question, answer, isOpen, onClick }: {
    question: string;
    answer: string;
    isOpen: boolean;
    onClick: () => void;
}) {
    return (
        <motion.div
            initial={false}
            className="border-b border-border/50 last:border-0"
        >
            <button
                onClick={onClick}
                className="w-full py-5 flex items-center justify-between text-left hover:text-primary transition-colors group"
            >
                <span className="font-medium pr-4">{question}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                >
                    <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-5 text-muted-foreground leading-relaxed">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 lg:py-32 relative">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                        Frequently Asked <span className="text-gradient">Questions</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Everything you need to know about PhishBlock
                    </p>
                </motion.div>

                {/* FAQ List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-2xl px-6 lg:px-8"
                >
                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
