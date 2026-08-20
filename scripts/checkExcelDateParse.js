/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

// Same as MarketRates.jsx parseFlexibleDate
const parseFlexibleDate = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || s === 'N/A') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split('-');
    return `${y}-${m}-${d}`;
  }
  const n = parseFloat(s);
  if (!Number.isNaN(n) && n > 0 && /^[\d.]+$/.test(s)) {
    const excelEpoch = new Date(1900, 0, 1);
    const ms = (n - 1) * 24 * 60 * 60 * 1000;
    const d = new Date(excelEpoch.getTime() + ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
};

console.log('String "05-08-2026" (DD-MM-YYYY display) ->', parseFlexibleDate('05-08-2026'));
console.log('Excel serial 45874 ->', parseFlexibleDate(45874));
console.log('Excel serial 45875 ->', parseFlexibleDate(45875));

const main = async () => {
  const mongoose = (await import('mongoose')).default;
  const config = (await import('../src/config/config.js')).default;
  const M = (await import('../src/models/MandiRates.model.js')).default;
  await mongoose.connect(config.mongoose.url, config.mongoose.options);

  for (const day of ['2026-08-04', '2026-08-05']) {
    const n = await M.aggregate([
      { $unwind: '$categoryPrices' },
      {
        $match: {
          'categoryPrices.category': 'Plastic',
          'categoryPrices.date': {
            $gte: new Date(`${day}T00:00:00.000Z`),
            $lte: new Date(`${day}T23:59:59.999Z`),
          },
        },
      },
      { $count: 'n' },
    ]);
    console.log(`Plastic rows with stored date ${day}:`, n[0]?.n ?? 0);
  }
  await mongoose.disconnect();
};
main();
