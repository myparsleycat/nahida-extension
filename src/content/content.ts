import { initDownloadManager } from "./features/download-manager";
import { initModManager } from "./features/mod-manager";

function initializePage() {
    initDownloadManager();
    initModManager();
}

function setupNavigationListener() {
    let lastUrl = window.location.href;

    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;

            setTimeout(initializePage, 500);
        }
    }, 1000);

    window.addEventListener("popstate", () => {
        setTimeout(initializePage, 500);
    });
}

function main() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initializePage();
            setupNavigationListener();
        });
    } else {
        initializePage();
        setupNavigationListener();
    }
}

main();
