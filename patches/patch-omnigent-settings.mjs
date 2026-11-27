// Pi Web 0.12.0 is published as compiled Next.js output, not TSX sources.
// Source mapping: npm gitHead e8d91efdcedf2a37a2ca0a31c2a6df9c30a4eb93,
// components/SettingsPanel.tsx and lib/settings-navigation.ts.
// Patch React's section list/renderer in BOTH client and SSR bundles. Never
// mutate React-owned DOM or guess a hashed filename. Unknown builds fail closed
// before either file is written, even if the npm version is unchanged.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const marker = '\n/* woow-ha-omnigent-agent-connect-settings-v4 */\n';
const sections = '["general","models","skills","agents","plugins","mcp"]';
const expanded = '["general","models","skills","agents","plugins","mcp","omnigent","paseo"]';
const prefix = '(typeof window==="undefined"?"":window.__INGRESS_PATH__||"")';
// nginx also rewrites quoted "/icons/" in JavaScript. Keep this literal split
// so the compiled client does not receive the ingress prefix twice.
const iconBase = prefix + '+"/icon"+"s/catppuccin"';
const frame = '(0,r.jsx)("iframe",{title:"Omnigent",src:' + prefix + '+"/omnigent?embedded=1",style:{display:"block",width:"100%",height:"100%",border:0},referrerPolicy:"no-referrer"})';
const paseoFrame = frame.replaceAll("Omnigent", "Agent Connect").replace("/omnigent?", "/paseo/setup?");
const specs = {
  client: {
    sha256: '4ce31ce53f1f76cb476137d28e932a898f4ed1680fa9f4b7c3a415c0c30a435f',
    replacements: [
      ['"/icons/catppuccin"', iconBase],
      [sections, expanded],
      ['{id:"mcp",label:h("settings.mcp")}', '{id:"mcp",label:h("settings.mcp")},{id:"omnigent",label:"Omnigent"},{id:"paseo",label:"Agent Connect"}'],
      ['k("mcp",(0,r.jsx)(mb,{embedded:!0,cwd:t,trust:d,onTrustProject:u,onProjectTrustChanged:p,onClose:s},t??""))',
        'k("mcp",(0,r.jsx)(mb,{embedded:!0,cwd:t,trust:d,onTrustProject:u,onProjectTrustChanged:p,onClose:s},t??"")),f==="omnigent"&&k("omnigent",' + frame + '),f==="paseo"&&k("paseo",' + paseoFrame + ')'],
    ],
  },
  server: {
    sha256: '86670efdf0d94a68e7b8e4cd61a73a4eb331ef1435215c5d6529cf8b4c7a5372',
    replacements: [
      ['"/icons/catppuccin"', iconBase],
      [sections, expanded],
      ['{id:"mcp",label:k("settings.mcp")}', '{id:"mcp",label:k("settings.mcp")},{id:"omnigent",label:"Omnigent"},{id:"paseo",label:"Agent Connect"}'],
      ['u("mcp",(0,r.jsx)(zH,{embedded:!0,cwd:a,trust:h,onTrustProject:i,onProjectTrustChanged:j,onClose:d},a??""))',
        'u("mcp",(0,r.jsx)(zH,{embedded:!0,cwd:a,trust:h,onTrustProject:i,onProjectTrustChanged:j,onClose:d},a??"")),l==="omnigent"&&u("omnigent",' + frame + '),l==="paseo"&&u("paseo",' + paseoFrame + ')'],
    ],
  },
};
// References include the pre-rendered HTML and RSC, not just the JS manifest.
// Keep the hash width unchanged so length-prefixed flight content stays valid.
const oldName = 'page-7e8ae5987433d058.js';
const references = [
  ['index.html', 'cbe8f6c4d38dcf349dbab1e08743fbc06b6ecaefca7ec52e4f34d74011ba4ef8'],
  ['_global-error/page_client-reference-manifest.js', 'bd94af348c2cf0f9c9563827e8ca4dbb332fc015d037ca0212bf4b8d22c9869c'],
  ['_not-found/page_client-reference-manifest.js', 'c83eb850303ca0997a5b946944c8a53c84f02e5ae6ce0a49268bca9b0edcfac7'],
  ['login/page_client-reference-manifest.js', '757b6173505c9946c6c2f9b388bbf7a360395d033b2be39896aa3b5a7e1b8f7d'],
  ['page_client-reference-manifest.js', 'c49ca41d477a8b5b89a9bc32633062880a16a0807b457b02d7743b3cf6218508'],
  ['index.segments/__PAGE__.segment.rsc', '3cce9dc8a87acb539e25037029230e4a19d582b58eea73d819dcb9ef76014e60'],
  ['index.segments/_full.segment.rsc', '339552c62b086db7b522691f22e72513052e6f5732ecda8b796ffc321b4fa0bf'],
  ['index.rsc', '339552c62b086db7b522691f22e72513052e6f5732ecda8b796ffc321b4fa0bf'],
];
const hash = text => createHash('sha256').update(text).digest('hex');
function replaceOnce(text, from, to) {
  if (text.split(from).length !== 2) throw new Error('Omnigent settings: expected exactly one source anchor');
  return text.replace(from, to);
}
function transform(source, spec) {
  if (source.endsWith(marker)) {
    let original = source.slice(0, -marker.length);
    for (const [from, to] of [...spec.replacements].reverse()) original = replaceOnce(original, to, from);
    if (hash(original) !== spec.sha256) throw new Error('Omnigent settings: patched artifact has changed');
    return source;
  }
  if (hash(source) !== spec.sha256) throw new Error('Omnigent settings: unsupported compiled artifact; revalidate the Pi Web build');
  for (const [from, to] of spec.replacements) source = replaceOnce(source, from, to);
  return source + marker;
}

