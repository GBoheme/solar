const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/components?category=battery',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const batteries = JSON.parse(data);
        if (!batteries.length) {
            console.log('No batteries found.');
            return;
        }
        const target = batteries[0].id;
        console.log('Trying to delete battery:', target);

        const delReq = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/test-delete-component/' + target,
            method: 'DELETE'
        }, (delRes) => {
            let delData = '';
            delRes.on('data', (c) => { delData += c; });
            delRes.on('end', () => {
                console.log('Status:', delRes.statusCode);
                console.log('Body:', delData);
            });
        });
        delReq.end();
    });
});
req.end();
