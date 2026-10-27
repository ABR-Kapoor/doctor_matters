const fs = require('fs');

let c = fs.readFileSync('src/app/(dashboard)/prescriptions/index.tsx', 'utf8');

c = c.replace(/card: \{[\s\S]*?elevation: 3,\s*\}/, `card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  }`);

c = c.replace(/avatar: \{[\s\S]*?marginRight: 12,\s*\}/, `avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  }`);

c = c.replace(/<User size=\{24\} color=\{COLORS\.text\} \/>/g, "<User size={22} color={COLORS.primary} />");

fs.writeFileSync('src/app/(dashboard)/prescriptions/index.tsx', c);
console.log('Updated prescription card styles');
