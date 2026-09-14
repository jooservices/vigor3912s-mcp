import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  parseSysVersion,
} from '../../../tools/parsers.js';
import {
  noControl,
  onOff,
  safeText,
} from '../../validators.js';

export const sysFamily: FamilyDef = {
    family: 'sys',
    desc: 'System-level commands (mix of read and write).',
    commands: [
      R('sys_version', 'sys', 'sys version', 'Router model, firmware version, IP, build date', parseSysVersion),
      R('sys_cmdlog', 'sys', 'sys cmdlog', 'Command history'),
      R('sys_cc', 'sys', 'sys cc', 'Country / wireless region code'),
      R('sys_qrybuf', 'sys', 'sys qrybuf', 'Memory / buffer usage'),
      R('sys_pollbuf', 'sys', 'sys pollbuf', 'Poll buffer usage'),
      R('sys_health', 'sys', 'sys health', 'System health'),
      R('sys_info', 'sys', 'sys info', 'System information'),
      R('sys_fr_log', 'sys', 'sys fr_log', 'Failure-related log'),
      R('sys_max_session', 'sys', 'sys max_session', 'Maximum session configuration'),
      R('sys_app_statistic', 'sys', 'sys app_statistic', 'Application statistics'),
      R('sys_app_bandwidth', 'sys', 'sys app_bandwidth', 'Application bandwidth usage'),
      R('sys_time', 'sys', 'sys time', 'System time'),
      R('sys_dnsCacheTbl', 'sys', 'sys dnsCacheTbl', 'DNS cache table'),
      R('sys_dashboard', 'sys', 'sys dashboard', 'Dashboard summary'),
      W('sys_passwd', 'sys', (a) => `sys passwd ${String(a.old)} ${String(a.new)}`, {
        old: noControl(),
        new: noControl(83),
      }, 'Change the admin password'),
      W('sys_name', 'sys', (a) => `sys name ${String(a.name)}`, { name: safeText(63) }, 'Set router name'),
      W('sys_domainname', 'sys', (a) => `sys domainname ${String(a.domain)}`, { domain: safeText() }, 'Set router domain name'),
      W('sys_commit', 'sys', () => 'sys commit', {}, 'Save running settings (SRAM) to FLASH'),
      W('sys_reboot', 'sys', () => 'sys reboot', {}, 'Restart the router immediately'),
      W('sys_autoreboot', 'sys', (a) => {
        const mode = a.mode;
        if (mode === 'hours' && a.hours == null) {
          throw new Error('hours is required when mode=hours');
        }
        return `sys autoreboot ${mode === 'off' ? 'off' : String(a.hours)}`;
      }, {
        mode: z.enum(['off', 'hours']),
        hours: z.number().int().min(1).max(168).optional(),
      }, 'Configure scheduled auto-restart (mode=hours requires hours param)'),
      W('sys_tftpd', 'sys', (a) => `sys tftpd ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable TFTP server for firmware upgrade'),
      W('sys_syslog', 'sys', (a) => `sys syslog ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable syslog'),
      W('sys_mailalert', 'sys', (a) => `sys mailalert ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable mail alert'),
      W('sys_webhook', 'sys', (a) => `sys webhook ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable webhook'),
      W('sys_tr069', 'sys', (a) => `sys tr069 ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable TR-069'),
      W('sys_alg', 'sys', (a) => `sys alg ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable ALG'),
      W('sys_license', 'sys', (a) => `sys license ${String(a.action)}`, { action: safeText() }, 'License operations'),
    ],
  };
