import * as _ from 'lodash-es';
import * as React from 'react';
import { isNodeReady, makeNodeSchedulable } from '../module/k8s/node';
import { ResourceEventStream } from './events';
import { ColHead, DetailsPage, List, ListHeader, ListPage, ResourceRow } from './factory';
import { configureUnschedulableModal } from './modals';
import { PodsPage } from './pod';
import { Cog, navFactory, LabelList, ResourceCog, SectionHeading, ResourceLink, Timestamp, units, cloudProviderNames, cloudProviderID, pluralize, containerLinuxUpdateOperator } from './utils';
import { Line, requirePrometheus } from './graphs';
import { NodeModel } from '../models';
import { CamelCaseWrap } from './utils/camel-case-wrap';
import { useTranslation } from 'react-i18next';
import { ResourcePlural } from './utils/lang/resource-plural';
import { fromNow } from './utils/datetime';

const MarkAsUnschedulable = (kind, obj) => {
  const { t } = useTranslation();
  return {
    label: t('CONTENT:MARKASUNSCHEDULABLE'),
    hidden: _.get(obj, 'spec.unschedulable'),
    callback: () => configureUnschedulableModal({ resource: obj, t: t }),
  };
};

const MarkAsSchedulable = (kind, obj) => {
  const { t } = useTranslation();
  return {
    label: t('CONTENT:MARKASSCHEDULABLE'),
    hidden: !_.get(obj, 'spec.unschedulable', false),
    callback: () => makeNodeSchedulable(obj),
  };
};

const menuActions = [MarkAsSchedulable, MarkAsUnschedulable, Cog.factory.ModifyLabels, Cog.factory.ModifyAnnotations, Cog.factory.Edit];

const NodeCog = ({ node }) => <ResourceCog actions={menuActions} kind="Node" resource={node} />;

const NodeIPList = ({ ips, expand = false }) => (
  <div>
    {_.sortBy(ips, ['type']).map((ip, i) => (
      <div key={i} className="co-node-ip">
        {(expand || ip.type === 'InternalIP') && (
          <p>
            <span className="co-ip-type">{ip.type.replace(/([a-z])([A-Z])/g, '$1 $2')}: </span>
            <span className="co-ip-addr">{ip.address}</span>
          </p>
        )}
      </div>
    ))}
  </div>
);

const Header = props => {
  const { t } = useTranslation();
  if (!props.data) {
    return null;
  }
  return (
    <ListHeader>
      <ColHead {...props} className="col-xs-4" sortField="metadata.name">
        {t('CONTENT:NODENAME')}
      </ColHead>
      <ColHead {...props} className="col-sm-2 col-xs-4" sortFunc="nodeReadiness">
        {t('CONTENT:STATUS')}
      </ColHead>
      <ColHead {...props} className="col-sm-3 col-xs-4" sortFunc="nodeUpdateStatus">
        {t('CONTENT:OSUPDATE')}
      </ColHead>
      <ColHead {...props} className="col-sm-3 hidden-xs" sortField="status.addresses">
        {t('CONTENT:NODEADDRESSES')}
      </ColHead>
    </ListHeader>
  );
};

const HeaderSearch = props => {
  const { t } = useTranslation();
  return (
    <ListHeader>
      <ColHead {...props} className="col-lg-2 col-md-3 col-sm-4 col-xs-5" sortField="metadata.name">
        {t('CONTENT:NODENAME')}
      </ColHead>
      <ColHead {...props} className="col-md-2 hidden-sm hidden-xs" sortFunc="nodeReadiness">
        {t('CONTENT:STATUS')}
      </ColHead>
      <ColHead {...props} className="col-sm-5 col-xs-7" sortField="metadata.labels">
        {t('CONTENT:NODELABELS')}
      </ColHead>
      <ColHead {...props} className="col-md-2 col-sm-3 hidden-xs" sortField="status.addresses">
        {t('CONTENT:NODEADDRESSES')}
      </ColHead>
    </ListHeader>
  );
};

