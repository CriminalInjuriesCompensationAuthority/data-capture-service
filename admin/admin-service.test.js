'use strict';

const VError = require('verror');

const questionnaireCompleteWithoutCRN = require('./fixtures/questionnaireCompleteWithoutCRN.json');

describe('Admin service', () => {
    afterEach(() => {
        jest.resetModules();
    });

    it('should re-submit failed submissions', async () => {
        jest.doMock('./admin-dal.js', () =>
            jest.fn(() => ({
                getQuestionnaireIdsBySubmissionStatus: submissionStatus => {
                    if (submissionStatus === 'FAILED') {
                        return [
                            {
                                id: '67d8e5d2-44a5-4ab7-91c0-3fd27d009235'
                            }
                        ];
                    }
                    return [];
                }
            }))
        );
        const submissionStatusResponse = jest
            .fn()
            .mockReturnValueOnce('FAILED')
            .mockReturnValue('IN_PROGRESS');

        jest.doMock('../questionnaire/questionnaire-dal.js', () =>
            jest.fn(() => ({
                getQuestionnaire: questionnaireId => {
                    if (questionnaireId === '67d8e5d2-44a5-4ab7-91c0-3fd27d009235') {
                        return questionnaireCompleteWithoutCRN;
                    }

                    throw new VError(
                        {
                            name: 'ResourceNotFound'
                        },
                        `Questionnaire "${questionnaireId}" not found`
                    );
                },
                updateQuestionnaire: () => undefined,
                getQuestionnaireSubmissionStatus: () => submissionStatusResponse(),
                updateQuestionnaireSubmissionStatus: () => undefined
            }))
        );

        // eslint-disable-next-line global-require
        const createAdminService = require('./admin-service');

        const adminService = createAdminService();
        const response = await adminService.resubmitFailedQuestionnaires();
        expect(response).toEqual([
            {
                data: {
                    id: '67d8e5d2-44a5-4ab7-91c0-3fd27d009235',
                    type: 'submissions',
                    attributes: {
                        caseReferenceNumber: null,
                        questionnaireId: '67d8e5d2-44a5-4ab7-91c0-3fd27d009235',
                        status: 'IN_PROGRESS',
                        submitted: false
                    }
                }
            }
        ]);
    });

    it('should return an empty array if there is nothing to re-submit', async () => {
        jest.doMock('./admin-dal.js', () =>
            jest.fn(() => ({
                getQuestionnaireIdsBySubmissionStatus: () => {
                    return [];
                }
            }))
        );
        jest.doMock('../questionnaire/questionnaire-dal.js', () =>
            jest.fn(() => ({
                getQuestionnaire: questionnaireId => {
                    if (questionnaireId === '67d8e5d2-44a5-4ab7-91c0-3fd27d009235') {
                        return questionnaireCompleteWithoutCRN;
                    }

                    throw new VError(
                        {
                            name: 'ResourceNotFound'
                        },
                        `Questionnaire "${questionnaireId}" not found`
                    );
                },
                updateQuestionnaire: () => undefined,
                getQuestionnaireSubmissionStatus: () => 'COMPLETED',
                updateQuestionnaireSubmissionStatus: () => undefined
            }))
        );

        // eslint-disable-next-line global-require
        const createAdminService = require('./admin-service');

        const adminService = createAdminService();
        const response = await adminService.resubmitFailedQuestionnaires();
        expect(response).toEqual([]);
    });
});
