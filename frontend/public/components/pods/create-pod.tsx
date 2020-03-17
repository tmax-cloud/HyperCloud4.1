/* eslint-disable no-undef */
import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

import { k8sCreate, k8sUpdate, K8sResourceKind } from '../../module/k8s';
import { ButtonBar, Firehose, history, kindObj, StatusBox, FileInput } from '../utils';
import { formatNamespacedRouteForResource } from '../../ui/ui-actions';

enum SecretTypeAbstraction {
  generic = 'generic',
  form = 'form'
}

export enum SecretType {
  basicAuth = 'kubernetes.io/basic-auth',
  dockercfg = 'kubernetes.io/dockercfg',
  dockerconfigjson = 'kubernetes.io/dockerconfigjson',
  opaque = 'Opaque',
  serviceAccountToken = 'kubernetes.io/service-account-token',
  sshAuth = 'kubernetes.io/ssh-auth',
  tls = 'kubernetes.io/tls',
}

export type BasicAuthSubformState = {
  username: string,
  password: string,
};

const secretFormExplanation = {
  [SecretTypeAbstraction.form]: '폼 에디터로 pod생성.',
};

const determineDefaultSecretType = (typeAbstraction: SecretTypeAbstraction) => {
  return SecretType.basicAuth;
};


const determineSecretTypeAbstraction = (data) => {
  return SecretTypeAbstraction.form;
};

// withSecretForm returns SubForm which is a Higher Order Component for all the types of secret forms.
const withSecretForm = (SubForm) => class SecretFormComponent extends React.Component<BaseEditSecretProps_, BaseEditSecretState_> {
  constructor(props) {
    super(props);
    const existingSecret = _.pick(props.obj, ['metadata', 'type']);
    const defaultSecretType = determineDefaultSecretType(this.props.secretTypeAbstraction);
    const secret = _.defaultsDeep({}, props.fixed, existingSecret, {
      apiVersion: 'v1',
      data: {},
      kind: 'Pod',
      metadata: {
        name: '',
      },
      type: defaultSecretType,
    });

    this.state = {
      secretTypeAbstraction: this.props.secretTypeAbstraction,
      secret: secret,
      inProgress: false,
      type: defaultSecretType,
      stringData: _.mapValues(_.get(props.obj, 'data'), window.atob),
    };
    this.onDataChanged = this.onDataChanged.bind(this);
    this.onNameChanged = this.onNameChanged.bind(this);
    this.save = this.save.bind(this);
  }
  onDataChanged(secretsData) {
    this.setState({
      stringData: { ...secretsData.stringData },
      type: secretsData.type,
    });
  }
  onNameChanged(event) {
    let secret = { ...this.state.secret };
    secret.metadata.name = event.target.value;
    this.setState({ secret });
  }
  save(e) {
    e.preventDefault();
    const { kind, metadata } = this.state.secret;
    this.setState({ inProgress: true });

    const newSecret = _.assign({}, this.state.secret, { stringData: this.state.stringData }, { type: this.state.type });
    const ko = kindObj(kind);
    (this.props.isCreate
      ? k8sCreate(ko, newSecret)
      : k8sUpdate(ko, newSecret, metadata.namespace, newSecret.metadata.name)
    ).then(() => {
      this.setState({ inProgress: false });
      history.push(formatNamespacedRouteForResource('pods'));
    }, err => this.setState({ error: err.message, inProgress: false }));
  }
  render() {
    const title = `${this.props.titleVerb} ${_.upperFirst(this.state.secretTypeAbstraction)} Secret`;
    return <div className="co-m-pane__body">
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <form className="co-m-pane__body-group co-create-secret-form" onSubmit={this.save}>
        <h1 className="co-m-pane__heading">{title}</h1>
        <p className="co-m-pane__explanation">{this.props.explanation}</p>

        <fieldset disabled={!this.props.isCreate}>
          <div className="form-group">
            <label className="control-label" htmlFor="secret-name">Secret Name</label>
            <div>
              <input className="form-control"
                type="text"
                onChange={this.onNameChanged}
                value={this.state.secret.metadata.name}
                aria-describedby="secret-name-help"
                id="secret-name"
                required />
              <p className="help-block" id="secret-name-help">Unique name of the new secret.</p>
            </div>
          </div>
        </fieldset>
        <SubForm
          onChange={this.onDataChanged.bind(this)}
          stringData={this.state.stringData}
          secretType={this.state.secret.type}
          isCreate={this.props.isCreate}
        />
        <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress} >
          <button type="submit" className="btn btn-primary" id="save-changes">{this.props.saveButtonText || 'Create'}</button>
          <Link to={formatNamespacedRouteForResource('secrets')} className="btn btn-default" id="cancel">Cancel</Link>
        </ButtonBar>
      </form>
    </div>;
  }
};

class PodForm extends React.Component<PodFormProps, PodFormState> {
  constructor(props) {
    super(props);
    this.state = {
      type: this.props.secretType,
      stringData: this.props.stringData || {},
    };
    this.changeAuthenticationType = this.changeAuthenticationType.bind(this);
    this.onDataChanged = this.onDataChanged.bind(this);
  }
  changeAuthenticationType(event) {
    this.setState({
      type: event.target.value
    }, () => this.props.onChange(this.state));
  }
  onDataChanged(secretsData) {
    this.setState({
      stringData: { ...secretsData },
    }, () => this.props.onChange(this.state));
  }
  render() {
    return <React.Fragment>
      {this.props.isCreate
        ? <div className="form-group">
          <label className="control-label" htmlFor="secret-type" >Authentication Type</label>
          <div>
            <select onChange={this.changeAuthenticationType} value={this.state.type} className="form-control" id="secret-type">
              <option value={SecretType.basicAuth}>Basic Authentication</option>
              <option value={SecretType.sshAuth}>SSH Key</option>
            </select>
          </div>
        </div>
        : null
      }
      {this.state.type === SecretType.basicAuth
        ? <BasicAuthSubform onChange={this.onDataChanged} stringData={this.state.stringData} />
        : <SSHAuthSubform onChange={this.onDataChanged} stringData={this.state.stringData} />
      }
    </React.Fragment>;
  }
}

