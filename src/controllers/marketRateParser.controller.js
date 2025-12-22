import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { parseAndUpdate } from '../services/marketRateParser.service.js';
import ApiError from '../utils/ApiError.js';

/**
 * Parse market rate message and update database
 * @route POST /api/v1/market-rates/parse
 * @access Public (or Private based on your auth requirements)
 */
const parseMarketRateMessage = catchAsync(async (req, res) => {
  const { message, source } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Message is required');
  }

  const result = await parseAndUpdate(message);

  // Build success message
  let messageText = '';
  const createdMandisCount = result.created?.mandis?.length || 0;
  
  if (result.updated.mandiCategoryPrices > 0) {
    messageText = 'Market rates added successfully';
    if (createdMandisCount > 0) {
      messageText += `. Created ${createdMandisCount} new mandi${createdMandisCount === 1 ? '' : 's'}`;
    }
  } else {
    messageText = 'Message parsed but no rates were added to database';
    if (createdMandisCount > 0) {
      messageText += `. Created ${createdMandisCount} new mandi${createdMandisCount === 1 ? '' : 's'}`;
    }
  }

  const response = {
    success: true,
    message: messageText,
    data: result,
  };

  res.status(httpStatus.OK).json(response);
});

export { parseMarketRateMessage };

