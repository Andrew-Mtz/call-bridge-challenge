import { Router } from "express";
import callsRouter from "@routes/calls.routes";
import eventsRouter from "@routes/events.routes";

const api = Router();
api.use("/calls", callsRouter);
api.use("/calls", eventsRouter);
export default api;
