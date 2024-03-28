/* eslint-disable no-shadow */
/* eslint-disable global-require */

'use strict';

const mockAjv = require('ajv');
const questionnaireFixture = require('./test-fixtures/res/questionnaireCompleteWithCRN');
const incompatibleQuestionnaireFixture = require('./test-fixtures/res/questionnaireIncompatible');

const validSectionId = 'p-applicant-enter-your-name';
const invalidSectionId = 'p-not-a-section';
const validQuestionnaireId = '12345678-7dec-11d0-a765-00a0c91e6bf6';
const invalidQuestionnaireId = '11111111-7dec-11d0-a765-00a0c91e6bf6';
const incompatibleQuestionnaireId = '55555555-7dec-11d0-a765-00a0c91e6bf6';
const answers = {
    'q-some-section': true
};
const invalidAnswers = {
    'q-some-section': 'this-answer-will-not-validate-against-its-schema'
};
const ownerId = 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6';
const templatename = 'sexual-assault';
const ownerData = {
    id: ownerId,
    isAuthenticated: false
};
const analyticsData = {
    id: 'urn:uuid:f81d4fae-7dec-11d0-a765-123456789123'
};
const apiVersion = '2023-05-17';
const validSubmissionStatus = 'IN_PROGRESS';
const failedSubmissionStatus = 'FAILED';
const originData = {
    channel: 'telephone'
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
});

jest.doMock('q-router', () => {
    const routerServiceMock = {
        current: jest.fn(sectionId => {
            if (sectionId === invalidSectionId) {
                return undefined;
            }
            if (sectionId) {
                return {
                    id: sectionId,
                    context: {
                        routes: {
                            initial: sectionId
                        }
                    }
                };
            }
            return {
                id: 'p-applicant-when-did-the-crime-happen',
                context: {
                    routes: {
                        initial: 'p-applicant-when-did-the-crime-happen'
                    }
                }
            };
        }),
        first: jest.fn(() => {
            return {
                id: 'p-applicant-declaration',
                context: {
                    routes: {
                        initial: 'p-applicant-declaration'
                    }
                }
            };
        }),
        previous: jest.fn(sectionId => {
            if (sectionId === 'p-first-section') {
                throw new Error('Section Found. No previous section.');
            }
            return {
                id: 'p-applicant-enter-your-email-address',
                context: {
                    routes: {
                        initial: 'p-applicant-enter-your-email-address'
                    }
                }
            };
        }),
        next: jest.fn((answers, sectionId) => {
            return {
                id: sectionId,
                context: {
                    routes: {
                        initial: sectionId
                    },
                    answers
                }
            };
        })
    };

    return () => routerServiceMock;
});

jest.mock('ajv');
jest.mock('ajv-errors');
mockAjv.mockImplementation(() => {
    return {
        compile: jest.fn(() => {
            return jest.fn(answers => {
                return answers !== invalidAnswers;
            });
        }),
        addFormat: jest.fn()
    };
});

jest.doMock('./questionnaire/questionnaire', () => {
    const questionnaireHelperMock = {
        getSection: jest.fn(sectionId => {
            return {
                getSchema: jest.fn(() => {
                    return sectionId;
                })
            };
        }),
        getQuestionnaire: jest.fn(() => {
            return {
                answers: {}
            };
        })
    };

    return () => questionnaireHelperMock;
});
jest.doMock('../services/sqs', () => {
    const sqsHelperMock = {
        send: jest.fn(() => {
            return {MessageId: '99999999-7dec-11d0-a765-00a0c91e6bf6'};
        })
    };

    return () => sqsHelperMock;
});

