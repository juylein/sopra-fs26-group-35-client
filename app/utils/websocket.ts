import { Client } from "@stomp/stompjs";

export const stompClient = new Client({

    brokerURL: "ws://localhost:8080/ws",

    reconnectDelay: 5000,

    onConnect: () => {
        console.log("Connected!");
    },

    onStompError: (frame) => {
        console.error(frame);
    }
});