const NodeStatus = ({ node }) => {
  // const { t } = useTranslation();
  return isNodeReady(node) ? (
    <span className="node-ready">
      <i className="fa fa-check"></i>
      {/* {t('CONTENT:READY')} */}
      Ready
    </span>
  ) : (
    <span className="node-not-ready">
      <i className="fa fa-minus-circle"></i>
      {/* {t('CONTENT:NOTREADY')} */}
      Not Ready
    </span>
  );
};
const NodeCLUpdateStatus = ({ node }) => {
  const updateStatus = containerLinuxUpdateOperator.getUpdateStatus(node);
  const newVersion = containerLinuxUpdateOperator.getNewVersion(node);
  const lastCheckedDate = containerLinuxUpdateOperator.getLastCheckedTime(node);
  const { t } = useTranslation();
  return (
    <div>
      {updateStatus ? (
        <span>
          {updateStatus.className && (
            <span>
              <i className={updateStatus.className}></i>&nbsp;&nbsp;
            </span>
          )}
          {updateStatus.text}
        </span>
      ) : null}
      {!_.isEmpty(newVersion) && !containerLinuxUpdateOperator.isSoftwareUpToDate(node) && (
        <div>
          <small className="">
            Container Linux {containerLinuxUpdateOperator.getVersion(node)} &#10141; {newVersion}
          </small>
        </div>
      )}
      {lastCheckedDate && containerLinuxUpdateOperator.isSoftwareUpToDate(node) && (
        <div>
          <small className="">
            {/* Last checked on <div className="co-inline-block">{<Timestamp timestamp={lastCheckedData} isUnix={true} />}</div> */}
            Last checked on <div className="co-inline-block">{fromNow(lastCheckedDate)}</div>
          </small>
        </div>
      )}
    </div>
  );
};

const NodeCLStatusRow = ({ node }) => {
  const updateStatus = containerLinuxUpdateOperator.getUpdateStatus(node);
  return updateStatus ? (
    <span>
      {updateStatus.className && (
        <span>
          <i className={updateStatus.className}></i>&nbsp;&nbsp;
        </span>
      )}
      {updateStatus.text}
    </span>
  ) : null;
};

const NodeRow = ({ obj: node, expand }) => {
  const isOperatorInstalled = containerLinuxUpdateOperator.isOperatorInstalled(node);
  const { t } = useTranslation();
  return (
    <ResourceRow obj={node}>
      <div className="col-xs-4 co-resource-link-wrapper">
        <NodeCog node={node} />
        <ResourceLink kind="Node" name={node.metadata.name} title={node.metadata.uid} />
      </div>
      <div className="col-sm-2 col-xs-4">
        <NodeStatus node={node} />
      </div>
      <div className="col-sm-3 col-xs-4">{isOperatorInstalled ? <NodeCLStatusRow node={node} /> : <span className="text-muted">{t('CONTENT:NOTCONFIGURED_EN')}</span>}</div>
      <div className="col-sm-3 hidden-xs">
        <NodeIPList ips={node.status.addresses} expand={expand} />
      </div>
      {expand && (
        <div className="col-xs-12">
          <LabelList kind="Node" labels={node.metadata.labels} />
        </div>
      )}
    </ResourceRow>
  );
};

const NodeRowSearch = ({ obj: node }) => (
  <div className="row co-resource-list__item">
    <div className="col-lg-2 col-md-3 col-sm-4 col-xs-5">
      <NodeCog node={node} />
      <ResourceLink kind="Node" name={node.metadata.name} title={node.metadata.uid} />
    </div>
    <div className="col-md-2 hidden-sm hidden-xs">
      <NodeStatus node={node} />
    </div>
    <div className="col-sm-5 col-xs-7">
      <LabelList kind="Node" labels={node.metadata.labels} expand={false} />
    </div>
    <div className="col-md-2 col-sm-3 hidden-xs">
      <NodeIPList ips={node.status.addresses} />
    </div>
  </div>
);

// We have different list layouts for the Nodes page list and the Search page list
const NodesList = props => <List {...props} Header={Header} Row={NodeRow} />;
export const NodesListSearch = props => <List {...props} Header={HeaderSearch} Row={NodeRowSearch} kind="node" />;

export const NodesPage = props => {
  const { t } = useTranslation();

  const dropdownFilters = [
    {
      type: 'node-status',
      items: {
        all: t(`CONTENT:STATUSALL`),
        ready: t(`CONTENT:STATUSREADY`),
        notReady: t(`CONTENT:STATUSNOTREADY`),
      },
      title: t(`CONTENT:READYSTATUS`),
    },
  ];
  return <ListPage {...props} ListComponent={NodesList} dropdownFilters={dropdownFilters} canExpand={true} />;
};

