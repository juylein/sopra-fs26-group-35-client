import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getApiDomain } from "@/utils/domain";

const apiDomain = getApiDomain();

export const stompClient = new Client({
    webSocketFactory: () => new SockJS(`${apiDomain}/ws`),

    reconnectDelay: 5000,

    onConnect: () => {
        console.log("Connected!");
    },

    onStompError: (frame) => {
        console.error(frame);
    }
});