'use strict';

const VError = require('verror');
const {buildMessageBody, sendSubmissionMessageToSQS} = require('.');
const questionnaireFixture = require('../test-fixtures/questionnaireCompleteForCheckYourAnswers');
const mockSqsService = require('../../../../../../services/sqs');

const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
};

const mockSendSqsResponse = require('../../../../../test-fixtures/res/post_submissionQueue.json');

jest.mock('../../../../../../services/sqs');

describe('Post To SQS Task', () => {
    let sendMock;
    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
    });

    it('Should create the correct message body.', () => {
        const messageBody = buildMessageBody(questionnaireFixture.id);
        expect(messageBody).toEqual({
            applicationJSONDocumentSummaryKey: `test/${questionnaireFixture.id}.json`
        });
    });

    it('Should send message to SQS', async () => {
        mockSqsService.mockImplementation(() => ({
            send: () => mockSendSqsResponse
        }));
        const data = {
            questionnaire: questionnaireFixture,
            logger: mockLogger
        };
        const messageResult = await sendSubmissionMessageToSQS(data);

        expect(messageResult).toEqual({
            MessageId: '741d63a9-8883-4d3b-a6d1-5b93d4709854',
            body: 'Message sent'
        });
    });

    it('Should error if message fails to send', async () => {
        sendMock = mockSqsService.mockImplementation(() => ({
            send: () => {
                throw new Error('Failed to send message to SQS');
            }
        }));
        const data = {
            questionnaire: questionnaireFixture,
            logger: mockLogger
        };

        const expectedError = new VError(`Failed to send message to SQS`);

        await expect(sendSubmissionMessageToSQS(data)).rejects.toThrow(expectedError);
        expect(sendMock).toHaveBeenCalledTimes(1);
    });
});
