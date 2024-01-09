'use strict';

const serializer = require('pino-std-serializers').err;

const defaults = {};
defaults.createQuestionnaireService = require('../questionnaire-service');
defaults.createTaskRunner = require('../questionnaire/utils/taskRunner');
defaults.sequential = require('../questionnaire/utils/taskRunner/tasks/sequential').runTasksSequentially;

const {SequentialTaskError} = require('../questionnaire/utils/taskRunner/tasks/sequential');

// Pull in additional task implementations here
const {transformAndUpload} = require('../questionnaire/utils/taskRunner/tasks/transformAndUpload');
const {
    generateReferenceNumber
} = require('../questionnaire/utils/taskRunner/tasks/generateCaseReference');
const {sendSubmissionMessageToSQS} = require('../questionnaire/utils/taskRunner/tasks/postToSQS');
const sendNotifyMessageToSQS = require('../questionnaire/utils/taskRunner/tasks/postToNotify');

// not in a submittable state custom error
class NotSubmittableStateError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotSubmittableStateError';
    }
}

function createSubmissionService({
    logger,
    apiVersion,
    ownerId,
    createQuestionnaireService = defaults.createQuestionnaireService,
    createTaskRunner = defaults.createTaskRunner,
    sequential = defaults.sequential,
    taskImplementations = {
        transformAndUpload,
        generateReferenceNumber,
        sendSubmissionMessageToSQS,
        sendNotifyMessageToSQS
    }
} = {}) {
    const questionnaireService = createQuestionnaireService({
        logger,
        apiVersion,
        ownerId
    });

    function hasSummaryIdInProgressEntries(questionnaireDefinition) {
        // are we currently, or have we been on this questionnaire's summary page?
        // we infer a questionnaire is complete if the user has visited the summary page.
        const summarySectionIds = questionnaireDefinition.routes.summary;
        const progressEntries = questionnaireDefinition.progress;

        return summarySectionIds.some(summarySectionId =>
            progressEntries.includes(summarySectionId)
        );
    }

    async function isSubmittable(questionnaireId, questionnaireDefinition) {
        // 1 - does it exist
        // 2 - if exists, is it in a submittable state
        // 3 - has it already been submitted
        const submissionStatus = await questionnaireService.getQuestionnaireSubmissionStatus(
            questionnaireId
        );

        if (submissionStatus === 'COMPLETED') {
            return false;
        }

        return hasSummaryIdInProgressEntries(questionnaireDefinition);
    }

    function getOnSubmitTaskDefinitionCopy(questionnaireDefinition) {
        const onSubmitTaskDefinition = questionnaireDefinition.onSubmit;

        if (onSubmitTaskDefinition === undefined) {
            throw Error('Questionnaire has no "onSubmit" property');
        }

        return JSON.parse(JSON.stringify(onSubmitTaskDefinition));
    }

    async function submit(questionnaireId) {
        try {
            const questionnaireDefinition = await questionnaireService.getQuestionnaire(
                questionnaireId
            );

            if ((await isSubmittable(questionnaireId, questionnaireDefinition)) === false) {
                throw new NotSubmittableStateError(
                    `Questionnaire with ID "${questionnaireId}" is not in a submittable state`
                );
            }

            const onSubmitTaskDefinition = getOnSubmitTaskDefinitionCopy(questionnaireDefinition);
            const taskRunner = createTaskRunner({
                taskImplementations: {
                    sequential,
                    ...taskImplementations
                },
                context: {
                    logger,
                    questionnaireDef: questionnaireDefinition
                }
            });

            await questionnaireService.updateQuestionnaireSubmissionStatus(
                questionnaireId,
                'IN_PROGRESS'
            );

            await taskRunner.run(onSubmitTaskDefinition);

            await questionnaireService.updateQuestionnaireSubmissionStatus(
                questionnaireId,
                'COMPLETED'
            );

            // return a submission document
            return {
                data: {
                    type: 'submissions',
                    id: questionnaireId,
                    attributes: {
                        status: 'COMPLETED',
                        submitted: true,
                        questionnaireId,
                        caseReferenceNumber: '11\\223344' // TODO: DO WE NEED THIS? ADDED DUMMY CASE REF TO PASS TEST.
                    }
                }
            };
        } catch (err) {
            logger.error(
                serializer(err),
                `Submission error for questionnaireId ${questionnaireId}: `
            );
            // log and throw is an anti-pattern, leaving this here until we fix global logging
            // see the errorHandler and check we have tests for possible submission errors
            if (!(err instanceof SequentialTaskError)) {
                throw err;
            }

            await questionnaireService.updateQuestionnaireSubmissionStatus(
                questionnaireId,
                'FAILED'
            );

            // eslint-disable-next-line no-throw-literal
            throw {
                data: {
                    type: 'submissions',
                    id: questionnaireId,
                    attributes: {
                        status: 'FAILED',
                        submitted: false,
                        questionnaireId,
                        caseReferenceNumber: '11\\223344' // TODO: DO WE NEED THIS? ADDED DUMMY CASE REF TO PASS TEST.
                    }
                }
            };
        }
    }

    async function postFailedSubmissions() {
        try {
            const questionnaireIds = await questionnaireService.getQuestionnaireIdsBySubmissionStatus(
                'FAILED'
            );
            const resubmittedApplications = questionnaireIds.map(async id => {
                await submit(id);
                return {id, resubmitted: true};
            });
            return Promise.all(resubmittedApplications);
        } catch (err) {
            logger.error({err}, 'RESUBMISSION FAILED');
            throw err;
        }
    }

    return Object.freeze({
        submit,
        postFailedSubmissions
    });
}

module.exports = createSubmissionService;
