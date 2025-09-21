const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 12000; // Use port 12000

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;

    if (filePath === './' || filePath === './index.html') {
        filePath = './calendar-app.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.svg': 'application/image/svg+xml'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('File not found', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
    console.log('🚀 Event Discovery Calendar App is running!');
    console.log(`📱 Open your browser and go to: http://localhost:${port}`);
    console.log('✅ Your app is live and ready to use!');
    console.log('');
    console.log('🎯 Features Available:');
    console.log('  - Calendar View');
    console.log('  - Event Discovery');
    console.log('  - Saved Events');
    console.log('  - User Profile');
    console.log('  - Modern UI Design');
    console.log('');
    console.log('🎉 Congratulations! Your app is successfully built and running!');
});
