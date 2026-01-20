const STORAGE_KEYS = {
    API_KEY: "nahida_api_key",
    API_KEY_VALID: "nahida_api_key_valid",
} as const;

export interface StorageData {
    apiKey?: string;
    apiKeyValid?: boolean;
}

export async function getApiKey(): Promise<string | undefined> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
    return result[STORAGE_KEYS.API_KEY] as string | undefined;
}

export async function setApiKey(apiKey: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY]: apiKey });
}

export async function getApiKeyValid(): Promise<boolean> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY_VALID);
    return (result[STORAGE_KEYS.API_KEY_VALID] as boolean) ?? false;
}

export async function setApiKeyValid(valid: boolean): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY_VALID]: valid });
}

export async function clearStorage(): Promise<void> {
    await chrome.storage.local.clear();
}
