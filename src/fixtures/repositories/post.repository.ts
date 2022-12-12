import { ModelDefinition } from "../../model";
import { Repository } from "../../repository/repository";
import { Post } from "../models/post";
import { User } from "../models/user";
import { UserRepository } from "./user.repository";

export class PostRepository extends Repository<Post, User> {
  definition: ModelDefinition = { name: "posts" }

  constructor() {
    super(new UserRepository())
  }

}