import * as React from 'react';
import { useField } from 'formik';
import {
  ActionsMenu,
  ResourceIcon
} from '../../../../../../../public/components/utils';
import { referenceFor } from '../../../../../../../public/module/k8s';
import {
  getResourceModelFromTaskKind,
  PipelineResource,
  PipelineResourceTask,
  PipelineResourceTaskResource,
  PipelineTask,
  PipelineTaskParam,
  PipelineTaskResource
} from '../../../../utils/pipeline-augment';
import { getTaskParameters, getTaskResources } from '../../resource-utils';
import {
  ResourceTarget,
  TaskErrorMap,
  UpdateOperationUpdateTaskData
} from '../types';
import { TaskErrorType } from '../const';
import TaskSidebarParam from './TaskSidebarParam';
import TaskSidebarResource from './TaskSidebarResource';
import TaskSidebarName from './TaskSidebarName';

import './TaskSidebar.scss';

type TaskSidebarProps = {
  errorMap: TaskErrorMap;
  onRemoveTask: (taskName: string, t: any) => void;
  onUpdateTask: (data: UpdateOperationUpdateTaskData) => void;
  resourceList: PipelineResource[];
  selectedPipelineTaskIndex: number;
  taskResource: PipelineResourceTask;
  t: any;
};

const TaskSidebar: React.FC<TaskSidebarProps> = props => {
  const {
    errorMap,
    onRemoveTask,
    onUpdateTask,
    resourceList,
    selectedPipelineTaskIndex,
    taskResource,
    t
  } = props;
  const formikTaskReference = `tasks.${selectedPipelineTaskIndex}`;
  const [taskField] = useField<PipelineTask>(formikTaskReference);

  const updateTask = (newData: Partial<UpdateOperationUpdateTaskData>) => {
    onUpdateTask({
      thisPipelineTask: taskField.value,
      taskResource,
      ...newData
    });
  };

  const thisTaskError = errorMap[taskField.value.name];

  const params = getTaskParameters(taskResource);
  const resources = getTaskResources(taskResource);
  const inputResources = resources.inputs;
  const outputResources = resources.outputs;

  const renderResource = (type: ResourceTarget) => (
    resource: PipelineResourceTaskResource
  ) => {
    const taskResources: PipelineTaskResource[] =
      taskField.value?.resources?.[type] || [];
    const thisResource = taskResources.find(
      taskFieldResource => taskFieldResource.name === resource.name
    );

    return (
      <div key={resource.name} className="odc-task-sidebar__resource">
        <TaskSidebarResource
          availableResources={resourceList}
          onChange={(resourceName, selectedResource) => {
            updateTask({
              resources: {
                resourceTarget: type,
                selectedPipelineResource: selectedResource,
                taskResourceName: resourceName
              }
            });
          }}
          taskResource={thisResource}
          resource={resource}
        />
      </div>
    );
  };

  let _label = t('ADDITIONAL:DELETE', { something: t('RESOURCE:TASK') });
  return (
    <div className="odc-task-sidebar">
      <div className="odc-task-sidebar__header">
        <h1 className="co-m-pane__heading">
          <div className="co-m-pane__name co-resource-item">
            <ResourceIcon
              className="co-m-resource-icon--lg"
              kind={referenceFor(
                getResourceModelFromTaskKind(taskResource.kind)
              )}
            />
            <div
              style={{
                // float: 'right',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                width: '330px',
                height: '33px'
              }}
            >
              {taskResource.metadata.name}
            </div>
          </div>
          <div className="co-actions">
            <ActionsMenu
              actions={[
                {
                  // label: 'Remove Task',
                  label: _label,
                  callback: () => onRemoveTask(taskField.value.name, t)
                }
              ]}
            />
          </div>
        </h1>
      </div>
      <hr />

      <div className="odc-task-sidebar__content">
        <TaskSidebarName
          initialName={taskField.value.name}
          taskName={taskResource.metadata.name}
          onChange={newName => updateTask({ newName })}
        />

        {params && (
          <>
            <h2>{t('CONTENT:PARAMETERS')}</h2>
            {params.map(param => {
              const taskParams: PipelineTaskParam[] =
                taskField.value?.params || [];
              const thisParam = taskParams.find(
                taskFieldParam => taskFieldParam.name === param.name
              );
              return (
                <div key={param.name} className="odc-task-sidebar__param">
                  <TaskSidebarParam
                    hasParamError={
                      !!thisTaskError?.includes(
                        TaskErrorType.MISSING_REQUIRED_PARAMS
                      )
                    }
                    resourceParam={param}
                    taskParam={thisParam}
                    onChange={value => {
                      updateTask({
                        params: {
                          newValue: value,
                          taskParamName: param.name
                        }
                      });
                    }}
                  />
                </div>
              );
            })}
          </>
        )}

        {inputResources && (
          <>
            <h2>{t('CONTENT:INPUTRESOURCE')}</h2>
            {inputResources.map(renderResource('inputs'))}
          </>
        )}
        {outputResources && (
          <>
            <h2>{t('CONTENT:OUTPUTRESOURCE')}</h2>
            {outputResources.map(renderResource('outputs'))}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskSidebar;
