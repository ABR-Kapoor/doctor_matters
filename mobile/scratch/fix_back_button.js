const fs = require('fs');

function fixBackButton(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Import ChevronLeft instead of ArrowLeft
    c = c.replace(/import \{ Calendar, Users, Pill, Banknote, User, ArrowLeft \} from 'lucide-react-native';/, 
      "import { Calendar, Users, Pill, Banknote, User, ChevronLeft } from 'lucide-react-native';");

    // Update the button JSX to match HeaderOptions
    const oldBtn = /headerLeft: \(\) => \([\s\S]*?<\/TouchableOpacity>\s*\),/;
    const newBtn = `headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginLeft: 16, backgroundColor: '#ffffff' }}>
              <ChevronLeft color="#374151" size={20} />
            </TouchableOpacity>
          ),`;
    c = c.replace(oldBtn, newBtn);

    fs.writeFileSync(p, c);
    console.log('Fixed back button in ' + p);
  }
}

fixBackButton('src/app/(dashboard)/_layout.tsx');
