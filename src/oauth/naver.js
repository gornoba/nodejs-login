// @ts-check

const { default: fetch } = require('node-fetch')
const { createUserOrlogin, setAccessTokenCookie } = require('../auth/auth')
const { APP_CONFIG_JSON } = require('../common')

/**
 * @param {import('express').Express} app
 */
function setupNaverLogin(app) {
  app.get('/auth/naver/callback', (req, res) => {
    res.render('naver-callback', {
      APP_CONFIG_JSON,
    })
  })

  app.post('/auth/naver/signin', async (req, res) => {
    const { token } = req.query
    if (!token) {
      res.status(400)
      return
    }

    // https://developers.naver.com/docs/login/profile/profile.md
    const tokenVerifyResult = await fetch(
      `https://openapi.naver.com/v1/nid/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const json = await tokenVerifyResult.json()
    const profile = json.response
    const user = await createUserOrlogin({
      platform: 'naver',
      platformUserId: profile.id,
      email: profile.email,
      nickname: profile.name,
    })
    setAccessTokenCookie(res, user.accessToken)
    res.status(200).end()
  })
}

module.exports = setupNaverLogin
