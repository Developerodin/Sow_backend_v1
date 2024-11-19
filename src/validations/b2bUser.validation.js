import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createB2BUser = {
  body: Joi.object().keys({
    phoneNumber: Joi.string().required(),
    registerAs: Joi.string().required(),
    name: Joi.string().required(),
    email: Joi.string().email(),
    businessName: Joi.string(),
    category: Joi.string(),
    referralCode: Joi.string(),
  }),
};

const getB2BUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    category: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getB2BUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateB2BUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      phoneNumber: Joi.string(),
      registerAs: Joi.string(),
      name: Joi.string(),
      email: Joi.string().email(),
      businessName: Joi.string(),
      category: Joi.string(),
      referralCode: Joi.string(),
    })
    .min
};

const deleteB2BUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

export { createB2BUser, getB2BUsers, getB2BUser, updateB2BUser, deleteB2BUser };