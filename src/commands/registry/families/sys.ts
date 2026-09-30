import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { noControl, oneZero, safeText } from '../../validators.js';

const cliArgs = z.array(safeText()).min(1);

export const sysFamily: FamilyDef = {
  family: 'sys',
  desc: 'System-level commands (mix of read and write).',
  commands: [
    S('sys_version', 'sys', 'cli.sys.version', 'Router model, firmware version, IP, build date'),
    S('sys_cmdlog', 'sys', 'cli.sys.cmdlog', 'Command history'),
    S('sys_cc', 'sys', 'cli.sys.cc', 'Country / wireless region code'),
    S('sys_qrybuf', 'sys', 'cli.sys.qrybuf', 'Memory / buffer usage'),
    S('sys_pollbuf', 'sys', 'cli.sys.pollbuf', 'Poll buffer usage'),
    S('sys_health', 'sys', 'cli.sys.health', 'System health for one metric'),
    S('sys_info', 'sys', 'cli.sys.info', 'System information'),
    S('sys_fr_log', 'sys', 'cli.sys.frlog', 'Failure-related log'),
    S('sys_max_session', 'sys', 'cli.sys.maxsession', 'Maximum session configuration'),
    S('sys_app_statistic', 'sys', 'cli.sys.appstatistic', 'Application statistics'),
    S('sys_app_bandwidth', 'sys', 'cli.sys.appbandwidth', 'Application bandwidth usage'),
    S('sys_time', 'sys', 'cli.sys.time', 'System time'),
    S('sys_dnsCacheTbl', 'sys', 'cli.sys.dnscachetbl', 'DNS cache table'),
    S('sys_dashboard', 'sys', 'cli.sys.dashboard', 'Dashboard summary'),
    S('sys_passwd', 'sys', 'cli.sys.passwd', 'Change the admin password', {
      args: {
        old: noControl(),
        new: noControl(83),
      },
      toInput: (a) => ({ oldPassword: a.old, newPassword: a.new }),
    }),
    S('sys_name', 'sys', 'cli.sys.name', 'Set WAN syslog identity name (sys name <wan1|wan2> <name>)', {
      args: {
        wan: z.enum(['wan1', 'wan2']),
        name: safeText(20),
      },
      toInput: (a) => ({ wan: a.wan, value: a.name }),
    }),
    S(
      'sys_domainname',
      'sys',
      'cli.sys.domainname',
      'Set WAN domain-name suffix (sys domainname <wan1|wan2> <suffix>)',
      {
        args: {
          wan: z.enum(['wan1', 'wan2']),
          domain: safeText(39),
        },
        toInput: (a) => ({ wan: a.wan, value: a.domain }),
      },
    ),
    S('sys_commit', 'sys', 'cli.sys.commit', 'Save running settings (SRAM) to FLASH'),
    S('sys_reboot', 'sys', 'cli.sys.reboot', 'Restart the router immediately'),
    S(
        'sys_autoreboot',
        'sys',
        'cli.sys.autoreboot',
        'Configure scheduled auto-restart (mode=hours requires hours param)',
        {
          args: {
            mode: z.enum(['off', 'hours']),
            hours: z.number().int().min(1).max(168).optional(),
          },
          toInput: (a) => {
            if (a.mode === 'hours' && a.hours == null) {
              throw new Error('hours is required when mode=hours');
            }
            return a.mode === 'off' ? 'off' : { hours: a.hours };
          },
          partial: true,
        },
      ),
    S('sys_tftpd', 'sys', 'cli.sys.tftpd', 'Toggle TFTP server (no on/off arg; UG toggle)'),
    S('sys_syslog', 'sys', 'cli.sys.syslog', 'Syslog setup (args start with -a 0|1)', {
      args: {
        args: cliArgs.refine((tokens) => tokens[0] === '-a' && (tokens[1] === '0' || tokens[1] === '1'), {
          message: 'sys syslog requires args starting with -a 0|1',
        }),
      },
      toInput: (a) => ({ args: a.args }),
    }),
    S(
      'sys_mailalert',
      'sys',
      'cli.sys.mailalert',
      'Mail alert flags (e.g. args=["-e","1"]); empty args = bare command',
      {
        args: {
          args: z.array(safeText()).optional(),
        },
        toInput: (a) => ({ args: (a.args as string[] | undefined) ?? [] }),
      },
    ),
    S('sys_webhook', 'sys', 'cli.sys.webhook', 'Webhook subcommands (enable|send|status|url|period …)', {
      args: {
        args: cliArgs.refine(
          (tokens) => ['enable', 'send', 'status', 'url', 'period'].includes(tokens[0] ?? ''),
          { message: 'sys webhook first arg must be enable|send|status|url|period' },
        ),
      },
      toInput: (a) => ({ args: a.args }),
    }),
    S('sys_tr069', 'sys', 'cli.sys.tr069', 'TR-069 subcommands (get|set|log|…)', {
      args: {
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
      toInput: (a) => ({ args: a.args }),
    }),
    S('sys_alg', 'sys', 'cli.sys.alg', 'Enable/disable ALG via -e 0|1', {
      args: { enabled: oneZero },
      toInput: (a) => ({ enabled: a.enabled === 1 }),
    }),
    S('sys_license', 'sys', 'cli.sys.license', 'License subcommands', {
      args: {
        args: cliArgs.refine(
          (tokens) =>
            ['reset_regser', 'licera', 'licifno', 'licalias', 'lic_trigger', 'liclog'].includes(
              tokens[0] ?? '',
            ),
          { message: 'sys license first arg must be a documented subcommand' },
        ),
      },
      toInput: (a) => ({ args: a.args }),
    }),
  ],
};