const NodeGraphs = requirePrometheus(({ node }) => {
  const nodeIp = _.find<{ type: string; address: string }>(node.status.addresses, { type: 'InternalIP' });
  const ipQuery = nodeIp && `{instance=~'.*${nodeIp.address}.*'}`;
  const memoryLimit = units.dehumanize(node.status.allocatable.memory, 'binaryBytesWithoutB').value;
  const integerLimit = input => parseInt(input, 10);
  const { t } = useTranslation();
  return (
    <React.Fragment>
      <div className="row">
        <div className="col-md-4">
          <Line title={t('CONTENT:RAM')} query={ipQuery && `node_memory_Active${ipQuery}`} units="binaryBytes" limit={memoryLimit} />
        </div>
        <div className="col-md-4">
          <Line title={t('CONTENT:CPU')} query={ipQuery && `instance:node_cpu:rate:sum${ipQuery}`} units="numeric" limit={integerLimit(node.status.allocatable.cpu)} />
        </div>
        <div className="col-md-4">
          <Line title={t('CONTENT:NUMBEROFPODS')} query={ipQuery && `kubelet_running_pod_count${ipQuery}`} units="numeric" limit={integerLimit(node.status.allocatable.pods)} />
        </div>
        <div className="col-md-4">
          <Line title={t('CONTENT:NETWORKIN')} query={ipQuery && `instance:node_network_receive_bytes:rate:sum${ipQuery}`} units="decimalBytes" />
        </div>
        <div className="col-md-4">
          <Line title={t('CONTENT:NETWORKOUT')} query={ipQuery && `instance:node_network_transmit_bytes:rate:sum${ipQuery}`} units="decimalBytes" />
        </div>
        <div className="col-md-4">
          <Line title={t('CONTENT:FILESYSTEM')} query={ipQuery && `instance:node_filesystem_usage:sum${ipQuery}`} units="decimalBytes" />
        </div>
      </div>

      <br />
    </React.Fragment>
  );
});

