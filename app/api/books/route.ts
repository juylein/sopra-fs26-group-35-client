import { NextRequest, NextResponse } from "next/server";

const serverCache = new Map<string, any>();

async function fetchWithRetry(url: string, retries = 4): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url);
        if (res.status === 429) return res;
        if (res.status === 503) {
            await new Promise((r) => setTimeout(r, 600 * 2 ** i));
            continue;
        }
        return res;
    }
    return new Response(null, { status: 503 });
}

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q") ?? "fiction";
    const startIndex = req.nextUrl.searchParams.get("startIndex") ?? "0";
    const langRestrict = req.nextUrl.searchParams.get("langRestrict") ?? "";
    const cacheKey = `${q}-${startIndex}-${langRestrict}`;

    if (serverCache.has(cacheKey)) {
        return NextResponse.json(serverCache.get(cacheKey));
    }

    const langParam = langRestrict ? `&langRestrict=${langRestrict}` : "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=40&orderBy=newest&startIndex=${startIndex}${langParam}&key=${process.env.GOOGLE_BOOKS_API_KEY}`;

    const res = await fetchWithRetry(url);

    if (!res.ok) {
        return NextResponse.json({ items: [] }, { status: res.status });
    }

    const data = await res.json();
    serverCache.set(cacheKey, data);
    return NextResponse.json(data);
}