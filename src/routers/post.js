// @ts-check

const { v1: uuidv1 } = require('uuid')
const express = require('express')
const { getPostsCollection } = require('../mongo')
const { redirectWithMsg } = require('../util')

const router = express.Router()

router.post('/', async (req, res) => {
  if (!req.user) {
    res.status(403).end()
    return
  }

  const posts = await getPostsCollection()
  const { content } = req.body

  await posts.insertOne({
    id: uuidv1(),
    userid: req.user?.id,
    content,
    createAt: new Date(),
  })

  redirectWithMsg({
    dest: '/',
    res,
    info: '포스트가 작성되었습니다.',
  })
})

router.post('/:postId/delete', async (req, res) => {
  const { postId } = req.params

  const posts = await getPostsCollection()

  const existingPost = await posts.findOne({
    id: postId,
  })

  console.log(existingPost, req.user.id)

  if (existingPost.userid !== req.user.id) {
    res.status(403).end()
    return
  }

  await posts.deleteOne({
    id: postId,
  })

  redirectWithMsg({
    dest: '/',
    res,
    info: '포스트가 삭제되었습니다.',
  })
})

module.exports = router
