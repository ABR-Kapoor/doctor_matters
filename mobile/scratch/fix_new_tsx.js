const fs = require('fs');

function fixNewTsx(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Replace ArrowLeft with ChevronLeft in imports if not already there
    if (!c.includes('ChevronLeft')) {
      c = c.replace(/import \{.*ArrowLeft.*\} from 'lucide-react-native';/, match => match.replace('ArrowLeft', 'ArrowLeft, ChevronLeft'));
    }

    // Replace the custom headerLeft in new.tsx
    const oldHeader = /headerLeft: \(\) => \([\s\S]*?<\/TouchableOpacity>\s*\)/;
    const newHeader = `headerLeft: () => (
          <TouchableOpacity 
            style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }} 
            onPress={() => router.back()}
          >
            <ChevronLeft size={20} color="#334155" />
          </TouchableOpacity>
        )`;
    if (oldHeader.test(c)) {
      c = c.replace(oldHeader, newHeader);
    }
    
    fs.writeFileSync(p, c);
    console.log('Fixed new.tsx');
  }
}

fixNewTsx('src/app/(dashboard)/prescriptions/new.tsx');
