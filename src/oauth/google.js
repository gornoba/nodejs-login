// @ts=check

const GoogleStrategy = require('passport-google-oauth20').Strategy
const passport = require('passport')

const { createUserOrlogin, setAccessTokenCookie } = require('../auth/auth')

const { GOOGLE_ID, GOOGLE_SECRET } = process.env

function googleAuth(app, router) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_ID,
        clientSecret: GOOGLE_SECRET,
        callbackURL:
          'https://6333-112-214-229-98.jp.ngrok.io/auth/google/callback',
        passReqToCallback: true,
      },
      async (req, accessToken, refeshToken, profile, done) => {
        done(null, {
          google: {
            accessToken,
            profile,
          },
        })
      }
    )
  )

  app.use(passport.initialize())

  passport.serializeUser((user, done) => {
    done(null, user)
  })

  passport.deserializeUser((user, done) => {
    done(null, user)
  })

  router.get(
    '/auth/google',
    passport.authenticate('google', {
      scope: ['email', 'profile'],
      session: false,
    })
  )

  router.get(
    '/auth/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: '/',
    }),
    async (req, res) => {
      // eslint-disable-next-line no-underscore-dangle
      const profile = req.user.google.profile._json
      const user = await createUserOrlogin({
        platformUserId: profile.sub,
        email: profile.email,
        platform: 'google',
        nickname: profile.name,
        profileImageURL: profile.picture,
      })
      setAccessTokenCookie(res, user.accessToken)
      res.redirect('/')
    }
  )
}

module.exports = googleAuth