export function patchSettings(root) {
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (meta.name !== '@agegr/pi-web' || meta.version !== '0.12.0') throw new Error('Omnigent settings requires @agegr/pi-web 0.12.0');
  const chunks = path.join(root, '.next/static/chunks');
  const candidates = fs.readdirSync(chunks, { recursive: true })
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(chunks, file))
    .filter(file => fs.readFileSync(file, 'utf8').includes('className:"settings-section-tabs"'));
  if (candidates.length !== 1) throw new Error('Omnigent settings: expected one client SettingsPanel');
  const targets = [[candidates[0], specs.client], [path.join(root, '.next/server/app/page.js'), specs.server]];
  const planned = targets.map(([file, spec]) => {
    if (!fs.lstatSync(file).isFile()) throw new Error('Omnigent settings: target must be a regular file');
    const before = fs.readFileSync(file, 'utf8');
    return { file, before, after: transform(before, spec) };
  });
  const newName = `page-${hash(planned[0].after).slice(0, 16)}.js`;
  const alreadyPatched = path.basename(planned[0].file) === newName;
  if (!alreadyPatched && path.basename(planned[0].file) !== oldName) throw new Error('Unexpected client artifact name');
  for (const [relative, checksum] of references) {
    const file = path.join(root, '.next/server/app', relative);
    if (!fs.lstatSync(file).isFile()) throw new Error('Settings reference must be a regular file');
    const before = fs.readFileSync(file, 'utf8');
    const original = alreadyPatched ? before.replaceAll(newName, oldName) : before;
    if (hash(original) !== checksum) throw new Error(`Omnigent settings: incompatible asset reference ${relative}`);
    planned.push({ file, before, after: original.replaceAll(oldName, newName) });
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ha-settings-syntax-'));
  try {
    for (const [index, item] of planned.entries()) {
      if (!item.file.endsWith('.js')) continue;
      const file = path.join(temporary, `${index}.js`); fs.writeFileSync(file, item.after);
      const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (check.status !== 0) throw new Error(`Omnigent settings syntax preflight failed: ${check.stderr}`);
    }
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
  // Both compatibility and syntax preflights succeeded. This runs only while
  // building the image, before Next.js starts; partial output is never served.
  for (const { file, before, after } of planned) if (before !== after) fs.writeFileSync(file, after);
  const newFile = path.join(path.dirname(planned[0].file), newName);
  if (!alreadyPatched) fs.renameSync(planned[0].file, newFile);
  planned[0].file = newFile;
  return planned.map(({ file, before, after }) => ({ file: path.relative(root, file), changed: before !== after, sha256: hash(after) }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: node patch-omnigent-settings.mjs /path/to/@agegr/pi-web');
  console.log(JSON.stringify(patchSettings(path.resolve(process.argv[2])), null, 2));
}
