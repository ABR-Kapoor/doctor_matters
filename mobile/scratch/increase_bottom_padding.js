const fs = require('fs');

function increaseBottomPadding(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    c = c.replace(/content: \{ padding: 24, paddingBottom: 100 \}/g, 
      "content: { padding: 24, paddingBottom: 180 }");

    fs.writeFileSync(p, c);
    console.log('Increased bottom padding in ' + p);
  }
}

increaseBottomPadding('src/app/(dashboard)/prescriptions/new.tsx');
increaseBottomPadding('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
