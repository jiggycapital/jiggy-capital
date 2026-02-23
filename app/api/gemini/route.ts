import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "GEMINI_API_KEY not configured" },
            { status: 500 }
        );
    }

    try {
        const { ticker, transcript, quarter } = await req.json();

        if (!transcript) {
            return NextResponse.json(
                { error: "Transcript text is required" },
                { status: 400 }
            );
        }

        const systemPrompt = `You are an elite buy-side equity research analyst. Analyze this earnings call transcript for ${ticker} (${quarter || "recent quarter"}) and produce a comprehensive summary. DO NOT miss any important details.

Your summary MUST include ALL of the following sections:

## Key Numbers
- Revenue (actual vs estimate if mentioned, YoY growth)
- EPS (actual vs estimate if mentioned)
- Operating/net income and margins
- Free cash flow
- Any other critical KPIs specific to this company (ARR, DAU, subscribers, GMV, etc.)
- Beat/miss assessment for each metric

## Management Commentary
- CEO/CFO's key messages and tone (bullish, cautious, defensive)
- Strategic priorities mentioned
- Important quotes verbatim (use quotation marks)
- Any surprises or notable shifts in narrative vs prior quarters

## Forward Guidance
- Revenue guidance (next quarter and full year if given)
- EPS/earnings guidance
- Margin outlook
- Any revised targets up or down
- Capex or investment plans

## Segment Performance
- Breakdown by business segment/geography if applicable
- Which segments accelerated or decelerated
- Any new product/service callouts

## Risks & Concerns
- Macro headwinds mentioned
- Competitive pressures
- Supply chain, regulatory, or legal issues
- Any red flags or things that sounded evasive

## Analyst Q&A Highlights
- Most important questions asked and the responses
- Any pushback from analysts
- Topics management seemed to dodge or deflect

Be specific with numbers. Use bullet points. Bold important figures. Keep it thorough but scannable.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: systemPrompt },
                                { text: `Here is the earnings call transcript:\n\n${transcript}` },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4096,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API error:", errorText);
            return NextResponse.json(
                { error: `Gemini API error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const summary =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.";

        return NextResponse.json({ summary, ticker, quarter });
    } catch (error) {
        console.error("Gemini proxy error:", error);
        return NextResponse.json(
            { error: "Failed to generate summary" },
            { status: 500 }
        );
    }
}
