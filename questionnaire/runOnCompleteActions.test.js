'use strict';

// TODO: These should live in q-router

jest.doMock('../services/notify', () => {
    const notifyServiceMock = {
        sendEmail: jest.fn().mockResolvedValue({
            some: 'email response'
        }),
        sendSms: jest.fn().mockResolvedValue({
            some: 'sms response'
        })
    };

    return () => notifyServiceMock;
});

const mockedNotifyService = require('../services/notify')();
const createQuestionnaireService = require('./questionnaire-service');

describe('runOnCompleteActions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Given a send email action', () => {
        it('should call the send email function with defined data', async () => {
            const questionnaireService = createQuestionnaireService();
            const actionData = {some: 'action data 47c7fc59-e657-4d10-b57e-2b3a59bd9bdf'};
            const actionResults = await Promise.allSettled(
                await questionnaireService.runOnCompleteActions({
                    meta: {
                        onComplete: {
                            actions: [
                                {
                                    type: 'sendEmail',
                                    data: actionData
                                }
                            ]
                        }
                    }
                })
            );

            expect(actionResults).toEqual([{status: 'fulfilled', value: {some: 'email response'}}]);
            expect(mockedNotifyService.sendEmail).toHaveBeenCalledTimes(1);
            expect(mockedNotifyService.sendEmail).toHaveBeenCalledWith(actionData);
        });
    });

    describe('Given a send sms action', () => {
        it('should call the send sms function with defined data', async () => {
            const questionnaireService = createQuestionnaireService();
            const actionData = {some: 'action data 790edce0-4f90-4d3d-8fe5-52889c2caa00'};
            const actionResults = await Promise.allSettled(
                await questionnaireService.runOnCompleteActions({
                    meta: {
                        onComplete: {
                            actions: [
                                {
                                    type: 'sendSms',
                                    data: actionData
                                }
                            ]
                        }
                    }
                })
            );

            expect(actionResults).toEqual([{status: 'fulfilled', value: {some: 'sms response'}}]);
            expect(mockedNotifyService.sendSms).toHaveBeenCalledTimes(1);
            expect(mockedNotifyService.sendSms).toHaveBeenCalledWith(actionData);
        });
    });

    describe('Given multiple actions', () => {
        it('should run each action in parallel', async () => {
            const questionnaireService = createQuestionnaireService();
            const smsActionData = {some: 'action data ff10551c-9928-410a-a7be-5ba21297a132'};
            const emailActionData1 = {some: 'action data 0bdb9b24-5d1f-4c46-b706-bd7edcf3c87b'};
            const emailActionData2 = {some: 'action data 83a376f2-6329-474a-a055-7510c0b7befd'};
            const actionResults = await Promise.allSettled(
                await questionnaireService.runOnCompleteActions({
                    meta: {
                        onComplete: {
                            actions: [
                                {
                                    type: 'sendSms',
                                    data: smsActionData
                                },
                                {
                                    type: 'sendEmail',
                                    data: emailActionData1
                                },
                                {
                                    type: 'sendEmail',
                                    data: emailActionData2
                                }
                            ]
                        }
                    }
                })
            );

            expect(actionResults).toEqual([
                {status: 'fulfilled', value: {some: 'sms response'}},
                {status: 'fulfilled', value: {some: 'email response'}},
                {status: 'fulfilled', value: {some: 'email response'}}
            ]);
            expect(mockedNotifyService.sendSms).toHaveBeenCalledTimes(1);
            expect(mockedNotifyService.sendSms).toHaveBeenCalledWith(smsActionData);
            expect(mockedNotifyService.sendEmail).toHaveBeenCalledTimes(2);
            expect(mockedNotifyService.sendEmail).toHaveBeenNthCalledWith(1, emailActionData1);
            expect(mockedNotifyService.sendEmail).toHaveBeenNthCalledWith(2, emailActionData2);
        });
    });

    describe('Given multiple actions where one or more fail', () => {
        it('should return rejected promises', async () => {
            const questionnaireService = createQuestionnaireService();
            const smsActionData = {some: 'action data 83787b54-8d41-4516-af1b-75e1ae2feec7'};
            const emailActionData1 = {some: 'action data 90aa74f3-dcd8-4e10-becb-fe5dbd2c67c6'};
            const emailActionData2 = {some: 'action data 4f8267d9-08fb-483a-940c-2431f2c4d143'};

            mockedNotifyService.sendSms.mockRejectedValueOnce({
                some: 'sms error'
            });

            const actionResults = await Promise.allSettled(
                await questionnaireService.runOnCompleteActions({
                    meta: {
                        onComplete: {
                            actions: [
                                {
                                    type: 'sendSms',
                                    data: smsActionData
                                },
                                {
                                    type: 'sendEmail',
                                    data: emailActionData1
                                },
                                {
                                    type: 'sendEmail',
                                    data: emailActionData2
                                }
                            ]
                        }
                    }
                })
            );

            expect(actionResults).toEqual([
                {status: 'rejected', reason: {some: 'sms error'}},
                {status: 'fulfilled', value: {some: 'email response'}},
                {status: 'fulfilled', value: {some: 'email response'}}
            ]);
            expect(mockedNotifyService.sendSms).toHaveBeenCalledTimes(1);
            expect(mockedNotifyService.sendSms).toHaveBeenCalledWith(smsActionData);
            expect(mockedNotifyService.sendEmail).toHaveBeenCalledTimes(2);
            expect(mockedNotifyService.sendEmail).toHaveBeenNthCalledWith(1, emailActionData1);
            expect(mockedNotifyService.sendEmail).toHaveBeenNthCalledWith(2, emailActionData2);
        });
    });
});

