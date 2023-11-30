'use strict';

const VError = require('verror');

const updateQuestionnaireSubmissionStatus = jest.fn();

jest.doMock('../questionnaire-dal.js', () =>
    jest.fn(() => ({
        getQuestionnaire: questionnaireId => {
            // unsubmittable due to progress not containing a summary section
            if (questionnaireId === '04bd2bd8-1025-4236-a7a2-e323a4040440') {
                return {
                    routes: {
                        summary: ['e', 'f', 'g']
                    },
                    progress: ['a', 'b', 'c']
                };
            }

            // submittable
            if (questionnaireId === '508ad99f-a968-495d-b03c-25368e2d99cd') {
                return {
                    routes: {
                        summary: ['e', 'f', 'g']
                    },
                    progress: ['a', 'b', 'f'],
                    onSubmit: {
                        id: 'task0',
                        type: 'sequential',
                        data: [
                            {
                                id: 'task1',
                                type: 'simplePassingTaskFactory'
                            },
                            {
                                id: 'task2',
                                type: 'simplePassingTaskFactory'
                            }
                        ]
                    }
                };
            }

            // submittable but unsuccessful due to failing task, default retires
            if (questionnaireId === '93a1d3ab-56a6-4554-8acf-cdeb088d511d') {
                return {
                    routes: {
                        summary: ['e', 'f', 'g']
                    },
                    progress: ['a', 'b', 'f'],
                    onSubmit: {
                        id: 'task0',
                        type: 'sequential',
                        data: [
                            {
                                id: 'task1',
                                type: 'simpleFailingTaskFactory'
                            },
                            {
                                id: 'task2',
                                type: 'simplePassingTaskFactory'
                            }
                        ]
                    }
                };
            }

            // submittable but unsuccessful due to failing task, 0 retries
            if (questionnaireId === '13a1d3ab-56a6-4554-8acf-cdeb088d511d') {
                return {
                    routes: {
                        summary: ['e', 'f', 'g']
                    },
                    progress: ['a', 'b', 'f'],
                    onSubmit: {
                        id: 'task0',
                        type: 'sequential',
                        retries: 0,
                        data: [
                            {
                                id: 'task1',
                                type: 'simpleFailingTaskFactory',
                                retries: 0
                            },
                            {
                                id: 'task2',
                                type: 'simplePassingTaskFactory',
                                retries: 0
                            }
                        ]
                    }
                };
            }

            throw new VError(
                {
                    name: 'ResourceNotFound'
                },
                `Questionnaire "${questionnaireId}" not found`
            );
        },
        updateQuestionnaireSubmissionStatus,
        getQuestionnaireSubmissionStatus: () => 'NOT_STARTED',
        getQuestionnaireIdsBySubmissionStatus: () => ['508ad99f-a968-495d-b03c-25368e2d99cd']
    }))
);

const createSubmissionsService = require('./submissions-service');

function logger() {
    return 'Logged from submissions test';
}

const mockLogger = {
    error: jest.fn()
};

