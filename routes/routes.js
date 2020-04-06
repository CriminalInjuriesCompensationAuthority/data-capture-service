'use strict';

const express = require('express');
const createHealthCheckService = require('../services/health-check');

const router = express.Router();

router.route('/hc').get((req, res) => {
    const healthCheckService = createHealthCheckService();
    res.json(healthCheckService.getHealth());
});

module.exports = router;
