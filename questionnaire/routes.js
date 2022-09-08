'use strict';

const express = require('express');
const {expressjwt: validateJWT} = require('express-jwt');

const createQuestionnaireService = require('./questionnaire-service');
const permissions = require('../middleware/route-permissions');
const datasetRouter = require('./dataset/dataset-routes.js');

const router = express.Router();
const rxTemplateName = /^[a-zA-Z0-9-]{1,30}$/;
// Ensure JWT is valid
router.use(validateJWT({secret: process.env.DCS_JWT_SECRET, algorithms: ['HS256']}));

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

router.use(datasetRouter);

router
    .route('/:questionnaireId/sections/answers')
    .get(permissions('read:questionnaires', 'read:answers'), async (req, res, next) => {
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

            await questionnaireService.updateQuestionnaireSubmissionStatus(
                req.params.questionnaireId,
                'COMPLETED'
            );

            const questionnireDefinition = await questionnaireService.getQuestionnaire(
                req.params.questionnaireId
            );

            // Currently, fire and forget. No await required
            questionnaireService.runOnCompleteActions(questionnireDefinition);

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
            const questionnaire = await questionnaireService.getQuestionnaire(questionnaireId);

            if (!questionnaire) {
                const err = Error(
                    `Questionnaire with questionnaireId "${questionnaireId}" does not exist`
                );
                err.name = 'HTTPError';
                err.statusCode = 404;
                err.error = '404 Not Found';
                throw err;
            }

            const submissionStatus = await questionnaireService.getQuestionnaireSubmissionStatus(
                questionnaireId
            );

            // are we currently, or have we been on this questionnaire's summary page?
            // we infer a questionnaire is complete if the user has visited the summary page.
            const isQuestionnaireComplete = questionnaire.routes.summary.some(summarySectionId =>
                questionnaire.progress.includes(summarySectionId)
            );

            // if the summary section ID is in the progress array, then that means
            // the questionnaire is submittable.
            if (!isQuestionnaireComplete) {
                const err = Error(
                    `Questionnaire with ID "${questionnaireId}" is not in a submittable state`
                );
                err.name = 'HTTPError';
                err.statusCode = 409;
                err.error = '409 Conflict';
                throw err;
            }

            // if the submission status is anything other than 'NOT_STARTED' then it
            // means that the submission resource has been previously created.
            // also skip over this for failed application so they can be resubmitted.
            if (!['NOT_STARTED', 'FAILED'].includes(submissionStatus)) {
                const err = Error(
                    `Submission resource with ID "${questionnaireId}" already exists`
                );
                err.name = 'HTTPError';
                err.statusCode = 409;
                err.error = '409 Conflict';
                throw err;
            }

            // check all answers are correct.
            await questionnaireService.validateAllAnswers(questionnaireId);

            // TODO: refactor `getSubmissionResponseData` to be more intuitive.
            const response = await questionnaireService.getSubmissionResponseData(
                questionnaireId,
                true
            );

            res.status(201).json(response);
        } catch (err) {
            next(err);
        }
    });

router
    .route('/:questionnaireId/progress-entries')
    .get(permissions('read:progress-entries'), async (req, res, next) => {
        try {
            const {questionnaireId} = req.params;
            const questionnaireService = createQuestionnaireService({logger: req.log});
            const progressEntries = await questionnaireService.getProgressEntries(
                questionnaireId,
                req.query
            );

            res.status(200).json(progressEntries);
        } catch (err) {
            next(err);
        }
    });

router
    .route('/:questionnaireId/session/keep-alive')
    .get(permissions('update:questionnaires'), async (req, res, next) => {
        try {
            const {questionnaireId} = req.params;
            const questionnaireService = createQuestionnaireService({logger: req.log});
            await questionnaireService.updateQuestionnaireModifiedDate(questionnaireId);
            const sessionResource = await questionnaireService.getSessionResource(questionnaireId);
            res.status(200).json(sessionResource);
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
