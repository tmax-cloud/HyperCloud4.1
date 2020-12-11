import * as _ from 'lodash-es';
import * as React from 'react';
import { connect } from 'react-redux';
import { Tooltip } from './utils/tooltip';
import { Link } from 'react-router-dom';
import * as fuzzy from 'fuzzysearch';

import { NamespaceModel, ProjectModel, SecretModel } from '../models';
import { k8sGet } from '../module/k8s';
import { UIActions } from '../ui/ui-actions';
import { ColHead, DetailsPage, List, ListHeader, ListPage, ResourceRow } from './factory';
import { SafetyFirst } from './safety-first';
import { Cog, Dropdown, Firehose, LabelList, LoadingInline, navFactory, ResourceCog, SectionHeading, ResourceLink, ResourceSummary, humanizeMem, MsgBox } from './utils';
import { /* createNamespaceModal, */ createProjectModal, deleteNamespaceModal, configureNamespacePullSecretModal } from './modals';
import { RoleBindingsPage } from './RBAC';
import { Bar, Line, requirePrometheus } from './graphs';
import { ALL_NAMESPACES_KEY } from '../const';
import { FLAGS, featureReducerName, flagPending, setFlag, connectToFlags } from '../features';
import { openshiftHelpBase } from './utils/documentation';
import { createProjectMessageStateToProps } from '../ui/ui-reducers';
import { useTranslation } from 'react-i18next';
import { ResourcePlural } from './utils/lang/resource-plural';
// import { MeteringPage } from './metering-overview';
import { getAccessToken } from './utils/auth';

const getModel = useProjects => (useProjects ? ProjectModel : NamespaceModel);
const getDisplayName = obj => _.get(obj, ['metadata', 'annotations', 'openshift.io/display-name']);
const getRequester = obj => _.get(obj, ['metadata', 'annotations', 'openshift.io/requester']);

const deleteModal = (kind, ns) => {
  let { label, weight } = Cog.factory.Delete(kind, ns);
  let callback = undefined;
  let tooltip;
  const { t } = useTranslation();

  if (ns.metadata.name === 'default') {
    tooltip = `${kind.label} default cannot be deleted`;
  } else if (ns.status.phase === 'Terminating') {
    tooltip = `${kind.label} is already terminating`;
  } else {
    callback = () => deleteNamespaceModal({ kind, resource: ns, t });
  }
  if (tooltip) {
    label = (
      <div className="dropdown__disabled">
        <Tooltip content={tooltip}>{label}</Tooltip>
      </div>
    );
  }
  return { label, weight, callback };
};

const nsMenuActions = [Cog.factory.ModifyLabels, Cog.factory.ModifyAnnotations, Cog.factory.Edit, deleteModal];

const NamespaceHeader = props => {
  const { t } = useTranslation();
  return (
    <ListHeader>
      <ColHead {...props} className="col-sm-3 col-xs-6" sortField="metadata.name">
        {t('CONTENT:NAME')}
      </ColHead>
      <ColHead {...props} className="col-sm-3 col-xs-6" sortField="status.phase">
        {t('CONTENT:STATUS')}
      </ColHead>
      <ColHead {...props} className="col-sm-3 col-xs-6" sortField="metadata.labels.mailSendDate">
        {t('CONTENT:TRIALTIME')}
      </ColHead>
      <ColHead {...props} className="col-sm-3 hidden-xs" sortField="metadata.labels">
        {t('CONTENT:LABELS')}
      </ColHead>
    </ListHeader>
  );
};

const TrialTime = ns => {
  console.log(ns.metadata.labels);
  if (ns.metadata.labels && ns.metadata.labels.trial) {
    let createTime = new Date(ns.metadata.creationTimestamp.iMillis);
    let endTime = ns.metadata.labels.period ? new Date(ns.metadata.creationTimestamp.iMillis + 30 * 1000 * 60 * 60 * 24 * Number(ns.metadata.labels.period)) : new Date(ns.metadata.creationTimestamp.iMillis + 30 * 1000 * 60 * 60 * 24);
    let start = `${String(createTime.getFullYear())}-${String(createTime.getMonth() + 1)}-${String(createTime.getDate())}`;
    let end = ns.metadata.labels.deletionDate ? ns.metadata.labels.deletionDate.split('T')[0] : `${String(endTime.getFullYear())}-${String(endTime.getMonth() + 1)}-${String(endTime.getDate())}`;
    return `${start} ~ ${end}`;
  }
  return '';
};

