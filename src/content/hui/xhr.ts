import { encode } from "cbor-x";
export {};

declare global {
    interface XMLHttpRequest {
        _url?: string;
    }
}

const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...args: any[]
) {
    if (typeof url === "string") {
        this._url = url;
    } else if (url instanceof URL) {
        this._url = url.toString();
    }

    if (this._url && this._url.includes("/api/v4/file/url")) {
        this.addEventListener("readystatechange", () => {
            if (this.readyState === 4 && this.status === 200) {
                try {
                    const responseText = this.responseText;
                    const response = JSON.parse(responseText);
                    if (
                        response &&
                        response.code === 0 &&
                        response.data &&
                        response.data.urls &&
                        response.data.urls.length > 0
                    ) {
                        const fileUrl = response.data.urls[0].url;
                        let title = "unknown";
                        try {
                            const urlObj = new URL(fileUrl);
                            const disposition = urlObj.searchParams.get(
                                "response-content-disposition",
                            );
                            if (disposition) {
                                const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/);
                                if (utf8Match) {
                                    title = decodeURIComponent(utf8Match[1]);
                                } else {
                                    const asciiMatch = disposition.match(/filename="([^"]+)"/);
                                    if (asciiMatch) {
                                        title = asciiMatch[1];
                                    }
                                }
                            }

                            if (title === "unknown") {
                                const pathname = urlObj.pathname;
                                const basename = pathname.substring(pathname.lastIndexOf("/") + 1);
                                title = decodeURIComponent(basename);
                            }
                        } catch (e) {
                            console.error("error parsing url for title:", e);
                        }

                        if (title !== "unknown") {
                            Object.defineProperty(this, "status", { get: () => 0 });
                            Object.defineProperty(this, "statusText", {
                                get: () => "Intercepted by local server",
                            });
                            Object.defineProperty(this, "responseText", {
                                get: () => "",
                            });
                            Object.defineProperty(this, "response", {
                                get: () => null,
                            });
                            interceptDownload(this, title, fileUrl);
                        }
                    }
                } catch (e) {
                    console.error("error parsing response:", e);
                }
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return originalOpen.apply(this, [method, url, ...args]);
};

function interceptDownload(xhr: XMLHttpRequest, title: string, fileUrl: string) {
    try {
        const ws = new WebSocket("ws://localhost:1027/ws");

        ws.onopen = () => {
            ws.send(
                encode({
                    type: "hui",
                    title: title,
                    fileUrl: fileUrl,
                }),
            );
        };

        ws.onmessage = (event) => {
            if (event.data === "download started") {
                Object.defineProperty(xhr, "status", { get: () => 0 });
                Object.defineProperty(xhr, "statusText", {
                    get: () => "Intercepted by local server",
                });
                Object.defineProperty(xhr, "responseText", {
                    get: () => "",
                });
                Object.defineProperty(xhr, "response", {
                    get: () => null,
                });
                ws.close();
            } else if (event.data === "invalid data") {
                ws.close();
            }
        };

        ws.onerror = (err) => {
            console.error("websocket error:", err);
            ws.close();
        };
    } catch (err) {
        console.error("local server websocket failed, proceeding with original request:", err);
    }
}

XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
) {
    try {
        if (this._url) {
            if (this._url.includes("explorer/share/pathInfo") && this._url.includes("shareID=")) {
                this.addEventListener("readystatechange", () => {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            const response = JSON.parse(this.responseText);
                            if (response && response.data && response.data.downloadPath) {
                                interceptDownload(
                                    this,
                                    response.data.name,
                                    response.data.downloadPath,
                                );
                            }
                        } catch (e) {
                            console.error("error parsing response:", e);
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error("error in interceptor:", e);
    }

    return originalSend.apply(this, [body]);
};
