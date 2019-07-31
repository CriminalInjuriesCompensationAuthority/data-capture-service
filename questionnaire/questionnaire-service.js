'use strict';

const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');
const VError = require('verror');
const createQRouter = require('q-router');
const uuidv4 = require('uuid/v4');
const templates = require('./templates');
const createQuestionaireDAL = require('./questionnaire-dal');
const createMessageBusCaller = require('../services/message-bus');

function createQuestionnaireService(spec) {
    const {logger} = spec;
    const db = createQuestionaireDAL({logger});
    const ajv = new Ajv({
        allErrors: true,
        jsonPointers: true,
        format: 'full',
        coerceTypes: true
    }); // options can be passed, e.g. {allErrors: true}

    AjvErrors(ajv);

    async function getQuestionnaire(questionnaireId) {
        const questionnaire = await db.getQuestionnaire(questionnaireId);
        return questionnaire;
    }

    async function createQuestionnaire(templateName) {
        if (!(templateName in templates)) {
            const err = Error(`Template "${templateName}" does not exist`);
            err.name = 'HTTPError';
            err.statusCode = 404;
            err.error = '404 Not Found';
            throw err;
        }

        const uuidV4 = uuidv4();
        const questionnaire = templates[templateName](uuidV4);

        await db.createQuestionnaire(uuidV4, questionnaire);

        return {
            data: {
                type: 'questionnaires',
                id: questionnaire.id,
                attributes: questionnaire
            }
        };
    }

    async function getQuestionnaireSubmissionStatus(questionnaireId) {
        const submissionStatus = await db.getQuestionnaireSubmissionStatus(questionnaireId);

        return submissionStatus;
    }

    async function updateQuestionnaireSubmissionStatus(questionnaireId, submissionStatus) {
        await db.updateQuestionnaireSubmissionStatus(questionnaireId, submissionStatus);
    }

    function getSection(sectionId, qRouter) {
        // TODO: this validation should be covered by express-openapi-validator
        // if (!validSectionIdFormat(sectionId)) {
        //     return undefined;
        // }
        let section;

        // TODO: change "system" in q-definitions to "p--system" and remove this check
        if (sectionId === 'system') {
            // TODO: "system" shouldn't be added to "user progress". We'll need to bodge this for the moment
            // TODO: the bodge involves bypassing the router!!
            const currentSection = qRouter.current();

            // TODO: bodge... simulate a response from the router
            section = {
                id: 'system',
                // steal the context (questionnaire) from the current section
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

    async function createAnswers(questionnaireId, sectionId, answers) {
        // TODO: throw if more than one request to create same answers

        // Make a copy of the supplied answers. These will be returned if they fail validation
        const rawAnswers = JSON.parse(JSON.stringify(answers));
        let answerResource;

        try {
            // 1 - load the questionnaire
            const result = await getQuestionnaire(questionnaireId);

            // 2 - get questionnaire instance
            const {questionnaire} = result.rows[0];

            // 3 - is the section allowed to be posted to e.g. is it in their progress
            const qRouter = createQRouter(questionnaire);
            const section = getSection(sectionId, qRouter);

            // 4 - Section is available. Validate the answers against it
            const sectionSchema = questionnaire.sections[section.id];
            const validate = ajv.compile(sectionSchema);
            const valid = validate(answers);

            if (!valid) {
                // TODO: Refactor errorhandler to accept a logger and move this in to it
                logger.error({err: validate.errors}, 'SCHEMA VALIDATION FAILED');

                const validationError = new VError({
                    name: 'JSONSchemaValidationError',
                    info: {
                        schema: sectionSchema,
                        answers: rawAnswers,
                        schemaErrors: validate.errors
                    }
                });

                throw validationError;
            }

            // 5 - If we're here all is good
            // Pass the answers to the router which will update the context (questionnaire) with these answers.
            let answeredQuestionnaire;

            // TODO: need to bodge this for "system" id (see getSection for more bodging). Bypass the router again.
            if (section.id === 'system') {
                const currentSection = qRouter.current();
                currentSection.context.answers.system = answers;
                answeredQuestionnaire = currentSection.context;
                // TODO: ^^ this is end of bodge
            } else {
                const nextSection = qRouter.next(answers, section.id);
                answeredQuestionnaire = nextSection.context;
            }

            // Store the updated questionnaire object
            await db.updateQuestionnaire(questionnaireId, answeredQuestionnaire);

            answerResource = {
                data: {
                    type: 'answers',
                    id: section.id,
                    attributes: answers
                }
            };
        } catch (err) {
            // re-throw for the moment
            // central error handler will collect it
            throw err;
        }

        return answerResource;
    }

    async function retrieveCaseReferenceNumber(questionnaireId) {
        const result = await getQuestionnaire(questionnaireId);
        const {questionnaire} = result.rows && result.rows[0];
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
        await updateQuestionnaireSubmissionStatus(questionnaireId, 'IN_PROGRESS');
        const messageBus = createMessageBusCaller({logger});
        const submissionResponse = await messageBus.post('submissionQueue', {
            applicationId: questionnaireId
        });
        if (
            !submissionResponse ||
            !submissionResponse.body ||
            submissionResponse.body !== 'Message sent'
        ) {
            await updateQuestionnaireSubmissionStatus(questionnaireId, 'FAILED');
            await db.createQuestionnaireSubmission(questionnaireId, 'FAILED');
        }
    }

    async function submitQuestionnaire(questionnaireId) {
        try {
            await db.createQuestionnaireSubmission(questionnaireId, 'COMPLETED');
        } catch (err) {
            throw err;
        }
    }

    async function getSubmissionResponseData(questionnaireId) {
        const submissionStatus = await getQuestionnaireSubmissionStatus(questionnaireId);

        let submitted = false;
        let status = 'NOT_STARTED';
        let caseReferenceNumber = null;

        // kick things off.
        if (submissionStatus === 'NOT_STARTED') {
            await updateQuestionnaireSubmissionStatus(questionnaireId, 'IN_PROGRESS');
            await startSubmission(questionnaireId);
        }

        // if the case reference number is in the database it means that the questionnaire
        // has been submitted.
        caseReferenceNumber = await retrieveCaseReferenceNumber(questionnaireId);

        // if (caseReferenceNumber !== null) {
        //     submitted = true;
        // }
        // if the caseReferenceNumber exists, then the submission is COMPLETE.
        if (caseReferenceNumber) {
            await updateQuestionnaireSubmissionStatus(questionnaireId, 'COMPLETED');
            await submitQuestionnaire(questionnaireId);
        }

        submitted = !!caseReferenceNumber;
        status = await getQuestionnaireSubmissionStatus(questionnaireId);

        const response = {
            data: {
                type: 'submissions',
                attributes: {
                    questionnaireId,
                    submitted,
                    status,
                    caseReferenceNumber
                }
            },
            meta: {
                onComplete: {
                    tasks: [
                        {
                            emailTemplateId: '1ddf1d87-09b3-4a2b-aa27-d73823f4a886',
                            emailTemplatePlaceholderMap: {
                                applicantName:
                                    '/answers/p-applicant-enter-your-name/q-applicant-name-firstname',
                                applicantEmail:
                                    '/answers/p-applicant-enter-your-email-address/q-applicant-email-address',
                                caseReference: '/answers/system/case-reference'
                            }
                        }
                    ]
                }
            }
        };

        return response;
    }

    async function validateAllAnswers(questionnaireId) {
        const result = await getQuestionnaire(questionnaireId);
        const {questionnaire} = result.rows[0];

        // get the section names from the answers array.
        // these are the only sections that we need to validate
        // against because these are the only sections that have
        // answers against them.
        const sectionsToValidate = Object.keys(questionnaire.answers);
        const validationErrors = [];
        sectionsToValidate.forEach(sectionId => {
            const sectionSchema = questionnaire.sections[sectionId];
            const answers = questionnaire.answers[sectionId];
            const validate = ajv.compile(sectionSchema);
            const valid = validate(answers);
            if (!valid) {
                validationErrors.push(validate.errors);
            }
        });

        if (validationErrors.length) {
            logger.error({err: validationErrors}, 'SCHEMA VALIDATION FAILED');

            const validationError = new VError({
                name: 'JSONSchemaValidationErrors',
                info: {
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

    return Object.freeze({
        createQuestionnaire,
        createAnswers,
        getQuestionnaireSubmissionStatus,
        getSubmissionResponseData,
        validateAllAnswers
    });
}

module.exports = createQuestionnaireService;
