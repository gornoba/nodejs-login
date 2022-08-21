// @ts-check

const { default: fetch } = require('node-fetch')
const { FB_APP_ID, FB_CLIENT_SECRET } = require('../common')
const { createUserOrlogin, setAccessTokenCookie } = require('../auth/auth')

/**
 * @param {import('express').Express} app
 */
function setupFacebookLogin(app) {
  app.post('/auth/facebook/signin', async (req, res) => {
    const { access_token: fbUserAccessToken } = req.query

    if (typeof fbUserAccessToken !== 'string') {
      res.sendStatus(400)
      return
    }

    // 검증 및 실행
    const appAccessTokenReq = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_CLIENT_SECRET}&grant_type=client_credentials`
    )
    const appAccessToken = (await appAccessTokenReq.json()).access_token

    const debugReq = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${fbUserAccessToken}&access_token=${appAccessToken}`
    )
    const debugResult = await debugReq.json()

    if (debugResult.data.app_id !== FB_APP_ID) {
      throw new Error('Not a valid access token.')
    }

    const facebookId = debugResult.data.user_id

    const profileRes = await fetch(
      `https://graph.facebook.com/${facebookId}?fields=id,name,picture&access_token=${fbUserAccessToken}`
    )

    const fbProfile = await profileRes.json()
    console.log(fbProfile)
    const resonse = await createUserOrlogin({
      platform: 'facebook',
      platfromUserId: fbProfile?.id,
      profileImageURL: fbProfile?.picture?.data?.url,
    })
    setAccessTokenCookie(res, resonse.accessToken)
    res.sendStatus(200)
  })
}

module.exports = setupFacebookLogin
