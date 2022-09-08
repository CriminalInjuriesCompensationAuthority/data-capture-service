'use strict';

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

            mockedNotifyService.sendSms.mockRejectedValue({
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