const NamespaceRow = ({ obj: ns }) => {
  let period = TrialTime(ns);
  return (
    <ResourceRow obj={ns}>
      <div className="col-sm-3 col-xs-6 co-resource-link-wrapper">
        <ResourceCog actions={nsMenuActions} kind="Namespace" resource={ns} />
        <ResourceLink kind="Namespace" name={ns.metadata.name} title={ns.metadata.uid} />
      </div>
      <div className="col-sm-3 col-xs-6 co-break-word">{ns.status.phase}</div>
      <div className="col-sm-3 col-xs-6 co-break-word">{period}</div>
      <div className="col-sm-3 hidden-xs">
        <LabelList kind="Namespace" labels={ns.metadata.labels} />
      </div>
    </ResourceRow>
  );
};

export const NamespacesList = props => <List {...props} Header={NamespaceHeader} Row={NamespaceRow} />;
export const NamespacesPage = props => {
  const { t } = useTranslation();
  const createItems = {
    form: t('CONTENT:FORMEDITOR'),
    yaml: t('CONTENT:YAMLEDITOR'),
  };

  const createProps = {
    items: createItems,
    createLink: type => `/k8s/cluster/namespaces/new${type !== 'yaml' ? `/${type}` : ''}`,
  };

  // Modal 주석처리
  // return <ListPage {...props} ListComponent={NamespacesList} canCreate={true} createHandler={createNamespaceModal} createButtonText={t('ADDITIONAL:CREATEBUTTON', { something: ResourcePlural(props.kind, t) })} />;
  return <ListPage {...props} ListComponent={NamespacesList} canCreate={true} createProps={createProps} createButtonText={t('ADDITIONAL:CREATEBUTTON', { something: ResourcePlural(props.kind, t) })} />;
};

const projectMenuActions = [Cog.factory.Edit, deleteModal];

const ProjectHeader = props => (
  <ListHeader>
    <ColHead {...props} className="col-md-3 col-sm-6 col-xs-8" sortField="metadata.name">
      Name
    </ColHead>
    <ColHead {...props} className="col-md-3 col-sm-3 col-xs-4" sortField="status.phase">
      Status
    </ColHead>
    <ColHead {...props} className="col-md-3 col-sm-3 hidden-xs" sortField="metadata.annotations.['openshift.io/requester']">
      Requester
    </ColHead>
    <ColHead {...props} className="col-md-3 hidden-sm hidden-xs" sortField="metadata.labels">
      Labels
    </ColHead>
  </ListHeader>
);

const ProjectRow = ({ obj: project }) => {
  const displayName = getDisplayName(project);
  const requester = getRequester(project);
  return (
    <ResourceRow obj={project}>
      <div className="col-md-3 col-sm-6 col-xs-8 co-resource-link-wrapper">
        <ResourceCog actions={projectMenuActions} kind="Project" resource={project} />
        <ResourceLink kind="Project" name={project.metadata.name} title={displayName || project.metadata.uid} />
      </div>
      <div className="col-md-3 col-sm-3 col-xs-4">{project.status.phase}</div>
      <div className="col-md-3 col-sm-3 hidden-xs">{requester || <span className="text-muted">No requester</span>}</div>
      <div className="col-md-3 hidden-sm hidden-xs">
        <LabelList kind="Project" labels={project.metadata.labels} />
      </div>
    </ResourceRow>
  );
};

const ProjectList_ = props => {
  const ProjectEmptyMessageDetail = (
    <React.Fragment>
      <p className="co-pre-line">{props.createProjectMessage || 'Create a project for your application.'}</p>
      <p>
        To learn more, visit the OpenShift{' '}
        <a href={openshiftHelpBase} target="_blank" rel="noopener noreferrer">
          documentation
        </a>
        .
      </p>
    </React.Fragment>
  );
  const ProjectEmptyMessage = () => <MsgBox title="Welcome to OpenShift" detail={ProjectEmptyMessageDetail} />;
  return <List {...props} Header={ProjectHeader} Row={ProjectRow} EmptyMsg={ProjectEmptyMessage} />;
};
export const ProjectList = connect(createProjectMessageStateToProps)(ProjectList_);

