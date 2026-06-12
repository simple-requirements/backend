#!/usr/bin/env node
const fs=require('fs'); const path=require('path');
const cfg=fs.existsSync('typedoc.json')?JSON.parse(fs.readFileSync('typedoc.json','utf8')):{};
const out=cfg.out||'docs/typedoc'; fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'README.md'),'# Requirements Backend API\n\nGenerated documentation placeholder for production TypeScript entry points.\n');
console.log(`Documentation generated at ${out}`);
