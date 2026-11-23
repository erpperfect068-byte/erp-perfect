import fs from 'fs';

const files = [
  'app/users/page.tsx',
  'app/treasury/page.tsx',
  'app/custody/page.tsx',
  'app/audit/page.tsx',
  'app/contractors/page.tsx',
  'components/RoleModal.tsx',
];

function findMatchingClose(src, openIdx) {
  const gt = src.indexOf('>', openIdx);
  let i = gt + 1;
  let depth = 1;
  while (i < src.length && depth > 0) {
    if (src.startsWith('</div>', i)) {
      depth--;
      if (depth === 0) return i;
      i += 6;
      continue;
    }
    if (src.startsWith('<div', i)) {
      depth++;
      i += 4;
      continue;
    }
    i++;
  }
  return -1;
}

function ensureImport(s, file) {
  if (s.includes("from '@/components/AppModal'") || s.includes('from "@/components/AppModal"')) {
    return s;
  }
  if (s.includes("from '../../components/LoadingButton'")) {
    return s.replace(
      "from '../../components/LoadingButton';",
      "from '../../components/LoadingButton';\nimport { AppModal, ModalSubmitButton } from '@/components/AppModal';"
    );
  }
  if (s.includes('from "../../components/LoadingButton"')) {
    return s.replace(
      'from "../../components/LoadingButton";',
      'from "../../components/LoadingButton";\nimport { AppModal, ModalSubmitButton } from "@/components/AppModal";'
    );
  }
  if (file.includes('RoleModal')) {
    return s.replace(
      "from 'lucide-react';",
      "from 'lucide-react';\nimport { AppModal, ModalSubmitButton } from '@/components/AppModal';"
    );
  }
  // contractors / fallback: after first import line
  return s.replace(/^(import .+?;)\r?\n/m, (m) => `${m}import { AppModal, ModalSubmitButton } from '@/components/AppModal';\n`);
}

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  s = ensureImport(s, file);

  const re = /<div className="fixed inset-0[^"]*bg-slate-900\/60[^"]*">/g;
  const matches = [...s.matchAll(re)];
  for (let m = matches.length - 1; m >= 0; m--) {
    const openIdx = matches[m].index;
    const openTag = matches[m][0];
    const closeIdx = findMatchingClose(s, openIdx);
    if (closeIdx < 0) {
      console.log('NO CLOSE', file, openIdx);
      continue;
    }
    let z = 'z-50';
    if (openTag.includes('z-[60]')) z = 'z-[60]';
    const extraClass = openTag.includes('overflow-y-auto') ? ' className="overflow-y-auto"' : '';
    const zAttr = z !== 'z-50' ? ` zIndexClass="${z}"` : '';
    const openRep = `<AppModal open${extraClass}${zAttr}>`;
    s =
      s.slice(0, openIdx) +
      openRep +
      s.slice(openIdx + openTag.length, closeIdx) +
      '</AppModal>' +
      s.slice(closeIdx + 6);
  }

  s = s.replace(/<LoadingButton/g, '<ModalSubmitButton').replace(/<\/LoadingButton>/g, '</ModalSubmitButton>');

  if (s !== orig) {
    fs.writeFileSync(file, s);
    console.log('UPDATED', file, 'overlays=', matches.length);
  } else {
    console.log('SKIP', file);
  }
}
