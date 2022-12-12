import { ModelDefinition } from "../../model";
import { BaseRepository } from "../../repository/base_repository";
import { Repository } from "../../repository/repository";
import { Comment } from "../models/comment";
import { Post } from "../models/post";
import { User } from "../models/user";

export class CommentRepository extends Repository<Comment, Post> {
  definition: ModelDefinition = { name: "comments" }


  constructor(parent: BaseRepository<Post, User>) {
    super(parent)
  }


}