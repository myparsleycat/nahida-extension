import ky from "ky";

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
        await ky.post("http://localhost:1027/download-from-gb", {
            json: payload,
            retry: { limit: 0 },
            timeout: 1500,
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
        const filesContainers = [
            document.querySelector("ul.Flow.Files"),
            document.querySelector("ul.Flow.ArchivedFiles"),
        ];

        let totalButtons = 0;

        filesContainers.forEach((container) => {
            if (!container) return;

            const downloadButtons = container.querySelectorAll("a.DownloadLink");
            downloadButtons.forEach((button) => {
                if (button instanceof HTMLAnchorElement) {
                    DownloadActionHandler.attachListener(button);
                }
            });
            totalButtons += downloadButtons.length;
        });

        return totalButtons;
    }
}

class PageObserver {
    static init() {
        this.observeFileContainers();
        this.observeParentContainer();
    }

    private static observeFileContainers() {
        const containers = [
            document.querySelector("ul.Flow.Files"),
            document.querySelector("ul.Flow.ArchivedFiles"),
        ];

        containers.forEach((element) => {
            if (!element) return;

            const observer = new MutationObserver((mutations) => {
                let hasNewButtons = false;
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement) {
                            if (
                                node.matches("a.DownloadLink") ||
                                node.querySelectorAll("a.DownloadLink").length > 0
                            ) {
                                hasNewButtons = true;
                            }
                        }
                    });
                });

                if (hasNewButtons) ElementScanner.scanAndHook();
            });

            observer.observe(element, { childList: true, subtree: true });
        });
    }

    private static observeParentContainer() {
        const parentContainer = document.querySelector("div.Files, div#Content");
        if (parentContainer) {
            const parentObserver = new MutationObserver(() => {
                const archivedFiles = document.querySelector("ul.Flow.ArchivedFiles");
                if (archivedFiles instanceof HTMLElement && !archivedFiles.dataset.gbObserved) {
                    archivedFiles.dataset.gbObserved = "true";
                    this.init();
                }
            });

            parentObserver.observe(parentContainer, { childList: true, subtree: true });
        }
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
