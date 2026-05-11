import { Client } from "@stomp/stompjs";
import { getApiDomain } from "@/utils/domain";

const apiDomain = getApiDomain();

const websocketUrl = apiDomain
    .replace("http://", "ws://")
    .replace("https://", "wss://") + "/ws";

export const stompClient = new Client({
    brokerURL: websocketUrl,

    reconnectDelay: 5000,

    onConnect: () => {
        console.log("Connected!");
    },

    onStompError: (frame) => {
        console.error(frame);
    }
});