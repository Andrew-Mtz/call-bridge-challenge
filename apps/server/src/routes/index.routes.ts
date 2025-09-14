import { Router } from "express";
import callsRouter from "@routes/calls.routes";
import eventsRouter from "@routes/events.routes";
import webrtcRouter from "@routes/webrtc.routes";

const api = Router();
api.use("/calls", callsRouter);
api.use("/calls", eventsRouter);
api.use("/webrtc", webrtcRouter);
export default api;