const secretFormFactory = secretType => {
  return withSecretForm(PodForm);
};

class BasicAuthSubform extends React.Component<BasicAuthSubformProps, BasicAuthSubformState> {
  constructor(props) {
    super(props);
    this.state = {
      username: this.props.stringData.username || '',
      password: this.props.stringData.password || '',
    };
    this.changeData = this.changeData.bind(this);
  }
  changeData(event) {
    this.setState({
      [event.target.name]: event.target.value
    } as BasicAuthSubformState, () => this.props.onChange(this.state));
  }
  render() {
    return <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="username">Username</label>
        <div>
          <input className="form-control"
            id="username"
            aria-describedby="username-help"
            type="text"
            name="username"
            onChange={this.changeData}
            value={this.state.username} />
          <p className="help-block" id="username-help">Optional username for Git authentication.</p>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">Password or Token</label>
        <div>
          <input className="form-control"
            id="password"
            aria-describedby="password-help"
            type="password"
            name="password"
            onChange={this.changeData}
            value={this.state.password}
            required />
          <p className="help-block" id="password-help">Password or token for Git authentication. Required if a ca.crt or .gitconfig file is not specified.</p>
        </div>
      </div>
    </React.Fragment>;
  }
}

class SSHAuthSubform extends React.Component<SSHAuthSubformProps, SSHAuthSubformState> {
  constructor(props) {
    super(props);
    this.state = {
      'ssh-privatekey': this.props.stringData['ssh-privatekey'] || '',
    };
    this.changeData = this.changeData.bind(this);
    this.onFileChange = this.onFileChange.bind(this);
  }
  changeData(event) {
    this.setState({
      'ssh-privatekey': event.target.value
    }, () => this.props.onChange(this.state));
  }
  onFileChange(fileData) {
    this.setState({
      'ssh-privatekey': fileData
    }, () => this.props.onChange(this.state));
  }
  render() {
    return <div className="form-group">
      <label className="control-label" htmlFor="ssh-privatekey">SSH Private Key</label>
      <div>
        <FileInput onChange={this.onFileChange} />
        <p className="help-block">Upload your private SSH key file.</p>
        <textarea className="form-control co-create-secret-form__textarea"
          id="ssh-privatekey"
          name="privateKey"
          onChange={this.changeData}
          value={this.state['ssh-privatekey']}
          aria-describedby="ssh-privatekey-help"
          required />
        <p className="help-block" id="ssh-privatekey-help">Private SSH key file for Git authentication.</p>
      </div>
    </div>;
  }
}

const SecretLoadingWrapper = props => {
  const secretTypeAbstraction = determineSecretTypeAbstraction(_.get(props.obj.data, 'data'));
  const SecretFormComponent = secretFormFactory(secretTypeAbstraction);
  const fixed = _.reduce(props.fixedKeys, (acc, k) => ({ ...acc, k: _.get(props.obj.data, k) }), {});
  return <StatusBox {...props.obj}>
    <SecretFormComponent {...props}
      secretTypeAbstraction={secretTypeAbstraction}
      obj={props.obj.data}
      fixed={fixed}
      explanation={secretFormExplanation[secretTypeAbstraction]}
    />
  </StatusBox>;
};

export const CreateSecret = ({ match: { params } }) => {
  const SecretFormComponent = secretFormFactory(params.type);
  return <SecretFormComponent fixed={{ metadata: { namespace: params.ns } }}
    secretTypeAbstraction={params.type}
    explanation={secretFormExplanation[params.type]}
    titleVerb="Create"
    isCreate={true}
  />;
};

export const EditSecret = ({ match: { params }, kind }) => <Firehose resources={[{ kind: kind, name: params.name, namespace: params.ns, isList: false, prop: 'obj' }]}>
  <SecretLoadingWrapper fixedKeys={['kind', 'metadata']} titleVerb="Edit" saveButtonText="Save Changes" />
</Firehose>;


export type BaseEditSecretState_ = {
  secretTypeAbstraction?: SecretTypeAbstraction,
  secret: K8sResourceKind,
  inProgress: boolean,
  type: SecretType,
  stringData: { [key: string]: string },
  error?: any,
};

export type BaseEditSecretProps_ = {
  obj?: K8sResourceKind,
  fixed: any,
  kind?: string,
  isCreate: boolean,
  titleVerb: string,
  secretTypeAbstraction?: SecretTypeAbstraction,
  saveButtonText?: string,
  explanation: string,
};

export type PodFormState = {
  type: SecretType,
  stringData: {
    [key: string]: string
  },
};

export type PodFormProps = {
  onChange: Function;
  stringData: {
    [key: string]: string
  },
  secretType: SecretType,
  isCreate: boolean,
};

export type BasicAuthSubformProps = {
  onChange: Function,
  stringData: {
    [key: string]: string
  },
};

export type SSHAuthSubformState = {
  'ssh-privatekey': string,
};

export type SSHAuthSubformProps = {
  onChange: Function;
  stringData: {
    [key: string]: string
  },
};

/* eslint-enable no-undef */