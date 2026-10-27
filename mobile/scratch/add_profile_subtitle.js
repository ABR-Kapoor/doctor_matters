const fs = require('fs');

function addProfileSubtitle(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Add HeaderTitle to imports
    if (!c.includes('HeaderTitle')) {
      c = c.replace(/import \{ getHeaderOptions \} from '@\/components\/HeaderOptions';/, "import { getHeaderOptions, HeaderTitle } from '@/components/HeaderOptions';");
    }

    // Add headerTitle to profile tab
    const oldTitle = /title: 'Profile',/;
    const newTitle = `title: 'Profile',\n          headerTitle: () => <HeaderTitle title="Profile" subtitle="Manage your account" />,`;
    
    if (c.includes("title: 'Profile',") && !c.includes('headerTitle: () => <HeaderTitle title="Profile"')) {
      c = c.replace(oldTitle, newTitle);
      fs.writeFileSync(p, c);
      console.log('Added subtitle to profile');
    }
  }
}

addProfileSubtitle('src/app/(dashboard)/_layout.tsx');
