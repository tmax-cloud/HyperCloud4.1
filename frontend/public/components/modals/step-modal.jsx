import * as _ from 'lodash-es';
import * as React from 'react';

import { k8sPatch, referenceForModel } from '../../module/k8s';
import { createModalLauncher, ModalTitle, ModalBody, ModalSubmitFooter } from '../factory/modal';
import { k8sList, k8sGet, k8sCreate, k8sUpdate, K8sResourceKind } from '../../module/k8s';
import { ResourceIcon, SelectorInput, kindObj, makeQuery } from '../utils';
import { FirstSection, SecondSection } from '../utils/form';
import SingleSelect from '../utils/select';
import { KeyValueEditor } from '../utils/key-value-editor';
import { ValueEditor } from '../utils/value-editor';
import { useTranslation, Trans } from 'react-i18next';

class BaseStepModal extends React.Component {
  constructor(props) {
    super(props);

    const inputError = {
      name: null,
      imageRegistry: null,
      image: null,
      imageTag: null,
      selfImage: null,
      volume: null,
      mountPath: null,
    };

    this.state = {
      name: props.step?.[0] || '',
      imageregistry: props.step?.[1] || '',
      image: props.step?.[2] || '',
      imagetag: props.step?.[3] || '',
      mailserver: props.step?.[4] || 'http://mail-sender.approval-system:9999/',
      mailfrom: props.step?.[5] || 'no-reply-tc@tmax.co.kr',
      mailsubject: props.step?.[6] || '',
      mailcontent: props.step?.[7] || '',
      runcommands: props.step?.[8] || [['']],
      runcommandarguments: props.step?.[9] || [['']],
      env: props.step?.[10] || [['', '']],
      volumemountname: props.step?.[11] || '',
      volumemountpath: props.step?.[12] || '/tmp/config',
      isType: props.step?.[13],
      preset: props.step?.[14] || 'Approve',
      imagetype: (props.step?.[15] = false),
      selfimage: props.step?.[16] || 'tmaxcloudck/approval-step-server:latest',
      imageRegistryList: [],
      imageList: [],
      imageTagList: [],
      imageAllTagList: [],
      inputError: inputError,
      inProgress: false,
      errorMessage: '',
    };
    this.onNameChange = this.onNameChange.bind(this);
    this.onTypeChange = this.onTypeChange.bind(this);
    this.getImageRegistryList = this.getImageRegistryList.bind(this);
    this.getImageList = this.getImageList.bind(this);
    this.onImageRegistryChange = this.onImageRegistryChange.bind(this);
    this.onImageChange = this.onImageChange.bind(this);
    this.onImageTagChange = this.onImageTagChange.bind(this);

    this.onMailServerChange = this.onMailServerChange.bind(this);
    this.onMailFromChange = this.onMailFromChange.bind(this);
    this.onMailSubjectChange = this.onMailSubjectChange.bind(this);
    this.onMailContentChange = this.onMailContentChange.bind(this);
    this.onVolumeMountNameChange = this.onVolumeMountNameChange.bind(this);
    this.onVolumeMountPathChange = this.onVolumeMountPathChange.bind(this);
    this._updateRunCommands = this._updateRunCommands.bind(this);
    this._updateRunCommandArguments = this._updateRunCommandArguments.bind(this);
    this._updateEnv = this._updateEnv.bind(this);
    this._submit = this._submit.bind(this);
    this._cancel = props.cancel.bind(this);
  }
  componentDidMount() {
    // if (!this.props.isNew) {
    //   return;
    // }
    this.state.imagetype && this.getImageRegistryList();
  }

  getImageRegistryList = () => {
    const ko = kindObj('Registry');
    const params = { ns: this.props.namespace || '' };
    params.ns &&
      k8sList(ko, params).then(
        data => {
          let imageRegistryList = data.map(cur => {
            return {
              value: cur.metadata.name,
              id: 'imageRegistry',
              label: cur.metadata.name,
              realValue: cur.spec.image.split('/')[0], // spec.image 값 중복되는 경우 중복 선택되는 버그 때문..
            };
          });
          this.setState({ imageRegistryList });
          // this.setState({ imageregistry: imageRegistryList[0] });

          this.state.imageregistry && this.getImageList(data[0]);
        },
        err => {
          this.setState({ error: err.message, inProgress: false });
          this.setState({ statefulSet: [] });
        },
      );
  };

