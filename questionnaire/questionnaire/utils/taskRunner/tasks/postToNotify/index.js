'use strict';

const createSqsService = require('../../../../../../services/sqs/index');
const createQuestionnaireHelper = require('../../../../questionnaire');

async function sendNotifyMessageToSQS({questionnaire, logger}) {
    const questionnaireId = questionnaire.id;
    logger.info(`Sending notify message to SQS for questionnaire with id ${questionnaireId}`);
    const sqsService = createSqsService({logger});
    const questionnaireDef = createQuestionnaireHelper({questionnaireDefinition: questionnaire});
    const permittedActions = questionnaireDef.getPermittedActions();
    let sqsResponse = {MessageId: 'MessageId'};

    await Promise.all(
        permittedActions.map(async action => {
            if (action) {
                if (action.type === 'sendEmail') {
                    const payload = {
                        templateId: action.data.templateId,
                        emailAddress: action.data.emailAddress,
                        personalisation: {
                            caseReference: action.data.personalisation?.caseReference,
                            content: action.data.personalisation?.content
                        },
                        reference: null
                    };
                    sqsResponse = await sqsService.send(payload, process.env.NOTIFY_AWS_SQS_ID);
                    logger.info(
                        `Email sent to Notify SQS for questionnaire with id ${questionnaireId}`
                    );
                }

                if (action.type === 'sendSms') {
                    const payload = {
                        templateId: action.data.templateId,
                        phoneNumber: action.data.phoneNumber,
                        personalisation: {
                            caseReference: action.data.personalisation?.caseReference,
                            content: action.data.personalisation?.content
                        },
                        reference: null
                    };
                    sqsResponse = await sqsService.send(payload, process.env.NOTIFY_AWS_SQS_ID);
                    logger.info(
                        `SMS sent to Notify SQS for questionnaire with id ${questionnaireId}`
                    );
                }
            }
        })
    );
    return sqsResponse;
}

module.exports = sendNotifyMessageToSQS;
