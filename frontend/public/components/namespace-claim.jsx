import * as _ from 'lodash-es';
import * as React from 'react';

import { ColHead, DetailsPage, List, ListHeader, ListPage } from './factory';
import {
  Cog,
  navFactory,
  ResourceCog,
  SectionHeading,
  ResourceLink,
  ResourceSummary
} from './utils';
import { fromNow } from './utils/datetime';
import { kindForReference } from '../module/k8s';
import { breadcrumbsForOwnerRefs } from './utils/breadcrumbs';

const menuActions = [
  Cog.factory.ModifyLabels,
  Cog.factory.ModifyAnnotations,
  Cog.factory.Edit,
  Cog.factory.Delete
];

const NamespaceClaimHeader = props => (
  <ListHeader>
    <ColHead {...props} className="col-xs-3 col-sm-3" sortField="metadata.name">
      Name
    </ColHead>
    <ColHead
      {...props}
      className="col-xs-3 col-sm-3"
      sortField="metadata.namespace"
    >
      Namespace
    </ColHead>
    <ColHead
      {...props}
      className="col-sm-3 hidden-xs"
      sortField="metadata.creationTimestamp"
    >
      Created
    </ColHead>
  </ListHeader>
);

const NamespaceClaimRow = () =>
  // eslint-disable-next-line no-shadow
  function NamespaceClaimRow({ obj }) {
    return (
      <div className="row co-resource-list__item">
        <div className="col-xs-3 col-sm-3 co-resource-link-wrapper">
          <ResourceCog
            actions={menuActions}
            kind="NamespaceClaim"
            resource={obj}
          />
          <ResourceLink
            kind="NamespaceClaim"
            name={obj.metadata.name}
            namespace={obj.metadata.namespace}
            title={obj.metadata.name}
          />
        </div>
        <div className="col-xs-3 col-sm-3 co-break-word">
          {obj.metadata.namespace ? (
            <ResourceLink
              kind="Namespace"
              name={obj.metadata.namespace}
              title={obj.metadata.namespace}
            />
          ) : (
              'None'
            )}
        </div>
        <div className="col-xs-3 col-sm-3 hidden-xs">
          {fromNow(obj.metadata.creationTimestamp)}
        </div>
      </div>
    );
  };

const DetailsForKind = kind =>
  function DetailsForKind_({ obj }) {
    return (
      <React.Fragment>
        <div className="co-m-pane__body">
          <SectionHeading text={`${kindForReference(kind)} Overview`} />
          <ResourceSummary
            resource={obj}
            podSelector="spec.podSelector"
            showNodeSelector={false}
          />
        </div>
      </React.Fragment>
    );
  };

export const NamespaceClaimList = props => {
  const { kinds } = props;
  const Row = NamespaceClaimRow(kinds[0]);
  Row.displayName = 'NamespaceClaimRow';
  return <List {...props} Header={NamespaceClaimHeader} Row={Row} />;
};
NamespaceClaimList.displayName = NamespaceClaimList;

export const NamespaceClaimsPage = props => (
  <ListPage
    {...props}
    ListComponent={NamespaceClaimList}
    canCreate={true}
    kind="NamespaceClaim"
  />
);
NamespaceClaimsPage.displayName = 'NamespaceClaimsPage';

export const NamespaceClaimsDetailsPage = props => (
  <DetailsPage
    {...props}
    breadcrumbsFor={obj =>
      breadcrumbsForOwnerRefs(obj).concat({
        name: 'NamespaceClaim Details',
        path: props.match.url
      })
    }
    kind="NamespaceClaim"
    menuActions={menuActions}
    pages={[
      navFactory.details(DetailsForKind(props.kind)),
      navFactory.editYaml()
    ]}
  />
);

NamespaceClaimsDetailsPage.displayName = 'NamespaceClaimsDetailsPage';