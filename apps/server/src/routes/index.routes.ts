import { Router } from "express";
import callsRouter from "./calls.routes";
import eventsRouter from "./events.routes";

const api = Router();
api.use("/calls", callsRouter);
api.use("/calls", eventsRouter);
export default api;
