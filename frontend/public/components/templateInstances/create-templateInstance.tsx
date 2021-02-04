/* eslint-disable no-undef */
import * as _ from 'lodash-es';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { k8sCreate, k8sUpdate, K8sResourceKind } from '../../module/k8s';
import { ButtonBar, Firehose, history, kindObj, StatusBox, SelectorInput } from '../utils';
import { formatNamespacedRouteForResource } from '../../ui/ui-actions';
import * as k8sModels from '../../models';
import { coFetch } from '../../co-fetch';
import { useTranslation } from 'react-i18next';
import { ResourcePlural } from '../utils/lang/resource-plural';
enum CreateType {
  generic = 'generic',
  form = 'form',
}
const pageExplanation = {
  [CreateType.form]: 'Create Template Instance Run using Form Editor',
};

// Requestform returns SubForm which is a Higher Order Component for all the types of secret forms.
const Requestform = (SubForm) => class SecretFormComponent extends React.Component<BaseEditSecretProps_, BaseEditSecretState_> {
  constructor(props) {
    super(props);
    const existingTemplateInstance = _.pick(props.obj, ['metadata', 'type']);
    const templateInstance = _.defaultsDeep({}, props.fixed, existingTemplateInstance, {
      apiVersion: 'tmax.io/v1',
      kind: "TemplateInstance",
      metadata: {
        name: '',
      },
      spec: {
        template: {
          metadata: {
            name: ''
          },
          parameters: []
        }
      }
    });

    this.state = {
      secretTypeAbstraction: this.props.secretTypeAbstraction,
      templateInstance: templateInstance,
      inProgress: false,
      templateList: [],
      paramList: [],
      editParamList: true,
      selectedTemplate: ''
    };
    this.onNameChanged = this.onNameChanged.bind(this);
    this.onTemplateChanged = this.onTemplateChanged.bind(this);
    this.getParams = this.getParams.bind(this);
    this.onParamValueChanged = this.onParamValueChanged.bind(this);
    this.save = this.save.bind(this);
  }
  onNameChanged(event) {
    let templateInstance = { ...this.state.templateInstance };
    templateInstance.metadata.name = event.target.value;
    this.setState({ templateInstance });
  }
  getParams() {
    const namespace = document.location.href.split('/ns/')[1].split('/')[0];
    let templateInstance = { ...this.state.templateInstance };
    let template = this.state.selectedTemplate;
    if (template) {
      coFetch(`/api/kubernetes/apis/${k8sModels.TemplateModel.apiGroup}/${k8sModels.TemplateModel.apiVersion}/namespaces/${namespace}/templates/${template}`)
        .then(res => res.json())
        .then((myJson) => {
          let paramList = myJson.parameters.map(function (parm) {
            return { name: parm.name, defaultValue: parm.value, value: '', description: parm.description, required: parm.required, displayName: parm.displayName }
          });
          if (paramList.length) {
            templateInstance.spec.template.parameters = paramList;
            this.setState({
              paramList: paramList,
              editParamList: false,
            });
          } else {
            this.setState({
              paramList: [],
              editParamList: false
            });
          }
        },
          //컴포넌트의 실제 버그에서 발생하는 예외사항들을 넘기지 않도록 에러를 이 부분에서 처리
          (error) => {
            this.setState({
              error
            });
          }
        )
        .catch(function (myJson) {
          console.log(myJson);
        });
    }

  }
  onTemplateChanged(event) {
    let templateInstance = { ...this.state.templateInstance };
    templateInstance.spec.template.metadata.name = event.target.value;
    this.setState({
      selectedTemplate: event.target.value,
      editParamList: true,
      templateInstance: templateInstance
    }, () => this.getParams());
  }
  onParamValueChanged(event) {
    let key = event.target.id
    let templateInstance = { ...this.state.templateInstance };
    templateInstance.spec.template.parameters.forEach(obj => {
      if (obj.name === key) {
        obj.value = event.target.value;
      }
    });
    this.setState({
      templateInstance: templateInstance
    });
  }
  save(e) {
    e.preventDefault();
    const { kind, metadata } = this.state.templateInstance;
    this.setState({ inProgress: true });

    const newSecret = _.assign({}, this.state.templateInstance);
    const ko = kindObj(kind);
    if (newSecret.spec.template.metadata.name === '') {
      newSecret.spec.template.metadata.name = this.state.templateList[0];
    }
    (this.props.isCreate
      ? k8sCreate(ko, newSecret)
      : k8sUpdate(ko, newSecret, metadata.namespace, newSecret.metadata.name)
    ).then(() => {
      this.setState({ inProgress: false });
      history.push('/k8s/ns/' + metadata.namespace + '/templateinstances');
    }, err => this.setState({ error: err.message, inProgress: false }));
  }
  getTemplateList() {
    const namespace = document.location.href.split('/ns/')[1].split('/')[0];
    coFetch('/api/kubernetes/apis/' + k8sModels.TemplateModel.apiGroup + '/' + k8sModels.TemplateModel.apiVersion + '/namespaces/' + namespace + '/templates')
      .then(res => res.json())
      .then((myJson) => {
        let templateList = myJson.items.map(function (template) {
          return template.metadata.name
        });
        if (templateList.length > 0) {
          this.setState({
            templateList: templateList,
            selectedTemplate: templateList[0],
          }, () => this.getParams());
        }
        else {
          this.setState({
            templateList: templateList,
            selectedTemplate: null,
          });
        }
      },
        (error) => {
          this.setState({
            error
          });
        }
      )
      .catch(function (myJson) {
        this.state.templateList = [];
      });
  }
  componentDidMount() {
    this.getTemplateList();
  }
  render() {
    const { templateList, paramList } = this.state;
    const { t } = this.props;
    let options = templateList.map(function (template) {
      return <option value={template}>{template}</option>;
    });

    let paramDivs = paramList.map((parameter) => {
      let defaultValue = parameter.defaultValue ? `${parameter.defaultValue}` : ''
      let isRequired = parameter.required ? true : false;
      return <div>
        <div className="row">
          <div className={"col-xs-2 form-group " + (isRequired ? 'required' : '')}>
            <div className="control-label">{parameter.displayName}</div>
          </div>
          <div className="col-xs-3" id={parameter.name}>
            <input onChange={this.onParamValueChanged} className="form-control" type="text" placeholder={defaultValue} id={parameter.name} required={isRequired} />
          </div>
        </div>
        <div className="row">
          <div className="col-xs-2" />
          <p className="col-xs-10 co-m-pane__explanation">{parameter.description}</p>
        </div>
      </div>
    });

    return <div className="co-m-pane__body">
      <form className="co-m-pane__body-group co-create-secret-form" onSubmit={this.save}>
        <h1 className="co-m-pane__heading">{t('ADDITIONAL:CREATEBUTTON', { something: ResourcePlural(this.state.templateInstance.kind, t) })}</h1>
        <p className="co-m-pane__explanation">{t('STRING:TEMPLATEINSTANCE-CREATE_0')}</p>
        <fieldset disabled={!this.props.isCreate}>
          <div className="form-group">
            <label className="control-label" htmlFor="secret-name">{t('CONTENT:NAME')}</label>
            <div>
              <input className="form-control"
                type="text"
                onChange={this.onNameChanged}
                value={this.state.templateInstance.metadata.name}
                id="template-instance-name"
                required />
            </div>
          </div>
          <div className="form-group">
            <label className="control-label" htmlFor="secret-type" >{t('RESOURCE:TEMPLATE')}</label>
            <div>
              <select onChange={this.onTemplateChanged} className="form-control" id="template">
                {options}
              </select>
            </div>
          </div>
        </fieldset>
        <label className="control-label" htmlFor="secret-name">{t('CONTENT:PARAMETERS')}</label>
        <div>
          {paramDivs}
        </div>
        <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress} >
          <button type="submit" className="btn btn-primary" id="save-changes">{t('CONTENT:CREATE')}</button>
          <Link to={formatNamespacedRouteForResource('templateinstances')} className="btn btn-default" id="cancel">{t('CONTENT:CANCEL')}</Link>
        </ButtonBar>
      </form>
    </div >;
  }
};
class SourceSecretForm extends React.Component<SourceSecretFormProps> {
  constructor(props) {
    super(props);
    this.state = {
      stringData: this.props.stringData || {},
    };
    this.onDataChanged = this.onDataChanged.bind(this);
  }
  onDataChanged(secretsData) {
    this.setState({
      stringData: { ...secretsData },
    }, () => this.props.onChange(this.state));
  }
  render() {
    return <React.Fragment>
    </React.Fragment>;
  }
}

