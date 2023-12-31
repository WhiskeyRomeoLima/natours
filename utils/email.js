const nodemailer = require('nodemailer');

//mailtrap.io - safe email testing for staging and development
//https://mailtrap.io/inboxes/2541773/messages
const sendEmail = async (options) => {
    console.log('In Send')
    
    //* CREATE TRANSPORTER
    const transporter = nodemailer.createTransport({
       host: process.env.EMAIL_HOST,
       port: process.env.EMAIL_PORT,
       auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
       } 
    })
    console.log('Finished transporter')
    

    //* DEFINE EMAIL OPTIONS
    const mailOptions = {
        from: 'Natours <wrlucas67@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: options.message
    }

    //*SEND EMAIL
    await transporter.sendMail(mailOptions)

}; //end sendEmail()

module.exports = sendEmail;
