import { User } from "./models/user"
import { faker } from '@faker-js/faker'
import { Post } from "./models/post";
import _ from 'lodash'
import { PostRepository } from "./repositories/post.repository";
import { Comment } from "./models/comment";
import { CommentRepository } from "./repositories/comment.repository";
import { UserRepository } from "./repositories/user.repository";
import { ID } from '../types';
import { notEmpty } from "../utils";
import debug from "debug"

const dLog = debug("fixture.tools.ts")

const WAIT: [number, number] = [2000, 2000]

function delay(wait: [number, number]): number {
  return process.env.DB_REPO === "remote" ? wait[0] : wait[1]
}

export function waitRemote(wait?: [number, number]): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delay(wait ?? WAIT)) // to wait for database adding
  })
}

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
    status: "active",
  }
  return user
}

export const makePost: (user: User) => Post = (user) => {
  const repo = new UserRepository()
  return {
    title: faker.lorem.sentence(),
    body: faker.lorem.sentence(2),
    _parentPath: repo.getDocumentPath(user)
  }
}

const makeComment: (post: Post) => Comment = (post) => {
  const postRepo = new PostRepository()
  return {
    name: faker.name.fullName(),
    email: faker.internet.email(),
    body: faker.lorem.sentences(2),
    _parentPath: postRepo.getDocumentPath(post)
  }
}

export const makeUsers = async (nb: number) => {
  const repo = new UserRepository()
  const promises = _.range(nb).map(async () => {
    const user = await repo.add(makeUser())
    await makePosts(user, 3)
    return user.id
  })
  const list = await Promise.all(promises)
  return list.filter(notEmpty)
}

export const makePosts = async (user: User, nb: number) => {
  const repo = new PostRepository()
  const promises = _.range(nb).map(async () => {
    const post = await repo.add(makePost(user))
    await makeComments(repo, post, 2)
  })
  await Promise.all(promises)
}

const makeComments = async (postRepo: PostRepository, post: Post, nb: number) => {
  const repo = new CommentRepository()
  const promises = _.range(nb).map(async () => {
    await repo.add(makeComment(post))
  })
  await Promise.all(promises)
}


const asyncDeleteAllUsers = async (idx: ID[]) => {
  const repo = new UserRepository()
  const promises = idx.map(id => repo.delete(id, undefined))
  return Promise.all(promises)
}

export const deleteAllUsers = (idx: ID[]) => {
  waitRemote()
    .then(() => {
      asyncDeleteAllUsers(idx)
    })
    .catch(error => {
      dLog(error)
    })
}

