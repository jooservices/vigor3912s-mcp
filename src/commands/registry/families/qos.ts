import { z } from 'zod';
import { S } from '../builders.js';
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
    S(
      'qos_setup',
      'qos',
      'cli.qos.setup',
      'QoS setup (SDK cli.qos.setup canonical flags)',
      {
        args: {
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
        toInput: (a) => {
          const hasClassRatio = a.classIndex != null || a.ratioPercent != null;
          return {
            wanInterface: a.wanInterface,
            mode: a.mode,
            inboundBandwidthKbps: a.inboundBandwidthKbps,
            outboundBandwidthKbps: a.outboundBandwidthKbps,
            ...(hasClassRatio
              ? {
                  classRatio: {
                    classIndex: req(a.classIndex as number | undefined, 'classIndex'),
                    ratioPercent: req(a.ratioPercent as number | undefined, 'ratioPercent'),
                  },
                }
              : {}),
            udpBandwidthControlEnabled: a.udpBandwidthControlEnabled,
            udpBandwidthLimitRatioPercent: a.udpBandwidthLimitRatioPercent,
            outboundTcpAckPrioritizeEnabled: a.outboundTcpAckPrioritizeEnabled,
            showAll: a.showAll,
            minNonVoipInboundBandwidthKbps: a.minNonVoipInboundBandwidthKbps,
            minNonVoipOutboundBandwidthKbps: a.minNonVoipOutboundBandwidthKbps,
            voipBandwidthAdjustMode: a.voipBandwidthAdjustMode,
          };
        },
      },
    ),
    S(
      'qos_class',
      'qos',
      'cli.qos.class',
      'QoS class (SDK cli.qos.class add/edit/delete)',
      {
        args: {
          classIndex: z.number().int().min(1).max(3),
          action: z.enum(['add', 'edit', 'delete']),
          ruleIndex: z.number().int().positive().optional(),
          name: singleToken.optional(),
          ruleEnabled: z.boolean().optional(),
          localAddress: safeText().optional(),
        },
        toInput: (a) => {
          const classIndex = a.classIndex;
          switch (a.action) {
            case 'add':
              return {
                classIndex,
                action: 'add',
                name: a.name,
                ruleEnabled: a.ruleEnabled,
                localAddress: a.localAddress,
              };
            case 'edit':
              return {
                classIndex,
                action: 'edit',
                ruleIndex: req(a.ruleIndex as number | undefined, 'ruleIndex'),
                name: a.name,
                ruleEnabled: a.ruleEnabled,
                localAddress: a.localAddress,
              };
            case 'delete':
              return {
                classIndex,
                action: 'delete',
                ruleIndex: req(a.ruleIndex as number | undefined, 'ruleIndex'),
              };
            default:
              throw new Error('invalid qos_class action');
          }
        },
      },
    ),
    S(
      'qos_type',
      'qos',
      'cli.qos.type',
      'QoS type add (SDK cli.qos.type)',
      {
        args: {
          action: z.literal('add'),
          name: singleToken,
          protocolType: z.number().int().min(1).max(254),
          portRange,
        },
        toInput: (a) => ({
          action: 'add',
          name: a.name,
          protocolType: a.protocolType,
          portRange: a.portRange,
        }),
      },
    ),
    S('qos_voip', 'qos', 'cli.qos.voip', 'QoS VoIP on/off (SDK cli.qos.voip)', {
      args: { enabled: z.boolean() },
    }),
  ],
};
