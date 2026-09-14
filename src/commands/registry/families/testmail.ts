import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const testmailFamily: FamilyDef = {
    family: 'testmail',
    desc: 'Mail alert test.',
    commands: [
      W('testmail_send', 'testmail', () => 'testmail', {}, 'Send a test mail'),
    ],
  };
