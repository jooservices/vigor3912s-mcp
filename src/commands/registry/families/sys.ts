import { z } from 'zod';
import { R, Ra, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { noControl, oneZero, safeText } from '../../validators.js';

const cliArgs = z.array(safeText()).min(1);

export const sysFamily: FamilyDef = {
  family: 'sys',
  desc: 'System-level commands (mix of read and write).',
  commands: [
    R('sys_version', 'sys', 'sys version', 'Router model, firmware version, IP, build date'),
    R('sys_cmdlog', 'sys', 'sys cmdlog', 'Command history'),
    R('sys_cc', 'sys', 'sys cc', 'Country / wireless region code'),
    R('sys_qrybuf', 'sys', 'sys qrybuf', 'Memory / buffer usage'),
    R('sys_pollbuf', 'sys', 'sys pollbuf', 'Poll buffer usage'),
    Ra(
      'sys_health',
      'sys',
      (a) => `sys health ${String(a.metric)}`,
      {
        metric: z.enum([
          'cpu_usage',
          'mem_usage',
          'arp_status',
          'dos_status',
          'sess_usage',
          'view',
          'vpn_status',
          'voip_status',
        ]),
      },
      'System health for one metric',
    ),
    R('sys_info', 'sys', 'sys info', 'System information'),
    R('sys_fr_log', 'sys', 'sys fr_log', 'Failure-related log'),
    R('sys_max_session', 'sys', 'sys max_session', 'Maximum session configuration'),
    R('sys_app_statistic', 'sys', 'sys app_statistic', 'Application statistics'),
    R('sys_app_bandwidth', 'sys', 'sys app_bandwidth', 'Application bandwidth usage'),
    R('sys_time', 'sys', 'sys time', 'System time'),
    R('sys_dnsCacheTbl', 'sys', 'sys dnsCacheTbl', 'DNS cache table'),
    R('sys_dashboard', 'sys', 'sys dashboard', 'Dashboard summary'),
    W(
      'sys_passwd',
      'sys',
      (a) => `sys passwd ${String(a.old)} ${String(a.new)}`,
      {
        old: noControl(),
        new: noControl(83),
      },
      'Change the admin password',
    ),
    W(
      'sys_name',
      'sys',
      (a) => `sys name ${String(a.wan)} ${String(a.name)}`,
      {
        wan: z.enum(['wan1', 'wan2']),
        name: safeText(20),
      },
      'Set WAN syslog identity name (sys name <wan1|wan2> <name>)',
    ),
    W(
      'sys_domainname',
      'sys',
      (a) => `sys domainname ${String(a.wan)} ${String(a.domain)}`,
      {
        wan: z.enum(['wan1', 'wan2']),
        domain: safeText(39),
      },
      'Set WAN domain-name suffix (sys domainname <wan1|wan2> <suffix>)',
    ),
    W('sys_commit', 'sys', () => 'sys commit', {}, 'Save running settings (SRAM) to FLASH'),
    W('sys_reboot', 'sys', () => 'sys reboot', {}, 'Restart the router immediately'),
    W(
      'sys_autoreboot',
      'sys',
      (a) => {
        const mode = a.mode;
        if (mode === 'hours' && a.hours == null) {
          throw new Error('hours is required when mode=hours');
        }
        return `sys autoreboot ${mode === 'off' ? 'off' : String(a.hours)}`;
      },
      {
        mode: z.enum(['off', 'hours']),
        hours: z.number().int().min(1).max(168).optional(),
      },
      'Configure scheduled auto-restart (mode=hours requires hours param)',
    ),
    W('sys_tftpd', 'sys', () => 'sys tftpd', {}, 'Toggle TFTP server (no on/off arg; UG toggle)'),
    W(
      'sys_syslog',
      'sys',
      (a) => `sys syslog ${(a.args as string[]).join(' ')}`,
      {
        args: cliArgs.refine((tokens) => tokens[0] === '-a' && (tokens[1] === '0' || tokens[1] === '1'), {
          message: 'sys syslog requires args starting with -a 0|1',
        }),
      },
      'Syslog setup (args start with -a 0|1)',
    ),
    W(
      'sys_mailalert',
      'sys',
      (a) => {
        const args = a.args as string[] | undefined;
        return args && args.length > 0 ? `sys mailalert ${args.join(' ')}` : 'sys mailalert';
      },
      {
        args: z.array(safeText()).optional(),
      },
      'Mail alert flags (e.g. args=["-e","1"]); empty args = bare command',
    ),
    W(
      'sys_webhook',
      'sys',
      (a) => `sys webhook ${(a.args as string[]).join(' ')}`,
      {
        args: cliArgs.refine(
          (tokens) => ['enable', 'send', 'status', 'url', 'period'].includes(tokens[0] ?? ''),
          { message: 'sys webhook first arg must be enable|send|status|url|period' },
        ),
      },
      'Webhook subcommands (enable|send|status|url|period …)',
    ),
    W(
      'sys_tr069',
      'sys',
      (a) => `sys tr069 ${(a.args as string[]).join(' ')}`,
      {
        args: cliArgs.refine(
          (tokens) =>
            [
              'get',
              'set',
              'getnoti',
              'setnoti',
              'log',
              'debug',
              'save',
              'clear',
              'inform',
              'port',
              'cert_auth',
              'only_standard_parm',
              'notify',
            ].includes(tokens[0] ?? ''),
          { message: 'sys tr069 first arg must be a documented subcommand' },
        ),
      },
      'TR-069 subcommands (get|set|log|…)',
    ),
    W(
      'sys_alg',
      'sys',
      (a) => `sys alg -e ${String(a.enabled)}`,
      { enabled: oneZero },
      'Enable/disable ALG via -e 0|1',
    ),
    W(
      'sys_license',
      'sys',
      (a) => `sys license ${(a.args as string[]).join(' ')}`,
      {
        args: cliArgs.refine(
          (tokens) =>
            ['reset_regser', 'licera', 'licifno', 'licalias', 'lic_trigger', 'liclog'].includes(
              tokens[0] ?? '',
            ),
          { message: 'sys license first arg must be a documented subcommand' },
        ),
      },
      'License subcommands',
    ),
  ],
};
