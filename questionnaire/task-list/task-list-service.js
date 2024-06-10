'use strict';

function createTaskListService() {
    function isTaskListSchema({sectionSchema, sectionId} = {}) {
        if (sectionSchema) {
            const schemaProperties = sectionSchema?.properties;
            if (schemaProperties && 'task-list' in schemaProperties) {
                return true;
            }
        }

        // TODO: get schema from sectionId and interogate the shape instead of the IDs value.
        if (sectionId) {
            if (sectionId === 'p-task-list') {
                return true;
            }
        }

        // // asumed to be a state from the router...
        // const state = schemaDefinition;

        // if (state.id === 'p-task-list') {
        //     const taskListSchemaProperties = state?.context?.sections[state.id].schema.properties;
        //     if (taskListSchemaProperties && 'task-list' in taskListSchemaProperties) {
        //         return true;
        //     }
        // }

        return false;
    }

    function getInitialPageIdOfTask(taskId, questionnaireDefinition) {
        const taskDefinition = questionnaireDefinition.routes.states.find(state => {
            return state.id === taskId;
        });
        return taskDefinition.initial;
    }

    function decoratePageId(pageId) {
        if (pageId.startsWith('p--')) {
            return pageId.replace(/^p--/, 'info-');
        }
        return pageId.replace(/^p-/, '');
    }

    function addDataToTaskDefinitions(questionnaireDefinition, taskListSectionsDefinitions) {
        taskListSectionsDefinitions.forEach(taskListSectionDefinition => {
            taskListSectionDefinition.tasks.forEach(task => {
                task.href = decoratePageId(
                    getInitialPageIdOfTask(task.id, questionnaireDefinition)
                );
            });
        });
    }

    function UpdateTaskListSchema(questionnaireDefinition, templateSectionDefinition) {
        const taskListSectionsDefinitions =
            templateSectionDefinition.schema.properties['task-list'].properties.taskListInfo
                .sections;
        addDataToTaskDefinitions(questionnaireDefinition, taskListSectionsDefinitions);
    }

    return Object.freeze({
        isTaskListSchema,
        UpdateTaskListSchema
    });
}

module.exports = createTaskListService;
