/* eslint-disable global-require */

'use strict';

const request = require('supertest');
const VError = require('verror');

const completeQuestionnaireWithoutCRN = require('./test-fixtures/res/questionnaireCompleteWithoutCRN');
const incompleteQuestionnaireWithoutCRN = require('./test-fixtures/res/questionnaireIncompleteWithoutCRN');

beforeEach(() => {
    jest.resetModules();
    jest.unmock('./questionnaire-service.js');
    jest.unmock('./submissions/submissions-service.js');
});

describe('Openapi version 2023-05-17 validation', () => {
    jest.doMock('./questionnaire-service.js', () => {
        const questionnaireServiceMock = {
            createQuestionnaire: jest.fn(templateName => {
                if (templateName === 'this-does-not-exist') {
                    throw new VError(
                        {
                            name: 'ResourceNotFound'
                        },
                        `Template "${templateName}" does not exist`
                    );
                }
                return {
                    type: 'questionnaires',
                    id: '285cb104-0c15-4a9c-9840-cb1007f098fb',
                    attributes: {
                        id: '285cb104-0c15-4a9c-9840-cb1007f098fb',
                        type: 'questionnaire',
                        version: '0.0.0',
                        routes: {
                            initial: 'a route'
                        }
                    }
                };
            }),
            getQuestionnaireSubmissionStatus: jest.fn(questionnaireId => {
                if (questionnaireId === '11111111-0c15-4a9c-9840-cb1007f098fb') {
                    return undefined;
                }
                if (questionnaireId === '44444444-0c15-4a9c-9840-cb1007f098fb') {
                    return 'IN_PROGRESS';
                }
                return 'NOT_STARTED';
            }),
            getSubmissionResponseData: jest.fn(() => {
                return 'ok';
            }),
            getProgressEntries: jest.fn((id, query) => {
                if (query.filter.sectionId === 'p--not-a-valid-section') {
                    throw new VError(
                        {
                            name: 'ResourceNotFound'
                        },
                        `ProgressEntry "${query.filter.sectionId}" does not exist`
                    );
                }
                return {
                    type: 'progress-entries',
                    id: '285cb104-0c15-4a9c-9840-cb1007f098fb',
                    attributes: {
                        sectionId: 'p--some-section',
                        url: 'questionnaire'
                    }
                };
            }),
            createAnswers: jest.fn((id, section) => {
                if (section === 'p-not-a-section') {
                    throw new VError(
                        {
                            name: 'ResourceNotFound'
                        },
                        `Resource /api/questionnaires/${id}/sections/${section}/answers does not exist`
                    );
                }
                return 'ok';
            }),
            updateQuestionnaireSubmissionStatus: jest.fn(() => {
                return 'ok';
            }),
            getQuestionnaire: jest.fn(questionnaireId => {
                if (questionnaireId === '00000000-0c15-4a9c-9840-cb1007f098fb') {
                    return undefined;
                }
                if (
                    questionnaireId === '22222222-0c15-4a9c-9840-cb1007f098fb' ||
                    questionnaireId === '44444444-0c15-4a9c-9840-cb1007f098fb'
                ) {
                    return completeQuestionnaireWithoutCRN;
                }
                if (questionnaireId === '33333333-0c15-4a9c-9840-cb1007f098fb') {
                    return incompleteQuestionnaireWithoutCRN;
                }
                return 'ok';
            }),
            runOnCompleteActions: jest.fn(() => {
                return 'ok';
            }),
            getAnswersBySectionId: jest.fn((questionnaireId, sectionId) => {
                if (sectionId === 'p-not-a-section') {
                    throw new VError(
                        {
                            name: 'ResourceNotFound'
                        },
                        `Section "${sectionId}" does not exist`
                    );
                }
                return 'ok';
            }),
            updateExpiryForAuthenticatedOwner: jest.fn(() => {
                return 'ok';
            }),
            updateQuestionnaireModifiedDate: jest.fn(questionnaireId => {
                if (questionnaireId === '11111111-0c15-4a9c-9840-cb1007f098fb') {
                    throw new VError(
                        {
                            name: 'ResourceNotFound'
                        },
                        `Questionnaire "${questionnaireId}" was not found`
                    );
                }
                return 'ok';
            }),
            getSessionResource: jest.fn(() => {
                return 'ok';
            })
        };

        return () => questionnaireServiceMock;
    });
    jest.doMock('./submissions/submissions-service.js', () => {
        const submissionsServiceMock = {
            submit: jest.fn(questionnaireId => {
                if (questionnaireId === '985cb104-0c15-4a9c-9840-cb1007f098fb') {
                    const err = Error(`Submission error for questionnaireId ${questionnaireId}`);
                    err.name = 'SubmissionError';
                    throw err;
                }
            })
        };
        return () => submissionsServiceMock;
    });

    const mockQuestionnaireService = require('./questionnaire-service.js')();
    // app has an indirect dependency on questionnaire-service.js, require it after
    // the mock so that it references the mocked version
    const app = require('../app');

    const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiMTBjYmM3Y2MtOWQ4YS00ZmQwLTkzNGUtYzU4OTViYWIzMDdlIiwic3ViIjoiY3JvbmpvYiIsInNjb3BlIjoiY3JlYXRlOnN5c3RlbS1hbnN3ZXJzIGNyZWF0ZTpxdWVzdGlvbm5haXJlcyByZWFkOnF1ZXN0aW9ubmFpcmVzIHVwZGF0ZTpxdWVzdGlvbm5haXJlcyBkZWxldGU6cXVlc3Rpb25uYWlyZXMgcmVhZDpwcm9ncmVzcy1lbnRyaWVzIGFkbWluIiwiaWF0IjoxNjkxNDE4Nzg2fQ.08pWJBlgEc7EjCv6z8LbKXQTiE9Ga-az0v7fLiuvI5Y';

    describe('POST /questionnaires', () => {
        it('should return status code 401 if bearer token is NOT valid', async () => {
            const response = await request(app)
                .post('/api/questionnaires')
                .set('Authorization', `Bearer I-AM-INVALID`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'questionnaires',
                        attributes: {
                            templateName: 'sexual-assault',
                            owner: {
                                id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                isAuthenticated: true
                            }
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(401);
            expect(response.body.errors[0].detail).toEqual('jwt malformed');
        });

        it('should return status code 403 if the bearer token has insufficient scope', async () => {
            // THIS IS A TOKEN WITH A DUMMY SCOPE
            const dummyToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiNTFhODljYWUtM2Q1MC00ZDc1LTliMmEtMjU2NzliODgwMTkxIiwic3ViIjoiY2ljYS13ZWIiLCJzY29wZSI6ImNyZWF0ZTpub3RoaW5nIiwiaWF0IjoxNjgwNzk4NDU5fQ.97LgtlW_dcAV0Xno6BsbVmuyhLtq4gCoVWGQ56_VmEk';
            const response = await request(app)
                .post('/api/questionnaires')
                .set('Authorization', `Bearer ${dummyToken}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'questionnaires',
                        attributes: {
                            templateName: 'sexual-assault',
                            owner: {
                                id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                isAuthenticated: true
                            }
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(403);
            expect(response.body.errors[0].detail).toEqual('Insufficient scope');
        });

        it('should return status code 404 if the request body contains incorrect data', async () => {
            const response = await request(app)
                .post('/api/questionnaires')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'questionnaires',
                        attributes: {
                            templateName: 'this-does-not-exist',
                            owner: {
                                id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                isAuthenticated: true
                            }
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(404);
            expect(response.body.errors[0].detail).toEqual(
                'Template "this-does-not-exist" does not exist'
            );
        });

        describe('Requests made MUST include owner data', () => {
            it('should return status code 400 if owner data is NOT included in the request body', async () => {
                const response = await request(app)
                    .post('/api/questionnaires')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'questionnaires',
                            attributes: {
                                templateName: 'sexual-assault'
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'owner'"
                );
            });

            it('should return status code 201 if owner data is included in the request body', async () => {
                const response = await request(app)
                    .post('/api/questionnaires')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'questionnaires',
                            attributes: {
                                templateName: 'sexual-assault',
                                owner: {
                                    id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                    isAuthenticated: true
                                }
                            }
                        }
                    });
                expect(response.statusCode).toEqual(201);
            });
        });

        describe('Requests made MUST include "Dcs-Api-Version" header', () => {
            it('should return status code 400 if "Dcs-Api-Version" is NOT included in the header', async () => {
                const response = await request(app)
                    .post('/api/questionnaires')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .send({
                        data: {
                            type: 'questionnaires',
                            attributes: {
                                templateName: 'sexual-assault',
                                owner: {
                                    id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                    isAuthenticated: true
                                }
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'dcs-api-version'"
                );
            });

            it('should return status code 400 if "Dcs-Api-Version" is malformed', async () => {
                const response = await request(app)
                    .post('/api/questionnaires')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', 'not-a-version')
                    .send({
                        data: {
                            type: 'questionnaires',
                            attributes: {
                                templateName: 'sexual-assault',
                                owner: {
                                    id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                    isAuthenticated: true
                                }
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    'should be equal to one of the allowed values: 2023-05-17'
                );
            });

            it('should return status code 201 if "Dcs-Api-Version" is included in the header', async () => {
                const response = await request(app)
                    .post('/api/questionnaires')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'questionnaires',
                            attributes: {
                                templateName: 'sexual-assault',
                                owner: {
                                    id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                    isAuthenticated: true
                                }
                            }
                        }
                    });
                expect(response.statusCode).toEqual(201);
            });
        });

        describe('Requests with an origin MUST include channel data', () => {
            it('should return status code 400 if channel data is NOT included in the origin data', async () => {
                const response = await request(app)
                    .post('/api/questionnaires')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'questionnaires',
                            attributes: {
                                templateName: 'sexual-assault',
                                owner: {
                                    id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                    isAuthenticated: true
                                },
                                origin: {}
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'channel'"
                );
            });
        });

        describe('Requests with analytics data MUST include an id', () => {
            it('should return status code 400 if id is NOT included in the analytics data', async () => {
                const response = await request(app)
                    .post('/api/questionnaires')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'questionnaires',
                            attributes: {
                                templateName: 'sexual-assault',
                                owner: {
                                    id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
                                    isAuthenticated: true
                                },
                                analytics: {}
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'id'"
                );
            });
        });
    });

    describe('GET /questionnaires/{questionnaireId}/progress-entries', () => {
        it('should return status code 401 if bearer token is NOT valid', async () => {
            const response = await request(app)
                .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/progress-entries')
                .set('Authorization', `Bearer I-AM-INVALID`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('Dcs-Api-Version', '2023-05-17')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`);
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(401);
            expect(response.body.errors[0].detail).toEqual('jwt malformed');
        });

        it('should return status code 403 if the bearer token has insufficient scope', async () => {
            // THIS IS A TOKEN WITH A DUMMY SCOPE
            const dummyToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiNTFhODljYWUtM2Q1MC00ZDc1LTliMmEtMjU2NzliODgwMTkxIiwic3ViIjoiY2ljYS13ZWIiLCJzY29wZSI6ImNyZWF0ZTpub3RoaW5nIiwiaWF0IjoxNjgwNzk4NDU5fQ.97LgtlW_dcAV0Xno6BsbVmuyhLtq4gCoVWGQ56_VmEk';
            const response = await request(app)
                .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/progress-entries')
                .set('Authorization', `Bearer ${dummyToken}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('Dcs-Api-Version', '2023-05-17')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`);
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(403);
            expect(response.body.errors[0].detail).toEqual('Insufficient scope');
        });

        it('should return status code 404 if the query string contains incorrect data', async () => {
            const response = await request(app)
                .get(
                    '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/progress-entries?filter[sectionId]=p--not-a-valid-section'
                )
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('Dcs-Api-Version', '2023-05-17')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`);
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(404);
            expect(response.body.errors[0].detail).toEqual(
                'ProgressEntry "p--not-a-valid-section" does not exist'
            );
        });

        describe('Requests made MUST include owner data', () => {
            it('should return status code 400 if owner data is NOT included in the request header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/progress-entries'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'on-behalf-of'"
                );
            });

            it('should return status code 200 if owner data is included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/progress-entries'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.statusCode).toEqual(200);
            });
        });

        describe('Requests made MUST include "Dcs-Api-Version" header', () => {
            it('should return status code 400 if "Dcs-Api-Version" is NOT included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/progress-entries'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Content-Type', 'application/vnd.api+json');
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'dcs-api-version'"
                );
            });

            it('should return status code 400 if "Dcs-Api-Version" is malformed', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/progress-entries'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', 'not-a-version');
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    'should be equal to one of the allowed values: 2023-05-17'
                );
            });

            it('should return status code 200 if "Dcs-Api-Version" is included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/progress-entries'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.statusCode).toEqual(200);
            });
        });
    });

    describe('POST /questionnaires/:questionnaireId/sections/:sectionId/answers', () => {
        it('should return status code 401 if bearer token is NOT valid', async () => {
            const response = await request(app)
                .post(
                    '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                )
                .set('Authorization', `Bearer I-AM-INVALID`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'answers',
                        attributes: {
                            'q-some-question': true
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(401);
            expect(response.body.errors[0].detail).toEqual('jwt malformed');
        });

        it('should return status code 403 if the bearer token has insufficient scope', async () => {
            // THIS IS A TOKEN WITH A DUMMY SCOPE
            const dummyToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiNTFhODljYWUtM2Q1MC00ZDc1LTliMmEtMjU2NzliODgwMTkxIiwic3ViIjoiY2ljYS13ZWIiLCJzY29wZSI6ImNyZWF0ZTpub3RoaW5nIiwiaWF0IjoxNjgwNzk4NDU5fQ.97LgtlW_dcAV0Xno6BsbVmuyhLtq4gCoVWGQ56_VmEk';
            const response = await request(app)
                .post(
                    '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                )
                .set('Authorization', `Bearer ${dummyToken}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'answers',
                        attributes: {
                            'q-some-question': true
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(403);
            expect(response.body.errors[0].detail).toEqual('Insufficient scope');
        });

        it('should return status code 404 if the query string contains incorrect data', async () => {
            const response = await request(app)
                .post(
                    '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-not-a-section/answers'
                )
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'answers',
                        attributes: {
                            'q-some-question': true
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(404);
            expect(response.body.errors[0].detail).toEqual(
                'Resource /api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-not-a-section/answers does not exist'
            );
        });

        describe('Requests made MUST include owner data', () => {
            it('should return status code 400 if owner data is NOT included in the request body', async () => {
                const response = await request(app)
                    .post(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'answers',
                            attributes: {
                                'q-some-question': true
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'on-behalf-of'"
                );
            });

            it('should return status code 201 if owner data is included in the header', async () => {
                const response = await request(app)
                    .post(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'answers',
                            attributes: {
                                'q-some-question': true
                            }
                        }
                    });
                expect(response.statusCode).toEqual(201);
            });
        });

        describe('Requests made MUST include "Dcs-Api-Version" header', () => {
            it('should return status code 400 if "Dcs-Api-Version" is NOT included in the header', async () => {
                const response = await request(app)
                    .post(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .send({
                        data: {
                            type: 'answers',
                            attributes: {
                                'q-some-question': true
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'dcs-api-version'"
                );
            });

            it('should return status code 201 if "Dcs-Api-Version" is included in the header', async () => {
                const response = await request(app)
                    .post(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'answers',
                            attributes: {
                                'q-some-question': true
                            }
                        }
                    });
                expect(response.statusCode).toEqual(201);
            });
        });

        describe('POST answers to the "owner" section', () => {
            it('should perform actions specific to the "owner" section', async () => {
                const response = await request(app)
                    .post(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/owner/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'answers',
                            attributes: {
                                owner: {
                                    id:
                                        'urn:fdc:gov.uk:2022:ZoTyx0owL1MYS-UkCwtQXbF2A-padOhdssGvXDfamws',
                                    isAuthenticated: true
                                }
                            }
                        }
                    });
                expect(response.statusCode).toEqual(201);
                expect(mockQuestionnaireService.updateExpiryForAuthenticatedOwner).toBeCalledTimes(
                    1
                );
            });
        });
    });

    describe('GET /questionnaires/:questionnaireId/sections/:sectionId/answers', () => {
        it('should return status code 401 if bearer token is NOT valid', async () => {
            const response = await request(app)
                .get(
                    '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                )
                .set('Authorization', `Bearer I-AM-INVALID`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(401);
            expect(response.body.errors[0].detail).toEqual('jwt malformed');
        });

        it('should return status code 403 if the bearer token has insufficient scope', async () => {
            // THIS IS A TOKEN WITH A DUMMY SCOPE
            const dummyToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiNTFhODljYWUtM2Q1MC00ZDc1LTliMmEtMjU2NzliODgwMTkxIiwic3ViIjoiY2ljYS13ZWIiLCJzY29wZSI6ImNyZWF0ZTpub3RoaW5nIiwiaWF0IjoxNjgwNzk4NDU5fQ.97LgtlW_dcAV0Xno6BsbVmuyhLtq4gCoVWGQ56_VmEk';
            const response = await request(app)
                .get(
                    '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                )
                .set('Authorization', `Bearer ${dummyToken}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(403);
            expect(response.body.errors[0].detail).toEqual('Insufficient scope');
        });

        it('should return status code 404 if the query string contains incorrect data', async () => {
            const response = await request(app)
                .get(
                    '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-not-a-section/answers'
                )
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(404);
            expect(response.body.errors[0].detail).toEqual(
                'Section "p-not-a-section" does not exist'
            );
        });

        describe('Requests made MUST include owner data', () => {
            it('should return status code 400 if owner data is NOT included in the request body', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'on-behalf-of'"
                );
            });

            it('should return status code 200 if owner data is included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.statusCode).toEqual(200);
            });
        });

        describe('Requests made MUST include "Dcs-Api-Version" header', () => {
            it('should return status code 400 if "Dcs-Api-Version" is NOT included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`);
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'dcs-api-version'"
                );
            });

            it('should return status code 200 if "Dcs-Api-Version" is included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/sections/p-some-section/answers'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.statusCode).toEqual(200);
            });
        });
    });

    describe('GET /:questionnaireId/session/keep-alive', () => {
        it('should return status code 401 if bearer token is NOT valid', async () => {
            const response = await request(app)
                .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/session/keep-alive')
                .set('Authorization', `Bearer I-AM-INVALID`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(401);
            expect(response.body.errors[0].detail).toEqual('jwt malformed');
        });

        it('should return status code 403 if the bearer token has insufficient scope', async () => {
            // THIS IS A TOKEN WITH A DUMMY SCOPE
            const dummyToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiNTFhODljYWUtM2Q1MC00ZDc1LTliMmEtMjU2NzliODgwMTkxIiwic3ViIjoiY2ljYS13ZWIiLCJzY29wZSI6ImNyZWF0ZTpub3RoaW5nIiwiaWF0IjoxNjgwNzk4NDU5fQ.97LgtlW_dcAV0Xno6BsbVmuyhLtq4gCoVWGQ56_VmEk';
            const response = await request(app)
                .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/session/keep-alive')
                .set('Authorization', `Bearer ${dummyToken}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(403);
            expect(response.body.errors[0].detail).toEqual('Insufficient scope');
        });

        it('should return status code 404 if the query string contains incorrect data', async () => {
            const response = await request(app)
                .get('/api/questionnaires/11111111-0c15-4a9c-9840-cb1007f098fb/session/keep-alive')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(404);
        });

        describe('Requests made MUST include owner data', () => {
            it('should return status code 400 if owner data is NOT included in the request body', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/session/keep-alive'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'on-behalf-of'"
                );
            });

            it('should return status code 200 if owner data is included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/session/keep-alive'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.statusCode).toEqual(200);
            });
        });

        describe('Requests made MUST include "Dcs-Api-Version" header', () => {
            it('should return status code 400 if "Dcs-Api-Version" is NOT included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/session/keep-alive'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`);
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'dcs-api-version'"
                );
            });

            it('should return status code 200 if "Dcs-Api-Version" is included in the header', async () => {
                const response = await request(app)
                    .get(
                        '/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/session/keep-alive'
                    )
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.statusCode).toEqual(200);
            });
        });
    });

    // TODO: REVIEW THESE POST BeT RELEASE
    describe.skip('GET /questionnaires/:questionnaireId/submissions', () => {
        it('should return status code 401 if bearer token is NOT valid', async () => {
            const response = await request(app)
                .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer I-AM-INVALID`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(401);
            expect(response.body.errors[0].detail).toEqual('jwt malformed');
        });

        it('should return status code 403 if the bearer token has insufficient scope', async () => {
            // THIS IS A TOKEN WITH A DUMMY SCOPE
            const dummyToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiNTFhODljYWUtM2Q1MC00ZDc1LTliMmEtMjU2NzliODgwMTkxIiwic3ViIjoiY2ljYS13ZWIiLCJzY29wZSI6ImNyZWF0ZTpub3RoaW5nIiwiaWF0IjoxNjgwNzk4NDU5fQ.97LgtlW_dcAV0Xno6BsbVmuyhLtq4gCoVWGQ56_VmEk';
            const response = await request(app)
                .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${dummyToken}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(403);
            expect(response.body.errors[0].detail).toEqual('Insufficient scope');
        });

        it('should return status code 404 if the query string contains incorrect data', async () => {
            const response = await request(app)
                .get('/api/questionnaires/11111111-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(404);
            expect(response.body.errors[0].detail).toEqual(
                'Questionnaire with questionnaireId "11111111-0c15-4a9c-9840-cb1007f098fb" does not exist'
            );
        });

        describe('Requests made MUST include owner data', () => {
            it('should return status code 400 if owner data is NOT included in the request header', async () => {
                const response = await request(app)
                    .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'on-behalf-of'"
                );
            });

            it('should return status code 200 if owner data is included in the header', async () => {
                const response = await request(app)
                    .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.statusCode).toEqual(200);
            });
        });

        describe('Requests made MUST include "Dcs-Api-Version" header', () => {
            it('should return status code 400 if "Dcs-Api-Version" is NOT included in the header', async () => {
                const response = await request(app)
                    .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`);
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'dcs-api-version'"
                );
            });

            it('should return status code 200 if "Dcs-Api-Version" is included in the header', async () => {
                const response = await request(app)
                    .get('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17');
                expect(response.statusCode).toEqual(200);
            });
        });
    });

    // TODO: REVIEW THESE POST BeT RELEASE
    describe.skip('POST /questionnaires/:questionnaireId/submissions', () => {
        it('should return status code 401 if bearer token is NOT valid', async () => {
            const response = await request(app)
                .post('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer I-AM-INVALID`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'submissions',
                        attributes: {
                            questionnaireId: '285cb104-0c15-4a9c-9840-cb1007f098fb'
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(401);
            expect(response.body.errors[0].detail).toEqual('jwt malformed');
        });

        it('should return status code 403 if the bearer token has insufficient scope', async () => {
            // THIS IS A TOKEN WITH A DUMMY SCOPE
            const dummyToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJkYXRhLWNhcHR1cmUtc2VydmljZSIsImlzcyI6IiQuYXVkIiwianRpIjoiNTFhODljYWUtM2Q1MC00ZDc1LTliMmEtMjU2NzliODgwMTkxIiwic3ViIjoiY2ljYS13ZWIiLCJzY29wZSI6ImNyZWF0ZTpub3RoaW5nIiwiaWF0IjoxNjgwNzk4NDU5fQ.97LgtlW_dcAV0Xno6BsbVmuyhLtq4gCoVWGQ56_VmEk';
            const response = await request(app)
                .post('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${dummyToken}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'submissions',
                        attributes: {
                            questionnaireId: '285cb104-0c15-4a9c-9840-cb1007f098fb'
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(403);
            expect(response.body.errors[0].detail).toEqual('Insufficient scope');
        });

        it('should return status code 404 if the query string contains incorrect data', async () => {
            const response = await request(app)
                .post('/api/questionnaires/00000000-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'submissions',
                        attributes: {
                            questionnaireId: '00000000-0c15-4a9c-9840-cb1007f098fb'
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(404);
            expect(response.body.errors[0].detail).toEqual(
                'Questionnaire with questionnaireId "00000000-0c15-4a9c-9840-cb1007f098fb" does not exist'
            );
        });

        it('should return status code 409 if the resource is not in a submittable state', async () => {
            const response = await request(app)
                .post('/api/questionnaires/33333333-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'submissions',
                        attributes: {
                            questionnaireId: '33333333-0c15-4a9c-9840-cb1007f098fb'
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(409);
            expect(response.body.errors[0].detail).toEqual(
                'Questionnaire with ID "33333333-0c15-4a9c-9840-cb1007f098fb" is not in a submittable state'
            );
        });

        it('should return status code 409 if there is a resource conflict', async () => {
            const response = await request(app)
                .post('/api/questionnaires/44444444-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'submissions',
                        attributes: {
                            questionnaireId: '44444444-0c15-4a9c-9840-cb1007f098fb'
                        }
                    }
                });
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].status).toEqual(409);
            expect(response.body.errors[0].detail).toEqual(
                'Submission resource with ID "44444444-0c15-4a9c-9840-cb1007f098fb" already exists'
            );
        });

        describe('Requests made MUST include owner data', () => {
            it('should return status code 400 if owner data is NOT included in the request header', async () => {
                const response = await request(app)
                    .post('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireId: '285cb104-0c15-4a9c-9840-cb1007f098fb'
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'on-behalf-of'"
                );
            });

            it('should return status code 201 if owner data is included in the header', async () => {
                const response = await request(app)
                    .post('/api/questionnaires/22222222-0c15-4a9c-9840-cb1007f098fb/submissions')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireId: '22222222-0c15-4a9c-9840-cb1007f098fb'
                            }
                        }
                    });
                expect(response.statusCode).toEqual(201);
            });
        });

        describe('Requests made MUST include "Dcs-Api-Version" header', () => {
            it('should return status code 400 if "Dcs-Api-Version" is NOT included in the header', async () => {
                const response = await request(app)
                    .post('/api/questionnaires/285cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireId: '285cb104-0c15-4a9c-9840-cb1007f098fb'
                            }
                        }
                    });
                expect(response.body).toHaveProperty('errors');
                expect(response.body.errors[0].status).toEqual(400);
                expect(response.body.errors[0].detail).toEqual(
                    "should have required property 'dcs-api-version'"
                );
            });

            it('should return status code 201 if "Dcs-Api-Version" is included in the header', async () => {
                const response = await request(app)
                    .post('/api/questionnaires/22222222-0c15-4a9c-9840-cb1007f098fb/submissions')
                    .set('Authorization', `Bearer ${token}`)
                    .set('Content-Type', 'application/vnd.api+json')
                    .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                    .set('Dcs-Api-Version', '2023-05-17')
                    .send({
                        data: {
                            type: 'submissions',
                            attributes: {
                                questionnaireId: '22222222-0c15-4a9c-9840-cb1007f098fb'
                            }
                        }
                    });
                expect(response.statusCode).toEqual(201);
            });
        });
    });

    describe('Submission Failure: POST /questionnaires/:questionnaireId/submissions', () => {
        it('should throw a SubmissionError when a sequential task fails', async () => {
            const response = await request(app)
                .post('/api/questionnaires/985cb104-0c15-4a9c-9840-cb1007f098fb/submissions')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/vnd.api+json')
                .set('On-Behalf-Of', `urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`)
                .set('Dcs-Api-Version', '2023-05-17')
                .send({
                    data: {
                        type: 'submissions',
                        attributes: {
                            questionnaireId: '985cb104-0c15-4a9c-9840-cb1007f098fb'
                        }
                    }
                });
            expect(response.error.status).toEqual(500);
            expect(response.error.text).toContain(
                'SubmissionError: Submission error for questionnaireId 985cb104-0c15-4a9c-9840-cb1007f098fb'
            );
        });
    });
});
