import * as _ from 'lodash-es';
import * as React from 'react';

import { ColHead, DetailsPage, List, ListHeader, ListPage } from './factory';
import { Cog, navFactory, ResourceCog, SectionHeading, ResourceLink, ResourceSummary, ScrollToTopOnMount, Firehose, LoadingBox } from './utils';
import { fromNow } from './utils/datetime';
import { useTranslation } from 'react-i18next';
import { ResourcePlural } from './utils/lang/resource-plural';
import { WorkflowVisualization } from '../../packages/dev-console/src/components/pipelineruns/detail-page-tabs/WorkflowVisualization';

const menuActions = [...Cog.factory.common];

const WorkflowHeader = props => {
  const { t } = useTranslation();
  return (
    <ListHeader>
      <ColHead {...props} className="col-xs-2 col-sm-2" sortField="metadata.name">
        {t('CONTENT:NAME')}
      </ColHead>
      <ColHead {...props} className="col-xs-2 col-sm-2" sortField="metadata.namespace">
        {t('CONTENT:NAMESPACE')}
      </ColHead>
      <ColHead {...props} className="col-xs-2 col-sm-2" sortField="status.status">
        {t('CONTENT:STATUS')}
      </ColHead>
      <ColHead {...props} className="col-sm-2 hidden-xs" sortField="metadata.creationTimestamp">
        {t('CONTENT:STARTTIME')}
      </ColHead>
      <ColHead {...props} className="col-sm-2 hidden-xs" sortField="obj.status.finishedAt">
        {t('CONTENT:ENDTIME')}
      </ColHead>
    </ListHeader>
  );
};

const WorkflowRow = () =>
  // eslint-disable-next-line no-shadow
  function WorkflowRow({ obj }) {
    return (
      <div className="row co-resource-list__item">
        <div className="col-xs-2 col-sm-2 co-resource-link-wrapper">
          <ResourceCog actions={menuActions} kind="Workflow" resource={obj} />
          <ResourceLink kind="Workflow" name={obj.metadata.name} namespace={obj.metadata.namespace} title={obj.metadata.name} />
        </div>
        <div className="col-xs-2 col-sm-2 co-break-word">{obj.metadata.namespace}</div>
        <div className="col-xs-2 col-sm-2 co-break-word">{obj.status.phase}</div>
        <div className="col-xs-2 col-sm-2 hidden-xs">{obj.metadata.creationTimestamp ? fromNow(obj.metadata.creationTimestamp) : ''}</div>
        <div className="col-xs-2 col-sm-2 hidden-xs">{obj.status.finishedAt ? fromNow(obj.status.finishedAt) : ''}</div>
      </div>
    );
  };

export const WorkflowTemplateRef = ({ workflowTemplateRef, workflow }) => {
  workflowTemplateRef.data.status = workflow.status; // 상태값은 workflow에서 가져옴
  if (!workflowTemplateRef.loaded) {
    return <LoadingBox className="loading-box loading-box__loading" />;
  }
  return (
    <div className="co-m-pane__body">
      <WorkflowVisualization workflow={workflowTemplateRef.data} />
    </div>
  );
};

const WorkflowGraph = ({ obj }) => {
  if (obj.spec.workflowTemplateRef) {
    // workflowTempalteRef 가 있는 경우 workflowTemplate을 조회하여 graph 표현
    // 상태값은 workflow 객체에서 가져옴
    const resources = [
      {
        kind: 'WorkflowTemplate',
        name: obj.spec.workflowTemplateRef.name,
        namespace: obj.metadata.namespace,
        prop: 'workflowTemplateRef',
      },
    ];
    return (
      <Firehose resources={resources}>
        <WorkflowTemplateRef workflow={obj} />
      </Firehose>
    );
  }
  return (
    <div className="co-m-pane__body">
      <WorkflowVisualization workflow={obj} />
    </div>
  );
};

const Details = ({ obj: workflow }) => {
  const { t } = useTranslation();
  return (
    <React.Fragment>
      <ScrollToTopOnMount />
      <div className="co-m-pane__body">
        <SectionHeading text={t('ADDITIONAL:OVERVIEWTITLE', { something: ResourcePlural('Workflow', t) })} />
        <div className="row">
          <div className="col-sm-6">
            <ResourceSummary resource={workflow} />
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export const WorkflowList = props => {
  const { kinds } = props;
  const Row = WorkflowRow(kinds[0]);
  Row.displayName = 'WorkflowRow';
  return <List {...props} Header={WorkflowHeader} Row={Row} />;
};
WorkflowList.displayName = WorkflowList;

export const WorkflowPage = props => {
  const { t } = useTranslation();
  return <ListPage {...props} ListComponent={WorkflowList} createButtonText={t('ADDITIONAL:CREATEBUTTON', { something: ResourcePlural(props.kind, t) })} canCreate={true} kind="Workflow" />;
};
WorkflowPage.displayName = 'WorkflowPage';

export const WorkflowDetailsPage = props => {
  const { t } = useTranslation();
  return (
    <DetailsPage
      {...props}
      kind="Workflow"
      menuActions={menuActions}
      pages={[
        navFactory.details(Details, t('CONTENT:OVERVIEW')),
        {
          href: 'workflow',
          name: t('RESOURCE:WORKFLOW'),
          component: WorkflowGraph,
        },
        navFactory.editYaml(),
      ]}
    />
  );
};

WorkflowDetailsPage.displayName = 'WorkflowDetailsPage';
