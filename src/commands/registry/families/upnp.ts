import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const upnpFamily: FamilyDef = {
    family: 'upnp',
    desc: 'UPnP.',
    commands: [
      W('upnp_on', 'upnp', () => 'upnp on', {}, 'Enable UPnP'),
      W('upnp_off', 'upnp', () => 'upnp off', {}, 'Disable UPnP'),
      R('upnp_nat', 'upnp', 'upnp nat', 'UPnP NAT view'),
    ],
  };
