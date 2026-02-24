"use client";

import { useState, useEffect } from "react";

// Structure of FMP profile response
interface FmpProfile {
    symbol: string;
    image: string;
}

export function useCompanyLogos(tickers: string[], initialLogos: Record<string, string>) {
    const [logos, setLogos] = useState<Record<string, string>>(initialLogos);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Sync initial logos if they change
        setLogos((prev) => ({ ...prev, ...initialLogos }));
    }, [initialLogos]);

    useEffect(() => {
        let isMounted = true;

        async function fetchMissingLogos() {
            // Find tickers that don't have a logo and aren't CASH/SUM
            const missingTickers = tickers.filter(
                (t) => t && t !== "CASH" && t !== "SUM" && !logos[t]
            );

            if (missingTickers.length === 0) return;

            setIsLoading(true);

            // Check local storage cache first
            const newLogos: Record<string, string> = {};
            const tickersToFetch: string[] = [];

            for (const ticker of missingTickers) {
                try {
                    const cached = localStorage.getItem(`logo_${ticker}`);
                    if (cached) {
                        newLogos[ticker] = cached;
                    } else {
                        tickersToFetch.push(ticker);
                    }
                } catch (_) {
                    tickersToFetch.push(ticker);
                }
            }

            if (Object.keys(newLogos).length > 0 && isMounted) {
                setLogos((prev) => ({ ...prev, ...newLogos }));
            }

            if (tickersToFetch.length === 0) {
                if (isMounted) setIsLoading(false);
                return;
            }

            try {
                // Step 1: Try FMP bulk profile API first
                // FMP can handle multiple symbols comma-separated
                const symbolString = tickersToFetch.join(",");
                const fmpRes = await fetch(`/api/fmp?endpoint=profile&symbol=${symbolString}`);

                let fmpSuccess = false;
                if (fmpRes.ok) {
                    const profiles: FmpProfile[] = await fmpRes.json();
                    if (Array.isArray(profiles) && profiles.length > 0) {
                        fmpSuccess = true;
                        const updatedLogos: Record<string, string> = {};

                        for (const profile of profiles) {
                            if (profile.symbol && profile.image) {
                                updatedLogos[profile.symbol] = profile.image;
                                try {
                                    localStorage.setItem(`logo_${profile.symbol}`, profile.image);
                                } catch (_) {
                                    // ignore localstorage errors
                                }
                            }
                        }

                        if (Object.keys(updatedLogos).length > 0 && isMounted) {
                            setLogos((prev) => ({ ...prev, ...updatedLogos }));
                        }
                    }
                }

                // Step 2: Fallback to Finnhub if FMP fails or some tickers are still missing
                // Finnhub requires 1 request per ticker
                if (!fmpSuccess || fmpRes.status === 500) {
                    const stillMissing = tickersToFetch.filter(t => !logos[t] && !newLogos[t]);

                    if (stillMissing.length > 0) {
                        const finnhubPromises = stillMissing.map(async (ticker) => {
                            try {
                                const fhRes = await fetch(`/api/finnhub?endpoint=stock/profile2&symbol=${ticker}`);
                                if (fhRes.ok) {
                                    const data = await fhRes.json();
                                    if (data && data.logo) {
                                        return { ticker, logo: data.logo };
                                    }
                                }
                            } catch (_) {
                                // ignore individual failures
                            }
                            return null;
                        });

                        const fhResults = await Promise.all(finnhubPromises);
                        const fhUpdated: Record<string, string> = {};

                        for (const res of fhResults) {
                            if (res && res.logo) {
                                fhUpdated[res.ticker] = res.logo;
                                try {
                                    localStorage.setItem(`logo_${res.ticker}`, res.logo);
                                } catch (_) { }
                            }
                        }

                        if (Object.keys(fhUpdated).length > 0 && isMounted) {
                            setLogos((prev) => ({ ...prev, ...fhUpdated }));
                        }
                    }
                }

            } catch (error) {
                console.error("Failed to fetch dynamic logos:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        // Add a slight delay to allow initial logos to populate and prevent race conditions
        const timeout = setTimeout(() => {
            fetchMissingLogos();
        }, 500);

        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [tickers, logos]); // Depend on logos so if new tickers arrive, it checks again

    return { logos, isLoading };
}
