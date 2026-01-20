import { checkLikeStatus, likeMod, ApiAuthError } from "../../services/api";

interface ModCardData {
    element: HTMLElement;
    id: number;
    likeButton?: HTMLElement;
}

const modCards = new Map<number, ModCardData>();

function extractModId(cardElement: HTMLElement) {
    const anchor = cardElement.querySelector("a");
    if (!anchor) return null;

    const href = anchor.getAttribute("href");
    if (!href) return null;

    const match = href.match(/\/mods\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

function createLikeButton(modId: number, isLiked: boolean) {
    const button = document.createElement("span");
    button.className = "gb-enhanced-like-button";
    button.dataset.modId = modId.toString();
    button.dataset.liked = isLiked.toString();
    button.innerHTML = isLiked ? "❤️" : "🤍";
    button.title = isLiked ? "Unlike this mod" : "Like this mod";

    button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleLikeClick(modId, button);
    });

    return button;
}

async function handleLikeClick(modId: number, button: HTMLElement) {
    try {
        const success = await likeMod(modId);

        if (success) {
            const wasLiked = button.dataset.liked === "true";
            const isNowLiked = !wasLiked;

            button.dataset.liked = isNowLiked.toString();
            button.innerHTML = isNowLiked ? "❤️" : "🤍";
            button.title = isNowLiked ? "Unlike this mod" : "Like this mod";
        }
    } catch (error) {
        if (error instanceof ApiAuthError) {
            alert("API key is invalid or expired. Please update it in the extension popup.");
        } else {
            console.error("[ModManager] Failed to like mod:", error);
        }
    }
}

function addLikeButtonToCard(cardData: ModCardData, isLiked: boolean) {
    const statsClusters = cardData.element.querySelectorAll("div.Stats.Cluster");

    if (statsClusters.length === 0) return;

    const lastStatsCluster = statsClusters[statsClusters.length - 1];

    if (cardData.likeButton) return;

    const likeButton = createLikeButton(cardData.id, isLiked);
    lastStatsCluster.appendChild(likeButton);
    cardData.likeButton = likeButton;
}

async function processModCard(cardElement: HTMLElement) {
    const modId = extractModId(cardElement);

    if (!modId) return;

    if (modCards.has(modId)) return;

    const cardData: ModCardData = {
        element: cardElement,
        id: modId,
    };

    modCards.set(modId, cardData);
}

async function updateLikeStatuses() {
    const cardsWithoutStatus = Array.from(modCards.values()).filter((card) => !card.likeButton);

    if (cardsWithoutStatus.length === 0) return;

    try {
        const ids = cardsWithoutStatus.map((card) => card.id);
        const statuses = await checkLikeStatus(ids);
        const statusMap = new Map(statuses.map((s) => [s.id, s.liked]));

        cardsWithoutStatus.forEach((card) => {
            const isLiked = statusMap.get(card.id) ?? false;
            addLikeButtonToCard(card, isLiked);
        });
    } catch (error) {
        if (error instanceof ApiAuthError) {
            console.error("[ModManager] API authentication failed. Please update your API key.");
        } else {
            console.error("[ModManager] Failed to check like status:", error);
        }
    }
}

let updateTimeout: number | null = null;
let mutationObserver: MutationObserver | null = null;

function scheduleUpdate() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {
        updateLikeStatuses();
        updateTimeout = null;
    }, 300);
}

function scanForModCards() {
    const grid = document.querySelector("div.RecordsGrid");
    if (!grid) return;

    const cards = grid.querySelectorAll("div.Record.Flow.ModRecord.HasPreview");
    let hasNewCards = false;

    cards.forEach((card) => {
        if (card instanceof HTMLElement) {
            const modId = extractModId(card);
            if (modId && !modCards.has(modId)) {
                processModCard(card);
                hasNewCards = true;
            }
        }
    });

    if (hasNewCards) {
        scheduleUpdate();
    }
}

function initMutationObserver() {
    const grid = document.querySelector("div.RecordsGrid");
    if (!grid) return;

    if (mutationObserver) {
        mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver((mutations) => {
        let hasNewCards = false;

        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLElement) {
                    if (node.matches("div.Record.Flow.ModRecord.HasPreview")) {
                        processModCard(node);
                        hasNewCards = true;
                    }

                    const childCards = node.querySelectorAll(
                        "div.Record.Flow.ModRecord.HasPreview",
                    );
                    childCards.forEach((childCard) => {
                        if (childCard instanceof HTMLElement) {
                            processModCard(childCard);
                            hasNewCards = true;
                        }
                    });
                }
            });
        });

        if (hasNewCards) {
            scheduleUpdate();
        }
    });

    mutationObserver.observe(grid, {
        childList: true,
        subtree: true,
    });
}

function waitForGrid(retries = 10, interval = 500) {
    const grid = document.querySelector("div.RecordsGrid");

    if (grid) {
        scanForModCards();
        initMutationObserver();
        return;
    }

    if (retries > 0) {
        setTimeout(() => waitForGrid(retries - 1, interval), interval);
    }
}

export function initModManager() {
    waitForGrid();
    setInterval(scanForModCards, 3000);
}
