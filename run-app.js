const { spawn } = require('child_process');

console.log('🚀 Starting Event Discovery Calendar App...\n');

// First install dependencies
console.log('📦 Installing dependencies...');
const install = spawn('C:\\Program Files\\nodejs\\npm.cmd', ['install'], {
  stdio: 'inherit',
  shell: true
});

install.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Dependencies installed successfully!\n');

    // Then start the app
    console.log('📱 Starting development server...\n');
    const start = spawn('C:\\Program Files\\nodejs\\npm.cmd', ['start'], {
      stdio: 'inherit',
      shell: true
    });

    start.on('close', (startCode) => {
      console.log(`\nApp exited with code ${startCode}`);
    });
  } else {
    console.log(`\n❌ Installation failed with code ${code}`);
    console.log('💡 Try running: "C:\\Program Files\\nodejs\\npm.cmd" install');
  }
});
