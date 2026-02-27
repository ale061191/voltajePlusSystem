
const axios = require('axios');

// Endpoints
const BASE_URL = 'http://localhost:5001/voltaje-system-v1/us-central1';
const URL_STATUS = `${BASE_URL}/getMachineStatus`;
const URL_INIT = `${BASE_URL}/initiatePayment`;
const URL_VALIDATE = `${BASE_URL}/validateP2P`;

async function testConnectivity() {
    console.log(`\n🚀 Testing Connectivity (getMachineStatus)...`);
    try {
        const response = await axios.post(URL_STATUS, { data: {} });
        console.log('✅ Connectivity OK:', response.data);
    } catch (error) {
        console.log('❌ Connectivity Failed:', error.message);
        if (error.response) console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
}

async function testInitiatePayment() {
    console.log(`\n🚀 Testing initiatePayment (Control Test)...`);
    const payload = {
        data: {
            amount: 50,
            payerPhone: "04241234567",
            payerId: "123456",
            payerBankCode: "0102",
            payerToken: "123456",
            machineId: "TEST_MACHINE_001",
            slotId: 1
        }
    };
    try {
        const response = await axios.post(URL_INIT, payload);
        console.log('✅ initiatePayment OK:', response.status);
    } catch (error) {
        console.log('❌ initiatePayment Failed:', error.message);
        if (error.response) console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
}

async function testValidateP2P() {
    console.log(`\n🚀 Testing P2P Validation Function at ${URL_VALIDATE}`);
    const payload = {
        data: {
            amount: 50.00,
            bankCode: "0102",
            phoneNumber: "04141234567",
            reference: "123456",
            payerId: "12345678",
            machineId: "TEST_MACHINE_001",
            slotId: 1
        }
    };

    try {
        const response = await axios.post(URL_VALIDATE, payload);
        console.log('✅ SUCCESS:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ ERROR:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Message:', error.message);
        }
    }
}

// Run all tests
(async () => {
    await testConnectivity();
    await testInitiatePayment();
    await testValidateP2P();
})();
