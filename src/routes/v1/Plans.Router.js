

import express from 'express';
import { createPlan, getPlans, updatePlan, deletePlan } from '../../controllers/Plans.Controller.js';

const planRouter = express.Router();


planRouter.post('/', createPlan);


planRouter.get('/', getPlans);

// Update a plan
planRouter.put('/:id', updatePlan);

// Delete a plan
planRouter.delete('/:id', deletePlan);

export default planRouter;
