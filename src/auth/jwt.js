const jwt = require('jsonwebtoken')

const { SERVER_SECRET } = process.env

async function signJWT(value) {
  return new Promise((resove, reject) => {
    jwt.sign(value, SERVER_SECRET, (err, encoded) => {
      if (err) {
        reject(err)
      } else {
        resove(encoded)
      }
    })
  })
}

async function verifyJWT(token) {
  return new Promise((resove, reject) => {
    jwt.verify(token, SERVER_SECRET, (err, value) => {
      if (err) {
        reject(err)
      } else {
        resove(value)
      }
    })
  })
}

module.exports = {
  signJWT,
  verifyJWT,
}
