const fs = require('fs');

function fixProfile(pLayout, pProfile) {
  if (fs.existsSync(pProfile)) {
    let cp = fs.readFileSync(pProfile, 'utf8');
    // Increase paddingBottom for scrollContent
    cp = cp.replace(/scrollContent: \{ paddingBottom: 60 \}/, "scrollContent: { paddingBottom: 160 }");
    fs.writeFileSync(pProfile, cp);
    console.log('Fixed padding in ' + pProfile);
  }

  if (fs.existsSync(pLayout)) {
    let cl = fs.readFileSync(pLayout, 'utf8');
    
    // Import ArrowLeft
    if (!cl.includes('ArrowLeft')) {
      cl = cl.replace(/import \{ Calendar, Users, Pill, Banknote, User \} from 'lucide-react-native';/, 
        "import { Calendar, Users, Pill, Banknote, User, ArrowLeft } from 'lucide-react-native';");
    }
    
    // Import TouchableOpacity
    if (!cl.includes('TouchableOpacity')) {
      cl = cl.replace(/import \{ Platform \} from 'react-native';/, 
        "import { Platform, TouchableOpacity } from 'react-native';");
    }

    // Add headerLeft to profile tab
    if (!cl.includes('headerLeft: () =>')) {
      const profileTabMatch = cl.match(/name="profile"\s*options=\{\{\s*title: 'Profile',/);
      if (profileTabMatch) {
        cl = cl.replace(/name="profile"\s*options=\{\{\s*title: 'Profile',/, 
          `name="profile"\n        options={{\n          title: 'Profile',\n          headerLeft: () => (\n            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>\n              <ArrowLeft color={COLORS.text} size={24} />\n            </TouchableOpacity>\n          ),`);
      }
    }

    fs.writeFileSync(pLayout, cl);
    console.log('Added back button to ' + pLayout);
  }
}

fixProfile('src/app/(dashboard)/_layout.tsx', 'src/app/(dashboard)/profile.tsx');
