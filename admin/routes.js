'use strict';

const express = require('express');
const validateJWT = require('express-jwt');

const createAdminService = require('./admin-service');
const permissions = require('../middleware/route-permissions');

const router = express.Router();

// ensure JWT is valid.
router.use(validateJWT({secret: process.env.DCS_JWT_SECRET}));

router
    .route('/resubmit-failed-applications')
    .post(permissions('update:questionnaires'), async (req, res, next) => {
        try {
            const adminService = createAdminService({logger: req.log});
            const resourceCollection = await adminService.resubmitFailedQuestionnaires();
            res.status(200).json({
                data: resourceCollection
            });
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
