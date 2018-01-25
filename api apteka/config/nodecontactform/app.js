const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();

//view

app.engine('handlebars',exphbs());
app.set('view engine','handlebars');

//static

app.use('/public',express.static(path.join(__dirname,'public')));

//body parser

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



app.get('/',(req,res)=>{
    res.render('contact');
});

app.post('/send',(req,res)=>{
    const output = `
        <p>You have a new contact request</p>
        <h3>${req.body.name}</h3>
        <h3>${req.body.company}</h3>
        <h3>${req.body.email}</h3>
        <h3>${req.body.phone}</h3>
    `;

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'serwer1784277.home.pl',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'portfolio@naukawebdesignu.pl', // generated ethereal user
            pass: 'kombiwar123'  // generated ethereal password
        },
        tls:{
            rejectUnauthorized:false
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"my name" <portfolio@naukawebdesignu.pl>', // sender address
        to: 'ralfinino@gmail.com', // list of receivers
        subject: 'Temat', // Subject line
        text: 'Hello world?', // plain text body
        html: output // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);

        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        res.render('contact',{msg:"email send"});
    });

})

app.listen(3000,()=>console.log("server started ..."));