// Mock the default DAL
jest.doMock('./questionnaire-dal', () => {
    const dalServiceMock = {
        createQuestionnaire: jest.fn(() => {
            return 'ok!';
        }),
        getQuestionnaire: jest.fn(questionnaireId => {
            if (questionnaireId === invalidQuestionnaireId) {
                throw new Error('Cannot find questionnaire');
            }
            if (questionnaireId === incompatibleQuestionnaireId) {
                return incompatibleQuestionnaireFixture;
            }
            return questionnaireFixture;
        }),
        updateQuestionnaire: jest.fn(() => {
            return 'ok!';
        }),
        getQuestionnaireByOwner: jest.fn(questionnaireId => {
            if (questionnaireId === invalidQuestionnaireId) {
                throw new Error('Cannot find questionnaire');
            }
            if (questionnaireId === incompatibleQuestionnaireId) {
                return incompatibleQuestionnaireFixture;
            }
            return questionnaireFixture;
        }),
        updateQuestionnaireByOwner: jest.fn(() => {
            return 'ok!';
        }),
        updateExpiryForAuthenticatedOwner: jest.fn(() => {
            return 'ok!';
        }),
        updateQuestionnaireModifiedDate: jest.fn(() => {
            return 'ok!';
        }),
        updateQuestionnaireModifiedDateByOwner: jest.fn(() => {
            return 'ok!';
        }),
        getQuestionnaireSubmissionStatus: jest.fn(() => {
            return 'ok!';
        }),
        getQuestionnaireSubmissionStatusByOwner: jest.fn(() => {
            return 'ok!';
        }),
        updateQuestionnaireSubmissionStatus: jest.fn(() => {
            return 'ok!';
        }),
        updateQuestionnaireSubmissionStatusByOwner: jest.fn(() => {
            return 'ok!';
        }),
        getQuestionnaireIdsBySubmissionStatus: jest.fn(() => {
            return 'ok!';
        })
    };

    return () => dalServiceMock;
});

jest.doMock('./utils/isQuestionnaireVersionCompatible', () => questionnaireVersion => {
    return questionnaireVersion !== incompatibleQuestionnaireFixture.version;
});

const mockDalService = require('./questionnaire-dal')();

const createQuestionnaireService = require('./questionnaire-service');

