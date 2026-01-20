import { getApiKey, setApiKeyValid } from "./storage";
import ky from "ky";

const API_BASE_URL = "https://api.nahida.live";

export interface LikeStatus {
    id: number;
    liked: boolean;
}

export class ApiAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ApiAuthError";
    }
}

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const apiKey = await getApiKey();

    if (!apiKey) {
        throw new ApiAuthError("No API key found");
    }

    const headers = new Headers(options.headers);
    headers.set("auth", apiKey);
    headers.set("Content-Type", "application/json");

    const resp = await ky(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (resp.status === 401) {
        await setApiKeyValid(false);
        throw new ApiAuthError("API key is invalid or expired");
    }

    return resp;
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        const resp = await ky(`${API_BASE_URL}/api/auth/get-session`, {
            headers: {
                "x-api-key": apiKey,
            },
        });

        const data = (await resp.json()) as any;

        let verify = data && data.session ? true : false;

        return verify;
    } catch (error) {
        console.error("Failed to validate API key:", error);
        return false;
    }
}

export async function checkLikeStatus(ids: number[]): Promise<LikeStatus[]> {
    try {
        const resp = await apiFetch("/gb/is-liked", {
            method: "POST",
            body: JSON.stringify({ ids }),
        });

        if (!resp.ok) {
            throw new Error(`Failed to check like status: ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        if (error instanceof ApiAuthError) {
            throw error;
        }
        console.error("Failed to check like status:", error);
        return [];
    }
}

export async function likeMod(id: number): Promise<boolean> {
    try {
        const resp = await apiFetch("/gb/like", {
            method: "POST",
            body: JSON.stringify({ id }),
        });

        return resp.ok;
    } catch (error) {
        if (error instanceof ApiAuthError) {
            throw error;
        }
        console.error("Failed to like mod:", error);
        return false;
    }
}
