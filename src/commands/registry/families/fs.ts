import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const fsFamily: FamilyDef = {
    family: 'fs',
    desc: 'Router file system.',
    commands: [
      R('fs_ls', 'fs', 'fs ls', 'List router file system'),
      R('fs_info', 'fs', 'fs info', 'File system info'),
      R('fs_pwd', 'fs', 'fs pwd', 'Print working directory'),
    ],
  };
