const fs = require('fs');

function fixAdherenceStyles(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Add padding top to content
    c = c.replace(/content: \{ paddingBottom: 100 \}/, "content: { paddingTop: 24, paddingBottom: 180 }");

    // Make card background slightly darker
    c = c.replace(/card: \{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20, marginHorizontal: 20 \}/, 
      "card: { backgroundColor: '#f1f5f9', borderRadius: 16, padding: 16, marginBottom: 20, marginHorizontal: 20 }");

    fs.writeFileSync(p, c);
    console.log('Fixed padding and background in ' + p);
  }
}

fixAdherenceStyles('src/app/(dashboard)/prescriptions/[prescriptionId]/progress.tsx');
