"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Sparkles,
    Loader2,
    AlertTriangle,
    RefreshCw,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

interface EarningsAiSummaryProps {
    ticker: string;
}

export function EarningsAiSummary({ ticker }: EarningsAiSummaryProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stage, setStage] = useState<string>("idle");

    useEffect(() => {
        generateSummary();
    }, [ticker]);

    async function generateSummary() {
        // Check localStorage cache first
        const cacheKey = `earnings_ai_summary_${ticker}`;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { timestamp, data } = JSON.parse(cached);
                const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
                if (Date.now() - timestamp < CACHE_EXPIRY) {
                    setSummary(data);
                    return;
                }
            }
        } catch (e) {
            console.warn("Failed to read AI summary cache:", e);
        }

        setLoading(true);
        setError(null);

        try {
            // Step 1: Fetch transcript from Finnhub
            setStage("Fetching transcript...");

            // Try to get the latest earnings transcript
            const transcriptResp = await fetch(
                `/api/finnhub?endpoint=stock/transcripts&symbol=${ticker}`
            );

            let transcriptText = "";

            if (transcriptResp.ok) {
                const transcriptData = await transcriptResp.json();

                if (transcriptData.transcript && transcriptData.transcript.length > 0) {
                    // Combine all transcript sections
                    transcriptText = transcriptData.transcript
                        .map(
                            (section: any) =>
                                `[${section.name || "Speaker"}]: ${section.speech || ""}`
                        )
                        .join("\n\n");
                }
            }

            if (!transcriptText) {
                // Fallback: try company news for earnings-related articles
                const today = new Date();
                const thirtyDaysAgo = new Date(
                    today.getTime() - 30 * 24 * 60 * 60 * 1000
                );
                const fromDate = thirtyDaysAgo.toISOString().split("T")[0];
                const toDate = today.toISOString().split("T")[0];

                const newsResp = await fetch(
                    `/api/finnhub?endpoint=company-news&symbol=${ticker}&from=${fromDate}&to=${toDate}`
                );

                if (newsResp.ok) {
                    const newsData = await newsResp.json();
                    const earningsNews = newsData
                        .filter(
                            (n: any) =>
                                n.headline &&
                                (n.headline.toLowerCase().includes("earnings") ||
                                    n.headline.toLowerCase().includes("quarter") ||
                                    n.headline.toLowerCase().includes("revenue") ||
                                    n.headline.toLowerCase().includes("results"))
                        )
                        .slice(0, 10);

                    if (earningsNews.length > 0) {
                        transcriptText = earningsNews
                            .map(
                                (n: any) =>
                                    `[${n.source}] ${n.headline}\n${n.summary || ""}`
                            )
                            .join("\n\n---\n\n");
                    }
                }
            }

            if (!transcriptText) {
                setError(
                    "No transcript or earnings data found. Check the transcript links above for manual access."
                );
                setLoading(false);
                return;
            }

            // Step 2: Send to Gemini for summarization
            setStage("Analyzing with Gemini AI...");

            // Truncate if too long (stay within reasonable token limits)
            const maxChars = 50000;
            if (transcriptText.length > maxChars) {
                transcriptText = transcriptText.substring(0, maxChars) + "\n\n[TRANSCRIPT TRUNCATED]";
            }

            const geminiResp = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticker,
                    transcript: transcriptText,
                    quarter: "most recent",
                }),
            });

            if (!geminiResp.ok) {
                const errData = await geminiResp.json().catch(() => ({}));
                throw new Error(
                    errData.error || `Gemini API returned ${geminiResp.status}`
                );
            }

            const result = await geminiResp.json();
            setSummary(result.summary);

            // Cache the result
            try {
                localStorage.setItem(
                    cacheKey,
                    JSON.stringify({ timestamp: Date.now(), data: result.summary })
                );
            } catch (e) {
                console.warn("Failed to cache AI summary:", e);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate summary");
        } finally {
            setLoading(false);
            setStage("idle");
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                    <Sparkles className="w-4 h-4" />
                    AI Earnings Analysis
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-400 animate-ping" />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-bold text-slate-200">{stage}</div>
                            <div className="text-[10px] text-slate-500 mt-1">
                                This may take a few seconds
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                    <Sparkles className="w-4 h-4" />
                    AI Earnings Analysis
                </div>
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-sm text-amber-300 font-medium">{error}</div>
                            <button
                                onClick={() => generateSummary()}
                                className="mt-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                    <Sparkles className="w-4 h-4" />
                    AI Earnings Analysis
                </div>
                <button
                    onClick={() => {
                        const cacheKey = `earnings_ai_summary_${ticker}`;
                        localStorage.removeItem(cacheKey);
                        setSummary(null);
                        generateSummary();
                    }}
                    className="text-[9px] font-bold text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Refresh
                </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800/50">
                <div
                    className="prose prose-invert prose-sm max-w-none
            prose-headings:text-purple-300 prose-headings:text-xs prose-headings:font-black prose-headings:uppercase prose-headings:tracking-wider prose-headings:mt-4 prose-headings:mb-2
            prose-p:text-slate-300 prose-p:text-[12px] prose-p:leading-relaxed
            prose-li:text-slate-300 prose-li:text-[12px] prose-li:leading-relaxed
            prose-strong:text-slate-100
            prose-ul:my-1 prose-ol:my-1
            [&>h2:first-child]:mt-0"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
                />
            </div>
        </div>
    );
}

// Simple markdown renderer (no external dep needed)
function renderMarkdown(md: string): string {
    let html = md
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Bullet points
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br />');

    return `<p>${html}</p>`;
}