const Details = ({ obj: node }) => {
  const { t } = useTranslation();
  return (
    <React.Fragment>
      <div className="co-m-pane__body">
        <SectionHeading text={t('ADDITIONAL:OVERVIEWTITLE', { something: ResourcePlural('NODE', t) })} />
        <NodeGraphs node={node} />
        <div className="row">
          <div className="col-md-6 col-xs-12">
            <dl className="co-m-pane__details">
              <dt>{t('CONTENT:NODENAME')}</dt>
              <dd>{node.metadata.name || '-'}</dd>
              <dt>{t('CONTENT:EXTERNALID')}</dt>
              <dd>{_.get(node, 'spec.externalID', '-')}</dd>
              <dt>{t('CONTENT:NODEADDRESSES')}</dt>
              <dd>
                <NodeIPList ips={_.get(node, 'status.addresses')} expand={true} />
              </dd>
              <dt>{t('CONTENT:NODELABELS')}</dt>
              <dd>
                <LabelList kind="Node" labels={node.metadata.labels} />
              </dd>
              <dt>{t('CONTENT:ANNOTATIONS')}</dt>
              <dd>
                <a className="co-m-modal-link" onClick={Cog.factory.ModifyAnnotations(NodeModel, node).callback}>
                  {pluralize(_.size(node.metadata.annotations), 'Annotation')}
                </a>
              </dd>
              <dt>{t('CONTENT:PROVIDERID')}</dt>
              <dd>{cloudProviderNames([cloudProviderID(node)])}</dd>
              {_.has(node, 'spec.unschedulable') && <dt>{t('CONTENT:UNSCHEDULABLE')}</dt>}
              {_.has(node, 'spec.unschedulable') && <dd className="text-capitalize">{_.get(node, 'spec.unschedulable', '-').toString()}</dd>}
              <dt>{t('CONTENT:CREATED')}</dt>
              <dd>
                {/* {fromNow(node.metadata.creationTimestamp)} */}
                <Timestamp timestamp={node.metadata.creationTimestamp} t={t} />
              </dd>
            </dl>
          </div>
          <div className="col-md-6 col-xs-12">
            <dl className="co-m-pane__details">
              <dt>{t('CONTENT:OPERATINGSYSTEM')}</dt>
              <dd className="text-capitalize">{_.get(node, 'status.nodeInfo.operatingSystem', '-')}</dd>
              <dt>{t('CONTENT:ARCHITECTURE')}</dt>
              <dd className="text-uppercase">{_.get(node, 'status.nodeInfo.architecture', '-')}</dd>
              <dt>{t('CONTENT:KERNELVERSION')}</dt>
              <dd>{_.get(node, 'status.nodeInfo.kernelVersion', '-')}</dd>
              <dt>{t('CONTENT:BOOTID')}</dt>
              <dd>{_.get(node, 'status.nodeInfo.bootID', '-')}</dd>
              <dt>{t('CONTENT:CONTAINERRUNTIME')}</dt>
              <dd>{_.get(node, 'status.nodeInfo.containerRuntimeVersion', '-')}</dd>
              <dt>{t('CONTENT:KUBELETVERSION')}</dt>
              <dd>{_.get(node, 'status.nodeInfo.kubeletVersion', '-')}</dd>
              <dt>{t('CONTENT:KUBE-PROXYVERSION')}</dt>
              <dd>{_.get(node, 'status.nodeInfo.kubeProxyVersion', '-')}</dd>
            </dl>
          </div>
        </div>
      </div>

      {containerLinuxUpdateOperator.isOperatorInstalled(node) && (
        <div className="co-m-pane__body">
          <SectionHeading text="Container Linux" />
          <div className="row">
            <div className="col-md-6 col-xs-12">
              <dl className="co-m-pane__details">
                <dt>{t('CONTENT:CURRENTVERSION')}</dt>
                <dd>{containerLinuxUpdateOperator.getVersion(node)}</dd>
                <dt>{t('CONTENT:CHANNEL')}</dt>
                <dd className="text-capitalize">{containerLinuxUpdateOperator.getChannel(node)}</dd>
              </dl>
            </div>
            <div className="col-md-6 col-xs-12">
              <dl className="co-m-pane__details">
                <dt>{t('CONTENT:UPDATESTATUS')}</dt>
                <dd>
                  <NodeCLUpdateStatus node={node} />
                </dd>
              </dl>
            </div>
          </div>
        </div>
      )}

      <div className="co-m-pane__body">
        <SectionHeading text={t('CONTENT:NODECONDITIONS')} />
        <div className="co-table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('CONTENT:TYPE')}</th>
                <th>{t('CONTENT:STATUS')}</th>
                <th>{t('CONTENT:REASON')}</th>
                <th>{t('CONTENT:UPDATED')}</th>
                <th>{t('CONTENT:CHANGED')}</th>
              </tr>
            </thead>
            <tbody>
              {_.map(node.status.conditions, (c, i) => (
                <tr key={i}>
                  <td>
                    <CamelCaseWrap value={c.type} />
                  </td>
                  <td>{c.status || '-'}</td>
                  <td>
                    <CamelCaseWrap value={c.reason} />
                  </td>
                  <td>
                    {<Timestamp timestamp={c.lastHeartbeatTime} t={t} />}
                    {/* {fromNow(c.lastHeartbeatTime)} */}
                  </td>
                  <td>
                    {<Timestamp timestamp={c.lastTransitionTime} t={t} />}
                    {/* {fromNow(c.lastTransitionTime)} */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="co-m-pane__body">
        <SectionHeading text={t('CONTENT:IMAGES')} />
        <div className="co-table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('CONTENT:NAME')}</th>
                <th>{t('CONTENT:SIZE')}</th>
              </tr>
            </thead>
            <tbody>
              {_.map(node.status.images, (image, i) => (
                <tr key={i}>
                  <td>{image.names.find(name => !name.includes('@')) || image.names[0]}</td>
                  <td>{units.humanize(image.sizeBytes, 'decimalBytes', true).string || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </React.Fragment>
  );
};

const { details, editYaml, events, pods } = navFactory;

export const NodesDetailsPage = props => {
  const { t } = useTranslation();
  const pages = [details(Details, t('CONTENT:OVERVIEW')), editYaml(), pods(t('CONTENT:PODS'), ({ obj }) => <PodsPage showTitle={false} fieldSelector={`spec.nodeName=${obj.metadata.name}`} />), events(ResourceEventStream, t('CONTENT:EVENTS'))];
  return <DetailsPage {...props} menuActions={menuActions} pages={pages} />;
};
