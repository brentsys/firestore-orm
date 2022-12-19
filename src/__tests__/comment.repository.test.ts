import { deleteAllUsers, makePost, makeUser, makeUsers, waitRemote } from "../fixtures/fixture.tools";
import { PostRepository } from "../fixtures/repositories/post.repository";
import { UserRepository } from "../fixtures/repositories/user.repository";
import dotenv from "dotenv"
import debug from 'debug'
import _ from 'lodash'
import { CommentRepository } from "../fixtures/repositories/comment.repository";
import { User } from "../fixtures/models/user";
import { Post } from "../fixtures/models/post";
import { ID } from "../types";

dotenv.config()
const dLog = debug("test:test:comments")

const userRepo = new UserRepository()
const postRepo = new PostRepository()
const commentRepo = new CommentRepository()

describe('Comment repository', () => {

  let idx: ID[] = []

  beforeAll((done) => {
    makeUsers(1)
      .then(res => {
        idx = res
        dLog("users created:", idx)
        done()
      })
      .catch(done)
  })

  it.skip('should getComments', async () => {
    expect(idx.length).toBeGreaterThan(0)
    const list = await userRepo.getList({})
    expect(list.length).toBeGreaterThan(0)
    const user = await userRepo.getById(`${idx[0]}`, undefined)
    expect(user.parentPath).toEqual(userRepo.definition.name)
    dLog("user = ", user)
    const posts = await postRepo.getList({ parentPath: user.parentPath })
    expect(posts.length).toEqual(3)
    const post = posts[0]
    dLog("post =>", post)
    expect(post.parentPath)
      .toEqual([user.parentPath, user.id, postRepo.definition.name].join("/"))
    const comments = await commentRepo.getList({ parentPath: post.parentPath })
    expect(comments.length).toEqual(2)
    const comment = comments[0]
    expect(comment.parentPath)
      .toEqual([post.parentPath, post.id, commentRepo.definition.name].join("/"))
    dLog("comment =>", comment)
  });


  afterAll(() => {
    deleteAllUsers(idx)
  })
});


describe("Post Repository", () => {
  const posts: Post[] = []
  const users: User[] = []

  afterAll((done) => {
    async function delObjects() {
      // looks like post and comments are automatically deleted
      dLog("should be deleting user", users)
      await Promise.all(users.map(userRepo.deleteRecord))
    }
    waitRemote()
      .then(() => delObjects())
      .then(done).catch(error => {
        console.warn("error", error)
        done()
      })
  })

  it("should generate proper url", () => {
    const parent: User = makeUser()
    parent.id = 151515151
    const parentPath = userRepo.getDocumentPath(parent)
    const url = postRepo.getUrl(parentPath)
    expect(url).toEqual(`/users/${parent.id}/posts`)
  })

  it("should specify proper collectionpath", async () => {
    const user = await userRepo.add(makeUser())
    dLog("user ===>", user)
    users.push(user)
    expect(user.parentPath).toBeUndefined()
    const postData = makePost(user)
    const post = await postRepo.add(postData)
    dLog("posted", post)
    posts.push(post)
    expect(post.parentPath).toEqual(`users/${user.id}`)
  })

  it("should delete user", async () => {
    const user = await userRepo.add(makeUser())
    users.push(user)
    await userRepo.deleteRecord(user)
    _.remove(posts, (doc) => doc.id === user.id)
  })

})