const ProjectsPage_ = props => {
  const canCreate = props.flags.CAN_CREATE_PROJECT;
  return <ListPage {...props} ListComponent={ProjectList} canCreate={canCreate} createHandler={createProjectModal} />;
};
export const ProjectsPage = connectToFlags(FLAGS.CAN_CREATE_PROJECT)(ProjectsPage_);

class PullSecret extends SafetyFirst {
  constructor(props) {
    super(props);
    this.state = { isLoading: true, data: undefined };
  }

  componentDidMount() {
    super.componentDidMount();
    this.load(_.get(this.props, 'namespace.metadata.name'));
  }

  load(namespaceName) {
    if (!namespaceName) {
      return;
    }
    k8sGet(SecretModel, null, namespaceName, { queryParams: { fieldSelector: 'type=kubernetes.io/dockerconfigjson' } })
      .then(pullSecrets => {
        this.setState({ isLoading: false, data: _.get(pullSecrets, 'items[0]') });
      })
      .catch(error => {
        this.setState({ isLoading: false, data: undefined });

        // A 404 just means that no pull secrets exist
        if (error.status !== 404) {
          throw error;
        }
      });
  }

  render() {
    if (this.state.isLoading) {
      return <LoadingInline />;
    }
    const { t } = this.props;
    const modal = () => configureNamespacePullSecretModal({ namespace: this.props.namespace, pullSecret: this.state.data, t: t });

    return (
      <a className="co-m-modal-link" onClick={modal}>
        {_.get(this.state.data, 'metadata.name') || t('CONTENT:NOTCONFIGURED')}
      </a>
    );
  }
}

const ResourceUsage = requirePrometheus(({ ns }) => {
  const { t } = useTranslation();
  return (
    <div className="co-m-pane__body">
      <SectionHeading text={t('CONTENT:RESOURCEUSAGE')} />
      <div className="row">
        <div className="col-sm-6 col-xs-12">
          <Line
            title={t('CONTENT:CPUSHARES')}
            query={[
              {
                name: 'Used',
                query: `namespace:container_spec_cpu_shares:sum{namespace='${ns.metadata.name}'}`,
              },
            ]}
          />
        </div>
        <div className="col-sm-6 col-xs-12">
          <Line
            title={t('CONTENT:RAM')}
            query={[
              {
                name: 'Used',
                query: `namespace:container_memory_usage_bytes:sum{namespace='${ns.metadata.name}'}`,
              },
            ]}
          />
        </div>
      </div>
      <Bar title={t('CONTENT:MEMORYUSAGEBYPOD(TOP10)')} query={`sort(topk(10,sum(container_memory_usage_bytes{container_name!="POD",pod!="",namespace="${ns.metadata.name}"})by(pod,namespace)))`} humanize={humanizeMem} metric="pod" />
    </div>
  );
});

const Details = ({ obj: ns }) => {
  const displayName = getDisplayName(ns);
  const requester = getRequester(ns);
  const { t } = useTranslation();
  return (
    <div>
      <div className="co-m-pane__body">
        <SectionHeading text={t('ADDITIONAL:OVERVIEWTITLE', { something: ResourcePlural('NAMESPACE', t) })} />
        <div className="row">
          <div className="col-sm-6 col-xs-12">
            <ResourceSummary resource={ns} showPodSelector={false} showNodeSelector={false}>
              {displayName && <dt>{t('CONTENT:DISPLAYNAME')}</dt>}
              {displayName && <dd>{displayName}</dd>}
              {requester && <dt>{t('CONTENT:REQUESTER')}</dt>}
              {requester && <dd>{requester}</dd>}
            </ResourceSummary>
          </div>
          <div className="col-sm-6 col-xs-12">
            <dl className="co-m-pane__details">
              <dt>{t('CONTENT:STATUS')}</dt>
              <dd>{ns.status.phase}</dd>
              <dt>{t('CONTENT:DEFAULTPULLSECRET')}</dt>
              <dd>
                <PullSecret namespace={ns} t={t} />
              </dd>
              <dt>{t('CONTENT:NETWORKPOLICIES')}</dt>
              <dd>
                <Link to={`/k8s/ns/${ns.metadata.name}/networkpolicies`}>{t('CONTENT:NETWORKPOLICIES')}</Link>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <ResourceUsage ns={ns} />
    </div>
  );
};

