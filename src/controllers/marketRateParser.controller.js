import { randomUUID } from 'crypto';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { parseAndUpdate } from '../services/marketRateParser.service.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/config.js';
import logger from '../config/logger.js';
import MarketRateParseJob from '../models/MarketRateParseJob.model.js';

const buildParseSuccessPayload = (result) => {
  let messageText = '';
  const matchedMandisCount = result.created?.mandis?.length || 0;

  if (result.updated.mandiCategoryPrices > 0) {
    messageText = `Market rates added successfully. ${result.updated.mandiCategoryPrices} price${result.updated.mandiCategoryPrices === 1 ? '' : 's'} added`;
    if (matchedMandisCount > 0) {
      messageText += `. Matched ${matchedMandisCount} mandi${matchedMandisCount === 1 ? '' : 's'}`;
    }
  } else {
    messageText = 'Message parsed but no rates were added to database';
    if (result.warnings && result.warnings.length > 0) {
      messageText += `. ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'} generated`;
    }
  }

  return {
    success: true,
    message: messageText,
    data: result,
  };
};

/**
 * POST /api/v1/market-rates/parse
 * Production default: responds immediately with 202 + jobId (avoids load balancer 504 while OpenAI work runs).
 * Poll GET /api/v1/market-rates/parse/jobs/:jobId until status is completed.
 * Sync (wait for full result): ?sync=1
 */
const parseMarketRateMessage = catchAsync(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Message is required');
  }

  const syncRequested = req.query.sync === '1' || req.query.sync === 'true';
  const asyncRequested = req.query.async === '1' || req.query.async === 'true';
  const useAsync = !syncRequested && (config.marketRateParse.asyncDefault || asyncRequested);

  if (!useAsync) {
    const result = await parseAndUpdate(message);
    return res.status(httpStatus.OK).json(buildParseSuccessPayload(result));
  }

  const jobId = randomUUID();
  await MarketRateParseJob.create({ jobId, status: 'pending' });

  setImmediate(() => {
    (async () => {
      try {
        const result = await parseAndUpdate(message);
        await MarketRateParseJob.findOneAndUpdate(
          { jobId },
          { status: 'completed', result, error: null }
        );
      } catch (err) {
        logger.error(`Market rate parse job ${jobId} failed: ${err.message}`);
        await MarketRateParseJob.findOneAndUpdate(
          { jobId },
          { status: 'failed', error: err.message || String(err), result: null }
        );
      }
    })();
  });

  return res.status(httpStatus.ACCEPTED).json({
    success: true,
    message:
      'Parsing started. Poll GET /api/v1/market-rates/parse/jobs/:jobId until status is completed (avoids gateway timeout).',
    jobId,
    status: 'pending',
    pollPath: `/v1/market-rates/parse/jobs/${jobId}`,
  });
});

/**
 * GET /api/v1/market-rates/parse/jobs/:jobId
 */
const getMarketRateParseJob = catchAsync(async (req, res) => {
  const { jobId } = req.params;
  const job = await MarketRateParseJob.findOne({ jobId }).lean();

  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Job not found or expired');
  }

  if (job.status === 'pending') {
    return res.status(httpStatus.ACCEPTED).json({
      success: true,
      jobId: job.jobId,
      status: 'pending',
      message: 'Still processing',
    });
  }

  if (job.status === 'failed') {
    return res.status(httpStatus.OK).json({
      success: false,
      jobId: job.jobId,
      status: 'failed',
      message: job.error || 'Parse failed',
    });
  }

  const payload = buildParseSuccessPayload(job.result);
  return res.status(httpStatus.OK).json({
    ...payload,
    jobId: job.jobId,
    status: 'completed',
  });
});

export { parseMarketRateMessage, getMarketRateParseJob };
