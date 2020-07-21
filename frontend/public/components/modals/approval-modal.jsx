import * as React from 'react';
import * as PropTypes from 'prop-types';

import { createModalLauncher, ModalTitle, ModalBody, ModalSubmitFooter } from '../factory/modal';
import { PromiseComponent, StatusEditorPair } from '../utils';
import { AsyncComponent } from '../utils/async';
import { coFetchJSON } from '../../co-fetch';

const StautusEditorComponent = props => <AsyncComponent loader={() => import('../utils/approval-editor.jsx').then(c => c.ApprovalSelector)} {...props} />;

class ApprovalModal extends PromiseComponent {
  constructor(props) {
    super(props);
    this.status = {
      status: props.status,
      error: '',
    };

    this._cancel = props.cancel.bind(this);
    this._updateStatus = this._updateStatus.bind(this);
    this._submit = this._submit.bind(this);
  }
  _updateStatus(status) {
    this.setState({
      status: status.status,
    });
  }

  _submit(event) {
    event.preventDefault();
    let data = { decision: StatusEditorPair.Status };

    const { namespace, name } = this.props.resource.metadata;
    let url = `${document.location.origin}/api/approval/approve/${namespace}/${name}`;
    // let url = `http://192.168.6.196:31470/api/approval/approve/${namespace}/${name}`;
    // http://192.168.6.196:31470/approve/approval-test/third-task-run-pod-mbx-1
    coFetchJSON
      .put(url, data)
      .then(response => {
        console.log(response);
        location.reload();
      })
      .catch(error => {
        this.setState({ error: error.message });
      });
    // this.handlePromise(promise).then(this.props.close);

    // const op = {
    //   path: this.props.path,
    // };

    // const patch = { path: this.props.path, data };
    // const promise = k8sPatch2(this.props.resourceKind, this.props.resource, data, op)
    //   .then(() => {
    //     location.reload();
    //   })
    //   .catch(error => {
    //     this.setState({ error: error.message });
    //   });
    // this.handlePromise(promise);
    // this.handlePromise(promise).then(this.props.close);
  }

  render() {
    return (
      <form onSubmit={this._submit} name="form" style={{ width: '600px' }}>
        <ModalTitle>{this.props.title}</ModalTitle>
        <ModalBody>
          <StautusEditorComponent submit={this._submit} />
          <div className="col-xs-10">
            <p className="error_text">{this.state.error}</p>
          </div>
        </ModalBody>
        <ModalSubmitFooter errorMessage={this.state.errorMessage} inProgress={this.state.inProgress} submitText={this.props.btnText || 'Confirm'} cancel={this._cancel} />
      </form>
    );
  }
}
ApprovalModal.propTypes = {
  btnText: PropTypes.node,
  cancel: PropTypes.func.isRequired,
  close: PropTypes.func.isRequired,
  executeFn: PropTypes.func.isRequired,
  message: PropTypes.node,
  title: PropTypes.node.isRequired,
};

export const approvalModal = createModalLauncher(props => <ApprovalModal path="status" status={props.resource.status && props.resource.status.status} title={props.t('ADDITIONAL:EDIT', { something: props.t('CONTENT:STATUS') })} btnText={props.t('CONTENT:CONFIRM')} {...props} />);
