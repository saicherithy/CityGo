
import { io } from "socket.io-client";

export const connectSocket = () =>
  io("http://127.0.0.1:5000", {
    auth: { token: localStorage.getItem("token") },
  });
