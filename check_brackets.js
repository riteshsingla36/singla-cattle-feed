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
      process.exit(1);
    }
  }
}
if(open.length) {
  process.exit(1);
} else {
}
