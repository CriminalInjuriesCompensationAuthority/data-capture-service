/* eslint-disable no-useless-catch */

'use strict';

const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');
const VError = require('verror');
const createQRouter = require('q-router');
const uuidv4 = require('uuid/v4');
const ajvFormatsMobileUk = require('ajv-formats-mobile-uk');
const templates = require('./templates');
const createSqsService = require('../services/sqs');
const createSlackService = require('../services/slack');
const questionnaireResource = require('./resources/questionnaire-resource');
const createQuestionnaireHelper = require('./questionnaire/questionnaire');

const defaults = {};
defaults.createQuestionnaireDAL = require('./questionnaire-dal');

function createQuestionnaireService({
    logger,
    apiVersion,
    ownerId,
    createQuestionnaireDAL = defaults.createQuestionnaireDAL
} = {}) {
    const db = createQuestionnaireDAL({logger, ownerId});
    const ajv = new Ajv({
        allErrors: true,
        jsonPointers: true,
        format: 'full',
        coerceTypes: true
    });

    AjvErrors(ajv);

    ajv.addFormat('mobile-uk', ajvFormatsMobileUk);

    async function updateExpiryForAuthenticatedOwner(questionnaireId, owner) {
        await db.updateExpiryForAuthenticatedOwner(questionnaireId, owner);
    }

    async function createQuestionnaire(templateName, ownerData) {
        if (!(templateName in templates)) {
            throw new VError(
                {
                    name: 'ResourceNotFound'
                },
                `Template "${templateName}" does not exist`
            );
        }

        const uuidV4 = uuidv4();
        const questionnaire = templates[templateName](uuidV4);

        if (apiVersion === '2023-05-17') {
            if (!ownerData) {
                throw new VError(
                    {
                        name: 'OwnerNotFound'
                    },
                    `Owner data must be defined`
                );
            }

            questionnaire.answers = {
                owner: {
                    'owner-id': ownerData.id,
                    'is-authenticated': ownerData.isAuthenticated
                }
            };
        }

        await db.createQuestionnaire(uuidV4, questionnaire);

        if (apiVersion === '2023-05-17' && ownerData.isAuthenticated) {
            await updateExpiryForAuthenticatedOwner(uuidV4, ownerData.id);
        }

        return {
            data: questionnaireResource({questionnaire})
        };
    }

    async function getQuestionnaire(questionnaireId) {
        return apiVersion === '2023-05-17'
            ? db.getQuestionnaireByOwner(questionnaireId)
            : db.getQuestionnaire(questionnaireId);
    }

    async function getQuestionnaireSubmissionStatus(questionnaireId) {
        return apiVersion === '2023-05-17'
            ? db.getQuestionnaireSubmissionStatusByOwner(questionnaireId)
            : db.getQuestionnaireSubmissionStatus(questionnaireId);
    }

    async function updateQuestionnaireSubmissionStatus(questionnaireId, submissionStatus) {
        return apiVersion === '2023-05-17'
            ? db.updateQuestionnaireSubmissionStatusByOwner(questionnaireId, submissionStatus)
            : db.updateQuestionnaireSubmissionStatus(questionnaireId, submissionStatus);
    }

    function getSection(sectionId, qRouter) {
        let section;

        if (sectionId === 'system' || sectionId === 'owner') {
            const currentSection = qRouter.current();

            section = {
                id: sectionId,
                // Get the context (questionnaire) from the current section
                context: currentSection.context
            };
        } else {
            // Ensure the requested sectionId is available
            section = qRouter.current(sectionId);

            if (!section) {
                throw new VError(`Section "${sectionId}" not found`);
            }
        }

        return section;
    }

    async function retrieveCaseReferenceNumber(questionnaireId) {
        const questionnaire = await getQuestionnaire(questionnaireId);
        const caseReference =
            questionnaire.answers &&
            questionnaire.answers.system &&
            questionnaire.answers.system['case-reference'];
        if (caseReference) {
            return caseReference;
        }

        return null;
    }
    async function startSubmission(questionnaireId) {
        try {
            await updateQuestionnaireSubmissionStatus(questionnaireId, 'IN_PROGRESS');

            const sqsService = createSqsService({logger});
            const submissionResponse = await sqsService.send(
                {
                    applicationId: questionnaireId
                },
                process.env.AWS_SQS_ID
            );

            logger.info(submissionResponse);
            if (!submissionResponse || !submissionResponse.MessageId) {
                await updateQuestionnaireSubmissionStatus(questionnaireId, 'FAILED');
                const slackService = createSlackService();
                slackService.sendMessage({
                    appReference: `${process.env.APP_ENV || 'dev'}.reporter.webhook`,
                    messageBodyId: 'message-bus-down',
                    templateParameters: {
                        timeStamp: new Date().getTime()
                    }
                });
            }
        } catch (err) {
            logger.error({err}, 'MESSAGE SENDING FAILED');
            await updateQuestionnaireSubmissionStatus(questionnaireId, 'FAILED');
        }
    }

    async function getSubmissionResponseData(questionnaireId, isPostRequest = false) {
        let submissionStatus = await getQuestionnaireSubmissionStatus(questionnaireId);

        // kick things off if it is a POST request and it is not yet started.
        if (isPostRequest === true && ['NOT_STARTED', 'FAILED'].includes(submissionStatus)) {
            await startSubmission(questionnaireId);
            // `startSubmission` updates the submission status within the
            // database so we need to get it again.
            submissionStatus = await getQuestionnaireSubmissionStatus(questionnaireId);
        }

        const status = await getQuestionnaireSubmissionStatus(questionnaireId);
        const caseReferenceNumber = await retrieveCaseReferenceNumber(questionnaireId);
        const submitted = !!caseReferenceNumber;

        const response = {
            data: {
                id: questionnaireId,
                type: 'submissions',
                attributes: {
                    questionnaireId,
                    submitted,
                    status,
                    caseReferenceNumber
                }
            }
        };

        return response;
    }

    function buildAnswerResource(answersId, questionnaire) {
        const answerResource = {
            type: 'answers',
            id: answersId,
            attributes: questionnaire.answers[answersId]
        };

        return answerResource;
    }

    async function getAnswers(questionnaireId) {
        const questionnaire = await getQuestionnaire(questionnaireId);
        const resourceCollection = questionnaire.progress.reduce((acc, sectionAnswersId) => {
            // Does this section have answers
            if (questionnaire.answers[sectionAnswersId]) {
                acc.push(buildAnswerResource(sectionAnswersId, questionnaire));
            }

            return acc;
        }, []);

        return resourceCollection;
    }

    async function createAnswers(questionnaireId, sectionId, answers) {
        // Make a copy of the supplied answers. These will be returned if they fail validation
        const rawAnswers = JSON.parse(JSON.stringify(answers));
        let answerResource;

        try {
            // 1 - get questionnaire instance
            const questionnaireDefinition = await getQuestionnaire(questionnaireId);

            // 2 - is the section allowed to be posted to e.g. is it in their progress
            const qRouter = createQRouter(questionnaireDefinition);
            const sectionDetails = getSection(sectionId, qRouter);

            // 3 - Section is available. Validate the answers against it
            const questionnaire = createQuestionnaireHelper({
                questionnaireDefinition
            });
            const section = questionnaire.getSection(sectionDetails.id);
            const sectionSchema = section.getSchema();

            const validate = ajv.compile(sectionSchema);
            // The AJV validate function coerces the answers and mutates the answers object
            const valid = validate(answers);
            const coercedAnswers = answers;

            if (!valid) {
                const validationError = new VError({
                    name: 'JSONSchemaValidationError',
                    info: {
                        schema: sectionSchema,
                        answers: rawAnswers,
                        coercedAnswers,
                        schemaErrors: validate.errors
                    }
                });

                throw validationError;
            }

            // 4 - If we're here all is good
            // Pass the answers to the router which will update the context (questionnaire) with these answers.
            let answeredQuestionnaire;

            if (sectionDetails.id === 'system' || sectionDetails.id === 'owner') {
                const currentSection = qRouter.current();
                currentSection.context.answers[sectionDetails.id] = coercedAnswers;
                answeredQuestionnaire = currentSection.context;
            } else {
                const nextSection = qRouter.next(coercedAnswers, sectionDetails.id);
                answeredQuestionnaire = nextSection.context;
            }

            // Store the updated questionnaire object
            if (apiVersion === '2023-05-17') {
                await db.updateQuestionnaireByOwner(questionnaireId, answeredQuestionnaire);
            } else {
                await db.updateQuestionnaire(questionnaireId, answeredQuestionnaire);
            }

            answerResource = {
                data: {
                    type: 'answers',
                    id: sectionDetails.id,
                    attributes: coercedAnswers
                }
            };
        } catch (err) {
            // re-throw for the moment
            // central error handler will collect it
            throw err;
        }

        return answerResource;
    }

    async function validateAllAnswers(questionnaireId) {
        const questionnaire = await getQuestionnaire(questionnaireId);

        // get the section names from the progress array.
        // these are the only sections that we need to validate
        // against because these are the only sections that pertain
        // to the user's questionnaire. i.e. there may be other answers
        // in the questionnaire as a result of the user backtracking
        // and then taking another route of questions. If this is the
        // case, then just disregard the other answers from the other
        // route(s).
        const sectionsToValidate = questionnaire.progress;
        const validationErrors = [];
        sectionsToValidate.forEach(sectionId => {
            const sectionSchema = questionnaire.sections[sectionId];
            const answers = questionnaire.answers[sectionId];
            const validate = ajv.compile(sectionSchema);
            const valid = validate(answers || {});
            if (!valid) {
                validationErrors.push(validate.errors);
            }
        });

        if (validationErrors.length) {
            logger.error({err: validationErrors}, 'SCHEMA VALIDATION FAILED');
            const validationError = new VError({
                name: 'JSONSchemaValidationErrors',
                info: {
                    submissions: await getSubmissionResponseData(questionnaireId),
                    schemaErrors: validationErrors
                }
            });

            throw validationError;
        }

        // mirror the ajv response for being valid.
        return {
            valid: true
        };
    }

    function buildSectionResource(sectionId, questionnaireDefinition) {
        const questionnaire = createQuestionnaireHelper({questionnaireDefinition});
        const section = questionnaire.getSection(sectionId);
        const sectionResource = {
            type: 'sections',
            id: sectionId,
            attributes: section.getSchema()
        };

        // Add any answer relationships
        const {answers} = questionnaireDefinition;
        const sectionAnswers = answers ? answers[sectionId] : undefined;

        if (sectionAnswers !== undefined) {
            sectionResource.relationships = {
                answer: {
                    data: {
                        type: 'answers',
                        id: sectionId
                    }
                }
            };
        }

        return sectionResource;
    }

    function buildProgressEntryResource(sectionId) {
        const progressEntryResource = {
            type: 'progress-entries',
            id: sectionId,
            attributes: {
                sectionId,
                url: null
            },
            relationships: {
                section: {
                    data: {
                        type: 'sections',
                        id: sectionId
                    }
                }
            }
        };

        return progressEntryResource;
    }

    async function buildSessionInformationBlock(questionnaireId) {
        const submissionStatus = await getQuestionnaireSubmissionStatus(questionnaireId);

        if (submissionStatus !== 'NOT_STARTED') {
            const resourceCreationDate = Date.now();
            return {
                alive: false,
                duration: 0,
                created: resourceCreationDate,
                expires: resourceCreationDate
            };
        }

        const sessionCreateDateISO = await db.getQuestionnaireModifiedDate(questionnaireId);
        const sessionCreatedDateMs = new Date(sessionCreateDateISO) * 1;
        const sessionDuration = parseInt(process.env.DCS_SESSION_DURATION, 10);
        const now = new Date() * 1;
        const sessionExpiryDate = sessionCreatedDateMs + sessionDuration;
        return {
            alive: now < sessionExpiryDate,
            duration: sessionDuration,
            created: sessionCreatedDateMs,
            expires: sessionExpiryDate
        };
    }

    async function buildMetaBlock(questionnaire, sectionId) {
        // TODO: move this meta on to the appropriate section resource
        const sectionType = questionnaire.routes.states[sectionId].type;
        const isFinalType = sectionType && sectionType === 'final';
        return {
            summary: questionnaire.routes.summary,
            confirmation: questionnaire.routes.confirmation,
            final: isFinalType
        };
    }

    async function getSessionResource(questionnaireId) {
        let sessionResource;
        try {
            sessionResource = {
                data: [
                    {
                        id: questionnaireId,
                        type: 'sessions',
                        attributes: await buildSessionInformationBlock(questionnaireId)
                    }
                ]
            };
        } catch {
            throw new VError(
                {
                    name: 'ResourceNotFound'
                },
                `Session associated with questionnaire id "${questionnaireId}" does not exist`
            );
        }
        return sessionResource;
    }

    async function getProgressEntries(questionnaireId, query) {
        // 1 - get questionnaire instance
        const questionnaire = await getQuestionnaire(questionnaireId);
        // 2 - get router
        const qRouter = createQRouter(questionnaire);
        // 3 - filter or paginate progress entries if required
        // Currently this only supports queries that return a single progress entry
        if (query) {
            const {filter, page} = query;
            const compoundDocument = {};
            let section;
            let sectionId;
            let isQuestionnaireModified = true;

            if (filter?.position === 'current') {
                // Calling current() doesn't change any state. No need to persist.
                isQuestionnaireModified = false;
                section = qRouter.current();
            } else if (filter?.position === 'first') {
                // Calling first() doesn't change any state. No need to persist.
                isQuestionnaireModified = false;
                section = qRouter.first();
            } else if (filter?.sectionId !== undefined) {
                ({sectionId} = filter);
                section = qRouter.current(sectionId);
            } else if (page?.before !== undefined) {
                // Find the previous sectionId
                try {
                    sectionId = page.before;
                    section = qRouter.previous(sectionId);
                } catch (err) {
                    // The sectionId was found but it has no previous section e.g. the first progress entry
                    // We'll return a pseudo progress-entry that references the "referrer"
                    // TODO: "referrer" is now a reserved id by the DCS e.g. A questionnaire can't use "referrer" as a section id. Use a naming convention to convey this and to avoid naming collisions
                    return {
                        data: [
                            {
                                type: 'progress-entries',
                                id: 'referrer',
                                attributes: {
                                    sectionId: null,
                                    url: questionnaire.routes.referrer
                                }
                            }
                        ]
                    };
                }
            }

            // Is the progress entry available
            if (section) {
                if (isQuestionnaireModified) {
                    // Store the updated questionnaire object
                    if (apiVersion === '2023-05-17') {
                        await db.updateQuestionnaireByOwner(questionnaireId, section.context);
                    } else {
                        await db.updateQuestionnaire(questionnaireId, section.context);
                    }
                }

                sectionId = section.id;

                // Create the progress entry compound document
                const previousProgressEntryLink =
                    section.id === section.context.routes.initial
                        ? questionnaire.routes.referrer
                        : `${process.env.DCS_URL}/api/v1/questionnaires/${
                              questionnaire.id
                          }/progress-entries?filter[sectionId]=${qRouter.previous(sectionId).id}`;

                compoundDocument.data = [buildProgressEntryResource(sectionId)];
                // Include related resources
                // Currently this is a one-to-one relationship with a section resource
                compoundDocument.included = [buildSectionResource(sectionId, questionnaire)];
                // If the included resource has a relationship, include it too. Only works with "answers" resources at the moment.
                compoundDocument.included = compoundDocument.included.reduce(
                    (acc, includedResource) => {
                        if ('relationships' in includedResource) {
                            const {relationships} = includedResource;

                            Object.keys(relationships).forEach(relationshipName => {
                                const relationship = relationships[relationshipName];
                                const relationshipData = relationship.data;

                                if (relationshipData.type === 'answers') {
                                    acc.push(
                                        buildAnswerResource(relationshipData.id, questionnaire)
                                    );
                                }
                            });
                        }

                        return acc;
                    },
                    compoundDocument.included
                );

                // Add pagination links
                compoundDocument.links = {
                    prev: previousProgressEntryLink
                };

                compoundDocument.meta = await buildMetaBlock(questionnaire, sectionId);

                return compoundDocument;
            }

            // Query found no progress entries
            throw new VError(
                {
                    name: 'ResourceNotFound'
                },
                `ProgressEntry "${sectionId}" does not exist`
            );
        }

        // 5 - If no query is supplied, return the progress entries collection
        const progressEntriesCollection = questionnaire.progress.map(sectionId =>
            buildProgressEntryResource(sectionId, questionnaire)
        );

        return {
            data: progressEntriesCollection
        };
    }

    async function updateQuestionnaireModifiedDate(questionnaireId) {
        if (apiVersion === '2023-05-17') {
            return db.updateQuestionnaireModifiedDateByOwner(questionnaireId);
        }
        return db.updateQuestionnaireModifiedDate(questionnaireId);
    }

    // TODO: Move this functionality to q-router
    async function runOnCompleteActions(questionnaireDefinition) {
        const questionnaire = createQuestionnaireHelper({
            questionnaireDefinition
        });
        const permittedActions = questionnaire.getPermittedActions();
        const actionResults = permittedActions.map(action => {
            const sqsService = createSqsService({logger});
            if (action.type === 'sendEmail') {
                const payload = {
                    templateId: action.data.templateId,
                    emailAddress: action.data.emailAddress,
                    personalisation: {
                        caseReference: action.data.personalisation.caseReference
                    },
                    reference: null
                };
                return sqsService.send(payload, process.env.NOTIFY_AWS_SQS_ID);
            }

            if (action.type === 'sendSms') {
                const payload = {
                    templateId: action.data.templateId,
                    phoneNumber: action.data.phoneNumber,
                    personalisation: {
                        caseReference: action.data.personalisation.caseReference
                    },
                    reference: null
                };
                return sqsService.send(payload, process.env.NOTIFY_AWS_SQS_ID);
            }
            return Promise.reject(Error(`Action type "${action.type}" is not supported`));
        });

        return actionResults;
    }

    async function getAnswersBySectionId(questionnaireId, sectionId) {
        const questionnaire = await getQuestionnaire(questionnaireId);

        if (questionnaire.progress.includes(sectionId)) {
            return {
                data: buildAnswerResource(sectionId, questionnaire)
            };
        }
        throw new VError(
            {
                name: 'ResourceNotFound'
            },
            `Answer resource "${sectionId}" does not exist for ${questionnaireId}`
        );
    }

    return Object.freeze({
        createQuestionnaire,
        createAnswers,
        getQuestionnaire,
        getQuestionnaireSubmissionStatus,
        getSubmissionResponseData,
        validateAllAnswers,
        getAnswers,
        getProgressEntries,
        updateQuestionnaireSubmissionStatus,
        updateQuestionnaireModifiedDate,
        getSessionResource,
        runOnCompleteActions,
        getAnswersBySectionId,
        updateExpiryForAuthenticatedOwner
    });
}

module.exports = createQuestionnaireService;
