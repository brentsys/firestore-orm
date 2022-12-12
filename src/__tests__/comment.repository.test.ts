import { deleteAllUsers, makeUsers } from "../fixtures/fixture.tools";
import { PostRepository } from "../fixtures/repositories/post.repository";
import { UserRepository } from "../fixtures/repositories/user.repository";
import debug from 'debug'
import { CommentRepository } from "../fixtures/repositories/comment.repository";
const dLog = debug("test:test:comments")

const useRepo = new UserRepository()
const postsRepo = new PostRepository()
const commentRepo = new CommentRepository(postsRepo)

describe('Comment repository', () => {

  beforeAll((done) => {
    makeUsers(2)
      .then(done)
  })

  it('should getComments', async () => {
    const list = await useRepo.getList({})
    expect(list.length).toEqual(2)
    const user = list[0]
    expect(user.collectionPath).toEqual(useRepo.definition.name)
    dLog("user = ", user)
    const posts = await postsRepo.getList({ parent: user })
    expect(posts.length).toEqual(3)
    const post = posts[0]
    dLog("post =>", post)
    expect(post.collectionPath)
      .toEqual([user.collectionPath, user.id, postsRepo.definition.name].join("/"))
    const comments = await commentRepo.getList({ parent: post })
    expect(comments.length).toEqual(2)
    const comment = comments[0]
    expect(comment.collectionPath)
      .toEqual([post.collectionPath, post.id, commentRepo.definition.name].join("/"))
    dLog("comment =>", comment)

  });

  afterAll((done) => {
    deleteAllUsers()
      .then(done)
  })


});