// TODO: These should be part of the template
const templates = require('./templates');

function setRole(role, answers) {
    if (role === 'mainapplicant') {
        answers['p-mainapplicant-parent'] = {
            'q-mainapplicant-parent': true
        };

        return answers;
    }

    if (role === 'child') {
        answers['p-applicant-are-you-18-or-over'] = {
            'q-applicant-are-you-18-or-over': false
        };

        return answers;
    }

    if (role === 'adult') {
        answers['p-applicant-are-you-18-or-over'] = {
            'q-applicant-are-you-18-or-over': true
        };

        return answers;
    }

    if (role === 'incapable') {
        answers['p-applicant-can-handle-affairs'] = {
            'q-applicant-can-handle-affairs': false
        };

        return answers;
    }

    if (role === 'rep.applicant:adult:capable') {
        answers['p-applicant-who-are-you-applying-for'] = {
            'q-applicant-who-are-you-applying-for': 'someone-else'
        };
        answers['p-applicant-are-you-18-or-over'] = {
            'q-applicant-are-you-18-or-over': true
        };
        answers['p-applicant-can-handle-affairs'] = {
            'q-applicant-can-handle-affairs': true
        };

        return answers;
    }

    if (role === 'rep.mainapplicant.applicant:adult:incapable') {
        answers['p-applicant-who-are-you-applying-for'] = {
            'q-applicant-who-are-you-applying-for': 'someone-else'
        };
        answers['p-applicant-are-you-18-or-over'] = {
            'q-applicant-are-you-18-or-over': true
        };
        answers['p--has-legal-authority'] = {
            'q--has-legal-authority': false
        };
        answers['p--represents-legal-authority'] = {
            'q--represents-legal-authority': true
        };

        return answers;
    }

    if (role === 'rep.mainapplicant.applicant:child') {
        answers['p-applicant-who-are-you-applying-for'] = {
            'q-applicant-who-are-you-applying-for': 'someone-else'
        };
        answers['p-applicant-are-you-18-or-over'] = {
            'q-applicant-are-you-18-or-over': false
        };
        answers['p-mainapplicant-parent'] = {
            'q-mainapplicant-parent': false
        };
        answers['p--has-legal-authority'] = {
            'q--has-legal-authority': false
        };

        return answers;
    }

    if (role === 'rep:no-legal-authority.applicant') {
        answers['p-applicant-who-are-you-applying-for'] = {
            'q-applicant-who-are-you-applying-for': 'someone-else'
        };
        answers['p-applicant-are-you-18-or-over'] = {
            'q-applicant-are-you-18-or-over': true
        };
        answers['p--has-legal-authority'] = {
            'q--has-legal-authority': false
        };
        answers['p--represents-legal-authority'] = {
            'q--represents-legal-authority': false
        };

        return answers;
    }

    if (role === 'noauthority') {
        answers['p-applicant-are-you-18-or-over'] = {
            'q-applicant-are-you-18-or-over': true
        };
        answers['p-applicant-can-handle-affairs'] = {
            'q-applicant-can-handle-affairs': false
        };
        answers['p--has-legal-authority'] = {
            'q--has-legal-authority': false
        };
        answers['p--represents-legal-authority'] = {
            'q--represents-legal-authority': false
        };

        return answers;
    }

    throw Error(`Role ${role} not found`);
}

