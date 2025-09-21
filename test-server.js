const http = require('http');

console.log('🔍 Testing available ports...\n');

// Test common ports
const ports = [3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

let availablePort = null;

function testPort(port) {
    return new Promise((resolve) => {
        const server = http.createServer();

        server.listen(port, () => {
            console.log(`✅ Port ${port} is available`);
            server.close(() => {
                availablePort = port;
                resolve(port);
            });
        });

        server.on('error', () => {
            console.log(`❌ Port ${port} is in use`);
            resolve(null);
        });

        // Timeout after 1 second
        setTimeout(() => {
            server.close();
            resolve(null);
        }, 1000);
    });
}

async function findAvailablePort() {
    console.log('🚀 Looking for available ports...\n');

    for (const port of ports) {
        const result = await testPort(port);
        if (result) {
            availablePort = result;
            break;
        }
    }

    if (availablePort) {
        console.log(`\n🎉 Found available port: ${availablePort}`);
        console.log(`📱 Your Event Discovery Calendar is running at:`);
        console.log(`   http://localhost:${availablePort}`);
        console.log(`\n🌐 Open this URL in your browser!`);
        return availablePort;
    } else {
        console.log('\n❌ No available ports found. Try stopping other applications.');
        return null;
    }
}

findAvailablePort();
