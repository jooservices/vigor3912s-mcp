import { z } from 'zod';
import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText, wanIdx } from '../../validators.js';

function req<T>(v: T | undefined | null, name: string): T {
  if (v == null) throw new Error(`${name} is required`);
  return v;
}

const singleToken = safeText().refine((v) => !/\s/.test(v), {
  message: 'must be a single token with no whitespace',
});

const portRange = z.string().regex(/^\d{1,5}:\d{1,5}$/, 'expected start:end port range');

export const qosFamily: FamilyDef = {
  family: 'qos',
  desc: 'QoS configuration (write).',
  commands: [
    W(
      'qos_setup',
      'qos',
      (a) => {
        const parts: string[] = ['qos setup'];
        if (a.wanInterface != null) parts.push(`-W ${String(a.wanInterface)}`);
        if (a.mode != null) parts.push(`-m ${String(a.mode)}`);
        if (a.inboundBandwidthKbps != null) parts.push(`-i ${String(a.inboundBandwidthKbps)}`);
        if (a.outboundBandwidthKbps != null) parts.push(`-o ${String(a.outboundBandwidthKbps)}`);
        if (a.classIndex != null || a.ratioPercent != null) {
          const classIndex = req(a.classIndex as number | undefined, 'classIndex');
          const ratioPercent = req(a.ratioPercent as number | undefined, 'ratioPercent');
          parts.push(`-r ${classIndex}:${ratioPercent}`);
        }
        if (a.udpBandwidthControlEnabled != null) {
          parts.push(`-u ${a.udpBandwidthControlEnabled ? '1' : '0'}`);
        }
        if (a.udpBandwidthLimitRatioPercent != null) {
          parts.push(`-p ${String(a.udpBandwidthLimitRatioPercent)}`);
        }
        if (a.outboundTcpAckPrioritizeEnabled != null) {
          parts.push(`-t ${a.outboundTcpAckPrioritizeEnabled ? '1' : '0'}`);
        }
        if (a.showAll === true) parts.push('-V');
        if (a.minNonVoipInboundBandwidthKbps != null) {
          parts.push(`-I ${String(a.minNonVoipInboundBandwidthKbps)}`);
        }
        if (a.minNonVoipOutboundBandwidthKbps != null) {
          parts.push(`-O ${String(a.minNonVoipOutboundBandwidthKbps)}`);
        }
        if (a.voipBandwidthAdjustMode != null) {
          parts.push(`-v ${String(a.voipBandwidthAdjustMode)}`);
        }
        if (parts.length === 1) throw new Error('At least one qos setup option must be provided');
        return parts.join(' ');
      },
      {
        wanInterface: wanIdx.optional(),
        mode: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
        inboundBandwidthKbps: z.number().int().min(1).max(100_000).optional(),
        outboundBandwidthKbps: z.number().int().min(1).max(100_000).optional(),
        classIndex: z.number().int().min(1).max(3).optional(),
        ratioPercent: z.number().int().min(0).max(100).optional(),
        udpBandwidthControlEnabled: z.boolean().optional(),
        udpBandwidthLimitRatioPercent: z.number().int().min(0).max(100).optional(),
        outboundTcpAckPrioritizeEnabled: z.boolean().optional(),
        showAll: z.boolean().optional(),
        minNonVoipInboundBandwidthKbps: z.number().int().positive().optional(),
        minNonVoipOutboundBandwidthKbps: z.number().int().positive().optional(),
        voipBandwidthAdjustMode: z.union([z.literal(0), z.literal(1)]).optional(),
      },
      'QoS setup (SDK cli.qos.setup canonical flags)',
    ),
    W(
      'qos_class',
      'qos',
      (a) => {
        const classIndex = req(a.classIndex as number | undefined, 'classIndex');
        const parts: string[] = [`qos class -c ${classIndex}`];
        const pushName = () => {
          if (a.name != null) parts.push(`-n ${String(a.name)}`);
        };
        const pushModeAddr = () => {
          if (a.ruleEnabled != null) parts.push(`-m ${a.ruleEnabled ? '1' : '0'}`);
          if (a.localAddress != null) parts.push(`-l ${String(a.localAddress)}`);
        };
        switch (a.action) {
          case 'add':
            pushName();
            parts.push('-a');
            pushModeAddr();
            break;
          case 'edit': {
            const ruleIndex = req(a.ruleIndex as number | undefined, 'ruleIndex');
            pushName();
            parts.push(`-e ${ruleIndex}`);
            pushModeAddr();
            break;
          }
          case 'delete':
            parts.push(`-d ${req(a.ruleIndex as number | undefined, 'ruleIndex')}`);
            break;
          default:
            throw new Error('invalid qos_class action');
        }
        return parts.join(' ');
      },
      {
        classIndex: z.number().int().min(1).max(3),
        action: z.enum(['add', 'edit', 'delete']),
        ruleIndex: z.number().int().positive().optional(),
        name: singleToken.optional(),
        ruleEnabled: z.boolean().optional(),
        localAddress: safeText().optional(),
      },
      'QoS class (SDK cli.qos.class add/edit/delete)',
    ),
    W(
      'qos_type',
      'qos',
      (a) =>
        `qos type -a ${String(a.name)} -t ${String(a.protocolType)} -p ${String(a.portRange)}`,
      {
        action: z.literal('add'),
        name: singleToken,
        protocolType: z.number().int().min(1).max(254),
        portRange,
      },
      'QoS type add (SDK cli.qos.type)',
    ),
    W(
      'qos_voip',
      'qos',
      (a) => `qos voip ${a.enabled ? 'on' : 'off'}`,
      { enabled: z.boolean() },
      'QoS VoIP on/off (SDK cli.qos.voip)',
    ),
  ],
};
