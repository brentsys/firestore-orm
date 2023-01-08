import { RestRepository } from "../../repository/rest_repository";
import { Post } from "../models/post";
import { getRestDefinition } from "./firebase";

export class PostRepository extends RestRepository<Post, Partial<Post>> {
  formConverter(data: Partial<Post>): Promise<Partial<Post>> {
    return Promise.resolve(data)
  }

  constructor() {
    super(getRestDefinition("posts"))
  }

}