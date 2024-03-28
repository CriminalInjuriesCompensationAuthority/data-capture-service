'use strict';

const DB_QUERY_ERROR_QUESTIONNAIRE_ID = 'acbfcd8e-1299-478a-a9f1-7005f4b713ed';
const DB_QUERY_ERROR_SUBMISSION_STATUS_ID = 'FAIL_TEST';
const DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID = 'c9723b81-c50d-4050-805f-108995067913';
const DB_QUERY_ROW_COUNT_ZERO_SUBMISSION_STATUS = 'ZERO_ROWS_SUBMISSION_STATUS';
const DB_QUERY_SUCCESS_QUESTIONNAIRE_ID = '12345678-c50d-4050-805f-108995067913';
const ownerId = 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6';
const dbQueryErrorOwnerId = 'urn:uuid:11111111-7dec-11d0-a765-00a0c91e6bf6';
const isFatalError = '23232';
const isFatalNoRows = '34455';
const validSubmissionStatus = 'IN_PROGRESS';

beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
});

jest.doMock('../db/index.js', () => {
    const dbServiceMock = {
        query: jest.fn((query, parameters) => {
            if (parameters.includes(DB_QUERY_ERROR_QUESTIONNAIRE_ID)) {
                throw new Error('DB_QUERY_ERROR');
            }

            if (parameters.includes(DB_QUERY_ERROR_SUBMISSION_STATUS_ID)) {
                throw new Error('DB_QUERY_ERROR');
            }

            if (parameters.includes(dbQueryErrorOwnerId)) {
                throw new Error('DB_QUERY_ERROR');
            }

            if (parameters.includes(DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID)) {
                return {
                    rows: [],
                    rowCount: 0
                };
            }
            if (parameters.includes(isFatalError)) {
                throw new Error('DB_QUERY_ERROR');
            }
            if (parameters.includes(isFatalNoRows)) {
                return {
                    rows: [],
                    rowCount: 0
                };
            }

            return {
                rows: [{status: 'ok'}],
                rowCount: 1
            };
        })
    };

    return () => dbServiceMock;
});

const mockedDbService = require('../db/index.js')({
    logger: () => 'Logged from DAL test'
});

const createQuestionnaireDAL = require('./questionnaire-dal');

