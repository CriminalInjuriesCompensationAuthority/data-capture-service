'use strict';

const express = require('express');
const {expressjwt: validateJWT} = require('express-jwt');

const createQuestionnaireService = require('./questionnaire-service');
const permissions = require('../middleware/route-permissions');
const metadataRouter = require('./metadata/metadata-routes.js');
const submissionsRouter = require('./submissions/submissions-routes.js');

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

        const {templateName, owner, origin, analytics} = req.body.data.attributes;

        const questionnaireService = createQuestionnaireService({
            logger: req.log,
            apiVersion: req.get('Dcs-Api-Version'),
            ownerId: owner?.id
        });
        const response = await questionnaireService.createQuestionnaire(
            templateName,
            owner,
            origin,
            analytics
        );

        res.status(201).json(response);
    } catch (err) {
        next(err);
    }
});

router.use(metadataRouter);
router.use(submissionsRouter);

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
    .route('/:questionnaireId/sections/owner/answers')
    .post(permissions('update:questionnaires'), async (req, res, next) => {
        try {
            // There can only every be one "answers" block per section
            // TODO: handle multiple attempts to "create" answers
            const answers = req.body.data.attributes;
            const questionnaireService = createQuestionnaireService({
                logger: req.log,
                apiVersion: req.get('Dcs-Api-Version'),
                ownerId: req.get('On-Behalf-Of')
            });

            const response = await questionnaireService.createAnswers(
                req.params.questionnaireId,
                'owner',
                answers
            );

            await questionnaireService.updateExpiryForAuthenticatedOwner(
                req.params.questionnaireId,
                answers['owner-id']
            );

            res.status(201).json(response);
        } catch (err) {
            next(err);
        }
    });

router
    .route('/:questionnaireId/sections/:sectionId/answers')
    .get(permissions('read:questionnaires'), async (req, res, next) => {
        try {
            const questionnaireService = createQuestionnaireService({
                logger: req.log,
                apiVersion: req.get('Dcs-Api-Version'),
                ownerId: req.get('On-Behalf-Of')
            });
            const response = await questionnaireService.getAnswersBySectionId(
                req.params.questionnaireId,
                req.params.sectionId
            );
            res.status(200).json(response);
        } catch (err) {
            next(err);
        }
    })
    .post(permissions('update:questionnaires'), async (req, res, next) => {
        try {
            // There can only every be one "answers" block per section
            // TODO: handle multiple attempts to "create" answers
            const answers = req.body.data.attributes;
            const questionnaireService = createQuestionnaireService({
                logger: req.log,
                apiVersion: req.get('Dcs-Api-Version'),
                ownerId: req.get('On-Behalf-Of')
            });
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
    .route('/:questionnaireId/progress-entries')
    .get(permissions('read:progress-entries'), async (req, res, next) => {
        try {
            const {questionnaireId} = req.params;
            const questionnaireService = createQuestionnaireService({
                logger: req.log,
                apiVersion: req.get('Dcs-Api-Version'),
                ownerId: req.get('On-Behalf-Of')
            });
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
            const questionnaireService = createQuestionnaireService({
                logger: req.log,
                apiVersion: req.get('Dcs-Api-Version'),
                ownerId: req.get('On-Behalf-Of')
            });
            await questionnaireService.updateQuestionnaireModifiedDate(questionnaireId);
            const sessionResource = await questionnaireService.getSessionResource(questionnaireId);
            res.status(200).json(sessionResource);
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
