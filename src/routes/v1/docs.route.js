import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerDefinition from '../../docs/swaggerDef.js';

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: ['src/docs/*.yml', 'src/routes/v1/*.js'],
});

var options = {
  explorer: true,
  customCss: `.swagger-ui .topbar { display: none } 
  .information-container { display: none }
  `,
 
};

router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(specs, options)
);

export default router;
