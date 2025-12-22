import express from 'express';
import { parseMarketRateMessage } from '../../controllers/marketRateParser.controller.js';

const router = express.Router();

router.post('/parse', parseMarketRateMessage);

export default router;






