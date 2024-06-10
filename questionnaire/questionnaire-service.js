/* eslint-disable no-useless-catch */

'use strict';

const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');
const VError = require('verror');
const router = require('q-router');
const uuidv4 = require('uuid/v4');
const ajvFormatsMobileUk = require('ajv-formats-mobile-uk');
const templates = require('./templates');
const questionnaireResource = require('./resources/questionnaire-resource');
const createQuestionnaireHelper = require('./questionnaire/questionnaire');
const isQuestionnaireCompatible = require('./utils/isQuestionnaireVersionCompatible');
const createTaskListService = require('./task-list/task-list-service');

const defaults = {};
defaults.createQuestionnaireDAL = require('./questionnaire-dal');

defaults.apiVersion = '2023-05-17';

function createQuestionnaireService({
    logger,
    apiVersion = defaults.apiVersion,
    ownerId,
    createQuestionnaireDAL = defaults.createQuestionnaireDAL
} = {}) {
    const db = createQuestionnaireDAL({logger, ownerId});

    // Check API version
    if (apiVersion !== defaults.apiVersion) {
        throw new VError(
            {
                name: 'ApiVersionNotFound'
            },
            `API version "${apiVersion}" is not compatible with this release`
        );
    }

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

    function supportsTaskList(questionnaireDefinition) {
        if (questionnaireDefinition.routes.type === 'parallel') {
            return true;
        }
        return false;
    }

    async function createQuestionnaire(templateName, ownerData, originData, externalData) {
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

        if (originData) {
            questionnaire.answers.origin = {
                channel: originData.channel
            };
        }

        if (externalData) {
            questionnaire.answers.system = {
                'external-id': externalData.id
            };
        }

        await db.createQuestionnaire(uuidV4, questionnaire);

        if (ownerData.isAuthenticated) {
            await updateExpiryForAuthenticatedOwner(uuidV4, ownerData.id);
        }

        return {
            data: questionnaireResource({questionnaire}, supportsTaskList(questionnaire))
        };
    }

    async function getQuestionnaire(questionnaireId) {
        return db.getQuestionnaireByOwner(questionnaireId);
    }

    async function getQuestionnaireSubmissionStatus(questionnaireId) {
        return db.getQuestionnaireSubmissionStatusByOwner(questionnaireId);
    }

    async function updateQuestionnaireSubmissionStatus(questionnaireId, submissionStatus) {
        return db.updateQuestionnaireSubmissionStatusByOwner(questionnaireId, submissionStatus);
    }

    function getSection(sectionId, qRouter) {
        let section;

        if (sectionId === 'owner') {
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

    async function getSubmissionResponseData(questionnaireId) {
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
            const qRouter = router(questionnaireDefinition);
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
            if (sectionDetails.id === 'owner') {
                const currentSection = qRouter.current();
                currentSection.context.answers[sectionDetails.id] = coercedAnswers;
                answeredQuestionnaire = currentSection.context;
            } else {
                const nextSection = qRouter.next(coercedAnswers, sectionDetails.id);
                answeredQuestionnaire = nextSection.context;
            }

            // Store the updated questionnaire object
            await db.updateQuestionnaireByOwner(questionnaireId, answeredQuestionnaire);

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

    function getSectionRouteBySectionId(questionnaireDefinition, sectionId) {
        const questionnaire = createQuestionnaireHelper({questionnaireDefinition});
        const taskListService = createTaskListService({questionnaireDefinition});

        const section = questionnaire.getSection(sectionId);
        if (taskListService.isTaskListSchema({sectionSchema: section.getSchema()})) {
            return {};
        }

        const {states} = questionnaireDefinition.routes;

        if (supportsTaskList(questionnaireDefinition)) {
            const tasks = states;
            const taskIds = Object.keys(tasks);
            for (let i = 0; i < taskIds.length; i += 1) {
                if (sectionId in tasks[taskIds[i]].states) {
                    return tasks[taskIds[i]].states[sectionId];
                }
            }
        } else if (sectionId in states) {
            return states[sectionId];
        }

        throw new VError(`Section "${sectionId}" not found`);
    }

    async function buildMetaBlock(questionnaire, sectionId) {
        // TODO: move this meta on to the appropriate section resource
        const sectionType = getSectionRouteBySectionId(questionnaire, sectionId).type;
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
        // 1.1 check questionnaire is a compatible version
        const isCompatible = isQuestionnaireCompatible(questionnaire.version);
        // 1.2 if not, return 'incompatible questionnaire' schema
        if (!isCompatible) {
            return {
                data: [
                    {
                        type: 'progress-entries',
                        id: 'incompatible',
                        attributes: {
                            sectionId: null,
                            url: null
                        },
                        relationships: {
                            section: {
                                data: {
                                    type: null,
                                    id: 'incompatible'
                                }
                            }
                        }
                    }
                ]
            };
        }
        // 2 - get router
        const qRouter = router(questionnaire);

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
                const taskListService = createTaskListService();
                if (isQuestionnaireModified) {
                    // Store the updated questionnaire object
                    await db.updateQuestionnaireByOwner(questionnaireId, section.context);
                }

                sectionId = section.id;

                // Create the progress entry compound document
                let previousProgressEntryLink;
                if (
                    section.id === section.context.routes.initial ||
                    section.id === section.context.currentSectionId // task list
                ) {
                    previousProgressEntryLink = questionnaire.routes.referrer;
                    // TODO: pass in the sectionSchema, not the sectionId.
                } else if (taskListService.isTaskListSchema({sectionId: section.id})) {
                    previousProgressEntryLink = undefined;
                } else {
                    previousProgressEntryLink = `${process.env.DCS_URL}/api/questionnaires/${
                        questionnaire.id
                    }/progress-entries?filter[sectionId]=${qRouter.previous(sectionId).id}`;
                }

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
        return db.updateQuestionnaireModifiedDateByOwner(questionnaireId);
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

    async function getQuestionnaireIdsBySubmissionStatus(status) {
        return db.getQuestionnaireIdsBySubmissionStatus(status);
    }

    return Object.freeze({
        createQuestionnaire,
        createAnswers,
        getQuestionnaire,
        getQuestionnaireSubmissionStatus,
        getSubmissionResponseData,
        getAnswers,
        getProgressEntries,
        updateQuestionnaireSubmissionStatus,
        updateQuestionnaireModifiedDate,
        getSessionResource,
        getAnswersBySectionId,
        updateExpiryForAuthenticatedOwner,
        getQuestionnaireIdsBySubmissionStatus
    });
}

module.exports = createQuestionnaireService;
