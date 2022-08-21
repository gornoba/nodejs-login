// @ts-check

const { verifyJWT } = require('./jwt')
const getUsersCollection = require('../mongo')

/** @returns {import('express').RequestHandler} */
function authMiddleware() {
  return async (req, res, next) => {
    const { access_token } = req.cookies

    if (access_token) {
      try {
        const userId = await verifyJWT(access_token)

        const users = await getUsersCollection()
        const user = await users.findOne({
          id: userId,
        })

        if (user) {
          req.user = user
        }
      } catch (err) {
        console.log('Invalid token', err)
      }
    }

    next()
  }
}

module.exports = authMiddleware
