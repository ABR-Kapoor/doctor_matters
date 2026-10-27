const fs = require('fs');

function revertColors(filePath) {
  if (fs.existsSync(filePath)) {
    let c = fs.readFileSync(filePath, 'utf8');
    
    // Revert HeaderOptions.tsx specific stuff
    if (filePath.includes('HeaderOptions.tsx')) {
      c = c.replace(/color: '#FFFFFF', lineHeight: 24/g, "color: '#111827', lineHeight: 24");
      c = c.replace(/color: '#FFFFFF',\s*lineHeight: 28/g, "color: '#111827',\n    lineHeight: 28");
      c = c.replace(/color: '#F1F5F9'/g, "color: '#6b7280'");
    }

    // Revert border colors
    c = c.replace(/borderColor: 'rgba\(255, 255, 255, 0\.3\)'/g, "borderColor: '#e5e7eb'");
    
    // Revert icon colors
    c = c.replace(/<ChevronLeft size=\{20\} color=["']#FFFFFF["'] \/>/g, '<ChevronLeft size={20} color="#374151" />');
    c = c.replace(/<FileText size=\{18\} color=["']#FFFFFF["'] \/>/g, '<FileText size={18} color="#374151" />');
    c = c.replace(/<Plus size=\{20\} color=["']#FFFFFF["'] \/>/g, '<Plus size={20} color="#374151" />');

    fs.writeFileSync(filePath, c);
    console.log('Reverted colors in ' + filePath);
  }
}

revertColors('src/components/HeaderOptions.tsx');
revertColors('src/app/(dashboard)/prescriptions/index.tsx');
revertColors('src/app/(dashboard)/patients/[patientId].tsx');