describe('template', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Given a successfully submitted application', () => {
        describe('With "email" as the contact preference', () => {
            describe('And user role is applicant', () => {
                it('should send a confirmation email to applicant:adult', async () => {
                    const application = templates['sexual-assault'](
                        '54fbbaaf-e199-47ce-a450-1813be6a5f5c'
                    );
                    application.answers = {
                        'p-applicant-confirmation-method': {
                            'q-applicant-confirmation-method': 'email',
                            'q-applicant-enter-your-email-address': 'foo@e2ad804c872c.gov.uk'
                        },
                        system: {
                            'case-reference': '11/111111'
                        }
                    };

                    const questionnaireService = createQuestionnaireService();
                    const actionResults = await Promise.allSettled(
                        await questionnaireService.runOnCompleteActions(application)
                    );
                    const expectedActionData = {
                        templateId: '5d207246-99d7-4bb9-83e1-75a7847bb8fd',
                        emailAddress: 'foo@e2ad804c872c.gov.uk',
                        personalisation: {
                            caseReference: '11/111111'
                        },
                        reference: null
                    };

                    expect(actionResults).toEqual([
                        {status: 'fulfilled', value: {some: 'email response'}}
                    ]);
                    expect(mockedNotifyService.sendEmail).toHaveBeenCalledTimes(1);
                    expect(mockedNotifyService.sendEmail).toHaveBeenCalledWith(expectedActionData);
                });
            });

            describe('And user role is mainapplicant', () => {
                it.each([
                    {
                        roles: ['mainapplicant', 'child'],
                        templateId: '668fac4a-3e1c-40e7-b7ac-090a410fbb03'
                    },
                    {
                        roles: ['mainapplicant', 'adult', 'incapable'],
                        templateId: '80843f77-a68c-4d7a-b3c9-42fd0de271c2'
                    }
                ])('should send a confirmation email to $roles', async ({roles, templateId}) => {
                    const application = templates['sexual-assault'](
                        '54fbbaaf-e199-47ce-a450-1813be6a5f5c'
                    );

                    application.answers = {
                        'p-mainapplicant-confirmation-method': {
                            'q-mainapplicant-confirmation-method': 'email',
                            'q-mainapplicant-enter-your-email-address': 'foo@e2ad804c872c.gov.uk'
                        },
                        system: {
                            'case-reference': '11/111111'
                        }
                    };
                    roles.forEach(role => setRole(role, application.answers));

                    const questionnaireService = createQuestionnaireService();
                    const actionResults = await Promise.allSettled(
                        await questionnaireService.runOnCompleteActions(application)
                    );
                    const expectedActionData = {
                        templateId,
                        emailAddress: 'foo@e2ad804c872c.gov.uk',
                        personalisation: {
                            caseReference: '11/111111'
                        },
                        reference: null
                    };

                    expect(mockedNotifyService.sendEmail).toHaveBeenNthCalledWith(
                        1,
                        expectedActionData
                    );
                    expect(mockedNotifyService.sendEmail).toHaveBeenCalledTimes(1);
                    expect(actionResults).toEqual([
                        {status: 'fulfilled', value: {some: 'email response'}}
                    ]);
                });
            });

            describe('And user role is rep', () => {
                it.each([
                    {
                        roles: ['rep.applicant:adult:capable'],
                        templateId: 'b21f1aa7-cc16-41e7-8b8e-5c69e52f21f9'
                    },
                    {
                        roles: ['rep.mainapplicant.applicant:adult:incapable', 'incapable'],
                        templateId: 'a6583a82-51ca-4f8e-b8b8-cbca763dc59a'
                    },
                    {
                        roles: ['rep.mainapplicant.applicant:child'],
                        templateId: 'a0c7b011-b0df-4645-8ce3-6bd8f7905dfc'
                    },
                    {
                        roles: ['rep:no-legal-authority.applicant', 'noauthority'],
                        templateId: 'fb865d9c-37b1-4077-b519-aacfe42c9951'
                    }
                ])('should send a confirmation email to $roles', async ({roles, templateId}) => {
                    const application = templates['sexual-assault'](
                        '54fbbaaf-e199-47ce-a450-1813be6a5f5c'
                    );

                    application.answers = {
                        'p-rep-confirmation-method': {
                            'q-rep-confirmation-method': 'email',
                            'q-rep-enter-your-email-address': 'foo@e2ad804c872c.gov.uk'
                        },
                        system: {
                            'case-reference': '11/111111'
                        }
                    };
                    roles.forEach(role => setRole(role, application.answers));

                    const questionnaireService = createQuestionnaireService();
                    const actionResults = await Promise.allSettled(
                        await questionnaireService.runOnCompleteActions(application)
                    );
                    const expectedActionData = {
                        templateId,
                        emailAddress: 'foo@e2ad804c872c.gov.uk',
                        personalisation: {
                            caseReference: '11/111111'
                        },
                        reference: null
                    };

                    expect(mockedNotifyService.sendEmail).toHaveBeenNthCalledWith(
                        1,
                        expectedActionData
                    );
                    expect(mockedNotifyService.sendEmail).toHaveBeenCalledTimes(1);
                    expect(actionResults).toEqual([
                        {status: 'fulfilled', value: {some: 'email response'}}
                    ]);
                });
            });
        });

        describe('With "sms" as the contact preference', () => {
            describe('And user role is applicant', () => {
                it('should send a confirmation sms to applicant:adult', async () => {
                    const application = templates['sexual-assault'](
                        '54fbbaaf-e199-47ce-a450-1813be6a5f5c'
                    );

                    application.answers = {
                        'p-applicant-confirmation-method': {
                            'q-applicant-confirmation-method': 'text',
                            'q-applicant-enter-your-telephone-number': '07700900000'
                        },
                        system: {
                            'case-reference': '11/111111'
                        }
                    };

                    const questionnaireService = createQuestionnaireService();
                    const actionResults = await Promise.allSettled(
                        await questionnaireService.runOnCompleteActions(application)
                    );
                    const expectedActionData = {
                        templateId: '3f1a741b-20de-4b0d-b8e8-224098291beb',
                        phoneNumber: '07700900000',
                        personalisation: {
                            caseReference: '11/111111'
                        },
                        reference: null
                    };

                    expect(actionResults).toEqual([
                        {status: 'fulfilled', value: {some: 'sms response'}}
                    ]);
                    expect(mockedNotifyService.sendSms).toHaveBeenCalledTimes(1);
                    expect(mockedNotifyService.sendSms).toHaveBeenCalledWith(expectedActionData);
                });
            });

            describe('And user role is mainapplicant', () => {
                it.each([
                    {
                        roles: ['mainapplicant', 'adult', 'incapable'],
                        templateId: '3e625f9f-75c4-4903-818e-220829bfc2af'
                    },
                    {
                        roles: ['mainapplicant', 'child'],
                        templateId: 'd2185426-2177-4049-a5b1-b9c6b12e1a79'
                    }
                ])('should send a confirmation sms to $roles', async ({roles, templateId}) => {
                    const application = templates['sexual-assault'](
                        '54fbbaaf-e199-47ce-a450-1813be6a5f5c'
                    );

                    application.answers = {
                        'p-mainapplicant-confirmation-method': {
                            'q-mainapplicant-confirmation-method': 'text',
                            'q-mainapplicant-enter-your-telephone-number': '07700900000'
                        },
                        system: {
                            'case-reference': '11/111111'
                        }
                    };
                    roles.forEach(role => setRole(role, application.answers));

                    const questionnaireService = createQuestionnaireService();
                    const actionResults = await Promise.allSettled(
                        await questionnaireService.runOnCompleteActions(application)
                    );
                    const expectedActionData = {
                        templateId,
                        phoneNumber: '07700900000',
                        personalisation: {
                            caseReference: '11/111111'
                        },
                        reference: null
                    };

                    expect(mockedNotifyService.sendSms).toHaveBeenNthCalledWith(
                        1,
                        expectedActionData
                    );
                    expect(mockedNotifyService.sendSms).toHaveBeenCalledTimes(1);
                    expect(actionResults).toEqual([
                        {status: 'fulfilled', value: {some: 'sms response'}}
                    ]);
                });
            });

            describe('And user role is rep', () => {
                it.each([
                    {
                        roles: ['rep.applicant:adult:capable'],
                        templateId: 'b51e5e19-f469-4f8a-a5a2-00499da6f027'
                    },
                    {
                        roles: ['rep.mainapplicant.applicant:adult:incapable', 'incapable'],
                        templateId: '94a82598-6f6b-4ad0-abc3-ad3a157eb4a3'
                    },
                    {
                        roles: ['rep.mainapplicant.applicant:child'],
                        templateId: '38047478-4b70-4add-b06c-62c7d93e8a23'
                    },
                    {
                        roles: ['rep:no-legal-authority.applicant', 'noauthority'],
                        templateId: '29674076-46ba-4150-adf0-5215c8fe8aa9'
                    }
                ])('should send a confirmation email to $roles', async ({roles, templateId}) => {
                    const application = templates['sexual-assault'](
                        '54fbbaaf-e199-47ce-a450-1813be6a5f5c'
                    );

                    application.answers = {
                        'p-rep-confirmation-method': {
                            'q-rep-confirmation-method': 'text',
                            'q-rep-enter-your-telephone-number': '07700900000'
                        },
                        system: {
                            'case-reference': '11/111111'
                        }
                    };
                    roles.forEach(role => setRole(role, application.answers));

                    const questionnaireService = createQuestionnaireService();
                    const actionResults = await Promise.allSettled(
                        await questionnaireService.runOnCompleteActions(application)
                    );
                    const expectedActionData = {
                        templateId,
                        phoneNumber: '07700900000',
                        personalisation: {
                            caseReference: '11/111111'
                        },
                        reference: null
                    };

                    expect(mockedNotifyService.sendSms).toHaveBeenNthCalledWith(
                        1,
                        expectedActionData
                    );
                    expect(mockedNotifyService.sendSms).toHaveBeenCalledTimes(1);
                    expect(actionResults).toEqual([
                        {status: 'fulfilled', value: {some: 'sms response'}}
                    ]);
                });
            });
        });
    });
});