  getImageList = obj => {
    const ko = kindObj('Image');
    let query = makeQuery('', { matchLabels: { registry: obj?.metadata?.name } });
    k8sList(ko, query)
      .then(reponse => reponse)
      .then(
        data => {
          let imageList = data.map(cur => {
            return {
              value: cur.spec.name,
              id: 'image',
              label: cur.spec.name,
              tagList: cur.spec.versions,
            };
          });

          let imageAllTagList =
            data.length > 0
              ? data.map(image => ({
                  value: image.spec.versions,
                  label: image.spec.versions,
                  image: image.spec.name,
                }))
              : [];

          let imageTagList =
            imageAllTagList.length > 0
              ? imageAllTagList
                  .filter(cur => {
                    return cur.image === imageList[0].value;
                  })[0]
                  .value.map(version => {
                    return {
                      value: version,
                      label: version,
                    };
                  })
              : [];

          // this.setState({ image: imageList[0] });
          // this.setState({ imagetag: imageTagList[0] });
          this.setState({ imageList });
          this.setState({ imageTagList });
          this.setState({ imageAllTagList }, () => {
            this.forceUpdate();
          });
        },
        err => {
          this.setState({ error: err.message, inProgress: false });
        },
      );
  };

  _submit(e) {
    e.preventDefault();
    const { kind, path, steps, updateParentData, isNew, index, t } = this.props;
    let name = '';

    if (!this.state.isType && !this.state.name) {
      this.setState({ inputError: { name: t('VALIDATION:EMPTY-INPUT', { something: t(`CONTENT:NAME`) }) } });
      return;
    } else {
      this.setState({ inputError: { name: null } });
    }
    if (this.state.isType && this.state.imagetype && !this.state.imageregistry) {
      this.setState({ inputError: { imageRegistry: t('VALIDATION:EMPTY-SELECT', { something: t(`CONTENT:IMAGEREGISTRY`) }) } });
      return;
    } else {
      this.setState({ inputError: { imageRegsitry: null } });
    }
    if (this.state.isType && this.state.imagetype && !this.state.image) {
      this.setState({ inputError: { image: t('VALIDATION:EMPTY-SELECT', { something: t(`CONTENT:IMAGE`) }) } });
      return;
    } else {
      this.setState({ inputError: { image: null } });
    }
    if (this.state.isType && this.state.imagetype && !this.state.imagetag) {
      this.setState({ inputError: { imageTag: t('VALIDATION:EMPTY-SELECT', { something: t(`CONTENT:IMAGETAG`) }) } });
      return;
    } else {
      this.setState({ inputError: { imageTag: null } });
    }
    if (!this.state.isType && !this.state.imagetype && !this.state.selfimage) {
      this.setState({ inputError: { selfImage: t('VALIDATION:EMPTY-INPUT', { something: t(`CONTENT:IMAGE`) }) } });
      return;
    } else if (!this.state.isType) {
      this.setState({ inputError: { selfImage: null } });
    }
    if (this.state.isType && !this.state.volumemountname) {
      this.setState({ inputError: { volume: t('VALIDATION:EMPTY-SELECT', { something: t(`CONTENT:VOLUME`) }) } });
      return;
    } else {
      this.setState({ inputError: { volume: null } });
    }

    if (this.state.isType) {
      const name_idx = typeof steps !== 'string' && steps?.filter(cur => cur[14] === this.state.preset);
      if (name_idx.length > 0) {
        name = `${this.state.preset}-${name_idx.length}`;
      } else {
        name = this.state.preset + '-0';
      }
      console.log(name);
    }

    updateParentData({
      name: this.state.name || name,
      imageregistry: this.state.imageregistry,
      image: this.state.image,
      imageversion: this.state.imagetag,
      mailserver: this.state.mailserver,
      mailfrom: this.state.mailfrom,
      mailsubject: this.state.mailsubject,
      mailcontent: this.state.mailcontent,
      runcommands: this.state.runcommands,
      runcommandarguments: this.state.runcommandarguments,
      env: this.state.env,
      volumemountname: this.state.volumemountname,
      volumemountpath: this.state.volumemountpath,
      type: this.state.isType,
      preset: this.state.preset,
      imagetype: this.state.imagetype,
      selfimage: this.state.selfimage,
      isNew: isNew,
      index: index,
    });
    this.props.close();
  }
  onNameChange = name => {
    this.setState({
      name: name.value,
    });
  };

