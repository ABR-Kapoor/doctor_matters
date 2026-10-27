const fs = require('fs');

let c = fs.readFileSync('src/app/(dashboard)/patients/index.tsx', 'utf8');

c = c.replace(/import \{ Plus, FileText, Search, User \} from 'lucide-react-native';/, "import { Plus, FileText, Search, User, ChevronRight } from 'lucide-react-native';");
if (!c.includes('ChevronRight')) {
  c = c.replace(/import \{.*?User.*?\} from 'lucide-react-native';/, "import { Plus, FileText, Search, User, ChevronRight } from 'lucide-react-native';");
}

const cardRegex = /<View key=\{patient\.pid\} style=\{styles\.card\}>[\s\S]*?<\/View>\s*<\/View>\s*\);\s*\n\s*\}\)/;

const newCard = `<TouchableOpacity 
                  key={patient.pid} 
                  style={styles.card}
                  onPress={() => router.push(\`/patients/\${patient.pid}\`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <User size={22} color={COLORS.primary} />
                    </View>
                    <View style={styles.cardInfo}>
                      <NameText name={patient.user.name} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        {patient.user.email ? <Text style={styles.timeText} numberOfLines={1}>{patient.user.email}</Text> : null}
                        {patient.user.email && patient.user.phone ? <Text style={{ color: '#cbd5e1', fontSize: 12, marginHorizontal: 4 }}>•</Text> : null}
                        {patient.user.phone ? <Text style={styles.timeText}>{patient.user.phone}</Text> : null}
                      </View>
                    </View>
                    <ChevronRight size={20} color="#cbd5e1" />
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: adherenceBg, alignSelf: 'flex-start', marginTop: 2 }]}>
                    <Text style={[styles.statusText, { color: adherenceColor }]}><TranslatedText>{Math.round(patient.adherenceRate || 0)}% Adherence</TranslatedText></Text>
                  </View>
                </TouchableOpacity>
              );
            })`;

c = c.replace(cardRegex, newCard);

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

fs.writeFileSync('src/app/(dashboard)/patients/index.tsx', c);
console.log('Updated patient cards');
