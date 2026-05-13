const crypto = require('crypto');
function hashSHA256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}
console.log(hashSHA256(JSON.stringify({
    Amount: 1,
    BeneficiaryBankCode: "0102",
    BeneficiaryCellPhone: "584129850722",
    BeneficiaryEmail: "",
    BeneficiaryID: "V19932878",
    BeneficiaryName: "Luis Perez",
    Description: "Test reimbursement",
    OperationRef: "TEST_1",
    ChildClientID: "",
    BranchID: ""
})));
