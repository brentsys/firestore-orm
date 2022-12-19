import { RestRepository } from "../../repository/rest_repository";
import { Post } from "../models/post";
import { getRestDefinition } from "./firebase";

export class PostRepository extends RestRepository<Post> {

  constructor() {
    super(getRestDefinition("posts"))
  }

}