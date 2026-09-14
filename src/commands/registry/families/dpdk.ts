import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const dpdkFamily: FamilyDef = {
    family: 'dpdk',
    desc: 'DPDK (data plane) diagnostics.',
    commands: [
      R('dpdk_statistic', 'dpdk', 'dpdk statistic', 'DPDK statistics'),
      R('dpdk_cmdlog', 'dpdk', 'dpdk cmdlog', 'DPDK command log'),
    ],
  };