const RolesPage = ({ obj: { metadata } }) => <RoleBindingsPage namespace={metadata.name} showTitle={false} />;

const Metering = ({ obj: { metadata } }) => {
  const { t } = useTranslation();
  const [timeUnit, setTimeUnit] = React.useState('hour', '');
  return (
    <div className="co-m-pane__body">
      <SectionHeading text={t('CONTENT:METERING')} />
      <div style={{ float: 'right' }}>
        <select name="timeUnit" onChange={e => setTimeUnit(e.target.value)}>
          <option value="hour">{t('CONTENT:HOUR')}</option>
          <option value="day">{t('CONTENT:DAY')}</option>
          <option value="month">{t('CONTENT:MONTH')}</option>
          <option value="year">{t('CONTENT:YEAR')}</option>
        </select>
      </div>
      <MeteringPage namespace={metadata.name} showTitle={false} timeUnit={timeUnit} />
    </div>
  );
};

const autocompleteFilter = (text, item) => fuzzy(text, item);

const namespaceDropdownStateToProps = state => {
  const activeNamespace = state.UI.get('activeNamespace');
  const canListNS = state[featureReducerName].get(FLAGS.CAN_LIST_NS);

  return { activeNamespace, canListNS };
};

const NamespaceSelectorComponent = ({ activeNamespace, items, model, title, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="co-namespace-selector">
      {!(!localStorage.getItem('bridge/last-namespace-name') && activeNamespace === 'default') && <Dropdown className="co-namespace-selector__dropdown" menuClassName="co-namespace-selector__menu" noButton items={items} titlePrefix={t(`RESOURCE:${model.kind.toUpperCase()}`)} title={title} onChange={onChange} selectedKey={activeNamespace || ALL_NAMESPACES_KEY} autocompleteFilter={autocompleteFilter} autocompletePlaceholder={t('CONTENT:SELECTNAMESPACE')} shortCut="n" />}
    </div>
  );
};

class NamespaceDropdown_ extends React.Component {
  componentDidUpdate() {
    const { dispatch } = this.props;
    // if (namespace.loaded) {
    // const projectsAvailable = !_.isEmpty(namespace.data);
    setFlag(dispatch, FLAGS.PROJECTS_AVAILABLE, true);
    // }
  }

  render() {
    let { activeNamespace, dispatch, canListNS, useProjects } = this.props; // 상수였는데 user 계정에서의 namespace 변경을 위해 변수처리함.
    if (flagPending(canListNS)) {
      return null;
    }

    const { loaded, data, loadError } = this.props.namespace;
    const model = getModel(useProjects);
    const allNamespacesTitle = `all ${model.labelPlural.toLowerCase()}`;
    const items = {};

    if (loadError && loadError.response && loadError.response.status === 403) {
      if (!window.location.href.includes('roles') && !window.location.href.includes('rolebindings') && !window.location.href.includes('tasks')) {
        // if (window.SERVER_FLAGS.HDCModeFlag) {
        //   // HDC 모드에서 할당된 네임 스페이스 없는 경우 Trial 신청 화면으로 리다이렉트하는 로직 추가
        //   window.location.href = window.SERVER_FLAGS.TmaxCloudPortalURL + '/#!/pricing/policy/trial';
        //   return;
        // } else {
        // }
        window.location.href = '/noNamespace';
      }
    }

    if (canListNS) {
      items[ALL_NAMESPACES_KEY] = allNamespacesTitle;
      // if (!localStorage.getItem('bridge/last-namespace-name')) {
      //   activeNamespace = '#ALL_NS#';
      // }
    }
    _.map(data, 'metadata.name')
      .sort()
      .forEach(name => {
        items[name] = name;
      });

    if (data.length > 1) {
      // 객체는 iterable한 값이 아니어서 최상위 값을 고를 수가 없음 그래서 data를 다시 sorting해서 그 첫번째 값을 선택되는 namespace로 지정
      data.sort(function(a, b) {
        return a.metadata.name < b.metadata.name ? -1 : a.metadata.name > b.metadata.name ? 1 : 0;
      });
    }

    let title = activeNamespace;
    if (getAccessToken()) {
      if (activeNamespace === ALL_NAMESPACES_KEY) {
        title = allNamespacesTitle;
      }
    }

    if (!localStorage.getItem('bridge/last-namespace-name') && loaded) {
      if (!canListNS) {
        activeNamespace = data[0].metadata.name;
        // localStorage.setItem('bridge/last-namespace-name', activeNamespace);
        dispatch(UIActions.setActiveNamespace(activeNamespace));
      } else {
        activeNamespace = allNamespacesTitle;
        // localStorage.setItem('bridge/last-namespace-name', activeNamespace);
        dispatch(UIActions.setActiveNamespace('#ALL_NS#'));
      }
      localStorage.setItem('bridge/last-namespace-name', activeNamespace);
    }
    const onChange = newNamespace => dispatch(UIActions.setActiveNamespace(newNamespace));
    return loaded && <NamespaceSelectorComponent model={model} items={items} title={title} activeNamespace={activeNamespace} onChange={onChange} selectedKey={title} />;
  }
}

