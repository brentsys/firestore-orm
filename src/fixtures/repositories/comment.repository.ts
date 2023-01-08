import { RestRepository } from "../../repository/rest_repository";
import { Comment } from "../models/comment";
import { getRestDefinition } from "./firebase";

export class CommentRepository extends RestRepository<Comment> {
  formConverter(data: Partial<Comment>): Promise<Partial<Comment>> {
    return Promise.resolve(data)
  }

  constructor() {
    super(getRestDefinition("comments"))
  }

}