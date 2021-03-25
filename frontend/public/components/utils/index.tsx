export * from './line-buffer';
export * from './promise-component';
export * from './cog';
export * from './selector';
export * from './selector-input';
export * from './label-list';
export * from './log-window';
export * from './resource-icon';
export * from './resource-link';
export * from './resource-log';
export * from './volume-icon';
export * from './timestamp';
export * from './vertnav';
export * from './details-page';
export * from './inject';
export * from './disabled';
export * from './file-input';
export * from './firehose';
export * from './dropdown';
export * from './status-box';
export * from './nav-title';
export * from './overflow';
export * from './units';
export * from './poll-hook';
export * from './safe-fetch-hook';
export * from './select-text';
export * from './toggle-play';
export * from './button-bar';
export * from './number-spinner';
export * from './cloud-provider';
export * from './documentation';
export * from './router';
export * from './operator-states';
export * from './container-linux-update-operator';
export * from './link';
export * from './async';
export * from './download-button';
export * from './error-boundary';
export * from './deployment-pod-counts';
export * from './entitlements';
export * from './build-strategy';
export * from './copy-to-clipboard';
export * from './build-hooks';
export * from './webhooks';
export * from './section-heading';
export * from './scroll-to-top-on-mount';
export * from './rbac';
export * from './kebab';
export * from './resource-editor';
export * from './parameter-editor';
export * from './volume-editor';
export * from './step-editor';
export * from './ref-width-hook';

/*
  Add the enum for NameValueEditorPair here and not in its namesake file because the editor should always be
  loaded asynchronously in order not to bloat the vendor file. The enum reference into the editor
  will cause it not to load asynchronously.
 */
/* eslint-disable no-undef */
export const enum NameValueEditorPair {
  Name = 0,
  Value,
  Index,
}

export const enum StatusEditorPair {
  Status = '',
  Reason = '',
}

export const enum AdvancedPortEditorPair {
  Name,
  Port,
  Protocol,
  TargetPort,
  Index,
}

export const enum BasicPortEditorPair {
  Name,
  Port,
  Protocol,
  Index,
}

export const enum VolumeEditorPair {
  Name,
  MountPath,
  PVC,
  ReadOnly,
  Index,
}

export const enum ValueEditorPair {
  Value,
  Index,
}

export const enum ResourceModalEditorPair {
  Value,
  Index,
}

export const enum ResourceModalPair {
  Name,
  Type,
  Path,
  Optional,
}

export const enum ParameterModalEditorPair {
  Value,
  Index,
}

export const enum ParameterModalPair {
  Name,
  Description,
  Type,
  Default,
}

export const enum VolumeModalEditorPair {
  Value,
  Index,
}

export const enum VolumeModalPair {
  Name,
  Type,
  ConfigMap,
  Secret,
}

export const enum StepModalEditorPair {
  Value,
  Index,
}

export const enum StepModalPair {
  Name,
  ImageRegistry,
  Image,
  ImageVersion,
  MailServer,
  MailFrom,
  MailSubject,
  MailContent,
  RunCommandArguments,
  RunCommands,
  Env,
  VolumeMountName,
  VolumeMountPath,
  Type,
  Preset,
  ImageType,
  SelfImage,
}

export const enum KeyValueEditorPair {
  Key,
  Value,
  Index,
}

export const enum SelectKeyValueEditorPair {
  Select,
  Key,
  Value,
  Index,
}

export const enum ResourceLimitEditorPair {
  LimitType,
  Cpu,
  Memory,
  Storage,
  CpuRatio,
  MemoryRatio,
  CpuUnit,
  MemoryUnit,
  StorageUnit,
  Index
}

export const enum RoleEditorPair {
  Group,
  Resource,
  Role,
  Index,
}

export const enum IngressEditorPair {
  PathName,
  ServiceName,
  ServicePort,
  Index,
}

export const enum IngressHostEditorPair {
  HostName,
  Path,
  Index,
}
