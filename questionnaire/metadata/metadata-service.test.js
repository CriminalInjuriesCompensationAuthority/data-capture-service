/* eslint-disable no-shadow */

'use strict';

const validQuestionnaireId = '12345678-7dec-11d0-a765-00a0c91e6bf6';
const validQuestionnaireId2 = '87654321-7dec-11d0-a765-00a0c91e6bf6';
const ownerId = 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6';
const apiVersion = '2023-05-17';
const metadataCollection = [
    {
        id: validQuestionnaireId,
        created: '2023-06-08 00:00:00.000000+00',
        modified: '2023-06-08 00:00:00.000000+00',
        expires: '2023-06-08 00:30:00.000000+00',
        submission_status: 'NOT_STARTED',
        analytics_id: 'urn:uuid:f81d4fae-7dec-11d0-a765-123456789123'
    },
    {
        id: validQuestionnaireId2,
        created: '2023-06-08 00:00:00.000000+00',
        modified: '2023-06-08 00:00:00.000000+00',
        expires: '2023-06-08 00:30:00.000000+00',
        submission_status: 'NOT_STARTED',
        analytics_id: 'urn:uuid:f81d4fae-7dec-11d0-a765-123456789321'
    }
];
const metadataByOwnerCollection = [
    {
        id: validQuestionnaireId,
        created: '2023-06-08 00:00:00.000000+00',
        modified: '2023-06-08 00:00:00.000000+00',
        expires: '2023-06-08 00:30:00.000000+00',
        submission_status: 'NOT_STARTED',
        analytics_id: 'urn:uuid:f81d4fae-7dec-11d0-a765-123456789123'
    }
];

beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
});

// Mock the default DAL
jest.doMock('../questionnaire-dal', () => {
    const dalServiceMock = {
        getMetadataByOwner: jest.fn(() => {
            return metadataCollection;
        }),
        getQuestionnaireMetadataByOwner: jest.fn(() => {
            return metadataByOwnerCollection;
        })
    };

    return () => dalServiceMock;
});

const createMetadataService = require('./metadata-service');

describe('Metadata Service', () => {
    describe('DCS API Version 2023-05-17', () => {
        const metadataService = createMetadataService({
            logger: () => 'Logged from createQuestionnaire test',
            apiVersion,
            ownerId
        });
        describe('getMetadata', () => {
            it('Should get metadata filtered by owner', async () => {
                const expected = [
                    {
                        type: 'metadata',
                        id: validQuestionnaireId,
                        attributes: {
                            'questionnaire-id': validQuestionnaireId,
                            created: '2023-06-08 00:00:00.000000+00',
                            modified: '2023-06-08 00:00:00.000000+00',
                            expires: '2023-06-08 00:30:00.000000+00',
                            'submission-status': 'NOT_STARTED',
                            'analytics-id': 'urn:uuid:f81d4fae-7dec-11d0-a765-123456789123'
                        }
                    },
                    {
                        type: 'metadata',
                        id: validQuestionnaireId2,
                        attributes: {
                            'questionnaire-id': validQuestionnaireId2,
                            created: '2023-06-08 00:00:00.000000+00',
                            modified: '2023-06-08 00:00:00.000000+00',
                            expires: '2023-06-08 00:30:00.000000+00',
                            'submission-status': 'NOT_STARTED',
                            'analytics-id': 'urn:uuid:f81d4fae-7dec-11d0-a765-123456789321'
                        }
                    }
                ];

                const actual = await metadataService.getMetadata();

                expect(Array.isArray(actual.data)).toBe(true);
                expect(actual.data).toMatchObject(expected);
            });

            it('Should error if the apiVersion is not "2023-05-17"', async () => {
                const metadataService = createMetadataService({
                    logger: () => 'Logged from createQuestionnaire test',
                    apiVersion: '2029-12-25',
                    ownerId
                });

                await expect(metadataService.getMetadata()).rejects.toThrow(
                    `getMetadata cannot be used with ownerId "${ownerId}" and apiVersion "2029-12-25"`
                );
            });

            it('Should error if the apiVersion is not defined', async () => {
                const metadataService = createMetadataService({
                    logger: () => 'Logged from createQuestionnaire test',
                    apiVersion: undefined,
                    ownerId
                });

                await expect(metadataService.getMetadata()).rejects.toThrow(
                    `getMetadata cannot be used with ownerId "${ownerId}" and apiVersion "undefined"`
                );
            });

            it('Should error if the ownerId is not defined', async () => {
                const metadataService = createMetadataService({
                    logger: () => 'Logged from createQuestionnaire test',
                    apiVersion,
                    ownerId: undefined
                });

                await expect(metadataService.getMetadata()).rejects.toThrow(
                    `getMetadata cannot be used with ownerId "undefined" and apiVersion "${apiVersion}"`
                );
            });
        });
        describe('getMetadataByQuestionnaire', () => {
            it('Should get metadata filtered by questionnaireId and owner', async () => {
                const expected = [
                    {
                        type: 'metadata',
                        id: validQuestionnaireId,
                        attributes: {
                            'questionnaire-id': validQuestionnaireId,
                            created: '2023-06-08 00:00:00.000000+00',
                            modified: '2023-06-08 00:00:00.000000+00',
                            expires: '2023-06-08 00:30:00.000000+00',
                            'submission-status': 'NOT_STARTED',
                            'analytics-id': 'urn:uuid:f81d4fae-7dec-11d0-a765-123456789123'
                        }
                    }
                ];

                const actual = await metadataService.getMetadataByQuestionnaire(
                    validQuestionnaireId
                );

                expect(Array.isArray(actual.data)).toBe(true);
                expect(actual.data).toMatchObject(expected);
            });

            it('Should error if the apiVersion is not "2023-05-17"', async () => {
                const metadataService = createMetadataService({
                    logger: () => 'Logged from createQuestionnaire test',
                    apiVersion: undefined,
                    ownerId
                });

                await expect(
                    metadataService.getMetadataByQuestionnaire(validQuestionnaireId)
                ).rejects.toThrow(
                    `getMetadataByQuestionnaire cannot be used with ownerId "${ownerId}" and apiVersion "undefined"`
                );
            });

            it('Should error if the ownerId is not defined', async () => {
                const metadataService = createMetadataService({
                    logger: () => 'Logged from createQuestionnaire test',
                    apiVersion,
                    ownerId: undefined
                });

                await expect(
                    metadataService.getMetadataByQuestionnaire(validQuestionnaireId)
                ).rejects.toThrow(
                    `getMetadataByQuestionnaire cannot be used with ownerId "undefined" and apiVersion "${apiVersion}"`
                );
            });
        });
    });
});
