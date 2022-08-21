// @ts-check

const { v4: uuidv4 } = require('uuid')
const express = require('express')
const { getUsersCollection, getPostsCollection } = require('../mongo')
const sendMail = require('../gmail')
const {
  encryptPassword,
  setAccessTokenCookie,
  comparePassword,
  getAccessTokenForUserId,
} = require('../auth/auth')
const { signJWT } = require('../auth/jwt')
const { APP_CONFIG_JSON } = require('../common')
const { redirectWithMsg } = require('../util')

const router = express.Router()
const HOST = 'https://6333-112-214-229-98.jp.ngrok.io'

router.get('/', async (req, res) => {
  if (req.user) {
    const postsCol = await getPostsCollection()
    const postsCursor = postsCol.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userid',
          foreignField: 'id',
          as: 'users',
        },
      },
      {
        $sort: {
          createAt: -1,
        },
      },
    ])

    const posts = (await postsCursor.toArray()).map(({ users, ...rest }) => ({
      ...rest,
      user: users[0],
    }))

    res.render('home', {
      user: req.user,
      posts,
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

router.get('/reset-password', async (req, res) => {
  const { code } = req.query

  const users = await getUsersCollection()
  const user = await users.findOne({
    passwordResetCode: code,
  })

  if (!users || !user.pendingPassword) {
    res.status(400).end()
    return
  }

  const { pendingPassword } = user

  await users.updateOne(
    {
      id: user.id,
    },
    {
      $set: {
        password: pendingPassword,
        pendingPassword: null,
      },
    }
  )

  redirectWithMsg({
    res,
    dest: '/',
    info: '비밀전호 변경완료',
  })
})

router.post('/request-reset-password', async (req, res) => {
  if (!req.body) {
    res.status(400).end()
    return
  }

  const { email, password } = req.body
  const users = await getUsersCollection()

  if (!email || !password) {
    redirectWithMsg({
      res,
      dest: '/requst-reset-password',
      error: '이메일과 비밀번호를 모두 입력해주세요.',
    })
    return
  }

  const existingUser = await users.findOne({
    email,
  })

  if (!existingUser) {
    redirectWithMsg({
      res,
      dest: '/requset-reset-password',
      error: '존재하지 않는 이메일 입니다.',
    })
    return
  }

  const passwordResetCode = uuidv4()
  await sendMail(
    email,
    `<a href='${HOST}/reset-password?code=${passwordResetCode}'>비밀번호 초기화 인증하기</a>`
  )

  await users.updateOne(
    {
      id: existingUser.id,
    },
    {
      $set: {
        pendingPassword: await encryptPassword(password),
        passwordResetCode,
      },
    }
  )

  redirectWithMsg({
    res,
    dest: '/',
    info: '비밀번호 초기화 요청이 전송되었습니다. 이메일을 확인해 주세요.',
  })
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
