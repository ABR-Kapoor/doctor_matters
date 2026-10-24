const fs = require('fs');

const p = 'src/app/(dashboard)/patients/[patientId].tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // profileCard
  c = c.replace(/profileCard: \{ backgroundColor: COLORS\.white, borderRadius: 32, overflow: 'hidden', marginBottom: 32, shadowColor: COLORS\.black, shadowOffset: \{ width: 0, height: 8 \}, shadowOpacity: 0\.06, shadowRadius: 20, elevation: 5 \}/g, 
    "profileCard: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', marginBottom: 32, shadowColor: '#64748b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' }");

  // historyCard
  c = c.replace(/historyCard: \{ backgroundColor: COLORS\.white, borderRadius: 32, padding: 16, shadowColor: COLORS\.black, shadowOffset: \{ width: 0, height: 8 \}, shadowOpacity: 0\.04, shadowRadius: 20, elevation: 4 \}/g,
    "historyCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20, shadowColor: '#64748b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' }");

  // healthCard
  c = c.replace(/healthCard: \{ width: '48%', backgroundColor: COLORS\.white, borderRadius: 12, padding: 14, marginBottom: 16, shadowColor: COLORS\.black, shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.04, shadowRadius: 12, elevation: 2 \}/g,
    "healthCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' }");

  // healthCardFull
  c = c.replace(/healthCardFull: \{ width: '100%', backgroundColor: COLORS\.white, borderRadius: 12, padding: 14, shadowColor: COLORS\.black, shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.04, shadowRadius: 12, elevation: 2 \}/g,
    "healthCardFull: { width: '100%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' }");

  fs.writeFileSync(p, c);
  console.log('Updated patient details styles');
}
