import express from 'express';
import { getMarketRateParseJob, parseMarketRateMessage } from '../../controllers/marketRateParser.controller.js';

const router = express.Router();

router.get('/parse/jobs/:jobId', getMarketRateParseJob);
router.post('/parse', parseMarketRateMessage);

export default router;







