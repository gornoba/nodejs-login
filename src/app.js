// @ts-check

const express = require('express')
// @ts-ignore
const pino = require('pino-http')()
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const authMiddleware = require('./auth/middleware')
const googleAuth = require('./oauth/google')

const app = express()

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
  })
)
app.use(pino)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.set('views', 'src/views')
app.set('view engine', 'pug')

const mainRouter = require('./routers/main')
const postsRouter = require('./routers/post')
const setupFacebookLogin = require('./oauth/facebook')
const setupKakaoLogin = require('./oauth/kakao')
const setupNaverLogin = require('./oauth/naver')

app.use(cookieParser())
app.use(authMiddleware())

googleAuth(app, mainRouter)
setupFacebookLogin(app)
setupKakaoLogin(app)
setupNaverLogin(app)

app.use('/public', express.static('src/public'))
app.use('/posts', postsRouter)
app.use('/', mainRouter)

app.use((err, req, res, next) => {
  res.removeHeader('Cross-Origin-Embedder-Policy')
  res.statusCode = err.statusCode || 500
  res.send(err.message)
})

module.exports = app
