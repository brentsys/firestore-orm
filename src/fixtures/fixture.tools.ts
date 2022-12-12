import admin from 'firebase-admin';
import { User } from "./models/user"
import { faker } from '@faker-js/faker'
import { Post } from "./models/post";
import _ from 'lodash'
import { PostRepository } from "./repositories/post.repository";
import { Comment } from "./models/comment";
import { CommentRepository } from "./repositories/comment.repository";
import { UserRepository } from "./repositories/user.repository";
import { ModelType } from '../types';
import { BaseRepository } from '../repository/base_repository';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const appConfig = {
  projectId: 'orm-test-project'
};

const initializeFirestoreApp = () => {
  if (admin.apps.length === 0) {
    admin.initializeApp(appConfig)
  }
}

initializeFirestoreApp()

function getRandomInt(max: number, min = 0) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

function getGender() {
  const idx = getRandomInt(0, 2)
  return ["male", "female"][idx] as "male" | "female"
}

export const makeUser = () => {
  const gender = getGender()
  const firstName = faker.name.firstName(gender)
  const lastName = faker.name.lastName()
  const user: User = {
    name: faker.name.fullName({ firstName, lastName }),
    email: faker.internet.email(firstName, lastName),
    gender,
    status: "active"
  }
  return user
}

const makePost: () => Post = () => {
  return {
    title: faker.lorem.text(),
    body: faker.lorem.paragraph(),
  }
}

const makeComment: () => Comment = () => {
  return {
    name: faker.name.fullName(),
    email: faker.internet.email(),
    body: faker.lorem.sentences(2)
  }
}

export const makeUsers = async (nb: number) => {
  const repo = new UserRepository()
  const promises = _.range(nb).map(async () => {
    const user = await repo.add(makeUser(), undefined)
    await makePosts(user, 3)
  })
  await Promise.all(promises)
}

const makePosts = async (user: User, nb: number) => {
  const repo = new PostRepository()
  const promises = _.range(nb).map(async () => {
    const post = await repo.add(makePost(), user)
    await makeComments(repo, post, 2)
  })
  await Promise.all(promises)
}

const makeComments = async (postRepo: PostRepository, post: Post, nb: number) => {
  const repo = new CommentRepository(postRepo)
  const promises = _.range(nb).map(async () => {
    await repo.add(makeComment(), post)
  })
  await Promise.all(promises)
}

const deleteRepo = async <T extends ModelType, P extends ModelType = ModelType>(repo: BaseRepository<T, P>) => {
  const list = await repo.getList({})
  await Promise.all(list.map(async doc => repo.deleteRecord(doc)))
}

export const deleteAllUsers = async () => {
  const postRepo = new PostRepository()
  const commentRepo = new CommentRepository(postRepo)
  await deleteRepo<Post, User>(postRepo)
  await deleteRepo<Comment, Post>(commentRepo)
  await deleteRepo(new UserRepository())
}