  onTypeChange = type => {
    this.setState({
      isType: type,
    });
    if (type === true) {
      this.setState({
        name: this.setState.preset,
      });
      if (this.state.preset === 'Approve') {
        this.setState({
          selfimage: 'tmaxcloudck/approval-step-server:latest',
        });
      } else if (this.state.preset === 'Notify') {
        this.setState({
          selfimage: 'tmaxcloudck/mail-sender-client:latest',
        });
      }
    } else {
      this.setState({ inputError: { volume: null } });
      this.setState({
        selfimage: '',
      });
    }
  };

  onPresetChange = preset => {
    this.setState({
      preset: preset.value,
    });
    if (preset.value === 'Approve') {
      this.setState({
        selfimage: 'tmaxcloudck/approval-step-server:latest',
      });
    } else if (preset.value === 'Notify') {
      this.setState({
        selfimage: 'tmaxcloudck/mail-sender-client:latest',
      });
    }
  };

  onImageTypeChange = imagetype => {
    this.setState({
      imagetype: imagetype,
    });
  };

  onImageRegistryChange = e => {
    this.getImageList({ metadata: { name: e.label } });
    this.setState({ imageregistry: e });
  };

  onImageChange = e => {
    this.setState({ image: e });

    let imageTagList = this.state.imageAllTagList
      .filter(cur => {
        return cur.image === e.value;
      })[0]
      .value.map(version => {
        return {
          value: version,
          label: version,
        };
      });
    // this.setState({ imagetag: imageTagList[0] });
    this.setState({ imageTagList });
  };

  onImageTagChange = e => {
    this.setState({ imagetag: e });
  };
  onSelfImageChange = e => {
    this.setState({ selfimage: e.target.value });
  };

  onMailServerChange = e => {
    this.setState({ mailserver: e.target.value });
  };

  onMailFromChange = e => {
    this.setState({ mailfrom: e.target.value });
  };
  onMailSubjectChange = e => {
    this.setState({ mailsubject: e.target.value });
  };
  onMailContentChange = e => {
    this.setState({ mailcontent: e.target.value });
  };

  onVolumeMountNameChange = e => {
    this.setState({ volumemountname: e.value });
  };

  onVolumeMountPathChange = e => {
    this.setState({ volumemountpath: e.target.value });
  };

