import * as React from 'react';
import * as classNames from'classnames';

import {ActionsMenu, kindObj, ResourceIcon} from './index';

/** @type {React.StatelessComponent.<{kind?: string, detail?: boolean, title?: string, menuActions?: any[], data?: any[]}> */
export const NavTitle = ({kind, detail, title, menuActions, data}) => <div className={classNames('row', detail ? 'co-m-nav-title__detail' : 'co-m-nav-title')}>
  <div className="col-xs-12">
    <h1 className={classNames('co-m-page-title', {'co-m-page-title--detail': detail})}>
      {kind && <ResourceIcon kind={kind} className="co-m-page-title__icon" />} <span>{title}</span>
      {menuActions && !_.isEmpty(data) && !_.has(data.metadata, 'deletionTimestamp') && <ActionsMenu actions={menuActions.map(a => a(kindObj(kind), data))} />}
    </h1>
  </div>
</div>;

NavTitle.displayName = 'NavTitle';
