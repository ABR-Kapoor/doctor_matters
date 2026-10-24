const fs = require('fs');

const p = 'src/app/(dashboard)/index.tsx';
if (fs.existsSync(p)) {
  let c = fs.readFileSync(p, 'utf8');

  // Fix clipped uppercase text by giving it room to render
  c = c.replace(/tabText: \{\s*fontSize: 13,\s*fontWeight: 'bold',\s*textTransform: 'uppercase',\s*color: COLORS\.gray,\s*\}/g,
    "tabText: {\n    fontSize: 13,\n    fontWeight: 'bold',\n    textTransform: 'uppercase',\n    color: COLORS.gray,\n    lineHeight: 18,\n    paddingHorizontal: 2,\n  }");

  // Ensure tabs scrollview content Container is correct
  c = c.replace(/<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} style=\{styles\.tabsContainer\}>/, 
    `<View style={styles.tabsContainer}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>`);
  c = c.replace(/<\/ScrollView>\n\s*\{loading\}/, `</ScrollView></View>\n      {loading}`);

  // Simplify the tabsContainer style so it doesn't break ScrollView
  c = c.replace(/tabsContainer: \{\s*flexDirection: 'row',\s*marginBottom: 24,\s*borderBottomWidth: 1,\s*borderBottomColor: COLORS\.lightGray,\s*\}/g,
    "tabsContainer: {\n      flexDirection: 'row',\n      marginBottom: 24,\n      borderBottomWidth: 1,\n      borderBottomColor: COLORS.lightGray,\n      minHeight: 40,\n    }");

  fs.writeFileSync(p, c);
  console.log('Fixed cut text issues with lineHeight and layout');
}
