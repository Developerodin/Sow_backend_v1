
import config from '../config/config.js';


const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'Scrap on wheels apis',
    version:"1.0.0"
  },
  servers: [
    {
      url: `http://localhost:${config.port}/v1`,
    },
  ],
};

export default swaggerDef;

