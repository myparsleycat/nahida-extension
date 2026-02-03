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

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return originalOpen.apply(this, [method, url, ...args]);
};

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
                                try {
                                    const ws = new WebSocket("ws://localhost:1027/ws");

                                    ws.onopen = () => {
                                        ws.send(
                                            encode({
                                                type: "hui",
                                                title: response.data.name,
                                                fileUrl: response.data.downloadPath,
                                            }),
                                        );
                                    };

                                    ws.onmessage = (event) => {
                                        if (event.data === "download started") {
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
                                    console.error(
                                        "local server websocket failed, proceeding with original request:",
                                        err,
                                    );
                                }
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
