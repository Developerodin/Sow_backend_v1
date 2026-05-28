import express from 'express';
import { getMarketRateParseJob, parseMarketRateMessage, seedMissingMandiEmbeddings } from '../../controllers/marketRateParser.controller.js';

const router = express.Router();

router.get('/parse/jobs/:jobId', getMarketRateParseJob);
router.post('/parse', parseMarketRateMessage);
/** One-time fix: generate VectorEmbedding for any Mandi that doesn't have one. */
router.post('/seed-mandi-embeddings', seedMissingMandiEmbeddings);

export default router;







