const fs = require('fs');

function updateInputs(p) {
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');

    // Make Instructions and Diet Advice even taller
    c = c.replace(/minHeight: 120/g, "minHeight: 160");
    
    // Add multiline and scrollEnabled={false} to all inputs that could need auto-growing
    // Like notes in medicines, diagnosis, symptoms, etc.
    // Diagnosis and Symptoms are usually short but could be long. Let's make sure they are multiline if needed.
    // Wait, let's just make all inputs auto-grow if they are multiline.
    // In edit.tsx and new.tsx, find TextInput for diagnosis and symptoms and add multiline
    
    c = c.replace(/onChangeText=\{setDiagnosis\} placeholder="e\.g\. Viral Fever"/g, 
      "multiline scrollEnabled={false} onChangeText={setDiagnosis} placeholder=\"e.g. Viral Fever\"");
    c = c.replace(/onChangeText=\{setSymptoms\} placeholder="Fever, Cough"/g, 
      "multiline scrollEnabled={false} onChangeText={setSymptoms} placeholder=\"Fever, Cough\"");
    
    // For medicine notes:
    c = c.replace(/value=\{med\.notes\} onChangeText=\{\(text\) => updateMedicine\(index, 'notes', text\)\}/g, 
      "multiline scrollEnabled={false} value={med.notes} onChangeText={(text) => updateMedicine(index, 'notes', text)}");

    fs.writeFileSync(p, c);
    console.log('Updated inputs in ' + p);
  }
}

updateInputs('src/app/(dashboard)/prescriptions/new.tsx');
updateInputs('src/app/(dashboard)/prescriptions/[prescriptionId]/edit.tsx');