const MeteringPage = requirePrometheus(props => {
  let timeUnit = props.timeUnit;
  const { t } = useTranslation();
  return (
    <div className="co-m-pane__body">
      <div className="row">
        <div className="col-md-4">
          <Line
            title={t('CONTENT:CPUSHARES')}
            query={[
              {
                name: 'Used',
                query: 'cpu',
                timeUnit: timeUnit,
              },
            ]}
          />
        </div>
        <div className="col-md-4">
          <Line
            title={t('CONTENT:MEMORY')}
            query={[
              {
                name: 'Used',
                query: 'memory',
                timeUnit: timeUnit,
              },
            ]}
          />
        </div>
        <div className="col-md-4">
          <Line
            title={t('CONTENT:STORAGE')}
            query={[
              {
                name: 'Used',
                query: 'storage',
                timeUnit: timeUnit,
              },
            ]}
          />
        </div>
        <div className="col-md-4">
          <Line
            title={t('CONTENT:LOADBALANCERIP')}
            query={[
              {
                name: 'Used',
                query: 'publicIp',
                timeUnit: timeUnit,
              },
            ]}
          />
        </div>
        <div className="col-md-4">
          <Line
            title={t('CONTENT:GPU')}
            query={[
              {
                name: 'Used',
                query: 'gpu',
                timeUnit: timeUnit,
              },
            ]}
          />
        </div>
      </div>
      {/* </div>
  {/* <Bar title="Memory Usage by Pod (Top 10)" query={`sort(topk(10, sum by (pod_name)(container_memory_usage_bytes{pod_name!="", namespace="${props.namespace}"})))`} humanize={humanizeMem} metric="pod_name" /> */}
    </div>
  );
});

const NamespaceDropdown = connect(namespaceDropdownStateToProps)(NamespaceDropdown_);

const NamespaceSelector_ = ({ useProjects, inFlight }) =>
  inFlight ? (
    <div className="co-namespace-selector" />
  ) : (
    <Firehose resources={[{ kind: getModel(useProjects).kind, prop: 'namespace', isList: true }]}>
      <NamespaceDropdown useProjects={useProjects} />
    </Firehose>
  );

const namespaceSelectorStateToProps = ({ k8s }) => ({
  inFlight: k8s.getIn(['RESOURCES', 'inFlight']),
  useProjects: k8s.hasIn(['RESOURCES', 'models', ProjectModel.kind]),
});

export const NamespaceSelector = connect(namespaceSelectorStateToProps)(NamespaceSelector_);

export const NamespacesDetailsPage = props => {
  const { t } = useTranslation();
  return <DetailsPage {...props} menuActions={nsMenuActions} pages={[navFactory.details(Details, t('CONTENT:OVERVIEW')), navFactory.editYaml(), navFactory.roles(t('CONTENT:ROLES'), RolesPage), navFactory.metering(t('CONTENT:METERING'), Metering)]} />;
};

export const ProjectsDetailsPage = props => <DetailsPage {...props} menuActions={projectMenuActions} pages={[navFactory.details(Details), navFactory.editYaml(), navFactory.roles(RolesPage)]} />;
