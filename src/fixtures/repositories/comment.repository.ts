import { RestRepository } from "../../repository/rest_repository";
import { Comment } from "../models/comment";
import { getRestDefinition } from "./firebase";

export class CommentRepository extends RestRepository<Comment> {

  constructor() {
    super(getRestDefinition("comments"))
  }

}