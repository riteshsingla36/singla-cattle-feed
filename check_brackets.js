const fs = require('fs');
const code = fs.readFileSync('app/admin/prices/page.js', 'utf8');
const open = [];
const tokens = { '(':')', '{':'}', '[':']' };
for(let i = 0; i < code.length; i++) {
  const ch = code[i];
  if(tokens[ch]) {
    open.push({ch, i});
  }
  if(Object.values(tokens).includes(ch)) {
    const last = open.pop();
    if(!last || tokens[last.ch] !== ch) {
      console.log('Mismatch at', i+1, 'found', ch, 'expecting after', last ? tokens[last.ch] : 'nothing');
      process.exit(1);
    }
  }
}
if(open.length) {
  console.log('Unclosed brackets:', open);
  process.exit(1);
} else {
  console.log('All brackets balanced');
}
