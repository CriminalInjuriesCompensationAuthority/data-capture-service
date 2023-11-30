'use strict';

const createTaskRunner = require('./index');

const mockLogger = {
    error: jest.fn()
};

describe('Task Runner', () => {
    describe('createTaskRunner', () => {
        it('should run a task', async () => {
            const taskRunner = createTaskRunner({
                taskImplementations: {
                    simpleTaskFactory: async () => 'foo'
                }
            });

            const {task} = await taskRunner.run({
                id: 'task1',
                type: 'simpleTaskFactory'
            });

            expect(task.id).toEqual('task1');
            expect(task.status).toEqual('succeeded');
            expect(task.result).toEqual('foo');
        });

        it('should return a run context', async () => {
            const taskRunner = createTaskRunner({
                taskImplementations: {
                    simpleTaskFactory: async () => 'foo'
                }
            });
            const {context} = await taskRunner.run({
                id: 'task1',
                type: 'simpleTaskFactory'
            });
            const {task1} = context;

            expect(task1.id).toEqual('task1');
            expect(task1.status).toEqual('succeeded');
            expect(task1.result).toEqual('foo');
        });

        it('should allow access to the run context', async () => {
            const taskRunner = createTaskRunner({
                taskImplementations: {
                    simpleTaskFactory: async data => data.baz
                },
                context: {
                    foo: 'bar'
                }
            });

            const {task} = await taskRunner.run({
                id: 'task1',
                type: 'simpleTaskFactory',
                data: {
                    baz: '$.foo'
                }
            });

            expect(task.id).toEqual('task1');
            expect(task.status).toEqual('succeeded');
            expect(task.result).toEqual('bar');
        });

        it('should return an error if the task fails', async () => {
            let task;

            try {
                const taskRunner = createTaskRunner({
                    taskImplementations: {
                        simpleTaskFactory: async () => {
                            throw Error('foo');
                        }
                    },
                    context: {
                        logger: mockLogger
                    }
                });

                await taskRunner.run({
                    id: 'task1',
                    type: 'simpleTaskFactory',
                    retries: 0
                });
            } catch (err) {
                ({task} = err);
            }

            expect(task.id).toEqual('task1');
            expect(task.status).toEqual('failed');
            expect(task.result.message).toEqual('foo');
            expect(task.type).toEqual('simpleTaskFactory');
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
        });

        it('should retry the task if it fails', async () => {
            const defaultRetries = 2;
            let taskAttempts = 0;

            try {
                const taskRunner = createTaskRunner({
                    taskImplementations: {
                        simpleTaskFactory: async () => {
                            taskAttempts += 1;
                            throw Error('foo');
                        }
                    }
                });

                await taskRunner.run({
                    id: 'task1',
                    type: 'simpleTaskFactory'
                });
            } catch (err) {
                // no catch required
            }

            const expectedTaskAttempts = 1 + defaultRetries;

            expect(taskAttempts).toEqual(expectedTaskAttempts);
        });

        it('should allow retry default to be overridden when creating a task runner (defaults to 2)', async () => {
            const userDefinedRetriesForAllTasks = 1;
            let taskAttempts = 0;

            try {
                const taskRunner = createTaskRunner({
                    taskImplementations: {
                        simpleTaskFactory: async () => {
                            taskAttempts += 1;
                            throw Error('foo');
                        }
                    },
                    defaults: {
                        retries: userDefinedRetriesForAllTasks
                    }
                });

                await taskRunner.run({
                    id: 'task1',
                    type: 'simpleTaskFactory'
                });
            } catch (err) {
                // no catch required
            }

            const expectedTaskAttempts = 1 + userDefinedRetriesForAllTasks;

            expect(taskAttempts).toEqual(expectedTaskAttempts);
        });

        it('should allow retries to be set per task', async () => {
            const userDefinedRetriesForAllTasks = 3;
            const userDefinedRetriesForSpecificTask = 1;
            let taskAttempts = 0;

            try {
                const taskRunner = createTaskRunner({
                    taskImplementations: {
                        simpleTaskFactory: async () => {
                            taskAttempts += 1;
                            throw Error('foo');
                        }
                    },
                    defaults: {
                        retries: userDefinedRetriesForAllTasks
                    }
                });

                await taskRunner.run({
                    id: 'task1',
                    type: 'simpleTaskFactory',
                    retries: userDefinedRetriesForSpecificTask
                });
            } catch (err) {
                // no catch required
            }

            const expectedTaskAttempts = 1 + userDefinedRetriesForSpecificTask;

            expect(taskAttempts).toEqual(expectedTaskAttempts);
        });

        it('should allow 0 retries', async () => {
            const userDefinedRetries = 0;
            let taskAttempts = 0;

            try {
                const taskRunner = createTaskRunner({
                    taskImplementations: {
                        simpleTaskFactory: async () => {
                            taskAttempts += 1;
                            throw Error('foo');
                        }
                    },
                    defaults: {
                        retries: userDefinedRetries
                    }
                });

                await taskRunner.run({
                    id: 'task1',
                    type: 'simpleTaskFactory'
                });
            } catch (err) {
                // no catch required
            }

            expect(taskAttempts).toEqual(1);
        });

        it('should stop retrying the task if it succeeds', async () => {
            const retries = 10;
            const successfulTaskAttempt = 3;
            let taskAttempts = 0;

            try {
                const taskRunner = createTaskRunner({
                    taskImplementations: {
                        simpleTaskFactory: async () => {
                            taskAttempts += 1;

                            if (taskAttempts === successfulTaskAttempt) {
                                return 'foo';
                            }

                            throw Error('bar');
                        }
                    }
                });

                await taskRunner.run({
                    id: 'task1',
                    type: 'simpleTaskFactory',
                    retries
                });
            } catch (err) {
                // no catch required
            }

            expect(taskAttempts).toEqual(successfulTaskAttempt);
        });
    });
});
