import express from 'express';
import authRoute from './auth.route.js';
import userRoute from './user.route.js';
import docsRoute from './docs.route.js';
import config from '../../config/config.js';
import b2bRoute from './b2bUser.routes.js';
import b2cRoute from './b2cUser.route.js';
import categoryRoute from './category.routes.js';
import subCategoryRoute from './subCategory.routes.js';
import B2bOrderRoute from './b2bOrder.routes.js';
import B2cOrderRoute from './b2cOrder.routes.js';
import QuotationRoute from './quotation.routes.js ';
import MandiRateRoute from './mandi.routes.js ';
import MandiRatesRoute from './mandiRates.routes.js ';
import MarketRatesRoute from './marketRates.routes.js';
import DailyRatesRoute from './dailyRates.route.js';
import NotificationRoute from './b2bNotifications.routes.js';
import B2CNotificationRoute from './b2cNotifications.routes.js';
import PostRoute from './post.routes.js';
import AdminRouter from './Admin.Router.js';
const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/admin',
    route: AdminRouter,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/b2bUser',
    route: b2bRoute,
  }, 
  {
    path: '/b2cUser',
    route: b2cRoute,
  }, 
  {
    path: '/categories',
    route: categoryRoute,
  }, 
  {
    path: '/subcategories',
    route: subCategoryRoute,
  },  
  {
    path : '/b2bOrder',
    route : B2bOrderRoute,
  }, 
  {
    path : '/b2cOrder',
    route : B2cOrderRoute,
  },
  {
    path : '/quotations',
    route : QuotationRoute,
  },
  {
    path : '/mandi',
    route : MandiRateRoute,
  },
  {
    path : '/mandiRates',
    route : MandiRatesRoute,
  },
  {
    path : '/marketRates',
    route : MarketRatesRoute,
  },
  {
    path : '/dailyRates',
    route : DailyRatesRoute,
  },
  {
    path : '/b2b-notifications',
    route : NotificationRoute,
  },
  {
    path : '/b2c-notifications',
    route : B2CNotificationRoute,
  },
  {
    path : '/posts',
    route : PostRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

export default router;