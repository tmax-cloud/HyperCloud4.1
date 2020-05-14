import { NetworkPolicySidebar } from './network-policy-sidebar';
import { RoleSidebar } from './role-sidebar';
import { BuildConfigSidebar } from './build-config-sidebar';
import { VirtualMachineSidebar } from './virtual-machine-sidebars';
import { PodSidebar } from './pod-sidebar';
import { JobSidebar } from './job-sidebar';
import { ReplicaSetSidebar } from './replica-set-sidebar';
import { DaemonSetSidebar } from './daemon-set-sidebar';
import { StatefulSetSidebar } from './stateful-set-sidebar';
import { DeploymentSidebar } from './deployment-sidebar';
import { HPASidebar } from './hpa-sidebar';
import { ConfigMapSidebar } from './config-map-sidebar';

// sidebar 추가 시 여기에 컴포넌트 연결해줘야함
// .set(kind, 사이드바 컴포넌트명)
export const resourceSidebars = new Map<string, React.ComponentType<any>>()
  .set('Pod', PodSidebar)
  .set('ReplicaSet', ReplicaSetSidebar)
  .set('Deployment', DeploymentSidebar)
  .set('HorizontalPodAutoscaler', HPASidebar)
  .set('ConfigMap', ConfigMapSidebar)
  .set('Job', JobSidebar)
  .set('DaemonSet', DaemonSetSidebar)
  .set('StatefulSet', StatefulSetSidebar)
  .set('NetworkPolicy', NetworkPolicySidebar)
  .set('Role', RoleSidebar)
  .set('ClusterRole', RoleSidebar)
  .set('VirtualMachine', VirtualMachineSidebar)
  .set('BuildConfig', BuildConfigSidebar);
