"use client";

import { Shield, Github, Heart, ExternalLink } from "lucide-react";
import Link from "next/link";

export function Footer() {
    const currentYear = new Date().getFullYear();

    const links = {
        product: [
            { label: "Features", href: "#features" },
            { label: "How It Works", href: "#how-it-works" },
            { label: "Performance", href: "#stats" },
            { label: "Download", href: "#download" },
        ],
        resources: [
            { label: "Documentation", href: "#", external: true },
            { label: "API Reference", href: "#", external: true },
            { label: "GitHub", href: "https://github.com/your-repo/phish-block", external: true },
            { label: "FAQ", href: "#faq" },
        ],
        legal: [
            { label: "MIT License", href: "https://opensource.org/licenses/MIT", external: true },
            { label: "Privacy", href: "#" },
            { label: "Terms", href: "#" },
        ],
    };

    return (
        <footer className="relative border-t border-border/50 bg-card/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Footer */}
                <div className="py-12 lg:py-16 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <Shield className="h-7 w-7 text-primary" />
                            <span className="text-lg font-bold">
                                Phish<span className="text-primary">Block</span>
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                            ML-powered real-time phishing detection to keep you safe while browsing.
                        </p>
                        <Link
                            href="https://github.com/your-repo/phish-block"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            View on GitHub
                        </Link>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Product</h4>
                        <ul className="space-y-3">
                            {links.product.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Resources</h4>
                        <ul className="space-y-3">
                            {links.resources.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        target={link.external ? "_blank" : undefined}
                                        rel={link.external ? "noopener noreferrer" : undefined}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                                    >
                                        {link.label}
                                        {link.external && <ExternalLink className="h-3 w-3" />}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-3">
                            {links.legal.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        target={link.external ? "_blank" : undefined}
                                        rel={link.external ? "noopener noreferrer" : undefined}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                                    >
                                        {link.label}
                                        {link.external && <ExternalLink className="h-3 w-3" />}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {currentYear} PhishBlock. All rights reserved.
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> for a safer internet
                    </p>
                </div>
            </div>
        </footer>
    );
}