describe('Submission service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should throw if the questionnaire does not exist', async () => {
        let error;
        try {
            const submissionService = createSubmissionsService({
                logger: mockLogger
            });
            const questionnaireId = '85dc5d74-fe27-4b24-a96f-40f3c6d30783';
            await submissionService.submit(questionnaireId);
        } catch (err) {
            error = err;
        }

        expect(error.message).toEqual(
            'Questionnaire "85dc5d74-fe27-4b24-a96f-40f3c6d30783" not found'
        );
    });

    it('should throw if the questionnaire is not in a submittable state', async () => {
        let error;
        try {
            const submissionService = createSubmissionsService({
                logger: mockLogger
            });
            const questionnaireId = '04bd2bd8-1025-4236-a7a2-e323a4040440';
            await submissionService.submit(questionnaireId);
        } catch (err) {
            error = err;
        }

        expect(error.message).toEqual(
            'Questionnaire with ID "04bd2bd8-1025-4236-a7a2-e323a4040440" is not in a submittable state'
        );
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error.mock.calls[0][0]).toEqual(
            'Submission error for questionnaireId 04bd2bd8-1025-4236-a7a2-e323a4040440, error Questionnaire with ID "04bd2bd8-1025-4236-a7a2-e323a4040440" is not in a submittable state'
        );
    });

    describe('Successful submission', () => {
        it('should return a submissions resource', async () => {
            const questionnaireId = '508ad99f-a968-495d-b03c-25368e2d99cd';
            const submissionService = createSubmissionsService({
                logger,
                taskImplementations: {
                    simplePassingTaskFactory: async () => 'foo'
                }
            });
            const submissionResource = await submissionService.submit(questionnaireId);

            expect(submissionResource).toEqual({
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
            });
        });

        it(`should update the questionnaire's submission status to "IN_PROGRESS then "COMPLETED"`, async () => {
            const questionnaireId = '508ad99f-a968-495d-b03c-25368e2d99cd';
            const submissionService = createSubmissionsService({
                logger,
                taskImplementations: {
                    simplePassingTaskFactory: async () => 'foo'
                }
            });
            await submissionService.submit(questionnaireId);

            expect(updateQuestionnaireSubmissionStatus.mock.calls[0][0]).toEqual(questionnaireId);
            expect(updateQuestionnaireSubmissionStatus.mock.calls[0][1]).toEqual('IN_PROGRESS');
            expect(updateQuestionnaireSubmissionStatus.mock.calls[1][0]).toEqual(questionnaireId);
            expect(updateQuestionnaireSubmissionStatus.mock.calls[1][1]).toEqual('COMPLETED');
        });
    });

    describe('Unsuccessful submission', () => {
        describe('Default retries', () => {
            it('should log task errors and return a submissions resource ', async () => {
                const questionnaireId = '93a1d3ab-56a6-4554-8acf-cdeb088d511d';
                let error;

                try {
                    const submissionService = createSubmissionsService({
                        logger: mockLogger,
                        taskImplementations: {
                            simplePassingTaskFactory: async () => 'foo',
                            simpleFailingTaskFactory: async () => {
                                throw Error('bar');
                            }
                        }
                    });
                    await submissionService.submit(questionnaireId);
                } catch (err) {
                    error = err;
                }

                expect(mockLogger.error).toHaveBeenCalledTimes(5);
                expect(mockLogger.error.mock.calls[0][0].message).toEqual('bar');
                expect(mockLogger.error.mock.calls[1][0].message).toEqual('bar');
                expect(mockLogger.error.mock.calls[2][0].message).toEqual('bar');
                expect(mockLogger.error.mock.calls[3][0][0].id).toEqual('task1');
                expect(mockLogger.error.mock.calls[3][0][0].type).toEqual(
                    'simpleFailingTaskFactory'
                );
                expect(mockLogger.error.mock.calls[3][0][0].result.message).toEqual('bar');
                expect(mockLogger.error.mock.calls[4][0]).toEqual(
                    'Submission error for questionnaireId 93a1d3ab-56a6-4554-8acf-cdeb088d511d, failed tasks simpleFailingTaskFactory, errors bar'
                );
                expect(error).toEqual({
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
                });
            });

            it(`should update the questionnaire's submission status to "IN_PROGRESS then "FAILED"`, async () => {
                const questionnaireId = '93a1d3ab-56a6-4554-8acf-cdeb088d511d';

                try {
                    const submissionService = createSubmissionsService({
                        logger: mockLogger,
                        taskImplementations: {
                            simplePassingTaskFactory: async () => 'foo'
                        }
                    });
                    await submissionService.submit(questionnaireId);
                } catch (err) {
                    // no catch require for test
                }

                expect(updateQuestionnaireSubmissionStatus.mock.calls[0][0]).toEqual(
                    questionnaireId
                );
                expect(updateQuestionnaireSubmissionStatus.mock.calls[0][1]).toEqual('IN_PROGRESS');
                expect(updateQuestionnaireSubmissionStatus.mock.calls[1][0]).toEqual(
                    questionnaireId
                );
                expect(updateQuestionnaireSubmissionStatus.mock.calls[1][1]).toEqual('FAILED');
            });
        });

        it('should resubmit applications which have failed to submit', async () => {
            const submissionService = createSubmissionsService({
                logger,
                taskImplementations: {
                    simplePassingTaskFactory: async () => 'foo'
                }
            });
            const actual = await submissionService.postFailedSubmissions();
            expect(actual).toEqual([
                {id: '508ad99f-a968-495d-b03c-25368e2d99cd', resubmitted: true}
            ]);
        });
    });
    describe('Zero retries', () => {
        it('should log task errors and return a submissions resource ', async () => {
            const questionnaireId = '13a1d3ab-56a6-4554-8acf-cdeb088d511d';
            let error;

            try {
                const submissionService = createSubmissionsService({
                    logger: mockLogger,
                    taskImplementations: {
                        simplePassingTaskFactory: async () => 'foo',
                        simpleFailingTaskFactory: async () => {
                            throw Error('bar');
                        }
                    }
                });
                await submissionService.submit(questionnaireId);
            } catch (err) {
                error = err;
            }

            expect(mockLogger.error).toHaveBeenCalledTimes(3);
            expect(mockLogger.error.mock.calls[0][0].message).toEqual('bar');
            expect(mockLogger.error.mock.calls[1][0][0].id).toEqual('task1');
            expect(mockLogger.error.mock.calls[1][0][0].type).toEqual('simpleFailingTaskFactory');
            expect(mockLogger.error.mock.calls[1][0][0].result.message).toEqual('bar');
            expect(mockLogger.error.mock.calls[2][0]).toEqual(
                'Submission error for questionnaireId 13a1d3ab-56a6-4554-8acf-cdeb088d511d, failed tasks simpleFailingTaskFactory, errors bar'
            );
            expect(error).toEqual({
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
            });
        });
    });
});
