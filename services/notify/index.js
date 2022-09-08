'use strict';

const notificationNodeClient = require('notifications-node-client');
const createMessageBusCaller = require('../message-bus');

const {NotifyClient} = notificationNodeClient;
const apiKey = process.env.NOTIFY_API_KEY;
const sharedNotifyClient = new NotifyClient(apiKey);

function createNotifyService(spec) {
    const {logger, notifyClient = sharedNotifyClient} = spec;

    // https://github.com/axios/axios/issues/4080
    function normaliseSmsSendRequestError(error) {
        const isApiResponseError = error.response !== undefined;

        if (isApiResponseError) {
            return error.response.data.errors;
        }

        const requestError = [
            {
                error: error.code,
                message: error.message
            }
        ];

        return requestError;
    }

    async function sendSms(options) {
        try {
            const smsSendRequest = await notifyClient.sendSms(
                options.templateId,
                options.phoneNumber,
                {
                    personalisation: {
                        caseReference: options.personalisation.caseReference
                    },
                    reference: null
                }
            );

            // This DOES NOT indicate that the sms was successfully delivered,
            // only that the request to send the sms was successful. In future, the id
            // could be used to further query the status of the request.
            return {
                id: smsSendRequest.data.id
            };
        } catch (err) {
            const normalisedError = normaliseSmsSendRequestError(err);

            logger.error(normalisedError, 'SMS SEND FAILURE');
        }

        return undefined;
    }

    async function sendEmail(options) {
        try {
            const messageBus = createMessageBusCaller(spec);

            await messageBus.post('NotificationQueue', {
                templateId: options.templateId,
                emailAddress: options.emailAddress,
                personalisation: {
                    caseReference: options.personalisation.caseReference
                },
                reference: null
            });
        } catch (err) {
            logger.error({code: err.code}, 'EMAIL SEND FAILURE');
        }
    }

    return Object.freeze({
        sendSms,
        sendEmail
    });
}

module.exports = createNotifyService;
