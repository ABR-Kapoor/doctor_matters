const fs = require('fs');

function updateFile(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Reduce border radius for cards, inputs, and medicine boxes to just 'a little curve'
    c = c.replace(/card: \{ backgroundColor: COLORS\.white, borderRadius: 24/g, "card: { backgroundColor: COLORS.white, borderRadius: 16");
    c = c.replace(/input: \{ borderWidth: 1, borderColor: 'rgba\(30, 41, 59, 0\.15\)', borderRadius: 16/g, "input: { borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.15)', borderRadius: 12");
    c = c.replace(/medicineBox: \{ backgroundColor: COLORS\.surface, padding: 16, borderRadius: 20/g, "medicineBox: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12");

    fs.writeFileSync(p, c);
    console.log('Updated ' + p);
  }
}

updateFile('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
updateFile('src/app/(dashboard)/prescriptions/new.tsx');
