"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    X,
    ExternalLink,
    TrendingUp,
    TrendingDown,
    DollarSign,
    BarChart3,
    FileText,
    Sparkles,
    Loader2,
} from "lucide-react";
import { EarningsAiSummary } from "./earnings-ai-summary";
import { fetchAllCompanyData } from "@/lib/financial-sheets";

interface EarningsDetailProps {
    ticker: string;
    logos: Record<string, string>;
    irLinks: Record<string, string>;
    onClose: () => void;
}

interface MetricDisplay {
    label: string;
    value: string;
    prevValue?: string;
    trend?: "up" | "down" | "flat";
}

export function EarningsDetail({
    ticker,
    logos,
    irLinks,
    onClose,
}: EarningsDetailProps) {
    const [financialData, setFinancialData] = useState<MetricDisplay[]>([]);
    const [financialLoading, setFinancialLoading] = useState(true);
    const [showAiSummary, setShowAiSummary] = useState(false);

    // Load financial data from the financial sheets
    useEffect(() => {
        async function loadFinancials() {
            try {
                setFinancialLoading(true);
                const companies = await fetchAllCompanyData();
                const company = companies.find(
                    (c) => c.companyName.toUpperCase() === ticker.toUpperCase()
                );

                if (company) {
                    const metrics: MetricDisplay[] = [];

                    // Priority metrics to display
                    const priorityMetrics = [
                        "Revenue",
                        "EPS",
                        "Net Income",
                        "Operating Income",
                        "Gross Margin",
                        "Operating Margin",
                        "Free Cash Flow",
                        "EBITDA",
                        "ARR",
                        "Gross Profit",
                    ];

                    for (const metricName of priorityMetrics) {
                        const metric = company.metrics.find((m) =>
                            m.metric.toLowerCase().includes(metricName.toLowerCase())
                        );

                        if (metric && metric.data.length > 0) {
                            const latest = metric.data[metric.data.length - 1];
                            const prev =
                                metric.data.length > 1
                                    ? metric.data[metric.data.length - 2]
                                    : null;

                            if (latest.value !== null) {
                                let trend: "up" | "down" | "flat" = "flat";
                                if (prev?.value !== null && prev?.value !== undefined) {
                                    trend =
                                        latest.value > prev.value
                                            ? "up"
                                            : latest.value < prev.value
                                                ? "down"
                                                : "flat";
                                }

                                // Format value
                                let formattedValue: string;
                                if (metricName.includes("Margin")) {
                                    formattedValue = `${(latest.value * 100).toFixed(1)}%`;
                                } else if (Math.abs(latest.value) >= 1_000_000_000) {
                                    formattedValue = `$${(latest.value / 1_000_000_000).toFixed(
                                        2
                                    )}B`;
                                } else if (Math.abs(latest.value) >= 1_000_000) {
                                    formattedValue = `$${(latest.value / 1_000_000).toFixed(0)}M`;
                                } else {
                                    formattedValue =
                                        metricName === "EPS"
                                            ? `$${latest.value.toFixed(2)}`
                                            : `$${latest.value.toLocaleString()}`;
                                }

                                let formattedPrev: string | undefined;
                                if (prev?.value !== null && prev?.value !== undefined) {
                                    if (metricName.includes("Margin")) {
                                        formattedPrev = `${(prev.value * 100).toFixed(1)}%`;
                                    } else if (Math.abs(prev.value) >= 1_000_000_000) {
                                        formattedPrev = `$${(prev.value / 1_000_000_000).toFixed(
                                            2
                                        )}B`;
                                    } else if (Math.abs(prev.value) >= 1_000_000) {
                                        formattedPrev = `$${(prev.value / 1_000_000).toFixed(0)}M`;
                                    } else {
                                        formattedPrev =
                                            metricName === "EPS"
                                                ? `$${prev.value.toFixed(2)}`
                                                : `$${prev.value.toLocaleString()}`;
                                    }
                                }

                                metrics.push({
                                    label: metric.metric,
                                    value: formattedValue,
                                    prevValue: formattedPrev,
                                    trend,
                                });
                            }
                        }
                    }

                    setFinancialData(metrics);
                }
            } catch (err) {
                console.error("Failed to load financial data:", err);
            } finally {
                setFinancialLoading(false);
            }
        }

        loadFinancials();
    }, [ticker]);

    const irLink = irLinks[ticker];
    const transcriptLinks = [
        {
            label: "Seeking Alpha",
            url: `https://seekingalpha.com/symbol/${ticker}/earnings/transcripts`,
        },
        {
            label: "The Motley Fool",
            url: `https://www.fool.com/quote/${ticker}/`,
        },
    ];

    if (irLink) {
        transcriptLinks.unshift({ label: "Investor Relations", url: irLink });
    }

    return (
        <Card className="bg-slate-900/50 border-slate-800 shadow-2xl overflow-hidden">
            <CardHeader className="py-4 border-b border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                            {logos[ticker] ? (
                                <img
                                    src={logos[ticker]}
                                    alt={ticker}
                                    className="w-6 h-6 object-contain"
                                />
                            ) : (
                                <span className="text-[10px] font-bold text-slate-400">
                                    {ticker}
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="text-lg font-black tracking-tight">{ticker}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                Earnings Intelligence
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-0 max-h-[700px] overflow-y-auto custom-scrollbar">
                {/* Quick Links */}
                <div className="p-4 border-b border-slate-800/50">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                        Resources & Transcripts
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {transcriptLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-blue-400 hover:text-blue-300 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
                            >
                                <FileText className="w-3 h-3" />
                                {link.label}
                                <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                        ))}
                        <a
                            href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&CIK=&type=10-Q&dateb=&owner=include&count=10&search_text=&action=getcompany`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
                        >
                            <FileText className="w-3 h-3" />
                            SEC Filings
                            <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>
                </div>

                {/* Financial Metrics */}
                <div className="p-4 border-b border-slate-800/50">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Key Financial Metrics
                    </h3>
                    {financialLoading ? (
                        <div className="grid grid-cols-2 gap-2">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-16 bg-slate-800/30 rounded-lg animate-pulse"
                                />
                            ))}
                        </div>
                    ) : financialData.length === 0 ? (
                        <div className="py-4 text-center text-sm text-slate-500 italic">
                            No financial data available for {ticker}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {financialData.map((metric) => (
                                <div
                                    key={metric.label}
                                    className="p-3 rounded-lg bg-slate-800/30 border border-slate-800/50 hover:border-slate-700/50 transition-colors"
                                >
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">
                                        {metric.label}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-100">
                                            {metric.value}
                                        </span>
                                        {metric.trend && metric.trend !== "flat" && (
                                            <span
                                                className={`flex items-center ${metric.trend === "up"
                                                        ? "text-emerald-400"
                                                        : "text-rose-400"
                                                    }`}
                                            >
                                                {metric.trend === "up" ? (
                                                    <TrendingUp className="w-3 h-3" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3" />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {metric.prevValue && (
                                        <div className="text-[9px] text-slate-600 mt-0.5 font-mono">
                                            prev: {metric.prevValue}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Summary Section */}
                <div className="p-4">
                    {!showAiSummary ? (
                        <button
                            onClick={() => setShowAiSummary(true)}
                            className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                        >
                            <div className="flex items-center justify-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-purple-300 group-hover:text-purple-200 transition-colors">
                                        Generate AI Earnings Summary
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        Powered by Gemini 2.0 Flash — analyzes the full transcript
                                    </div>
                                </div>
                            </div>
                        </button>
                    ) : (
                        <EarningsAiSummary ticker={ticker} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
