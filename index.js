const dotenv = require('dotenv');
const express = require('express')
const { nanoid } = require('nanoid')
const jwt = require('jsonwebtoken');
const fs = require('fs');

dotenv.config()

const app = express()
const port = process.env.PORT

const publicKey = fs.readFileSync('public.key');  // get public key
const privateKey = fs.readFileSync('private.key');

var mysql = require('mysql');
var pool  = mysql.createPool({
    connectionLimit : 10,
    host            : process.env.DB_HOST,
    user            : process.env.DB_USER,
    password        : process.env.DB_PASS,
    database        : process.env.DB_NAME
});

pool.query('SELECT 1 + 1 AS solution', function (error, results, fields) {
  if (error) throw error;
  console.log('The solution is: ', results[0].solution);
});

app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.json());

app.get('/logged_in', (req, res) => {
    let token = req.query.code;
    
    jwt.verify(token, publicKey, { audience: 'urn:requested-url.com', issuer: 'urn:sso.com' }, function(err, decoded) {
        console.log(err);
        res.send(JSON.stringify(decoded));
    });

    res.send(JSON.stringify(req.query));
})

app.get('/:loginToken', (req, res) => {
    jwt.verify(req.params.loginToken, publicKey, { audience: 'urn:sso.com', issuer: 'urn:sso.com' }, function(err, decoded) {
        if (err) {
            res.render('error', {error: JSON.stringify(err)});
        } else {
            res.render('index', {loginToken: req.params.loginToken});
        }
    });
})

app.post('/login', (req, res) => {
    var token = jwt.sign(
        { user: {id: '123', email: "b.ebbrecht@rl-3.de" }},
        privateKey,
        {
            algorithm: 'RS256',
            expiresIn: 60,
            audience: "urn:requested-url.com",
            issuer: "urn:sso.com"
        });
    res.redirect("/logged_in?code="+token);
})

app.post('/api/login_requests', (req, res) => {
    pool.query('SELECT `id`, `callback_url` FROM `sites` WHERE BINARY `id` = ? LIMIT 1', [req.body.siteId], function (error, results) {
        if (error) throw error;
        console.log(results[0]);

        let site = results[0];
        
        var loginToken = jwt.sign(
            { site },
            privateKey,
            {
                algorithm: 'RS256',
                expiresIn: 60 * 10,
                audience: "urn:sso.com",
                issuer: "urn:sso.com"
            });
        res.json({ "loginToken": loginToken, "url": "http://localhost:3000/"+loginToken })
    });

})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
