import { ClientRepository } from '../../client_side/repository';
import { ModelDefinition } from '../../model';
import { Note } from '../models/note';

const noteDefinition: ModelDefinition<Note> = {
  name: 'notes'
};

export class NoteRepository extends ClientRepository<Note> {
  definition = noteDefinition

}
