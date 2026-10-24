const fs = require('fs');

function updateIconsAndBorders(filePath) {
  if (fs.existsSync(filePath)) {
    let c = fs.readFileSync(filePath, 'utf8');
    
    // Update border colors
    c = c.replace(/borderColor: '#e5e7eb'/g, "borderColor: 'rgba(255, 255, 255, 0.3)'");
    
    // Update ChevronLeft colors
    c = c.replace(/<ChevronLeft size=\{20\} color=["']#374151["'] \/>/g, '<ChevronLeft size={20} color="#FFFFFF" />');
    
    // Update FileText colors
    c = c.replace(/<FileText size=\{18\} color=["']#374151["'] \/>/g, '<FileText size={18} color="#FFFFFF" />');
    
    // Update Plus colors
    c = c.replace(/<Plus size=\{20\} color=["']#374151["'] \/>/g, '<Plus size={20} color="#FFFFFF" />');

    fs.writeFileSync(filePath, c);
    console.log('Updated icons and borders in ' + filePath);
  }
}

updateIconsAndBorders('src/components/HeaderOptions.tsx');
updateIconsAndBorders('src/app/(dashboard)/prescriptions/index.tsx');
updateIconsAndBorders('src/app/(dashboard)/patients/[patientId].tsx');
