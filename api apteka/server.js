const express        = require('express');
const MongoClient    = require('mongodb').MongoClient;
const bodyParser     = require('body-parser');
const cors           = require('cors')

const db             = require('./config/db');
const app            = express();
const port = process.env.PORT || 8000;

app.use(cors())

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    next();
});

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

MongoClient.connect(db.url, (err, database) => {
    if (err) return console.log(err)

    require('./app/routes')(app, database);

    app.listen(port, () => {
        console.log('We are live on ' + port);
    });
})
