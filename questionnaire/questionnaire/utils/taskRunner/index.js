'use strict';

function getDataRef(ref, data) {
    if (typeof ref === 'string' && ref[0] === '$') {
        let objValue = data;

        for (let i = 1, keys = ref.split('.'), len = keys.length; i < len; i += 1) {
            objValue = objValue[keys[i]];
        }

        return objValue;
    }

    return ref;
}

async function wait(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

function mutateObjectValues({key, value, valueTransformers, isMutableObject, ignoreValue}) {
    if (ignoreValue && ignoreValue(value) === true) {
        return value;
    }

    if (isMutableObject(value)) {
        Object.entries(value).forEach(([k, v]) => {
            value[k] = mutateObjectValues({
                key: k,
                value: v,
                valueTransformers,
                isMutableObject,
                ignoreValue
            });
        });

        return value;
    }

    const mutatedValue = valueTransformers.reduce((acc, transformValue) => {
        return transformValue(key, acc);
    }, value);

    return mutatedValue;
}

function createTaskRunner({
    taskImplementations = {},
    context = {},
    defaults = {
        retries: 2
    }
}) {
    function hasTask(taskId) {
        return Object.hasOwn(taskImplementations, taskId);
    }

    function isMutableObject(value) {
        return value && typeof value === 'object' && hasTask(value.type) === false;
    }

    function ignoreValue(value) {
        return value && typeof value === 'object' && hasTask(value.type) === true;
    }

    async function run(
        factoryDefinition,
        {
            retries = factoryDefinition.retries === undefined
                ? defaults.retries
                : factoryDefinition.retries,
            retryCount = 0
        } = {}
    ) {
        const taskState = {
            id: factoryDefinition.id,
            type: factoryDefinition.type,
            started: new Date().toISOString(),
            ended: null,
            result: null
        };

        try {
            taskState.status = 'running';

            const factory = taskImplementations[factoryDefinition.type];

            if (factoryDefinition.data !== undefined) {
                mutateObjectValues({
                    value: factoryDefinition.data,
                    valueTransformers: [
                        (k, v) => {
                            return getDataRef(v, context);
                        }
                    ],
                    isMutableObject,
                    ignoreValue
                });
            }

            taskState.result = await factory(factoryDefinition.data, run, context);
            taskState.status = 'succeeded';
            taskState.ended = new Date().toISOString();
            context[taskState.id] = taskState;

            return {
                task: taskState,
                context
            };
        } catch (err) {
            taskState.status = 'failed';
            taskState.ended = new Date().toISOString();
            taskState.result = err;

            // eslint-disable-next-line no-param-reassign
            retryCount += 1;
            if (retryCount <= retries) {
                const exponentialDelayInMillieseconds = 10 ** retryCount;
                await wait(exponentialDelayInMillieseconds);
                return run(factoryDefinition, {
                    retries,
                    retryCount
                });
            }

            context[taskState.id] = taskState;
            const {logger} = context;
            logger.error(err);

            // eslint-disable-next-line no-throw-literal
            throw {
                task: taskState,
                context
            };
        }
    }

    return Object.freeze({
        run
    });
}

module.exports = createTaskRunner;
