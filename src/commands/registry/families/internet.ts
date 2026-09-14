import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  noControl,
  wanIdx,
} from '../../validators.js';

export const internetFamily: FamilyDef = {
    family: 'internet',
    desc: 'Internet access profile (WAN setup).',
    commands: [
      R('internet_view', 'internet', 'internet -V', 'View Internet access profile'),
      W('internet_set', 'internet', (a) => `internet -W ${a.wan} -M ${a.mode}${a.username ? ` -u ${a.username}` : ''}${a.password ? ` -p ${a.password}` : ''}`, {
        wan: wanIdx,
        mode: z.number().int().min(0).max(7),
        username: noControl(49).optional(),
        password: noControl(49).optional(),
      }, 'Set WAN internet access mode (PPPoE/DHCP/static/...)'),
    ],
  };