describe('questionnaire data access layer', () => {
    describe('createQuestionnaire', () => {
        it('Should throw when a db connnectivity issue is encountered', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.createQuestionnaire(DB_QUERY_ERROR_QUESTIONNAIRE_ID, {})
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('updateQuestionnaire', () => {
        it('Should not successfully update the db', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.updateQuestionnaire(DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID, {})
            ).rejects.toThrow(
                `Questionnaire "${DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID}" was not updated successfully`
            );
        });

        it('Should throw when a db connnectivity issue is encountered', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.updateQuestionnaire(DB_QUERY_ERROR_QUESTIONNAIRE_ID, {})
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('getQuestionnaire', () => {
        it('Should not successfully select from the db', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.getQuestionnaire(DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID, {})
            ).rejects.toThrow(
                `Questionnaire "${DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID}" not found`
            );
        });

        it('Should throw when a db connnectivity issue is encountered', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.getQuestionnaire(DB_QUERY_ERROR_QUESTIONNAIRE_ID)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('getQuestionnaireSubmissionStatus', () => {
        it('Should not successfully select from the db', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.getQuestionnaireSubmissionStatus(
                    DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID,
                    {}
                )
            ).rejects.toThrow(
                `Questionnaire "${DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID}" not found`
            );
        });

        it('Should throw when a db connnectivity issue is encountered', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.getQuestionnaireSubmissionStatus(DB_QUERY_ERROR_QUESTIONNAIRE_ID)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('updateQuestionnaireSubmissionStatus', () => {
        it('Should not successfully update the db', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.updateQuestionnaireSubmissionStatus(
                    DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID,
                    'COMPLETED'
                )
            ).rejects.toThrow(
                `Questionnaire "${DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID}" submission status not successfully updated to "COMPLETED"`
            );
        });

        it('Should throw when a db connnectivity issue is encountered', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.updateQuestionnaireSubmissionStatus(
                    DB_QUERY_ERROR_QUESTIONNAIRE_ID,
                    'COMPLETED'
                )
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('getQuestionnaireIdsBySubmissionStatus', () => {
        it('Should not successfully select from the db', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            const response = await questionnaireDAL.getQuestionnaireIdsBySubmissionStatus(
                DB_QUERY_ROW_COUNT_ZERO_SUBMISSION_STATUS
            );
            await expect(response).toEqual([]);
        });

        it('Should throw when a db connnectivity issue is encountered', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.getQuestionnaireIdsBySubmissionStatus(
                    DB_QUERY_ERROR_SUBMISSION_STATUS_ID
                )
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('getQuestionnaireModifiedDate', () => {
        it('Should not successfully select from the db', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.getQuestionnaireModifiedDate(
                    DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID
                )
            ).rejects.toThrow(
                `Questionnaire "${DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID}" not found`
            );
        });

        it('Should throw when a db connnectivity issue is encountered', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.getQuestionnaireModifiedDate(DB_QUERY_ERROR_QUESTIONNAIRE_ID)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('updateQuestionnaireModifiedDate', () => {
        it('Should not successfully update the db', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.updateQuestionnaireModifiedDate(
                    DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID
                )
            ).rejects.toThrow(
                `Questionnaire "${DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID}" modified date was not updated successfully`
            );
        });

        it('Should throw when a db connnectivity issue is encountered', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn()});
            await expect(
                questionnaireDAL.updateQuestionnaireModifiedDate(DB_QUERY_ERROR_QUESTIONNAIRE_ID)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('updateQuestionnaireByOwner', () => {
        const query =
            "UPDATE questionnaire SET questionnaire = $1, modified = current_timestamp, expires = (CASE WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'true' THEN expires WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'false' THEN current_timestamp + INTERVAL '30 minutes' END) WHERE id = $2  AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $3";
        it('Should run an update questionnaire query and filter by owner', async () => {
            const questionnaire = {answers: {}};
            const questionnaireId = DB_QUERY_SUCCESS_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.updateQuestionnaireByOwner(questionnaire, questionnaireId);

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [
                questionnaireId,
                questionnaire,
                ownerId
            ]);
        });

        it('Should error gracefully if no rows are updated', async () => {
            const questionnaire = {answers: {}};
            const questionnaireId = DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await expect(
                questionnaireDAL.updateQuestionnaireByOwner(questionnaireId, questionnaire)
            ).rejects.toThrow(
                'Questionnaire "c9723b81-c50d-4050-805f-108995067913" was not updated successfully'
            );
        });

        it('Should handle errors gracefully', async () => {
            const questionnaire = {answers: {}};
            const questionnaireId = DB_QUERY_ERROR_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});

            await expect(
                questionnaireDAL.updateQuestionnaireByOwner(questionnaire, questionnaireId)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('getQuestionnaireByOwner', () => {
        const query =
            "SELECT questionnaire FROM questionnaire WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2";
        it('Should run a get questionnaire query', async () => {
            const questionnaireId = DB_QUERY_SUCCESS_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.getQuestionnaireByOwner(questionnaireId);

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [questionnaireId, ownerId]);
        });

        it('Should handle errors gracefully', async () => {
            const questionnaireId = DB_QUERY_ERROR_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});

            await expect(questionnaireDAL.getQuestionnaireByOwner(questionnaireId)).rejects.toThrow(
                'DB_QUERY_ERROR'
            );
        });
    });

    describe('getReferenceNumber', () => {
        const isFatal = true;
        const query = 'SELECT public.get_reference($1) as referencenumber';
        it('Should run a get reference number function', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.getReferenceNumber(isFatal, DB_QUERY_SUCCESS_QUESTIONNAIRE_ID);

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [isFatal]);
        });

        it('Should handle errors gracefully', async () => {
            const questionnaireDAL = createQuestionnaireDAL({
                logger: jest.fn(),
                ownerId: dbQueryErrorOwnerId
            });

            await expect(
                questionnaireDAL.getReferenceNumber(isFatalError, DB_QUERY_ERROR_QUESTIONNAIRE_ID)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });

        it('Should handle zero rows returned', async () => {
            const questionnaireDAL = createQuestionnaireDAL({
                logger: jest.fn(),
                ownerId: dbQueryErrorOwnerId
            });

            await expect(
                questionnaireDAL.getReferenceNumber(isFatalNoRows, DB_QUERY_ERROR_QUESTIONNAIRE_ID)
            ).rejects.toThrow(
                `Reference number for "${DB_QUERY_ERROR_QUESTIONNAIRE_ID}" not created`
            );
        });
    });

    describe('getMetadataByOwner', () => {
        const query =
            "SELECT id, created, modified, expires, submission_status, questionnaire -> 'answers' -> 'system' ->> 'analytics-id' AS \"analytics_id\" FROM questionnaire WHERE questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $1";
        it('Should run a get metadata query and filter by owner', async () => {
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.getMetadataByOwner();

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [ownerId]);
        });

        it('Should handle errors gracefully', async () => {
            const questionnaireDAL = createQuestionnaireDAL({
                logger: jest.fn(),
                ownerId: dbQueryErrorOwnerId
            });

            await expect(questionnaireDAL.getMetadataByOwner()).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('getQuestionnaireMetadataByOwner', () => {
        const query =
            "SELECT id, created, modified, expires, submission_status, questionnaire -> 'answers' -> 'system' ->> 'analytics-id' AS \"analytics_id\" FROM questionnaire WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2";
        it('Should run a get metadata query and filter by questionnaireId and owner', async () => {
            const questionnaireId = DB_QUERY_SUCCESS_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.getQuestionnaireMetadataByOwner(questionnaireId);

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [questionnaireId, ownerId]);
        });

        it('Should handle errors gracefully', async () => {
            const questionnaireId = DB_QUERY_ERROR_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});

            await expect(
                questionnaireDAL.getQuestionnaireMetadataByOwner(questionnaireId)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('updateExpiryForAuthenticatedOwner', () => {
        const query =
            "UPDATE questionnaire SET expires = date_trunc('day', created) + INTERVAL '31 days' WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2";
        it('Should run an update expiry query and filter by questionnaireId and owner', async () => {
            const questionnaireId = DB_QUERY_SUCCESS_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.updateExpiryForAuthenticatedOwner(questionnaireId, ownerId);

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [questionnaireId, ownerId]);
        });

        it('Should error gracefully if no rows are updated', async () => {
            const questionnaireId = DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await expect(
                questionnaireDAL.updateExpiryForAuthenticatedOwner(questionnaireId)
            ).rejects.toThrow(
                'Questionnaire "c9723b81-c50d-4050-805f-108995067913" was not updated successfully'
            );
        });

        it('Should handle errors gracefully', async () => {
            const questionnaireId = DB_QUERY_ERROR_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});

            await expect(
                questionnaireDAL.updateExpiryForAuthenticatedOwner(questionnaireId)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('updateQuestionnaireModifiedDateByOwner', () => {
        const query =
            "UPDATE questionnaire SET modified = current_timestamp, expires = (CASE WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'true' THEN expires WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'false' THEN current_timestamp + INTERVAL '30 minutes' END) WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2";
        it('Should run an update expiry query and filter by questionnaireId and ownerId', async () => {
            const questionnaireId = DB_QUERY_SUCCESS_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.updateQuestionnaireModifiedDateByOwner(questionnaireId, ownerId);

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [questionnaireId, ownerId]);
        });

        it('Should error gracefully if no rows are updated', async () => {
            const questionnaireId = DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await expect(
                questionnaireDAL.updateQuestionnaireModifiedDateByOwner(questionnaireId)
            ).rejects.toThrow(
                'Questionnaire "c9723b81-c50d-4050-805f-108995067913" modified date was not updated successfully'
            );
        });

        it('Should handle errors gracefully', async () => {
            const questionnaireId = DB_QUERY_ERROR_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});

            await expect(
                questionnaireDAL.updateQuestionnaireModifiedDateByOwner(questionnaireId)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('getQuestionnaireSubmissionStatusByOwner', () => {
        const query =
            "SELECT submission_status FROM questionnaire WHERE id = $1 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $2";
        it('Should run a get submission status query and filter by questionnaireId and ownerId', async () => {
            const questionnaireId = DB_QUERY_SUCCESS_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.getQuestionnaireSubmissionStatusByOwner(questionnaireId);

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [questionnaireId, ownerId]);
        });

        it('Should error gracefully if no rows are updated', async () => {
            const questionnaireId = DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await expect(
                questionnaireDAL.getQuestionnaireSubmissionStatusByOwner(questionnaireId)
            ).rejects.toThrow('Questionnaire "c9723b81-c50d-4050-805f-108995067913" not found');
        });

        it('Should handle errors gracefully', async () => {
            const questionnaireId = DB_QUERY_ERROR_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});

            await expect(
                questionnaireDAL.getQuestionnaireSubmissionStatusByOwner(questionnaireId)
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });

    describe('updateQuestionnaireSubmissionStatusByOwner', () => {
        const query =
            "UPDATE questionnaire SET submission_status = $1, modified = current_timestamp, expires = (CASE WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'true' THEN expires WHEN questionnaire -> 'answers' -> 'owner' ->> 'is-authenticated' = 'false' THEN current_timestamp + INTERVAL '30 minutes' END) WHERE id = $2 AND questionnaire -> 'answers' -> 'owner' ->> 'owner-id' = $3";
        it('Should run an update submission status query and filter by questionnaireId and ownerId', async () => {
            const questionnaireId = DB_QUERY_SUCCESS_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await questionnaireDAL.updateQuestionnaireSubmissionStatusByOwner(
                questionnaireId,
                validSubmissionStatus
            );

            expect(mockedDbService.query).toHaveBeenCalledTimes(1);
            expect(mockedDbService.query).toHaveBeenCalledWith(query, [
                validSubmissionStatus,
                questionnaireId,
                ownerId
            ]);
        });

        it('Should error gracefully if no rows are updated', async () => {
            const questionnaireId = DB_QUERY_ROW_COUNT_ZERO_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});
            await expect(
                questionnaireDAL.updateQuestionnaireSubmissionStatusByOwner(
                    questionnaireId,
                    validSubmissionStatus
                )
            ).rejects.toThrow(
                `Questionnaire "c9723b81-c50d-4050-805f-108995067913" submission status not successfully updated to "IN_PROGRESS"`
            );
        });

        it('Should handle errors gracefully', async () => {
            const questionnaireId = DB_QUERY_ERROR_QUESTIONNAIRE_ID;
            const questionnaireDAL = createQuestionnaireDAL({logger: jest.fn(), ownerId});

            await expect(
                questionnaireDAL.updateQuestionnaireSubmissionStatusByOwner(
                    questionnaireId,
                    validSubmissionStatus
                )
            ).rejects.toThrow('DB_QUERY_ERROR');
        });
    });
});
