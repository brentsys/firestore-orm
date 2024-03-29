import { ClientRepository } from '../../client_side/repository';
import { ModelDefinition } from '../../model';
import { QueryGroup } from '../../types';
import { Note } from '../models/note';

const noteDefinition: ModelDefinition<Note> = {
  name: 'notes'
};

export class NoteRepository extends ClientRepository<Note> {
  qg: QueryGroup<Note> = {}
  formConverter(data: Partial<Note>): Promise<Partial<Note>> {
    return Promise.resolve(data)
  }
  definition = noteDefinition

}
