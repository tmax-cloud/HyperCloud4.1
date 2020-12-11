import * as React from 'react';
import { confirmModal } from '../../../../../../../public/components/modals/confirm-modal';
import ModalContent from './ModalContent';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens';
import { useTranslation } from 'react-i18next';
type ModalCallback = () => void;

export const removeTaskModal = (taskName: string, t: any, onRemove: ModalCallback) => {
  confirmModal({
    title: t('CONTENT:REMOVETASK'),
    message: (
      <ModalContent
        icon={<ExclamationTriangleIcon size="lg" color={warningColor.value} />}
        // title={`Remove ${taskName}?`}
        title={t('ADDITIONAL:DELETE', { something: `${taskName}` })}
        // message={`Are you sure you want to remove ${taskName}?`}
        message={t('ADDITIONAL:REMOVETASK', { something: `${taskName}` })}
      />
    ),
    btnText: t('CONTENT:CONFIRM'),
    buttonText: 'Remove',
    executeFn: () => {
      onRemove();
      return Promise.resolve();
    },
    submitDanger: true
  });
};

export const warnYAML = (onAccept: ModalCallback) => {
  confirmModal({
    message: (
      <ModalContent
        icon={<ExclamationTriangleIcon size="lg" color={warningColor.value} />}
        title="Switch to YAML Editor?"
        message="Switching to YAML will lose any unsaved changes in this pipeline builder and allow you to build your pipeline in YAML.
        Are you sure you want to switch?"
      />
    ),
    submitDanger: true,
    btnText: 'Continue',
    executeFn: () => {
      onAccept();
      return Promise.resolve();
    }
  });
};
