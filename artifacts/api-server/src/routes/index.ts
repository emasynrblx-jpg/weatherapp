import { Router, type IRouter } from "express";
import healthRouter from "./health";
import weatherRouter from "./weather";
import warningsRouter from "./warnings";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(weatherRouter);
router.use(warningsRouter);
router.use(subscriptionsRouter);

export default router;
