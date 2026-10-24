const fs = require('fs');
const file = 'src/app/(dashboard)/prescriptions/new.tsx';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('useSafeAreaInsets')) {
  c = c.replace(
    "import { SafeAreaView } from 'react-native-safe-area-context';",
    "import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';"
  );
}

if (!c.includes('const insets = useSafeAreaInsets();')) {
  c = c.replace(
    "const autoTriggeredRef = useRef(false);",
    "const autoTriggeredRef = useRef(false);\n  const insets = useSafeAreaInsets();"
  );
}

c = c.replace(
  /<SafeAreaView style=\{styles\.container\}(.*)?>/,
  "<View style={[styles.container, { paddingTop: insets.top }]}>"
);

c = c.replace(
  /<\/SafeAreaView>/,
  "</View>"
);

fs.writeFileSync(file, c);
