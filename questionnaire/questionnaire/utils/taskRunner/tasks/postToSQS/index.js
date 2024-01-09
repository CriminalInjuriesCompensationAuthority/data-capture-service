'use strict';

const createSqsService = require('../../../../../../services/sqs');

/**
 * Builds the body of the SQS message
 * @param {questionnaireId} questionnaireId - The id of the questionnaire
 * @returns The body of the SQS message
 */
function buildMessageBody(questionnaireId) {
    const s3Directory = process.env.S3_DIRECTORY ? process.env.S3_DIRECTORY : 'application_json';
    return {applicationJSONDocumentSummaryKey: `${s3Directory}/${questionnaireId}.json`};
}

/**
 * Sends message to sqs with reference to the application json file in s3
 * @param {questionnaire} questionnaire - The raw questionnaire object
 * @returns result from the sqs service.
 */
async function sendSubmissionMessageToSQS({questionnaire, logger}) {
    const questionnaireId = questionnaire.id;

    const body = buildMessageBody(questionnaireId);
    logger.info(`Sending submission message to SQS for questionnaire with id ${questionnaireId}`);
    const sqsService = createSqsService({logger});

    return sqsService.send(body, process.env.AWS_SQS_ID);
}

module.exports = {
    buildMessageBody,
    sendSubmissionMessageToSQS
};
