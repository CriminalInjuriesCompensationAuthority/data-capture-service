'use strict';

const express = require('express');
const validateJWT = require('express-jwt');

const createQuestionnaireService = require('./questionnaire-service');
const permissions = require('../middleware/route-permissions');

const router = express.Router();
const rxTemplateName = /^[a-zA-Z0-9-]{1,30}$/;

// Ensure JWT is valid
router.use(validateJWT({secret: process.env.SECRET}));

router.route('/').post(permissions('create:questionnaires'), async (req, res, next) => {
    try {
        if (
            req.body.data &&
            req.body.data.attributes &&
            req.body.data.attributes.templateId &&
            !rxTemplateName.test(req.body.data.attributes.templateName)
        ) {
            const err = Error(`Bad request`);
            err.name = 'HTTPError';
            err.statusCode = 400;
            err.error = '400 Bad Request';
            throw err;
        }

        const {templateName} = req.body.data.attributes;

        const questionnaireService = createQuestionnaireService({logger: req.log});
        const response = await questionnaireService.createQuestionnaire(templateName);

        res.status(201).json(response);
    } catch (err) {
        next(err);
    }
});

router
    .route('/:questionnaireId/sections/answers')
    .get(permissions('read:questionnaires'), async (req, res, next) => {
        try {
            const {questionnaireId} = req.params;
            const questionnaireService = createQuestionnaireService({logger: req.log});
            const resourceCollection = await questionnaireService.getAnswers(questionnaireId);

            res.status(200).json({
                data: resourceCollection
            });
        } catch (err) {
            next(err);
        }
    });

router
    .route('/:questionnaireId/sections/system/answers')
    .post(permissions('create:system-answers'), async (req, res, next) => {
        try {
            // There can only every be one "answers" block per section
            // TODO: handle multiple attempts to "create" answers
            const answers = req.body.data.attributes;
            const questionnaireService = createQuestionnaireService({logger: req.log});
            const response = await questionnaireService.createAnswers(
                req.params.questionnaireId,
                'system',
                answers
            );

            res.status(201).json(response);
        } catch (err) {
            next(err);
        }
    });

router
    .route('/:questionnaireId/sections/:sectionId/answers')
    .post(permissions('update:questionnaires'), async (req, res, next) => {
        try {
            // There can only every be one "answers" block per section
            // TODO: handle multiple attempts to "create" answers
            const answers = req.body.data.attributes;
            const questionnaireService = createQuestionnaireService({logger: req.log});
            const response = await questionnaireService.createAnswers(
                req.params.questionnaireId,
                req.params.sectionId,
                answers
            );

            res.status(201).json(response);
        } catch (err) {
            next(err);
        }
    });

router
    .route('/:questionnaireId/submissions')
    .get(permissions('read:questionnaires'), async (req, res, next) => {
        try {
            const {questionnaireId} = req.params;
            const questionnaireService = createQuestionnaireService({logger: req.log});
            const submissionStatus = await questionnaireService.getQuestionnaireSubmissionStatus(
                questionnaireId
            );
            // the default value for this column is "NOT_STARTED", so if it doesn't
            // exist, then it must not be a valid questionnaire ID.
            if (!submissionStatus) {
                const err = Error(
                    `Questionnaire with questionnaireId "${questionnaireId}" does not exist`
                );
                err.name = 'HTTPError';
                err.statusCode = 404;
                err.error = '404 Not Found';
                throw err;
            }

            const response = await questionnaireService.getSubmissionResponseData(questionnaireId);

            res.status(200).json(response);
        } catch (err) {
            next(err);
        }
    })
    .post(permissions('update:questionnaires'), async (req, res, next) => {
        try {
            const {questionnaireId} = req.params;
            const questionnaireService = createQuestionnaireService({logger: req.log});
            const submissionStatus = await questionnaireService.getQuestionnaireSubmissionStatus(
                questionnaireId
            );

            // the default value for this column is "NOT_STARTED", so if it doesn't
            // exist, then it must not be a valid questionnaire ID.
            if (!submissionStatus) {
                const err = Error(
                    `Questionnaire with questionnaireId "${questionnaireId}" does not exist`
                );
                err.name = 'HTTPError';
                err.statusCode = 404;
                err.error = '404 Not Found';
                throw err;
            }

            // check all answers are correct.
            await questionnaireService.validateAllAnswers(questionnaireId);

            const response = await questionnaireService.getSubmissionResponseData(
                questionnaireId,
                true
            );

            if (submissionStatus === 'NOT_STARTED') {
                res.status(201).json(response);
            } else {
                res.status(200).json(response);
            }
        } catch (err) {
            next(err);
        }
    });

router
    .route('/:questionnaireId/progress-entries')
    .get(permissions('read:progress-entries'), async (req, res, next) => {
        try {
            const {questionnaireId} = req.params;
            const {filter} = req.query;
            const questionnaireService = createQuestionnaireService({logger: req.log});
            const progressEntries = await questionnaireService.getProgressEntries(
                questionnaireId,
                filter
            );

            res.status(200).json(progressEntries);
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
