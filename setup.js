const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Setting up Event Discovery Calendar App...');

// Install dependencies
exec('"C:\\Program Files\\nodejs\\npm.cmd" install', (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error installing dependencies: ${error.message}`);
    return;
  }

  if (stderr) {
    console.log(`⚠️  Warnings: ${stderr}`);
  }

  console.log(`✅ Dependencies installed successfully!`);
  console.log(`📱 Starting the app...`);

  // Start the app
  exec('"C:\\Program Files\\nodejs\\npm.cmd" start', (startError, startStdout, startStderr) => {
    if (startError) {
      console.error(`❌ Error starting app: ${startError.message}`);
      console.log(`💡 Try running: "C:\\Program Files\\nodejs\\npm.cmd" start`);
      return;
    }

    console.log(startStdout);
    if (startStderr) {
      console.log(`⚠️  App warnings: ${startStderr}`);
    }
  });
});
