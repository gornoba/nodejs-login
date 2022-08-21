// @ts-check

const nodemailer = require('nodemailer')
const dotenv = require('dotenv')

dotenv.config()

const { OAUTH_USER, OAUTH_CLIENT_SECRET } = process.env

/**
 * @param {string} mailAddress
 */
async function sendMail(mailAddress, message) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: OAUTH_USER,
      pass: OAUTH_CLIENT_SECRET,
    },
  })

  const mailOptions = {
    from: process.env.MAIL_ID,
    to: mailAddress,
    subject: '이메일 인증',
    html: message,
    text: '인증메일입니다.',
  }

  try {
    await transporter.sendMail(mailOptions)
  } catch (err) {
    console.log('Not send mail', err)
  }
}

module.exports = sendMail
