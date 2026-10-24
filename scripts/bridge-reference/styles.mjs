import fs from 'node:fs';
import postcss from 'postcss';
const dir = 'src/bridge-reference/src/';
function scope(ast) {
 ast.walkAtRules(a => { if(a.name === 'import') a.remove(); if(a.name === 'layer' && a.params === 'commons') a.params = 'bridge-social-reference'; });
 ast.walkRules(r => {
  for(let p=r.parent;p;p=p.parent) if(p.type==='rule'||p.type==='atrule'&&/keyframes$/.test(p.name)) return;
  r.selectors=r.selectors.map(s => s.includes(':root') ? s.replaceAll(':root', ':root[data-experience="social"]') : ':root[data-experience="social"] '+s);
 });
 return '/* Generated from unchanged Bridge source; only selectors and layer namespace are scoped. */\n'+ast.toString();
}
const css=postcss.parse(fs.readFileSync(dir+'intros-ui/commons-bridge.css','utf8'));
const root=postcss.parse(fs.readFileSync(dir+'styles.css','utf8'));
const tokens=postcss.root();
root.nodes.filter(n=>n.type==='atrule'&&n.name==='layer'&&n.params==='commons').forEach(n=>tokens.append(n.clone()));
const outputs={
 'src/intros-ui/experience/bridge-social.css':fs.readFileSync(dir+'intros-ui/commons-fonts.css','utf8')+'\n'+scope(css),
 'src/intros-ui/experience/bridge-social-tokens.css':scope(tokens),
};
for(const [file,content] of Object.entries(outputs)) {
 if(process.argv.includes('--check')) { if(fs.readFileSync(file,'utf8')!==content) throw Error(`Bridge style output drift: ${file}`); }
 else fs.writeFileSync(file,content);
}