const secretFormFactory = secretType => {
  return secretType === CreateType.form ? Requestform(SourceSecretForm) : Requestform(SourceSecretForm);
};

export const CreateTemplateInstance = ({ match: { params } }) => {
  const SecretFormComponent = secretFormFactory(params.type);
  const { t } = useTranslation()
  return <SecretFormComponent fixed={{ metadata: { namespace: params.ns } }}
    t={t}
    secretTypeAbstraction={params.type}
    explanation={pageExplanation[params.type]}
    titleVerb="Create"
    isCreate={true}
  />;
};

export type BaseEditSecretState_ = {
  secretTypeAbstraction?: CreateType,
  templateInstance: K8sResourceKind,
  inProgress: boolean,
  error?: any,
  templateList: Array<any>,
  paramList: Array<any>,
  editParamList: boolean,
  selectedTemplate: string
};

export type BaseEditSecretProps_ = {
  obj?: K8sResourceKind,
  fixed: any,
  kind?: string,
  isCreate: boolean,
  titleVerb: string,
  secretTypeAbstraction?: CreateType,
  saveButtonText?: string,
  explanation: string,
  t: any
};

export type SourceSecretFormProps = {
  onChange: Function;
  stringData: {
    [key: string]: string
  },
  isCreate: boolean,
};
/* eslint-enable no-undef */
