const https = require('https');

const token = '8619873644:AAF1XicZoRzif9f65rMROrimIKwY1ArrPjM';
const chatId = 'TU_CHAT_ID'; // Will be replaced by a real test or manual check

const message = {
    chat_id: chatId,
    text: "Hola Volti! 🤖"
};

const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(message))
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${body}`);
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(JSON.stringify(message));
req.end();