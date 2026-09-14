import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  ipv4,
} from '../../validators.js';

export const linuxFamily: FamilyDef = {
    family: 'linux',
    desc: '3912S Linux application (Ubuntu container) management.',
    commands: [
      R('linux_status', 'linux', 'linux status', 'Linux application status'),
      W('linux_ssh_enable', 'linux', () => 'linux service ssh enable', {}, 'Enable SSH service to the Linux environment'),
      W('linux_ssh_disable', 'linux', () => 'linux service ssh disable', {}, 'Disable SSH service to the Linux environment'),
      W('linux_ssh_port', 'linux', (a) => `linux service ssh setport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set SSH port for the Linux environment'),
      W('linux_setlinuxip', 'linux', (a) => `linux setlinuxip -i ${a.ip} -c ${a.cidr} -g ${a.gateway}`, {
        ip: ipv4,
        cidr: z.number().int().min(1).max(30),
        gateway: ipv4,
      }, 'Set Linux app IP (first time; reboot to apply)'),
    ],
  };
