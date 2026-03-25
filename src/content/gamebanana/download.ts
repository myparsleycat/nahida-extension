import { encode } from "cbor-x";

interface DownloadPayload {
    title: string;
    fileUrl: string;
    previewUrl?: string | null;
}

class PageMetadata {
    static getTitle() {
        const titleElement = document.querySelector("h1#PageTitle");
        const trimmed = titleElement?.textContent?.trim() || "Unknown Mod";
        return trimmed.split("\t")[0].trim();
    }

    static getPreviewUrl() {
        const previewElement = document.querySelector("a.PrimaryPreview");
        return previewElement?.getAttribute("href");
    }
}

class DownloadClient {
    static async send(payload: DownloadPayload) {
        return await new Promise<void>((resolve, reject) => {
            const ws = new WebSocket("ws://localhost:1027/ws");
            const data = {
                type: "gb",
                ...payload,
            };

            let settled = false;
            let connected = false;

            const cleanup = () => {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
            };

            const settleSuccess = () => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve();
            };

            const settleFailure = (error: Error) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(error);
            };

            ws.onopen = () => {
                connected = true;
                ws.send(encode(data));
                ws.close();
                settleSuccess();
            };

            ws.onmessage = (event) => {
                if (event.data === "invalid data") {
                    const err = new Error("desktop app received invalid data");
                    console.error(err);
                    ws.close();
                    settleFailure(err);
                }
            };

            ws.onerror = () => {
                console.error("websocket error");
                settleFailure(new Error("websocket connection failed"));
            };

            ws.onclose = () => {
                if (!connected) {
                    settleFailure(new Error("websocket closed before connection opened"));
                }
            };
        });
    }
}

class DownloadActionHandler {
    static async handleDownload(originalHref: string) {
        const title = PageMetadata.getTitle();
        const previewUrl = PageMetadata.getPreviewUrl();

        try {
            await DownloadClient.send({ title, fileUrl: originalHref, previewUrl });
        } catch (error) {
            window.location.href = originalHref;
        }
    }

    static attachListener(button: HTMLAnchorElement) {
        if (button.dataset.gbEnhancedHooked === "true") return;

        const originalHref = button.getAttribute("href");
        if (!originalHref || !originalHref.startsWith("https://gamebanana.com/dl/")) {
            return;
        }

        button.dataset.gbEnhancedHooked = "true";

        button.addEventListener(
            "click",
            async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await this.handleDownload(originalHref);
            },
            true,
        );
    }
}

class ElementScanner {
    static scanAndHook() {
        const downloadLinks = document.querySelectorAll('a[href^="https://gamebanana.com/dl/"]');

        downloadLinks.forEach((button) => {
            if (button instanceof HTMLAnchorElement) {
                DownloadActionHandler.attachListener(button);
            }
        });

        return downloadLinks.length;
    }
}

class PageObserver {
    static init() {
        const root = document.body;
        if (!root || root.dataset.gbObserved === "true") return;

        root.dataset.gbObserved = "true";

        const observer = new MutationObserver((mutations) => {
            let hasNewButtons = false;

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        if (
                            node.matches('a[href^="https://gamebanana.com/dl/"]') ||
                            node.querySelector('a[href^="https://gamebanana.com/dl/"]')
                        ) {
                            hasNewButtons = true;
                        }
                    }
                });
            });

            if (hasNewButtons) ElementScanner.scanAndHook();
        });

        observer.observe(root, { childList: true, subtree: true });
    }
}

async function waitForDownloadButtons(maxRetries = 10, initialDelay = 100) {
    let retries = 0;
    let delay = initialDelay;

    while (retries < maxRetries) {
        if (ElementScanner.scanAndHook() > 0) return;
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
        delay = Math.min(delay * 1.5, 2000);
    }
}

export function initDownloadManager() {
    waitForDownloadButtons().then(() => {
        PageObserver.init();
        setInterval(ElementScanner.scanAndHook, 2000);
    });
}