  _updateRunCommands(commands) {
    this.setState({
      runcommands: commands.values,
    });
  }
  _updateRunCommandArguments(args) {
    this.setState({
      runcommandarguments: args.values,
    });
  }
  _updateEnv(env) {
    this.setState({
      env: env.keyValuePairs,
    });
  }
  render() {
    const { kind, step, pair, title, t, volumes } = this.props;
    const presetOptions = [
      // { value: 'SourceToImage', label: t('CONTENT:SOURCETOIMAGE') },
      // { value: 'Deploy', label: t('CONTENT:DEPLOY') },
      // { value: 'Analyze', label: t('CONTENT:ANALYZE') },
      // { value: 'Scan', label: t('CONTENT:SCAN') },
      { value: 'Approve', label: t('CONTENT:APPROVE') },
      { value: 'Notify', label: t('CONTENT:NOTIFY') },
    ];
    const volumeOptions = volumes ? volumes.filter(cur => cur[1] === 'ConfigMap').map(cur => ({ value: cur[0], label: cur[0] })) : [];
    let maxHeight = window.innerHeight - 180;

    let imageName = '';
    if (this.state.preset === 'Approve') {
      imageName = 'tmaxcloudck/approval-step-server:latest';
    } else if (this.state.preset === 'Notify') {
      imageName = 'tmaxcloudck/mail-sender-client:latest';
    }

    return (
      <form style={{ width: '500px' }} onSubmit={this._submit} name="form">
        <ModalTitle>{title}</ModalTitle>
        <ModalBody needScroll={true}>
          <div>
            <SecondSection isModal={true} label={t('CONTENT:TYPE')} isRequired={false}>
              <div className="row">
                <div className="col-xs-6" style={{ float: 'left' }}>
                  <input
                    type="radio"
                    value={true}
                    name="type"
                    onChange={e => {
                      this.onTypeChange(true);
                    }}
                    checked={this.state.isType}
                  />
                  {t('CONTENT:PRESET')}
                </div>
                <div className="col-xs-6" style={{ float: 'left' }}>
                  <input
                    type="radio"
                    value={false}
                    name="type"
                    onChange={e => {
                      this.onTypeChange(false);
                    }}
                    checked={!this.state.isType}
                  />
                  {t('STRING:TASK_CREATE_3')}
                </div>
              </div>
            </SecondSection>
            <div>
              {this.state.isType && (
                <div style={{ marginBottom: '15px' }}>
                  <SingleSelect
                    className="form-group"
                    options={presetOptions}
                    name="Type"
                    placeholder="Select Type"
                    value={this.state.preset}
                    onChange={e => {
                      this.onPresetChange(e);
                    }}
                  />
                </div>
              )}
              {!this.state.isType && (
                <div>
                  <SecondSection isModal={true} label={t('CONTENT:NAME')} isRequired={true}>
                    {/* <input className="form-control form-group" type="text" onChange={this.onNameChanged} value={this.state.task.metadata.name} id="task-name" required /> */}
                    <input
                      className="form-control"
                      type="text"
                      id="resource-name"
                      value={this.state.name}
                      onChange={e => {
                        this.onNameChange(e.target);
                      }}
                    />
                    {this.state.inputError.name && (
                      <p className="error_text" style={{ marginTop: 0 }}>
                        {this.state.inputError.name}
                      </p>
                    )}
                  </SecondSection>
                </div>
              )}
              {!this.state.isType && (
                <SecondSection isModal={true} label={t('CONTENT:IMAGE')} isRequired={true}>
                  {false && (
                    <div className="row">
                      <div className="col-xs-6" style={{ float: 'left' }}>
                        <input
                          type="radio"
                          value={true}
                          name="imagetype"
                          onChange={e => {
                            this.onImageTypeChange(true);
                          }}
                          checked={this.state.imagetype}
                        />
                        {t('CONTENT:IMAGEREGISTRY')}
                      </div>
                      <div className="col-xs-6" style={{ float: 'left' }}>
                        <input
                          type="radio"
                          value={false}
                          name="imagetype"
                          onChange={e => {
                            this.onImageTypeChange(false);
                          }}
                          checked={!this.state.imagetype}
                        />
                        {t('STRING:TASK_CREATE_3')}
                      </div>
                    </div>
                  )}
                </SecondSection>
              )}
              {/* {this.state.imagetype ? ( */}
              {false ? (
                <div>
                  <SecondSection isModal={true} label={t('CONTENT:IMAGEREGISTRY')} id={'imageregistry'} isRequired={this.state.isType ? true : false}>
                    <SingleSelect
                      options={this.state.imageRegistryList}
                      name={'ImageRegistry'}
                      value={this.state.imageregistry?.label || ''}
                      placeholder={t('ADDITIONAL:SELECT', { something: t('CONTENT:IMAGEREGISTRY') })}
                      onChange={e => {
                        this.onImageRegistryChange(e);
                      }}
                    />
                    {this.state.inputError.imageRegistry && (
                      <p className="error_text" style={{ marginTop: 0 }}>
                        {this.state.inputError.imageRegistry}
                      </p>
                    )}
                  </SecondSection>
                  <SecondSection isModal={true} label={t('CONTENT:IMAGE')} id={'image'} isRequired={this.state.isType ? true : false}>
                    <SingleSelect
                      options={this.state.imageList}
                      name={'Image'}
                      value={this.state.image?.value || ''}
                      placeholder={t('ADDITIONAL:SELECT', { something: t('CONTENT:IMAGE') })}
                      onChange={e => {
                        this.onImageChange(e);
                      }}
                    />
                    {this.state.inputError.image && (
                      <p className="error_text" style={{ marginTop: 0 }}>
                        {this.state.inputError.image}
                      </p>
                    )}
                  </SecondSection>
                  <SecondSection isModal={true} label={t('CONTENT:IMAGETAG')} id={'image-tag'} isRequired={this.state.isType ? true : false}>
                    <SingleSelect
                      options={this.state.imageTagList}
                      name={'ImageTag'}
                      value={this.state.imagetag?.value || ''}
                      placeholder={t('ADDITIONAL:SELECT', { something: t('CONTENT:IMAGETAG') })}
                      onChange={e => {
                        this.onImageTagChange(e);
                      }}
                    />
                    {this.state.inputError.imageTag && (
                      <p className="error_text" style={{ marginTop: 0 }}>
                        {this.state.inputError.imageTag}
                      </p>
                    )}
                  </SecondSection>
                </div>
              ) : (
                !this.state.isType && (
                  <div>
                    <input className="form-control" style={{ marginBottom: '15px' }} type="text" id="self-image" value={this.state.selfimage} onChange={this.onSelfImageChange} />
                    {this.state.inputError.selfImage && <p className="error_text">{this.state.inputError.selfImage}</p>}
                  </div>
                )
              )}
              {this.state.isType && this.state.preset === 'Notify' && (
                <div>
                  <div className={'row form-group required'} style={{ marginBottom: '0px' }}>
                    <label className="control-label" style={{ marginLeft: '15px' }}>
                      {t('CONTENT:MAILCONFIG')}
                    </label>
                  </div>
                  <SecondSection isModal={true} label={'- ' + t('CONTENT:MAILSERVER')} id={'mail-server'}>
                    <input className="form-control" type="text" id="mail-server" value={this.state.mailserver} onChange={this.onMailServerChange} />
                  </SecondSection>
                  <SecondSection isModal={true} label={'- ' + t('CONTENT:MAILFROM')} id={'mail-from'}>
                    <input className="form-control" type="text" id="mail-from" value={this.state.mailfrom} onChange={this.onMailFromChange} />
                  </SecondSection>
                  <SecondSection isModal={true} label={'- ' + t('CONTENT:MAILSUBJECT')} id={'mail-subject'}>
                    <input className="form-control" type="text" id="mail-subject" value={this.state.mailsubject} onChange={this.onMailSubjectChange} />
                  </SecondSection>
                  <SecondSection isModal={true} label={'- ' + t('CONTENT:MAILCONTENT')} id={'mail-content'}>
                    <textarea className="form-control" style={{ resize: 'none' }} type="text" id="mail-content" value={this.state.mailcontent} onChange={this.onMailContentChange} />
                  </SecondSection>
                </div>
              )}
              {!this.state.isType && (
                <div>
                  <SecondSection isModal={true} label={'- ' + t('CONTENT:RUNCOMMAND')} id={'runcommand'}>
                    <ValueEditor isModal={true} desc={} title="false" valueString="RunCommand" t={t} values={this.state.runcommands} updateParentData={this._updateRunCommands} />
                  </SecondSection>
                  <SecondSection isModal={true} label={'- ' + t('CONTENT:RUNCOMMANDARGUMENTS')} id={'args'}>
                    <ValueEditor isModal={true} desc={} title="false" valueString="RunCommandArguments" t={t} values={this.state.runcommandarguments} updateParentData={this._updateRunCommandArguments} />
                  </SecondSection>
                  <SecondSection isModal={true} label={'- ' + t('CONTENT:ENVVARIABLES')} id={'env'}>
                    <KeyValueEditor isModal={true} t={t} keyValuePairs={this.state.env} updateParentData={this._updateEnv} />
                  </SecondSection>
                </div>
              )}
              <SecondSection isModal={true} label={t('CONTENT:VOLUMEMOUNT')} id={'volumemount'} isRequired={this.state.isType ? true : false}>
                {volumeOptions.length > 0 ? (
                  <div>
                    <SingleSelect
                      options={volumeOptions}
                      name={'Volume'}
                      value={this.state.volumemountname || ''}
                      placeholder={t('ADDITIONAL:SELECT', { something: t('CONTENT:VOLUME') })}
                      onChange={e => {
                        this.onVolumeMountNameChange(e);
                      }}
                    />
                  </div>
                ) : (
                  t('STRING:TASK_CREATE_5')
                )}
                {this.state.inputError.volume && (
                  <p className="error_text" style={{ marginTop: 0 }}>
                    {this.state.inputError.volume}
                  </p>
                )}
              </SecondSection>
              {false && volumeOptions.length > 0 && (
                <SecondSection isModal={true} label={t('CONTENT:VOLUMEMOUNTPATH')} id={'volumepath'}>
                  <input className="form-control" type="text" id="volumepath" value={this.state.volumemountpath} onChange={this.onVolumeMountPathChange} />
                  {this.state.inputError.mountPath && (
                    <p className="error_text" style={{ marginTop: 0 }}>
                      {this.state.inputError.mountPath}
                    </p>
                  )}
                </SecondSection>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalSubmitFooter errorMessage={this.state.errorMessage} inProgress={this.state.inProgress} submitText={this.props.isNew ? t('CONTENT:ADD') : t('CONTENT:EDIT')} cancel={this._cancel} />
      </form>
    );
  }
}

export const StepModal = createModalLauncher(props => {
  const { t } = useTranslation();
  return <BaseStepModal {...props} t={t} />;
});
