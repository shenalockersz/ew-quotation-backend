import { Router } from 'express';
import apiRoutes from './api.routes.js';
import itemRoutes from './items.routes.js';
import customerRoutes from './customers.routes.js';
import salespersonRoutes from './salespersons.routes.js';
import quotationRoutes from './quotations.routes.js';

const v1 = Router();

v1.use('/api', apiRoutes); // /v1/api/*
v1.use('/items', itemRoutes); // /v1/items/*
v1.use('/customers', customerRoutes); // /v1/customers/*
v1.use('/salespersons', salespersonRoutes); // /v1/salespersons/*
v1.use('/quotations', quotationRoutes); // /v1/quotations/*

export default v1;
