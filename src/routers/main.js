// @ts-check

const { v4: uuidv4 } = require('uuid')
const express = require('express')
const getUsersCollection = require('../mongo')
const sendMail = require('../gmail')
const {
  encryptPassword,
  setAccessTokenCookie,
  comparePassword,
  getAccessTokenForUserId,
} = require('../auth/auth')
const { signJWT } = require('../auth/jwt')
const { APP_CONFIG_JSON } = require('../common')

const router = express.Router()
const HOST = 'ttps://6333-112-214-229-98.jp.ngrok.io'

/**
 *
 * @param {Object<string, *>} query
 * @returns {string}
 */
function makeQueryString(query) {
  const keys = Object.keys(query)
  return keys
    .map((key) => [key, query[key]])
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&')
}

/**
 * @typedef RedirectInfo
 * @property {import('express').Response} res
 * @property {string} dest
 * @property {string} [error]
 * @property {string} [info]
 */

/**
 * @param {RedirectInfo} param0
 */
function redirectWithMsg({ res, dest, error, info }) {
  res.redirect(`${dest}?${makeQueryString({ info, error })}`)
}

router.get('/', (req, res) => {
  if (req.user) {
    res.render('home', {
      APP_CONFIG_JSON,
    })
  } else {
    res.render('signin', {
      APP_CONFIG_JSON,
    })
  }
})

router.get('/request-reset-password', (req, res) => {
  res.render('request-reset-password', {
    APP_CONFIG_JSON,
  })
})

router.get('/signup', (req, res) => {
  res.render('signup', {
    APP_CONFIG_JSON,
  })
})

router.get('/reset-password', (req, res) => {
  // to do
})

router.get('/verify-email', async (req, res) => {
  const { code } = req.query
  if (!code) {
    res.status(400).end()
    return
  }

  const users = await getUsersCollection()
  const user = await users.findOne({
    emailVerificationCode: code,
  })

  if (!user) {
    res.status(400).end()
    return
  }

  users.updateOne(
    {
      emailVerificationCode: code,
    },
    {
      $set: { verified: true },
    }
  )

  redirectWithMsg({
    dest: '/',
    res,
    info: '이메일이 인증되었습니다.',
  })
})

router.get('/logout', (req, res) => {
  res.clearCookie('access_token')
  res.redirect('/')
})

router.get('/logout', (req, res) => {
  res.redirect('/')
})

router.post('/googles', (req, res) => {
  const token = req.body.credential
  const base64Payload = token.split('.')[1]
  const payload = Buffer.from(base64Payload, 'base64')
  const result = JSON.parse(payload.toString())
  console.log(result)
})

router.post('/signup', async (req, res) => {
  const users = await getUsersCollection()
  const { email, password, passwordConfirm } = req.body

  if (!email || !password) {
    redirectWithMsg({
      dest: '/signup',
      error: '이메일과 비밀번호 모두 입력해야 합니다.',
      res,
    })
    return
  }

  if (password !== passwordConfirm) {
    redirectWithMsg({
      dest: '/signup',
      error: '비밀번호가 일치하지 않습니다.',
      res,
    })
    return
  }

  const existingUser = await users.findOne({
    email,
  })

  if (existingUser) {
    redirectWithMsg({
      dest: '/signup',
      error: '같은 이메일 유저가 이미 있습니다.',
      res,
    })
    return
  }

  const newUserId = uuidv4()
  const emailVerificationCode = uuidv4()

  await sendMail(
    email,
    `<a href='${HOST}/verify-email?code=${emailVerificationCode}'>이메일 인증하기</a>`
  )

  await users.insertOne({
    id: newUserId,
    email,
    password: await encryptPassword(password),
    verified: false,
    emailVerificationCode,
  })

  setAccessTokenCookie(res, await signJWT(newUserId))
  res.redirect('/')
})

router.post('/signin', async (req, res) => {
  if (!req.body) {
    redirectWithMsg({
      res,
      dest: '/',
      error: '잘못된 요청입니다.',
    })
    return
  }

  const { email, password } = req.body

  if (!email || !password) {
    redirectWithMsg({
      res,
      dest: '/',
      error: '이메일과 비밀번호를 모두 입력해주세요.',
    })
    return
  }

  const users = await getUsersCollection()
  const existingUser = await users.findOne({
    email,
  })

  if (!existingUser) {
    redirectWithMsg({
      res,
      dest: '/',
      error: '이메일 혹은 비밀번호가 일치하지 않습니다.',
    })
    return
  }

  const isPasswordCorrect = await comparePassword(
    password,
    existingUser.password
  )

  if (isPasswordCorrect) {
    setAccessTokenCookie(res, await signJWT(existingUser.id))

    redirectWithMsg({
      res,
      dest: '/',
      info: '로드인 되었습니다.',
    })
  } else {
    redirectWithMsg({
      res,
      dest: '/',
      info: '이메일 혹은 비밀번호가 일치하지 않습니다.',
    })
  }
})

module.exports = router
