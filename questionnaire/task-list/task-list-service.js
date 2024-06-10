'use strict';

function createTaskListService() {
    function isTaskListSchema({sectionSchema, sectionId} = {}) {
        if (sectionSchema) {
            const pageType = sectionSchema?.meta?.pageType;
            if (pageType === 'task-list') {
                return true;
            }
        }

        // TODO: pass in the sectionSchema, not the sectionId. OR
        // TODO: get schema from sectionId and interrogate the shape instead of the IDs value.
        if (sectionId) {
            if (sectionId === 'p-task-list') {
                return true;
            }
        }

        return false;
    }

    function getInitialPageIdOfTask(taskId, questionnaireDefinition) {
        return questionnaireDefinition.routes.states[taskId].initial;
    }

    function decoratePageId(pageId) {
        if (pageId.startsWith('p--')) {
            return pageId.replace(/^p--/, 'info-');
        }
        return pageId.replace(/^p-/, '');
    }

    function getTaskStatus(taskId, questionnaireDefinition) {
        return questionnaireDefinition.routes.states[`${taskId}__completion-status`]
            .currentSectionId;
    }

    function addDataToTaskDefinitions(questionnaireDefinition, taskListSectionsDefinitions) {
        taskListSectionsDefinitions.forEach(taskListSectionDefinition => {
            taskListSectionDefinition.tasks.forEach(task => {
                task.href = decoratePageId(
                    getInitialPageIdOfTask(task.id, questionnaireDefinition)
                );
                task.status = getTaskStatus(task.id, questionnaireDefinition);
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
