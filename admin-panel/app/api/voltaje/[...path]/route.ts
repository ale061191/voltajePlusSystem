import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE = process.env.VOLTAJE_API_URL || 'https://m.voltajevzla.com/cdb-web-api/v1/cdb';
const TOKEN = process.env.VOLTAJE_TOKEN;
const SESSION_ID = process.env.VOLTAJE_SESSION_ID;

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    const path = params.path.join('/');
    const query = req.nextUrl.search;
    const url = `${API_BASE}/${path}${query}`;

    try {
        console.log(`[PROXY] GET ${url}`);

        // Construct Cookie header manually
        const cookieHeader = `JSESSIONID=${SESSION_ID}; token=${TOKEN}`;

        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'identity', // Prevent gzip issues
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': cookieHeader,
                'token': TOKEN,
                'Referer': 'https://m.voltajevzla.com/web-admin/',
                'Origin': 'https://m.voltajevzla.com',
                'X-Requested-With': 'XMLHttpRequest', // Crucial to avoid HTML response
                'Content-Type': 'application/json;charset=UTF-8'
            },
            transformResponse: [(data) => data] // Return raw string to avoid double parsing issues if mixed content
        });

        // Check if response is HTML (login page redirect)
        if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE html>')) {
            return NextResponse.json({ error: 'Upstream returned HTML (Session likely expired)', raw: response.data.substring(0, 200) }, { status: 401 });
        }

        let jsonData;
        try {
            jsonData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        } catch (e) {
            jsonData = { error: 'Failed to parse JSON', raw: response.data };
        }

        return NextResponse.json(jsonData);
    } catch (error: any) {
        console.error('[PROXY ERROR]', error.message);
        return NextResponse.json({ error: error.message, details: error.response?.data }, { status: error.response?.status || 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
    // Similar logic for POST if needed later
    return NextResponse.json({ error: 'POST not implemented yet' }, { status: 501 });
}
