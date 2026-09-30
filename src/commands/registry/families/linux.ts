import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  ipv4,
} from '../../validators.js';

export const linuxFamily: FamilyDef = {
    family: 'linux',
    desc: '3912S Linux application (Ubuntu container) management.',
    commands: [
      S('linux_status', 'linux', 'cli.linux.status', 'Linux application status'),
      S('linux_ssh_enable', 'linux', 'cli.linux.service.ssh.enable', 'Enable SSH service to the Linux environment'),
      S('linux_ssh_disable', 'linux', 'cli.linux.service.ssh.disable', 'Disable SSH service to the Linux environment'),
      S('linux_ssh_port', 'linux', 'cli.linux.service.ssh.setport', 'Set SSH port for the Linux environment', {
        args: { port: z.number().int().min(1).max(65535) },
      }),
      S('linux_setlinuxip', 'linux', 'cli.linux.setlinuxip', 'Set Linux app IP (first time; reboot to apply)', {
          args: {
            ip: ipv4,
            cidr: z.number().int().min(1).max(30),
            gateway: ipv4,
          },
          toInput: (a) => ({ ip: a.ip, cidr: a.cidr, gateway: a.gateway }),
          partial: true,
        }),
    ],
  };