describe('Questionnaire Service', () => {
    describe('Unknown API version', () => {
        describe('Questionnaire service is called with an incompatible API', () => {
            it('Should fail gracefully', () => {
                expect(() => {
                    createQuestionnaireService({
                        logger: () => 'Logged from createQuestionnaire test',
                        apiVersion: '2024-01-01', // An incompatible or unknown version
                        ownerId: undefined
                    });
                }).toThrow(`API version "2024-01-01" is not compatible with this release`);
            });
        });
    });
    describe('DCS API Version 2023-05-17', () => {
        const questionnaireService = createQuestionnaireService({
            logger: () => 'Logged from createQuestionnaire test',
            apiVersion,
            ownerId
        });
        describe('createQuestionnaire', () => {
            it('Should create a questionnaire', async () => {
                const actual = await questionnaireService.createQuestionnaire(
                    templatename,
                    ownerData
                );

                expect(actual.data).toMatchObject({
                    id: expect.any(String),
                    type: 'questionnaires',
                    attributes: expect.any(Object)
                });
            });

            it('Should error if templateName not found', async () => {
                const templatename = 'not-a-template';

                await expect(
                    questionnaireService.createQuestionnaire(templatename, ownerData)
                ).rejects.toThrow('Template "not-a-template" does not exist');
            });

            it('Should set owner data in the answers', async () => {
                await questionnaireService.createQuestionnaire(templatename, ownerData);

                expect(mockDalService.createQuestionnaire).toHaveBeenCalledTimes(1);
                expect(mockDalService.createQuestionnaire).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        answers: {
                            owner: {
                                'owner-id': 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                'is-authenticated': false
                            }
                        }
                    })
                );
            });

            it('Should set origin data in the answers if it is included', async () => {
                await questionnaireService.createQuestionnaire(templatename, ownerData, originData);

                expect(mockDalService.createQuestionnaire).toHaveBeenCalledTimes(1);
                expect(mockDalService.createQuestionnaire).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        answers: {
                            owner: {
                                'owner-id': 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                'is-authenticated': false
                            },
                            origin: {
                                channel: 'telephone'
                            }
                        }
                    })
                );
            });

            it('Should set analytics data in the answers if it is included', async () => {
                await questionnaireService.createQuestionnaire(
                    templatename,
                    ownerData,
                    originData,
                    analyticsData
                );

                expect(mockDalService.createQuestionnaire).toHaveBeenCalledTimes(1);
                expect(mockDalService.createQuestionnaire).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        answers: {
                            owner: {
                                'owner-id': 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                'is-authenticated': false
                            },
                            origin: {
                                channel: 'telephone'
                            },
                            system: {
                                'analytics-id': 'urn:uuid:f81d4fae-7dec-11d0-a765-123456789123'
                            }
                        }
                    })
                );
            });

            it('Should set expiry date is owner is authenticated', async () => {
                const ownerData = {
                    id: ownerId,
                    isAuthenticated: true
                };
                await questionnaireService.createQuestionnaire(templatename, ownerData);

                expect(mockDalService.updateExpiryForAuthenticatedOwner).toHaveBeenCalledTimes(1);
                expect(mockDalService.createQuestionnaire).toHaveBeenCalledTimes(1);
                expect(mockDalService.createQuestionnaire).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        answers: {
                            owner: {
                                'owner-id': 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                'is-authenticated': true
                            }
                        }
                    })
                );
            });

            it('Should error if owner data is undefined', async () => {
                const questionnaireService = createQuestionnaireService({
                    logger: () => 'Logged from createQuestionnaire test',
                    apiVersion
                });
                const ownerData = undefined;

                await expect(
                    questionnaireService.createQuestionnaire(templatename, ownerData)
                ).rejects.toThrow('Owner data must be defined');
            });
        });

        describe('getProgressEntries', () => {
            it('Should return a progressEntry collection', async () => {
                const query = undefined;

                const actual = await questionnaireService.getProgressEntries(
                    validQuestionnaireId,
                    query
                );

                expect(Array.isArray(actual.data)).toBe(true);
                expect(actual.data[0]).toMatchObject({
                    id: expect.any(String),
                    type: 'progress-entries',
                    attributes: expect.any(Object),
                    relationships: expect.any(Object)
                });
            });

            it('Should return a "incompatible questionnaire" schema if the questionnaire in incompatible', async () => {
                const query = undefined;

                const actual = await questionnaireService.getProgressEntries(
                    incompatibleQuestionnaireId,
                    query
                );

                expect(Array.isArray(actual.data)).toBe(true);
                expect(actual.data[0]).toMatchObject({
                    id: 'incompatible',
                    type: 'progress-entries',
                    attributes: {
                        sectionId: null,
                        url: null
                    },
                    relationships: {
                        section: {
                            data: {
                                type: null,
                                id: 'incompatible'
                            }
                        }
                    }
                });
            });

            it('Should ONLY use DB functions which filter by owner', async () => {
                const query = {
                    filter: {
                        sectionId: 'p-applicant-when-did-the-crime-happen'
                    }
                };

                await questionnaireService.getProgressEntries(validQuestionnaireId, query);

                expect(mockDalService.getQuestionnaireByOwner).toHaveBeenCalledTimes(1);
                expect(mockDalService.updateQuestionnaireByOwner).toHaveBeenCalledTimes(1);
                expect(mockDalService.getQuestionnaire).not.toHaveBeenCalled();
                expect(mockDalService.updateQuestionnaire).not.toHaveBeenCalled();
            });

            describe('filter functions', () => {
                it('Should filter to the current section', async () => {
                    const query = {
                        filter: {
                            position: 'current'
                        }
                    };

                    const actual = await questionnaireService.getProgressEntries(
                        validQuestionnaireId,
                        query
                    );

                    expect(Array.isArray(actual.data)).toBe(true);
                    expect(actual.data[0]).toMatchObject({
                        id: expect.any(String),
                        type: 'progress-entries',
                        attributes: {
                            url: expect.any(Object),
                            sectionId: 'p-applicant-when-did-the-crime-happen'
                        },
                        relationships: expect.any(Object)
                    });
                });

                it('Should filter to the first section', async () => {
                    const query = {
                        filter: {
                            position: 'first'
                        }
                    };

                    const actual = await questionnaireService.getProgressEntries(
                        validQuestionnaireId,
                        query
                    );

                    expect(Array.isArray(actual.data)).toBe(true);
                    expect(actual.data[0]).toMatchObject({
                        id: expect.any(String),
                        type: 'progress-entries',
                        attributes: {
                            url: expect.any(Object),
                            sectionId: 'p-applicant-declaration'
                        },
                        relationships: expect.any(Object)
                    });
                });

                it('Should filter to a specific section', async () => {
                    const query = {
                        filter: {
                            sectionId: 'p-applicant-when-did-the-crime-happen'
                        }
                    };

                    const actual = await questionnaireService.getProgressEntries(
                        validQuestionnaireId,
                        query
                    );

                    expect(Array.isArray(actual.data)).toBe(true);
                    expect(actual.data[0]).toMatchObject({
                        id: expect.any(String),
                        type: 'progress-entries',
                        attributes: {
                            url: expect.any(Object),
                            sectionId: 'p-applicant-when-did-the-crime-happen'
                        },
                        relationships: expect.any(Object)
                    });
                });

                it('Should filter to the previous section', async () => {
                    const query = {
                        page: {
                            before: 'p-applicant-enter-your-telephone-number'
                        }
                    };

                    const actual = await questionnaireService.getProgressEntries(
                        validQuestionnaireId,
                        query
                    );

                    expect(Array.isArray(actual.data)).toBe(true);
                    expect(actual.data[0]).toMatchObject({
                        id: expect.any(String),
                        type: 'progress-entries',
                        attributes: {
                            url: expect.any(Object),
                            sectionId: 'p-applicant-enter-your-email-address'
                        },
                        relationships: expect.any(Object)
                    });
                });

                it('Should filter to the referrer where no previous section exists', async () => {
                    const query = {
                        page: {
                            before: 'p-first-section'
                        }
                    };

                    const actual = await questionnaireService.getProgressEntries(
                        validQuestionnaireId,
                        query
                    );

                    expect(Array.isArray(actual.data)).toBe(true);
                    expect(actual.data[0]).toMatchObject({
                        id: 'referrer',
                        type: 'progress-entries',
                        attributes: {
                            url:
                                'https://uat.claim-criminal-injuries-compensation.service.justice.gov.uk/start-page',
                            sectionId: expect.any(Object)
                        }
                    });
                });

                it('Should error gracefully if section does not exist', async () => {
                    const query = {
                        filter: {
                            sectionId: invalidSectionId
                        }
                    };

                    await expect(
                        questionnaireService.getProgressEntries(validQuestionnaireId, query)
                    ).rejects.toThrow('ProgressEntry "p-not-a-section" does not exist');
                });
            });
        });

        describe('createAnswers', () => {
            it('Should return an answer resource', async () => {
                const actual = await questionnaireService.createAnswers(
                    validQuestionnaireId,
                    validSectionId,
                    answers
                );

                expect(actual.data).toMatchObject({
                    id: validSectionId,
                    type: 'answers',
                    attributes: expect.any(Object)
                });
            });

            it('Should ONLY use DB functions which filter by owner', async () => {
                await questionnaireService.createAnswers(
                    validQuestionnaireId,
                    validSectionId,
                    answers
                );

                expect(mockDalService.updateQuestionnaireByOwner).toHaveBeenCalledTimes(1);
                expect(mockDalService.updateQuestionnaire).not.toHaveBeenCalled();
            });

            it('Should throw a validation error if the schema is not valid', async () => {
                await expect(
                    questionnaireService.createAnswers(
                        validQuestionnaireId,
                        validSectionId,
                        invalidAnswers
                    )
                ).rejects.toThrow();
            });

            it('Should error gracefully', async () => {
                await expect(
                    questionnaireService.createAnswers(
                        invalidQuestionnaireId,
                        validSectionId,
                        answers
                    )
                ).rejects.toThrow('Cannot find questionnaire');
            });
        });

        describe('getAnswersBySectionId', () => {
            it('Should return an answer resource', async () => {
                const actual = await questionnaireService.getAnswersBySectionId(
                    validQuestionnaireId,
                    validSectionId
                );

                expect(actual.data).toMatchObject({
                    id: validSectionId,
                    type: 'answers',
                    attributes: expect.any(Object)
                });
            });

            it("Should throw a validation error if the sectionId doesn't exist in the questionnaires progress", async () => {
                await expect(
                    questionnaireService.getAnswersBySectionId(
                        validQuestionnaireId,
                        invalidSectionId
                    )
                ).rejects.toThrow();
            });
        });

        describe('updateExpiryForAuthenticatedOwner', () => {
            it('Should execute the updateExpiryForAuthenticatedOwner db call', async () => {
                await questionnaireService.updateExpiryForAuthenticatedOwner(
                    validQuestionnaireId,
                    ownerId
                );

                expect(mockDalService.updateExpiryForAuthenticatedOwner).toHaveBeenCalledTimes(1);
                expect(mockDalService.updateExpiryForAuthenticatedOwner).toHaveBeenCalledWith(
                    validQuestionnaireId,
                    ownerId
                );
            });
        });

        describe('updateQuestionnaireModifiedDate', () => {
            it('Should execute the updateExpiryForAuthenticatedOwner db call', async () => {
                await questionnaireService.updateQuestionnaireModifiedDate(validQuestionnaireId);

                expect(mockDalService.updateQuestionnaireModifiedDateByOwner).toHaveBeenCalledTimes(
                    1
                );
                expect(mockDalService.updateQuestionnaireModifiedDateByOwner).toHaveBeenCalledWith(
                    validQuestionnaireId
                );
                expect(mockDalService.updateQuestionnaireModifiedDate).not.toHaveBeenCalled();
            });
        });

        describe('getQuestionnaireSubmissionStatus', () => {
            it('Should get the submission status of a questionnaire with owner data', async () => {
                await questionnaireService.getQuestionnaireSubmissionStatus(validQuestionnaireId);

                expect(
                    mockDalService.getQuestionnaireSubmissionStatusByOwner
                ).toHaveBeenCalledTimes(1);
                expect(mockDalService.getQuestionnaireSubmissionStatusByOwner).toHaveBeenCalledWith(
                    validQuestionnaireId
                );
                expect(mockDalService.getQuestionnaireSubmissionStatus).not.toHaveBeenCalled();
            });
        });

        describe('updateQuestionnaireSubmissionStatus', () => {
            it('Should update the submission status of a questionnaire with owner data', async () => {
                await questionnaireService.updateQuestionnaireSubmissionStatus(
                    validQuestionnaireId,
                    validSubmissionStatus
                );

                expect(
                    mockDalService.updateQuestionnaireSubmissionStatusByOwner
                ).toHaveBeenCalledTimes(1);
                expect(
                    mockDalService.updateQuestionnaireSubmissionStatusByOwner
                ).toHaveBeenCalledWith(validQuestionnaireId, validSubmissionStatus);
                expect(mockDalService.updateQuestionnaireSubmissionStatus).not.toHaveBeenCalled();
            });
        });
    });

    describe('DCS Admin API', () => {
        describe('getQuestionnaireIdsBySubmissionStatus', () => {
            it('Should execute the getQuestionnaireIdsBySubmissionStatus db call', async () => {
                const questionnaireService = createQuestionnaireService({
                    logger: () => 'Logged from createQuestionnaire test',
                    apiVersion: undefined, // Undefined should only occur for DCS Admin API
                    ownerId: undefined // Undefined should only occur for DCS Admin API
                });
                await questionnaireService.getQuestionnaireIdsBySubmissionStatus(
                    failedSubmissionStatus
                );

                expect(mockDalService.getQuestionnaireIdsBySubmissionStatus).toHaveBeenCalledTimes(
                    1
                );
                expect(mockDalService.getQuestionnaireIdsBySubmissionStatus).toHaveBeenCalledWith(
                    failedSubmissionStatus
                );
            });
        });
    });
});
